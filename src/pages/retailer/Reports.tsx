import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, FileBarChart2, PackageCheck, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { categoryMetaFor } from '@/components/ui/statusMeta';
import { Button } from '@/components/ui/Button';
import { InlineLoader } from '@/components/ui/Loader';
import { Select } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
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

export function RetailerReportsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('90');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    ordersApi
      .listByRetailer(user.uid)
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
  }, [user]);

  const reportOrders = useMemo(
    () => getOrdersInPeriod(orders, period),
    [orders, period],
  );
  const previousOrders = useMemo(
    () => getPreviousPeriodOrders(orders, period),
    [orders, period],
  );
  const spend = reportOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const previousSpend = previousOrders.reduce(
    (sum, order) => sum + order.grandTotal,
    0,
  );
  const spendChange = percentChange(spend, previousSpend);
  const categories = getOrderCategoryTotals(reportOrders);
  const trend = getSpendTrend(reportOrders, period);
  const maxTrend = Math.max(1, ...trend.map((bucket) => bucket.total));
  const products = useMemo(() => {
    const totals = new Map<string, { quantity: number; spend: number }>();
    for (const order of reportOrders) {
      for (const item of order.items) {
        const current = totals.get(item.name) ?? { quantity: 0, spend: 0 };
        current.quantity += item.approvedQty;
        current.spend += item.lineTotal + item.taxAmount;
        totals.set(item.name, current);
      }
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [reportOrders]);

  const exportReport = () => {
    downloadCsv(
      `shri-balaji-purchase-report-${period}d.csv`,
      ['Order number', 'Order date', 'Status', 'Products', 'Payment mode', 'Total'],
      reportOrders.map((order) => [
        order.orderNumber,
        formatDate(order.createdAt),
        order.status,
        order.items.map((item) => `${item.name} (${item.approvedQty})`).join('; '),
        order.paymentMode,
        order.grandTotal.toFixed(2),
      ]),
    );
  };

  if (loading) return <InlineLoader label="Preparing your purchase report…" />;

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
        title="Purchase reports"
        description="Understand your orders, spending and the products you buy most."
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

      <section
        aria-label="Purchase summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <ReportStat
          label="Total order value"
          value={formatCurrency(spend)}
          detail={
            spendChange === null
              ? 'No previous-period orders'
              : `${spendChange >= 0 ? '+' : ''}${spendChange}% vs previous period`
          }
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <ReportStat
          label="Orders placed"
          value={formatNumber(reportOrders.length)}
          detail="In selected period"
          icon={<FileBarChart2 className="h-5 w-5" />}
        />
        <ReportStat
          label="Average order"
          value={formatCurrency(reportOrders.length ? spend / reportOrders.length : 0)}
          detail="Per order"
          icon={<PackageCheck className="h-5 w-5" />}
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
          <CardHeader title="Order value by category" subtitle="See where your orders go" />
          <CardBody className="space-y-4">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-500">
                Category totals will appear after your first order.
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
                        width: `${Math.max(3, (item.total / Math.max(spend, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Frequently ordered" subtitle="A quick guide for your next order" />
          <CardBody>
            {products.length === 0 ? (
              <p className="py-4 text-center text-sm text-surface-500">
                Your product insights will appear after your first order.
              </p>
            ) : (
              <ul className="divide-y divide-surface-100">
                {products.map((product) => (
                  <li
                    key={product.name}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-surface-800">
                      {product.name}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold text-surface-900">
                        {formatNumber(product.quantity)} units
                      </span>
                      <span className="block text-xs text-surface-500">
                        {formatCurrency(product.spend)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Orders in this report"
          subtitle={`${reportOrders.length} orders · showing latest ${Math.min(10, reportOrders.length)}`}
        />
        <CardBody className="space-y-3">
          {reportOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-surface-500">
              Try a longer reporting period to see more order history.
            </p>
          ) : (
            [...reportOrders]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 10)
              .map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-surface-900">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-xs text-surface-500">
                      {formatDate(order.createdAt)} · {order.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-surface-900">
                    {formatCurrency(order.grandTotal)}
                  </p>
                </div>
              ))
          )}
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
