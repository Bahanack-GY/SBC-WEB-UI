import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaWhatsapp, FaTelegramPlane, FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import { FiMail, FiPhone, FiMapPin, FiArrowLeft } from 'react-icons/fi';
import logo from '../assets/img/logo-sbc.png';
import PublicFooter from '../components/common/PublicFooter';

export default function PublicLanding() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#eaf2ff] via-white to-[#eaffea]">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#115CF6]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#25D366]/10 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link to="/splash-screen" aria-label="Retour" className="h-9 w-9 flex items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm hover:bg-white">
            <FiArrowLeft size={20} />
          </Link>
          <img src={logo} alt="SBC" className="h-9 w-9 object-contain" />
          <Link to="/connexion" className="text-sm font-semibold text-[#115CF6] hover:underline">
            Se connecter
          </Link>
        </header>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Sniper Business Center
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Plateforme africaine de réseautage, publicité, business P2P et investissement.
            Augmentez votre visibilité sur WhatsApp et Telegram, accédez à des formations gratuites,
            et développez vos revenus grâce à notre programme d'affiliation.
          </p>
        </motion.section>

        {/* What we do */}
        <section className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Ce que nous proposons</h2>
          <ul className="space-y-2 text-gray-700">
            <li>📣 <strong>Publicité ciblée</strong> — diffusez vos produits et services à une communauté d'affiliés actifs.</li>
            <li>🎓 <strong>Formations gratuites</strong> — business, marketing digital, développement personnel.</li>
            <li>📇 <strong>Carnet de contacts qualifiés</strong> — partage régulier de fichiers de contacts au sein de la communauté.</li>
            <li>💰 <strong>Programme d'affiliation</strong> — gagnez des commissions sur les inscriptions de vos filleuls.</li>
            <li>🛒 <strong>Marketplace</strong> — vendez ou achetez auprès des autres membres.</li>
          </ul>
        </section>

        {/* Email use case — important for SES reviewers */}
        <section className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Communications par email</h2>
          <p className="text-gray-700 mb-3">
            En vous inscrivant sur SBC, vous recevrez les types d'emails suivants :
          </p>
          <ul className="space-y-2 text-gray-700 mb-3">
            <li>✉️ <strong>Emails transactionnels</strong> — codes OTP de vérification, confirmations de paiement, notifications de transaction, rappels d'abonnement, alertes de sécurité.</li>
            <li>📨 <strong>Emails de relance</strong> — séquences automatisées envoyées aux membres en cours d'inscription pour les accompagner (avec leur consentement à l'inscription).</li>
            <li>📰 <strong>Communications produit</strong> — annonces de nouvelles fonctionnalités, mises à jour importantes (désinscription possible à tout moment).</li>
          </ul>
          <p className="text-sm text-gray-600">
            Tous nos emails marketing incluent un lien de désinscription. Nous traitons les bounces et plaintes
            via les notifications fournies par notre prestataire d'envoi.
          </p>
        </section>

        {/* Quick contact */}
        <section className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Nous contacter</h2>
          <div className="space-y-2 text-gray-700">
            <div className="flex items-center gap-3">
              <FiMail className="text-[#115CF6]" />
              <a href="mailto:reseautage.sbc@gmail.com" className="hover:underline">reseautage.sbc@gmail.com</a>
            </div>
            <div className="flex items-center gap-3">
              <FiPhone className="text-[#115CF6]" />
              <a href="tel:+237682903535" className="hover:underline">+237 6 82 90 35 35</a> (Yaoundé)
            </div>
            <div className="flex items-center gap-3">
              <FiPhone className="text-[#115CF6]" />
              <a href="tel:+237697470426" className="hover:underline">+237 6 97 47 04 26</a> (Douala)
            </div>
            <div className="flex items-center gap-3">
              <FiMapPin className="text-[#115CF6]" />
              <span>BP 6877, rue Sylvanie, Douala, Cameroun</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <a href="https://whatsapp.com/channel/0029Vav3mvCElah05C8QuT03" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="h-10 w-10 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90">
              <FaWhatsapp />
            </a>
            <a href="https://t.me/sniperbusinesscenterafrica" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="h-10 w-10 flex items-center justify-center rounded-full bg-[#0088cc] text-white hover:opacity-90">
              <FaTelegramPlane />
            </a>
            <a href="https://www.facebook.com/sniperbusinesscenter/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="h-10 w-10 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90">
              <FaFacebookF />
            </a>
            <a href="https://www.instagram.com/sniperbusinesscenter/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white hover:opacity-90">
              <FaInstagram />
            </a>
            <a href="https://www.tiktok.com/@sniper.business.center" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="h-10 w-10 flex items-center justify-center rounded-full bg-black text-white hover:opacity-90">
              <FaTiktok />
            </a>
          </div>
        </section>

        {/* Resources */}
        <section className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Documents</h2>
          <div className="flex flex-col gap-2">
            <a
              href="https://storage.googleapis.com/sbc-file-storage/documents/pres_pdf_1753011729757_SBC%20Pr%C3%83%C2%A9sentation.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#115CF6] hover:underline"
            >
              📄 Présentation officielle (PDF)
            </a>
            <Link to="/conditions" className="text-[#115CF6] hover:underline">📄 Conditions générales d'utilisation</Link>
            <Link to="/confidentialite" className="text-[#115CF6] hover:underline">📄 Politique de confidentialité</Link>
          </div>
        </section>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            to="/connexion"
            className="flex-1 text-center bg-[#115CF6] hover:bg-blue-700 text-white font-bold rounded-xl py-3 shadow-md transition-colors"
          >
            Se connecter
          </Link>
          <Link
            to="/signup"
            className="flex-1 text-center bg-white border-2 border-[#115CF6] text-[#115CF6] font-bold rounded-xl py-3 hover:bg-blue-50 transition-colors"
          >
            Créer un compte
          </Link>
        </div>

        <PublicFooter />
      </div>
    </div>
  );
}
