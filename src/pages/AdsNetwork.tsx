import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Megaphone01Icon, Share08Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AdsScreen, AdsCardSkeleton, adsItemMotion } from '../components/ads/AdsScreen';
import { useAdsRoles } from '../hooks/useAdsRoles';
import illustrationNetwork from '../assets/icon/ads-share.jpg';

/**
 * SBC Ads Network — program entry point for signed-in users.
 *
 * Two roles, one account. The pattern follows Uber driver/rider and Airbnb
 * host/guest: a user may hold both, but each is entered through its own
 * onboarding and has its own dashboard. Nothing is merged — "how many views did
 * I deliver" and "how many views did I buy" are different questions.
 */
function AdsNetwork() {
    const navigate = useNavigate();
    const { roles, isResolved } = useAdsRoles();

    const cards = [
        {
            held: roles.isAnnonceur,
            title: 'annonceur',
            heldLabel: 'Mon espace annonceur',
            newLabel: 'Devenir annonceur',
            blurb: "Faites voir votre produit par des milliers de personnes. Vous ne payez que les vues uniques ; les rediffusions des jours 2 et 3 sont offertes.",
            icon: <HugeiconsIcon icon={Megaphone01Icon} size={22} />,
            className: 'bg-primary',
            to: roles.isAnnonceur ? '/ads-network/annonceur' : '/ads-network/annonceur/onboarding',
        },
        {
            held: roles.isDiffuseur,
            title: 'diffuseur',
            heldLabel: 'Mon espace diffuseur',
            newLabel: 'Devenir diffuseur',
            blurb: "Publiez les campagnes sur votre statut WhatsApp pendant 3 jours et gagnez selon le nombre de personnes qui les ont vues.",
            icon: <HugeiconsIcon icon={Share08Icon} size={20} />,
            className: 'bg-success',
            to: roles.isDiffuseur ? '/ads-network/diffuseur' : '/ads-network/diffuseur/onboarding',
        },
    ];

    return (
        <AdsScreen
            title="SBC Ads Network"
            subtitle="Les annonceurs financent des campagnes, les diffuseurs les publient sur WhatsApp et sont payés pour les vues vérifiées."
            illustration={illustrationNetwork}
        >
            {/* Until the roles are known, the cards would have to guess between
                "Devenir" and "Mon espace" — and guessing wrong is the flash. */}
            {!isResolved ? (
                <AdsCardSkeleton rows={2} />
            ) : (
                <div className="space-y-4">
                    {cards.map((card, i) => (
                        <motion.button
                            key={card.title}
                            onClick={() => navigate(card.to)}
                            {...adsItemMotion(i)}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full text-left text-white rounded-2xl p-5 ${card.className}`}
                        >
                            <div className="flex items-center gap-3">
                                {card.icon}
                                <span className="font-semibold text-lg">
                                    {card.held ? card.heldLabel : card.newLabel}
                                </span>
                                {card.held && (
                                    <span className="ml-auto flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-1">
                                        <HugeiconsIcon icon={Tick02Icon} size={10} /> Actif
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-white/85 mt-2">{card.blurb}</p>
                            <span className="inline-flex items-center gap-2 text-sm mt-3 font-medium">
                                {card.held ? 'Ouvrir' : 'Commencer'} <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                            </span>
                        </motion.button>
                    ))}
                </div>
            )}

            <div className="bg-white border border-border rounded-2xl p-4 mt-5 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Vous pouvez tenir les deux rôles.</p>
                <p>
                    Rien n'empêche d'être annonceur et diffuseur avec le même compte. Chaque
                    rôle a son propre espace et ses propres gains.
                </p>
            </div>
        </AdsScreen>
    );
}

export default AdsNetwork;
