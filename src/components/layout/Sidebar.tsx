import { NavLink } from 'react-router-dom';
import { Sprout, X } from 'lucide-react';
import { navFor } from './navConfig';
import { useAuth } from '@/context/AuthContext';
import { cx } from '@/lib/utils';
import { staffFunctionLabel } from '@/components/ui/statusMeta';

interface SidebarProps {
  collapsed: boolean;
  /** Mobile drawer open state. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, role } = useAuth();
  if (!user || !role) return null;
  const sections = navFor(role);

  const roleLabel =
    role === 'retailer'
      ? 'Retailer Portal'
      : user.staffFunction
        ? staffFunctionLabel[user.staffFunction]
        : 'Staff Console';

  const content = (
    <div className="flex h-full flex-col bg-surface-900 text-surface-100">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Sprout className="h-5 w-5" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">
              AgriFlow B2B
            </p>
            <p className="truncate text-[11px] font-medium text-brand-300">{roleLabel}</p>
          </div>
        )}
        <button
          onClick={onCloseMobile}
          className="ml-auto rounded-lg p-1.5 text-surface-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.heading}>
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                {section.heading}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      cx(
                        'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-surface-300 hover:bg-white/5 hover:text-white',
                        collapsed && 'justify-center',
                      )
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/5 px-4 py-3">
          <p className="text-[11px] text-surface-500">
            {import.meta.env.VITE_DEMO_MODE === 'true'
              ? 'Demo mode • local data'
              : 'Live • Firebase'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cx(
          'hidden shrink-0 transition-[width] duration-200 lg:block',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className="fixed inset-y-0 left-0 z-30" style={{ width: collapsed ? 76 : 256 }}>
          {content}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden
          />
          <div className="animate-slide-in-left absolute inset-y-0 left-0 w-72 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
