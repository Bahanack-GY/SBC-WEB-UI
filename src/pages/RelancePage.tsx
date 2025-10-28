import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaPlus, FaPlay, FaPause, FaTimes, FaChevronRight, FaSync, FaTrash } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { sbcApiService } from '../services/SBCApiService';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import type { RelanceStatus, Campaign, FilterPreviewResponse, CampaignFilter, SampleUser, CampaignStatus, DefaultRelanceStats, CustomMessage } from '../types/relance';
import { countryOptions } from '../utils/countriesData';

function RelancePage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Check if user is admin AND has Relance subscription
  const isAdmin = user?.role === 'admin';
  const [hasRelanceSubscription, setHasRelanceSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // WhatsApp connection state
  const [status, setStatus] = useState<RelanceStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrPollingActive, setQrPollingActive] = useState(false);

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Filtered campaigns only
  const [defaultStats, setDefaultStats] = useState<DefaultRelanceStats | null>(null); // Default relance stats
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Campaign creation wizard state
  const [campaignName, setCampaignName] = useState('');
  const [filters, setFilters] = useState<CampaignFilter>({
    countries: [],
    registrationDateFrom: undefined,
    registrationDateTo: undefined,
    subscriptionStatus: 'all',
    hasUnpaidReferrals: false,
    excludeCurrentTargets: true,
  });
  const [previewData, setPreviewData] = useState<FilterPreviewResponse | null>(null);

  // Custom messages state
  const [useCustomMessages, setUseCustomMessages] = useState(false);
  const [customMessages, setCustomMessages] = useState<CustomMessage[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      messageTemplate: { fr: '', en: '' },
      mediaUrls: []
    }))
  );
  const [activeMessageDay, setActiveMessageDay] = useState(1);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [showCampaignHistory, setShowCampaignHistory] = useState(false);
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState<Campaign | null>(null);

  // Message modal state
  const [messageModal, setMessageModal] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Confirmation modal state (for delete confirmation)
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; onConfirm?: () => void }>({
    show: false,
    message: ''
  });
  const [deleting, setDeleting] = useState<string | null>(null);

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

  // Check Relance subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await sbcApiService.checkSubscription('RELANCE');
        const hasSub = response?.body?.data?.hasSubscription || false;
        setHasRelanceSubscription(hasSub);
      } catch (error) {
        setHasRelanceSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, []);

  // Fetch status on mount (only if has subscription)
  useEffect(() => {
    if (hasRelanceSubscription && !checkingSubscription) {
      fetchStatus();
      fetchCampaigns();
    }
  }, [hasRelanceSubscription, checkingSubscription]);

  const fetchStatus = async () => {
    try {
      const response = await sbcApiService.relanceGetStatus();
      if (response.isSuccessByStatusCode && response.body?.data) {
        setStatus(response.body.data as RelanceStatus);
      } else {
        showMessage(
          'Erreur de chargement',
          response.body?.message || 'Impossible de charger le statut de la relance',
          'error'
        );
      }
    } catch (err: any) {
      showMessage(
        'Erreur de connexion',
        err.message || 'Une erreur inattendue s\'est produite lors du chargement du statut',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      // Fetch default stats and filtered campaigns separately
      const [defaultStatsResponse, filteredCampaignsResponse] = await Promise.all([
        sbcApiService.relanceGetDefaultStats(),
        sbcApiService.relanceGetCampaigns()
      ]);

      // Process default stats
      if (defaultStatsResponse.isSuccessByStatusCode && defaultStatsResponse.body?.data) {
        const stats = defaultStatsResponse.body.data as DefaultRelanceStats;
        setDefaultStats(stats);

        // Update status with isPaused from default stats
        if (status) {
          setStatus({
            ...status,
            defaultCampaignPaused: stats.isPaused
          });
        }
      } else {
        setDefaultStats(null);
      }

      // Process filtered campaigns
      if (filteredCampaignsResponse.isSuccessByStatusCode && filteredCampaignsResponse.body?.data) {
        const campaignsData = filteredCampaignsResponse.body.data.campaigns || filteredCampaignsResponse.body.data;
        if (Array.isArray(campaignsData)) {
          setCampaigns(campaignsData);
        } else {
          setCampaigns([]);
        }
      } else {
        setCampaigns([]);
      }
    } catch (err: any) {
      setDefaultStats(null);
      setCampaigns([]);
      showMessage(
        'Erreur de chargement',
        err.message || 'Impossible de charger les campagnes',
        'error'
      );
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
      registrationDateFrom: undefined,
      registrationDateTo: undefined,
      subscriptionStatus: 'all',
      hasUnpaidReferrals: false,
      excludeCurrentTargets: true,
    });
    setPreviewData(null);
    // Reset custom messages
    setUseCustomMessages(false);
    setCustomMessages(
      Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        messageTemplate: { fr: '', en: '' },
        mediaUrls: []
      }))
    );
    setActiveMessageDay(1);
    setWizardStep(1);
    setShowCampaignWizard(true);
  };

  const handlePreviewFilters = async () => {
    try {
      const response = await sbcApiService.relancePreviewFilters(filters);
      if (response.isSuccessByStatusCode && response.body?.data) {
        setPreviewData(response.body.data);
        setWizardStep(4); // Updated to step 4
      }
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de l\'aperçu des filtres', 'error');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      // Filter out empty messages if using custom messages
      const filteredCustomMessages = useCustomMessages
        ? customMessages.filter(
            (msg) => msg.messageTemplate.fr.trim() && msg.messageTemplate.en.trim()
          )
        : undefined;

      const response = await sbcApiService.relanceCreateCampaign({
        name: campaignName,
        targetFilter: filters,
        customMessages: filteredCustomMessages, // Include custom messages if provided
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

  const handleDeleteCampaign = async (campaignId: string, campaignName: string, campaignStatus: CampaignStatus) => {
    // Check if campaign can be deleted
    if (campaignStatus === 'active' || campaignStatus === 'paused') {
      showMessage(
        'Impossible de supprimer',
        'Vous ne pouvez pas supprimer une campagne active ou en pause. Veuillez d\'abord annuler la campagne.',
        'error'
      );
      return;
    }

    // Show confirmation modal
    setConfirmModal({
      show: true,
      message: `Êtes-vous sûr de vouloir supprimer la campagne "${campaignName}" ? Cette action est irréversible et supprimera toutes les cibles associées.`,
      onConfirm: async () => {
        try {
          setDeleting(campaignId);
          const response = await sbcApiService.relanceDeleteCampaign(campaignId);

          if (response.isSuccessByStatusCode) {
            // Remove campaign from local state
            setCampaigns(campaigns.filter(c => c._id !== campaignId));

            // Close detail modal if it's the deleted campaign
            if (selectedCampaignDetail?._id === campaignId) {
              setSelectedCampaignDetail(null);
            }

            const targetsDeleted = response.body?.data?.targetsDeleted || 0;
            showMessage(
              'Campagne supprimée',
              `La campagne a été supprimée avec succès. ${targetsDeleted} cible(s) ont été retirées.`,
              'success'
            );
          } else {
            throw new Error(response.body?.message || 'Échec de la suppression');
          }
        } catch (err: any) {
          showMessage('Erreur', err.message || 'Échec de la suppression de la campagne', 'error');
        } finally {
          setDeleting(null);
        }
      }
    });
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
    const canDelete = ['draft', 'scheduled', 'completed', 'cancelled'].includes(campaign.status);

    if (campaign.status === 'draft') {
      return (
        <div className="flex gap-2">
          <button onClick={() => handleStartCampaign(campaign._id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600">
            <FaPlay className="inline mr-1" /> Démarrer
          </button>
          <button
            onClick={() => handleDeleteCampaign(campaign._id, campaign.name, campaign.status)}
            disabled={deleting === campaign._id}
            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTrash className="inline mr-1" /> Supprimer
          </button>
        </div>
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
    } else if (canDelete) {
      // For completed, cancelled, or scheduled campaigns - show delete button
      return (
        <button
          onClick={() => handleDeleteCampaign(campaign._id, campaign.name, campaign.status)}
          disabled={deleting === campaign._id}
          className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaTrash className="inline mr-1" /> {deleting === campaign._id ? 'Suppression...' : 'Supprimer'}
        </button>
      );
    }
    return null;
  };

  if (loading || checkingSubscription) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">Chargement...</div>
      </ProtectedRoute>
    );
  }

  // Show coming soon modal if user doesn't have Relance subscription OR is not admin
  if (!hasRelanceSubscription || !isAdmin) {
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
        <div className="flex items-center mb-4 gap-2">
          <BackButton />
          <h3 className="text-xl font-medium text-center flex-1">{t('pages.relance.title')}</h3>
          <LanguageSwitcher />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title={t('common.refresh')}
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

        {/* Default Relance Card (NOT a campaign) */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <FaWhatsapp className="text-green-600" />
            Relance par défaut
          </h3>
          {(() => {
            // Use defaultStats.isPaused as fallback if status hasn't loaded yet
            const isPaused = status?.defaultCampaignPaused ?? defaultStats?.isPaused ?? false;
            const isActive = !isPaused && status?.whatsappStatus === 'connected';

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl shadow-lg p-5 border-2 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              >
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    {isPaused ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        ⏸️ En pause
                      </span>
                    ) : isActive ? (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        ▶️ Actif
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        ⏹️ Inactif
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      Tous les nouveaux filleuls non payés sont inscrits automatiquement
                    </span>
                  </div>
                </div>

                {defaultStats ? (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Total inscrits</div>
                        <div className="text-2xl font-bold text-gray-800">{defaultStats.totalEnrolled}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Cibles actives</div>
                        <div className="text-2xl font-bold text-blue-600">{defaultStats.activeTargets}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Taux de livraison</div>
                        <div className="text-2xl font-bold text-green-600">{defaultStats.deliveryPercentage.toFixed(1)}%</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Relance terminée</div>
                        <div className="text-2xl font-bold text-purple-600">{defaultStats.completedRelance}</div>
                      </div>
                    </div>

                    {/* Additional Metrics Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Messages envoyés</div>
                        <div className="text-xl font-bold text-blue-500">{defaultStats.totalMessagesSent}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Messages livrés</div>
                        <div className="text-xl font-bold text-green-500">{defaultStats.totalMessagesDelivered}</div>
                      </div>
                    </div>

                    {/* Day-by-day progression */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                      <h5 className="font-bold text-sm text-gray-700 mb-3">
                        Distribution des cibles actives (7 jours)
                      </h5>
                      <div className="space-y-2">
                        {defaultStats.dayProgression && defaultStats.dayProgression.length > 0 ? (
                          defaultStats.dayProgression.map((dayStat) => {
                            // Calculate percentage based on active targets
                            const percentage = defaultStats.activeTargets > 0
                              ? (dayStat.count / defaultStats.activeTargets) * 100
                              : 0;

                            return (
                              <div key={dayStat.day} className="flex items-center gap-3">
                                <div className="text-xs font-medium text-gray-600 w-12">Jour {dayStat.day}</div>
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-xs font-bold text-gray-700 w-16 text-right">
                                  {dayStat.count} ({percentage.toFixed(0)}%)
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          // Show placeholder when no data
                          [1, 2, 3, 4, 5, 6, 7].map((day) => (
                            <div key={day} className="flex items-center gap-3">
                              <div className="text-xs font-medium text-gray-600 w-12">Jour {day}</div>
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div className="bg-gray-300 h-2.5 rounded-full" style={{ width: '0%' }} />
                                </div>
                              </div>
                              <div className="text-xs font-bold text-gray-400 w-16 text-right">
                                0 (0%)
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Nombre de cibles actives sur chaque jour du cycle
                      </p>
                    </div>

                    {/* Campaign Controls */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <h5 className="font-bold text-sm text-gray-700 mb-3">Contrôles de campagne</h5>

                      {/* Pause/Resume Button */}
                      <div className="mb-3">
                        <button
                          onClick={async () => {
                            try {
                              const currentPausedState = status?.defaultCampaignPaused || false;
                              const newPausedState = !currentPausedState;

                              const response = await sbcApiService.relanceUpdateConfig({
                                defaultCampaignPaused: newPausedState
                              });

                              // Update status immediately from response
                              if (response.isSuccessByStatusCode && response.body?.data) {
                                setStatus(response.body.data as RelanceStatus);
                              }

                              showMessage(
                                'Succès',
                                newPausedState ? 'Relance par défaut mise en pause' : 'Relance par défaut réactivée',
                                'success'
                              );
                            } catch (error: any) {
                              showMessage('Erreur', 'Échec de la mise à jour de la configuration', 'error');
                            }
                          }}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isPaused
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {isPaused ? (
                            <>
                              <FaPlay /> Réactiver la relance
                            </>
                          ) : (
                            <>
                              <FaPause /> Mettre en pause
                            </>
                          )}
                        </button>
                        {isPaused && !status?.allowSimultaneousCampaigns && campaigns.length > 0 && (
                          <p className="text-xs text-orange-600 mt-2">
                            ℹ️ La relance par défaut est automatiquement mise en pause car vous avez des campagnes filtrées actives.
                          </p>
                        )}
                      </div>

                      {/* Simultaneous Campaigns Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-800">Campagnes simultanées</div>
                          <div className="text-xs text-gray-600">
                            Autoriser la relance par défaut à fonctionner en même temps que les campagnes filtrées
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const currentValue = status?.allowSimultaneousCampaigns || false;
                              const newValue = !currentValue;

                              const response = await sbcApiService.relanceUpdateConfig({
                                allowSimultaneousCampaigns: newValue
                              });

                              // Update status immediately from response
                              if (response.isSuccessByStatusCode && response.body?.data) {
                                setStatus(response.body.data as RelanceStatus);
                              }

                              showMessage(
                                'Succès',
                                newValue
                                  ? 'Campagnes simultanées activées'
                                  : 'Campagnes simultanées désactivées',
                                'success'
                              );
                            } catch (error: any) {
                              showMessage('Erreur', 'Échec de la mise à jour de la configuration', 'error');
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            status?.allowSimultaneousCampaigns ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              status?.allowSimultaneousCampaigns ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                    <div className="text-4xl mb-3">💤</div>
                    <p className="text-gray-600 mb-2 font-medium">Aucune cible pour le moment</p>
                    <p className="text-xs text-gray-500">
                      Les nouveaux filleuls non payés seront automatiquement inscrits 1 heure après leur inscription.
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })()}
        </div>

        {/* Filtered Campaigns List */}
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
              <p className="mb-2">Aucune campagne filtrée créée</p>
              <p className="text-sm">Créez une campagne pour cibler des utilisateurs spécifiques</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {campaigns.slice(0, 2).map((campaign, index) => {
                const completionRate = campaign.targetsEnrolled > 0 ? (campaign.targetsCompleted / campaign.targetsEnrolled) * 100 : 0;
                const deliveryRate = campaign.messagesSent > 0 ? (campaign.messagesDelivered / campaign.messagesSent) * 100 : 0;

                return (
                  <motion.div
                    key={campaign._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl shadow-lg p-5 border-2 bg-white border-gray-100"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">{campaign.name}</h4>
                        <p className="text-xs text-gray-500">Campagne ciblée</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(campaign.status)}
                        <button
                          onClick={() => setExpandedCampaign(expandedCampaign === campaign._id ? null : campaign._id)}
                          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        >
                          <FaChevronRight className={`transition-transform text-gray-600 ${expandedCampaign === campaign._id ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Cibles inscrites</div>
                        <div className="text-2xl font-bold text-gray-800">{campaign.targetsEnrolled}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Messages envoyés</div>
                        <div className="text-2xl font-bold text-blue-600">{campaign.messagesSent}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Taux de livraison</div>
                        <div className="text-2xl font-bold text-green-600">{deliveryRate.toFixed(1)}%</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Terminés</div>
                        <div className="text-2xl font-bold text-purple-600">{campaign.targetsCompleted}</div>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span className="font-medium">Progression globale</span>
                        <span className="font-bold text-gray-800">{completionRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">
                          <span className="font-medium text-gray-700">{campaign.targetsEnrolled - campaign.targetsCompleted - campaign.targetsExited}</span> en cours
                        </span>
                        <span className="text-gray-500">
                          <span className="font-medium text-gray-700">{campaign.targetsExited}</span> sortis
                        </span>
                      </div>
                    </div>

                    {/* Expanded Section */}
                    {expandedCampaign === campaign._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200 pt-4 mt-4"
                      >
                        {campaign.targetFilter && (
                          <div className="bg-gray-50 rounded-xl p-3 mb-3">
                            <div className="font-bold text-sm text-gray-700 mb-2">Filtres appliqués</div>
                            <div className="text-xs text-gray-600 space-y-1">
                              {campaign.targetFilter?.countries && campaign.targetFilter.countries.length > 0 && (
                                <div>• Pays : {campaign.targetFilter.countries.join(', ')}</div>
                              )}
                              {campaign.targetFilter?.registrationDateFrom && campaign.targetFilter?.registrationDateTo && (
                                <div>
                                  • Période : {new Date(campaign.targetFilter.registrationDateFrom).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                  {' à '}
                                  {new Date(campaign.targetFilter.registrationDateTo).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                </div>
                              )}
                              {campaign.targetFilter?.subscriptionStatus && campaign.targetFilter.subscriptionStatus !== 'all' && (
                                <div>• {campaign.targetFilter.subscriptionStatus === 'subscribed' ? 'Abonnés uniquement' : 'Non abonnés uniquement'}</div>
                              )}
                              {campaign.targetFilter?.hasUnpaidReferrals && <div>• Avec filleuls non-payants</div>}
                              {campaign.targetFilter?.excludeCurrentTargets && <div>• Exclure les campagnes actives</div>}
                            </div>
                          </div>
                        )}
                        {getCampaignActions(campaign)}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
              </div>

              {/* See All History Button */}
              {campaigns.length > 2 && (
                <button
                  onClick={() => setShowCampaignHistory(true)}
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Voir tout l'historique ({campaigns.length} campagnes)
                </button>
              )}
            </>
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
                    {/* PRIMARY FILTERS */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 mb-3">Filtres principaux</h4>

                      {/* Countries */}
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 font-medium">🌍 Pays (optionnel)</label>
                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3">
                          {countryOptions.map((country) => {
                            const isSelected = filters.countries?.includes(country.code);
                            return (
                              <button
                                key={country.code}
                                type="button"
                                className={`px-3 py-1 rounded-full border text-xs font-medium ${
                                  isSelected
                                    ? 'bg-green-700 text-white border-green-700'
                                    : 'bg-white text-gray-700 border-gray-300'
                                }`}
                                onClick={() => {
                                  setFilters({
                                    ...filters,
                                    countries: isSelected
                                      ? filters.countries?.filter(c => c !== country.code)
                                      : [...(filters.countries || []), country.code]
                                  });
                                }}
                              >
                                {country.label}
                              </button>
                            );
                          })}
                        </div>
                        {filters.countries && filters.countries.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">{filters.countries.length} pays sélectionné(s)</p>
                        )}
                      </div>

                      {/* Registration Date Range */}
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 font-medium">📅 Période d'inscription (optionnel)</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-600 text-xs mb-1">De</label>
                            <input
                              type="month"
                              value={filters.registrationDateFrom ? filters.registrationDateFrom.substring(0, 7) : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFilters({
                                  ...filters,
                                  registrationDateFrom: value ? `${value}-01T00:00:00.000Z` : undefined
                                });
                              }}
                              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 text-xs mb-1">À</label>
                            <input
                              type="month"
                              value={filters.registrationDateTo ? filters.registrationDateTo.substring(0, 7) : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value) {
                                  const date = new Date(value);
                                  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                                  setFilters({
                                    ...filters,
                                    registrationDateTo: `${value}-${lastDay}T23:59:59.999Z`
                                  });
                                } else {
                                  setFilters({ ...filters, registrationDateTo: undefined });
                                }
                              }}
                              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subscription Status */}
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 font-medium">💳 Statut d'abonnement</label>
                        <select
                          value={filters.subscriptionStatus || 'all'}
                          onChange={(e) => setFilters({ ...filters, subscriptionStatus: e.target.value as any })}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6] bg-white"
                        >
                          <option value="all">Tous les utilisateurs</option>
                          <option value="subscribed">✅ Abonnés (payé l'inscription)</option>
                          <option value="non-subscribed">❌ Non abonnés (pas payé l'inscription)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Abonnés = ceux qui ont payé 2000 ou 5000 FCFA (CLASSIQUE/CIBLE)
                        </p>
                      </div>
                    </div>

                    {/* ADDITIONAL FILTERS */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 mb-3">Filtres additionnels</h4>

                      <label className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={filters.hasUnpaidReferrals || false}
                          onChange={(e) => setFilters({ ...filters, hasUnpaidReferrals: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Seulement ceux avec des filleuls non-payants</span>
                      </label>

                      <label className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          checked={filters.excludeCurrentTargets || false}
                          onChange={(e) => setFilters({ ...filters, excludeCurrentTargets: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Exclure les utilisateurs déjà dans une campagne</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setWizardStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl font-medium hover:bg-gray-300 transition-colors">
                        Retour
                      </button>
                      <button onClick={() => setWizardStep(3)} className="flex-1 bg-[#25D366] text-white py-2 rounded-xl font-medium hover:bg-[#1ea952] transition-colors">
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Custom Messages (Optional) */}
                {wizardStep === 3 && (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800">
                        {t('pages.relance.customMessages.customMessagesInfo')}
                      </p>
                    </div>

                    {/* Toggle for custom messages */}
                    <div className="mb-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useCustomMessages}
                          onChange={(e) => setUseCustomMessages(e.target.checked)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="font-semibold text-gray-800">
                          {t('pages.relance.customMessages.useCustomMessages')}
                        </span>
                      </label>
                    </div>

                    {useCustomMessages && (
                      <div>
                        {/* Day tabs */}
                        <div className="mb-4 overflow-x-auto">
                          <div className="flex gap-2 min-w-max">
                            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                              <button
                                key={day}
                                onClick={() => setActiveMessageDay(day)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  activeMessageDay === day
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {t('pages.relance.customMessages.day')} {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Message editor for active day */}
                        <div className="space-y-4">
                          {/* Variables helper */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              {t('pages.relance.customMessages.availableVariables')}:
                            </p>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div><code className="bg-white px-2 py-0.5 rounded">{'{{name}}'}</code> - {t('pages.relance.customMessages.varName').split(' - ')[1]}</div>
                              <div><code className="bg-white px-2 py-0.5 rounded">{'{{referrerName}}'}</code> - {t('pages.relance.customMessages.varReferrerName').split(' - ')[1]}</div>
                              <div><code className="bg-white px-2 py-0.5 rounded">{'{{day}}'}</code> - {t('pages.relance.customMessages.varDay').split(' - ')[1]}</div>
                            </div>
                          </div>

                          {/* French message */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('pages.relance.customMessages.frenchMessage')} *
                            </label>
                            <textarea
                              value={customMessages[activeMessageDay - 1]?.messageTemplate.fr || ''}
                              onChange={(e) => {
                                const updatedMessages = [...customMessages];
                                updatedMessages[activeMessageDay - 1].messageTemplate.fr = e.target.value;
                                setCustomMessages(updatedMessages);
                              }}
                              placeholder={t('pages.relance.customMessages.frenchPlaceholder')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={4}
                            />
                          </div>

                          {/* English message */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('pages.relance.customMessages.englishMessage')} *
                            </label>
                            <textarea
                              value={customMessages[activeMessageDay - 1]?.messageTemplate.en || ''}
                              onChange={(e) => {
                                const updatedMessages = [...customMessages];
                                updatedMessages[activeMessageDay - 1].messageTemplate.en = e.target.value;
                                setCustomMessages(updatedMessages);
                              }}
                              placeholder={t('pages.relance.customMessages.englishPlaceholder')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={4}
                            />
                          </div>

                          {/* Media URL (simplified - can be enhanced later) */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              {t('pages.relance.customMessages.mediaUrl')} ({t('common.optional')})
                            </label>
                            <input
                              type="url"
                              placeholder="https://example.com/image.jpg"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onChange={(e) => {
                                const updatedMessages = [...customMessages];
                                if (e.target.value) {
                                  updatedMessages[activeMessageDay - 1].mediaUrls = [{
                                    url: e.target.value,
                                    type: 'image' // Default to image, can add selector later
                                  }];
                                } else {
                                  updatedMessages[activeMessageDay - 1].mediaUrls = [];
                                }
                                setCustomMessages(updatedMessages);
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              URL publique d'une image, vidéo ou PDF
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => setWizardStep(2)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                      >
                        {t('common.previous')}
                      </button>
                      <button
                        onClick={handlePreviewFilters}
                        className="flex-1 bg-[#25D366] text-white py-2 rounded-lg hover:bg-[#1ea952]"
                      >
                        Aperçu des résultats
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && previewData && (
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
                      <button onClick={() => setWizardStep(3)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        {t('common.previous')}
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

        {/* Campaign History Modal */}
        <AnimatePresence>
          {showCampaignHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end"
              onClick={() => setShowCampaignHistory(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Historique des campagnes</h3>
                    <button
                      onClick={() => setShowCampaignHistory(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <FaTimes className="text-gray-600" size={20} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{campaigns.length} campagne{campaigns.length > 1 ? 's' : ''} au total</p>
                </div>

                {/* Campaign List */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {campaigns.map((campaign) => {
                      const deliveryRate = campaign.messagesSent > 0 ? (campaign.messagesDelivered / campaign.messagesSent) * 100 : 0;

                      // Get status icon and color
                      const getStatusIcon = () => {
                        switch (campaign.status) {
                          case 'active': return '▶️';
                          case 'paused': return '⏸️';
                          case 'completed': return '✅';
                          case 'cancelled': return '❌';
                          case 'scheduled': return '📅';
                          default: return '📄';
                        }
                      };

                      const getStatusColor = () => {
                        switch (campaign.status) {
                          case 'active': return 'bg-green-100 text-green-700';
                          case 'paused': return 'bg-yellow-100 text-yellow-700';
                          case 'completed': return 'bg-gray-100 text-gray-700';
                          case 'cancelled': return 'bg-red-100 text-red-700';
                          case 'scheduled': return 'bg-purple-100 text-purple-700';
                          default: return 'bg-blue-100 text-blue-700';
                        }
                      };

                      return (
                        <div
                          key={campaign._id}
                          onClick={() => {
                            setSelectedCampaignDetail(campaign);
                            setShowCampaignHistory(false);
                          }}
                          className="flex items-center justify-between py-3 px-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Status Icon */}
                            <div className={`w-10 h-10 rounded-full ${getStatusColor()} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-xl">{getStatusIcon()}</span>
                            </div>

                            {/* Campaign Info */}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-gray-800 truncate">{campaign.name}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                            <div className="font-bold text-sm text-gray-800">
                              {campaign.targetsEnrolled} cibles
                            </div>
                            <div className="text-xs text-green-600 font-medium">
                              {deliveryRate.toFixed(0)}% livré
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Campaign Detail Modal */}
        <AnimatePresence>
          {selectedCampaignDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedCampaignDetail(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const campaign = selectedCampaignDetail;
                  const completionRate = campaign.targetsEnrolled > 0 ? (campaign.targetsCompleted / campaign.targetsEnrolled) * 100 : 0;
                  const deliveryRate = campaign.messagesSent > 0 ? (campaign.messagesDelivered / campaign.messagesSent) * 100 : 0;

                  return (
                    <>
                      {/* Header */}
                      <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{campaign.name}</h3>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(campaign.status)}
                              <span className="text-xs text-gray-500">
                                Créée le {new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedCampaignDetail(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <FaTimes className="text-gray-600" size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Cibles inscrites</div>
                            <div className="text-3xl font-bold text-gray-800">{campaign.targetsEnrolled}</div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                            <div className="text-xs text-blue-600 mb-1">Messages envoyés</div>
                            <div className="text-3xl font-bold text-blue-700">{campaign.messagesSent}</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                            <div className="text-xs text-green-600 mb-1">Taux de livraison</div>
                            <div className="text-3xl font-bold text-green-700">{deliveryRate.toFixed(1)}%</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                            <div className="text-xs text-purple-600 mb-1">Terminés</div>
                            <div className="text-3xl font-bold text-purple-700">{campaign.targetsCompleted}</div>
                          </div>
                        </div>

                        {/* Additional Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Livrés</div>
                            <div className="text-lg font-bold text-green-600">{campaign.messagesDelivered}</div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Échoués</div>
                            <div className="text-lg font-bold text-red-600">{campaign.messagesFailed}</div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Sortis</div>
                            <div className="text-lg font-bold text-orange-600">{campaign.targetsExited}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span className="font-medium">Progression globale</span>
                            <span className="font-bold text-gray-800">{completionRate.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all duration-500"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>
                              <span className="font-medium text-gray-700">{campaign.targetsEnrolled - campaign.targetsCompleted - campaign.targetsExited}</span> en cours
                            </span>
                            <span>
                              <span className="font-medium text-gray-700">{campaign.targetsCompleted}</span> / {campaign.targetsEnrolled} terminés
                            </span>
                          </div>
                        </div>

                        {/* Filters Applied */}
                        {campaign.targetFilter && (
                          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
                            <div className="font-bold text-sm text-blue-900 mb-3 flex items-center gap-2">
                              <span>🎯</span> Filtres appliqués
                            </div>
                            <div className="space-y-2 text-sm text-blue-800">
                              {campaign.targetFilter?.countries && campaign.targetFilter.countries.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium min-w-[80px]">Pays:</span>
                                  <span className="flex-1">{campaign.targetFilter.countries.join(', ')}</span>
                                </div>
                              )}
                              {campaign.targetFilter?.registrationDateFrom && campaign.targetFilter?.registrationDateTo && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium min-w-[80px]">Période:</span>
                                  <span className="flex-1">
                                    {new Date(campaign.targetFilter.registrationDateFrom).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                    {' à '}
                                    {new Date(campaign.targetFilter.registrationDateTo).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              {campaign.targetFilter?.subscriptionStatus && campaign.targetFilter.subscriptionStatus !== 'all' && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium min-w-[80px]">Abonnement:</span>
                                  <span className="flex-1">
                                    {campaign.targetFilter.subscriptionStatus === 'subscribed' ? '✅ Abonnés uniquement' : '❌ Non abonnés uniquement'}
                                  </span>
                                </div>
                              )}
                              {campaign.targetFilter?.hasUnpaidReferrals && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium min-w-[80px]">Filleuls:</span>
                                  <span className="flex-1">Avec filleuls non-payants</span>
                                </div>
                              )}
                              {campaign.targetFilter?.excludeCurrentTargets && (
                                <div className="flex items-start gap-2">
                                  <span className="font-medium min-w-[80px]">Exclusion:</span>
                                  <span className="flex-1">Campagnes actives exclues</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          {getCampaignActions(campaign)}
                          <button
                            onClick={() => setSelectedCampaignDetail(null)}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmModal.show && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2 }}
              >
                <h4 className="text-lg font-bold mb-4 text-center text-gray-800">
                  Confirmation
                </h4>
                <p className="text-sm text-gray-700 text-center mb-4">
                  {confirmModal.message}
                </p>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    className="flex-1 bg-red-500 text-white rounded-xl py-2 font-bold shadow hover:bg-red-600 transition-colors"
                    onClick={() => {
                      confirmModal.onConfirm?.();
                      setConfirmModal({ show: false, message: '' });
                    }}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                    onClick={() => setConfirmModal({ show: false, message: '' })}
                  >
                    Annuler
                  </button>
                </div>
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
