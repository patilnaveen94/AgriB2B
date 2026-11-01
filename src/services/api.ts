import type {
  Announcement,
  AppUser,
  Batch,
  CreditLedgerEntry,
  InventoryLog,
  InventoryCategory,
  Order,
  OrderLineItem,
  OrderStatus,
  Product,
  RakeArrival,
} from '@/types';
import { ACTIVE_APPROVED_STATUSES, GST_RATE_SLABS, orderPriorityWeight } from '@/types';
import { mockStore } from './mockStore';
import { delay, genId, nowIso, round2 } from '@/lib/utils';

/**
 * Domain data-access API used by every screen. In demo mode it operates on the
 * localStorage-backed `mockStore`; the method signatures match what a live
 * Firestore implementation would expose, so swapping is a drop-in change.
 */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// Users / retailers
// ---------------------------------------------------------------------------

export const usersApi = {
  async list(): Promise<AppUser[]> {
    return delay(clone(mockStore.data.users));
  },
  async getById(uid: string): Promise<AppUser | undefined> {
    return delay(clone(mockStore.data.users.find((u) => u.uid === uid)));
  },
  async getByEmail(email: string): Promise<AppUser | undefined> {
    const found = mockStore.data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    return delay(clone(found));
  },
  async pendingRetailers(): Promise<AppUser[]> {
    return delay(
      clone(
        mockStore.data.users.filter(
          (u) => u.role === 'retailer' && u.status === 'PENDING_APPROVAL',
        ),
      ),
    );
  },
  async createRetailer(user: AppUser): Promise<AppUser> {
    mockStore.data.users.push(clone(user));
    mockStore.save();
    return delay(clone(user));
  },
  async approve(
    uid: string,
    opts: { creditLimit: number; approvedBy: string },
  ): Promise<AppUser> {
    const u = mockStore.data.users.find((x) => x.uid === uid);
    if (!u) throw new Error('User not found');
    u.status = 'ACTIVE';
    u.approvedAt = nowIso();
    u.approvedBy = opts.approvedBy;
    u.retailer = {
      creditLimit: opts.creditLimit,
      outstandingBalance: u.retailer?.outstandingBalance ?? 0,
      licenseDocUrl: u.retailer?.licenseDocUrl,
      licenseFileName: u.retailer?.licenseFileName,
    };

    mockStore.save();
    return delay(clone(u));
  },
  async reject(uid: string, reason: string, by: string): Promise<AppUser> {
    const u = mockStore.data.users.find((x) => x.uid === uid);
    if (!u) throw new Error('User not found');
    u.status = 'REJECTED';
    u.rejectionReason = reason;
    u.approvedBy = by;
    mockStore.save();
    return delay(clone(u));
  },
  async updateRetailerProfile(
    uid: string,
    patch: Partial<NonNullable<AppUser['retailer']>>,
  ): Promise<AppUser> {
    const u = mockStore.data.users.find((x) => x.uid === uid);
    if (!u || !u.retailer) throw new Error('Retailer not found');
    u.retailer = { ...u.retailer, ...patch };
    mockStore.save();
    return delay(clone(u));
  },
};

export const inventoryCategoriesApi = {
  async list(): Promise<InventoryCategory[]> {
    return delay(clone(mockStore.data.categories));
  },
  async create(input: Omit<InventoryCategory, 'id'>): Promise<InventoryCategory> {
    const name = input.name.trim();
    if (!name) throw new Error('Category name is required.');
    if (!GST_RATE_SLABS.includes(input.gstRatePct)) {
      throw new Error('Enter a valid GST slab.');
    }
    if (
      mockStore.data.categories.some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error('A category with this name already exists.');
    }
    const slug = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
    const baseId = slug || 'CATEGORY';
    const id = mockStore.data.categories.some((category) => category.id === baseId)
      ? `${baseId}_${genId('cat').slice(4)}`
      : baseId;
    const category: InventoryCategory = {
      id,
      name,
      gstRatePct: input.gstRatePct,
    };
    mockStore.data.categories.push(category);
    mockStore.save();
    return delay(clone(category));
  },
};

// ---------------------------------------------------------------------------
// Products & batches
// ---------------------------------------------------------------------------

function recomputeStock(productId: string): void {
  const batchTotal = mockStore.data.batches
    .filter((b) => b.productId === productId)
    .reduce((s, b) => s + b.quantity, 0);
  const p = mockStore.data.products.find((x) => x.id === productId);
  if (p) p.totalStock = Math.max(0, batchTotal + (p.stockAdjustment ?? 0));
}

/** Reserve stock for an approved order (moves qty into held). */
function holdStock(productId: string, qty: number): void {
  const p = mockStore.data.products.find((x) => x.id === productId);
  if (p) p.heldStock = (p.heldStock ?? 0) + qty;
}

/** Release a previously-held reservation (e.g. order rejected after approval). */
function releaseStock(productId: string, qty: number): void {
  const p = mockStore.data.products.find((x) => x.id === productId);
  if (p) p.heldStock = Math.max(0, (p.heldStock ?? 0) - qty);
}

export const productsApi = {
  async list(): Promise<Product[]> {
    return delay(clone(mockStore.data.products));
  },
  async get(id: string): Promise<Product | undefined> {
    return delay(clone(mockStore.data.products.find((p) => p.id === id)));
  },
  async create(
    input: Omit<
      Product,
      'id' | 'totalStock' | 'heldStock' | 'stockAdjustment' | 'createdAt'
    >,
  ): Promise<Product> {
    const product: Product = {
      ...input,
      id: genId('prod'),
      totalStock: 0,
      heldStock: 0,
      stockAdjustment: 0,
      createdAt: nowIso(),
    };
    mockStore.data.products.push(product);
    mockStore.save();
    return delay(clone(product));
  },
  async update(id: string, patch: Partial<Product>): Promise<Product> {
    const p = mockStore.data.products.find((x) => x.id === id);
    if (!p) throw new Error('Product not found');
    Object.assign(p, patch);
    mockStore.save();
    return delay(clone(p));
  },
  async remove(id: string): Promise<void> {
    mockStore.data.products = mockStore.data.products.filter((p) => p.id !== id);
    mockStore.data.batches = mockStore.data.batches.filter((b) => b.productId !== id);
    mockStore.save();
    return delay(undefined);
  },
  /**
   * Manually set the physical stock to `newTotal`. Implemented as an adjustment
   * delta on top of batch totals so it survives future batch additions.
   */
  async adjustStock(
    id: string,
    newTotal: number,
    by: string,
    note?: string,
  ): Promise<Product> {
    const p = mockStore.data.products.find((x) => x.id === id);
    if (!p) throw new Error('Product not found');
    const batchTotal = mockStore.data.batches
      .filter((b) => b.productId === id)
      .reduce((s, b) => s + b.quantity, 0);
    const target = Math.max(0, Math.round(newTotal));
    const delta = target - p.totalStock;
    // Set the adjustment so batchTotal + adjustment === target going forward.
    p.stockAdjustment = target - batchTotal;
    p.totalStock = target;
    logsApi._push({
      productId: id,
      productName: p.name,
      action: 'STOCK_ADJUSTED',
      quantityDelta: delta,
      by,
      note: note ?? 'Manual stock adjustment',
    });
    mockStore.save();
    return delay(clone(p));
  },
};

export const batchesApi = {
  async listByProduct(productId: string): Promise<Batch[]> {
    return delay(
      clone(mockStore.data.batches.filter((b) => b.productId === productId)),
    );
  },
  async add(
    productId: string,
    input: Omit<Batch, 'id' | 'productId' | 'createdAt'>,
    by: string,
  ): Promise<Batch> {
    const batch: Batch = {
      ...input,
      id: genId('batch'),
      productId,
      createdAt: nowIso(),
    };
    mockStore.data.batches.push(batch);
    recomputeStock(productId);
    logsApi._push({
      productId,
      productName: mockStore.data.products.find((p) => p.id === productId)?.name ?? '',
      batchNumber: batch.batchNumber,
      action: 'BATCH_ADDED',
      quantityDelta: batch.quantity,
      by,
    });
    mockStore.save();
    return delay(clone(batch));
  },
  async update(batchId: string, patch: Partial<Batch>, by: string): Promise<Batch> {
    const b = mockStore.data.batches.find((x) => x.id === batchId);
    if (!b) throw new Error('Batch not found');
    const prevQty = b.quantity;
    Object.assign(b, patch);
    recomputeStock(b.productId);
    logsApi._push({
      productId: b.productId,
      productName: mockStore.data.products.find((p) => p.id === b.productId)?.name ?? '',
      batchNumber: b.batchNumber,
      action: 'BATCH_UPDATED',
      quantityDelta: (patch.quantity ?? prevQty) - prevQty,
      by,
    });
    mockStore.save();
    return delay(clone(b));
  },
  async remove(batchId: string): Promise<void> {
    const b = mockStore.data.batches.find((x) => x.id === batchId);
    mockStore.data.batches = mockStore.data.batches.filter((x) => x.id !== batchId);
    if (b) recomputeStock(b.productId);
    mockStore.save();
    return delay(undefined);
  },
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

let orderSeq = 200;

export const ordersApi = {
  async list(): Promise<Order[]> {
    return delay(
      clone(
        [...mockStore.data.orders].sort((a, b) => {
          // Priority first (approved/in-flight on top), then soonest ETA, then newest.
          const pw = orderPriorityWeight(a.status) - orderPriorityWeight(b.status);
          if (pw !== 0) return pw;
          const aEta = a.expectedDeliveryDate ?? '';
          const bEta = b.expectedDeliveryDate ?? '';
          if (aEta && bEta && aEta !== bEta) return aEta.localeCompare(bEta);
          return b.createdAt.localeCompare(a.createdAt);
        }),
      ),
    );
  },
  async listByRetailer(retailerId: string): Promise<Order[]> {
    return delay(
      clone(
        mockStore.data.orders
          .filter((o) => o.retailerId === retailerId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    );
  },
  async get(id: string): Promise<Order | undefined> {
    return delay(clone(mockStore.data.orders.find((o) => o.id === id)));
  },
  async create(input: {
    retailer: AppUser;
    poNumber?: string;
    paymentMode: Order['paymentMode'];
    items: OrderLineItem[];
    rakeId?: string;
    rakeNumber?: string;
  }): Promise<Order> {
    orderSeq += 1;
    const subTotal = round2(input.items.reduce((s, i) => s + i.lineTotal, 0));
    const taxTotal = round2(input.items.reduce((s, i) => s + i.taxAmount, 0));
    const order: Order = {
      id: genId('order'),
      orderNumber: `AGF-2026-${String(orderSeq).padStart(6, '0')}`,
      retailerId: input.retailer.uid,
      retailerName: input.retailer.business.businessName,
      poNumber: input.poNumber?.trim() ?? '',
      paymentMode: input.paymentMode,
      status: 'SUBMITTED',
      items: input.items,
      subTotal,
      taxTotal,
      freightCharges: 0,
      grandTotal: round2(subTotal + taxTotal),
      rakeId: input.rakeId,
      rakeNumber: input.rakeNumber,
      timeline: [{ status: 'SUBMITTED', at: nowIso(), by: input.retailer.uid }],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mockStore.data.orders.push(order);

    // Book the requested quantities against the rake, if applicable.
    if (input.rakeId) {
      const rake = mockStore.data.rakeArrivals.find((r) => r.id === input.rakeId);
      if (rake) {
        for (const item of input.items) {
          const ri = rake.items.find((x) => x.productId === item.productId);
          if (ri) ri.bookedQty = Math.min(ri.quantity, ri.bookedQty + item.requestedQty);
        }
      }
    }

    // Credit orders debit the retailer ledger + outstanding balance.
    if (input.paymentMode === 'CREDIT') {
      ledgersApi._debit(input.retailer.uid, order.grandTotal, order.orderNumber);
    }
    mockStore.save();
    return delay(clone(order));
  },
  /**
   * Staff approval: locks approved quantities, adds freight and a promised
   * delivery date, reserves (holds) stock and advances to QUANTITY_APPROVED.
   */
  async approve(
    id: string,
    input: {
      approvals: Record<string, number>;
      freightCharges: number;
      expectedDeliveryDate?: string;
      by: string;
    },
  ): Promise<Order> {
    const approver = mockStore.data.users.find((user) => user.uid === input.by);
    if (approver?.role !== 'super_admin') {
      throw new Error('Only the super admin can review and approve orders.');
    }
    const o = mockStore.data.orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');

    o.items = o.items.map((item) => {
      const approvedQty = input.approvals[item.productId] ?? item.approvedQty;
      const lineTotal = round2(item.unitPrice * approvedQty);
      const taxAmount = round2((lineTotal * item.taxRatePct) / 100);
      return { ...item, approvedQty, lineTotal, taxAmount };
    });

    o.subTotal = round2(o.items.reduce((s, i) => s + i.lineTotal, 0));
    o.taxTotal = round2(o.items.reduce((s, i) => s + i.taxAmount, 0));
    o.freightCharges = round2(Math.max(0, input.freightCharges));
    const newGrandTotal = round2(o.subTotal + o.taxTotal + o.freightCharges);

    // Reconcile the retailer's outstanding balance for credit orders.
    if (o.paymentMode === 'CREDIT') {
      ledgersApi._adjust(o.retailerId, newGrandTotal - o.grandTotal, o.orderNumber);
    }
    o.grandTotal = newGrandTotal;
    o.expectedDeliveryDate = input.expectedDeliveryDate;
    o.status = 'QUANTITY_APPROVED';
    o.updatedAt = nowIso();
    o.timeline.push({ status: 'QUANTITY_APPROVED', at: nowIso(), by: input.by });

    // Reserve stock so it is no longer available-to-promise.
    for (const item of o.items) holdStock(item.productId, item.approvedQty);

    mockStore.save();
    return delay(clone(o));
  },
  async advanceStatus(
    id: string,
    status: OrderStatus,
    by: string,
    note?: string,
  ): Promise<Order> {
    const actor = mockStore.data.users.find((user) => user.uid === by);
    if (
      actor?.role === 'staff' &&
      actor.staffFunction === 'godown_worker' &&
      status !== 'PACKING' &&
      status !== 'OUT_FOR_DELIVERY'
    ) {
      throw new Error('Godown workers can only pack and dispatch approved orders.');
    }
    const o = mockStore.data.orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    const prev = o.status;
    if (actor?.role === 'staff' && status === 'QUANTITY_APPROVED') {
      throw new Error('Only the super admin can review and approve orders.');
    }
    if (
      actor?.role === 'staff' &&
      actor.staffFunction === 'godown_worker' &&
      !(
        (prev === 'QUANTITY_APPROVED' && status === 'PACKING') ||
        (prev === 'PACKING' && status === 'OUT_FOR_DELIVERY')
      )
    ) {
      throw new Error('Godown workers can only pack approved orders and dispatch packed orders.');
    }
    const wasHeld = ACTIVE_APPROVED_STATUSES.includes(prev);

    o.status = status;
    o.updatedAt = nowIso();
    o.timeline.push({ status, at: nowIso(), by, note });
    if (status === 'PACKING' && !o.challanNumber) {
      o.challanNumber = `CH-${o.orderNumber.slice(-4)}`;
    }

    // On delivery, physically deduct stock (FEFO) and release the reservation.
    if (status === 'DELIVERED') {
      for (const item of o.items) {
        deductStock(item.productId, item.approvedQty, by, o.orderNumber);
        if (wasHeld) releaseStock(item.productId, item.approvedQty);
      }
    }

    // On rejection/cancellation, release held stock and reverse any credit.
    if (status === 'REJECTED' || status === 'CANCELLED') {
      if (wasHeld) {
        for (const item of o.items) releaseStock(item.productId, item.approvedQty);
      }
      // Release the rake booking, if this order was placed against a rake.
      if (o.rakeId) {
        const rake = mockStore.data.rakeArrivals.find((r) => r.id === o.rakeId);
        if (rake) {
          for (const item of o.items) {
            const ri = rake.items.find((x) => x.productId === item.productId);
            if (ri) ri.bookedQty = Math.max(0, ri.bookedQty - item.requestedQty);
          }
        }
      }
      if (o.paymentMode === 'CREDIT') {
        ledgersApi._adjust(o.retailerId, -o.grandTotal, o.orderNumber);
      }
    }

    mockStore.save();
    return delay(clone(o));
  },
  async updateQuantities(
    id: string,
    approvals: Record<string, number>,
    _by: string,
  ): Promise<Order> {
    const o = mockStore.data.orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    o.items = o.items.map((item) => {
      const approvedQty = approvals[item.productId] ?? item.approvedQty;
      const lineTotal = round2(item.unitPrice * approvedQty);
      const taxAmount = round2((lineTotal * item.taxRatePct) / 100);
      return { ...item, approvedQty, lineTotal, taxAmount };
    });
    o.subTotal = round2(o.items.reduce((s, i) => s + i.lineTotal, 0));
    o.taxTotal = round2(o.items.reduce((s, i) => s + i.taxAmount, 0));
    o.grandTotal = round2(o.subTotal + o.taxTotal);
    o.updatedAt = nowIso();
    mockStore.save();
    return delay(clone(o));
  },
  async setShipping(
    id: string,
    data: { challanNumber?: string; shippingNote?: string },
  ): Promise<Order> {
    const o = mockStore.data.orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    Object.assign(o, data);
    o.updatedAt = nowIso();
    mockStore.save();
    return delay(clone(o));
  },
};

function deductStock(productId: string, qty: number, by: string, ref: string): void {
  let remaining = qty;
  const batches = mockStore.data.batches
    .filter((b) => b.productId === productId)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)); // FEFO
  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    b.quantity -= take;
    remaining -= take;
  }
  recomputeStock(productId);
  logsApi._push({
    productId,
    productName: mockStore.data.products.find((p) => p.id === productId)?.name ?? '',
    action: 'STOCK_DEDUCTED',
    quantityDelta: -qty,
    by,
    note: `Order ${ref}`,
  });
}

// ---------------------------------------------------------------------------
// Ledgers
// ---------------------------------------------------------------------------

export const ledgersApi = {
  async listByRetailer(retailerId: string): Promise<CreditLedgerEntry[]> {
    return delay(
      clone(
        mockStore.data.ledgers
          .filter((l) => l.retailerId === retailerId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    );
  },
  _debit(retailerId: string, amount: number, reference: string): void {
    const u = mockStore.data.users.find((x) => x.uid === retailerId);
    if (!u?.retailer) return;
    u.retailer.outstandingBalance = round2(u.retailer.outstandingBalance + amount);
    mockStore.data.ledgers.push({
      id: genId('led'),
      retailerId,
      type: 'DEBIT',
      amount,
      balanceAfter: u.retailer.outstandingBalance,
      reference,
      note: 'Order on credit',
      createdAt: nowIso(),
    });
  },
  /** Apply a signed adjustment (e.g. freight delta at approval, or reversal). */
  _adjust(retailerId: string, delta: number, reference: string): void {
    const rounded = round2(delta);
    if (rounded === 0) return;
    const u = mockStore.data.users.find((x) => x.uid === retailerId);
    if (!u?.retailer) return;
    u.retailer.outstandingBalance = round2(
      Math.max(0, u.retailer.outstandingBalance + rounded),
    );
    mockStore.data.ledgers.push({
      id: genId('led'),
      retailerId,
      type: rounded > 0 ? 'DEBIT' : 'CREDIT',
      amount: Math.abs(rounded),
      balanceAfter: u.retailer.outstandingBalance,
      reference,
      note: rounded > 0 ? 'Freight / order adjustment' : 'Order reversal',
      createdAt: nowIso(),
    });
  },
  async recordPayment(
    retailerId: string,
    amount: number,
    reference: string,
  ): Promise<CreditLedgerEntry> {
    const u = mockStore.data.users.find((x) => x.uid === retailerId);
    if (!u?.retailer) throw new Error('Retailer not found');
    u.retailer.outstandingBalance = round2(
      Math.max(0, u.retailer.outstandingBalance - amount),
    );
    const entry: CreditLedgerEntry = {
      id: genId('led'),
      retailerId,
      type: 'CREDIT',
      amount,
      balanceAfter: u.retailer.outstandingBalance,
      reference,
      note: 'Payment received',
      createdAt: nowIso(),
    };
    mockStore.data.ledgers.push(entry);
    mockStore.save();
    return delay(clone(entry));
  },
};

// ---------------------------------------------------------------------------
// Announcements & rake arrivals
// ---------------------------------------------------------------------------

export const announcementsApi = {
  async list(): Promise<Announcement[]> {
    return delay(
      clone(
        [...mockStore.data.announcements].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      ),
    );
  },
  async listActive(): Promise<Announcement[]> {
    const now = Date.now();
    return delay(
      clone(
        mockStore.data.announcements.filter(
          (a) =>
            a.active &&
            new Date(a.startsAt).getTime() <= now &&
            new Date(a.endsAt).getTime() >= now,
        ),
      ),
    );
  },
  async create(input: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    const a: Announcement = { ...input, id: genId('ann'), createdAt: nowIso() };
    mockStore.data.announcements.push(a);
    mockStore.save();
    return delay(clone(a));
  },
  async update(id: string, patch: Partial<Announcement>): Promise<Announcement> {
    const a = mockStore.data.announcements.find((x) => x.id === id);
    if (!a) throw new Error('Announcement not found');
    Object.assign(a, patch);
    mockStore.save();
    return delay(clone(a));
  },
  async remove(id: string): Promise<void> {
    mockStore.data.announcements = mockStore.data.announcements.filter(
      (a) => a.id !== id,
    );
    mockStore.save();
    return delay(undefined);
  },
};

export const rakesApi = {
  async list(): Promise<RakeArrival[]> {
    return delay(
      clone(
        [...mockStore.data.rakeArrivals].sort((a, b) =>
          a.expectedArrival.localeCompare(b.expectedArrival),
        ),
      ),
    );
  },
  async upcoming(): Promise<RakeArrival[]> {
    return delay(
      clone(
        mockStore.data.rakeArrivals
          .filter((r) => r.openForOrders && r.status !== 'ALLOCATED')
          .sort((a, b) => a.expectedArrival.localeCompare(b.expectedArrival)),
      ),
    );
  },
  async create(input: Omit<RakeArrival, 'id' | 'createdAt'>): Promise<RakeArrival> {
    const r: RakeArrival = { ...input, id: genId('rake'), createdAt: nowIso() };
    mockStore.data.rakeArrivals.push(r);
    mockStore.save();
    return delay(clone(r));
  },
  async update(id: string, patch: Partial<RakeArrival>): Promise<RakeArrival> {
    const r = mockStore.data.rakeArrivals.find((x) => x.id === id);
    if (!r) throw new Error('Rake not found');
    Object.assign(r, patch);
    mockStore.save();
    return delay(clone(r));
  },
  async remove(id: string): Promise<void> {
    mockStore.data.rakeArrivals = mockStore.data.rakeArrivals.filter(
      (r) => r.id !== id,
    );
    mockStore.save();
    return delay(undefined);
  },
};

// ---------------------------------------------------------------------------
// Inventory logs
// ---------------------------------------------------------------------------

export const logsApi = {
  async list(): Promise<InventoryLog[]> {
    return delay(
      clone(
        [...mockStore.data.inventoryLogs].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      ),
    );
  },
  _push(input: Omit<InventoryLog, 'id' | 'createdAt'>): void {
    mockStore.data.inventoryLogs.push({
      ...input,
      id: genId('ilog'),
      createdAt: nowIso(),
    });
  },
};
