import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { notificationsApi } from '@/services/api';
import type { AppNotification } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { DEMO_MODE } from '@/lib/firebase';
import { PWAInstallButton } from './PWAInstallButton';
import { BRAND_FULL_NAME } from '@/config/brand';

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
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationPermission, setNotificationPermission] = useState(
    () => ('Notification' in window ? Notification.permission : 'unsupported'),
  );
  const seenNotificationIds = useRef(new Set<string>());
  const hasLoadedNotifications = useRef(false);

  const showBrowserNotifications = useCallback(
    async (items: AppNotification[]) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        for (const notification of items) {
          if (registration) {
            await registration.showNotification(notification.title, {
              body: notification.message,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: notification.id,
              data: { url: notification.href },
            });
          } else {
            const browserNotification = new Notification(notification.title, {
              body: notification.message,
              icon: '/icon-192.png',
              tag: notification.id,
            });
            browserNotification.onclick = () => {
              window.focus();
              navigate(notification.href);
              browserNotification.close();
            };
          }
        }
      } catch (error) {
        console.error('Could not show browser notification:', error);
      }
    },
    [navigate],
  );

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const latest = await notificationsApi.listForUser(user.uid);
    if (hasLoadedNotifications.current) {
      const newNotifications = latest.filter(
        (notification) =>
          !seenNotificationIds.current.has(notification.id) && !notification.readAt,
      );
      if (newNotifications.length > 0) {
        void showBrowserNotifications(newNotifications);
      }
    }
    latest.forEach((notification) => seenNotificationIds.current.add(notification.id));
    hasLoadedNotifications.current = true;
    setNotifications(latest);
  }, [user, showBrowserNotifications]);

  useEffect(() => {
    seenNotificationIds.current.clear();
    hasLoadedNotifications.current = false;
    if (!user) return;
    let active = true;
    const refresh = async () => {
      try {
        if (active) await refreshNotifications();
      } catch (error) {
        console.error('Could not refresh notifications:', error);
      }
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener('storage', refresh);
    window.addEventListener('agriflow:store-updated', refresh);
    void refresh();
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('agriflow:store-updated', refresh);
    };
  }, [user, refreshNotifications]);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const openNotification = async (notification: AppNotification) => {
    try {
      if (!notification.readAt && user) {
        await notificationsApi.markRead(notification.id, user.uid);
        await refreshNotifications();
      }
      setNotificationsOpen(false);
      navigate(notification.href);
    } catch (error) {
      console.error('Could not mark notification as read:', error);
      toast.error('Could not update this notification. Please try again.');
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      await notificationsApi.markAllRead(user.uid);
      await refreshNotifications();
    } catch (error) {
      console.error('Could not mark notifications as read:', error);
      toast.error('Could not update notifications. Please try again.');
    }
  };

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      toast.info('Browser notifications are not supported on this device.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notifications enabled on this device.');
      } else {
        toast.info('Allow notifications in your browser settings to receive alerts.');
      }
    } catch (error) {
      console.error('Could not request notification permission:', error);
      toast.error('Could not enable browser notifications.');
    }
  };

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
        <img src="/balaji-logo.svg" alt="" className="h-9 w-9 rounded-xl shadow-sm" />
        <span className="max-w-[5.5rem] truncate text-[10px] font-bold leading-tight text-brand-800 sm:max-w-28 sm:text-xs">
          {BRAND_FULL_NAME}
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

      <div className="relative">
        <button
          type="button"
          onClick={() => setNotificationsOpen((open) => !open)}
          className="focus-ring tap-transparent relative rounded-lg p-2 text-surface-600 hover:bg-surface-100"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={notificationsOpen}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {notificationsOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              aria-label="Close notifications"
              onClick={() => setNotificationsOpen(false)}
            />
            <section
              aria-label="Notifications"
              className="animate-fade-in absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card-hover"
            >
              <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-surface-900">Notifications</h2>
                  <p className="text-xs text-surface-500">
                    {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllNotificationsRead()}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={() => void enableBrowserNotifications()}
                  className="w-full border-b border-surface-100 bg-brand-50/60 px-4 py-2 text-left text-xs font-medium text-brand-800 hover:bg-brand-50"
                >
                  Enable alerts on this device
                </button>
              )}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-surface-500">
                    Order updates will appear here.
                  </p>
                ) : (
                  notifications.slice(0, 20).map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => void openNotification(notification)}
                      className={`flex w-full items-start gap-3 border-b border-surface-100 px-4 py-3 text-left hover:bg-surface-50 ${
                        notification.readAt ? '' : 'bg-brand-50/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          notification.readAt
                            ? 'bg-surface-100 text-surface-500'
                            : 'bg-brand-100 text-brand-700'
                        }`}
                      >
                        {notification.readAt ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Bell className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-surface-900">
                          {notification.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-surface-600">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-surface-400">
                          {formatDateTime(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
              {DEMO_MODE && (
                <p className="border-t border-surface-100 px-4 py-2 text-[11px] text-surface-400">
                  Demo alerts sync on this device while the app is open.
                </p>
              )}
            </section>
          </>
        )}
      </div>

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
              </div>
              <PWAInstallButton />
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
