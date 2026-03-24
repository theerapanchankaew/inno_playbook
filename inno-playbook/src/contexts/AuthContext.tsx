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

    // First ever user → super_admin, others → member
    const hasAdmin = await hasSuperAdmin();
    const role = hasAdmin ? 'member' : 'super_admin';

    const p = await createUserProfile(cred.user.uid, email, displayName);
    if (role === 'super_admin') {
      // Import dynamically to avoid circular deps
      const { updateUserRole } = await import('@/lib/authActions');
      await updateUserRole(cred.user.uid, 'super_admin');
      setProfile({ ...p, role: 'super_admin' });
    } else {
      setProfile(p);
    }
    setUser(cred.user);
    setSessionCookie();
  };

  // ── Sign In ──────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    await loadProfile(cred.user);
    setSessionCookie();
  };

  // ── Sign Out ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    clearSessionCookie();
    router.push('/auth/login');
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
