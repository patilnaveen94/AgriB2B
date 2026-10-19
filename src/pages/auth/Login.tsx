import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Sprout, TriangleAlert } from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { DEMO_LOGINS, DEMO_PASSWORD } from '@/data/seed';
import { DEMO_MODE } from '@/lib/firebase';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectFor = (role: string) =>
    role === 'retailer' ? '/app' : '/admin';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from ?? redirectFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <AuthShell>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Sprout className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-surface-900">AgriFlow B2B</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-surface-900">Welcome back</h2>
      <p className="mt-1 text-sm text-surface-500">
        Sign in to your distributor account to continue.
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email address" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500">
        New retailer?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
          Create an account
        </Link>
      </p>

      {DEMO_MODE && (
        <div className="mt-8 rounded-xl border border-surface-200 bg-surface-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
            Demo accounts · password{' '}
            <code className="rounded bg-white px-1 py-0.5 text-brand-700">
              {DEMO_PASSWORD}
            </code>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_LOGINS.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => quickFill(d.email)}
                className="focus-ring rounded-lg border border-surface-200 bg-white px-3 py-2 text-left text-xs font-medium text-surface-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="block font-semibold text-surface-800">{d.label}</span>
                <span className="block truncate text-[11px] text-surface-400">
                  {d.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
