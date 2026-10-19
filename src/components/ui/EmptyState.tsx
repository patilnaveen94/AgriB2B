import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-300 bg-surface-50/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-surface-400 shadow-card">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-surface-700">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-surface-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
