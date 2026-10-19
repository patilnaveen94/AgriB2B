import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Flame,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InlineLoader } from '@/components/ui/Loader';
import { orderStatusMeta } from '@/components/ui/statusMeta';
import { ordersApi, productsApi, usersApi } from '@/services/api';
import {
  ACTIVE_APPROVED_STATUSES,
  availableStock,
  type AppUser,
  type Order,
  type Product,
} from '@/types';
import { cx, formatCurrency, formatDate, formatNumber } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  FERTILIZER: '#059669',
  PESTICIDE: '#d97706',
  SEED: '#7c3aed',
};

const DEAD_STATUSES: Order['status'][] = ['REJECTED', 'CANCELLED'];
const isLive = (o: Order) => !DEAD_STATUSES.includes(o.status);
const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  useEffect(() => {
    let active = true;
    (async () => {
      const [o, p, u] = await Promise.all([
        ordersApi.list(),
        productsApi.list(),
        usersApi.list(),
      ]);
      if (!active) return;
      setOrders(o);
      setProducts(p);
      setUsers(u);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 6-month revenue + order trend buckets.
  const trend = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString('en-IN', { month: 'short' }),
        revenue: 0,
        orders: 0,
      };
    });
    const index = new Map(buckets.map((b) => [b.key, b]));
    for (const o of orders) {
      if (!isLive(o)) continue;
      const b = index.get(monthKey(o.createdAt));
      if (b) {
        b.revenue += o.grandTotal;
        b.orders += 1;
      }
    }
    return buckets;
  }, [orders]);

  const stats = useMemo(() => {
    const live = orders.filter(isLive);
    const revenue = live.reduce((s, o) => s + o.grandTotal, 0);
    const receivables = users.reduce(
      (s, u) => s + (u.retailer?.outstandingBalance ?? 0),
      0,
    );
    const pendingApprovals = users.filter(
      (u) => u.role === 'retailer' && u.status === 'PENDING_APPROVAL',
    ).length;
    const lowStock = products.filter((p) => availableStock(p) <= p.lowStockThreshold);

    const curMonth = trend[trend.length - 1];
    const prevMonth = trend[trend.length - 2];
    return {
      revenue,
      receivables,
      pendingApprovals,
      lowStock,
      totalOrders: orders.length,
      revenueDelta: pctDelta(curMonth?.revenue ?? 0, prevMonth?.revenue ?? 0),
      ordersDelta: pctDelta(curMonth?.orders ?? 0, prevMonth?.orders ?? 0),
    };
  }, [orders, products, users, trend]);

  const revenueByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const o of orders) {
      if (!isLive(o)) continue;
      for (const item of o.items) {
        totals[item.category] =
          (totals[item.category] ?? 0) + item.lineTotal + item.taxAmount;
      }
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [orders]);
  const categoryTotal = revenueByCategory.reduce((s, c) => s + c.value, 0);

  const topRetailers = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const o of orders) {
      if (!isLive(o)) continue;
      totals[o.retailerName] = (totals[o.retailerName] ?? 0) + o.grandTotal;
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders]);
  const topRetailerMax = topRetailers[0]?.value ?? 1;

  const priorityQueue = useMemo(
    () =>
      orders
        .filter((o) => ACTIVE_APPROVED_STATUSES.includes(o.status))
        .sort((a, b) =>
          (a.expectedDeliveryDate ?? '').localeCompare(b.expectedDeliveryDate ?? ''),
        )
        .slice(0, 6),
    [orders],
  );

  const recent = orders.slice(0, 6);

  // Revenue-trend module derived business metrics.
  const pick = (b: (typeof trend)[number]) => (metric === 'revenue' ? b.revenue : b.orders);
  const curBucket = trend[trend.length - 1];
  const prevBucket = trend[trend.length - 2];
  const curValue = curBucket ? pick(curBucket) : 0;
  const metricDelta = pctDelta(curValue, prevBucket ? pick(prevBucket) : 0);
  const periodTotal = trend.reduce((s, b) => s + pick(b), 0);
  const monthlyAvg = periodTotal / trend.length;
  const liveOrders = orders.filter(isLive).length;
  const avgOrderValue = liveOrders ? stats.revenue / liveOrders : 0;
  const trendColor = metric === 'revenue' ? '#059669' : '#0284c7';
  const fmtMetric = (v: number) =>
    metric === 'revenue' ? formatCurrency(v) : formatNumber(Math.round(v));

  if (loading) return <InlineLoader label="Building your dashboard…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live view of revenue, orders and fulfillment across the network."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 shadow-card">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            Live · updated just now
          </span>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="brand"
          delta={stats.revenueDelta}
          deltaLabel="vs last month"
        />
        <Kpi
          label="Total Orders"
          value={formatNumber(stats.totalOrders)}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="sky"
          delta={stats.ordersDelta}
          deltaLabel="vs last month"
        />
        <Kpi
          label="Receivables"
          value={formatCurrency(stats.receivables)}
          icon={<Wallet className="h-5 w-5" />}
          tone="violet"
          hint="Outstanding on credit"
        />
        <Kpi
          label="Approvals"
          value={formatNumber(stats.pendingApprovals)}
          icon={<UserCheck className="h-5 w-5" />}
          tone="amber"
          hint="Retailers awaiting review"
        />
        <Kpi
          label="Low Stock"
          value={formatNumber(stats.lowStock.length)}
          icon={<Boxes className="h-5 w-5" />}
          tone="rose"
          hint={`of ${products.length} SKUs`}
        />
      </div>

      {/* Revenue trend + category donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {/* Header: headline metric + delta + Revenue/Orders toggle */}
          <div className="flex flex-col gap-4 border-b border-surface-100 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">
                    {metric === 'revenue' ? 'Revenue Trend' : 'Order Trend'}
                  </h3>
                  <p className="text-xs text-surface-500">Last 6 months</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-surface-900">
                  {fmtMetric(curValue)}
                </span>
                {metricDelta !== null && (
                  <span
                    className={cx(
                      'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                      metricDelta >= 0
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-rose-50 text-rose-600',
                    )}
                  >
                    {metricDelta >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(metricDelta)}%
                  </span>
                )}
                <span className="text-xs text-surface-400">this month vs last</span>
              </div>
            </div>

            <div className="inline-flex self-start rounded-xl bg-surface-100 p-1 text-sm font-semibold">
              <button
                onClick={() => setMetric('revenue')}
                className={cx(
                  'tap-transparent rounded-lg px-4 py-1.5 transition-colors',
                  metric === 'revenue'
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700',
                )}
              >
                Revenue
              </button>
              <button
                onClick={() => setMetric('orders')}
                className={cx(
                  'tap-transparent rounded-lg px-4 py-1.5 transition-colors',
                  metric === 'orders'
                    ? 'bg-white text-surface-900 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700',
                )}
              >
                Orders
              </button>
            </div>
          </div>

          <CardBody className="space-y-4">
            {/* Business stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <MiniStat label="6-mo total" value={fmtMetric(periodTotal)} />
              <MiniStat label="Avg / month" value={fmtMetric(monthlyAvg)} />
              <MiniStat label="Avg order value" value={formatCurrency(avgOrderValue)} />
            </div>

            {/* Trend chart */}
            <div className="h-52 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(v: number) =>
                      metric === 'revenue'
                        ? v >= 1000
                          ? `₹${(v / 1000).toFixed(0)}k`
                          : `₹${v}`
                        : `${v}`
                    }
                  />
                  <Tooltip
                    formatter={(v: number) =>
                      metric === 'revenue'
                        ? [formatCurrency(v), 'Revenue']
                        : [`${formatNumber(v)} orders`, 'Orders']
                    }
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      boxShadow: '0 10px 25px -5px rgb(15 23 42 / 0.12)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={trendColor}
                    strokeWidth={2.5}
                    fill="url(#trendGrad)"
                    dot={{ r: 3, fill: trendColor, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Revenue by Category" subtitle="Share of total sales" />
          <CardBody>
            {revenueByCategory.length === 0 ? (
              <p className="flex h-64 items-center justify-center text-sm text-surface-400">
                No sales data yet
              </p>
            ) : (
              <>
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByCategory}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={64}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {revenueByCategory.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CATEGORY_COLORS[entry.name] ?? '#64748b'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] uppercase tracking-wide text-surface-400">
                      Total
                    </span>
                    <span className="text-lg font-bold text-surface-900">
                      {formatCurrency(categoryTotal)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {revenueByCategory.map((c) => (
                    <div key={c.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[c.name] ?? '#64748b' }}
                      />
                      <span className="flex-1 text-surface-600">{c.name}</span>
                      <span className="font-semibold text-surface-800">
                        {categoryTotal > 0
                          ? Math.round((c.value / categoryTotal) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Priority queue + right rail (low stock, top retailers) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                Priority Fulfillment Queue
              </span>
            }
            subtitle="Approved orders awaiting delivery, soonest ETA first"
          />
          <CardBody className="p-0">
            {priorityQueue.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-surface-400">
                No approved orders in progress.
              </p>
            ) : (
              <ul className="divide-y divide-surface-100">
                {priorityQueue.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {initials(o.retailerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-surface-900">
                        {o.retailerName}
                      </p>
                      <p className="truncate text-xs text-surface-400">
                        {o.orderNumber}
                        {o.rakeNumber ? ` · Rake ${o.rakeNumber}` : ''}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <span className="flex items-center justify-end gap-1 text-xs text-surface-500">
                        <Truck className="h-3.5 w-3.5" />
                        {o.expectedDeliveryDate
                          ? formatDate(o.expectedDeliveryDate)
                          : '—'}
                      </span>
                      <Badge tone={orderStatusMeta[o.status].tone} dot className="mt-1">
                        {orderStatusMeta[o.status].label}
                      </Badge>
                    </div>
                    <span className="w-24 text-right text-sm font-bold text-surface-900">
                      {formatCurrency(o.grandTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Low stock watchlist */}
          <Card>
            <CardHeader
              title="Low Stock Watchlist"
              subtitle="Restock before these run out"
              icon={<Package className="h-4 w-4" />}
            />
            <CardBody className="space-y-3">
              {stats.lowStock.length === 0 ? (
                <p className="py-4 text-center text-sm text-surface-400">
                  All products are well stocked.
                </p>
              ) : (
                stats.lowStock.slice(0, 5).map((p) => {
                  const avail = availableStock(p);
                  const pct = Math.min(
                    100,
                    Math.round((avail / Math.max(1, p.lowStockThreshold)) * 100),
                  );
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-surface-800">
                          {p.name}
                        </span>
                        <span className="ml-2 shrink-0 text-xs font-semibold text-rose-600">
                          {formatNumber(avail)} {p.unit}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                        <div
                          className={cx(
                            'h-full rounded-full',
                            pct < 50 ? 'bg-rose-500' : 'bg-amber-500',
                          )}
                          style={{ width: `${Math.max(6, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          {/* Top retailers */}
          <Card>
            <CardHeader title="Top Retailers" subtitle="By revenue" />
            <CardBody className="space-y-3">
              {topRetailers.length === 0 ? (
                <p className="py-4 text-center text-sm text-surface-400">No data yet.</p>
              ) : (
                topRetailers.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-bold text-surface-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-surface-800">
                          {r.name}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-surface-600">
                          {formatCurrency(r.value)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${(r.value / topRetailerMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader
          title="Recent Orders"
          subtitle="Latest activity across all retailers"
          action={
            <Button variant="ghost" size="sm" onClick={() => window.location.assign('/admin/orders')}>
              Open queue
            </Button>
          }
        />
        <CardBody className="p-0">
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-surface-400">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-surface-100">
              {recent.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-bold text-surface-500">
                    {initials(o.retailerName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-surface-900">
                      {o.retailerName}
                    </p>
                    <p className="truncate text-xs text-surface-400">
                      {o.orderNumber} · {formatDate(o.createdAt)} ·{' '}
                      {o.paymentMode === 'CREDIT' ? 'Credit' : 'Cash'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-surface-900">
                      {formatCurrency(o.grandTotal)}
                    </p>
                    <Badge tone={orderStatusMeta[o.status].tone} dot className="mt-1">
                      {orderStatusMeta[o.status].label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-100 bg-surface-50/70 p-3">
      <p className="text-[11px] text-surface-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-surface-900">{value}</p>
    </div>
  );
}

type KpiTone = 'brand' | 'sky' | 'violet' | 'amber' | 'rose';

const KPI_TONES: Record<KpiTone, string> = {
  brand: 'bg-brand-50 text-brand-600',
  sky: 'bg-sky-50 text-sky-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
};

function Kpi({
  label,
  value,
  icon,
  tone,
  delta,
  deltaLabel,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: KpiTone;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
}) {
  const showDelta = delta !== undefined && delta !== null;
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', KPI_TONES[tone])}>
          {icon}
        </span>
        {showDelta && (
          <span
            className={cx(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              positive ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-600',
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta as number)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-surface-500">{label}</p>
      {(hint || (showDelta && deltaLabel)) && (
        <p className="mt-1 text-[11px] text-surface-400">
          {showDelta && deltaLabel ? deltaLabel : hint}
        </p>
      )}
    </div>
  );
}
