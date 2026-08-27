import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, HistoryIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { CountingNumber } from '../animate-ui/counting-number';
import { EXCHANGE_RATES } from '../../utils/balanceHelpers';

interface Props {
  /** Main balance, already in XAF/FCFA. */
  balance: number;
  /** Crypto balance, stored in USD. */
  usdBalance: number;
  /** Percent change vs last month. Omitted when there is no data to derive it. */
  monthDelta?: number | null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

function BalanceCard({ balance, usdBalance, monthDelta }: Props) {
  const navigate = useNavigate();

  // Both wallets, expressed in FCFA. Reuses the same constant the converter,
  // the chart and the wallet card stack use rather than hardcoding the rate.
  const cryptoAsXaf = usdBalance * EXCHANGE_RATES.CONVERSION.USD_TO_XAF;
  const total = balance + cryptoAsXaf;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      // White text on #92b127 is 2.46:1, below the WCAG AA threshold of 4.5:1.
      // Requested explicitly; text-shadow is not used, but weights are kept
      // heavy and sizes large to claw back what legibility is available.
      className="bg-balance text-white rounded-card p-4 relative"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-wide font-bold text-white/90">
          Vos soldes disponibles
        </p>
        <button
          onClick={() => navigate('/wallet')}
          aria-label="Voir le détail des soldes"
          className="size-8 grid place-items-center rounded-tile bg-white/20 text-white"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>

      <p className="mt-2 flex items-baseline gap-1.5">
        <CountingNumber
          number={total}
          decimalPlaces={0}
          thousandSeparator=" "
          className="text-3xl font-bold tabular-nums"
        />
        <span className="text-base font-semibold">FCFA</span>
      </p>

      {/* The two wallets behind that total. Crypto is shown in FCFA to match
          the headline, with its native USD kept alongside — USD is what is
          actually stored and what a crypto withdrawal moves. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/90">
        <span>Principal&nbsp;<span className="font-bold text-white">{fcfa(balance)}</span></span>
        <span aria-hidden className="text-white/50">·</span>
        <span>
          Crypto&nbsp;<span className="font-bold text-white">{fcfa(cryptoAsXaf)}</span>
          <span className="text-white/75">&nbsp;(${usdBalance.toFixed(2)})</span>
        </span>
      </div>

      {/* Rendered only when there is a real figure behind it — never hardcoded. */}
      {typeof monthDelta === 'number' && (
        <span className="mt-2 inline-block bg-white/20 rounded-pill px-2 py-0.5 text-xs font-semibold">
          {monthDelta >= 0 ? '+' : ''}
          {monthDelta.toFixed(1)}% ce mois
        </span>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigate('/wallet')}
          className="flex-1 bg-surface text-balance-strong font-bold rounded-pill py-2.5 flex items-center justify-center gap-1.5"
        >
          Retirer
          <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
        </button>
        <button
          onClick={() => navigate('/wallet')}
          className="flex-1 bg-balance-strong text-white font-semibold rounded-pill py-2.5 flex items-center justify-center gap-1.5"
        >
          <HugeiconsIcon icon={HistoryIcon} size={16} />
          Historique
        </button>
      </div>
    </motion.div>
  );
}

export default BalanceCard;
