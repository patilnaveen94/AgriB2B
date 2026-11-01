import { useEffect, useState } from 'react';
import { Building2, Check, UserCheck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { accountStatusMeta } from '@/components/ui/statusMeta';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/services/api';
import type { AppUser } from '@/types';
import { formatDate } from '@/lib/utils';

export function ApprovalsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<AppUser | null>(null);
  const [rejecting, setRejecting] = useState<AppUser | null>(null);
  const [creditLimit, setCreditLimit] = useState('100000');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const list = await usersApi.pendingRetailers();
    setPending(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const confirmApprove = async () => {
    if (!approving || !user) return;
    setBusy(true);
    try {
      await usersApi.approve(approving.uid, {
        creditLimit: parseFloat(creditLimit) || 0,
        approvedBy: user.uid,
      });
      toast.success(`${approving.business.businessName} approved.`);
      setApproving(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!rejecting || !user) return;
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setBusy(true);
    try {
      await usersApi.reject(rejecting.uid, reason.trim(), user.uid);
      toast.info(`${rejecting.business.businessName} rejected.`);
      setRejecting(null);
      setReason('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Retailer Approvals"
        description="Review new retailer registrations and set credit terms."
        actions={<Badge tone="amber">{pending.length} pending</Badge>}
      />

      {loading ? (
        <InlineLoader label="Loading applications…" />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-6 w-6" />}
          title="No pending approvals"
          description="New retailer registrations will appear here for review."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pending.map((r) => (
            <Card key={r.uid}>
              <CardHeader
                title={r.business.businessName}
                subtitle={`${r.business.ownerName} · ${r.email}`}
                icon={<Building2 className="h-4 w-4" />}
                action={
                  <Badge tone={accountStatusMeta[r.status].tone} dot>
                    {accountStatusMeta[r.status].label}
                  </Badge>
                }
              />
              <CardBody className="space-y-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-surface-400">Phone</dt>
                    <dd className="text-surface-700">{r.business.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-surface-400">GSTIN</dt>
                    <dd className="text-surface-700">{r.business.taxId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-surface-400">Fertilizer License</dt>
                    <dd className="text-surface-700">
                      {r.business.fertilizerLicenseNo}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-surface-400">Location</dt>
                    <dd className="text-surface-700">
                      {r.business.city}, {r.business.state}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-surface-400">Applied</dt>
                    <dd className="text-surface-700">{formatDate(r.createdAt)}</dd>
                  </div>
                </dl>

                {r.retailer?.licenseFileName && (
                  <p className="rounded-lg bg-surface-50 px-3 py-2 text-xs text-surface-500">
                    📎 {r.retailer.licenseFileName}
                  </p>
                )}

                <div className="flex gap-2 border-t border-surface-100 pt-3">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setApproving(r);
                      setCreditLimit('100000');
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      setRejecting(r);
                      setReason('');
                    }}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!approving}
        onClose={() => setApproving(null)}
        title={`Approve ${approving?.business.businessName ?? ''}`}
        subtitle="Set a suitable credit limit for this retailer."
        footer={
          <>
            <Button variant="outline" onClick={() => setApproving(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={confirmApprove}>
              Confirm Approval
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Credit limit (₹)" htmlFor="cl" required>
            <Input
              id="cl"
              type="number"
              min={0}
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.business.businessName ?? ''}`}
        subtitle="The retailer will see this reason."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={confirmReject}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="reason" required>
          <Textarea
            id="reason"
            rows={3}
            placeholder="e.g. License document could not be verified."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
