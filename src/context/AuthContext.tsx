import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppUser, AuthClaims, BusinessInfo, UserRole } from '@/types';
import { DEMO_MODE } from '@/lib/firebase';
import { DEMO_PASSWORD } from '@/data/seed';
import { usersApi } from '@/services/api';
import { delay, genId, nowIso } from '@/lib/utils';

/**
 * Authentication context.
 *
 * DEMO MODE (default): sessions are validated against the seeded user
 * directory and persisted in localStorage. Role "custom claims" are derived
 * from the AppUser record.
 *
 * LIVE MODE: wire `onAuthStateChanged` + `getIdTokenResult()` to read the real
 * Firebase custom claims. The public surface of this context stays identical,
 * so no consuming component needs to change. See the commented block below.
 */

interface RegisterInput {
  email: string;
  business: BusinessInfo;
  licenseFileName?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  claims: AuthClaims | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AppUser>;
  register: (input: RegisterInput) => Promise<AppUser>;
  /** Simulates the "set password after admin approval" email flow. */
  setPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = 'agriflow.session.uid';

function claimsFor(user: AppUser): AuthClaims {
  return {
    role: user.role,
    staffFunction: user.staffFunction,
    status: user.status,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      if (DEMO_MODE) {
        const uid = window.localStorage.getItem(SESSION_KEY);
        if (uid) {
          const found = await usersApi.getById(uid);
          if (active && found) setUser(found);
        }
        if (active) setLoading(false);
      } else {
        // --- LIVE MODE (reference implementation) --------------------------
        // import { auth } from '@/lib/firebase';
        // import { onAuthStateChanged } from 'firebase/auth';
        // return onAuthStateChanged(auth!, async (fbUser) => {
        //   if (!fbUser) { setUser(null); setLoading(false); return; }
        //   const token = await fbUser.getIdTokenResult(true);
        //   const profile = await usersApi.getById(fbUser.uid);
        //   setUser(profile ?? null); // token.claims carries role/status
        //   setLoading(false);
        // });
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    // LIVE: await signInWithEmailAndPassword(auth!, email, password)
    const found = await usersApi.getByEmail(email);
    if (!found) throw new Error('No account found for that email.');
    if (password !== DEMO_PASSWORD) {
      throw new Error('Incorrect password. (Demo password: demo1234)');
    }
    if (found.status === 'PENDING_APPROVAL') {
      throw new Error('Your account is awaiting admin approval.');
    }
    if (found.status === 'REJECTED') {
      throw new Error('Your registration was not approved. Contact support.');
    }
    if (found.status === 'SUSPENDED') {
      throw new Error('This account is suspended.');
    }
    window.localStorage.setItem(SESSION_KEY, found.uid);
    setUser(found);
    return found;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setError(null);
    const existing = await usersApi.getByEmail(input.email);
    if (existing) throw new Error('An account with that email already exists.');
    const newUser: AppUser = {
      uid: genId('retailer'),
      email: input.email,
      role: 'retailer',
      status: 'PENDING_APPROVAL',
      business: input.business,
      retailer: {
        creditLimit: 0,
        outstandingBalance: 0,
        priceTier: 'STANDARD',
        licenseFileName: input.licenseFileName,
      },
      createdAt: nowIso(),
    };
    await usersApi.createRetailer(newUser);
    return newUser;
  }, []);

  const setPassword = useCallback(async (email: string, _password: string) => {
    // In live mode this consumes the Firebase password-reset/action code and
    // calls confirmPasswordReset(auth!, oobCode, password). In demo mode we
    // just validate the account is approved.
    const found = await usersApi.getByEmail(email);
    if (!found) throw new Error('No account found for that email.');
    if (found.status !== 'ACTIVE') {
      throw new Error('This account is not approved yet.');
    }
    await delay(undefined, 300);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
    // LIVE: signOut(auth!)
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const fresh = await usersApi.getById(user.uid);
    if (fresh) setUser(fresh);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      claims: user ? claimsFor(user) : null,
      role: user?.role ?? null,
      loading,
      error,
      login,
      register,
      setPassword,
      logout,
      refresh,
    }),
    [user, loading, error, login, register, setPassword, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
