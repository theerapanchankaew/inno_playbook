'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';

// ── Inner component ที่ใช้ useSearchParams ต้อง wrap ด้วย Suspense ────────────
function LoginForm() {
  const { signIn, resetPassword, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace(from);
  }, [user, loading, router, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace(from);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (code === 'auth/too-many-requests') {
        setError('พยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่');
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setError('ไม่พบอีเมลนี้ในระบบ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingDot />;

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <span className="logo-badge" style={{ fontSize: '11px', padding: '4px 10px' }}>
          MASCI · ISO 56001
        </span>
        <h1 className="auth-title">Innovation Playbook</h1>
        <p className="auth-sub">Platform สำหรับ Workshop ISO 56001</p>
      </div>

      {!showReset ? (
        <>
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">อีเมล</label>
              <input
                type="email"
                className="auth-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">รหัสผ่าน</label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="auth-footer">
            <button className="auth-link-btn" onClick={() => { setShowReset(true); setError(''); }}>
              ลืมรหัสผ่าน?
            </button>
            <span className="auth-sep">·</span>
            <Link href={ROUTES.AUTH.REGISTER} className="auth-link">สมัครสมาชิกใหม่</Link>
          </div>
        </>
      ) : (
        <>
          <div className="auth-reset-title">
            {resetSent ? '✉️ ส่งอีเมลแล้ว' : '🔑 ตั้งรหัสผ่านใหม่'}
          </div>
          {resetSent ? (
            <p className="auth-sub" style={{ textAlign: 'center', marginTop: 8 }}>
              กรุณาตรวจสอบอีเมล <strong>{resetEmail}</strong> และคลิก Link เพื่อตั้งรหัสผ่านใหม่
            </p>
          ) : (
            <form onSubmit={handleReset} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">อีเมลที่ลงทะเบียนไว้</label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="your@email.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-btn" disabled={submitting}>
                {submitting ? 'กำลังส่ง...' : 'ส่ง Link รีเซ็ตรหัสผ่าน'}
              </button>
            </form>
          )}
          <div className="auth-footer">
            <button className="auth-link-btn" onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}>
              ← กลับไปหน้า Login
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LoadingDot() {
  return (
    <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>กำลังโหลด...</div>
    </div>
  );
}

// ── Page export: wrap LoginForm ด้วย Suspense ─────────────────────────────────
export default function LoginPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<LoadingDot />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
