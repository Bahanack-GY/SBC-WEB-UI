import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaBullhorn, FaShieldAlt, FaSpinner, FaArrowRight } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import { AdsCardSkeleton } from '../components/ads/AdsScreen';
import { useAdsRoles } from '../hooks/useAdsRoles';
import { sbcApiService } from '../services/SBCApiService';

const MIN_AMOUNT = 6000;

/**
 * Annonceur onboarding: what the money buys, and that a creative is reviewed
 * before anyone posts it.
 *
 * The review step is stated up front rather than discovered after submission —
 * an annonceur who expects instant diffusion and waits instead reads that as the
 * product being broken.
 */
function AdsNetworkAnnonceurOnboarding() {
  const navigate = useNavigate();
  const { roles, isResolved } = useAdsRoles();
  const [amount, setAmount] = useState(String(MIN_AMOUNT));

  const parsed = Number(amount);
  const validAmount = Number.isFinite(parsed) && parsed >= MIN_AMOUNT;

  const { data: quote, isFetching } = useQuery({
    queryKey: ['ads-quote', validAmount ? parsed : null],
    queryFn: async () => {
      const res = await sbcApiService.getAdsQuote(parsed);
      return res.body?.data as {
        amount: number;
        uniqueViews: number;
        repeatViews: number;
        totalViews: number;
        availableCredit: number;
        amountDue: number;
        message: string;
      } | undefined;
    },
    enabled: validAmount,
  });

  // An annonceur with campaigns already knows the pitch; send them to their
  // dashboard before anything paints.
  if (isResolved && roles.isAnnonceur) {
    return <Navigate to="/ads-network/annonceur" replace />;
  }

  if (!isResolved) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-8">
        <div className="max-w-2xl mx-auto"><AdsCardSkeleton rows={2} /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <BackButton />

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Devenir annonceur</h1>
        <p className="text-gray-600 mt-2">
          Votre annonce est publiée sur le statut WhatsApp de membres SBC réels,
          choisis selon le public que vous visez. Vous ne payez que les vues
          effectivement vérifiées.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FaBullhorn className="text-[#115CF6]" /> Comment ça marche
          </h2>
          <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
            <li>Vous créez votre annonce : visuel, texte et moyen de contact.</li>
            <li>
              Notre équipe la vérifie. Rien n'est diffusé sans validation — c'est
              le statut personnel de nos membres.
            </li>
            <li>Une fois validée, vous payez et la campagne est proposée aux diffuseurs.</li>
            <li>
              Chaque diffuseur publie pendant <strong>3 jours</strong>. Seules les vues du
              premier jour vous sont facturées ; les rediffusions des jours 2 et 3
              sont offertes.
            </li>
            <li>
              Vous suivez en direct les vues et les clics générés, diffuseur par
              diffuseur.
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4 text-sm text-blue-900">
          <p className="flex items-start gap-2">
            <FaShieldAlt className="mt-0.5 shrink-0" />
            <span>
              Chaque annonce est relue avant diffusion. Comptez un court délai de
              validation entre l'envoi et le paiement.
            </span>
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-5 shadow-sm">
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Quel budget souhaitez-vous investir ?
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_AMOUNT}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#115CF6] focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum {MIN_AMOUNT.toLocaleString('fr-FR')} F.
          </p>

          {validAmount && (
            <div className="bg-gray-50 rounded-xl p-3 mt-3 text-sm text-gray-800">
              {isFetching ? (
                <span className="flex items-center gap-2 text-gray-500">
                  <FaSpinner className="animate-spin" /> Calcul…
                </span>
              ) : quote ? (
                <>
                  <p className="font-medium">{quote.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Soit {quote.totalViews.toLocaleString('fr-FR')} vues au total sur 3 jours.
                  </p>
                  {quote.availableCredit > 0 && (
                    <p className="text-xs text-green-700 mt-2">
                      Vous disposez de {quote.availableCredit.toLocaleString('fr-FR')} F de crédit.
                      À payer : {quote.amountDue.toLocaleString('fr-FR')} F.
                    </p>
                  )}
                </>
              ) : null}
            </div>
          )}

          <button
            onClick={() => navigate(`/ads-network/annonceur/nouvelle-campagne?amount=${parsed}`)}
            disabled={!validAmount}
            className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            Créer mon annonce <FaArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdsNetworkAnnonceurOnboarding;
