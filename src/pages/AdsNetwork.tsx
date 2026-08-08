import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBullhorn, FaShareAlt, FaArrowRight, FaCheck } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import { sbcApiService } from '../services/SBCApiService';

/**
 * SBC Ads Network — program entry point for signed-in users.
 *
 * Two roles, one account. The pattern follows Uber driver/rider and Airbnb
 * host/guest: a user may hold both, but each is entered through its own
 * onboarding and has its own dashboard. Nothing is merged into a single view —
 * "how many views did I deliver" and "how many views did I buy" are different
 * questions and putting them on one screen makes both unreadable.
 */
function AdsNetwork() {
  const navigate = useNavigate();

  // Both lookups decide whether a card says "become" or "open". Neither is
  // allowed to block the page: a user who cannot reach the service still needs
  // to read what the program is.
  const { data: diffuseurProfile } = useQuery({
    queryKey: ['ads-diffuseur-profile'],
    queryFn: async () => {
      const res = await sbcApiService.getMyDiffuseurProfile();
      // 404 is the normal answer for "not enrolled", not a failure.
      return res.isSuccessByStatusCode ? res.body?.data : null;
    },
    retry: false,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['ads-my-campaigns-count'],
    queryFn: async () => {
      const res = await sbcApiService.getMyAdsCampaigns({ limit: 1 });
      return res.isSuccessByStatusCode ? res.body : null;
    },
    retry: false,
  });

  const isDiffuseur = Boolean(diffuseurProfile);
  const isAnnonceur = Boolean(campaigns?.pagination?.total);

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <BackButton />

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mt-2">SBC Ads Network</h1>
        <p className="text-gray-600 mt-2">
          Le réseau publicitaire de SBC sur WhatsApp. Les annonceurs financent des
          campagnes, les diffuseurs les publient sur leur statut et sont payés pour
          les vues réellement vérifiées.
        </p>

        <div className="space-y-4 mt-6">
          <motion.button
            onClick={() => navigate(isAnnonceur ? '/ads-network/annonceur' : '/ads-network/annonceur/onboarding')}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left bg-[#115CF6] text-white rounded-2xl p-5 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <FaBullhorn size={22} />
              <span className="font-semibold text-lg">
                {isAnnonceur ? 'Mon espace annonceur' : 'Devenir annonceur'}
              </span>
              {isAnnonceur && <FaCheck className="ml-auto" />}
            </div>
            <p className="text-sm text-blue-100 mt-2">
              Faites voir votre produit par des milliers de personnes. Vous payez
              uniquement les vues uniques ; les rediffusions des jours 2 et 3 sont
              offertes.
            </p>
            <span className="inline-flex items-center gap-2 text-sm mt-3 font-medium">
              {isAnnonceur ? 'Ouvrir' : 'Commencer'} <FaArrowRight size={12} />
            </span>
          </motion.button>

          <motion.button
            onClick={() => navigate(isDiffuseur ? '/ads-network/diffuseur' : '/ads-network/diffuseur/onboarding')}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left bg-green-600 text-white rounded-2xl p-5 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <FaShareAlt size={20} />
              <span className="font-semibold text-lg">
                {isDiffuseur ? 'Mon espace diffuseur' : 'Devenir diffuseur'}
              </span>
              {isDiffuseur && <FaCheck className="ml-auto" />}
            </div>
            <p className="text-sm text-green-100 mt-2">
              Publiez les campagnes sur votre statut WhatsApp pendant 3 jours et
              gagnez de l'argent selon le nombre de personnes qui les ont vues.
            </p>
            <span className="inline-flex items-center gap-2 text-sm mt-3 font-medium">
              {isDiffuseur ? 'Ouvrir' : 'Commencer'} <FaArrowRight size={12} />
            </span>
          </motion.button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-6 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">Vous pouvez tenir les deux rôles.</p>
          <p>
            Rien n'empêche d'être annonceur et diffuseur avec le même compte. Chaque
            rôle a son propre espace et ses propres gains.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdsNetwork;
