import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export type BadgeTone =
  | 'brand'
  | 'slate'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'violet'
  | 'emerald';

const tones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  slate: 'bg-surface-100 text-surface-600 ring-surface-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({
  tone = 'slate',
  children,
  className,
  dot,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
