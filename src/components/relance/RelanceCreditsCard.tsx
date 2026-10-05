import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, SmsCodeIcon } from '@hugeicons/core-free-icons';
import { CountUp } from './ui/CountUp';
import { Switch } from './ui/Switch';
import { filleulsCovered, filleulsCoveredBySms } from '../../utils/relance';

/**
 * Credits in the unit a parrain thinks in — filleuls, not messages. "3 000
 * crédits" means nothing on its own; "≈ 428 filleuls relancés" does.
 */
export function RelanceCreditsCard({
  emailBalance, smsBalance, onRecharge, sms,
}: {
  emailBalance: number;
  smsBalance: number;
  onRecharge: () => void;
  /**
   * SMS controls, for Cameroonian parrains only (Rufus). Without them the app
   * had no way to start SMS relance: the switch was an admin-only flag.
   */
  sms?: { enabled: boolean; busy?: boolean; onToggle: (next: boolean) => void; onLinks: () => void };
}) {
  return (
    <section aria-label="Vos crédits" className="bg-surface border border-border rounded-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">Vos crédits</h2>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRecharge}
          className="h-9 px-4 rounded-pill bg-primary text-white text-sm font-semibold"
        >
          Recharger
        </motion.button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="size-10 grid place-items-center rounded-tile bg-primary-soft text-primary shrink-0">
          <HugeiconsIcon icon={Mail01Icon} size={20} />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-bold text-ink leading-tight">
            <CountUp value={emailBalance} /> <span className="text-sm font-medium text-ink-2">emails</span>
          </div>
          <div className="text-xs text-ink-3">
            ≈ <CountUp value={filleulsCovered(emailBalance)} /> filleuls
          </div>
        </div>
      </div>

      {(sms || smsBalance > 0) && (
        <div className="mt-3 flex items-center gap-3">
          <span className="size-10 grid place-items-center rounded-tile bg-success-soft text-success shrink-0">
            <HugeiconsIcon icon={SmsCodeIcon} size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-ink leading-tight">
              <CountUp value={smsBalance} /> <span className="text-sm font-medium text-ink-2">SMS</span>
            </div>
            <div className="text-xs text-ink-3">
              {sms && smsBalance === 0
                ? <button onClick={onRecharge} className="text-primary font-semibold">Acheter des SMS</button>
                : <>≈ <CountUp value={filleulsCoveredBySms(smsBalance)} /> filleuls · numéros +237</>}
              {sms?.enabled && <> · <button onClick={sms.onLinks} className="text-primary font-semibold">Mes liens</button></>}
            </div>
          </div>
          {sms && (
            <Switch
              checked={sms.enabled}
              onChange={sms.onToggle}
              disabled={sms.busy || (!sms.enabled && smsBalance === 0)}
              label="Relance par SMS"
            />
          )}
        </div>
      )}
    </section>
  );
}
