/**
 * Domain model for the AgriFlow B2B wholesale distribution platform.
 *
 * These types mirror the Firestore document shapes documented in
 * `docs/FIRESTORE_SCHEMA.md`. Timestamps are represented as ISO-8601 strings
 * at the application layer; the data-service converts to/from Firestore
 * `Timestamp` when running in live mode.
 */

// ---------------------------------------------------------------------------
// Roles & Auth
// ---------------------------------------------------------------------------

export type UserRole = 'super_admin' | 'staff' | 'retailer';

/** Finer-grained staff functions layered on top of the `staff` role claim. */
export type StaffFunction = 'godown_worker' | 'sales_executive' | 'super_admin';

export type AccountStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED';

/** Shape of the custom claims we attach to the Firebase Auth token. */
export interface AuthClaims {
  role: UserRole;
  staffFunction?: StaffFunction;
  status?: AccountStatus;
}

// ---------------------------------------------------------------------------
// Product categories
// ---------------------------------------------------------------------------

export type ProductCategory = 'FERTILIZER' | 'PESTICIDE' | 'SEED';

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'FERTILIZER', label: 'Fertilizer' },
  { value: 'PESTICIDE', label: 'Pesticide' },
  { value: 'SEED', label: 'Seed' },
];

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface BusinessInfo {
  businessName: string;
  ownerName: string;
  phone: string;
  taxId: string; // GSTIN / VAT
  fertilizerLicenseNo: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RetailerProfile {
  creditLimit: number;
  outstandingBalance: number;
  /** Named price tier that maps to volume discount schedules. */
  priceTier: PriceTier;
  licenseDocUrl?: string;
  licenseFileName?: string;
}

export type PriceTier = 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  staffFunction?: StaffFunction;
  status: AccountStatus;
  business: BusinessInfo;
  retailer?: RetailerProfile;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

// ---------------------------------------------------------------------------
// Products & Batches
// ---------------------------------------------------------------------------

export interface VolumeTier {
  /** Minimum quantity (inclusive) for this tier to apply. */
  minQty: number;
  /** Discount percentage applied to the base price. */
  discountPct: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  /** Sale/order unit label the customer buys in, e.g. "Bag", "Box", "MT". */
  unit: string;
  /** Content per sale unit — 50 for a 50 kg bag, 12 for a 12 L box, 1000 for an MT. */
  packSize: number;
  /** Measure of the pack content: kg, L, g, ml, MT, etc. */
  packUnit: string;
  /** Minimum orderable quantity, in sale units. */
  minOrderQty: number;
  /** Quantity increment when ordering, in sale units. */
  orderStep: number;
  hsnCode: string;
  taxRatePct: number; // GST %
  basePrice: number; // per sale unit, pre-tax
  /** Product image — a hosted URL in live mode, or a data-URL in demo mode. */
  imageUrl?: string;
  volumeTiers: VolumeTier[];
  /** Physical quantity on hand across all batches, incl. manual adjustment. */
  totalStock: number;
  /** Quantity reserved by approved-but-not-yet-delivered orders. */
  heldStock: number;
  /** Manual stock correction staff apply on top of batch totals (can be ±). */
  stockAdjustment: number;
  lowStockThreshold: number;
  active: boolean;
  createdAt: string;
}

/** Available-to-promise stock = physical on-hand minus reserved/held. */
export function availableStock(p: Pick<Product, 'totalStock' | 'heldStock'>): number {
  return Math.max(0, p.totalStock - (p.heldStock ?? 0));
}

/** Human label combining sale unit and pack content, e.g. "Box · 12 L". */
export function unitLabel(
  p: Pick<Product, 'unit' | 'packSize' | 'packUnit'>,
): string {
  return p.packSize > 0 ? `${p.unit} · ${p.packSize} ${p.packUnit}` : p.unit;
}

/** Stored under products/{productId}/batches/{batchId}. */
export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  manufactureDate: string;
  expiryDate: string;
  mrp: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'SUBMITTED'
  | 'QUANTITY_APPROVED'
  | 'PACKING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export const ORDER_PIPELINE: OrderStatus[] = [
  'SUBMITTED',
  'QUANTITY_APPROVED',
  'PACKING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** Statuses that are approved and actively moving through fulfillment. */
export const ACTIVE_APPROVED_STATUSES: OrderStatus[] = [
  'QUANTITY_APPROVED',
  'PACKING',
  'OUT_FOR_DELIVERY',
];

/**
 * Sort weight for the staff order queue — lower sorts first. Approved, in-flight
 * orders are prioritised, then new submissions, then completed/rejected.
 */
export function orderPriorityWeight(status: OrderStatus): number {
  switch (status) {
    case 'QUANTITY_APPROVED':
      return 0;
    case 'PACKING':
      return 1;
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'SUBMITTED':
      return 3;
    case 'DELIVERED':
      return 4;
    case 'REJECTED':
      return 5;
    case 'CANCELLED':
      return 6;
    default:
      return 9;
  }
}

export type PaymentMode = 'CREDIT' | 'CASH';

export interface OrderLineItem {
  productId: string;
  name: string;
  category: ProductCategory;
  unit: string;
  hsnCode: string;
  taxRatePct: number;
  unitPrice: number; // pre-tax, after volume discount
  discountPct: number;
  /** Quantity the retailer requested. */
  requestedQty: number;
  /** Quantity approved by staff (defaults to requested until modified). */
  approvedQty: number;
  lineTotal: number; // approvedQty * unitPrice (pre-tax)
  taxAmount: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  by: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  retailerId: string;
  retailerName: string;
  poNumber: string;
  paymentMode: PaymentMode;
  status: OrderStatus;
  items: OrderLineItem[];
  subTotal: number;
  taxTotal: number;
  /** Freight/transport charge added by staff at approval. */
  freightCharges: number;
  grandTotal: number;
  challanNumber?: string;
  shippingNote?: string;
  /** Delivery date promised by staff when the order is approved. */
  expectedDeliveryDate?: string;
  /** Set when the order was placed against an upcoming rake. */
  rakeId?: string;
  rakeNumber?: string;
  timeline: OrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Ledger & Inventory logs
// ---------------------------------------------------------------------------

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface CreditLedgerEntry {
  id: string;
  retailerId: string;
  type: LedgerEntryType; // DEBIT increases outstanding, CREDIT reduces it
  amount: number;
  balanceAfter: number;
  reference: string; // order number / payment ref
  note?: string;
  createdAt: string;
}

export type InventoryLogAction =
  | 'BATCH_ADDED'
  | 'BATCH_UPDATED'
  | 'STOCK_DEDUCTED'
  | 'STOCK_ADJUSTED';

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  batchNumber?: string;
  action: InventoryLogAction;
  quantityDelta: number;
  by: string;
  note?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Announcements (schemes / banners) & Rake arrivals
// ---------------------------------------------------------------------------

export type AnnouncementType = 'SCHEME' | 'BANNER';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  bannerColor?: string;
  category?: ProductCategory;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
}

export type RakeStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'ARRIVED' | 'ALLOCATED';

/** A single product line within a rake, with an allocation ratio. */
export interface RakeItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  unit: string;
  hsnCode: string;
  taxRatePct: number;
  /** Total quantity of this item arriving on the rake. */
  quantity: number;
  /** Quantity already booked by retailers against this rake. */
  bookedQty: number;
  /** Units of this item per one "lot" — defines the fixed item ratio. */
  ratio: number;
  /** Pre-tax price per unit for orders placed against this rake. */
  pricePerUnit: number;
}

export interface RakeArrival {
  id: string;
  rakeNumber: string;
  originStation: string;
  destinationGodown: string;
  status: RakeStatus;
  expectedArrival: string;
  /** Products carried on this rake, each with an allocation ratio. */
  items: RakeItem[];
  notes?: string;
  /** Whether retailers can place orders against this rake. */
  openForOrders: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Cart (client-side only)
// ---------------------------------------------------------------------------

export interface CartItem {
  product: Product;
  qty: number;
}
