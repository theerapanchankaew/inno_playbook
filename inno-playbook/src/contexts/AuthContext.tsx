'use client';

import {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { ROUTES } from '@/lib/routes';
import {
  createUserProfile,
  getUserProfile,
  touchLastActive,
  UserProfile,
  hasSuperAdmin,
} from '@/lib/authActions';

// ─── Context Type ──────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Cookie helpers ────────────────────────────────────────────────────────────

const SESSION_KEY = '__inno_session';

function setSessionCookie() {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `${SESSION_KEY}=1; path=/; max-age=${maxAge}; SameSite=Strict`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0; SameSite=Strict`;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ── Load profile helper ──────────────────────────────────────────────────────
  const loadProfile = async (u: User) => {
    let p = await getUserProfile(u.uid);
    if (!p) {
      // Auto-create profile if missing (edge case)
      p = await createUserProfile(u.uid, u.email ?? '', u.displayName ?? 'User');
    } else {
      await touchLastActive(u.uid);
    }
    setProfile(p);
  };

  // ── Listen to Firebase Auth state ────────────────────────────────────────────
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser);
            await loadProfile(firebaseUser);
            setSessionCookie();
          } else {
            setUser(null);
            setProfile(null);
            clearSessionCookie();
          }
        } catch (err) {
          console.error('[AuthContext] auth state handler error:', err);
        } finally {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('[AuthContext] onAuthStateChanged init error:', err);
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  // ── Sign Up ──────────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    setUser(cred.user);
    setSessionCookie();
    // Firestore profile creation is best-effort
    try {
      const hasAdmin = await hasSuperAdmin();
      const role = hasAdmin ? 'member' : 'super_admin';
      const p = await createUserProfile(cred.user.uid, email, displayName);
      if (role === 'super_admin') {
        const { updateUserRole } = await import('@/lib/authActions');
        await updateUserRole(cred.user.uid, 'super_admin');
        setProfile({ ...p, role: 'super_admin' });
      } else {
        setProfile(p);
      }
    } catch (err) {
      console.warn('[AuthContext] createUserProfile failed (check Firestore rules):', err);
      setProfile({
        uid: cred.user.uid,
        email,
        displayName,
        role: 'member',
        createdAt: null,
        lastActive: null,
      });
    }
  };

  // ── Sign In ──────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    setSessionCookie();
    // loadProfile is best-effort — Firestore permission errors must not block login
    try {
      await loadProfile(cred.user);
    } catch (err) {
      console.warn('[AuthContext] loadProfile failed (check Firestore rules):', err);
      setProfile({
        uid: cred.user.uid,
        email: cred.user.email ?? '',
        displayName: cred.user.displayName ?? 'User',
        role: 'member',
        createdAt: null,
        lastActive: null,
      });
    }
  };

  // ── Sign Out ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    clearSessionCookie();
    router.push(ROUTES.AUTH.LOGIN);
  };

  // ── Reset Password ───────────────────────────────────────────────────────────
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // ── Refresh Profile ──────────────────────────────────────────────────────────
  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut, resetPassword, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ─── Role helpers ──────────────────────────────────────────────────────────────

export function isSuperAdmin(profile: UserProfile | null) {
  return profile?.role === 'super_admin';
}

export function canEdit(profile: UserProfile | null) {
  return ['super_admin', 'org_admin', 'facilitator', 'member'].includes(profile?.role ?? '');
}
