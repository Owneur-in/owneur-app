/**
 * OTP.js — Verify 4-digit OTP received via voice call.
 * Passes full_name during verify so profile gets created correctly.
 */
import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const FUNCTION_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/quick-worker'
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

export default function OTP({ nav, mobileNumber, setUser, showToast, sellerName }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const refs = [useRef(), useRef(), useRef(), useRef()]

  useEffect(() => {
    setTimeout(() => { if (refs[0].current) refs[0].current.focus() }, 300)
    startCountdown()
  }, [])

  function startCountdown() {
    setCountdown(30)
    setCanResend(false)
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); setCanResend(true); return 0 }
        return c - 1
      })
    }, 1000)
  }

  function handleDigit(index, value) {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError('')
    if (value && index < 3) refs[index + 1].current?.focus()
    if (index === 3 && value) verifyOTP(newDigits)
  }

  function handleKey(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) refs[index - 1].current?.focus()
  }

  async function verifyOTP(d) {
    const otpString = (d || digits).join('')
    if (otpString.length < 4) { setError('Please enter the complete 4-digit OTP'); return }
    setLoading(true)
    setError('')
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({
          phone: mobileNumber,
          action: 'verify',
          otp_entered: otpString,
          full_name: sellerName || '' // pass name so profile gets saved
        })
      })
      const data = await response.json()
      if (!data?.success) throw new Error(data?.error || 'Verification failed')
      if (data.access_token) {
        await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
        const { data: userData } = await supabase.auth.getUser()
        setUser(userData?.user)
      }
      showToast('Verified successfully!')
      nav('kyc')
    } catch (err) {
      setError(err.message || 'Incorrect OTP. Please try again.')
      setDigits(['', '', '', ''])
      setTimeout(() => { if (refs[0].current) refs[0].current.focus() }, 100)
    }
    setLoading(false)
  }

  async function resendOTP() {
    if (!canResend) return
    setDigits(['', '', '', ''])
    setError('')
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ phone: mobileNumber, action: 'send', full_name: sellerName || '' })
      })
      const data = await response.json()
      if (!data?.success) throw new Error('Failed to resend')
      showToast('OTP resent! You will receive a call shortly.')
      startCountdown()
    } catch { showToast('Could not resend. Please try again.') }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('login')}>←</button>
        <span className="topbar-title">Verify OTP</span>
      </div>
      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: '#DDF4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Enter the 4-digit OTP</h2>
          <p style={{ color: '#516B61', fontSize: 14 }}>Sent to +91 {mobileNumber ? mobileNumber.slice(0, 5) + 'XXXXX' : ''}</p>
          <p style={{ color: '#516B61', fontSize: 12, marginTop: 4 }}>You will receive a voice call with your OTP</p>
        </div>
        <div className="otp-row">
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]} className={error ? 'otp-box error' : 'otp-box'} type="tel" maxLength={1} value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
            />
          ))}
        </div>
        {error && <div style={{ color: '#E03535', fontSize: 13, textAlign: 'center', marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}
        <button className="btn btn-primary" onClick={() => verifyOTP(digits)} disabled={loading || digits.join('').length < 4} style={{ marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Verifying...' : 'Verify and Continue'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#516B61' }}>
          Did not receive OTP?{' '}
          {canResend
            ? <span style={{ color: '#0A6B52', fontWeight: 600, cursor: 'pointer' }} onClick={resendOTP}>Resend OTP</span>
            : <span style={{ color: '#0A6B52', fontWeight: 600 }}>Resend in 0:{countdown < 10 ? '0' + countdown : countdown}</span>
          }
        </p>
      </div>
    </div>
  )
}
