import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import type { BusinessInfo } from '@/types';
import { BRAND_FULL_NAME } from '@/config/brand';

const emptyBusiness: BusinessInfo = {
  businessName: '',
  ownerName: '',
  phone: '',
  taxId: '',
  fertilizerLicenseNo: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
};

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState<BusinessInfo>(emptyBusiness);
  const [licenseName, setLicenseName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBusiness((b) => ({ ...b, [key]: e.target.value }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('License file must be under 10 MB.');
      return;
    }
    setLicenseName(file.name);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!licenseName) {
      setError('Please upload your fertilizer license document.');
      return;
    }
    setLoading(true);
    try {
      // LIVE MODE: upload the file to Storage (licenses/{uid}/...) then create
      // the Auth user + Firestore profile. Demo mode records the filename only.
      await register({ email: email.trim(), business, licenseFileName: licenseName });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
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
          <h2 className="mt-5 text-2xl font-bold text-surface-900">
            Registration submitted
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-surface-500">
            Your account for <strong>{business.businessName}</strong> is now
            <strong> pending approval</strong>. Once our team verifies your fertilizer
            license, you'll receive an email to set your password and start ordering.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 hover:text-surface-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-6 flex items-center gap-2 lg:hidden">
        <img src="/balaji-logo.svg" alt="" className="h-10 w-10 rounded-xl" />
        <span className="text-lg font-bold text-surface-900">{BRAND_FULL_NAME}</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-surface-900">
        Retailer registration
      </h2>
      <p className="mt-1 text-sm text-surface-500">
        Tell us about your business. Accounts are activated after license verification.
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Business name" required>
          <Input value={business.businessName} onChange={set('businessName')} required
            placeholder="Green Valley Agro Center" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Owner / contact name" required>
            <Input value={business.ownerName} onChange={set('ownerName')} required
              placeholder="Suresh Patil" />
          </Field>
          <Field label="Phone" required>
            <Input value={business.phone} onChange={set('phone')} required
              placeholder="+91 90000 00000" />
          </Field>
        </div>

        <Field label="Email address" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required placeholder="you@business.com" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tax ID (GSTIN)" required>
            <Input value={business.taxId} onChange={set('taxId')} required
              placeholder="27BBBBB1111B2Z6" />
          </Field>
          <Field label="Fertilizer license no." required>
            <Input value={business.fertilizerLicenseNo} onChange={set('fertilizerLicenseNo')}
              required placeholder="MH-FERT-00000" />
          </Field>
        </div>

        <Field label="Address" required>
          <Input value={business.addressLine} onChange={set('addressLine')} required
            placeholder="Shop / plot, street" />
        </Field>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="City" required>
            <Input value={business.city} onChange={set('city')} required />
          </Field>
          <Field label="State" required>
            <Input value={business.state} onChange={set('state')} required />
          </Field>
          <Field label="Pincode" required>
            <Input value={business.pincode} onChange={set('pincode')} required />
          </Field>
        </div>

        {/* License upload */}
        <Field label="Fertilizer license document" required
          hint="PDF or image, up to 10 MB. Reviewed during approval.">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="focus-ring flex w-full items-center gap-3 rounded-lg border border-dashed border-surface-300 bg-surface-50 px-4 py-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-600 shadow-card">
              {licenseName ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-surface-800">
                {licenseName || 'Click to upload license'}
              </span>
              <span className="block text-xs text-surface-500">
                {licenseName ? 'File attached' : 'PDF, PNG or JPG'}
              </span>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFile}
          />
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Submit for approval
        </Button>
      </form>
    </AuthShell>
  );
}
