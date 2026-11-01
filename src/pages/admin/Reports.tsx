import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, IndianRupee, ShoppingBag, Store, TrendingUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { categoryMetaFor } from '@/components/ui/statusMeta';
import { Button } from '@/components/ui/Button';
import { InlineLoader } from '@/components/ui/Loader';
import { Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ordersApi } from '@/services/api';
import { downloadCsv } from '@/lib/csv';
import {
  getOrderCategoryTotals,
  getOrdersInPeriod,
  getPreviousPeriodOrders,
  getSpendTrend,
  percentChange,
  reportPeriods,
  type ReportPeriod,
} from '@/lib/reports';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { Order } from '@/types';

export function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('90');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ordersApi
      .list()
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load reports.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reportOrders = useMemo(
    () => getOrdersInPeriod(orders, period),
    [orders, period],
  );
  const previousOrders = useMemo(
    () => getPreviousPeriodOrders(orders, period),
    [orders, period],
  );
  const revenue = reportOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const previousRevenue = previousOrders.reduce(
    (sum, order) => sum + order.grandTotal,
    0,
  );
  const revenueChange = percentChange(revenue, previousRevenue);
  const retailers = new Set(reportOrders.map((order) => order.retailerId)).size;
  const categories = getOrderCategoryTotals(reportOrders);
  const trend = getSpendTrend(reportOrders, period);
  const maxTrend = Math.max(1, ...trend.map((bucket) => bucket.total));
  const topRetailers = useMemo(() => {
    const totals = new Map<string, { name: string; orders: number; revenue: number }>();
    for (const order of reportOrders) {
      const current = totals.get(order.retailerId) ?? {
        name: order.retailerName,
        orders: 0,
        revenue: 0,
      };
      current.orders += 1;
      current.revenue += order.grandTotal;
      totals.set(order.retailerId, current);
    }
    return [...totals.entries()]
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [reportOrders]);

  const exportReport = () => {
    downloadCsv(
      `shri-balaji-order-value-report-${period}d.csv`,
      [
        'Order number',
        'Order date',
        'Retailer',
        'Status',
        'Payment mode',
        'Subtotal',
        'Tax',
        'Freight',
        'Total',
      ],
      reportOrders.map((order) => [
        order.orderNumber,
        formatDate(order.createdAt),
        order.retailerName,
        order.status,
        order.paymentMode,
        order.subTotal.toFixed(2),
        order.taxTotal.toFixed(2),
        order.freightCharges.toFixed(2),
        order.grandTotal.toFixed(2),
      ]),
    );
  };

  if (loading) return <InlineLoader label="Preparing business report…" />;

  if (error) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <p className="font-semibold text-rose-700">Report unavailable</p>
          <p className="text-sm text-surface-600">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business reports"
        description="Order value, retailer activity and product category mix for your business."
        actions={
          <>
            <Select
              aria-label="Report period"
              className="h-11 w-full sm:w-auto"
              value={period}
              onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            >
              {reportPeriods.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button className="w-full sm:w-auto" onClick={exportReport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />

      <section aria-label="Business report summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStat
          label="Order value"
          value={formatCurrency(revenue)}
          detail={
            revenueChange === null
              ? 'No previous-period orders'
              : `${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs previous period`
          }
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <ReportStat
          label="Orders"
          value={formatNumber(reportOrders.length)}
          detail="Active and fulfilled orders"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <ReportStat
          label="Retailers served"
          value={formatNumber(retailers)}
          detail="Unique buying accounts"
          icon={<Store className="h-5 w-5" />}
        />
        <ReportStat
          label="Average order"
          value={formatCurrency(reportOrders.length ? revenue / reportOrders.length : 0)}
          detail="Average order value"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </section>

      <Card>
        <CardHeader title="Order value trend" subtitle="Order totals over the selected period" />
        <CardBody>
          {reportOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-surface-500">
              No orders in this period yet.
            </p>
          ) : (
            <div className="no-scrollbar flex min-h-44 items-end gap-3 overflow-x-auto pb-2">
              {trend.map((bucket) => (
                <div
                  key={bucket.key}
                  className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[10px] font-medium text-surface-500">
                    {bucket.total ? formatCurrency(bucket.total) : '—'}
                  </span>
                  <div className="flex h-24 w-full items-end rounded-t-lg bg-brand-50">
                    <div
                      className="w-full rounded-t-lg bg-brand-500 transition-[height]"
                      style={{
                        height: `${bucket.total ? Math.max(8, (bucket.total / maxTrend) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-surface-600">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Order value by category" subtitle="Product category contribution" />
          <CardBody className="space-y-4">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-500">
                Category totals will appear after orders are placed.
              </p>
            ) : (
              categories.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-surface-700">
                      {categoryMetaFor(item.category).label}
                    </span>
                    <span className="font-semibold text-surface-900">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.max(3, (item.total / Math.max(revenue, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Leading retailers" subtitle="Ranked by order value" />
          <CardBody>
            {topRetailers.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-500">
                Retailer performance will appear after orders are placed.
              </p>
            ) : (
              <ul className="divide-y divide-surface-100">
                {topRetailers.map((retailer, index) => (
                  <li
                    key={retailer.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-surface-900">
                        {retailer.name}
                      </p>
                      <p className="text-xs text-surface-500">
                        {formatNumber(retailer.orders)} orders
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-surface-900">
                      {formatCurrency(retailer.revenue)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Report coverage" subtitle="How the figures are calculated" />
        <CardBody>
          <p className="text-sm leading-6 text-surface-600">
            Order value includes submitted, approved, packing, in-transit and delivered
            orders in the selected date range. Rejected and cancelled orders are
            excluded. Export CSV to review individual orders or share the report
            with your accounting team.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function ReportStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="p-4 sm:p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          {icon}
        </span>
        <p className="mt-3 break-words text-lg font-bold leading-tight text-surface-900 sm:text-2xl">
          {value}
        </p>
        <p className="mt-1 text-xs font-semibold text-surface-600">{label}</p>
        <p className="mt-1 text-[11px] leading-4 text-surface-500">{detail}</p>
      </CardBody>
    </Card>
  );
}
