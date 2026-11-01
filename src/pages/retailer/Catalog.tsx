import { useEffect, useMemo, useState } from 'react';
import { Minus, Package, PackageSearch, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineLoader } from '@/components/ui/Loader';
import { Input } from '@/components/ui/Field';
import { categoryMetaFor } from '@/components/ui/statusMeta';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { productsApi } from '@/services/api';
import {
  PRODUCT_CATEGORIES,
  unitLabel,
  type Product,
  type ProductCategory,
} from '@/types';
import { cx, formatCurrency, formatNumber, grossUnit } from '@/lib/utils';

export function CatalogPage() {
  const { items, add, setQty } = useCart();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'ALL'>('ALL');

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await productsApi.list();
      if (!active) return;
      setProducts(list.filter((p) => p.active));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Current cart quantity for a product (0 if not in cart). */
  const qtyOf = (id: string) => items.find((i) => i.product.id === id)?.qty ?? 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = category === 'ALL' || p.category === category;
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [products, query, category]);
  const filters = useMemo(
    () => [
      { value: 'ALL' as const, label: 'All' },
      ...PRODUCT_CATEGORIES,
      ...Array.from(new Set(products.map((product) => product.category)))
        .filter((value) => !PRODUCT_CATEGORIES.some((item) => item.value === value))
        .map((value) => ({ value, label: categoryMetaFor(value).label })),
    ],
    [products],
  );

  const handleAdd = (product: Product) => {
    add(product, Math.max(1, product.minOrderQty || 1));
    toast.success(`${product.name} added to cart`);
  };

  const changeQty = (product: Product, next: number) => {
    const min = Math.max(1, product.minOrderQty || 1);
    // Dropping below the minimum removes the line entirely.
    setQty(product.id, next < min ? 0 : next);
  };

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Fresh stock of fertilizers, pesticides and seeds — tap to add."
      />

      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <Input
          className="h-11 pl-9"
          placeholder="Search products or brands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Category chips */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {filters.map((f) => {
          const active = category === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setCategory(f.value)}
              className={cx(
                'tap-transparent shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-surface-200 bg-white text-surface-600 hover:border-brand-300',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <InlineLoader label="Loading catalog…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="h-6 w-6" />}
          title="No products found"
          description="Try a different search term or category."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card transition-shadow hover:shadow-card-hover"
            >
              {/* Image */}
              <div className="relative aspect-[5/4] w-full bg-surface-100">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-surface-300">
                    <Package className="h-10 w-10" />
                  </div>
                )}
                <span className="absolute left-2 top-2">
                  <Badge tone={categoryMetaFor(p.category).tone}>
                    {categoryMetaFor(p.category).label}
                  </Badge>
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-surface-400">
                  {p.brand}
                </p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-surface-900">
                  {p.name}
                </h3>
                <p className="mt-1 text-[11px] text-surface-400">{unitLabel(p)}</p>

                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold tracking-tight text-surface-900">
                      {formatCurrency(grossUnit(p.basePrice, p.taxRatePct))}
                    </p>
                    <p className="truncate text-[11px] text-surface-400">
                      per {p.unit} · incl. GST
                    </p>
                  </div>

                  {qtyOf(p.id) > 0 ? (
                    <div className="flex h-10 shrink-0 items-center rounded-full bg-brand-600 text-white shadow-sm">
                      <button
                        onClick={() => changeQty(p, qtyOf(p.id) - (p.orderStep || 1))}
                        aria-label="Decrease quantity"
                        className="tap-transparent flex h-10 w-9 items-center justify-center rounded-l-full active:scale-90"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums">
                        {formatNumber(qtyOf(p.id))}
                      </span>
                      <button
                        onClick={() => changeQty(p, qtyOf(p.id) + (p.orderStep || 1))}
                        aria-label="Increase quantity"
                        className="tap-transparent flex h-10 w-9 items-center justify-center rounded-r-full active:scale-90"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAdd(p)}
                      aria-label={`Add ${p.name} to cart`}
                      className="tap-transparent flex h-10 shrink-0 items-center gap-1 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-[transform,background-color] hover:bg-brand-700 active:scale-90"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
