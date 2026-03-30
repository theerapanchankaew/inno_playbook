'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/routes';

export default function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ถ้า login อยู่แล้ว → redirect
  useEffect(() => {
    if (!loading && user) router.replace(ROUTES.HOME);
  }, [user, loading, router]);

  const validate = () => {
    if (!displayName.trim()) return 'กรุณากรอกชื่อ-นามสกุล';
    if (!email.includes('@')) return 'รูปแบบอีเมลไม่ถูกต้อง';
    if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (password !== confirm) return 'รหัสผ่านไม่ตรงกัน';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      await signUp(email.trim().toLowerCase(), password, displayName.trim());
      router.replace(ROUTES.HOME);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น');
      } else if (code === 'auth/weak-password') {
        setError('รหัสผ่านไม่ปลอดภัยเพียงพอ');
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : 3;
  const strengthLabel = ['', 'อ่อนแอ', 'ปานกลาง', 'แข็งแกร่ง'][strength];
  const strengthColor = ['', '#B91C1C', '#D97706', '#15803D'][strength];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-badge" style={{ fontSize: '11px', padding: '4px 10px' }}>
            MASCI · ISO 56001
          </span>
          <h1 className="auth-title">สมัครสมาชิก</h1>
          <p className="auth-sub">สร้างบัญชีเพื่อเข้าใช้ Innovation Playbook Platform</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">ชื่อ-นามสกุล</label>
            <input
              type="text"
              className="auth-input"
              placeholder="ชื่อ นามสกุล"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">อีเมล</label>
            <input
              type="email"
              className="auth-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">รหัสผ่าน</label>
            <input
              type="password"
              className="auth-input"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(strength / 3) * 100}%`,
                    height: '100%',
                    background: strengthColor,
                    borderRadius: 2,
                    transition: 'width .3s, background .3s',
                  }} />
                </div>
                <span style={{ fontSize: 10, color: strengthColor, fontFamily: 'var(--mono)', minWidth: 52 }}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label">ยืนยันรหัสผ่าน</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {confirm.length > 0 && password !== confirm && (
              <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, display: 'block' }}>
                รหัสผ่านไม่ตรงกัน
              </span>
            )}
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
          </button>
        </form>

        <div className="auth-footer">
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>มีบัญชีอยู่แล้ว?</span>
          <Link href={ROUTES.AUTH.LOGIN} className="auth-link">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}
