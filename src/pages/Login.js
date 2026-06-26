import React, { useState } from 'react'

const FUNCTION_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/quick-worker'
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

export default function Login({ nav, setMobileNumber, showToast }) {
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(val) {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setMobile(clean)
    if (clean.length > 0 && clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number')
    } else {
      setError('')
    }
  }

  async function sendOTP() {
    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY
        },
        body: JSON.stringify({ phone: mobile, action: 'send' })
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to send OTP')
      setMobileNumber(mobile)
      showToast('OTP sent! You will receive a call shortly.')
      nav('otp')
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button className="back-btn" onClick={function() { nav('landing') }}>←</button>
        <span className="topbar-title">List Your Business</span>
      </div>
      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: '#DDF4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>📱</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Enter your mobile number</h2>
          <p style={{ color: '#516B61', fontSize: 14 }}>You will receive a 4-digit OTP via call</p>
        </div>
        <div className="input-group">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '13px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F2F6F4', color: '#0D1F18', whiteSpace: 'nowrap' }}>🇮🇳 +91</div>
            <input
              className={error ? 'input error' : 'input'}
              type="tel"
              placeholder="98765 43210"
              maxLength={10}
              value={mobile}
              onChange={function(e) { validate(e.target.value) }}
              onKeyDown={function(e) { if (e.key === 'Enter') sendOTP() }}
              style={{ flex: 1 }}
            />
          </div>
          {error && <div className="field-error show">{error}</div>}
        </div>
        <button
          className="btn btn-primary"
          onClick={sendOTP}
          disabled={loading || mobile.length !== 10}
          style={{ marginBottom: 20, opacity: loading || mobile.length !== 10 ? 0.7 : 1 }}
        >
          {loading ? 'Sending OTP...' : 'Send OTP →'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#516B61', lineHeight: 1.6 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#0A6B52', textDecoration: 'underline', cursor: 'pointer' }} onClick={function() { nav('terms') }}>Terms of Service</span>
        </p>
      </div>
    </div>
  )
}