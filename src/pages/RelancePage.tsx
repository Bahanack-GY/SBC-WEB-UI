import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaPlus, FaPlay, FaPause, FaTimes, FaChevronRight, FaSync, FaTrash, FaUsers, FaPaperPlane, FaCheckCircle, FaCog } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import TourButton from '../components/common/TourButton';
import { sbcApiService } from '../services/SBCApiService';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import type { RelanceStatus, Campaign, CampaignFilter, SampleUser, CampaignStatus, DefaultRelanceStats, CustomMessage, RelanceTarget } from '../types/relance';
import { countryOptions } from '../utils/countriesData';

function RelancePage() {
  const { user } = useAuth();
  const isAdminOrTester = user?.role === 'admin' || user?.role === 'tester';
  const { t } = useTranslation();

  // Subscription state - let backend validate via /relance/status
  const [hasRelanceSubscription, setHasRelanceSubscription] = useState(true);

  // Relance status state
  const [status, setStatus] = useState<RelanceStatus | null>(null);
  const [defaultStats, setDefaultStats] = useState<DefaultRelanceStats | null>(null);

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Targets state
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [targets, setTargets] = useState<RelanceTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Campaign creation wizard state
  const [campaignName, setCampaignName] = useState('');
  const [filters, setFilters] = useState<CampaignFilter>({
    countries: [],
    registrationDateFrom: undefined,
    registrationDateTo: undefined,
    hasUnpaidReferrals: true,
    excludeCurrentTargets: true,
  });
  const [previewData, setPreviewData] = useState<{ estimatedCount: number; sampleUsers: SampleUser[] } | null>(null);

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

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; message: string; onConfirm?: () => void }>({
    show: false,
    message: ''
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  // Helper function to show messages
  const showMessage = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessageModal({ show: true, title, message, type });
  };

  // Refresh status and campaigns
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchStatus(), fetchCampaigns()]);
      showMessage('Actualisé', 'Données mises à jour', 'success');
    } catch (err: any) {
      showMessage('Erreur', 'Échec de l\'actualisation', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch data on mount - backend will validate subscription
  useEffect(() => {
    fetchStatus();
    fetchCampaigns();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await sbcApiService.relanceGetStatus();
      if (response.isSuccessByStatusCode && response.body?.data) {
        setStatus(response.body.data as RelanceStatus);
        setHasRelanceSubscription(true);
      } else {
        // Check if it's a subscription error
        const errorMessage = response.body?.message || '';
        if (errorMessage.toLowerCase().includes('subscription') ||
            errorMessage.toLowerCase().includes('abonnement') ||
            response.statusCode === 403) {
          setHasRelanceSubscription(false);
        }
      }
    } catch (err: any) {
      console.error('Error fetching status:', err);
      // Check if error is subscription related
      const errorMessage = err?.message || '';
      if (errorMessage.toLowerCase().includes('subscription') ||
          errorMessage.toLowerCase().includes('abonnement')) {
        setHasRelanceSubscription(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const [defaultStatsResponse, campaignsResponse] = await Promise.all([
        sbcApiService.relanceGetDefaultStats(),
        sbcApiService.relanceGetCampaigns()
      ]);

      // Process default stats
      if (defaultStatsResponse.isSuccessByStatusCode && defaultStatsResponse.body?.data) {
        setDefaultStats(defaultStatsResponse.body.data as DefaultRelanceStats);
      } else {
        setDefaultStats(null);
      }

      // Process campaigns
      if (campaignsResponse.isSuccessByStatusCode && campaignsResponse.body?.data) {
        const campaignsData = campaignsResponse.body.data.campaigns || campaignsResponse.body.data;
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
    }
  };

  const fetchTargets = async () => {
    setLoadingTargets(true);
    try {
      const response = await sbcApiService.relanceGetDefaultTargets({ page: 1, limit: 50 });
      if (response.isSuccessByStatusCode && response.body?.data) {
        const targetsData = response.body.data.targets || response.body.data;
        setTargets(Array.isArray(targetsData) ? targetsData : []);
      }
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoadingTargets(false);
    }
  };

  // Toggle relance enabled/disabled
  const handleToggleEnabled = async () => {
    try {
      const newEnabled = !(status?.enabled ?? false);
      const response = await sbcApiService.relanceUpdateSettings({ enabled: newEnabled });
      if (response.isSuccessByStatusCode) {
        await fetchStatus();
        showMessage(
          'Succès',
          newEnabled ? 'Relance activée' : 'Relance désactivée',
          'success'
        );
      }
    } catch (err: any) {
      showMessage('Erreur', 'Échec de la mise à jour', 'error');
    }
  };

  // Toggle enrollment pause
  const handleToggleEnrollmentPause = async () => {
    try {
      const newPaused = !(status?.enrollmentPaused ?? false);
      const response = await sbcApiService.relanceUpdateSettings({ enrollmentPaused: newPaused });
      if (response.isSuccessByStatusCode) {
        await fetchStatus();
        showMessage(
          'Succès',
          newPaused ? 'Inscription en pause' : 'Inscription reprise',
          'success'
        );
      }
    } catch (err: any) {
      showMessage('Erreur', 'Échec de la mise à jour', 'error');
    }
  };

  // Toggle sending pause
  const handleToggleSendingPause = async () => {
    try {
      const newPaused = !(status?.sendingPaused ?? false);
      const response = await sbcApiService.relanceUpdateSettings({ sendingPaused: newPaused });
      if (response.isSuccessByStatusCode) {
        await fetchStatus();
        showMessage(
          'Succès',
          newPaused ? 'Envoi en pause' : 'Envoi repris',
          'success'
        );
      }
    } catch (err: any) {
      showMessage('Erreur', 'Échec de la mise à jour', 'error');
    }
  };

  // Campaign wizard handlers
  const handleOpenWizard = () => {
    setCampaignName('');
    setFilters({
      countries: [],
      registrationDateFrom: undefined,
      registrationDateTo: undefined,
      hasUnpaidReferrals: true,
      excludeCurrentTargets: true,
    });
    setPreviewData(null);
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
        setWizardStep(4);
      }
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de l\'aperçu des filtres', 'error');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const filteredCustomMessages = useCustomMessages
        ? customMessages.filter(
            (msg) => msg.messageTemplate.fr.trim() && msg.messageTemplate.en.trim()
          )
        : undefined;

      const response = await sbcApiService.relanceCreateCampaign({
        name: campaignName,
        type: 'filtered',
        targetFilter: filters,
        customMessages: filteredCustomMessages,
        maxMessagesPerDay: 30,
      });

      if (response.isSuccessByStatusCode && response.body?.data) {
        const newCampaign = response.body.data;
        setShowCampaignWizard(false);
        await fetchCampaigns();
        showMessage('Campagne créée', `Campagne "${campaignName}" créée avec succès !`, 'success');
        // Auto-start
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
      showMessage('Campagne démarrée', 'Les emails seront envoyés automatiquement.', 'success');
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec du démarrage de la campagne', 'error');
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await sbcApiService.relancePauseCampaign(campaignId);
      await fetchCampaigns();
      showMessage('Campagne en pause', 'Aucun email ne sera envoyé pendant la pause.', 'success');
    } catch (err: any) {
      showMessage('Erreur', err.message || 'Échec de la mise en pause', 'error');
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await sbcApiService.relanceResumeCampaign(campaignId);
      await fetchCampaigns();
      showMessage('Campagne reprise', 'Les emails reprendront automatiquement.', 'success');
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
    if (campaignStatus === 'active' || campaignStatus === 'paused') {
      showMessage(
        'Impossible de supprimer',
        'Vous ne pouvez pas supprimer une campagne active ou en pause. Veuillez d\'abord annuler la campagne.',
        'error'
      );
      return;
    }

    setConfirmModal({
      show: true,
      message: `Êtes-vous sûr de vouloir supprimer la campagne "${campaignName}" ?`,
      onConfirm: async () => {
        try {
          setDeleting(campaignId);
          const response = await sbcApiService.relanceDeleteCampaign(campaignId);

          if (response.isSuccessByStatusCode) {
            setCampaigns(campaigns.filter(c => c._id !== campaignId));
            if (selectedCampaignDetail?._id === campaignId) {
              setSelectedCampaignDetail(null);
            }
            showMessage('Campagne supprimée', 'La campagne a été supprimée avec succès.', 'success');
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
      draft: { color: 'bg-gray-500', label: 'Brouillon' },
      scheduled: { color: 'bg-blue-500', label: 'Programmé' },
      active: { color: 'bg-green-500', label: 'Actif' },
      paused: { color: 'bg-orange-500', label: 'En pause' },
      completed: { color: 'bg-purple-500', label: 'Terminé' },
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
            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
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
      return (
        <button
          onClick={() => handleDeleteCampaign(campaign._id, campaign.name, campaign.status)}
          disabled={deleting === campaign._id}
          className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
        >
          <FaTrash className="inline mr-1" /> {deleting === campaign._id ? 'Suppression...' : 'Supprimer'}
        </button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show coming soon if no subscription (admin/tester always bypass)
  if (!hasRelanceSubscription && !isAdminOrTester) {
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
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-md text-center shadow-lg"
            >
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Relance Automatique</h2>
              <p className="text-gray-600 mb-6">
                La fonctionnalité Relance vous permet de suivre automatiquement vos filleuls non payés par email.
              </p>
              <div className="bg-white rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Fonctionnalités :</p>
                <ul className="text-left text-sm text-gray-700 space-y-1">
                  <li>✅ Emails automatiques sur 7 jours</li>
                  <li>✅ Campagnes personnalisées</li>
                  <li>✅ Suivi intelligent des filleuls</li>
                  <li>✅ Statistiques détaillées</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                Abonnez-vous pour accéder à cette fonctionnalité.
              </p>
            </motion.div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-3 bg-white relative pb-20 min-h-screen">
        {/* Header */}
        <div className="flex items-center mb-4 gap-2">
          <BackButton />
          <h3 className="text-xl font-medium text-center flex-1">{t('pages.relance.title', 'Relance')}</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <FaSync className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} size={20} />
          </button>
        </div>

        {/* Status Card */}
        <div className={`relance-status-card rounded-2xl p-4 text-white mb-4 ${
          status?.enabled
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
            : 'bg-gradient-to-r from-gray-500 to-gray-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaEnvelope size={32} />
              <div>
                <div className="font-bold text-lg">
                  {status?.enabled ? '✅ Relance Activée' : '⏸️ Relance Désactivée'}
                </div>
                <div className="text-sm opacity-90">
                  {defaultStats?.activeTargets || 0} cibles actives • Emails aujourd'hui: {status?.messagesSentToday || 0}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relance-toggle-btn px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                status?.enabled
                  ? 'bg-white text-red-500 hover:bg-gray-100'
                  : 'bg-white text-green-600 hover:bg-gray-100'
              }`}
            >
              {status?.enabled ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        </div>

        {/* Controls Card */}
        <div className="relance-controls bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FaCog className="text-gray-600" />
            Contrôles
          </h4>
          <div className="space-y-3">
            {/* Pause Enrollment Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-medium text-sm text-gray-800">Pause inscription</div>
                <div className="text-xs text-gray-500">Arrêter l'inscription de nouvelles cibles</div>
              </div>
              <button
                onClick={handleToggleEnrollmentPause}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  status?.enrollmentPaused ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  status?.enrollmentPaused ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Pause Sending Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-medium text-sm text-gray-800">Pause envoi</div>
                <div className="text-xs text-gray-500">Arrêter l'envoi des emails</div>
              </div>
              <button
                onClick={handleToggleSendingPause}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  status?.sendingPaused ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  status?.sendingPaused ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Default Relance only */}
        {defaultStats && (
          <div className="relance-stats mb-6">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FaPaperPlane className="text-blue-500" />
              Statistiques (Relance par défaut)
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <FaUsers className="text-blue-500" />
                  <span className="text-xs text-blue-600">Cibles actives</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">{defaultStats.activeTargets}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <FaPaperPlane className="text-green-500" />
                  <span className="text-xs text-green-600">Emails envoyés</span>
                </div>
                <div className="text-2xl font-bold text-green-700">{defaultStats.totalMessagesSent}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="text-purple-500" />
                  <span className="text-xs text-purple-600">Taux de livraison</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{defaultStats.deliveryPercentage?.toFixed(1) || 0}%</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="text-indigo-500" />
                  <span className="text-xs text-indigo-600">Relance terminée</span>
                </div>
                <div className="text-2xl font-bold text-indigo-700">{defaultStats.completedRelance}</div>
              </div>
            </div>

            {/* Day Progression - only show if there are active targets */}
            {defaultStats.dayProgression && defaultStats.dayProgression.length > 0 && defaultStats.activeTargets > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                <h5 className="font-bold text-sm text-gray-700 mb-3">Distribution des cibles (7 jours)</h5>
                <div className="space-y-2">
                  {defaultStats.dayProgression.map((dayStat) => {
                    const percentage = defaultStats.activeTargets > 0
                      ? (dayStat.count / defaultStats.activeTargets) * 100
                      : 0;

                    return (
                      <div key={dayStat.day} className="flex items-center gap-3">
                        <div className="text-xs font-medium text-gray-600 w-12">Jour {dayStat.day}</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs font-bold text-gray-700 w-16 text-right">
                          {dayStat.count} ({percentage.toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View Targets Button */}
            <button
              onClick={() => {
                setShowTargetsModal(true);
                fetchTargets();
              }}
              className="relance-targets-btn w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <FaUsers /> Voir les cibles actives
            </button>
          </div>
        )}

        {/* Campaigns Section */}
        <div className="relance-campaigns mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Campagnes</h3>
            <button
              onClick={handleOpenWizard}
              className="relance-new-campaign flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-blue-500 text-white hover:bg-blue-600"
            >
              <FaPlus /> Nouvelle Campagne
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-500">
              <FaEnvelope className="mx-auto text-4xl mb-3 text-gray-400" />
              <p className="mb-2">Aucune campagne créée</p>
              <p className="text-sm">Créez une campagne pour cibler des utilisateurs spécifiques</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {campaigns.slice(0, 3).map((campaign, index) => {
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
                          <p className="text-xs text-gray-500">
                            Créée le {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(campaign.status)}
                          <button
                            onClick={() => setExpandedCampaign(expandedCampaign === campaign._id ? null : campaign._id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FaChevronRight className={`transition-transform text-gray-600 ${expandedCampaign === campaign._id ? 'rotate-90' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="text-xs text-gray-500">Cibles</div>
                          <div className="text-xl font-bold text-gray-800">{campaign.targetsEnrolled}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="text-xs text-gray-500">Emails</div>
                          <div className="text-xl font-bold text-blue-600">{campaign.messagesSent}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="text-xs text-gray-500">Livraison</div>
                          <div className="text-xl font-bold text-green-600">{deliveryRate.toFixed(0)}%</div>
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {expandedCampaign === campaign._id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="border-t border-gray-200 pt-4 mt-2"
                        >
                          {getCampaignActions(campaign)}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {campaigns.length > 3 && (
                <button
                  onClick={() => setShowCampaignHistory(true)}
                  className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Voir tout ({campaigns.length} campagnes)
                </button>
              )}
            </>
          )}
        </div>

        {/* Targets Modal */}
        <AnimatePresence>
          {showTargetsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end"
              onClick={() => setShowTargetsModal(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30 }}
                className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Cibles actives</h3>
                    <button onClick={() => setShowTargetsModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <FaTimes className="text-gray-600" size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loadingTargets ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Chargement...</p>
                    </div>
                  ) : targets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaUsers className="mx-auto text-4xl mb-3 text-gray-400" />
                      <p>Aucune cible active</p>
                    </div>
                  ) : (
                    <div>
                    <div className="mb-3 text-sm text-gray-500 text-right">
                      {targets.length} cible{targets.length > 1 ? 's' : ''}
                    </div>
                    <div className="space-y-3">
                      {targets.map((target) => {
                        const delivered = target.messagesDelivered?.length || 0;
                        const enteredDate = new Date(target.enteredLoopAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

                        return (
                          <div key={target._id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FaUsers className="text-blue-500 text-xs" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800 text-sm">
                                    {target.referralUser?.name || `Filleul #${target.referralUserId?.slice(-6) || '...'}`}
                                  </div>
                                  {target.referralUser?.email && (
                                    <div className="text-xs text-gray-500">{target.referralUser.email}</div>
                                  )}
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                target.status === 'active' ? 'bg-green-100 text-green-700' :
                                target.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                target.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {target.status === 'active' ? 'Actif' :
                                 target.status === 'completed' ? 'Terminé' :
                                 target.status === 'paused' ? 'En pause' :
                                 target.status === 'failed' ? 'Échoué' : target.status}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500 w-14">Jour {target.currentDay}/7</span>
                              <div className="flex gap-1 flex-1">
                                {Array.from({ length: 7 }, (_, i) => {
                                  const dayNum = i + 1;
                                  const isDelivered = target.messagesDelivered?.some((m: any) => m.day === dayNum);
                                  const isCurrent = dayNum === target.currentDay && !isDelivered;
                                  return (
                                    <div
                                      key={dayNum}
                                      className={`h-2 flex-1 rounded-full ${
                                        isDelivered ? 'bg-green-500' :
                                        isCurrent ? 'bg-blue-400 animate-pulse' :
                                        'bg-gray-200'
                                      }`}
                                      title={`Jour ${dayNum}${isDelivered ? ' - Envoyé' : isCurrent ? ' - En cours' : ''}`}
                                    />
                                  );
                                })}
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">{delivered}/7</span>
                            </div>

                            {/* Meta info */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span>Inscrit le {enteredDate}</span>
                              {target.lastMessageSentAt && (
                                <>
                                  <span>•</span>
                                  <span>Dernier email: {new Date(target.lastMessageSentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  )}
                </div>
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
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCampaignWizard(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Créer une campagne - Étape {wizardStep}/4</h3>

                {/* Step 1: Campaign Name */}
                {wizardStep === 1 && (
                  <div>
                    <label className="block mb-2 font-medium">Nom de la campagne</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Ex: Campagne Cameroun Janvier"
                      className="w-full border border-gray-300 rounded-lg p-3 mb-4"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowCampaignWizard(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        Annuler
                      </button>
                      <button
                        onClick={() => setWizardStep(2)}
                        disabled={!campaignName.trim()}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Filters */}
                {wizardStep === 2 && (
                  <div>
                    {/* Countries */}
                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2 font-medium">🌍 Pays (optionnel)</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3">
                        {countryOptions.map((country) => {
                          const isSelected = filters.countries?.includes(country.code);
                          return (
                            <button
                              key={country.code}
                              type="button"
                              className={`px-3 py-1 rounded-full border text-xs font-medium ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
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
                    </div>

                    {/* Date Range */}
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
                            className="w-full border border-gray-300 rounded-xl px-4 py-2"
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
                            className="w-full border border-gray-300 rounded-xl px-4 py-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="mb-4 space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.hasUnpaidReferrals || false}
                          onChange={(e) => setFilters({ ...filters, hasUnpaidReferrals: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Seulement ceux avec des filleuls non-payants</span>
                      </label>
                      <label className="flex items-center gap-2">
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
                      <button onClick={() => setWizardStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-300">
                        Retour
                      </button>
                      <button onClick={() => setWizardStep(3)} className="flex-1 bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600">
                        Suivant
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Custom Messages */}
                {wizardStep === 3 && (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800">
                        Vous pouvez personnaliser les emails envoyés chaque jour. Si vous ne définissez pas de message personnalisé, les messages par défaut seront utilisés.
                      </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer mb-6">
                      <input
                        type="checkbox"
                        checked={useCustomMessages}
                        onChange={(e) => setUseCustomMessages(e.target.checked)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="font-semibold text-gray-800">Utiliser des messages personnalisés</span>
                    </label>

                    {useCustomMessages && (
                      <div>
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
                                Jour {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Message en français *</label>
                            <textarea
                              value={customMessages[activeMessageDay - 1]?.messageTemplate.fr || ''}
                              onChange={(e) => {
                                const updatedMessages = [...customMessages];
                                updatedMessages[activeMessageDay - 1].messageTemplate.fr = e.target.value;
                                setCustomMessages(updatedMessages);
                              }}
                              placeholder="Bonjour {{name}}, ..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              rows={4}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Message en anglais *</label>
                            <textarea
                              value={customMessages[activeMessageDay - 1]?.messageTemplate.en || ''}
                              onChange={(e) => {
                                const updatedMessages = [...customMessages];
                                updatedMessages[activeMessageDay - 1].messageTemplate.en = e.target.value;
                                setCustomMessages(updatedMessages);
                              }}
                              placeholder="Hello {{name}}, ..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              rows={4}
                            />
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Variables disponibles :</p>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div><code className="bg-white px-2 py-0.5 rounded">{'{{name}}'}</code> - Nom du filleul</div>
                              <div><code className="bg-white px-2 py-0.5 rounded">{'{{referrerName}}'}</code> - Nom du parrain</div>
                              <div><code className="bg-white px-2 py-0.5 rounded">{'{{day}}'}</code> - Numéro du jour (1-7)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-6">
                      <button onClick={() => setWizardStep(2)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        Retour
                      </button>
                      <button onClick={handlePreviewFilters} className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                        Aperçu des résultats
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Preview */}
                {wizardStep === 4 && previewData && (
                  <div>
                    <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
                      <p className="font-bold text-green-700 mb-2">✓ Filtres appliqués avec succès</p>
                      <p className="text-sm text-gray-600">Total : {previewData.estimatedCount} utilisateurs</p>
                    </div>

                    <h4 className="font-bold mb-3">Échantillon d'utilisateurs :</h4>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {previewData.sampleUsers.map((user: SampleUser) => (
                        <div key={user._id} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="font-bold">{user.name}</div>
                          <div className="text-gray-600">{user.email} | {user.country}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setWizardStep(3)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                        Retour
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
                transition={{ type: 'spring', damping: 30 }}
                className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Historique des campagnes</h3>
                    <button onClick={() => setShowCampaignHistory(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <FaTimes className="text-gray-600" size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {campaigns.map((campaign) => {
                      const deliveryRate = campaign.messagesSent > 0 ? (campaign.messagesDelivered / campaign.messagesSent) * 100 : 0;

                      return (
                        <div
                          key={campaign._id}
                          onClick={() => {
                            setSelectedCampaignDetail(campaign);
                            setShowCampaignHistory(false);
                          }}
                          className="flex items-center justify-between py-3 px-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-gray-800 truncate">{campaign.name}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                            {getStatusBadge(campaign.status)}
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
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const campaign = selectedCampaignDetail;
                  const completionRate = campaign.targetsEnrolled > 0 ? (campaign.targetsCompleted / campaign.targetsEnrolled) * 100 : 0;
                  const deliveryRate = campaign.messagesSent > 0 ? (campaign.messagesDelivered / campaign.messagesSent) * 100 : 0;

                  return (
                    <>
                      <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{campaign.name}</h3>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(campaign.status)}
                              <span className="text-xs text-gray-500">
                                Créée le {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => setSelectedCampaignDetail(null)} className="p-2 hover:bg-gray-100 rounded-full">
                            <FaTimes className="text-gray-600" size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="p-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs text-gray-500 mb-1">Cibles inscrites</div>
                            <div className="text-3xl font-bold text-gray-800">{campaign.targetsEnrolled}</div>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-4">
                            <div className="text-xs text-blue-600 mb-1">Emails envoyés</div>
                            <div className="text-3xl font-bold text-blue-700">{campaign.messagesSent}</div>
                          </div>
                          <div className="bg-green-50 rounded-xl p-4">
                            <div className="text-xs text-green-600 mb-1">Taux de livraison</div>
                            <div className="text-3xl font-bold text-green-700">{deliveryRate.toFixed(1)}%</div>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-4">
                            <div className="text-xs text-purple-600 mb-1">Terminés</div>
                            <div className="text-3xl font-bold text-purple-700">{campaign.targetsCompleted}</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span className="font-medium">Progression</span>
                            <span className="font-bold">{completionRate.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          {getCampaignActions(campaign)}
                          <button
                            onClick={() => setSelectedCampaignDetail(null)}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300"
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
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <h4 className="text-lg font-bold mb-4 text-center">Confirmation</h4>
                <p className="text-sm text-gray-700 text-center mb-4">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 bg-red-500 text-white rounded-xl py-2 font-bold hover:bg-red-600"
                    onClick={() => {
                      confirmModal.onConfirm?.();
                      setConfirmModal({ show: false, message: '' });
                    }}
                  >
                    Confirmer
                  </button>
                  <button
                    className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold hover:bg-gray-300"
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
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-md shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
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
                  className="w-full bg-blue-500 text-white rounded-xl py-2 font-bold hover:bg-blue-600"
                  onClick={() => setMessageModal({ ...messageModal, show: false })}
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <TourButton />
      </div>
    </ProtectedRoute>
  );
}

export default RelancePage;
