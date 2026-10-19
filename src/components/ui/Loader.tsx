import { Loader2, Sprout } from 'lucide-react';
import { cx } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden />;
}

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-surface-100">
      <div className="relative">
        <Sprout className="h-10 w-10 text-brand-600" />
        <Spinner className="absolute -right-3 -top-2 h-4 w-4 text-brand-400" />
      </div>
      <p className="text-sm font-medium text-surface-500">{label}</p>
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-surface-500">
      <Spinner className="h-5 w-5" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
