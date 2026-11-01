import type {
  AccountStatus,
  OrderStatus,
  ProductCategory,
  RakeStatus,
  StaffFunction,
} from '@/types';
import type { BadgeTone } from './Badge';

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; tone: BadgeTone }
> = {
  SUBMITTED: { label: 'Submitted', tone: 'slate' },
  QUANTITY_APPROVED: { label: 'Qty Approved', tone: 'sky' },
  PACKING: { label: 'Packing', tone: 'violet' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', tone: 'amber' },
  DELIVERED: { label: 'Delivered', tone: 'brand' },
  REJECTED: { label: 'Rejected', tone: 'rose' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
};

export const accountStatusMeta: Record<
  AccountStatus,
  { label: string; tone: BadgeTone }
> = {
  PENDING_APPROVAL: { label: 'Pending', tone: 'amber' },
  ACTIVE: { label: 'Active', tone: 'brand' },
  REJECTED: { label: 'Rejected', tone: 'rose' },
  SUSPENDED: { label: 'Suspended', tone: 'slate' },
};

export const rakeStatusMeta: Record<RakeStatus, { label: string; tone: BadgeTone }> = {
  SCHEDULED: { label: 'Scheduled', tone: 'slate' },
  IN_TRANSIT: { label: 'In Transit', tone: 'amber' },
  ARRIVED: { label: 'Arrived', tone: 'brand' },
  ALLOCATED: { label: 'Allocated', tone: 'sky' },
};

export const categoryMeta: Record<
  ProductCategory,
  { label: string; tone: BadgeTone }
> = {
  FERTILIZER: { label: 'Fertilizer', tone: 'brand' },
  PESTICIDE: { label: 'Pesticide', tone: 'amber' },
  SEED: { label: 'Seed', tone: 'violet' },
};

export function categoryMetaFor(category: ProductCategory) {
  return (
    categoryMeta[category] ?? {
      label: category
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase()),
      tone: 'slate' as const,
    }
  );
}

export const staffFunctionLabel: Record<StaffFunction, string> = {
  godown_worker: 'Godown Worker',
  sales_executive: 'Sales Executive',
  super_admin: 'Super Admin',
};
