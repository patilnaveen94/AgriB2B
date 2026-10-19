import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Select } from '@/components/ui/Field';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { ordersApi } from '@/services/api';
import { unitLabel, type OrderLineItem, type PaymentMode, type Product } from '@/types';
import { formatCurrency, grossUnit, round2 } from '@/lib/utils';

export function CartPage() {
  const { items, setQty, remove, clear, count } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CREDIT');
  const [placing, setPlacing] = useState(false);

  // Prices are GST-inclusive; we back-calculate the taxable value + GST.
  const lines = useMemo(
    () =>
      items.map(({ product, qty }) => {
        const unitPrice = product.basePrice; // net (pre-tax) stored price
        const lineSubTotal = round2(unitPrice * qty); // taxable value
        const taxAmount = round2((lineSubTotal * product.taxRatePct) / 100);
        const grossUnitPrice = grossUnit(product.basePrice, product.taxRatePct);
        return {
          product,
          qty,
          unitPrice,
          grossUnitPrice,
          lineSubTotal,
          taxAmount,
          lineGross: round2(lineSubTotal + taxAmount),
        };
      }),
    [items],
  );

  const subTotal = round2(lines.reduce((s, l) => s + l.lineSubTotal, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  const grandTotal = round2(subTotal + taxTotal);

  const available = user?.retailer
    ? Math.max(0, user.retailer.creditLimit - user.retailer.outstandingBalance)
    : 0;
  const creditExceeded = paymentMode === 'CREDIT' && grandTotal > available;

  const changeQty = (product: Product, next: number) => {
    const min = Math.max(1, product.minOrderQty || 1);
    setQty(product.id, next < min ? 0 : next);
  };

  const placeOrder = async () => {
    if (!user) return;
    if (creditExceeded) {
      toast.error('Order exceeds available credit. Use cash or reduce quantity.');
      return;
    }
    setPlacing(true);
    try {
      const lineItems: OrderLineItem[] = lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        category: l.product.category,
        unit: l.product.unit,
        hsnCode: l.product.hsnCode,
        taxRatePct: l.product.taxRatePct,
        unitPrice: l.unitPrice,
        discountPct: 0,
        requestedQty: l.qty,
        approvedQty: l.qty,
        lineTotal: l.lineSubTotal,
        taxAmount: l.taxAmount,
      }));
      const order = await ordersApi.create({
        retailer: user,
        paymentMode,
        items: lineItems,
      });
      clear();
      toast.success(`Order ${order.orderNumber} submitted for approval.`);
      navigate('/app/orders');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  if (count === 0) {
    return (
      <div>
        <PageHeader title="Cart & Checkout" description="Review your items before submitting." />
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Your cart is empty"
          description="Add products from the catalog to get started."
          action={
            <Link to="/app/catalog">
              <Button>Browse Catalog</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cart & Checkout"
        description={`${count} item${count === 1 ? '' : 's'} ready for order.`}
        actions={
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 className="h-4 w-4" />
            Clear cart
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {lines.map((l) => (
            <Card key={l.product.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-surface-900">
                    {l.product.name}
                  </h3>
                  <p className="text-xs text-surface-500">
                    {l.product.brand} · {unitLabel(l.product)} ·{' '}
                    {formatCurrency(l.grossUnitPrice)}/{l.product.unit} incl. GST
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-lg border border-surface-300">
                    <button
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-l-lg text-surface-600 hover:bg-surface-100"
                      onClick={() => changeQty(l.product, l.qty - (l.product.orderStep || 1))}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      className="h-9 w-14 border-x border-surface-200 text-center text-sm font-semibold text-surface-900 focus:outline-none"
                      value={l.qty}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        changeQty(l.product, Number.isNaN(n) ? 0 : n);
                      }}
                    />
                    <button
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-r-lg text-surface-600 hover:bg-surface-100"
                      onClick={() => changeQty(l.product, l.qty + (l.product.orderStep || 1))}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-24 text-right">
                    <p className="font-semibold text-surface-900">
                      {formatCurrency(l.lineGross)}
                    </p>
                    <p className="text-[11px] text-surface-400">incl. GST</p>
                  </div>

                  <button
                    className="focus-ring rounded-lg p-2 text-surface-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => remove(l.product.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader title="Order Summary" subtitle="Taxes calculated per line" />
            <CardBody className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-surface-600">
                  <span>Taxable value</span>
                  <span className="font-medium text-surface-900">
                    {formatCurrency(subTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-surface-600">
                  <span>GST (included)</span>
                  <span className="font-medium text-surface-900">
                    {formatCurrency(taxTotal)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-surface-100 pt-2 text-base">
                  <span className="font-semibold text-surface-900">Total (incl. GST)</span>
                  <span className="font-bold text-surface-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Freight charges are added by our team when the order is approved.</span>
              </div>

              <Field label="Payment Mode" htmlFor="pay">
                <Select
                  id="pay"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                >
                  <option value="CREDIT">Credit</option>
                  <option value="CASH">Cash</option>
                </Select>
              </Field>

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

              <Button
                className="hidden w-full lg:inline-flex"
                size="lg"
                loading={placing}
                disabled={creditExceeded}
                onClick={placeOrder}
              >
                Place Order
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sticky mobile checkout bar (sits above the bottom tab bar) */}
      <div className="pb-safe fixed inset-x-0 bottom-[68px] z-30 border-t border-surface-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-surface-400">Total</p>
            <p className="truncate text-lg font-bold text-surface-900">
              {formatCurrency(grandTotal)}
            </p>
          </div>
          <Button
            className="flex-1"
            size="lg"
            loading={placing}
            disabled={creditExceeded}
            onClick={placeOrder}
          >
            Place Order
          </Button>
        </div>
      </div>
    </div>
  );
}
