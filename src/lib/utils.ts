import type { Product, VolumeTier } from '@/types';

/** Concatenate class names, dropping falsy values (tiny clsx replacement). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Reasonably unique id generator for demo-mode documents. */
export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Format a number as Indian Rupee currency. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

/** Human friendly date, e.g. "12 Aug 2026". */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Local calendar date key for comparing timestamps against today's date. */
export function localDateKey(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Days until (positive) or since (negative) a date. */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Resolve the best volume-tier discount for a given quantity.
 * Tiers are matched by the highest `minQty` that is <= qty.
 */
export function resolveDiscountPct(tiers: VolumeTier[], qty: number): number {
  let best = 0;
  for (const tier of tiers) {
    if (qty >= tier.minQty && tier.discountPct > best) best = tier.discountPct;
  }
  return best;
}

export interface PricingResult {
  discountPct: number;
  unitPrice: number; // pre-tax, after discount
  lineSubTotal: number; // unitPrice * qty
  taxAmount: number;
  lineTotal: number; // incl. tax
}

/** Compute discounted, taxed pricing for a product line. */
export function priceLine(product: Product, qty: number): PricingResult {
  const discountPct = resolveDiscountPct(product.volumeTiers, qty);
  const unitPrice = round2(product.basePrice * (1 - discountPct / 100));
  const lineSubTotal = round2(unitPrice * qty);
  const taxAmount = round2((lineSubTotal * product.taxRatePct) / 100);
  return {
    discountPct,
    unitPrice,
    lineSubTotal,
    taxAmount,
    lineTotal: round2(lineSubTotal + taxAmount),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * GST-inclusive pricing helpers. Products store a net (pre-tax) `basePrice`;
 * admins enter and everyone sees the gross (GST-inclusive) price.
 */
export function grossUnit(net: number, taxRatePct: number): number {
  return round2(net * (1 + (taxRatePct ?? 0) / 100));
}

/** Convert a gross (GST-inclusive) price back to the net price we store. */
export function netFromGross(gross: number, taxRatePct: number): number {
  return gross / (1 + (taxRatePct ?? 0) / 100);
}

/** Small deterministic delay so demo interactions feel like network calls. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Add days to today, returning ISO string. */
export function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
