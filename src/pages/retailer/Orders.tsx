import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, ClipboardList, Package, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { orderStatusMeta } from '@/components/ui/statusMeta';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/services/api';
import { ORDER_PIPELINE, type Order } from '@/types';
import { cx, formatCurrency, formatDate } from '@/lib/utils';

type FilterKey = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CLOSED';

const ACTIVE_SET: Order['status'][] = [
  'SUBMITTED',
  'QUANTITY_APPROVED',
  'PACKING',
  'OUT_FOR_DELIVERY',
];

function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'REJECTED' || order.status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
        <Ban className="h-4 w-4" />
        {order.status === 'CANCELLED' ? 'This order was cancelled.' : 'This order was rejected.'}
      </div>
    );
  }
  const idx = ORDER_PIPELINE.indexOf(order.status);
  return (
    <div>
      <div className="flex gap-1">
        {ORDER_PIPELINE.map((s, i) => (
          <div
            key={s}
            className={cx(
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= idx ? 'bg-brand-500' : 'bg-surface-200',
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-brand-700">
          {orderStatusMeta[order.status].label}
        </span>
        <span className="text-surface-400">
          Step {idx + 1} of {ORDER_PIPELINE.length}
        </span>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const load = async () => {
    if (!user) return;
    const list = await ordersApi.listByRetailer(user.uid);
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const confirmReceived = async (order: Order) => {
    if (!user) return;
    setBusyId(order.id);
    try {
      await ordersApi.advanceStatus(order.id, 'DELIVERED', user.uid, 'Received by retailer');
      toast.success(`Marked ${order.orderNumber} as received. Thank you!`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the order.');
    } finally {
      setBusyId(null);
    }
  };

  const inFilter = (o: Order, f: FilterKey) => {
    if (f === 'ALL') return true;
    if (f === 'ACTIVE') return ACTIVE_SET.includes(o.status);
    if (f === 'DELIVERED') return o.status === 'DELIVERED';
    return o.status === 'REJECTED' || o.status === 'CANCELLED';
  };

  const counts = useMemo(
    () => ({
      ALL: orders.length,
      ACTIVE: orders.filter((o) => inFilter(o, 'ACTIVE')).length,
      DELIVERED: orders.filter((o) => inFilter(o, 'DELIVERED')).length,
      CLOSED: orders.filter((o) => inFilter(o, 'CLOSED')).length,
    }),
    [orders],
  );

  const filtered = orders.filter((o) => inFilter(o, filter));

  const chips: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'CLOSED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Order Tracker"
        description="Follow every order from placement to delivery."
      />

      {/* Filter chips */}
      {!loading && orders.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={cx(
                  'tap-transparent flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-surface-200 bg-white text-surface-600 hover:border-brand-300',
                )}
              >
                {c.label}
                <span
                  className={cx(
                    'rounded-full px-1.5 text-[11px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500',
                  )}
                >
                  {counts[c.key]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <InlineLoader label="Loading orders…" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No orders yet"
          description="Your placed orders will appear here."
          action={
            <Link to="/app/catalog">
              <Button>Browse Catalog</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Nothing here"
          description="No orders match this filter."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => {
            const itemUnits = o.items.reduce((s, i) => s + i.approvedQty, 0);
            return (
              <Card key={o.id} className="overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-surface-100 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Package className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-surface-900">{o.orderNumber}</p>
                    <p className="truncate text-xs text-surface-400">
                      {formatDate(o.createdAt)} · {o.paymentMode === 'CREDIT' ? 'Credit' : 'Cash'}
                      {o.rakeNumber ? ` · Rake ${o.rakeNumber}` : ''}
                    </p>
                  </div>
                  <Badge tone={orderStatusMeta[o.status].tone} dot>
                    {orderStatusMeta[o.status].label}
                  </Badge>
                </div>

                <CardBody className="space-y-4">
                  <OrderProgress order={o} />

                  {/* Items */}
                  <div className="divide-y divide-surface-100 rounded-lg border border-surface-100">
                    {o.items.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-surface-800">{item.name}</span>
                          <span className="ml-2 text-xs text-surface-400">
                            {item.approvedQty} {item.unit}
                            {item.approvedQty !== item.requestedQty && (
                              <span className="ml-1 text-amber-600">
                                (req {item.requestedQty})
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="shrink-0 font-medium text-surface-700">
                          {formatCurrency(item.lineTotal + item.taxAmount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="flex items-end justify-between border-t border-surface-100 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">
                        Total (incl. GST)
                      </p>
                      <p className="text-lg font-bold text-surface-900">
                        {formatCurrency(o.grandTotal)}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right text-xs text-surface-500">
                      <p>
                        {o.items.length} {o.items.length === 1 ? 'product' : 'products'} ·{' '}
                        {itemUnits} units
                      </p>
                      <p>
                        Freight:{' '}
                        <span className="font-medium text-surface-700">
                          {o.freightCharges > 0
                            ? formatCurrency(o.freightCharges)
                            : 'TBD at approval'}
                        </span>
                      </p>
                      {o.expectedDeliveryDate && (
                        <p className="flex items-center justify-end gap-1 text-brand-700">
                          <Truck className="h-3.5 w-3.5" />
                          ETA {formatDate(o.expectedDeliveryDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  {o.status === 'OUT_FOR_DELIVERY' && (
                    <div className="flex flex-col items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-brand-800">
                        Received your shipment? Confirm to close this order.
                      </span>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        loading={busyId === o.id}
                        onClick={() => confirmReceived(o)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Received
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
