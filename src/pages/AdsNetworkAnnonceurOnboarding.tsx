import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaSpinner, FaArrowRight } from 'react-icons/fa';
import BackButton from '../components/common/BackButton';
import { AdsCardSkeleton } from '../components/ads/AdsScreen';
import { AdsHero, AdsStep } from '../components/ads/AdsSteps';
import heroAnnonceur from '../assets/icon/ads-annonceur.jpg';
import illustrationReview from '../assets/icon/ads-review.jpg';
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
        <AdsHero src={heroAnnonceur} alt="" />

        <h1 className="text-2xl font-bold text-gray-900 text-center">Devenir annonceur</h1>
        <p className="text-gray-600 mt-2 text-center">
          Votre annonce sur le statut WhatsApp de membres SBC, ciblés selon votre public.
        </p>

        <h2 className="font-semibold text-gray-900 mt-6 mb-3">Comment ça marche</h2>
        <div className="space-y-3">
          <AdsStep index={1} title="Vous créez votre annonce">
Visuel, texte et moyen de contact.
          </AdsStep>
          <AdsStep index={2} title="Notre équipe la vérifie">
Rien n'est diffusé sans validation.
          </AdsStep>
          <AdsStep index={3} title="Vous payez, la campagne part">
Elle part aux diffuseurs correspondant à votre ciblage.
          </AdsStep>
          <AdsStep index={4} title="Chaque diffuseur publie 3 jours">
Seul le jour 1 est facturé. Les jours 2 et 3 sont offerts.
          </AdsStep>
          <AdsStep index={5} title="Vous suivez les résultats en direct">
Vues et clics, diffuseur par diffuseur.
          </AdsStep>
        </div>

        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-3 mt-4">
          <img src={illustrationReview} alt="" aria-hidden="true" className="w-20 shrink-0" />
          <p className="text-sm text-blue-900">
<span className="font-medium">Chaque annonce est relue avant diffusion.</span>{' '}
            Comptez un court délai avant de pouvoir payer.
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
