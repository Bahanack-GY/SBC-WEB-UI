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
import { useEffect, useRef } from 'react'
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
import SsoAuthorize from './pages/SsoAuthorize'
import { useQueryClient } from '@tanstack/react-query'
import { TourProvider } from './components/common/TourProvider'
import { RelanceProvider } from './contexts/RelanceContext'
import { SocketProvider } from './contexts/SocketContext'
import Chat from './pages/Chat'
import CompleteProfile from './pages/CompleteProfile'
import { RequireAuth, RequireSubscription, useSubscriptionStatus } from './components/common/RouteGuards'

function AppContent() {
  const location = useLocation();
  const { setAffiliationCode } = useAffiliation();
  const { isAuthenticated, loading: authLoading, logout, user: authUser } = useAuth();
  const { isSubscribed, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const queryClient = useQueryClient();

  // Drop all React Query cache when the authenticated user changes (login,
  // logout, account switch). Without this, the previous user's "active"
  // subscription state could linger for up to gcTime and let the next user
  // briefly skip the paywall on a shared device.
  // Mongoose objects use _id; some endpoints add an `id` virtual, some don't.
  // Cover both so the effect actually fires on login/logout.
  const authUserId =
    (authUser as { id?: string; _id?: string } | null)?.id ??
    (authUser as { id?: string; _id?: string } | null)?._id ??
    null;
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastUserIdRef.current !== authUserId) {
      queryClient.clear();
      lastUserIdRef.current = authUserId;
    }
  }, [authUserId, queryClient]);

  // One-time cleanup: a previous build wrote a permanent
  // localStorage.splashViewed flag that incorrectly suppressed the splash on
  // cold opens. Drop it so users always see onboarding again on fresh visits.
  useEffect(() => {
    if (localStorage.getItem('splashViewed')) {
      localStorage.removeItem('splashViewed');
    }
  }, []);

  // Capture affiliation code from the URL early — used by Signup.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const affiliationCodeFromUrl = params.get('affiliationCode');
    if (affiliationCodeFromUrl) {
      setAffiliationCode(affiliationCodeFromUrl);
    }
  }, [location.search, setAffiliationCode]);

  // Post-activation profile-completion nudge: subscribed users who haven't
  // filled in profession/interests land on /complete-profile once. The
  // paywall guards above keep unauthenticated and unsubscribed users from
  // ever reaching '/' so this only runs in the right state. /sso/authorize
  // is public and route-level — it doesn't need any whitelist entry here.
  useEffect(() => {
    if (
      isAuthenticated &&
      !subscriptionLoading &&
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
  }, [
    isAuthenticated,
    subscriptionLoading,
    isSubscribed,
    location.pathname,
    authUser,
  ]);

  // Authenticated users have no business on /splash-screen — push them home.
  // Done with <Navigate>-equivalent: we only render this in the route element
  // tree below, but for the standalone /splash-screen public route we still
  // want this side-effect. window.location.replace is intentional here to
  // hard-reset the splash carousel state.
  useEffect(() => {
    if (location.pathname === '/splash-screen' && isAuthenticated && !authLoading) {
      window.location.replace('/');
    }
  }, [location.pathname, isAuthenticated, authLoading]);

  // Subscribed users land on / when they hit /connexion (and similarly leave
  // /abonnement when they activate).
  useEffect(() => {
    if (!isAuthenticated || subscriptionLoading) return;
    if (location.pathname === '/connexion') {
      window.location.replace(isSubscribed ? '/' : '/abonnement');
    } else if (location.pathname === '/abonnement' && isSubscribed) {
      window.location.replace('/');
    }
  }, [isAuthenticated, subscriptionLoading, isSubscribed, location.pathname]);

  // Logout button for unsubscribed users (so they can switch accounts from
  // /abonnement). The paywall guard means anyone seeing this is logged in.
  const showLogout = isAuthenticated && !subscriptionLoading && !isSubscribed;

  // Check if we're in a chat conversation (has conversation query param)
  const isInChatConversation = location.pathname === '/chat' && new URLSearchParams(location.search).has('conversation');

  const hideNav = location.pathname === '/wallet' || location.pathname === '/filleuls' || location.pathname === '/abonnement' || location.pathname === '/single-product' || location.pathname === '/profile' || location.pathname === '/contacts' || location.pathname === '/otp' || location.pathname === '/transaction-confirmation' || location.pathname === '/splash-screen' || location.pathname === '/connexion' || location.pathname === '/signup' || location.pathname === '/forgot-password' || location.pathname === '/change-password' || location.pathname === '/modifier-le-profil' || location.pathname === '/ajouter-produit' || location.pathname === '/mes-produits' || location.pathname.startsWith('/modifier-produit/') || location.pathname === '/verify-otp' || location.pathname === '/reset-password' || location.pathname === '/reset-password-otp' || location.pathname === '/verify-email-otp' || location.pathname === '/modifier-email' || location.pathname === '/change-email' || location.pathname === '/change-phone' || location.pathname === '/changer-mot-de-passe' || location.pathname === '/withdrawal-otp-verification' || location.pathname === '/relance' || location.pathname === '/relance/sms-links' || location.pathname === '/activation-balance' || location.pathname === '/complete-profile' || location.pathname === '/a-propos' || location.pathname === '/conditions' || location.pathname === '/confidentialite' || location.pathname === '/sso/authorize' || isInChatConversation;
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
        {/* Public — accessible to anyone (logged in or not). Includes /otp
            because it serves signup-OTP and login-OTP flows where no token
            has been issued yet (along with the post-login withdrawal OTP
            which is reached while authenticated — public is the union). */}
        <Route path="/splash-screen" element={<SplashScreen />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/verify-email-otp" element={<VerifyEmailOtp />} />
        <Route path="/otp" element={<OTP />} />
        <Route path="/a-propos" element={<PublicLanding />} />
        <Route path="/conditions" element={<PublicTerms />} />
        <Route path="/confidentialite" element={<PublicPrivacy />} />
        <Route path="/sso/authorize" element={<SsoAuthorize />} />

        {/* Auth required — accessible to unactivated users so they can pay,
            update their profile, etc. */}
        <Route element={<RequireAuth />}>
          <Route path="/abonnement" element={<Abonnement />} />
          <Route path="/changer-abonnement" element={<Abonnement />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/modifier-email" element={<ChangeEmail />} />
          <Route path="/change-phone" element={<ChangePhoneNumber />} />
          <Route path="/withdrawal-otp-verification" element={<WithdrawalOtpVerification />} />
          {/* /transaction-confirmation is the post-payment landing page. The
              user just paid; their subscription may not have propagated yet
              (webhook delay) so we don't paywall them here. */}
          <Route path="/transaction-confirmation" element={<TransactionConfirmation />} />
        </Route>

        {/* Paywalled — must be logged in AND have an active subscription. */}
        <Route element={<RequireSubscription />}>
          <Route path="/" element={<Home />} />
          <Route path="/money" element={<Money />} />
          <Route path="/ads-pack" element={<AdsPack />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/modifier-le-profil" element={<ModifierLeProfil />} />
          <Route path="/single-product/:id" element={<SingleProductPage />} />
          <Route path="/ajouter-produit" element={<AjouterProduit />} />
          <Route path="/mes-produits" element={<MesProduits />} />
          <Route path="/modifier-produit/:id" element={<ModifierProduit />} />
          <Route path="/filleuls" element={<MesFilleuls />} />
          <Route path="/partenaire" element={<PartnerSpace />} />
          <Route path="/relance" element={<RelancePage />} />
          <Route path="/relance/sms-links" element={<RelanceSmsLinks />} />
          <Route path="/activation-balance" element={<ActivationBalance />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
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
