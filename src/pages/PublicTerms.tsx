import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import logo from '../assets/img/logo-sbc.png';
import PublicFooter from '../components/common/PublicFooter';

export default function PublicTerms() {
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-gray-500 mb-6">Sniper Business Center — En vigueur</p>

          <p>
            Bienvenue sur <strong>SNIPER BUSINESS CENTER</strong>, une plateforme de réseautage,
            publicité, business P2P et investissement. Veuillez lire attentivement les présentes
            conditions générales d'utilisation (ci-après dénommées « <strong>CGU</strong> ») avant
            d'utiliser nos services.
          </p>
          <p>
            En utilisant notre application mobile, vous acceptez de vous conformer à ces CGU et vous
            engagez à les respecter.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">1. Adhésion et affiliation</h2>
          <p><strong>1.1</strong> Toute personne rejoignant la communauté SBC devient membre adhérent, autorisant l'entreprise à partager les informations fournies lors de l'inscription avec les autres membres affiliés de la communauté.</p>
          <p><strong>1.2</strong> En devenant membre de la communauté SBC, vous devenez automatiquement un partenaire affilié de SBC.</p>
          <p><strong>1.3</strong> Les frais d'adhésion de 2&nbsp;000 FCFA ne constituent pas un investissement, mais le paiement d'un service donnant droit à la réception de fichiers de contacts partagés par l'entreprise SBC dans sa communauté d'affiliés.</p>
          <p><strong>1.4</strong> Les frais d'adhésion à SBC sont non remboursables une fois payés.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">2. Service publicitaire</h2>
          <p><strong>2.1</strong> Pour bénéficier de nos services publicitaires, vous devez obligatoirement souscrire à un pack publicitaire qui varie entre 2&nbsp;000 FCFA et 10&nbsp;000 FCFA.</p>
          <p><strong>2.2</strong> La souscription à un service publicitaire ne garantit pas les ventes (nous offrons juste la visibilité à vos services ou produits).</p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">3. Responsabilités des utilisateurs</h2>
          <p><strong>3.1</strong> SNIPER BUSINESS CENTER ne garantit pas votre visibilité sur WhatsApp, celle-ci dépend de votre capacité à communiquer sur vos statuts WhatsApp.</p>
          <p><strong>3.2</strong> SBC permet l'augmentation progressive du carnet d'adresses de contacts avec de nouveaux fichiers de contacts.</p>
          <p><strong>3.3</strong> Tout membre de SBC doit rejoindre le groupe WhatsApp de la communauté SBC pour rester informé. Les membres doivent respecter les règles du groupe sous peine d'exclusion par SBC.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">4. Paiements et affiliation</h2>
          <p><strong>4.1</strong> Les frais d'adhésion à SBC ne doivent être payés qu'une seule fois selon les méthodes de paiement diffusées par l'entreprise. Tout autre paiement demandé par un tiers n'émane pas de SBC.</p>
          <p><strong>4.2</strong> L'affiliation à SBC n'est pas obligatoire, mais si choisie, les membres doivent se former correctement sur le fonctionnement, les produits et les services de SNIPER BUSINESS CENTER.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">5. Modifications et résiliation</h2>
          <p><strong>5.1</strong> SBC se réserve le droit de modifier, suspendre ou interrompre tout ou partie de ses services à tout moment, sans préavis et à sa seule discrétion.</p>
          <p><strong>5.2</strong> En cas de conflit entre les membres affiliés de SBC, les parties impliquées acceptent de régler le différend de manière indépendante, sans impliquer SBC dans le processus de résolution du conflit.</p>

          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">6. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU, vous pouvez nous écrire à&nbsp;
            <a href="mailto:reseautage.sbc@gmail.com" className="text-[#115CF6] hover:underline">reseautage.sbc@gmail.com</a>.
          </p>
        </article>

        <PublicFooter />
      </div>
    </div>
  );
}
