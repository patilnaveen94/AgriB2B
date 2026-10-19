import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  Megaphone,
  PackageSearch,
  ShoppingCart,
  Train,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { orderStatusMeta, priceTierMeta } from '@/components/ui/statusMeta';
import { useAuth } from '@/context/AuthContext';
import { announcementsApi, ordersApi } from '@/services/api';
import { ORDER_PIPELINE, type Announcement, type Order } from '@/types';
import { cx, formatCurrency, formatDate } from '@/lib/utils';

const ACTIVE_STATUSES: Order['status'][] = [
  'SUBMITTED',
  'QUANTITY_APPROVED',
  'PACKING',
  'OUT_FOR_DELIVERY',
];

const SCHEME_GRADIENT: Record<string, string> = {
  SCHEME: 'from-brand-700 via-brand-600 to-brand-500',
  BANNER: 'from-amber-600 via-amber-500 to-orange-500',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [o, a] = await Promise.all([
        ordersApi.listByRetailer(user.uid),
        announcementsApi.listActive(),
      ]);
      if (!active) return;
      setOrders(o);
      setAnnouncements(a);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const retailer = user?.retailer;
  const limit = retailer?.creditLimit ?? 0;
  const outstanding = retailer?.outstandingBalance ?? 0;
  const available = Math.max(0, limit - outstanding);
  const utilization = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;
  const tier = retailer?.priceTier ?? 'STANDARD';

  const pending = orders.filter((o) => o.status === 'SUBMITTED').length;
  const inTransit = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const openOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const recent = orders.slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const quickActions = [
    { to: '/app/catalog', label: 'Shop', icon: PackageSearch },
    { to: '/app/rakes', label: 'Rakes', icon: Train },
    { to: '/app/orders', label: 'Orders', icon: ClipboardList },
    { to: '/app/cart', label: 'Cart', icon: ShoppingCart },
  ];

  if (loading) return <InlineLoader label="Loading your dashboard…" />;

  return (
    <div className="space-y-5">
      {/* Hero with credit meter */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-100">{greeting}</p>
            <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight">
              {user?.business.ownerName ?? 'Retailer'}
            </h2>
            <p className="mt-0.5 truncate text-sm text-brand-100/90">
              {user?.business.businessName} · {user?.business.city}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            {priceTierMeta[tier].label} Tier
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-brand-100">
            <span>Credit used</span>
            <span>
              {formatCurrency(outstanding)} / {formatCurrency(limit)}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className={cx(
                'h-full rounded-full',
                utilization > 85 ? 'bg-rose-300' : 'bg-white',
              )}
              style={{ width: `${Math.max(4, utilization)}%` }}
            />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-brand-100">Available</p>
              <p className="text-lg font-bold">{formatCurrency(available)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-brand-100">Open orders</p>
              <p className="text-lg font-bold">{openOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {quickActions.map((qa) => (
          <Link
            key={qa.to}
            to={qa.to}
            className="tap-transparent flex min-w-[84px] flex-1 flex-col items-center gap-2 rounded-2xl border border-surface-200 bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <qa.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold text-surface-700">{qa.label}</span>
          </Link>
        ))}
      </div>

      {/* Schemes carousel */}
      {announcements.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Megaphone className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-surface-900">Offers for you</h3>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={cx(
                  'flex min-w-[82%] snap-start flex-col rounded-2xl bg-gradient-to-br p-4 text-white shadow-card sm:min-w-[20rem]',
                  SCHEME_GRADIENT[a.type] ?? SCHEME_GRADIENT.SCHEME,
                )}
              >
                <span className="w-fit rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                  {a.type}
                </span>
                <p className="mt-2 text-base font-bold leading-snug">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-white/85">{a.body}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-white/80">Ends {formatDate(a.endsAt)}</span>
                  <Link
                    to="/app/catalog"
                    className="tap-transparent inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
                  >
                    Shop now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your orders */}
      <Card>
        <CardHeader
          title="Your Orders"
          subtitle="Track your recent purchases"
          icon={<ClipboardList className="h-4 w-4" />}
          action={
            <Link to="/app/orders">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
        <CardBody className="space-y-4">
          {/* Status summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryPill label="Pending" value={pending} tone="amber" />
            <SummaryPill label="In transit" value={inTransit} tone="sky" />
            <SummaryPill label="Delivered" value={delivered} tone="brand" />
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No orders yet"
              description="Browse the catalog and place your first order."
              action={
                <Link to="/app/catalog">
                  <Button size="sm">Browse Catalog</Button>
                </Link>
              }
            />
          ) : (
            <ul className="-mx-1 divide-y divide-surface-100">
              {recent.map((o) => {
                const idx = ORDER_PIPELINE.indexOf(o.status);
                const isActive = ACTIVE_STATUSES.includes(o.status);
                return (
                  <li key={o.id} className="px-1 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-surface-900">
                        {o.orderNumber}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-surface-900">
                        {formatCurrency(o.grandTotal)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={orderStatusMeta[o.status].tone} dot>
                        {orderStatusMeta[o.status].label}
                      </Badge>
                      <span className="text-xs text-surface-400">
                        {formatDate(o.createdAt)}
                      </span>
                    </div>
                    {isActive && idx >= 0 && (
                      <div className="mt-2 flex gap-1">
                        {ORDER_PIPELINE.map((s, i) => (
                          <div
                            key={s}
                            className={cx(
                              'h-1.5 flex-1 rounded-full',
                              i <= idx ? 'bg-brand-500' : 'bg-surface-200',
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

type Tone = 'amber' | 'sky' | 'brand';
const PILL_TONES: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-700',
  sky: 'bg-sky-50 text-sky-700',
  brand: 'bg-brand-50 text-brand-700',
};

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={cx('rounded-xl px-3 py-2.5 text-center', PILL_TONES[tone])}>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium">{label}</p>
    </div>
  );
}
