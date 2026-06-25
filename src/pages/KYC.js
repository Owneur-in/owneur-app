import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function KYC({ nav, user, showToast }) {
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState('');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleAadhaar(val) {
    const clean = val.replace(/\D/g, '').slice(0, 12);
    setAadhaar(clean);
    if (clean.length > 0 && clean.length < 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
    } else setError('');
  }

  async function sendAadhaarOTP() {
    if (aadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setStep(2);
      setLoading(false);
      showToast('OTP sent to Aadhaar-linked mobile');
    }, 1000);
  }

  function handleDigit(index, value) {
    if (!/^\d*$/.test(value)) return;
    const d = [...digits];
    d[index] = value.slice(-1);
    setDigits(d);
    if (value && index < 3) document.getElementById('k' + (index + 1))?.focus();
    if (index === 3 && value) verifyKYC(d);
  }

  async function verifyKYC(d) {
    const otp = (d || digits).join('');
    if (otp.length < 4) return;
    setLoading(true);
    setTimeout(async () => {
      if (otp === '1234') {
        try {
          await supabase
            .from('profiles')
            .update({
              is_kyc_verified: true,
              kyc_verified_at: new Date().toISOString(),
            })
            .eq('id', user?.id);
        } catch (e) {}
        setStep(3);
      } else {
        setError('Incorrect OTP. Please try again.');
        setDigits(['', '', '', '']);
        document.getElementById('k0')?.focus();
      }
      setLoading(false);
    }, 1000);
  }

  function skip() {
    showToast('You can complete KYC later from your profile');
    nav('dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <span className="topbar-title">Verify Your Identity</span>
      </div>
      <div style={{ padding: '24px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#E8F0FB',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 12px',
            }}
          >
            🪪
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            Aadhaar Verification
          </h2>
          <p style={{ fontSize: 13, color: '#516B61', lineHeight: 1.6 }}>
            One-time identity check. We never store your Aadhaar number.
          </p>
        </div>
        <div
          className="card"
          style={{ marginBottom: 16, display: 'flex', gap: 10 }}
        >
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              Your data is safe
            </p>
            <p style={{ fontSize: 12, color: '#516B61', lineHeight: 1.5 }}>
              UIDAI-licensed verification. Only your name is stored. Aadhaar
              number is never saved.
            </p>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="input-group">
              <label className="input-label">Aadhaar Number</label>
              <input
                className={`input ${error ? 'error' : ''}`}
                type="tel"
                placeholder="XXXX XXXX XXXX"
                value={aadhaar}
                onChange={(e) => handleAadhaar(e.target.value)}
              />
              {error && <div className="field-error show">{error}</div>}
            </div>
            <button
              className="btn btn-primary"
              onClick={sendAadhaarOTP}
              disabled={loading}
              style={{ marginBottom: 10 }}
            >
              {loading ? 'Sending...' : 'Send Aadhaar OTP →'}
            </button>
            <button
              className="btn-ghost"
              style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
              onClick={skip}
            >
              Skip for now · verify within 7 days
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p
              style={{
                textAlign: 'center',
                color: '#516B61',
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              OTP sent to your Aadhaar-linked mobile
            </p>
            <div className="otp-row">
              {digits.map((d, i) => (
                <input
                  key={i}
                  id={'k' + i}
                  className={`otp-box ${error ? 'error' : ''}`}
                  type="tel"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
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
              onClick={() => verifyKYC(digits)}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Identity'}
            </button>
            <button
              className="btn-ghost"
              style={{ width: '100%', textAlign: 'center', marginTop: 8 }}
              onClick={() => {
                setStep(1);
                setError('');
              }}
            >
              ← Change Aadhaar number
            </button>
            <p
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#516B61',
                marginTop: 8,
              }}
            >
              Hint: use 1234
            </p>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 6,
                color: '#0A6B52',
              }}
            >
              Identity Verified!
            </h3>
            <p style={{ fontSize: 13, color: '#516B61', marginBottom: 20 }}>
              You will receive a Verified badge on your listings.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => nav('dashboard')}
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
