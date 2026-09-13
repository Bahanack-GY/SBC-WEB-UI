import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { WhatsappIcon, TelegramIcon, YoutubeIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

const CHANNELS = [
  {
    key: 'whatsapp', label: 'WhatsApp', subtitle: 'Canal officiel SBC',
    icon: WhatsappIcon, tint: 'bg-whatsapp',
    href: 'https://whatsapp.com/channel/0029Vav3mvCElah05C8QuT03',
  },
  {
    key: 'telegram', label: 'Telegram', subtitle: "Canal d'annonces · actus quotidiennes",
    icon: TelegramIcon, tint: 'bg-telegram',
    href: 'https://t.me/sniperbusinesscenterafrica',
  },
  {
    key: 'youtube', label: 'YouTube', subtitle: "Tutos & retours d'expérience",
    icon: YoutubeIcon, tint: 'bg-youtube',
    href: 'https://m.youtube.com/@SniperBusinessCenterSBC',
  },
];

/**
 * Third-party brand colours survive the flat rule here, but only as a small
 * circular tile — not as a full-bleed card background like before.
 */
function CommunityLinks() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-ink">Rejoignez-nous</h2>
      <div className="flex flex-col gap-2">
        {CHANNELS.map((c) => (
          <motion.a
            key={c.key}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.98 }}
            className="bg-surface border border-border rounded-card p-3 flex items-center gap-3"
          >
            <span className={`size-10 grid place-items-center rounded-pill text-white shrink-0 ${c.tint}`}>
              <HugeiconsIcon icon={c.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink text-sm">{c.label}</span>
              <span className="block text-xs text-ink-3 truncate">{c.subtitle}</span>
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
          </motion.a>
        ))}
      </div>
    </section>
  );
}

export default CommunityLinks;
