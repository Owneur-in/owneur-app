/**
 * BuyerLogin.js — Buyer account creation.
 * Collects name + phone + OTP for buyers.
 * After login, buyer profile is saved so location and saves persist.
 * Accessible from Home screen's "Log in" prompt.
 */
import React, { useState } from 'react'
import { supabase } from '../supabase'

const FUNCTION_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/quick-worker'
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

export default function BuyerLogin({ nav, setUser, showToast, setMobileNumber, setSellerName }) {
  const [step, setStep] = useState('phone')
  const [mobile, setMobile] = useState('')
  const [fullName, setFullName] = useState('')
  const [digits, setDigits] = useState(['', '', '', ''])
  const [mobileError, setMobileError] = useState('')
  const [nameError, setNameError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExisting, setIsExisting] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)

  const refs = [
    React.useRef(), React.useRef(),
    React.useRef(), React.useRef()
  ]

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

  function validatePhone(val) {
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setMobile(clean)
    if (clean.length > 0 && clean.length < 10) {
      setMobileError('Please enter a valid 10-digit number')
    } else {
      setMobileError('')
    }
  }

  async function sendOTP() {
    if (!/^\d{10}$/.test(mobile)) {
      setMobileError('Please enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ phone: mobile, action: 'send' })
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to send OTP')

      setMobileNumber(mobile)
      showToast('OTP sent! You will receive a call.')

      if (data.is_existing_user && data.existing_name) {
        setFullName(data.existing_name)
        setIsExisting(true)
        setStep('otp')
      } else {
        setIsExisting(false)
        setStep('name')
      }
      startCountdown()
    } catch (err) {
      setMobileError(err.message || 'Could not send OTP. Please try again.')
    }
    setLoading(false)
  }

  function handleNameNext() {
    if (!fullName.trim()) { setNameError('Please enter your name'); return }
    setStep('otp')
  }

  function handleDigit(index, value) {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setOtpError('')
    if (value && index < 3) refs[index + 1].current?.focus()
    if (index === 3 && value) verifyOTP(newDigits)
  }

  function handleKey(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  async function verifyOTP(d) {
    const otpString = (d || digits).join('')
    if (otpString.length < 4) { setOtpError('Please enter the 4-digit OTP'); return }
    setLoading(true)
    setOtpError('')
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({
          phone: mobile,
          action: 'verify',
          otp_entered: otpString,
          full_name: fullName.trim()
        })
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Verification failed')

      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      })
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData?.user)
      if (setSellerName) setSellerName(fullName.trim())

      showToast('Welcome to Owneur!')
      nav('home')
    } catch (err) {
      setOtpError(err.message || 'Incorrect OTP. Please try again.')
      setDigits(['', '', '', ''])
      setTimeout(() => refs[0].current?.focus(), 100)
    }
    setLoading(false)
  }

  async function resendOTP() {
    if (!canResend) return
    setDigits(['', '', '', ''])
    setOtpError('')
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({ phone: mobile, action: 'send', full_name: fullName })
      })
      const data = await res.json()
      if (!data?.success) throw new Error('Failed to resend')
      showToast('OTP resent!')
      startCountdown()
    } catch { showToast('Could not resend. Try again.') }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => {
          if (step === 'otp') setStep(isExisting ? 'phone' : 'name')
          else if (step === 'name') setStep('phone')
          else nav('home')
        }}>←</button>
        <span className="topbar-title">Create Account</span>
      </div>

      <div style={{ padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: '#DDF4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px' }}>
            {step === 'phone' ? '👤' : step === 'name' ? '✏️' : '🔐'}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            {step === 'phone' ? 'Enter your mobile number'
              : step === 'name' ? 'What is your name?'
              : 'Enter the 4-digit OTP'}
          </h2>
          <p style={{ color: '#516B61', fontSize: 14 }}>
            {step === 'phone' ? 'To save your favourites and connect with sellers'
              : step === 'name' ? 'This helps sellers know who is reaching out'
              : 'Sent to +91 ' + mobile.slice(0, 5) + 'XXXXX'}
          </p>
        </div>

        {step === 'phone' && (
          <>
            <div className="input-group">
              <label className="input-label">Mobile Number *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '13px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F2F6F4', whiteSpace: 'nowrap' }}>
                  🇮🇳 +91
                </div>
                <input className={mobileError ? 'input error' : 'input'} type="tel" placeholder="98765 43210"
                  maxLength={10} value={mobile} onChange={e => validatePhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()} style={{ flex: 1 }} autoFocus />
              </div>
              {mobileError && <div className="field-error show">{mobileError}</div>}
            </div>
            <button className="btn btn-primary" onClick={sendOTP} disabled={loading || mobile.length !== 10}
              style={{ marginBottom: 16, opacity: loading || mobile.length !== 10 ? 0.7 : 1 }}>
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
            <button className="btn-ghost" style={{ width: '100%', textAlign: 'center', color: '#516B61' }}
              onClick={() => nav('home')}>
              Continue as Guest
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <div style={{ background: '#F2F6F4', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📱</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>+91 {mobile.slice(0, 5)}XXXXX</span>
              <button onClick={() => setStep('phone')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#0A6B52', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Change</button>
            </div>
            <div className="input-group">
              <label className="input-label">Your Name *</label>
              <input className={nameError ? 'input error' : 'input'} type="text" placeholder="e.g. Priya"
                value={fullName} onChange={e => { setFullName(e.target.value); setNameError('') }}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()} autoFocus />
              {nameError && <div className="field-error show">{nameError}</div>}
            </div>
            <button className="btn btn-primary" onClick={handleNameNext}>Continue →</button>
          </>
        )}

        {step === 'otp' && (
          <>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#516B61', marginBottom: 4 }}>
              You will receive a voice call with your OTP
            </p>
            <div className="otp-row">
              {digits.map((d, i) => (
                <input key={i} ref={refs[i]} className={otpError ? 'otp-box error' : 'otp-box'}
                  type="tel" maxLength={1} value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKey(i, e)} />
              ))}
            </div>
            {otpError && <div style={{ color: '#E03535', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{otpError}</div>}
            <button className="btn btn-primary" onClick={() => verifyOTP(digits)}
              disabled={loading || digits.join('').length < 4}
              style={{ marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : 'Verify and Continue'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#516B61' }}>
              Did not receive?{' '}
              {canResend
                ? <span style={{ color: '#0A6B52', fontWeight: 600, cursor: 'pointer' }} onClick={resendOTP}>Resend OTP</span>
                : <span style={{ color: '#0A6B52', fontWeight: 600 }}>Resend in 0:{countdown < 10 ? '0' + countdown : countdown}</span>
              }
            </p>
          </>
        )}
      </div>
    </div>
  )
}
