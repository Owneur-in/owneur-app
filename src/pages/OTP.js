import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';

export default function OTP({ nav, mobileNumber, setUser, showToast }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    refs[0].current?.focus();
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleDigit(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');
    if (value && index < 3) refs[index + 1].current?.focus();
    if (index === 3 && value) verifyWithDigits(newDigits);
  }

  function handleKey(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  async function verifyWithDigits(d) {
    const otp = d.join('');
    if (otp.length < 4) return;
    if (attempts >= 3) {
      setError('Too many attempts. Please request a new OTP.');
      return;
    }
    setLoading(true);
    try {
      const phone = '+91' + mobileNumber;
      const { data, error: err } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (err) throw err;
      setUser(data.user);
      showToast('Verified successfully!');
      nav('kyc');
    } catch (err) {
      setAttempts((a) => a + 1);
      const remaining = 2 - attempts;
      setError(
        remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${
              remaining === 1 ? '' : 's'
            } remaining.`
          : 'Too many incorrect attempts. Request a new OTP.'
      );
      setDigits(['', '', '', '']);
      refs[0].current?.focus();
    }
    setLoading(false);
  }

  async function resendOTP() {
    if (!canResend) return;
    try {
      await supabase.auth.signInWithOtp({ phone: '+91' + mobileNumber });
      showToast('OTP resent!');
      setCountdown(30);
      setCanResend(false);
      setAttempts(0);
      setError('');
    } catch {
      showToast('Failed to resend. Try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('login')}>
          ←
        </button>
        <span className="topbar-title">Verify OTP</span>
      </div>

      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#DDF4EC',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 14px',
            }}
          >
            🔐
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            Enter the 4-digit OTP
          </h2>
          <p style={{ color: '#516B61', fontSize: 14 }}>
            Sent to +91 {mobileNumber?.slice(0, 5)}XXXXX
          </p>
        </div>

        {/* OTP boxes */}
        <div className="otp-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              className={`otp-box ${error ? 'error' : ''}`}
              type="tel"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
            />
          ))}
        </div>

        {error && (
          <div
            style={{
              color: '#E03535',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={() => verifyWithDigits(digits)}
          disabled={loading || digits.join('').length < 4}
          style={{ marginBottom: 16, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Verifying...' : 'Verify & Continue'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#516B61' }}>
          Did not receive OTP?{' '}
          {canResend ? (
            <span
              style={{ color: '#0A6B52', fontWeight: 600, cursor: 'pointer' }}
              onClick={resendOTP}
            >
              Resend OTP
            </span>
          ) : (
            <span style={{ color: '#0A6B52', fontWeight: 600 }}>
              Resend in 0:{countdown < 10 ? '0' + countdown : countdown}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
