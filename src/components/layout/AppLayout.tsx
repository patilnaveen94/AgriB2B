import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { navFor } from './navConfig';
import { useAuth } from '@/context/AuthContext';

const COLLAPSE_KEY = 'agriflow.sidebar.collapsed';

/** Resolve a friendly page title from the active nav item. */
function usePageTitle(): string {
  const { role } = useAuth();
  const { pathname } = useLocation();
  return useMemo(() => {
    if (!role) return 'AgriFlow';
    const items = navFor(role).flatMap((s) => s.items);
    // Longest matching path wins so nested routes resolve correctly.
    const match = items
      .filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
      .sort((a, b) => b.to.length - a.to.length)[0];
    return match?.label ?? 'AgriFlow';
  }, [role, pathname]);
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSE_KEY) === 'true',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = usePageTitle();

  const toggleCollapse = () => {
    setCollapsed((c) => {
      window.localStorage.setItem(COLLAPSE_KEY, String(!c));
      return !c;
    });
  };

  return (
    <div className="flex min-h-screen bg-surface-100">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          title={title}
        />
        <main className="flex-1 px-4 pb-28 pt-5 lg:px-6 lg:pb-8 lg:pt-6">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile-only bottom tab navigation */}
      <BottomNav />
    </div>
  );
}
