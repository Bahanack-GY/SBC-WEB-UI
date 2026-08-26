import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, CheckmarkCircle02Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdsCardSkeleton, adsItemMotion } from '../components/ads/AdsScreen';
import { AdsHero, AdsStep, AdsWarning } from '../components/ads/AdsSteps';
import heroDiffuseur from '../assets/icon/ads-diffuseur.jpg';
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
        <AdsHero src={heroDiffuseur} alt="" />

        <h1 className="text-2xl font-bold text-gray-900 text-center">Devenir diffuseur</h1>
        <p className="text-gray-600 mt-2 text-center">
          Publiez sur votre statut WhatsApp. Soyez payé selon les vues réelles.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-5 text-center">
          {[
            { value: '3 jours', label: 'de publication' },
            { value: '24 h', label: 'pour le jour 1' },
            { value: '3 jours', label: 'de report' },
          ].map((stat, i) => (
            <motion.div key={stat.label} {...adsItemMotion(i)} className="bg-green-50 border border-border rounded-xl py-3">
              <p className="font-bold text-green-800">{stat.value}</p>
              <p className="text-[11px] text-green-700 leading-tight mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <h2 className="font-semibold text-gray-900 mt-6 mb-3">Comment ça marche</h2>
        <div className="space-y-3">
          <AdsStep index={1} title="Une campagne vous est proposée" accent="green">
Premier arrivé, premier servi.
          </AdsStep>
          <AdsStep index={2} title="Vous publiez le jour 1 sous 24 h" accent="green">
Sinon la place repart à quelqu'un d'autre.
          </AdsStep>
          <AdsStep index={3} title="Puis les jours 2 et 3" accent="green">
Une par jour, avec 3 jours de report si besoin.
          </AdsStep>
          <AdsStep index={4} title="Vous vérifiez chaque publication" accent="green">
Connectez WhatsApp pour que vos vues comptent.
          </AdsStep>
          <AdsStep index={5} title="Vous êtes payé" accent="green">
Sur votre solde publicitaire, transférable ensuite.
          </AdsStep>
        </div>

        <div className="mt-4">
          <AdsWarning>
            <p className="font-medium flex items-start gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 shrink-0" />
              Ne modifiez jamais le lien du texte.
            </p>
            <p className="mt-1">
              Sans lui, la journée ne peut pas être vérifiée ni payée. Vérifiez aussi
              votre publication dans les 24 h : un statut expiré est perdu.
            </p>
          </AdsWarning>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><HugeiconsIcon icon={Loading03Icon} className="animate-spin text-[#115CF6]" size={24} /></div>
        ) : eligibility && !eligibility.eligible ? (
          <div className="bg-red-50 border border-border rounded-2xl p-4 mt-5">
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
          <div className="bg-white border border-border rounded-2xl p-4 mt-5">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-4">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} />
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
              className="w-full border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#115CF6] focus:outline-none"
            />

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

            <button
              onClick={handleEnroll}
              disabled={submitting}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-medium mt-4 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {submitting && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
              Devenir diffuseur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdsNetworkDiffuseurOnboarding;
