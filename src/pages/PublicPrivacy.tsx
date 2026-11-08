import { Link } from 'react-router-dom';
import LegalPage, { LegalHeading as H } from '../components/common/LegalPage';
import TermsLink from '../components/common/TermsLink';
import { APDP_DELIBERATION } from '../utils/privacy';

const EMAIL = 'reseautage.sbc@gmail.com';
const Mail = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;
const MyData = () => <Link to="/mes-donnees">Mes données personnelles</Link>;

export default function PublicPrivacy() {
  return (
    <LegalPage title="Politique de confidentialité" updated="Dernière mise à jour : Novembre 2026">
      <p>
        Sniper Business Center (« <strong>SBC</strong> », « nous ») protège vos données personnelles. Cette
        politique explique quelles informations nous collectons, pourquoi, avec qui nous les partageons, où
        elles sont hébergées, combien de temps nous les gardons, et comment exercer vos droits. Elle
        s'applique à tous les membres, quel que soit leur pays.
      </p>

      <H>1. Responsable du traitement</H>
      <p>
        <strong>ETS SNIPER BUSINESS CENTER</strong>, entreprise immatriculée au Bénin
        (RCCM RB/PNO/25/A/113290), représentée par sa Directrice, <strong>Madame Adèle AGONGNON</strong>.
      </p>
      <p>
        SBC est également immatriculée au Cameroun : RCCM CM RC/YAO/2024/A/1775, NUI P010017690992B,
        Yaoundé (Nkolbisson), représentant légal M. Feussi Ngossoko Rufus Herma.
      </p>
      <p>
        Adresse de contact : BP 6877, rue Sylvanie, Douala, Cameroun.<br />
        Email : <Mail /><br />
        Téléphone : +237 6 82 90 35 35
      </p>

      <H id="autorisation-apdp">2. Autorisation de l'APDP</H>
      <p>
        Le traitement des données personnelles des membres de SBC a été autorisé par l'Autorité de Protection
        des Données à caractère Personnel du Bénin (<a href="https://apdp.bj" target="_blank" rel="noopener noreferrer">APDP</a>),
        par la <strong>{APDP_DELIBERATION}</strong>, en application de la Loi n° 2017-20 du 20 avril 2018
        portant code du numérique en République du Bénin.
      </p>

      <H>3. Données que nous collectons</H>
      <p>Lors de votre inscription et de votre utilisation de SBC, nous collectons :</p>
      <ul>
        <li><strong>Données d'identification</strong> : nom complet, adresse email, numéro WhatsApp, mot de passe (chiffré : nous ne pouvons pas le lire), photo de profil si vous en ajoutez une.</li>
        <li><strong>Données de profil</strong> : pays, région, date de naissance, sexe, profession, langue préférée, centres d'intérêt, et les numéros WhatsApp supplémentaires que vous ajoutez.</li>
        <li><strong>Parrainage</strong> : le code de votre parrain et la liste de vos filleuls.</li>
        <li><strong>Données de paiement</strong> : montant, opérateur, références des transactions, et le numéro Mobile Money ou l'adresse de portefeuille crypto que vous enregistrez pour vos retraits. Nous ne recevons ni vos codes secrets Mobile Money, ni vos numéros de carte bancaire.</li>
        <li><strong>Contenus que vous publiez</strong> : produits, statuts, messages, campagnes publicitaires, événements.</li>
        <li><strong>Vos accords</strong> : la date à laquelle vous avez accepté cette politique et le transfert de vos données, et la version acceptée.</li>
        <li><strong>Données techniques</strong> : adresse IP, type d'appareil et de navigateur, journaux d'accès, nécessaires à la sécurité et au bon fonctionnement du service.</li>
      </ul>

      <H>4. Finalités du traitement</H>
      <p>Vos données sont utilisées pour :</p>
      <ul>
        <li>créer et gérer votre compte et votre profil de membre ;</li>
        <li>vous envoyer les messages liés au service (codes de connexion, confirmations de paiement, alertes de sécurité) par email, WhatsApp, SMS ou notification ;</li>
        <li>faire fonctionner les services que vous utilisez : relance de vos filleuls, boutique, publicité, événements, messagerie, SBC Love ;</li>
        <li>partager votre fiche de contact avec la communauté des membres, tant que vous le laissez activé (voir la section 10) ;</li>
        <li>calculer et verser les commissions de parrainage, traiter vos paiements et vos retraits ;</li>
        <li>vous informer des nouveautés de SBC (vous pouvez vous désinscrire à tout moment) ;</li>
        <li>détecter et prévenir la fraude, sécuriser nos systèmes ;</li>
        <li>respecter nos obligations légales et comptables.</li>
      </ul>

      <H>5. Base légale</H>
      <p>
        Le traitement de vos données repose avant tout sur <strong>votre consentement</strong>, recueilli
        lors de votre inscription (ou, pour les membres du Bénin déjà inscrits, dans la fenêtre d'accord
        affichée dans l'application). Nous enregistrons la date de votre accord et la version de la politique que
        vous avez acceptée. Il repose aussi sur l'exécution du service auquel vous avez souscrit, sur nos
        obligations légales et sur notre intérêt légitime à sécuriser le service.
      </p>

      <H>6. Destinataires et sous-traitants</H>
      <p>Vos données ne sont communiquées qu'aux destinataires suivants, et seulement pour ce dont ils ont besoin :</p>
      <ul>
        <li><strong>Contabo GmbH</strong> (Munich, Allemagne) : hébergement de l'application, des bases de données et de notre serveur email, sur des serveurs situés en Allemagne (Union européenne).</li>
        <li><strong>Cloudflare, Inc.</strong> : stockage de vos fichiers (photos, vidéos) dans Cloudflare R2, protection du site contre les attaques, et envoi de certains codes de connexion par email quand notre serveur est très sollicité.</li>
        <li><strong>Prestataires de paiement</strong> : MoneyFusion, CinetPay et FeexPay (Mobile Money), NOWPayments (crypto), pour traiter vos paiements et vos retraits.</li>
        <li><strong>WhatsApp (Meta)</strong> : envoi de vos codes de connexion par WhatsApp quand vous choisissez ce canal.</li>
        <li><strong>Un opérateur d'envoi de SMS</strong>, pour les SMS de relance (Cameroun uniquement).</li>
        <li><strong>Le service de notifications de votre navigateur</strong> (Google, Apple ou Mozilla), si vous activez les notifications sur votre téléphone.</li>
        <li><strong>Les membres de la communauté SBC</strong> : uniquement votre fiche de contact, dans le fichier de contacts SBC, conformément aux <TermsLink>CGU</TermsLink> et tant que le partage est activé.</li>
        <li><strong>Les autorités</strong>, sur réquisition légale.</li>
      </ul>
      <p>Nous ne vendons jamais vos données.</p>

      <H id="transfert">7. Transfert des données hors du Bénin</H>
      <p>
        Vos données sont hébergées et traitées <strong>hors du Bénin</strong> : en Allemagne (Union
        européenne) chez Contabo, et chez Cloudflare, Inc., société américaine dont les serveurs sont
        répartis dans le monde. Les prestataires de paiement et WhatsApp traitent, dans leurs propres pays,
        les données nécessaires à leur service.
      </p>
      <p>
        Pour les membres résidant au Bénin, ce transfert se fait <strong>avec leur consentement</strong>,
        donné librement à l'inscription ou dans la fenêtre d'accord de l'application. Il est indispensable au fonctionnement de SBC : vous
        pouvez retirer ce consentement à tout moment en supprimant votre compte, depuis la page <MyData />.
      </p>

      <H id="cookies">8. Cookies et traceurs</H>
      <p>
        SBC <strong>n'utilise aucun cookie publicitaire ni de mesure d'audience</strong>, et aucun outil
        de statistiques.
      </p>
      <p>
        Le site garde seulement sur votre appareil (dans la mémoire du navigateur) ce qu'il faut pour
        fonctionner : votre session de connexion, votre langue, vos préférences d'affichage et les
        messages que vous avez déjà fermés. Cloudflare, qui protège le site, peut déposer de courts cookies
        techniques de sécurité (par exemple <code>__cf_bm</code>, valable environ 30 minutes).
      </p>
      <p>
        <strong>Rien n'est conservé plus de 60 jours.</strong> Quand vous vous déconnectez, les informations
        personnelles gardées sur l'appareil sont effacées. Vous pouvez aussi tout effacer à tout moment
        dans les réglages de votre navigateur (« Effacer les données de navigation » ou « Données des
        sites »).
      </p>

      <H>9. Conservation des données</H>
      <p>
        Nous conservons vos données tant que votre compte est actif. Quand vous supprimez votre compte,
        vos données sont effacées, sauf celles que la loi nous oblige à garder (transactions, données
        comptables), conservées jusqu'à 5 ans. Les journaux de connexion sont conservés 12 mois au plus.
        Ce que le site garde sur votre appareil est effacé au plus tard après 60 jours.
      </p>

      <H id="droits">10. Vos droits et comment les exercer</H>
      <p>
        Conformément au code du numérique du Bénin (articles 437, 438, 440, 441 et 443), vous disposez des
        droits suivants. La plupart s'exercent directement dans l'application, depuis la page{' '}
        <MyData /> (Profil → Mes données personnelles) :
      </p>
      <ul>
        <li><strong>Droit d'accès</strong> : « Télécharger mes données » vous donne une copie de toutes les données que nous avons sur vous.</li>
        <li><strong>Droit à la portabilité</strong> : ce fichier est au format JSON, lisible et réutilisable par un autre service.</li>
        <li><strong>Droit de rectification</strong> : « Corriger mes informations » mène à la modification de votre profil, de votre email et de votre numéro.</li>
        <li><strong>Droit d'opposition</strong> : vous pouvez retirer votre fiche du fichier de contacts SBC (interrupteur « Partager mes coordonnées »), choisir les notifications que vous recevez, et vous désinscrire des emails de relance par le lien en bas de chaque message.</li>
        <li><strong>Droit à la suppression et droit à l'oubli</strong> : « Supprimer mon compte » efface définitivement votre compte, après confirmation par votre mot de passe.</li>
        <li><strong>Retrait du consentement</strong> : à tout moment, en supprimant votre compte ; pour le partage de vos coordonnées, avec l'interrupteur prévu.</li>
      </ul>
      <p>
        Vous pouvez aussi exercer tous ces droits en nous écrivant à <Mail />, depuis l'adresse de votre
        compte. Nous pourrons vous demander de confirmer votre identité. <strong>Nous répondons dans un
        délai d'un mois.</strong>
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à
        l'Autorité de Protection des Données à caractère Personnel du Bénin (APDP) :{' '}
        <a href="https://apdp.bj" target="_blank" rel="noopener noreferrer">apdp.bj</a>.
      </p>

      <H>11. Sécurité</H>
      <p>
        Nous protégeons vos données par des mesures techniques et organisationnelles : mots de passe
        chiffrés, connexions HTTPS, codes de vérification à la connexion, accès aux données réservé aux
        personnes qui en ont besoin, blocage des retraits après un changement d'email ou de numéro, et
        journaux d'audit.
      </p>

      <H>12. Mineurs</H>
      <p>
        SBC n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment les
        données de mineurs.
      </p>

      <H>13. Modifications</H>
      <p>
        Nous pouvons mettre à jour cette politique. En cas de changement important, nous vous en informons
        dans l'application ou par email et, si nécessaire, nous vous demandons à nouveau votre accord.
      </p>

      <H>14. Contact</H>
      <p>
        Pour toute question sur vos données personnelles : <Mail /> ou +237 6 82 90 35 35. Voir aussi les{' '}
        <Link to="/mentions-legales">mentions légales</Link>.
      </p>
    </LegalPage>
  );
}
