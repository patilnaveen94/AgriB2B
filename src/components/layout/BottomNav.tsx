import { NavLink } from 'react-router-dom';
import { navFor } from './navConfig';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { cx } from '@/lib/utils';

/**
 * Native-app-style bottom tab bar shown on mobile only. Surfaces every primary
 * destination for the active role as a thumb-reachable tab, with a live cart
 * badge for retailers. Hidden on large screens where the sidebar takes over.
 */
export function BottomNav() {
  const { user, role } = useAuth();
  const { count } = useCart();
  if (!user || !role) return null;

  // Flatten the role's nav sections into a single tab row.
  const allItems = navFor(role).flatMap((s) => s.items);
  const items = allItems
    .filter((item) => item.to !== '/app/rakes')
    .sort((a, b) => Number(a.to === '/app/cart') - Number(b.to === '/app/cart'));

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-surface-200 bg-white/95 backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const isCart = item.to === '/app/cart';
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'tap-transparent relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                    isActive ? 'text-brand-700' : 'text-surface-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cx(
                        'relative flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-brand-50',
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {isCart && count > 0 && (
                        <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                          {count}
                        </span>
                      )}
                    </span>
                    <span className="max-w-[64px] truncate">
                      {item.shortLabel ?? item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
