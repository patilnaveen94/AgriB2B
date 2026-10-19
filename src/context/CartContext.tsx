import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, Product } from '@/types';
import { priceLine, round2 } from '@/lib/utils';
import { useAuth } from './AuthContext';

interface CartTotals {
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  savings: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  totals: CartTotals;
  add: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `agriflow.cart.${user.uid}` : 'agriflow.cart.guest';
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart when the active user changes.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const add = useCallback(
    (product: Product, qty = 1) => {
      const existing = items.find((i) => i.product.id === product.id);
      const next = existing
        ? items.map((i) =>
            i.product.id === product.id ? { ...i, qty: i.qty + qty } : i,
          )
        : [...items, { product, qty }];
      persist(next);
    },
    [items, persist],
  );

  const setQty = useCallback(
    (productId: string, qty: number) => {
      if (qty <= 0) {
        persist(items.filter((i) => i.product.id !== productId));
        return;
      }
      persist(items.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
    },
    [items, persist],
  );

  const remove = useCallback(
    (productId: string) => persist(items.filter((i) => i.product.id !== productId)),
    [items, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const totals = useMemo<CartTotals>(() => {
    let subTotal = 0;
    let taxTotal = 0;
    let savings = 0;
    for (const { product, qty } of items) {
      const pricing = priceLine(product, qty);
      subTotal += pricing.lineSubTotal;
      taxTotal += pricing.taxAmount;
      savings += round2(product.basePrice * qty - pricing.lineSubTotal);
    }
    return {
      subTotal: round2(subTotal),
      taxTotal: round2(taxTotal),
      grandTotal: round2(subTotal + taxTotal),
      savings: round2(savings),
    };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      totals,
      add,
      setQty,
      remove,
      clear,
    }),
    [items, totals, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
