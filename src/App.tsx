import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import NavigationBar from './components/common/NavigationBar'
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

function App() {
  const location = useLocation();
  const hideNav = location.pathname === '/wallet' || location.pathname === '/filleuls' || location.pathname === '/abonnement' || location.pathname === '/single-product' || location.pathname === '/profile' || location.pathname === '/contacts' || location.pathname === '/otp' || location.pathname === '/transaction-confirmation' || location.pathname === '/splash-screen' || location.pathname === '/connexion' || location.pathname === '/signup' || location.pathname === '/forgot-password' || location.pathname === '/change-password' || location.pathname === '/modifier-le-profil' || location.pathname === '/ajouter-produit' || location.pathname === '/mes-produits' || location.pathname.startsWith('/modifier-produit/');
  return (
    <div className="bg-white">
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
        <Route path="/single-product" element={<SingleProductPage />} />
        <Route path="/ajouter-produit" element={<AjouterProduit />} />
        <Route path="/mes-produits" element={<MesProduits />} />
        <Route path="/modifier-produit/:id" element={<ModifierProduit />} />
        <Route path="/abonnement" element={<Abonnement />} />
        <Route path="/filleuls" element={<MesFilleuls />} />
      </Routes>
      {!hideNav && <NavigationBar />}
    </div>
  )
}

export default App
