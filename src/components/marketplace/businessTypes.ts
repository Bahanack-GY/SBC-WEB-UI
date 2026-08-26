import {
  Restaurant02Icon, TShirtIcon, PerfumeIcon, DiamondIcon,
  ComputerIcon, Store01Icon, CloudIcon,
} from '@hugeicons/core-free-icons';
import type { ShopBusinessType } from '../../services/shopDirectory';

/** The seven businessType values the directory can return. */
export const BUSINESS_TYPES: Record<ShopBusinessType, {
  label: string;
  icon: typeof Store01Icon;
  tint: string;
}> = {
  food:        { label: 'Alimentation', icon: Restaurant02Icon, tint: 'bg-accent-soft text-accent' },
  apparel:     { label: 'Mode',         icon: TShirtIcon,       tint: 'bg-primary-soft text-primary' },
  cosmetics:   { label: 'Cosmétiques',  icon: PerfumeIcon,      tint: 'bg-danger-soft text-danger' },
  jewelry:     { label: 'Bijoux',       icon: DiamondIcon,      tint: 'bg-accent-soft text-accent' },
  electronics: { label: 'Électronique', icon: ComputerIcon,     tint: 'bg-primary-soft text-primary' },
  general:     { label: 'Généraliste',  icon: Store01Icon,      tint: 'bg-surface-2 text-ink-2' },
  digital:     { label: 'Digital',      icon: CloudIcon,        tint: 'bg-success-soft text-success' },
};
