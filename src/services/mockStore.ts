import type { SeedData } from '@/data/seed';
import { buildSeedData } from '@/data/seed';
import { DEFAULT_INVENTORY_CATEGORIES } from '@/types';

/**
 * A tiny Firestore-shaped, localStorage-backed store that powers demo mode.
 * It is intentionally simple: each collection is an array of documents. The
 * service layer (`api.ts`) queries/mutates these arrays and persists after
 * every write, so a page refresh keeps state.
 */

const STORAGE_KEY = 'agriflow.db.v4';

type StoreShape = SeedData;

function migrateLegacyStore(data: StoreShape): boolean {
  let changed = false;

  if (!Array.isArray(data.categories)) {
    data.categories = DEFAULT_INVENTORY_CATEGORIES.map((category) => ({ ...category }));
    changed = true;
  }

  if (!Array.isArray(data.notifications)) {
    data.notifications = [];
    changed = true;
  }

  for (const user of data.users) {
    if (user.retailer && 'priceTier' in user.retailer) {
      user.retailer = {
        creditLimit: user.retailer.creditLimit,
        outstandingBalance: user.retailer.outstandingBalance,
        licenseDocUrl: user.retailer.licenseDocUrl,
        licenseFileName: user.retailer.licenseFileName,
      };
      changed = true;
    }

    if (user.business.businessName === 'AgriFlow HQ') {
      user.business.businessName = 'Shri Balaji Fertilizer';
      user.business.addressLine = 'Mahalingpur';
      user.business.city = 'Mahalingpur';
      user.business.state = 'Karnataka';
      user.business.pincode = '';
      changed = true;
    }
  }

  for (const announcement of data.announcements) {
    if (announcement.body.includes('top volume tier')) {
      announcement.body = announcement.body.replace(
        'unlock the top volume tier',
        'unlock additional quantity-based savings',
      );
      changed = true;
    }
  }

  return changed;
}

function load(): StoreShape {
  if (typeof window === 'undefined') return buildSeedData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as StoreShape;
      if (migrateLegacyStore(saved)) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch (error) {
          console.error('Could not persist the demo data migration:', error);
        }
      }
      return saved;
    }
  } catch {
    /* fall through to seed */
  }
  const seeded = buildSeedData();
  // NB: write directly here rather than calling persist(). load() runs while
  // `store` is still in its temporal dead zone, so persist()'s `store = next`
  // assignment would throw "Cannot access 'store' before initialization".
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    /* ignore write failures (e.g. private mode) */
  }
  return seeded;
}

let store: StoreShape = load();

function persist(next: StoreShape = store): void {
  store = next;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event('agriflow:store-updated'));
  }
}

export const mockStore = {
  get data(): StoreShape {
    return store;
  },
  save: () => persist(),
  refresh(): void {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as StoreShape;
    if (migrateLegacyStore(saved)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
    store = saved;
  },
  /** Wipe local state and re-seed. Useful for demos and tests. */
  reset(): StoreShape {
    const seeded = buildSeedData();
    persist(seeded);
    return seeded;
  },
};
