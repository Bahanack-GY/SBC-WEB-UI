import { Link } from 'react-router-dom';
import { RISK_HOLD_PATH } from './riskHold';

/** The way out of a withdrawal held by the security check: the identity check. */
export function RiskHoldLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to={RISK_HOLD_PATH} onClick={onNavigate} data-testid="risk-hold-link"
      className="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
      Vérifier mon identité
    </Link>
  );
}
