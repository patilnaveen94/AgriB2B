import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  ShoppingCart,
  Train,
  Truck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  /** Compact label used by the mobile bottom tab bar. */
  shortLabel?: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

const retailerNav: NavSection[] = [
  {
    heading: 'Shop',
    items: [
      { to: '/app', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
      { to: '/app/catalog', label: 'Product Catalog', shortLabel: 'Shop', icon: PackageSearch },
      { to: '/app/rakes', label: 'Upcoming Rakes', shortLabel: 'Rakes', icon: Train },
      { to: '/app/cart', label: 'Cart & Checkout', shortLabel: 'Cart', icon: ShoppingCart },
    ],
  },
  {
    heading: 'Activity',
    items: [
      { to: '/app/orders', label: 'Order Tracker', shortLabel: 'Orders', icon: ClipboardList },
    ],
  },
];

const staffNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/admin', label: 'Analytics', shortLabel: 'Home', icon: BarChart3, end: true },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/admin/orders', label: 'Order Queue', shortLabel: 'Orders', icon: ClipboardList },
      { to: '/admin/inventory', label: 'Inventory & Batches', shortLabel: 'Stock', icon: Boxes },
      { to: '/admin/schemes', label: 'Schemes & Rakes', shortLabel: 'Schemes', icon: Megaphone },
    ],
  },
  {
    heading: 'Accounts',
    items: [
      { to: '/admin/approvals', label: 'Retailer Approvals', shortLabel: 'Approvals', icon: UserCheck },
    ],
  },
];

/** Sidebar navigation resolved per role. */
export function navFor(role: UserRole): NavSection[] {
  return role === 'retailer' ? retailerNav : staffNav;
}

export const SECONDARY_ICONS = { Truck };
