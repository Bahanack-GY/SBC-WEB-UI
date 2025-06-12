import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiMail, FiCreditCard, FiUsers, FiUserCheck, FiBriefcase, FiChevronRight, FiCopy, FiLink, FiLock, FiHelpCircle, FiLoader } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
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

const actions = [
  { label: 'Modifier le profil', icon: <FiEdit2 className="text-[#115CF6]" />, to: '/modifier-le-profil' },
  { label: 'Modifier mon email', icon: <FiMail className="text-[#115CF6]" />, to: '/modifier-email' },
  { label: 'Modifier mon mot de passe', icon: <FiLock className="text-[#115CF6]" />, to: '/change-password' },
  { label: 'Mon Abonnement', icon: <FiCreditCard className="text-[#115CF6]" />, to: '/changer-abonnement' },
  { label: 'Mes filleuls', icon: <FiUsers className="text-[#115CF6]" />, to: '/filleuls' },
  { label: 'Mon Parrain', icon: <FiUserCheck className="text-[#115CF6]" />, to: '/parrain' },
  { label: 'Espace partenaire', icon: <FiBriefcase className="text-[#115CF6]" />, to: '/partenaire' },
  { label: 'Rejoindre la communauté', icon: <FaWhatsapp className="text-green-500" />, to: 'https://www.whatsapp.com/channel/0029Vav3mvCElah05C8QuT03', external: true },
];

function Profile() {
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const { startTour, hasSeenTour } = useTour();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralStats, setReferralStats] = useState<{
    totalReferrals: number;
    level1Count: number;
    level2Count: number;
    level3Count: number;
  } | null>(null);
  const [affiliator, setAffiliator] = useState<{ name: string; email: string; phoneNumber: string } | null>(null);
  const [affiliatorLoading, setAffiliatorLoading] = useState(true);

  // New states for the change referral code modal
  const [showChangeReferralCodeModal, setShowChangeReferralCodeModal] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState('');
  const [changeCodeLoading, setChangeCodeLoading] = useState(false);
  const [changeCodeFeedback, setChangeCodeFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const referralLink = user?.referralCode ? `${window.location.origin}/signup?affiliationCode=${user.referralCode}` : '';

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        const statsResponse = await sbcApiService.getReferralStats();
        const statsResult = handleApiResponse(statsResponse);
        setReferralStats(statsResult);
      } catch (error) {
        console.error('Error fetching referral stats:', error);
      }

      try {
        setAffiliatorLoading(true);
        const affiliatorResponse = await sbcApiService.getMyAffiliator();
        const affiliatorResult = handleApiResponse(affiliatorResponse);
        setAffiliator(affiliatorResult.affiliator);
      } catch (error) {
        console.warn('Error fetching affiliator info (might not have one):', error);
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
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      setLoading(true);
      try {
        await logout();
        navigate('/connexion');
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        setLoading(false);
      }
    }
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
        if (affiliatorLoading) {
          alert("Chargement des informations du parrain...");
        } else if (affiliator) {
          alert(`Votre parrain: ${affiliator.name}\nEmail: ${affiliator.email}\nWhatsApp: ${affiliator.phoneNumber}`);
        } else {
          alert("Vous n'avez pas de parrain ou les informations ne sont pas disponibles.");
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
      console.error('Failed to change referral code:', error);
      const errorMessage = error instanceof Error ? error.message : "Échec de la mise à jour du code de parrainage.";
      setChangeCodeFeedback({ type: 'error', message: errorMessage });
    } finally {
      setChangeCodeLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-0">
        <div className="w-full max-w-md mx-auto rounded-b-3xl overflow-hidden pb-6">
          <div className="relative bg-gradient-to-tr from-[#115CF6] to-[#4F8CFF] h-32 rounded-b-3xl flex flex-col items-center justify-end">
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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-0">
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
          <div className="relative bg-gradient-to-tr from-[#115CF6] to-[#4F8CFF] h-32 rounded-b-3xl flex flex-col items-center justify-end">
            <div className="absolute left-1/2 -bottom-12 transform -translate-x-1/2">
              <div className="relative">
                <img
                  src={user?.avatarId ? sbcApiService.generateSettingsFileUrl(user.avatarId) : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360'}
                  alt="avatar"
                  className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
                />
                <button className="absolute bottom-2 right-2 bg-[#115CF6] p-2 rounded-full border-2 border-white shadow text-white hover:bg-blue-800 transition-colors">
                  <FiEdit2 size={16} />
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
                className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow hover:bg-green-50 transition-colors"
              >
                <span className="bg-green-100 text-green-600 rounded-full p-2">
                  <FiCopy />
                </span>
                <span className="flex-1 font-medium text-gray-700 text-left">Copier mon code parrain</span>
                {copied === 'code' ? (
                  <span className="text-green-600 text-xs font-bold">Copié !</span>
                ) : null}
              </button>
              <button
                onClick={() => handleCopy('link')}
                className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow hover:bg-blue-50 transition-colors"
              >
                <span className="bg-blue-100 text-blue-600 rounded-full p-2">
                  <FiLink />
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
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-indigo-600 text-white rounded-xl px-4 py-3 shadow-lg hover:from-green-700 hover:to-indigo-700 transition-all font-bold"
              >
                <FiEdit2 size={18} />
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
                className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#f1f5fd] transition cursor-pointer text-left"
              >
                {action.icon}
                <span className="flex-1 text-gray-700 font-medium">{action.label}</span>
                <FiChevronRight className="text-gray-400" />
              </motion.button>
            ))}
            <div className="px-6 pt-6 space-y-3">
              <button
                onClick={() => startTour()}
                disabled={!hasSeenTour}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-medium py-3 rounded-xl hover:bg-blue-100 transition"
              >
                <FiHelpCircle size={20} />
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
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
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
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none"
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
                      className="flex-1 bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:bg-blue-400"
                      disabled={changeCodeLoading}
                    >
                      {changeCodeLoading ? <FiLoader className="animate-spin" /> : 'Sauvegarder'}
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
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
      </div>
    </ProtectedRoute>
  );
}

export default Profile;
