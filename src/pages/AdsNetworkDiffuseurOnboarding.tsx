import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { AdsCardSkeleton } from '../components/ads/AdsScreen';
import { useAdsRoles } from '../hooks/useAdsRoles';
import { sbcApiService } from '../services/SBCApiService';

/** Labels for the profile fields targeting runs on. Raw field names mean nothing to a user. */
const FIELD_LABELS: Record<string, string> = {
  country: 'Pays',
  city: 'Ville',
  sex: 'Sexe',
  birthDate: 'Date de naissance',
};

/**
 * Diffuseur onboarding: the rules, the eligibility checklist, then enrolment.
 *
 * The rules are stated before the form on purpose. Every one of them can cost a
 * diffuseur their earnings, and "I didn't know" is not recoverable once a day is
 * missed.
 */
function AdsNetworkDiffuseurOnboarding() {
  const navigate = useNavigate();
  const { roles, isResolved } = useAdsRoles();
  const [declaredViews, setDeclaredViews] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: eligibility, isLoading } = useQuery({
    queryKey: ['ads-diffuseur-eligibility'],
    queryFn: async () => {
      const res = await sbcApiService.getDiffuseurEligibility();
      return res.body?.data as {
        eligible: boolean;
        missingFields: string[];
        hasProfile: boolean;
        whatsappLinked: boolean;
      } | undefined;
    },
  });

  const handleEnroll = async () => {
    const views = Number(declaredViews);
    if (!Number.isFinite(views) || views <= 0) {
      setError('Indiquez une moyenne de vues valide.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await sbcApiService.enrollAsDiffuseur(views);
      if (!res.isSuccessByStatusCode) {
        setError(res.body?.message || "L'inscription a échoué.");
        return;
      }
      navigate('/ads-network/diffuseur');
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'inscription a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  // Gate before rendering, not after. Redirecting from an effect means onboarding
  // paints first and is yanked away a second later — the flash Sterling saw.
  if (isResolved && (roles.isDiffuseur || eligibility?.hasProfile)) {
    return <Navigate to="/ads-network/diffuseur" replace />;
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

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Devenir diffuseur</h1>
        <p className="text-gray-600 mt-2">
          Vous publiez la campagne d'un annonceur sur votre statut WhatsApp et vous
          êtes payé selon le nombre de personnes qui l'ont réellement vue.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-5">
          <h2 className="font-semibold text-gray-900 mb-3">Comment ça marche</h2>
          <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
            <li>
              Une campagne vous est proposée. Elle est proposée à plusieurs
              diffuseurs à la fois : <strong>les premiers à accepter l'obtiennent</strong>.
            </li>
            <li>
              Après avoir accepté, vous avez <strong>24 heures</strong> pour publier le
              jour 1. Passé ce délai, la place est rendue à un autre diffuseur.
            </li>
            <li>
              Une campagne se publie sur <strong>3 jours</strong>, à au moins 24 h
              d'intervalle. Vous disposez de <strong>3 jours de report</strong> au total
              pour terminer.
            </li>
            <li>
              Après chaque publication, vous connectez votre WhatsApp sur SBC pour
              que nous comptions les vues. <strong>À faire avant l'expiration du
              statut</strong> — une fois expiré, les vues de la journée sont perdues et
              ne peuvent pas être récupérées.
            </li>
            <li>
              À la fin des 3 jours, vos gains sont crédités sur votre solde
              publicitaire, transférable vers votre solde principal.
            </li>
          </ol>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 text-sm text-amber-900">
          <p className="flex items-start gap-2">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>
              Ne modifiez jamais le texte proposé, et surtout pas le lien qu'il
              contient. Sans ce lien, votre publication ne peut pas être vérifiée et
              la journée ne sera pas payée.
            </span>
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><FaSpinner className="animate-spin text-[#115CF6]" size={24} /></div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-5">
            <h2 className="font-semibold text-red-900 mb-2">Profil incomplet</h2>
            <p className="text-sm text-red-800 mb-3">
              Les annonceurs ciblent leurs campagnes sur ces informations. Sans
              elles, aucune campagne ne peut vous être proposée.
            </p>
            <ul className="text-sm text-red-800 space-y-1 mb-4">
              {eligibility.missingFields.map((f) => (
                <li key={f}>• {FIELD_LABELS[f] ?? f}</li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/modifier-profil')}
              className="w-full bg-red-600 text-white rounded-xl py-3 font-medium"
            >
              Compléter mon profil
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-5 shadow-sm">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-4">
              <FaCheckCircle />
              <span>Votre profil est complet.</span>
            </div>

            <label className="block text-sm font-medium text-gray-800 mb-1">
              Combien de personnes voient votre statut WhatsApp en moyenne ?
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Cette estimation sert à vous proposer des campagnes adaptées. Elle sera
              remplacée par votre moyenne réelle après votre première campagne, alors
              inutile de la gonfler : une campagne acceptée puis non tenue fait
              baisser votre score de confiance.
            </p>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={declaredViews}
              onChange={(e) => setDeclaredViews(e.target.value)}
              placeholder="ex. 150"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#115CF6] focus:outline-none"
            />

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

            <button
              onClick={handleEnroll}
              disabled={submitting}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {submitting && <FaSpinner className="animate-spin" />}
              Devenir diffuseur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdsNetworkDiffuseurOnboarding;
