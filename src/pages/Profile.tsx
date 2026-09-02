import { DEFAULT_AVATAR } from '../components/common/Avatar';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Briefcase01Icon, Call02Icon, Copy01Icon, CreditCardIcon, GiftIcon, HelpCircleIcon, Link01Icon, Loading03Icon, LockIcon, Mail01Icon, PencilEdit01Icon, UserCheck01Icon, UserGroupIcon, WhatsappIcon } from '@hugeicons/core-free-icons';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';
import TourButton from '../components/common/TourButton';
import { useTour } from '../components/common/TourProvider';
import { useRelance } from '../contexts/RelanceContext';
import RelancePacksModal from '../components/relance/RelancePacksModal';

type ActionItem = {
  label: string;
  icon: JSX.Element;
  to: string;
  external?: boolean;
  badge?: string;
};

const baseActions: ActionItem[] = [
  { label: 'Modifier le profil', icon: <HugeiconsIcon icon={PencilEdit01Icon} className="text-primary" />, to: '/modifier-le-profil' },
  { label: 'Modifier mon email', icon: <HugeiconsIcon icon={Mail01Icon} className="text-primary" />, to: '/modifier-email' },
  { label: 'Changer le numéro de téléphone', icon: <HugeiconsIcon icon={Call02Icon} className="text-primary" />, to: '/change-phone' },
  { label: 'Modifier mon mot de passe', icon: <HugeiconsIcon icon={LockIcon} className="text-primary" />, to: '/change-password' },
  { label: 'Mon Abonnement', icon: <HugeiconsIcon icon={CreditCardIcon} className="text-primary" />, to: '/changer-abonnement' },
  { label: 'Solde d\'Activation', icon: <HugeiconsIcon icon={GiftIcon} className="text-amber-500" />, to: '/activation-balance' },
  { label: 'Mes Contacts', icon: <HugeiconsIcon icon={Call02Icon} className="text-primary" />, to: '/contacts' },
  { label: 'Mes filleuls', icon: <HugeiconsIcon icon={UserGroupIcon} className="text-primary" />, to: '/filleuls' },
  { label: 'Mon Parrain', icon: <HugeiconsIcon icon={UserCheck01Icon} className="text-primary" />, to: '/parrain' },
  { label: 'Espace partenaire', icon: <HugeiconsIcon icon={Briefcase01Icon} className="text-primary" />, to: '/partenaire' },
  { label: 'Rejoindre la communauté', icon: <HugeiconsIcon icon={WhatsappIcon} className="text-green-500" />, to: 'https://www.whatsapp.com/channel/0029Vav3mvCElah05C8QuT03', external: true },
];

function Profile() {
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const { startTour, hasSeenTour } = useTour();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [loading, setLoading] = useState(false);
  const { hasCredits: hasRelanceAccess } = useRelance();
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    level1Count: number;
    level2Count: number;
    level3Count: number;
  } | null>(null);
  const [affiliator, setAffiliator] = useState<{ name: string; email: string; phoneNumber: string; avatar?: string; avatarId?: string; whatsappGroupLink?: string; } | null>(null);
  const [affiliatorLoading, setAffiliatorLoading] = useState(true);

  // New states for the change referral code modal
  const [showChangeReferralCodeModal, setShowChangeReferralCodeModal] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [changeCodeLoading, setChangeCodeLoading] = useState(false);
  const [changeCodeFeedback, setChangeCodeFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // New states for the affiliator info modal
  const [showAffiliatorModal, setShowAffiliatorModal] = useState(false);
  const [affiliatorModalContent, setAffiliatorModalContent] = useState<string | null>(null);

  // Relance modal state
  const [showRelanceModal, setShowRelanceModal] = useState(false);

  // Activation balance modal state

  // Build actions list dynamically based on Relance subscription
  const actions: ActionItem[] = [
    ...baseActions.slice(0, 7), // Up to "Mes Contacts"
    { label: 'Relance', icon: <HugeiconsIcon icon={Mail01Icon} className="text-primary" />, to: '/relance' },
    ...baseActions.slice(7), // Rest of the actions
  ];

  // New states for the generic info/confirmation modal
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'success' | 'error' | 'confirm'; message: string; onConfirm?: () => void } | null>(null);

  const referralLink = user?.referralCode ? `${window.location.origin}/signup?affiliationCode=${user.referralCode}` : '';

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        const statsResponse = await sbcApiService.getReferralStats();
        const statsResult = handleApiResponse(statsResponse);
        setReferralStats(statsResult);
      } catch (error) {
      }

      try {
        setAffiliatorLoading(true);
        const affiliatorResponse = await sbcApiService.getMyAffiliator();
        const affiliatorResult = handleApiResponse(affiliatorResponse);
        setAffiliator(affiliatorResult);
      } catch (error) {
        setAffiliator(null);
      } finally {
        setAffiliatorLoading(false);
      }

    };

    loadProfileData();
  }, [user]);

  // New useEffect to set newReferralCode when modal opens
  useEffect(() => {
    if (showChangeReferralCodeModal && user?.referralCode) {
      setNewReferralCode(user.referralCode);
      setChangeCodeFeedback(null); // Clear any previous feedback when opening
    }
  }, [showChangeReferralCodeModal, user?.referralCode]);

  const handleCopy = (type: 'code' | 'link') => {
    if (!user) return;

    if (type === 'code') {
      navigator.clipboard.writeText(user.referralCode || '');
    } else {
      navigator.clipboard.writeText(referralLink);
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 1200);
  };

  const handleLogout = async () => {
    setModalContent({
      type: 'confirm',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      onConfirm: async () => {
        setLoading(true);
        try {
          await logout();
          navigate('/connexion');
        } catch (error) {
          setModalContent({ type: 'error', message: 'Échec de la déconnexion.' });
          setShowModal(true);
        } finally {
          setLoading(false);
        }
      }
    });
    setShowModal(true);
  };

  const handleOpenAffiliatorModal = () => {
    if (affiliatorLoading) {
      setAffiliatorModalContent("Chargement des informations du parrain...");
    } else if (affiliator) {
      const avatarUrl = affiliator.avatar
        ? affiliator.avatar
        : affiliator.avatarId
        ? sbcApiService.generateSettingsFileUrl(affiliator.avatarId)
        : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360';

      // Escape user-provided strings before injecting into the HTML template —
      // affiliator.name / whatsappGroupLink come from a Mongo user document but
      // still flow through dangerouslySetInnerHTML.
      const escape = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const groupLink = affiliator.whatsappGroupLink?.trim();
      const contactBlock = groupLink
        ? `
          <a
            href="${escape(groupLink)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 w-full min-h-[48px] mt-2 px-4 rounded-xl bg-whatsapp hover:bg-[#128C7E] text-white font-bold text-sm"
          >
            📱 Rejoindre le groupe WhatsApp
          </a>
        `
        : `
          <p class="text-sm text-gray-500 mt-2 italic text-center">Ce parrain n'a pas encore configuré son groupe WhatsApp.</p>
        `;
      setAffiliatorModalContent(`
        <div class="flex flex-col items-center justify-center p-4">
          <img src="${escape(avatarUrl)}" alt="avatar" class="w-20 h-20 rounded-full object-cover mb-4 border-2 border-border"/>
          <p class="text-lg font-bold mb-1">${escape(affiliator.name)}</p>
          <p class="text-sm text-gray-600 mb-1">${escape(affiliator.email)}</p>
          ${contactBlock}
        </div>
      `);
    } else {
      setAffiliatorModalContent("Vous n'avez pas de parrain ou les informations ne sont pas disponibles.");
    }
    setShowAffiliatorModal(true);
  };

  const handleNavigation = (to: string, external?: boolean) => {
    if (external) {
      // Create a temporary link element and trigger click
      const link = document.createElement('a');
      link.href = to;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (to === '/parrain') {
        handleOpenAffiliatorModal();
      } else if (to === '/relance') {
        if (hasRelanceAccess) {
          navigate(to);
        } else {
          setShowRelanceModal(true);
        }
      } else {
        navigate(to);
      }
    }
  };

  // New function to handle referral code change
  const handleChangeReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeCodeLoading(true);
    setChangeCodeFeedback(null);

    if (!newReferralCode.trim()) {
      setChangeCodeFeedback({ type: 'error', message: 'Le code de parrainage ne peut pas être vide.' });
      setChangeCodeLoading(false);
      return;
    }

    try {
      const updates = { referralCode: newReferralCode.trim() };
      const response = await sbcApiService.updateUserProfile(updates);
      handleApiResponse(response); // This will throw on error or return data on success

      setChangeCodeFeedback({ type: 'success', message: 'Code de parrainage mis à jour avec succès!' });
      await refreshUser(); // Refresh user context to reflect the new referral code
      setTimeout(() => setShowChangeReferralCodeModal(false), 1500); // Close modal after success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Échec de la mise à jour du code de parrainage.";
      setChangeCodeFeedback({ type: 'error', message: errorMessage });
    } finally {
      setChangeCodeLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center py-0">
        <div className="w-full max-w-md mx-auto rounded-b-3xl overflow-hidden pb-6">
          <div className="bg-primary relative h-32 rounded-b-3xl flex flex-col items-center justify-end">
            <div className="absolute left-1/2 -bottom-12 transform -translate-x-1/2">
              <Skeleton width="w-24" height="h-24" rounded="rounded-full" />
            </div>
          </div>
          <div className="mt-16 flex flex-col items-center">
            <Skeleton width="w-32" height="h-6" rounded="rounded-lg" />
            <Skeleton width="w-48" height="h-8" rounded="rounded-lg" className="mt-2" />
          </div>
          <div className="mt-6 mx-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="h-12" rounded="rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg flex flex-col items-center py-0">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-full max-w-md mx-auto rounded-b-3xl overflow-hidden pb-6"
        >
          <div className="flex items-center w-full py-4">
            <BackButton />
            <h3 className="text-xl font-medium text-center w-full text-gray-900">Mon profil</h3>
          </div>
          <div className="bg-primary relative h-32 rounded-b-3xl flex flex-col items-center justify-end">
            <div className="absolute left-1/2 -bottom-12 transform -translate-x-1/2">
              <div className="relative">
                <img
                  src={sbcApiService.generateThumbnailUrl(user?.avatar || user?.avatarId, 256) || DEFAULT_AVATAR}
                  alt="avatar"
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
                <button className="absolute bottom-2 right-2 bg-primary p-2 rounded-full border-2 border-white text-white hover:bg-blue-800 transition-colors">
                  <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-center">
            <div className="text-xl font-bold text-gray-800">
              {user?.name || 'Utilisateur'}
            </div>
            <div className="bg-gray-100 text-gray-500 rounded-lg px-3 py-1 text-sm mt-2">
              {user?.email}
            </div>
            {/* Notification Preference Display */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">Notifications OTP:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                user?.notificationPreference === 'whatsapp' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {user?.notificationPreference === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'}
              </span>
            </div>
            {referralStats && (
              <div className="text-sm text-gray-600 mt-2">
                Direct: {referralStats.level1Count || 0} | Indirect: {(referralStats.level2Count || 0) + (referralStats.level3Count || 0)}
              </div>
            )}
          </div>
          {/* Parrainage buttons */}
          {user?.referralCode && (
            <div className="mt-6 mx-4 flex gap-3">
              <button
                onClick={() => handleCopy('code')}
                className="flex-1 flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-3 hover:bg-green-50 transition-colors"
              >
                <span className="bg-green-100 text-green-600 rounded-full p-2">
                  <HugeiconsIcon icon={Copy01Icon} />
                </span>
                <span className="flex-1 font-medium text-gray-700 text-left">Copier mon code parrain</span>
                {copied === 'code' ? (
                  <span className="text-green-600 text-xs font-bold">Copié !</span>
                ) : null}
              </button>
              <button
                onClick={() => handleCopy('link')}
                className="flex-1 flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-3 hover:bg-blue-50 transition-colors"
              >
                <span className="bg-blue-100 text-blue-600 rounded-full p-2">
                  <HugeiconsIcon icon={Link01Icon} />
                </span>
                <span className="flex-1 font-medium text-gray-700 text-left">Copier mon lien</span>
                {copied === 'link' ? (
                  <span className="text-blue-600 text-xs font-bold">Copié !</span>
                ) : null}
              </button>
            </div>
          )}
          {/* New: Change Referral Code Button */}
          {user?.referralCode && (
            <div className="mt-4 mx-4">
              <button
                onClick={() => setShowChangeReferralCodeModal(true)}
                className="bg-primary w-full flex items-center justify-center gap-2 text-white rounded-xl px-4 py-3 transition-all font-bold"
              >
                <HugeiconsIcon icon={PencilEdit01Icon} size={18} />
                Changer mon code parrain
              </button>
            </div>
          )}
          <div className="mt-4 divide-y divide-gray-100">
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                onClick={() => handleNavigation(action.to, action.external)}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.4, type: 'spring' }}
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-surface-2 transition cursor-pointer text-left relative"
              >
                {action.icon}
                <span className="flex-1 text-gray-700 font-medium">{action.label}</span>
                {action.badge && (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-2">
                    {action.badge}
                  </span>
                )}
                <HugeiconsIcon icon={ArrowRight01Icon} className="text-gray-400" />
              </motion.button>
            ))}
            <div className="px-6 pt-6 space-y-3">
              <button
                onClick={() => startTour()}
                disabled={!hasSeenTour}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-medium py-3 rounded-xl hover:bg-blue-100 transition"
              >
                <HugeiconsIcon icon={HelpCircleIcon} size={20} />
                <span>Voir le guide d'utilisation</span>
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            </div>
          </div>
        </motion.div>
        <TourButton />
        <footer className="text-xs text-gray-400 mt-6 mb-2 text-center">Développé par simbtech</footer>

        {/* New: Change Referral Code Modal */}
        <AnimatePresence>
          {showChangeReferralCodeModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative border border-border"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2 }}
              >
                <h4 className="text-lg font-bold mb-4 text-center">Changer le code parrain</h4>
                <form onSubmit={handleChangeReferralCode} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="newReferralCode" className="block text-gray-700 mb-1">Nouveau code de parrainage</label>
                    <input
                      type="text"
                      id="newReferralCode"
                      name="newReferralCode"
                      value={newReferralCode}
                      onChange={(e) => {
                        setNewReferralCode(e.target.value);
                        setChangeCodeFeedback(null); // Clear feedback on input change
                      }}
                      className="w-full border border-border rounded-xl px-4 py-2 focus:outline-none"
                      placeholder="Entrez le nouveau code"
                      required
                    />
                  </div>
                  {changeCodeFeedback && (
                    <div className={`p-3 rounded-lg text-center text-sm ${changeCodeFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {changeCodeFeedback.message}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white rounded-xl py-2 font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:bg-blue-400"
                      disabled={changeCodeLoading}
                    >
                      {changeCodeLoading ? <HugeiconsIcon icon={Loading03Icon} className="animate-spin" /> : 'Sauvegarder'}
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setShowChangeReferralCodeModal(false);
                        setNewReferralCode(user?.referralCode || ''); // Reset input to current code
                        setChangeCodeFeedback(null); // Clear feedback
                      }}
                      disabled={changeCodeLoading}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New: Affiliator Info Modal */}
        <AnimatePresence>
          {showAffiliatorModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative border border-border"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2 }}
              >
                <h4 className="text-lg font-bold mb-4 text-center">Informations sur le parrain</h4>
                <div className="text-sm text-gray-700 mb-4"
                  dangerouslySetInnerHTML={{ __html: affiliatorModalContent || '' }}
                >
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold hover:bg-gray-300 transition-colors"
                    onClick={() => {
                      setShowAffiliatorModal(false);
                      setAffiliatorModalContent(null);
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New: Generic Info/Confirmation Modal */}
        {showModal && modalContent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative border border-border"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
            >
              <h4 className={`text-lg font-bold mb-4 text-center ${modalContent.type === 'success' ? 'text-green-600' :
                modalContent.type === 'error' ? 'text-red-600' : 'text-gray-800'
                }`}>
                {modalContent.type === 'success' ? 'Succès' :
                  modalContent.type === 'error' ? 'Erreur' : 'Confirmation'}
              </h4>
              <p className="text-sm text-gray-700 text-center mb-4"
                dangerouslySetInnerHTML={{ __html: modalContent.message || '' }}
              />
              {modalContent.type === 'confirm' ? (
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    className="flex-1 bg-red-500 text-white rounded-xl py-2 font-bold hover:bg-red-600 transition-colors"
                    onClick={() => {
                      modalContent.onConfirm?.();
                      setShowModal(false);
                    }}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold hover:bg-gray-300 transition-colors"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full bg-blue-500 text-white rounded-xl py-2 font-bold hover:bg-blue-600 transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Fermer
                </button>
              )}
            </motion.div>
          </motion.div>
        )}

      {/* Relance credit packs modal */}
      <RelancePacksModal
        isOpen={showRelanceModal}
        onClose={() => setShowRelanceModal(false)}
      />


      </div>
    </ProtectedRoute>
  );
}

export default Profile;
