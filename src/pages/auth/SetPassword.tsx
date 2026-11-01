import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, TriangleAlert } from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { BRAND_FULL_NAME } from '@/config/brand';

/**
 * "Set your password" screen reached from the approval email link.
 * In live mode the email carries an `oobCode` action code; here we accept an
 * `email` query param so the demo flow is testable end-to-end.
 */
export function SetPasswordPage() {
  const { setPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await setPassword(email.trim(), pw);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <h2 className="mt-5 text-2xl font-bold text-surface-900">Password set</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-surface-500">
            Your password has been created. You can now sign in and start placing orders.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-6 flex items-center gap-2 lg:hidden">
        <img src="/balaji-logo.svg" alt="" className="h-10 w-10 rounded-xl" />
        <span className="text-lg font-bold text-surface-900">{BRAND_FULL_NAME}</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-surface-900">
        Set your password
      </h2>
      <p className="mt-1 text-sm text-surface-500">
        Your account has been approved. Choose a password to activate access.
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email address" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required placeholder="you@business.com" />
        </Field>
        <Field label="New password" required hint="At least 8 characters.">
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            required placeholder="••••••••" autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" required>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            required placeholder="••••••••" autoComplete="new-password" />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          <KeyRound className="h-4 w-4" />
          Activate account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500">
        <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Return to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
