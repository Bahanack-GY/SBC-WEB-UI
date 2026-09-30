import { Sheet } from './Sheet';

/**
 * Asks before something that can't be undone. The old page stopped a running
 * campaign on a single tap of "Annuler" — a word it also used for "close".
 */
export function ConfirmSheet({
  open, title, message, confirmLabel, danger, busy, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-12 rounded-tile bg-surface-2 text-ink font-semibold">
            Retour
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 h-12 rounded-tile text-white font-semibold disabled:opacity-60 ${danger ? 'bg-danger' : 'bg-primary'}`}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-ink-2">{message}</p>
    </Sheet>
  );
}
