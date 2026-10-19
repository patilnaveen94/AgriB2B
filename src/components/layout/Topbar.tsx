import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  Sprout,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { priceTierMeta } from '@/components/ui/statusMeta';
import { Badge } from '@/components/ui/Badge';

export function Topbar({
  onToggleCollapse,
  collapsed,
  title,
}: {
  onToggleCollapse: () => void;
  collapsed: boolean;
  title: string;
}) {
  const { user, role, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (user?.business.businessName ?? 'AF')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const home = role === 'retailer' ? '/app' : '/admin';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-surface-200 bg-white/90 px-4 backdrop-blur lg:px-6">
      {/* Mobile brand mark */}
      <Link
        to={home}
        className="tap-transparent flex items-center gap-2 lg:hidden"
        aria-label="Home"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Sprout className="h-5 w-5" />
        </span>
      </Link>

      {/* Desktop sidebar collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="focus-ring hidden rounded-lg p-2 text-surface-500 hover:bg-surface-100 lg:inline-flex"
        aria-label="Toggle sidebar"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-surface-900 sm:text-lg">
          {title}
        </h1>
      </div>

      {role === 'retailer' && (
        <Link
          to="/app/cart"
          className="focus-ring tap-transparent relative rounded-lg p-2 text-surface-600 hover:bg-surface-100"
          aria-label="Cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </Link>
      )}

      <button
        className="focus-ring tap-transparent relative rounded-lg p-2 text-surface-600 hover:bg-surface-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="focus-ring tap-transparent flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-[140px] truncate text-sm font-semibold text-surface-800">
              {user?.business.businessName}
            </span>
            <span className="block text-[11px] text-surface-500">{user?.email}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-surface-400 sm:block" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="animate-fade-in absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-surface-200 bg-white p-2 shadow-card-hover">
              <div className="border-b border-surface-100 px-3 py-2">
                <p className="truncate text-sm font-semibold text-surface-800">
                  {user?.business.ownerName}
                </p>
                <p className="truncate text-xs text-surface-500">{user?.email}</p>
                {role === 'retailer' && user?.retailer && (
                  <Badge
                    tone={priceTierMeta[user.retailer.priceTier].tone}
                    className="mt-2"
                  >
                    {priceTierMeta[user.retailer.priceTier].label} Tier
                  </Badge>
                )}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
