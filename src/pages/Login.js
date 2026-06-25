import React, { useState } from 'react';

export default function Login({ nav, setMobileNumber, showToast }) {
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(val) {
    setMobile(val);
    if (val.length > 0 && (!/^\d+$/.test(val) || val.length < 10)) {
      setError('Please enter a valid 10-digit mobile number');
    } else {
      setError('');
    }
  }

  async function sendOTP() {
    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      setMobileNumber(mobile);
      nav('otp');
      showToast('OTP sent to +91 ' + mobile);
    } catch (err) {
      showToast('Failed to send OTP. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('landing')}>
          ←
        </button>
        <span className="topbar-title">List Your Business</span>
      </div>

      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
            📱
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            Enter your mobile number
          </h2>
          <p style={{ color: '#516B61', fontSize: 14 }}>
            We will send a 4-digit OTP to verify
          </p>
        </div>

        {/* Mobile input */}
        <div className="input-group">
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              style={{
                padding: '13px 14px',
                border: '1.5px solid rgba(0,0,0,0.12)',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                background: '#F2F6F4',
                color: '#0D1F18',
                whiteSpace: 'nowrap',
              }}
            >
              🇮🇳 +91
            </div>
            <input
              className={`input ${error ? 'error' : ''}`}
              type="tel"
              placeholder="98765 43210"
              maxLength={10}
              value={mobile}
              onChange={(e) => validate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
              style={{ flex: 1 }}
            />
          </div>
          {error && <div className="field-error show">{error}</div>}
        </div>

        <button
          className="btn btn-primary"
          onClick={sendOTP}
          disabled={loading}
          style={{ marginBottom: 20, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Sending...' : 'Send OTP →'}
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#516B61',
            lineHeight: 1.6,
          }}
        >
          By continuing, you agree to our{' '}
          <span
            style={{
              color: '#0A6B52',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onClick={() => nav('terms')}
          >
            Terms of Service
          </span>
        </p>
      </div>
    </div>
  );
}
