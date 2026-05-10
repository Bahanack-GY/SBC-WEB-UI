import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import NavigationBar from './components/common/NavigationBar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './styles/recovery.css'
import Money from './pages/Money'
import AdsPack from './pages/AdsPack'
import Marketplace from './pages/Marketplace'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Contacts from './pages/Contacts'
import OTP from './pages/OTP'
import TransactionConfirmation from './pages/TransactionConfirmation'
import SplashScreen from './pages/SplashScreen'
import Connexion from './pages/Connexion'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ChangePassword from './pages/ChangePassword'
import ModifierLeProfil from './pages/ModifierLeProfil'
import SingleProductPage from './pages/SingleProductPage'
import AjouterProduit from './pages/AjouterProduit'
import MesProduits from './pages/MesProduits'
import ModifierProduit from './pages/ModifierProduit'
import Abonnement from './pages/Abonnement'
import MesFilleuls from './pages/MesFilleuls'
import { AffiliationProvider, useAffiliation } from './contexts/AffiliationContext'
import { useEffect } from 'react'
import VerifyOtp from './pages/VerifyOtp'
import ResetPassword from './pages/ResetPassword'
import VerifyEmailOtp from './pages/VerifyEmailOtp'
import ChangeEmail from './pages/ChangeEmail'
import ChangePhoneNumber from './pages/ChangePhoneNumber'
import PartnerSpace from './pages/PartnerSpace'
import WithdrawalOtpVerification from './pages/WithdrawalOtpVerification'
import RelancePage from './pages/RelancePage'
import RelanceSmsLinks from './pages/RelanceSmsLinks'
import ActivationBalance from './pages/ActivationBalance'
import PublicLanding from './pages/PublicLanding'
import PublicTerms from './pages/PublicTerms'
import PublicPrivacy from './pages/PublicPrivacy'
import { useQuery } from '@tanstack/react-query'
import { handleApiResponse } from './utils/apiHelpers'
import { sbcApiService } from './services/SBCApiService'
import { TourProvider } from './components/common/TourProvider'
import { RelanceProvider } from './contexts/RelanceContext'
import { SocketProvider } from './contexts/SocketContext'
import Chat from './pages/Chat'
import CompleteProfile from './pages/CompleteProfile'

// Add this type definition at the top (after imports)
type SubscriptionData = {
  status?: string;
  totalCount?: number;
  s?: string;
  [key: string]: unknown;
};

function AppContent() {
  const location = useLocation();
  const { setAffiliationCode } = useAffiliation();
  const { isAuthenticated, logout, user: authUser } = useAuth();

  // Fetch subscription status globally
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionData | null>({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      try {
        const response = await sbcApiService.getCurrentSubscription();
        return handleApiResponse(response);
      } catch (err) {
        return null;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });

  // Determine if user is subscribed
  const user = isAuthenticated && JSON.parse(localStorage.getItem('user') || 'null');
  const isSubscribed = !!(
    (user?.activeSubscriptions && user.activeSubscriptions.length > 0) ||
    (subscriptionData && subscriptionData.status === 'active') ||
    (typeof subscriptionData?.totalCount === 'number' && subscriptionData.totalCount > 0)
  );

  // One-time cleanup: a previous build wrote a permanent
  // localStorage.splashViewed flag that incorrectly suppressed the splash on
  // cold opens. Drop it so users always see onboarding again on fresh visits.
  useEffect(() => {
    if (localStorage.getItem('splashViewed')) {
      localStorage.removeItem('splashViewed');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const affiliationCodeFromUrl = params.get('affiliationCode');
    if (affiliationCodeFromUrl) {
      setAffiliationCode(affiliationCodeFromUrl);
    }

    // /splash-screen is the public landing for unauthenticated users — they
    // walk through the onboarding carousel before reaching /connexion.
    // Authenticated users have no business there, so push them to /.
    if (location.pathname === '/splash-screen' && isAuthenticated) {
      window.location.replace('/');
    }

    // Handle login page redirects
    if (location.pathname === '/connexion' && isAuthenticated) {
      if (isSubscribed) {
        window.location.replace('/');
      } else {
        window.location.replace('/abonnement');
      }
    }

    // Handle subscription redirects
    const allowed = ['/connexion', '/signup', '/splash-screen', '/abonnement', '/complete-profile'];
    if (
      isAuthenticated &&
      !subscriptionLoading &&
      !isSubscribed &&
      !allowed.includes(location.pathname)
    ) {
      window.location.replace('/abonnement');
    }

    // Prevent subscribed users from accessing subscription page
    if (isAuthenticated && isSubscribed && location.pathname === '/abonnement') {
      window.location.replace('/');
    }

    // Redirect newly subscribed users to complete profile if they haven't done so
    if (
      isAuthenticated &&
      isSubscribed &&
      location.pathname === '/' &&
      authUser &&
      !authUser.profession &&
      (!authUser.interests || authUser.interests.length === 0) &&
      !localStorage.getItem('profileCompletionDone') &&
      !localStorage.getItem('profileCompletionSkipped')
    ) {
      window.location.replace('/complete-profile');
    }

    // Activation balance page is now accessible to all users with teaser overlay for non-admin/tester

    // Relance page is accessible to all authenticated users — credit-pack model.
    // Users without credits see the pack purchase UI on the page itself.

    // Chat page is now accessible to all users with teaser overlay for non-admin/tester
  }, [location, setAffiliationCode, isAuthenticated, subscriptionLoading, isSubscribed, authUser]);

  // Optionally, block rendering until subscription status is known
  if (isAuthenticated && subscriptionLoading) {
    return <div className="flex items-center justify-center min-h-screen text-lg">Vérification de l'abonnement...</div>;
  }

  // Logout button for unsubscribed users
  const showLogout = isAuthenticated && !isSubscribed;

  // Check if we're in a chat conversation (has conversation query param)
  const isInChatConversation = location.pathname === '/chat' && new URLSearchParams(location.search).has('conversation');

  const hideNav = location.pathname === '/wallet' || location.pathname === '/filleuls' || location.pathname === '/abonnement' || location.pathname === '/single-product' || location.pathname === '/profile' || location.pathname === '/contacts' || location.pathname === '/otp' || location.pathname === '/transaction-confirmation' || location.pathname === '/splash-screen' || location.pathname === '/connexion' || location.pathname === '/signup' || location.pathname === '/forgot-password' || location.pathname === '/change-password' || location.pathname === '/modifier-le-profil' || location.pathname === '/ajouter-produit' || location.pathname === '/mes-produits' || location.pathname.startsWith('/modifier-produit/') || location.pathname === '/verify-otp' || location.pathname === '/reset-password' || location.pathname === '/reset-password-otp' || location.pathname === '/verify-email-otp' || location.pathname === '/modifier-email' || location.pathname === '/change-email' || location.pathname === '/change-phone' || location.pathname === '/changer-mot-de-passe' || location.pathname === '/withdrawal-otp-verification' || location.pathname === '/relance' || location.pathname === '/relance/sms-links' || location.pathname === '/activation-balance' || location.pathname === '/complete-profile' || location.pathname === '/a-propos' || location.pathname === '/conditions' || location.pathname === '/confidentialite' || isInChatConversation;
  return (
    <div className="bg-white relative">
      {showLogout && (
        <button
          onClick={async () => { await logout(); window.location.replace('/connexion'); }}
          className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow z-50"
        >
          Se déconnecter
        </button>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/money" element={<Money />} />
        <Route path="/ads-pack" element={<AdsPack />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/otp" element={<OTP />} />
        <Route path="/transaction-confirmation" element={<TransactionConfirmation />} />
        <Route path="/splash-screen" element={<SplashScreen />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/modifier-le-profil" element={<ModifierLeProfil />} />
        <Route path="/single-product/:id" element={<SingleProductPage />} />
        <Route path="/ajouter-produit" element={<AjouterProduit />} />
        <Route path="/mes-produits" element={<MesProduits />} />
        <Route path="/modifier-produit/:id" element={<ModifierProduit />} />
        <Route path="/abonnement" element={<Abonnement />} />
        <Route path="/changer-abonnement" element={<Abonnement />} />
        <Route path="/filleuls" element={<MesFilleuls />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/verify-email-otp" element={<VerifyEmailOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/modifier-email" element={<ChangeEmail />} />
        <Route path="/change-phone" element={<ChangePhoneNumber />} />
        <Route path="/partenaire" element={<PartnerSpace />} />
        <Route path="/withdrawal-otp-verification" element={<WithdrawalOtpVerification />} />
        <Route path="/relance" element={<RelancePage />} />
        <Route path="/relance/sms-links" element={<RelanceSmsLinks />} />
        <Route path="/activation-balance" element={<ActivationBalance />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/a-propos" element={<PublicLanding />} />
        <Route path="/conditions" element={<PublicTerms />} />
        <Route path="/confidentialite" element={<PublicPrivacy />} />
      </Routes>
      {!hideNav && <NavigationBar />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AffiliationProvider>
          <RelanceProvider>
            <TourProvider>
              <AppContent />
            </TourProvider>
          </RelanceProvider>
        </AffiliationProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
