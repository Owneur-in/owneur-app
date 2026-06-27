/**
 * Login.js — Seller registration with full name + phone → OTP
 * Passes full_name to edge function so it gets saved to profile
 */
import React, { useState } from 'react'

const FUNCTION_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/quick-worker'
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

export default function Login({ nav, setMobileNumber, showToast, setSellerName }) {
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [nameError, setNameError] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [loading, setLoading] = useState(false)

  function validatePhone(val) {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setMobile(clean)
    if (clean.length > 0 && clean.length < 10) setMobileError('Please enter a valid 10-digit mobile number')
    else setMobileError('')
  }

  function validateName(val) {
    setFullName(val)
    if (!val.trim()) setNameError('Please enter your full name')
    else setNameError('')
  }

  async function sendOTP() {
    let valid = true
    if (!fullName.trim()) { setNameError('Please enter your full name'); valid = false }
    if (!/^\d{10}$/.test(mobile)) { setMobileError('Please enter a valid 10-digit mobile number'); valid = false }
    if (!valid) return
    setLoading(true)
    try {
      // Send full_name along with phone so it gets saved during verify
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ phone: mobile, action: 'send', full_name: fullName.trim() })
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to send OTP')
      setMobileNumber(mobile)
      if (setSellerName) setSellerName(fullName.trim())
      showToast('OTP sent! You will receive a call shortly.')
      nav('otp')
    } catch (err) {
      setMobileError(err.message || 'Could not send OTP. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('landing')}>←</button>
        <span className="topbar-title">List Your Business</span>
      </div>
      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: '#DDF4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>📱</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Create your account</h2>
          <p style={{ color: '#516B61', fontSize: 14 }}>Enter your details to get started</p>
        </div>
        <div className="input-group">
          <label className="input-label">Full Name *</label>
          <input className={nameError ? 'input error' : 'input'} type="text" placeholder="e.g. Priya Sharma" value={fullName} onChange={e => validateName(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOTP()} />
          {nameError && <div className="field-error show">{nameError}</div>}
        </div>
        <div className="input-group">
          <label className="input-label">Mobile Number *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '13px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F2F6F4', whiteSpace: 'nowrap' }}>🇮🇳 +91</div>
            <input className={mobileError ? 'input error' : 'input'} type="tel" placeholder="98765 43210" maxLength={10} value={mobile} onChange={e => validatePhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOTP()} style={{ flex: 1 }} />
          </div>
          {mobileError && <div className="field-error show">{mobileError}</div>}
        </div>
        <button className="btn btn-primary" onClick={sendOTP} disabled={loading} style={{ marginBottom: 20, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Sending OTP...' : 'Send OTP →'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#516B61', lineHeight: 1.6 }}>
          By continuing, you agree to our <span style={{ color: '#0A6B52', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => nav('terms')}>Terms of Service</span>
        </p>
      </div>
    </div>
  )
}
