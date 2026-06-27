/**
 * Landing.js — First screen. Owneur branding with correct font hierarchy.
 * Logo: large and bold. Headline: smaller. Clean, no clutter.
 */
import React from 'react'

export default function Landing({ nav }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #12895F 0%, #064434 55%, #03271E 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>

      {/* Logo — large, prominent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 58, height: 58,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
        }}>⊙</div>
        <span style={{
          fontSize: 42,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: -2,
          lineHeight: 1
        }}>
          <span style={{ textTransform: 'uppercase' }}>O</span>wneur
        </span>
      </div>

      {/* Headline — smaller than logo, purposeful */}
      <h1 style={{
        fontSize: 18,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1.4,
        marginBottom: 28,
        maxWidth: 260,
        letterSpacing: 0.2
      }}>
        Building India's Entrepreneurs
      </h1>

      {/* Location */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13, marginBottom: 40
      }}>
        <span>📍</span>
        <span>India</span>
      </div>

      {/* CTAs */}
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="btn"
          style={{
            background: '#fff', color: '#0A6B52',
            borderColor: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            letterSpacing: 0.1
          }}
          onClick={() => nav('home')}
        >
          I Need a Service
        </button>
        <button
          className="btn"
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.2)',
            fontSize: 15,
            fontWeight: 500
          }}
          onClick={() => nav('login')}
        >
          List My Business
        </button>
      </div>

      <button
        className="btn-ghost"
        style={{ color: 'rgba(255,255,255,0.25)', marginTop: 36, fontSize: 11 }}
        onClick={() => nav('admin-login')}
      >
        Admin →
      </button>
    </div>
  )
}
