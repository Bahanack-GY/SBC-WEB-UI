import type { Step } from 'react-joyride';

export const homeTour: Step[] = [
  {
    target: '.home-header',
    content: 'Bienvenue sur votre tableau de bord ! Ici vous pouvez voir un aperçu de vos activités.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.balance-card',
    content: 'Votre solde actuel et les statistiques de vos transactions.',
    placement: 'bottom',
  },
  {
    target: '.recent-transactions',
    content: 'Vos transactions récentes et leur statut.',
    placement: 'top',
  },
  {
    target: '.quick-actions',
    content: 'Accès rapide aux fonctionnalités principales.',
    placement: 'bottom',
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
    content: 'Recherchez des produits ou services spécifiques.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.category-filters',
    content: 'Filtrez par catégorie pour trouver ce que vous cherchez.',
    placement: 'bottom',
  },
  {
    target: '.product-grid',
    content: 'Parcourez les produits et services disponibles.',
    placement: 'top',
  },
  {
    target: '.sort-options',
    content: 'Triez les résultats par prix, popularité ou date.',
    placement: 'bottom',
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

export const relanceTour: Step[] = [
  {
    target: '.relance-status-card',
    content: 'Voici le tableau de bord de votre Relance. Il affiche l\'état actuel, le nombre de cibles actives et les emails envoyés aujourd\'hui.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.relance-toggle-btn',
    content: 'Activez ou désactivez la Relance ici. Quand elle est active, vos filleuls non payés reçoivent des emails automatiques sur 7 jours.',
    placement: 'left',
  },
  {
    target: '.relance-controls',
    content: 'Contrôlez finement la Relance : mettez en pause l\'inscription de nouvelles cibles ou l\'envoi des emails sans tout désactiver.',
    placement: 'bottom',
  },
  {
    target: '.relance-stats',
    content: 'Suivez vos performances : cibles actives, emails envoyés, taux de livraison et progression jour par jour.',
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
    content: 'Créez une nouvelle campagne en définissant vos filtres et messages personnalisés.',
    placement: 'bottom',
  },
]; 