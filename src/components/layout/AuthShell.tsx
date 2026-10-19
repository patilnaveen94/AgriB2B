import type { ReactNode } from 'react';
import { Leaf, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';

/** Split-screen shell used by all authentication screens. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-100">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Sprout className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight">AgriFlow B2B</p>
            <p className="text-xs text-brand-200">Wholesale Distribution Platform</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Fertilizers, pesticides & seeds — sourced, priced and delivered at scale.
          </h1>
          <p className="mt-4 text-brand-100">
            Real-time batch stock, volume-tier pricing, credit management and rake
            allocation, all in one distributor-grade portal.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: TrendingUp, text: 'Live credit limits & outstanding balance' },
              { icon: Leaf, text: 'Batch-level inventory with expiry tracking' },
              { icon: ShieldCheck, text: 'Role-based access for staff & retailers' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">
          © {new Date().getFullYear()} AgriFlow. Built for agri-input distributors.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
