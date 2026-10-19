import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  ClipboardList,
  Flame,
  Package,
  PackageCheck,
  Search,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Field';
import { orderStatusMeta } from '@/components/ui/statusMeta';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/services/api';
import {
  ACTIVE_APPROVED_STATUSES,
  ORDER_PIPELINE,
  type Order,
  type OrderStatus,
} from '@/types';
import { cx, formatCurrency, formatDate, isoInDays } from '@/lib/utils';

type FilterKey = OrderStatus | 'ALL';

const FILTER_ORDER: FilterKey[] = [
  'ALL',
  'SUBMITTED',
  'QUANTITY_APPROVED',
  'PACKING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
];

const FILTER_LABEL: Record<FilterKey, string> = {
  ALL: 'All',
  SUBMITTED: 'New',
  QUANTITY_APPROVED: 'Approved',
  PACKING: 'Packing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

function forwardStatuses(status: OrderStatus): OrderStatus[] {
  const idx = ORDER_PIPELINE.indexOf(status);
  return idx < 0 ? [] : ORDER_PIPELINE.slice(idx + 1);
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function OrderQueuePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Approval modal state
  const [reviewing, setReviewing] = useState<Order | null>(null);
  const [approvals, setApprovals] = useState<Record<string, number>>({});
  const [freight, setFreight] = useState('0');
  const [eta, setEta] = useState('');

  const load = async () => {
    const list = await ordersApi.list();
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const kpis = useMemo(() => {
    const isPending = (o: Order) =>
      o.status !== 'DELIVERED' && o.status !== 'REJECTED' && o.status !== 'CANCELLED';
    return {
      newCount: orders.filter((o) => o.status === 'SUBMITTED').length,
      inProgress: orders.filter((o) => ACTIVE_APPROVED_STATUSES.includes(o.status)).length,
      delivered: orders.filter((o) => o.status === 'DELIVERED').length,
      pendingValue: orders.filter(isPending).reduce((s, o) => s + o.grandTotal, 0),
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = filter === 'ALL' || o.status === filter;
      const matchQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.retailerName.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [orders, filter, query]);

  const updateStatus = async (order: Order, target: OrderStatus) => {
    if (!user) return;
    setBusyId(order.id);
    try {
      await ordersApi.advanceStatus(order.id, target, user.uid);
      toast.success(`${order.orderNumber} → ${orderStatusMeta[target].label}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (order: Order) => {
    if (!user) return;
    setBusyId(order.id);
    try {
      await ordersApi.advanceStatus(order.id, 'REJECTED', user.uid, 'Rejected by staff');
      toast.info(`${order.orderNumber} rejected.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (order: Order) => {
    if (!user) return;
    if (
      !window.confirm(
        `Cancel ${order.orderNumber}? Reserved stock is released and any credit is reversed.`,
      )
    )
      return;
    setBusyId(order.id);
    try {
      await ordersApi.advanceStatus(order.id, 'CANCELLED', user.uid, 'Cancelled by staff');
      toast.info(`${order.orderNumber} cancelled.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const openReview = (order: Order) => {
    setReviewing(order);
    setApprovals(Object.fromEntries(order.items.map((i) => [i.productId, i.approvedQty])));
    setFreight(String(order.freightCharges || 0));
    setEta(order.expectedDeliveryDate?.slice(0, 10) ?? isoInDays(5).slice(0, 10));
  };

  const estimatedTotal = useMemo(() => {
    if (!reviewing) return 0;
    const sub = reviewing.items.reduce((s, i) => {
      const qty = approvals[i.productId] ?? i.approvedQty;
      return s + i.unitPrice * qty * (1 + i.taxRatePct / 100);
    }, 0);
    return sub + (parseFloat(freight) || 0);
  }, [reviewing, approvals, freight]);

  const confirmApprove = async () => {
    if (!reviewing || !user) return;
    setBusyId(reviewing.id);
    try {
      await ordersApi.approve(reviewing.id, {
        approvals,
        freightCharges: parseFloat(freight) || 0,
        expectedDeliveryDate: eta ? new Date(eta).toISOString() : undefined,
        by: user.uid,
      });
      toast.success(`${reviewing.orderNumber} approved.`);
      setReviewing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales & Orders"
        description="Process orders end to end — approve, fulfil and track delivery."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="New orders"
          value={kpis.newCount}
          tone="amber"
          icon={<ClipboardList className="h-5 w-5" />}
          hint="Awaiting approval"
        />
        <StatTile
          label="In progress"
          value={kpis.inProgress}
          tone="sky"
          icon={<Package className="h-5 w-5" />}
          hint="Approved → out for delivery"
        />
        <StatTile
          label="Delivered"
          value={kpis.delivered}
          tone="brand"
          icon={<PackageCheck className="h-5 w-5" />}
          hint="Completed orders"
        />
        <StatTile
          label="Pending value"
          value={formatCurrency(kpis.pendingValue)}
          tone="violet"
          icon={<Wallet className="h-5 w-5" />}
          hint="Yet to fulfil"
        />
      </div>

      {/* Search + filter chips */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <Input
            className="h-11 pl-9"
            placeholder="Search by order number or retailer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTER_ORDER.map((f) => {
            const active = filter === f;
            const n = counts[f] ?? 0;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cx(
                  'tap-transparent flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-surface-200 bg-white text-surface-600 hover:border-brand-300',
                )}
              >
                {FILTER_LABEL[f]}
                <span
                  className={cx(
                    'rounded-full px-1.5 text-[11px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500',
                  )}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <InlineLoader label="Loading orders…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No orders here"
          description="Try a different filter or search term."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => {
            const forward = forwardStatuses(o.status);
            const next = forward[0];
            const isBusy = busyId === o.id;
            const isPriority = ACTIVE_APPROVED_STATUSES.includes(o.status);
            const isNew = o.status === 'SUBMITTED';
            const itemCount = o.items.reduce((s, i) => s + i.approvedQty, 0);
            return (
              <Card
                key={o.id}
                className={cx(
                  'overflow-hidden',
                  isNew && 'ring-1 ring-amber-200',
                  isPriority && 'ring-1 ring-brand-200',
                )}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 border-b border-surface-100 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    {initials(o.retailerName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-surface-900">
                        {o.retailerName}
                      </h3>
                      {isPriority && (
                        <Flame className="h-4 w-4 shrink-0 text-amber-500" aria-label="Priority" />
                      )}
                    </div>
                    <p className="truncate text-xs text-surface-400">
                      {o.orderNumber} · {formatDate(o.createdAt)}
                      {o.rakeNumber ? ` · Rake ${o.rakeNumber}` : ''}
                    </p>
                  </div>
                  <Badge tone={orderStatusMeta[o.status].tone} dot>
                    {orderStatusMeta[o.status].label}
                  </Badge>
                </div>

                <CardBody className="space-y-3">
                  {/* Meta chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-100 px-2 py-1 font-medium text-surface-600">
                      {o.paymentMode === 'CREDIT' ? (
                        <Wallet className="h-3.5 w-3.5" />
                      ) : (
                        <Banknote className="h-3.5 w-3.5" />
                      )}
                      {o.paymentMode === 'CREDIT' ? 'Credit' : 'Cash'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-100 px-2 py-1 font-medium text-surface-600">
                      <Package className="h-3.5 w-3.5" />
                      {o.items.length} {o.items.length === 1 ? 'product' : 'products'} · {itemCount} units
                    </span>
                    {o.freightCharges > 0 && (
                      <span className="rounded-md bg-surface-100 px-2 py-1 font-medium text-surface-600">
                        Freight {formatCurrency(o.freightCharges)}
                      </span>
                    )}
                    {o.expectedDeliveryDate && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700">
                        <Truck className="h-3.5 w-3.5" />
                        ETA {formatDate(o.expectedDeliveryDate)}
                      </span>
                    )}
                    {o.challanNumber && (
                      <span className="rounded-md bg-surface-100 px-2 py-1 font-medium text-surface-600">
                        Challan {o.challanNumber}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-surface-100 rounded-lg border border-surface-100">
                    {o.items.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate font-medium text-surface-800">
                          {item.name}
                        </span>
                        <span className="shrink-0 text-xs text-surface-500">
                          {item.approvedQty} {item.unit} ·{' '}
                          <span className="font-semibold text-surface-700">
                            {formatCurrency(item.lineTotal + item.taxAmount)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer: total + actions */}
                  <div className="flex flex-col gap-3 border-t border-surface-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">
                        Order total
                      </p>
                      <p className="text-lg font-bold text-surface-900">
                        {formatCurrency(o.grandTotal)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isNew && (
                        <>
                          <Button size="sm" onClick={() => openReview(o)}>
                            <PackageCheck className="h-4 w-4" />
                            Review &amp; Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={isBusy}
                            onClick={() => reject(o)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {isPriority && next && (
                        <>
                          <Button size="sm" loading={isBusy} onClick={() => updateStatus(o, next)}>
                            <PackageCheck className="h-4 w-4" />
                            Move to {orderStatusMeta[next].label}
                          </Button>
                          {next !== 'DELIVERED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              loading={isBusy}
                              onClick={() => updateStatus(o, 'DELIVERED')}
                            >
                              Mark Delivered
                            </Button>
                          )}
                        </>
                      )}
                      {(isNew || isPriority) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          loading={isBusy}
                          onClick={() => cancel(o)}
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title={`Approve ${reviewing?.orderNumber ?? ''}`}
        subtitle="Confirm quantities, add freight and set the promised delivery date."
        footer={
          <>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button loading={busyId === reviewing?.id} onClick={confirmApprove}>
              Approve Order
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
              Approved quantities
            </p>
            {reviewing?.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-800">{item.name}</p>
                  <p className="text-xs text-surface-400">
                    Requested {item.requestedQty} {item.unit}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={approvals[item.productId] ?? item.approvedQty}
                  onChange={(e) =>
                    setApprovals((s) => ({
                      ...s,
                      [item.productId]: Math.max(0, parseInt(e.target.value, 10) || 0),
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-surface-100 pt-4">
            <Field label="Freight charges (₹)" htmlFor="freight">
              <Input
                id="freight"
                type="number"
                min={0}
                value={freight}
                onChange={(e) => setFreight(e.target.value)}
              />
            </Field>
            <Field label="Expected delivery date" htmlFor="eta">
              <Input
                id="eta"
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3 text-sm">
            <span className="font-medium text-surface-600">Estimated total (incl. freight)</span>
            <span className="font-bold text-surface-900">{formatCurrency(estimatedTotal)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type Tone = 'brand' | 'sky' | 'amber' | 'violet';
const TILE_TONES: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
};

function StatTile({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: Tone;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-surface-500">{label}</p>
        <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', TILE_TONES[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-surface-400">{hint}</p>}
    </div>
  );
}
