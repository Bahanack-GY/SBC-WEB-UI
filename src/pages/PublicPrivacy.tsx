import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import logo from '../assets/img/logo-sbc.png';
import PublicFooter from '../components/common/PublicFooter';

export default function PublicPrivacy() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#eaf2ff] via-white to-[#eaffea]">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <header className="flex items-center justify-between mb-6">
          <Link to="/a-propos" aria-label="Retour" className="h-9 w-9 flex items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm hover:bg-white">
            <FiArrowLeft size={20} />
          </Link>
          <img src={logo} alt="SBC" className="h-9 w-9 object-contain" />
          <Link to="/connexion" className="text-sm font-semibold text-[#115CF6] hover:underline">
            Se connecter
          </Link>
        </header>

        <article className="bg-white/80 backdrop-blur rounded-2xl p-6 md:p-8 shadow-sm prose prose-sm md:prose-base max-w-none">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-gray-500 mb-6">Sniper Business Center — Dernière mise à jour : Mai 2026</p>

          <p>
            Sniper Business Center (« <strong>SBC</strong> », « nous ») accorde une grande importance à
            la protection de vos données personnelles. La présente politique explique quelles
            informations nous collectons, comment nous les utilisons, et les droits dont vous disposez.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">1. Responsable du traitement</h2>
          <p>
            <strong>Sniper Business Center (SBC)</strong>, entreprise enregistrée au Cameroun.<br />
            Adresse : BP 6877, rue Sylvanie, Douala, Cameroun.<br />
            Email : <a href="mailto:reseautage.sbc@gmail.com" className="text-[#115CF6] hover:underline">reseautage.sbc@gmail.com</a><br />
            Téléphone : +237 6 82 90 35 35
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">2. Données que nous collectons</h2>
          <p>Lors de votre inscription et de votre utilisation de SBC, nous collectons :</p>
          <ul>
            <li><strong>Données d'identification</strong> : nom complet, adresse email, numéro WhatsApp, mot de passe (chiffré).</li>
            <li><strong>Données de profil</strong> : pays, région, date de naissance, sexe, profession, langue préférée, centres d'intérêt.</li>
            <li><strong>Code de parrainage</strong> : si vous êtes parrainé par un membre existant.</li>
            <li><strong>Données de paiement</strong> : informations de transaction (montant, opérateur Mobile Money, identifiants de session) — nous ne stockons pas vos numéros de carte ni vos identifiants Mobile Money complets.</li>
            <li><strong>Données techniques</strong> : adresse IP, type d'appareil, journaux d'accès — nécessaires à la sécurité et au bon fonctionnement du service.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Créer et gérer votre compte et votre profil de membre ;</li>
            <li>Vous envoyer des emails et SMS transactionnels (codes OTP, confirmations de paiement, notifications de transaction, alertes de sécurité) ;</li>
            <li>Vous proposer le programme de relance automatisée si vous y avez consenti ;</li>
            <li>Vous adresser des communications produit (nouveautés, mises à jour) — vous pouvez vous désinscrire à tout moment ;</li>
            <li>Permettre le partage de votre fiche de contact avec la communauté d'affiliés, conformément aux <Link to="/conditions" className="text-[#115CF6] hover:underline">CGU</Link> ;</li>
            <li>Calculer et verser les commissions liées au programme d'affiliation ;</li>
            <li>Détecter et prévenir la fraude, sécuriser nos systèmes ;</li>
            <li>Respecter nos obligations légales et fiscales.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">4. Base légale</h2>
          <p>
            Le traitement de vos données repose sur (i) l'exécution du contrat qui nous lie à vous,
            (ii) votre consentement (notamment pour le partage de votre fiche dans la communauté
            et pour les communications marketing), (iii) notre intérêt légitime à sécuriser nos
            services, et (iv) le respect d'obligations légales.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">5. Partage avec des tiers</h2>
          <p>Nous partageons vos données uniquement avec :</p>
          <ul>
            <li><strong>Prestataires de paiement</strong> (CinetPay, MoneyFusion, NOWPayments) — pour traiter vos transactions.</li>
            <li><strong>Prestataires d'envoi d'emails et de SMS</strong> (Amazon SES, opérateurs SMS) — pour vous délivrer les notifications transactionnelles et marketing.</li>
            <li><strong>Stockage cloud</strong> (Google Cloud Storage) — pour héberger vos documents et fichiers.</li>
            <li><strong>Membres affiliés de la communauté SBC</strong> — uniquement les éléments figurant dans votre fiche de contact, conformément aux <Link to="/conditions" className="text-[#115CF6] hover:underline">CGU</Link>.</li>
            <li><strong>Autorités</strong> — sur réquisition légale.</li>
          </ul>
          <p>Nous ne vendons jamais vos données à des tiers.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">6. Désabonnement et gestion des plaintes</h2>
          <p>
            Tous nos emails marketing incluent un lien de désinscription en bas de message. Vous
            pouvez également désactiver les notifications depuis votre profil ou nous écrire à
            <a href="mailto:reseautage.sbc@gmail.com" className="text-[#115CF6] hover:underline">&nbsp;reseautage.sbc@gmail.com</a>.
            Les emails transactionnels (OTP, confirmations de paiement, alertes de sécurité) sont
            essentiels au service et ne peuvent pas être désactivés. Les bounces et plaintes
            (FBL) sont traités automatiquement par notre prestataire d'envoi.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">7. Conservation des données</h2>
          <p>
            Nous conservons vos données aussi longtemps que votre compte est actif, et jusqu'à
            5 ans après la clôture pour répondre à nos obligations légales et comptables.
            Les données de connexion sont conservées 12 mois.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">8. Vos droits</h2>
          <p>Vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Accès</strong> et <strong>rectification</strong> de vos données depuis votre profil ou sur demande.</li>
            <li><strong>Suppression</strong> de votre compte et de vos données (sauf obligations légales de conservation).</li>
            <li><strong>Opposition</strong> au traitement à des fins marketing.</li>
            <li><strong>Portabilité</strong> de vos données dans un format lisible.</li>
            <li><strong>Retrait du consentement</strong> à tout moment.</li>
          </ul>
          <p>
            Pour exercer ces droits, écrivez-nous à&nbsp;
            <a href="mailto:reseautage.sbc@gmail.com" className="text-[#115CF6] hover:underline">reseautage.sbc@gmail.com</a>.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">9. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos
            données : chiffrement des mots de passe, transmission HTTPS, contrôles d'accès,
            authentification par OTP, et journaux d'audit.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">10. Mineurs</h2>
          <p>
            SBC n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas
            sciemment les données de mineurs.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">11. Modifications</h2>
          <p>
            Nous pouvons mettre à jour cette politique. Les changements importants vous seront
            notifiés par email ou via l'application.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">12. Contact</h2>
          <p>
            Pour toute question concernant vos données personnelles, contactez-nous à&nbsp;
            <a href="mailto:reseautage.sbc@gmail.com" className="text-[#115CF6] hover:underline">reseautage.sbc@gmail.com</a>.
          </p>
        </article>

        <PublicFooter />
      </div>
    </div>
  );
}
