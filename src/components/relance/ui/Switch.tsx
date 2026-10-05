import { motion } from 'motion/react';

/** On/off switch. Green means on — the old page used colour for "stopped". */
export function Switch({
  checked, onChange, label, disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill transition-colors disabled:opacity-50 ${checked ? 'bg-success' : 'bg-ink-3/40'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="size-5 rounded-pill bg-surface"
        style={{ marginLeft: checked ? 24 : 4 }}
      />
    </button>
  );
}
