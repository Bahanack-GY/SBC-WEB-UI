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
import { useEffect, useState } from 'react'
import VerifyOtp from './pages/VerifyOtp'
import ResetPassword from './pages/ResetPassword'
import VerifyEmailOtp from './pages/VerifyEmailOtp'
import ChangeEmail from './pages/ChangeEmail'
import ChangePhoneNumber from './pages/ChangePhoneNumber'
import PartnerSpace from './pages/PartnerSpace'
import WithdrawalOtpVerification from './pages/WithdrawalOtpVerification'
import { useQuery } from '@tanstack/react-query'
import { handleApiResponse } from './utils/apiHelpers'
import { sbcApiService } from './services/SBCApiService'
import { TourProvider } from './components/common/TourProvider'

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
  const [splashViewed, setSplashViewed] = useState(() => localStorage.getItem('splashViewed') === 'true');
  const { isAuthenticated, logout } = useAuth();

  // Fetch subscription status globally
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionData | null>({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      try {
        const response = await sbcApiService.getCurrentSubscription();
        return handleApiResponse(response);
      } catch (err) {
        console.warn('Subscription endpoint failed:', err);
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
  console.log("subscriptionData", subscriptionData);
  console.log("subscriptionData.status", subscriptionData?.totalCount);
  console.log("isSubscribed", isSubscribed);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const affiliationCodeFromUrl = params.get('affiliationCode');
    if (affiliationCodeFromUrl) {
      setAffiliationCode(affiliationCodeFromUrl);
    }

    // If on splash screen and not yet marked as viewed, mark as viewed
    if (location.pathname === '/splash-screen' && !splashViewed) {
      localStorage.setItem('splashViewed', 'true');
      setSplashViewed(true);
    }

    // Handle splash screen redirects
    if (location.pathname === '/splash-screen' && splashViewed) {
      if (!isAuthenticated) {
        window.location.replace('/connexion');
      } else if (isAuthenticated) {
        window.location.replace('/');
      }
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
    const allowed = ['/connexion', '/signup', '/splash-screen', '/abonnement'];
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
  }, [location, setAffiliationCode, splashViewed, isAuthenticated, subscriptionLoading, isSubscribed]);

  // Optionally, block rendering until subscription status is known
  if (isAuthenticated && subscriptionLoading) {
    return <div className="flex items-center justify-center min-h-screen text-lg">Vérification de l'abonnement...</div>;
  }

  // Logout button for unsubscribed users
  const showLogout = isAuthenticated && !isSubscribed;

  const hideNav = location.pathname === '/wallet' || location.pathname === '/filleuls' || location.pathname === '/abonnement' || location.pathname === '/single-product' || location.pathname === '/profile' || location.pathname === '/contacts' || location.pathname === '/otp' || location.pathname === '/transaction-confirmation' || location.pathname === '/splash-screen' || location.pathname === '/connexion' || location.pathname === '/signup' || location.pathname === '/forgot-password' || location.pathname === '/change-password' || location.pathname === '/modifier-le-profil' || location.pathname === '/ajouter-produit' || location.pathname === '/mes-produits' || location.pathname.startsWith('/modifier-produit/') || location.pathname === '/verify-otp' || location.pathname === '/reset-password' || location.pathname === '/reset-password-otp' || location.pathname === '/verify-email-otp' || location.pathname === '/modifier-email' || location.pathname === '/change-email' || location.pathname === '/change-phone' || location.pathname === '/changer-mot-de-passe' || location.pathname === '/withdrawal-otp-verification';
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
      </Routes>
      {!hideNav && <NavigationBar />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AffiliationProvider>
        <TourProvider>
          <AppContent />
        </TourProvider>
      </AffiliationProvider>
    </AuthProvider>
  )
}

export default App
