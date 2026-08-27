'use client';

import * as React from 'react';
import { useMotionValue, useSpring, useTransform, type SpringOptions } from 'motion/react';

/**
 * Animate UI — CountingNumber primitive, vendored.
 *
 * Adapted from animate-ui.com's registry/primitives/texts/counting-number for
 * this codebase:
 *   - the useIsInView hook and its inView* props are dropped; the balance this
 *     drives renders above the fold and is always visible. That removes a
 *     second vendored file.
 *   - upstream destructures `ref` from props (React 19 semantics). This app is
 *     on React 18, where props.ref is stripped and warns, so the prop is gone.
 *
 * ponytail: vendored rather than installed. Animate UI is copy-paste by design;
 * running `shadcn init` for one file would rewrite index.css and drag
 * React-19-era conventions into a React 18 tree.
 */
type CountingNumberProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  number: number;
  fromNumber?: number;
  padStart?: boolean;
  decimalSeparator?: string;
  /** Grouping separator for the integer part, e.g. ' ' for 662 101. */
  thousandSeparator?: string;
  decimalPlaces?: number;
  transition?: SpringOptions;
};

function CountingNumber({
  number,
  fromNumber = 0,
  padStart = false,
  decimalSeparator = '.',
  thousandSeparator = '',
  decimalPlaces = 0,
  transition = { stiffness: 90, damping: 50 },
  className,
  ...props
}: CountingNumberProps) {
  const numberStr = number.toString();
  const decimals =
    typeof decimalPlaces === 'number'
      ? decimalPlaces
      : numberStr.includes('.')
        ? (numberStr.split('.')[1]?.length ?? 0)
        : 0;

  const motionVal = useMotionValue(fromNumber);
  const springVal = useSpring(motionVal, transition);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    motionVal.set(number);
  }, [number, motionVal]);

  const display = useTransform(springVal, (latest: number) => {
    let formatted = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString();
    if (decimalSeparator !== '.') formatted = formatted.replace('.', decimalSeparator);

    if (padStart) {
      const [intPart, decPart] = formatted.split(decimalSeparator);
      const targetLen = Math.trunc(Math.abs(number)).toString().length;
      formatted = (intPart ?? '').padStart(targetLen, '0') + (decPart ? decimalSeparator + decPart : '');
    }

    // Group the integer part. A 6-figure balance is unreadable without it.
    if (thousandSeparator) {
      const [intPart, decPart] = formatted.split(decimalSeparator);
      const sign = intPart.startsWith('-') ? '-' : '';
      const digits = sign ? intPart.slice(1) : intPart;
      const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
      formatted = sign + grouped + (decPart ? decimalSeparator + decPart : '');
    }
    return formatted;
  });

  React.useEffect(() => {
    const unsubscribe = display.on('change', (v: string) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return (
    <span ref={ref} className={className} {...props}>
      {display.get()}
    </span>
  );
}

export { CountingNumber, type CountingNumberProps };
