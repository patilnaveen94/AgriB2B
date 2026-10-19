import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-surface-200 bg-white shadow-card',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex items-start justify-between gap-3 border-b border-surface-100 px-5 py-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-surface-500">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('p-5', className)} {...rest} />;
}
