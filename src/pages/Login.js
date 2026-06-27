/**
 * Login.js
 * Smart login: enter phone → send OTP → if existing user, show saved name.
 * If new user, ask for name. Phone is unique identifier.
 */
import React, { useState } from 'react'

const FUNCTION_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/quick-worker'
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

export default function Login({ nav, setMobileNumber, showToast, setSellerName }) {
  const [step, setStep] = useState('phone') // 'phone' | 'name'
  const [mobile, setMobile] = useState('')
  const [fullName, setFullName] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExistingUser, setIsExistingUser] = useState(false)

  function validatePhone(val) {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setMobile(clean)
    if (clean.length > 0 && clean.length < 10) {
      setMobileError('Please enter a valid 10-digit mobile number')
    } else {
      setMobileError('')
    }
  }

  async function handlePhoneNext() {
    if (!/^\d{10}$/.test(mobile)) {
      setMobileError('Please enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ phone: mobile, action: 'send' })
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to send OTP')

      setMobileNumber(mobile)
      showToast('OTP sent! You will receive a call shortly.')

      if (data.is_existing_user && data.existing_name) {
        // Known user — prefill their name, skip name step
        setFullName(data.existing_name)
        setIsExistingUser(true)
        if (setSellerName) setSellerName(data.existing_name)
        nav('otp')
      } else {
        // New user — ask for name
        setIsExistingUser(false)
        setStep('name')
      }
    } catch (err) {
      setMobileError(err.message || 'Could not send OTP. Please try again.')
    }
    setLoading(false)
  }

  function handleNameNext() {
    if (!fullName.trim()) { setNameError('Please enter your full name'); return }
    if (setSellerName) setSellerName(fullName.trim())
    nav('otp')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => step === 'name' ? setStep('phone') : nav('landing')}>←</button>
        <span className="topbar-title">List Your Business</span>
      </div>

      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: '#DDF4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>
            {step === 'phone' ? '📱' : '👤'}
          </div>
          {step === 'phone' ? (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Enter your mobile number</h2>
              <p style={{ color: '#516B61', fontSize: 14 }}>We will verify your number with an OTP</p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>What is your name?</h2>
              <p style={{ color: '#516B61', fontSize: 14 }}>This will appear on your business listing</p>
            </>
          )}
        </div>

        {step === 'phone' && (
          <>
            <div className="input-group">
              <label className="input-label">Mobile Number *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '13px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F2F6F4', whiteSpace: 'nowrap' }}>
                  🇮🇳 +91
                </div>
                <input
                  className={mobileError ? 'input error' : 'input'}
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={mobile}
                  onChange={e => validatePhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneNext()}
                  style={{ flex: 1 }}
                  autoFocus
                />
              </div>
              {mobileError && <div className="field-error show">{mobileError}</div>}
            </div>
            <button
              className="btn btn-primary"
              onClick={handlePhoneNext}
              disabled={loading || mobile.length !== 10}
              style={{ marginBottom: 20, opacity: loading || mobile.length !== 10 ? 0.7 : 1 }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <div style={{ background: '#F2F6F4', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📱</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>+91 {mobile.slice(0,5)}XXXXX</span>
              <button onClick={() => setStep('phone')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#0A6B52', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Change</button>
            </div>
            <div className="input-group">
              <label className="input-label">Your Full Name *</label>
              <input
                className={nameError ? 'input error' : 'input'}
                type="text"
                placeholder="e.g. Priya Sharma"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setNameError('') }}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                autoFocus
              />
              {nameError && <div className="field-error show">{nameError}</div>}
            </div>
            <button className="btn btn-primary" onClick={handleNameNext} style={{ marginBottom: 20 }}>
              Continue →
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#516B61', lineHeight: 1.6 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#0A6B52', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => nav('terms')}>
            Terms of Service
          </span>
        </p>
      </div>
    </div>
  )
}
