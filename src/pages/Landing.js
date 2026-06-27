/**
 * Landing.js
 * 
 * PURPOSE: First screen users see. Two paths — customer or seller.
 * DESIGN: Full-screen teal gradient, Owneur branding, clean CTAs.
 * CHANGES: New headline, India location, removed clutter.
 * 
 * @param {function} nav - Navigate to another screen
 */
import React from 'react'

export default function Landing({ nav }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #12895F 0%, #064434 55%, #03271E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center'
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, backdropFilter: 'blur(8px)'
        }}>⊙</div>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
          <span style={{ textTransform: 'uppercase' }}>O</span>wneur
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: 24, fontWeight: 800, color: '#fff',
        lineHeight: 1.25, marginBottom: 28, letterSpacing: -0.3,
        maxWidth: 280
      }}>
        Building India's<br />Entrepreneurs
      </h1>

      {/* Location */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 36
      }}>
        <span>📍</span>
        <span>India</span>
      </div>

      {/* CTAs */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="btn"
          style={{
            background: '#fff', color: '#0A6B52',
            borderColor: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
          onClick={() => nav('home')}
        >
          I Need a Service
        </button>

        <button
          className="btn"
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.25)',
            fontSize: 15
          }}
          onClick={() => nav('login')}
        >
          List My Business
        </button>
      </div>

      {/* Admin link — subtle, bottom */}
      <button
        className="btn-ghost"
        style={{ color: 'rgba(255,255,255,0.3)', marginTop: 32, fontSize: 11 }}
        onClick={() => nav('admin-login')}
      >
        Admin →
      </button>
    </div>
  )
}
