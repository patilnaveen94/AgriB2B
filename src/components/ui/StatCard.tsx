import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'brand',
  footer,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  tone?: 'brand' | 'sky' | 'amber' | 'rose' | 'violet';
  footer?: ReactNode;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  } as const;

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
          {label}
        </p>
        <span className={cx('flex h-9 w-9 items-center justify-center rounded-lg', tones[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-surface-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-surface-500">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
