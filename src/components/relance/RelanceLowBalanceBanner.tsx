import { useState, useEffect } from 'react';
import { FaTimes, FaEnvelope, FaSms } from 'react-icons/fa';

const EMAIL_LOW_THRESHOLD = 50;
const SMS_LOW_THRESHOLD = 20;

type Severity = 'empty' | 'low';
type ChannelKey = 'email' | 'sms';

interface BannerSpec {
  channel: ChannelKey;
  severity: Severity;
  balance: number;
}

interface RelanceLowBalanceBannerProps {
  emailBalance: number;
  smsBalance: number;
  hasSmsAccess: boolean;
  onRecharge: (channel: ChannelKey) => void;
}

function bucketKey(spec: BannerSpec): string {
  // The floor identifies the current "bucket" — once balance crosses the
  // threshold in either direction the key changes and the banner reappears.
  return `relance-banner-dismissed-${spec.channel}-${spec.severity === 'empty' ? '0' : `lt-${spec.channel === 'email' ? EMAIL_LOW_THRESHOLD : SMS_LOW_THRESHOLD}`}`;
}

function classifyChannel(balance: number, channel: ChannelKey): Severity | null {
  const threshold = channel === 'email' ? EMAIL_LOW_THRESHOLD : SMS_LOW_THRESHOLD;
  if (balance === 0) return 'empty';
  if (balance > 0 && balance <= threshold) return 'low';
  return null;
}

export default function RelanceLowBalanceBanner({
  emailBalance,
  smsBalance,
  hasSmsAccess,
  onRecharge,
}: RelanceLowBalanceBannerProps) {
  const banners: BannerSpec[] = [];
  const emailSeverity = classifyChannel(emailBalance, 'email');
  if (emailSeverity) banners.push({ channel: 'email', severity: emailSeverity, balance: emailBalance });
  if (hasSmsAccess) {
    const smsSeverity = classifyChannel(smsBalance, 'sms');
    if (smsSeverity) banners.push({ channel: 'sms', severity: smsSeverity, balance: smsBalance });
  }

  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const spec of banners) {
      const key = bucketKey(spec);
      if (localStorage.getItem(key) === '1') next[key] = true;
    }
    setDismissed(next);
  }, [emailBalance, smsBalance, hasSmsAccess]);

  const visible = banners.filter((spec) => !dismissed[bucketKey(spec)]);
  if (visible.length === 0) return null;

  const handleDismiss = (spec: BannerSpec) => {
    const key = bucketKey(spec);
    localStorage.setItem(key, '1');
    setDismissed((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div className="flex flex-col gap-2 mb-3">
      {visible.map((spec) => {
        const isEmpty = spec.severity === 'empty';
        const isEmail = spec.channel === 'email';
        const tone = isEmpty
          ? 'bg-red-50 border-red-300 text-red-800'
          : 'bg-amber-50 border-amber-300 text-amber-900';
        const accentBtn = isEmpty
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-amber-500 hover:bg-amber-600 text-white';
        const channelLabel = isEmail ? 'emails' : 'SMS';
        const message = isEmpty
          ? `Crédits ${channelLabel} épuisés.`
          : `Plus que ${spec.balance.toLocaleString('fr-FR')} crédits ${channelLabel}.`;
        return (
          <div
            key={bucketKey(spec)}
            role="alert"
            className={`flex items-center gap-2 p-3 border rounded-none sm:rounded-lg ${tone}`}
          >
            <div className="flex-shrink-0">
              {isEmail ? <FaEnvelope className="w-5 h-5" /> : <FaSms className="w-5 h-5" />}
            </div>
            <p className="flex-1 text-sm font-medium leading-tight">{message}</p>
            <button
              type="button"
              onClick={() => onRecharge(spec.channel)}
              className={`min-h-[44px] px-4 rounded-lg text-sm font-bold ${accentBtn}`}
            >
              Recharger
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(spec)}
              aria-label="Masquer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-current/70 hover:text-current"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
