import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

const NUMBER = new Intl.NumberFormat('fr-FR');

/**
 * A number that counts up to its value, and from its old value to a new one.
 * Users who ask for less motion get the final number straight away.
 */
export function CountUp({ value, className, duration = 0.9 }: { value: number; className?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setShown(Math.round(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce, duration]);

  return <span className={`tabular-nums ${className ?? ''}`}>{NUMBER.format(shown)}</span>;
}
