import type { Order } from '@/types';

export type ReportPeriod = '30' | '90' | '365';

export const reportPeriods: { value: ReportPeriod; label: string }[] = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export const isReportableOrder = (order: Order) =>
  order.status !== 'REJECTED' && order.status !== 'CANCELLED';

export function getReportWindow(period: ReportPeriod, now = new Date()) {
  const end = now.getTime();
  const start = end - Number(period) * 24 * 60 * 60 * 1000;
  return { start, end };
}

export function getOrdersInPeriod(
  orders: Order[],
  period: ReportPeriod,
  now = new Date(),
): Order[] {
  const { start, end } = getReportWindow(period, now);
  return orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    return (
      isReportableOrder(order) &&
      Number.isFinite(createdAt) &&
      createdAt >= start &&
      createdAt <= end
    );
  });
}

export function getPreviousPeriodOrders(
  orders: Order[],
  period: ReportPeriod,
  now = new Date(),
): Order[] {
  const { start, end } = getReportWindow(period, now);
  const previousStart = start - (end - start);
  return orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    return (
      isReportableOrder(order) &&
      Number.isFinite(createdAt) &&
      createdAt >= previousStart &&
      createdAt < start
    );
  });
}

export function getSpendTrend(orders: Order[], period: ReportPeriod) {
  const now = new Date();
  const monthCount = period === '90' ? 4 : 13;
  const buckets =
    period === '30'
      ? Array.from({ length: 5 }, (_, index) => ({
          key: `week-${index}`,
          label: `Week ${index + 1}`,
          start: now.getTime() - (5 - index) * 7 * 24 * 60 * 60 * 1000,
          end: now.getTime() - (4 - index) * 7 * 24 * 60 * 60 * 1000,
          total: 0,
        }))
      : Array.from({ length: monthCount }, (_, index) => {
          const month = new Date(
            now.getFullYear(),
            now.getMonth() - (monthCount - 1 - index),
            1,
          );
          const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
          return {
            key: `${month.getFullYear()}-${month.getMonth()}`,
            label: month.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
            start: month.getTime(),
            end: nextMonth.getTime(),
            total: 0,
          };
        });

  for (const order of orders) {
    const createdAt = new Date(order.createdAt).getTime();
    const bucket = buckets.find(
      (candidate) => createdAt >= candidate.start && createdAt < candidate.end,
    );
    if (bucket) bucket.total += order.grandTotal;
  }

  return buckets;
}

export function getOrderCategoryTotals(orders: Order[]) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      const total = item.lineTotal + item.taxAmount;
      totals.set(item.category, (totals.get(item.category) ?? 0) + total);
    }
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
