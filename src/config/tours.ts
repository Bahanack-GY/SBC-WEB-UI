import type { Step } from 'react-joyride';

export const homeTour: Step[] = [
  {
    target: '.home-header',
    content: "Votre profil : statut d'abonnement, nombre de filleuls et lien d'affiliation à partager.",
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.balance-card',
    content: 'Vos soldes disponibles. Touchez pour retirer vos gains ou consulter votre historique.',
    placement: 'bottom',
  },
  {
    target: '.quick-actions',
    content: 'Vos services : formations, boutiques, publicité, contacts et SBC Love.',
    placement: 'top',
  },
  {
    target: '.leaderboard-preview',
    content: 'Le classement du mois : les meilleurs affiliés, tous niveaux confondus. Remis à zéro chaque mois.',
    placement: 'top',
  }
];

export const walletTour: Step[] = [
  {
    target: '.wallet-balance',
    content: 'Votre solde actuel et les options de dépôt/retrait.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.transaction-chart',
    content: 'Graphique de vos transactions sur la période sélectionnée.',
    placement: 'top',
  },
  {
    target: '.transaction-list',
    content: 'Liste détaillée de toutes vos transactions.',
    placement: 'top',
  },
  {
    target: '.filter-options',
    content: 'Filtrez vos transactions par type, date ou statut.',
    placement: 'bottom',
  }
];

export const marketplaceTour: Step[] = [
  {
    target: '.search-bar',
    content: 'Recherchez une boutique par son nom ou son adresse.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.category-filters',
    content: 'Filtrez par catégorie : digital, mode, cosmétiques, alimentation…',
    placement: 'bottom',
  },
  {
    target: '.product-grid',
    content: 'Les boutiques membres. Touchez une carte pour ouvrir la boutique.',
    placement: 'top',
  },
  {
    target: '.add-product',
    content: 'Ouvrez votre propre boutique SBC depuis ce bouton.',
    placement: 'left',
  }
];

export const profileTour: Step[] = [
  {
    target: '.profile-header',
    content: 'Vos informations personnelles et paramètres.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.profile-actions',
    content: 'Accédez à toutes les options de votre profil.',
    placement: 'bottom',
  },
  {
    target: '.referral-section',
    content: 'Gérez votre programme de parrainage et suivez vos filleuls.',
    placement: 'top',
  },
  {
    target: '.subscription-info',
    content: 'Informations sur votre abonnement actuel.',
    placement: 'bottom',
  }
];

export const partnerSpaceTour: Step[] = [
  {
    target: '.partner-stats',
    content: 'Vos statistiques de partenariat et performances.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.earnings-chart',
    content: 'Suivez vos gains et commissions.',
    placement: 'top',
  },
  {
    target: '.partner-transactions',
    content: 'Historique détaillé de vos transactions partenaires.',
    placement: 'top',
  },
  {
    target: '.partner-tools',
    content: 'Outils et ressources pour développer votre activité.',
    placement: 'bottom',
  }
];

export const contactsTour: Step[] = [
  {
    target: '.search-filters',
    content: 'Filtrez vos contacts selon différents critères.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.contact-list',
    content: 'Liste de vos contacts avec leurs informations.',
    placement: 'top',
  },
  {
    target: '.export-options',
    content: 'Exportez vos contacts dans différents formats.',
    placement: 'bottom',
  },
  {
    target: '.contact-actions',
    content: 'Actions rapides pour gérer vos contacts.',
    placement: 'bottom',
  }
];

export const adsPackTour: Step[] = [
  {
    target: '.pack-header',
    content: 'Découvrez nos différents packs publicitaires.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.basic-pack',
    content: 'Pack Basic : idéal pour démarrer.',
    placement: 'bottom',
  },
  {
    target: '.pro-pack',
    content: 'Pack Pro : pour une visibilité accrue.',
    placement: 'bottom',
  },
  {
    target: '.gold-pack',
    content: 'Pack Gold : notre offre la plus complète.',
    placement: 'bottom',
  }
];

export const subscriptionTour: Step[] = [
  {
    target: '.subscription-header',
    content: 'Choisissez l\'abonnement qui vous convient.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.classic-plan',
    content: 'Plan Classique : accès aux fonctionnalités essentielles.',
    placement: 'bottom',
  },
  {
    target: '.premium-plan',
    content: 'Plan Premium : toutes les fonctionnalités avancées.',
    placement: 'bottom',
  },
  {
    target: '.subscription-features',
    content: 'Découvrez les avantages de chaque plan.',
    placement: 'top',
  }
];

export const productManagementTour: Step[] = [
  {
    target: '.product-list',
    content: 'Gérez tous vos produits et services.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.add-product',
    content: 'Ajoutez de nouveaux produits ou services.',
    placement: 'bottom',
  },
  {
    target: '.product-filters',
    content: 'Filtrez et recherchez vos produits.',
    placement: 'bottom',
  },
  {
    target: '.product-actions',
    content: 'Modifiez ou supprimez vos produits.',
    placement: 'bottom',
  }
];

interface RelanceTourOptions {
  hasSmsAccess: boolean;
}

export function buildRelanceTour({ hasSmsAccess }: RelanceTourOptions): Step[] {
  const steps: Step[] = [
    {
      target: '[data-tour="balance-card"]',
      content: 'Vos crédits Relance : emails à gauche, SMS à droite. Chaque message envoyé en consomme un.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="recharge"]',
      content: 'Achetez des packs de crédits ici — pas d\'abonnement, vous payez à l\'usage.',
      placement: 'left',
    },
  ];

  if (hasSmsAccess) {
    steps.push({
      target: '[data-tour="sms-links"]',
      content: 'Configurez le lien à inclure dans chaque SMS automatique et manuel (Cameroun +237 uniquement).',
      placement: 'bottom',
    });
  }

  steps.push(
    {
      target: '.relance-status-card',
      content: 'Tableau de bord : état actuel, nombre de cibles actives et messages envoyés aujourd\'hui.',
      placement: 'bottom',
    },
    {
      target: '.relance-toggle-btn',
      content: 'Activez ou désactivez la Relance. Quand elle est active, vos filleuls non payés reçoivent des messages automatiques sur 7 jours.',
      placement: 'left',
    },
    {
      target: '.relance-controls',
      content: 'Mettez en pause l\'inscription de nouvelles cibles ou l\'envoi par canal sans tout désactiver.',
      placement: 'bottom',
    },
    {
      target: '.relance-stats',
      content: 'Suivez vos performances : cibles actives, messages envoyés, taux de livraison et conversions.',
      placement: 'top',
    },
    {
      target: '.relance-targets-btn',
      content: 'Consultez la liste de vos cibles actives avec leur progression dans la séquence de 7 jours.',
      placement: 'top',
    },
    {
      target: '.relance-campaigns',
      content: 'Les campagnes vous permettent de cibler des groupes spécifiques de filleuls avec des filtres (pays, date, etc.).',
      placement: 'top',
    },
    {
      target: '.relance-new-campaign',
      content: 'Créez une nouvelle campagne en définissant le canal, les filtres et les messages personnalisés.',
      placement: 'bottom',
    }
  );

  return steps;
}

/** @deprecated Use buildRelanceTour({ hasSmsAccess }) — kept temporarily for callers that import the static export. */
export const relanceTour: Step[] = buildRelanceTour({ hasSmsAccess: false });


/**
 * Fallback for pages with no tour of their own, and for pages whose own targets
 * are not on screen. Anchors to the bottom navigation, which is present app-wide.
 */
export const genericTour: Step[] = [
  {
    target: '.app-nav',
    content: "Voici votre barre de navigation : accueil, boutiques, portefeuille, statuts et messages.",
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '.tour-button',
    content: 'Ce bouton relance ce guide à tout moment, sur n\'importe quelle page.',
    placement: 'left',
  },
];
