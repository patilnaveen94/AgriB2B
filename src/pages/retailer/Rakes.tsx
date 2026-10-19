import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PackageCheck, Train } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Field';
import { categoryMeta, rakeStatusMeta } from '@/components/ui/statusMeta';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ordersApi, rakesApi } from '@/services/api';
import type { OrderLineItem, PaymentMode, RakeArrival } from '@/types';
import {
  daysUntil,
  formatCurrency,
  formatNumber,
  grossUnit,
  round2,
} from '@/lib/utils';

/** Max lots orderable = limited by the least-available item (by ratio). */
function maxLotsFor(rake: RakeArrival): number {
  let max = Infinity;
  for (const it of rake.items) {
    const remaining = Math.max(0, it.quantity - it.bookedQty);
    max = Math.min(max, Math.floor(remaining / Math.max(1, it.ratio)));
  }
  return Number.isFinite(max) ? max : 0;
}

/** Inclusive price of one full lot (sum of ratio × gross unit price). */
function lotPriceFor(rake: RakeArrival): number {
  return round2(
    rake.items.reduce((s, it) => s + it.ratio * grossUnit(it.pricePerUnit, it.taxRatePct), 0),
  );
}

function etaLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d > 1) return `Arrives in ${d} days`;
  if (d === 1) return 'Arrives tomorrow';
  if (d === 0) return 'Arriving today';
  return 'Arrived';
}

export function RakesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [rakes, setRakes] = useState<RakeArrival[]>([]);
  const [loading, setLoading] = useState(true);

  const [ordering, setOrdering] = useState<RakeArrival | null>(null);
  const [lots, setLots] = useState(1);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CREDIT');
  const [placing, setPlacing] = useState(false);

  const load = async () => {
    const list = await rakesApi.upcoming();
    setRakes(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openOrder = (rake: RakeArrival) => {
    setOrdering(rake);
    setLots(1);
    setPaymentMode('CREDIT');
  };

  const preview = useMemo(() => {
    if (!ordering) return null;
    const items = ordering.items.map((it) => {
      const qty = it.ratio * lots;
      const lineSubTotal = round2(it.pricePerUnit * qty);
      const taxAmount = round2((lineSubTotal * it.taxRatePct) / 100);
      return { it, qty, lineSubTotal, taxAmount, lineTotal: round2(lineSubTotal + taxAmount) };
    });
    const subTotal = round2(items.reduce((s, l) => s + l.lineSubTotal, 0));
    const taxTotal = round2(items.reduce((s, l) => s + l.taxAmount, 0));
    return { items, subTotal, taxTotal, grandTotal: round2(subTotal + taxTotal) };
  }, [ordering, lots]);

  const available = user?.retailer
    ? Math.max(0, user.retailer.creditLimit - user.retailer.outstandingBalance)
    : 0;
  const creditExceeded =
    paymentMode === 'CREDIT' && !!preview && preview.grandTotal > available;

  const placeRakeOrder = async () => {
    if (!ordering || !user || !preview) return;
    if (lots < 1) {
      toast.error('Order at least one lot.');
      return;
    }
    if (creditExceeded) {
      toast.error('Order exceeds available credit. Use cash or fewer lots.');
      return;
    }
    setPlacing(true);
    try {
      const lineItems: OrderLineItem[] = preview.items.map(
        ({ it, qty, lineSubTotal, taxAmount }) => ({
          productId: it.productId,
          name: it.productName,
          category: it.category,
          unit: it.unit,
          hsnCode: it.hsnCode,
          taxRatePct: it.taxRatePct,
          unitPrice: it.pricePerUnit,
          discountPct: 0,
          requestedQty: qty,
          approvedQty: qty,
          lineTotal: lineSubTotal,
          taxAmount,
        }),
      );
      const order = await ordersApi.create({
        retailer: user,
        paymentMode,
        items: lineItems,
        rakeId: ordering.id,
        rakeNumber: ordering.rakeNumber,
      });
      toast.success(`Rake order ${order.orderNumber} submitted.`);
      setOrdering(null);
      navigate('/app/orders');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Intro banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Train className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Rake Pre-Booking</h2>
            <p className="mt-0.5 text-sm text-brand-100/90">
              Reserve wholesale lots from incoming rail shipments at special rake prices.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <InlineLoader label="Loading rakes…" />
      ) : rakes.length === 0 ? (
        <EmptyState
          icon={<Train className="h-6 w-6" />}
          title="No rakes open for booking"
          description="Check back soon — new rakes are published by the distributor."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rakes.map((r) => {
            const maxLots = maxLotsFor(r);
            const lotPrice = lotPriceFor(r);
            return (
              <Card key={r.id} className="overflow-hidden">
                {/* Header: route + status + ETA */}
                <div className="flex items-start gap-3 border-b border-surface-100 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Train className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-surface-900">{r.rakeNumber}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-surface-400">
                      {r.originStation}
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      {r.destinationGodown}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={rakeStatusMeta[r.status].tone} dot>
                      {rakeStatusMeta[r.status].label}
                    </Badge>
                    <span className="text-[11px] font-medium text-surface-400">
                      {etaLabel(r.expectedArrival)}
                    </span>
                  </div>
                </div>

                <CardBody className="space-y-3">
                  {r.notes && <p className="text-xs text-surface-500">{r.notes}</p>}

                  {/* Items with booking progress */}
                  <div className="space-y-3">
                    {r.items.map((it) => {
                      const remaining = Math.max(0, it.quantity - it.bookedQty);
                      const bookedPct = it.quantity
                        ? Math.min(100, Math.round((it.bookedQty / it.quantity) * 100))
                        : 0;
                      return (
                        <div key={it.productId}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <Badge tone={categoryMeta[it.category].tone}>×{it.ratio}</Badge>
                              <span className="truncate font-medium text-surface-800">
                                {it.productName}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs text-surface-500">
                              {formatCurrency(grossUnit(it.pricePerUnit, it.taxRatePct))}/
                              {it.unit}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100">
                              <div
                                className="h-full rounded-full bg-brand-400"
                                style={{ width: `${bookedPct}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[11px] text-surface-400">
                              {formatNumber(remaining)} {it.unit} left
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer: per-lot price + CTA */}
                  <div className="flex items-center justify-between border-t border-surface-100 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-surface-400">
                        Per lot · incl. GST
                      </p>
                      <p className="text-lg font-bold text-surface-900">
                        {formatCurrency(lotPrice)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[11px] text-surface-400">
                        {maxLots > 0 ? `${formatNumber(maxLots)} lots available` : 'Fully booked'}
                      </span>
                      <Button size="sm" disabled={maxLots < 1} onClick={() => openOrder(r)}>
                        <PackageCheck className="h-4 w-4" />
                        Pre-book
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!ordering}
        onClose={() => setOrdering(null)}
        title={`Pre-book ${ordering?.rakeNumber ?? ''}`}
        subtitle="Choose how many lots to order. Item quantities follow the rake ratio."
        footer={
          <>
            <Button variant="outline" onClick={() => setOrdering(null)}>
              Cancel
            </Button>
            <Button loading={placing} disabled={creditExceeded} onClick={placeRakeOrder}>
              Place Rake Order
            </Button>
          </>
        }
      >
        {ordering && preview && (
          <div className="space-y-4">
            <Field label="Number of lots" htmlFor="lots" required>
              <Input
                id="lots"
                type="number"
                min={1}
                max={maxLotsFor(ordering)}
                value={lots}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10) || 0;
                  setLots(Math.max(1, Math.min(maxLotsFor(ordering), n)));
                }}
              />
            </Field>

            <div className="divide-y divide-surface-100 rounded-lg border border-surface-100">
              {preview.items.map(({ it, qty, lineTotal }) => (
                <div
                  key={it.productId}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className="text-surface-700">
                    {it.productName}{' '}
                    <span className="text-xs text-surface-400">
                      {formatNumber(qty)} {it.unit}
                    </span>
                  </span>
                  <span className="font-medium text-surface-700">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <Field label="Payment Mode" htmlFor="rpay">
              <Select
                id="rpay"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              >
                <option value="CREDIT">Credit</option>
                <option value="CASH">Cash</option>
              </Select>
            </Field>

            <div className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-3">
              <span className="text-sm font-medium text-surface-600">
                Order total (incl. GST)
              </span>
              <span className="text-base font-bold text-surface-900">
                {formatCurrency(preview.grandTotal)}
              </span>
            </div>

            {paymentMode === 'CREDIT' && (
              <p
                className={
                  creditExceeded
                    ? 'text-xs font-medium text-rose-600'
                    : 'text-xs text-surface-500'
                }
              >
                Available credit: {formatCurrency(available)}
                {creditExceeded && ' — insufficient for this order.'}
              </p>
            )}
            <p className="text-xs text-surface-400">Freight is added by our team at approval.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
