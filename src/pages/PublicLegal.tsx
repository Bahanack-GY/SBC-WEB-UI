import { Link } from 'react-router-dom';
import LegalPage, { LegalHeading as H } from '../components/common/LegalPage';
import TermsLink from '../components/common/TermsLink';
import { APDP_DELIBERATION } from '../utils/privacy';

const EMAIL = 'reseautage.sbc@gmail.com';

export default function PublicLegal() {
  return (
    <LegalPage title="Mentions légales" updated="Dernière mise à jour : Novembre 2026">
      <H>1. Éditeur du site</H>
      <p>
        Le site <strong>sniperbuisnesscenter.com</strong> et l'application Sniper Business Center (SBC) sont
        édités par :
      </p>
      <ul>
        <li>
          <strong>ETS SNIPER BUSINESS CENTER</strong>, entreprise immatriculée au Bénin,
          RCCM RB/PNO/25/A/113290, représentée par sa Directrice, Madame Adèle AGONGNON ;
        </li>
        <li>
          <strong>Sniper Business Center</strong>, entreprise immatriculée au Cameroun,
          RCCM CM RC/YAO/2024/A/1775, NUI P010017690992B, Yaoundé (Nkolbisson), représentée par son
          représentant légal, M. Feussi Ngossoko Rufus Herma.
        </li>
      </ul>
      <p>
        Adresse de contact : BP 6877, rue Sylvanie, Douala, Cameroun.<br />
        Email : <a href={`mailto:${EMAIL}`}>{EMAIL}</a><br />
        Téléphone : +237 6 82 90 35 35
      </p>

      <H>2. Directeur de la publication</H>
      <p>M. Feussi Ngossoko Rufus Herma, représentant légal de Sniper Business Center.</p>

      <H>3. Responsable du traitement des données personnelles</H>
      <p>
        ETS SNIPER BUSINESS CENTER (Bénin), représentée par sa Directrice, Madame Adèle AGONGNON.
      </p>

      <H>4. Hébergeurs</H>
      <ul>
        <li>
          <strong>Contabo GmbH</strong>, Munich, Allemagne : hébergement de l'application, des bases de
          données et du serveur email (serveurs situés en Allemagne, Union européenne).
        </li>
        <li>
          <strong>Cloudflare, Inc.</strong> (États-Unis) : stockage des fichiers (photos, vidéos) dans
          Cloudflare R2 et protection du site.
        </li>
      </ul>

      <H>5. Autorisation de l'APDP</H>
      <p>
        Le traitement des données personnelles des membres de SBC est autorisé par l'Autorité de Protection
        des Données à caractère Personnel du Bénin (<a href="https://apdp.bj" target="_blank" rel="noopener noreferrer">APDP</a>),{' '}
        <strong>{APDP_DELIBERATION}</strong>, en application de la Loi n° 2017-20 du 20 avril 2018 portant
        code du numérique en République du Bénin.
      </p>

      <H>6. Données personnelles</H>
      <p>
        SBC collecte les données nécessaires à votre compte et aux services que vous utilisez, avec votre
        consentement donné à l'inscription. Vos données sont hébergées hors du Bénin (en Allemagne et chez
        Cloudflare), avec votre accord. Le détail (données collectées, finalités, destinataires, durée de
        conservation) figure dans la <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'opposition, de suppression (droit à l'oubli),
        de portabilité et de retrait de votre consentement. Pour les exercer :
      </p>
      <ul>
        <li>
          dans l'application, page <Link to="/mes-donnees">Mes données personnelles</Link> (Profil → Mes
          données personnelles) : télécharger vos données, corriger vos informations, ne plus figurer dans
          le fichier de contacts, régler vos notifications, supprimer votre compte ;
        </li>
        <li>ou par email à <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</li>
      </ul>
      <p>
        Nous répondons dans un délai d'un mois. Vous pouvez adresser une réclamation à l'APDP :{' '}
        <a href="https://apdp.bj" target="_blank" rel="noopener noreferrer">apdp.bj</a>.
      </p>

      <H>7. Cookies</H>
      <p>
        SBC n'utilise pas de cookies publicitaires ni de mesure d'audience. Le site garde seulement sur
        votre appareil ce qu'il faut pour fonctionner, 60 jours au plus.{' '}
        <Link to="/confidentialite#cookies">En savoir plus</Link>.
      </p>

      <H>8. Conditions d'utilisation</H>
      <p>
        L'utilisation de SBC est soumise aux <TermsLink>conditions générales d'utilisation</TermsLink>.
      </p>

      <H>9. Contact</H>
      <p>
        Pour toute question : <a href={`mailto:${EMAIL}`}>{EMAIL}</a> ou +237 6 82 90 35 35.
      </p>
    </LegalPage>
  );
}
