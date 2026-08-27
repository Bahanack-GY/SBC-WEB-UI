import { useState } from 'react';
import { EXCHANGE_RATES } from '../../utils/balanceHelpers';
import '../../styles/wallet-stack.css';

interface Props {
  /** Main balance, already in XAF/FCFA. */
  balanceXaf: number;
  /** Crypto balance, stored in USD. */
  balanceUsd: number;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

/**
 * The two SBC wallets as a card stack in a pocket.
 *
 * There are exactly two: the main FCFA balance (mobile-money withdrawals) and
 * the crypto balance (stored in USD, crypto withdrawals). Both are shown in
 * FCFA, and the pocket total is their sum in FCFA.
 *
 * The crypto card keeps its native USD figure as a subline. Converting is a
 * display convenience; USD is what is actually stored and what a crypto
 * withdrawal moves, so hiding it would misrepresent the balance.
 *
 * Conversion reuses EXCHANGE_RATES.CONVERSION.USD_TO_XAF (the same constant the
 * converter and the chart use) rather than hardcoding 500 again.
 */
function WalletCardStack({ balanceXaf, balanceUsd }: Props) {
  const [open, setOpen] = useState(false);

  const cryptoAsXaf = balanceUsd * EXCHANGE_RATES.CONVERSION.USD_TO_XAF;
  const totalXaf = balanceXaf + cryptoAsXaf;

  return (
    <div
      className="wstack"
      data-open={open}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={open ? 'Masquer les soldes' : 'Afficher les soldes'}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }}
    >
      <div className="wstack-back" />

      {/* Crypto — sits behind */}
      <div className="wstack-card wstack-card--crypto">
        <div className="wstack-card-inner">
          {/* Name + amount live in the TOP strip: it is the only part of the
              card that stays above the pocket lip when the stack fans out. */}
          <div className="wstack-card-top">
            <div>
              <span className="wstack-label">Crypto</span>
              {/* USD sits INLINE with the FCFA figure, not under it: the card
                  below overlaps this one, so a second line falls behind it.
                  USD is what is actually stored and what a crypto withdrawal
                  moves — the FCFA figure is a converted view. */}
              <span className="wstack-amount-row">
                <span className="wstack-amount">{open ? fcfa(cryptoAsXaf) : '•••••'}</span>
                <span className="wstack-native">{open ? `$${balanceUsd.toFixed(2)}` : '••••'}</span>
              </span>
            </div>
            <div className="wstack-chip" />
          </div>
          <div className="wstack-card-bottom">
            <span className="wstack-sub">Retrait crypto</span>
          </div>
        </div>
      </div>

      {/* Main FCFA balance — front */}
      <div className="wstack-card wstack-card--main">
        <div className="wstack-card-inner">
          <div className="wstack-card-top">
            <div>
              <span className="wstack-label">Solde principal</span>
              <span className="wstack-amount">{open ? fcfa(balanceXaf) : '•••••'}</span>
            </div>
            <div className="wstack-chip" />
          </div>
          <div className="wstack-card-bottom">
            <span className="wstack-sub">Mobile Money</span>
            <span className="wstack-sub">FCFA</span>
          </div>
        </div>
      </div>

      <div className="wstack-pocket">
        <svg viewBox="0 0 280 160" fill="none" width="280" height="160">
          <path
            d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z"
            fill="var(--color-ink)"
          />
          <path
            d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z"
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
        </svg>

        <div className="wstack-pocket-content">
          <div className="wstack-total-slot">
            <div className="wstack-total-masked" aria-hidden>••••••</div>
            <div className="wstack-total-real">{fcfa(totalXaf)}</div>
          </div>
          <div className="wstack-caption">Solde total</div>
          <div className="wstack-eye" aria-hidden>
            <svg className="wstack-eye-slash" viewBox="0 0 24 24" width="20" height="20">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
            <svg className="wstack-eye-open" viewBox="0 0 24 24" width="20" height="20">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletCardStack;
