import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaPlus, FaPlay, FaPause, FaTimes, FaChevronRight, FaSync } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import { sbcApiService } from '../services/SBCApiService';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import type { RelanceStatus, Campaign, FilterPreviewResponse, CampaignFilter, SampleUser, CampaignStatus } from '../types/relance';

function RelancePage() {
  const { user } = useAuth();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // WhatsApp connection state
  const [status, setStatus] = useState<RelanceStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrPollingActive, setQrPollingActive] = useState(false);

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Campaign creation wizard state
  const [campaignName, setCampaignName] = useState('');
  const [filters, setFilters] = useState<CampaignFilter>({
    countries: [],
    gender: 'all',
    professions: [],
    excludeCurrentTargets: true,
  });
  const [previewData, setPreviewData] = useState<FilterPreviewResponse | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  // Message modal state
  const [messageModal, setMessageModal] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  });

  const qrPollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrPollingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper function to show messages
  const showMessage = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessageModal({ show: true, title, message, type });
  };

  // Refresh status and campaigns
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchStatus(), fetchCampaigns()]);
      showMessage('Actualisé', 'Statut WhatsApp et campagnes mis à jour', 'success');
    } catch (err: any) {
      showMessage('Erreur', 'Échec de l\'actualisation', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    fetchCampaigns();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await sbcApiService.relanceGetStatus();
      if (response.isSuccessByStatusCode && response.body?.data) {
        setStatus(response.body.data as RelanceStatus);
      }
    } catch (err: any) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await sbcApiService.relanceGetCampaigns({ type: 'filtered' });
      if (response.isSuccessByStatusCode && response.body?.data) {
        const campaignsData = response.body.data;
        // Ensure it's an array
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      } else {
        // No data or unsuccessful response
        setCampaigns([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
      setCampaigns([]); // Set empty array on error
    }
  };

  const handleConnect = async () => {
    try {
      const response = await sbcApiService.relanceConnect();
      if (response.isSuccessByStatusCode && response.body?.data?.qr) {
        setQrCode(response.body.data.qr);
        setShowQrModal(true);
        startQrPolling();
      }
    } catch (err: any) {
      showMessage('Erreur de connexion', err.message || 'Échec de la connexion WhatsApp', 'error');
    }
  };

  const startQrPolling = () => {
    setQrPollingActive(true);
    qrPollingInterval.current = setInterval(async () => {
      const response = await sbcApiService.relanceGetStatus();
      if (response.isSuccessByStatusCode && response.body?.data) {
        const newStatus = response.body.data as RelanceStatus;
        setStatus(newStatus);
        if (newStatus.whatsappStatus === 'connected') {
          stopQrPolling();
          setShowQrModal(false);
          setQrCode(null);
        }
      }
    }, 3000);

    qrPollingTimeout.current = setTimeout(() => {
      stopQrPolling();
    }, 60000);
  };

  const stopQrPolling = () => {
    setQrPollingActive(false);
    if (qrPollingInterval.current) {
      clearInterval(qrPollingInterval.current);
      qrPollingInterval.current = null;
    }
    if (qrPollingTimeout.current) {
      clearTimeout(qrPollingTimeout.current);
      qrPollingTimeout.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopQrPolling();
    };
  }, []);

  const handleDisconnect = async (force: boolean = false) => {
    try {
      await sbcApiService.relanceDisconnect(force);
      await fetchStatus();
      if (force) {
        showMessage('Session réinitialisée', 'Veuillez vous reconnecter avec un nouveau code QR.', 'success');
      } else {
        showMessage('Déconnecté', 'Vous pourrez vous reconnecter automatiquement sans scanner de QR.', 'success');
      }
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de la déconnexion', 'error');
    }
  };

  // Campaign wizard handlers
  const handleOpenWizard = () => {
    setCampaignName('');
    setFilters({
      countries: [],
      gender: 'all',
      professions: [],
      excludeCurrentTargets: true,
    });
    setPreviewData(null);
    setWizardStep(1);
    setShowCampaignWizard(true);
  };

  const handlePreviewFilters = async () => {
    try {
      const response = await sbcApiService.relancePreviewFilters(filters);
      if (response.isSuccessByStatusCode && response.body?.data) {
        setPreviewData(response.body.data);
        setWizardStep(3);
      }
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de l\'aperçu des filtres', 'error');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await sbcApiService.relanceCreateCampaign({
        name: campaignName,
        targetFilter: filters,
        maxMessagesPerDay: 30,
      });
      if (response.isSuccessByStatusCode && response.body?.data) {
        const newCampaign = response.body.data;
        setShowCampaignWizard(false);
        await fetchCampaigns();
        showMessage('Campagne créée', `Campagne "${campaignName}" créée avec succès ! Vous pouvez la démarrer maintenant.`, 'success');
        // Auto-start if desired
        await handleStartCampaign(newCampaign._id);
      }
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de la création de la campagne', 'error');
    }
  };

  // Campaign actions
  const handleStartCampaign = async (campaignId: string) => {
    try {
      await sbcApiService.relanceStartCampaign(campaignId);
      await fetchCampaigns();
      showMessage('Campagne démarrée', 'Les messages seront envoyés automatiquement.', 'success');
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec du démarrage de la campagne', 'error');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await sbcApiService.relancePauseCampaign(campaignId);
      await fetchCampaigns();
      showMessage('Campagne en pause', 'Aucun message ne sera envoyé pendant la pause.', 'success');
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de la mise en pause', 'error');
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await sbcApiService.relanceResumeCampaign(campaignId);
      await fetchCampaigns();
      showMessage('Campagne reprise', 'Les messages reprendront automatiquement.', 'success');
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de la reprise', 'error');
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      await sbcApiService.relanceCancelCampaign(campaignId, 'Utilisateur a annulé la campagne');
      await fetchCampaigns();
      showMessage('Campagne annulée', 'Toutes les cibles actives ont été retirées.', 'success');
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de l\'annulation', 'error');
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const badges: Record<CampaignStatus, { color: string; label: string }> = {
      draft: { color: 'bg-blue-500', label: 'Brouillon' },
      scheduled: { color: 'bg-purple-500', label: 'Planifié' },
      active: { color: 'bg-green-500', label: 'Actif' },
      paused: { color: 'bg-yellow-500', label: 'En pause' },
      completed: { color: 'bg-gray-500', label: 'Terminé' },
      cancelled: { color: 'bg-red-500', label: 'Annulé' },
    };
    const badge = badges[status] || badges.draft;
    return <span className={`${badge.color} text-white text-xs px-2 py-1 rounded-full`}>{badge.label}</span>;
  };

  const getCampaignActions = (campaign: Campaign) => {
    if (campaign.status === 'draft') {
      return (
        <button onClick={() => handleStartCampaign(campaign._id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600">
          <FaPlay className="inline mr-1" /> Démarrer
        </button>
      );
    } else if (campaign.status === 'active') {
      return (
        <div className="flex gap-2">
          <button onClick={() => handlePauseCampaign(campaign._id)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600">
            <FaPause className="inline mr-1" /> Pause
          </button>
          <button onClick={() => handleCancelCampaign(campaign._id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600">
            <FaTimes className="inline mr-1" /> Annuler
          </button>
        </div>
      );
    } else if (campaign.status === 'paused') {
      return (
        <div className="flex gap-2">
          <button onClick={() => handleResumeCampaign(campaign._id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600">
            <FaPlay className="inline mr-1" /> Reprendre
          </button>
          <button onClick={() => handleCancelCampaign(campaign._id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600">
            <FaTimes className="inline mr-1" /> Annuler
          </button>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">Chargement...</div>
      </ProtectedRoute>
    );
  }

  // Show coming soon modal for non-admin users
  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="p-3 bg-white relative pb-20 min-h-screen">
          <div className="flex items-center mb-4">
            <BackButton />
            <h3 className="text-xl font-medium text-center flex-1">Relance</h3>
          </div>

          <div className="flex items-center justify-center h-[70vh]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 max-w-md text-center shadow-lg"
            >
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Bientôt disponible !</h2>
              <p className="text-gray-600 mb-6">
                La fonctionnalité Relance WhatsApp sera disponible très prochainement. Restez connecté pour profiter de cette nouvelle fonctionnalité qui vous permettra de suivre automatiquement vos filleuls non payés.
              </p>
              <div className="bg-white rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Fonctionnalités à venir :</p>
                <ul className="text-left text-sm text-gray-700 space-y-1">
                  <li>✅ Messages automatiques quotidiens</li>
                  <li>✅ Campagnes personnalisées</li>
                  <li>✅ Suivi intelligent des filleuls</li>
                  <li>✅ Statistiques détaillées</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-3 bg-white relative pb-20">
        <div className="flex items-center mb-4">
          <BackButton />
          <h3 className="text-xl font-medium text-center flex-1">Relance</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <FaSync className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} size={20} />
          </button>
        </div>

        {/* WhatsApp Connection Status */}
        <div className={`rounded-2xl p-4 text-white mb-4 ${
          status?.whatsappStatus === 'connected'
            ? 'bg-gradient-to-r from-green-500 to-[#25D366]'
            : status?.connectionFailureCount && status.connectionFailureCount > 0 && status.connectionFailureCount < 3
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
            : status?.connectionFailureCount && status.connectionFailureCount >= 3
            ? 'bg-gradient-to-r from-red-500 to-red-600'
            : 'bg-gradient-to-r from-gray-500 to-gray-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaWhatsapp size={32} />
              <div>
                <div className="font-bold">
                  {status?.whatsappStatus === 'connected'
                    ? '✅ WhatsApp Connecté'
                    : status?.connectionFailureCount && status.connectionFailureCount > 0 && status.connectionFailureCount < 3
                    ? `⚠️ Connexion perdue (${status.connectionFailureCount}/3 tentatives)`
                    : status?.connectionFailureCount && status.connectionFailureCount >= 3
                    ? '❌ Session expirée (3 échecs)'
                    : '⚠️ WhatsApp Non Connecté'
                  }
                </div>
                <div className="text-xs opacity-90">
                  {status?.whatsappStatus === 'connected'
                    ? `Messages envoyés aujourd'hui : ${status.messagesSentToday}/${status.maxMessagesPerDay}`
                    : status?.connectionFailureCount && status.connectionFailureCount > 0 && status.connectionFailureCount < 3
                    ? '💡 Votre session est préservée ! Pas besoin de scanner le QR.'
                    : status?.connectionFailureCount && status.connectionFailureCount >= 3
                    ? 'Nouveau scan de code QR requis'
                    : 'Connectez votre WhatsApp pour utiliser les campagnes'}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {status?.whatsappStatus === 'connected' ? (
                <>
                  <button onClick={() => handleDisconnect(false)} className="bg-white text-yellow-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100">
                    Déconnecter
                  </button>
                  <button onClick={() => handleDisconnect(true)} className="bg-white text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100">
                    Réinitialiser
                  </button>
                </>
              ) : (
                <button onClick={handleConnect} className="bg-white text-green-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-100">
                  {status?.connectionFailureCount && status.connectionFailureCount > 0 && status.connectionFailureCount < 3
                    ? 'Reconnecter'
                    : 'Connecter'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Default Campaign Status */}
        {status?.whatsappStatus === 'connected' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-blue-900 mb-1">Campagne par défaut (Auto-inscription)</div>
                <div className="text-sm text-blue-700">
                  {status.defaultCampaignPaused
                    ? '⏸️ En pause - Les nouveaux filleuls non payés ne sont pas inscrits automatiquement'
                    : '▶️ Active - Tous les nouveaux filleuls non payés sont inscrits automatiquement'}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await sbcApiService.relanceUpdateConfig({ defaultCampaignPaused: !status.defaultCampaignPaused });
                    await fetchStatus();
                    showMessage(
                      status.defaultCampaignPaused ? 'Campagne activée' : 'Campagne en pause',
                      status.defaultCampaignPaused
                        ? 'La campagne par défaut est maintenant active.'
                        : 'La campagne par défaut est maintenant en pause.',
                      'success'
                    );
                  } catch (err: any) {
                    showMessage('Erreur', err.message || 'Échec de la mise à jour', 'error');
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${
                  status.defaultCampaignPaused
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              >
                {status.defaultCampaignPaused ? 'Activer' : 'Mettre en pause'}
              </button>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Campagnes filtrées</h3>
            <button
              onClick={handleOpenWizard}
              disabled={status?.whatsappStatus !== 'connected'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                status?.whatsappStatus === 'connected'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaPlus /> Nouvelle Campagne
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-500">
              <p className="mb-2">Aucune campagne créée</p>
              <p className="text-sm">Créez votre première campagne pour commencer à suivre vos filleuls</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <motion.div
                  key={campaign._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{campaign.name}</h4>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <button onClick={() => setExpandedCampaign(expandedCampaign === campaign._id ? null : campaign._id)}>
                      <FaChevronRight className={`transition-transform ${expandedCampaign === campaign._id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-gray-500">Cibles inscrites</div>
                      <div className="font-bold">{campaign.targetsEnrolled}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Messages envoyés</div>
                      <div className="font-bold">{campaign.messagesSent}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Taux de livraison</div>
                      <div className="font-bold">
                        {campaign.messagesSent > 0 ? ((campaign.messagesDelivered / campaign.messagesSent) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Terminés</div>
                      <div className="font-bold">{campaign.targetsCompleted}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progression</span>
                      <span>{campaign.targetsEnrolled > 0 ? Math.round((campaign.targetsCompleted / campaign.targetsEnrolled) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${campaign.targetsEnrolled > 0 ? (campaign.targetsCompleted / campaign.targetsEnrolled) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>En cours: {campaign.targetsEnrolled - campaign.targetsCompleted - campaign.targetsExited}</span>
                      <span>Sortis: {campaign.targetsExited}</span>
                    </div>
                  </div>

                  {expandedCampaign === campaign._id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t pt-3 mt-3">
                      <div className="text-sm mb-3">
                        <div className="font-bold mb-1">Filtres appliqués :</div>
                        {campaign.targetFilter?.countries && campaign.targetFilter.countries.length > 0 && (
                          <div>• Pays : {campaign.targetFilter.countries.join(', ')}</div>
                        )}
                        {campaign.targetFilter?.gender && campaign.targetFilter.gender !== 'all' && (
                          <div>• Genre : {campaign.targetFilter.gender}</div>
                        )}
                        {campaign.targetFilter?.professions && campaign.targetFilter.professions.length > 0 && (
                          <div>• Professions : {campaign.targetFilter.professions.join(', ')}</div>
                        )}
                        {campaign.targetFilter?.minAge && <div>• Âge min : {campaign.targetFilter.minAge}</div>}
                        {campaign.targetFilter?.maxAge && <div>• Âge max : {campaign.targetFilter.maxAge}</div>}
                      </div>
                      {getCampaignActions(campaign)}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* QR Code Modal */}
        <AnimatePresence>
          {showQrModal && qrCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => {
                setShowQrModal(false);
                stopQrPolling();
              }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-2">Connecter WhatsApp</h3>
                <p className="text-sm text-gray-600 mb-4">
                  1. Ouvrez WhatsApp sur votre téléphone<br />
                  2. Appuyez sur Menu → Appareils connectés<br />
                  3. Appuyez sur Connecter un appareil<br />
                  4. Scannez ce code QR
                </p>
                <div className="flex justify-center mb-4">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                {qrPollingActive && <p className="text-sm text-center text-gray-500">En attente de connexion...</p>}
                <button
                  onClick={() => {
                    setShowQrModal(false);
                    stopQrPolling();
                  }}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg mt-2 hover:bg-gray-300"
                >
                  Fermer
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Campaign Creation Wizard Modal */}
        <AnimatePresence>
          {showCampaignWizard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCampaignWizard(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Créer une campagne - Étape {wizardStep}/3</h3>

                {wizardStep === 1 && (
                  <div>
                    <label className="block mb-2 font-medium">Nom de la campagne</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Ex: Campagne Cameroun Professionnels"
                      className="w-full border border-gray-300 rounded-lg p-3 mb-4"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowCampaignWizard(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        Annuler
                      </button>
                      <button
                        onClick={() => setWizardStep(2)}
                        disabled={!campaignName.trim()}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div>
                    <div className="mb-4">
                      <label className="block mb-2 font-medium">Pays (optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: CM, NG, CI (codes pays séparés par des virgules)"
                        value={filters.countries?.join(', ') || ''}
                        onChange={(e) =>
                          setFilters({ ...filters, countries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                        }
                        className="w-full border border-gray-300 rounded-lg p-3"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block mb-2 font-medium">Genre</label>
                      <select
                        value={filters.gender || 'all'}
                        onChange={(e) => setFilters({ ...filters, gender: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-lg p-3"
                      >
                        <option value="all">Tous</option>
                        <option value="male">Homme</option>
                        <option value="female">Femme</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block mb-2 font-medium">Professions (optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: Ingénieur, Professeur (séparés par des virgules)"
                        value={filters.professions?.join(', ') || ''}
                        onChange={(e) =>
                          setFilters({ ...filters, professions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                        }
                        className="w-full border border-gray-300 rounded-lg p-3"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block mb-2 font-medium">Âge min</label>
                        <input
                          type="number"
                          placeholder="18"
                          value={filters.minAge || ''}
                          onChange={(e) => setFilters({ ...filters, minAge: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full border border-gray-300 rounded-lg p-3"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">Âge max</label>
                        <input
                          type="number"
                          placeholder="50"
                          value={filters.maxAge || ''}
                          onChange={(e) => setFilters({ ...filters, maxAge: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full border border-gray-300 rounded-lg p-3"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={filters.excludeCurrentTargets}
                        onChange={(e) => setFilters({ ...filters, excludeCurrentTargets: e.target.checked })}
                      />
                      <span className="text-sm">Exclure les utilisateurs déjà dans une campagne</span>
                    </label>

                    <div className="flex gap-2">
                      <button onClick={() => setWizardStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        Retour
                      </button>
                      <button onClick={handlePreviewFilters} className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">
                        Aperçu des résultats
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && previewData && (
                  <div>
                    <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                      <p className="font-bold text-green-700 mb-2">✓ {previewData.message}</p>
                      <p className="text-sm text-gray-600">Total : {previewData.totalCount} utilisateurs</p>
                    </div>

                    <h4 className="font-bold mb-3">Échantillon d'utilisateurs (5 affichés) :</h4>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {previewData.sampleUsers.map((user: SampleUser) => (
                        <div key={user._id} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="font-bold">{user.name}</div>
                          <div className="text-gray-600">{user.email} | {user.phoneNumber}</div>
                          <div className="text-gray-600">{user.country}, {user.age} ans, {user.profession}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setWizardStep(2)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        Ajuster filtres
                      </button>
                      <button onClick={handleCreateCampaign} className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">
                        Créer la campagne
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Modal */}
        <AnimatePresence>
          {messageModal.show && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMessageModal({ ...messageModal, show: false })}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  {messageModal.type === 'success' && <span className="text-3xl">✅</span>}
                  {messageModal.type === 'error' && <span className="text-3xl">❌</span>}
                  {messageModal.type === 'info' && <span className="text-3xl">ℹ️</span>}
                  <h4 className="text-lg font-bold">{messageModal.title}</h4>
                </div>
                <p className="text-gray-700 mb-6">{messageModal.message}</p>
                <button
                  className="w-full bg-green-500 text-white rounded-xl py-2 font-bold shadow hover:bg-green-600 transition-colors"
                  onClick={() => setMessageModal({ ...messageModal, show: false })}
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

export default RelancePage;
