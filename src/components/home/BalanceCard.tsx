import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, HistoryIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { CountingNumber } from '../animate-ui/counting-number';

interface Props {
  balance: number;
  usdBalance: number;
  /** Percent change vs last month. Omitted when there is no data to derive it. */
  monthDelta?: number | null;
}

function BalanceCard({ balance, usdBalance, monthDelta }: Props) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="bg-success text-white rounded-card p-4 relative"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-wide text-white/90 font-semibold">
          Vos soldes disponibles
        </p>
        <button
          onClick={() => navigate('/money')}
          aria-label="Voir les détails du solde"
          className="size-8 grid place-items-center rounded-tile bg-white/15"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>

      <p className="mt-2 flex items-baseline gap-1.5">
        <CountingNumber
          number={balance}
          decimalPlaces={2}
          decimalSeparator=","
          thousandSeparator=" "
          className="text-3xl font-bold tabular-nums"
        />
        <span className="text-base font-semibold">FCFA</span>
      </p>
      {usdBalance > 0 && (
        <p className="text-sm text-white/80">${usdBalance.toFixed(2)} USD</p>
      )}

      {/* Rendered only when there is a real figure behind it — never hardcoded. */}
      {typeof monthDelta === 'number' && (
        <span className="mt-2 inline-block bg-white/15 rounded-pill px-2 py-0.5 text-xs font-medium">
          {monthDelta >= 0 ? '+' : ''}
          {monthDelta.toFixed(1)}% ce mois
        </span>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigate('/wallet')}
          className="flex-1 bg-white text-success font-semibold rounded-pill py-2.5 flex items-center justify-center gap-1.5"
        >
          Retirer
          <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
        </button>
        <button
          onClick={() => navigate('/wallet')}
          className="flex-1 bg-success-strong text-white font-semibold rounded-pill py-2.5 flex items-center justify-center gap-1.5"
        >
          <HugeiconsIcon icon={HistoryIcon} size={16} />
          Historique
        </button>
      </div>
    </motion.div>
  );
}

export default BalanceCard;
