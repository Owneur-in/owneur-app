import React from 'react';

export default function Landing({ nav }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(160deg, #12895F 0%, #064434 55%, #03271E 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            backdropFilter: 'blur(8px)',
          }}
        >
          ⊙
        </div>
        <span
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: -1,
          }}
        >
          owneur
        </span>
      </div>

      {/* Headline */}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.25,
          marginBottom: 10,
          letterSpacing: -0.3,
        }}
      >
        Turn Your Skill
        <br />
        Into Income
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.75)',
          marginBottom: 10,
          lineHeight: 1.6,
        }}
      >
        Find trusted local entrepreneurs or start
        <br />
        your own business in minutes.
      </p>

      {/* Location */}
      <div
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '6px 14px',
          borderRadius: 20,
          color: 'rgba(255,255,255,0.9)',
          fontSize: 12,
          marginBottom: 36,
        }}
      >
        📍 Chennai, Tamil Nadu
      </div>

      {/* CTAs */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          className="btn"
          style={{
            background: '#fff',
            color: '#0A6B52',
            borderColor: '#fff',
            fontSize: 15,
            fontWeight: 700,
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
            fontSize: 14,
          }}
          onClick={() => nav('login')}
        >
          List My Business · Free →
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          marginTop: 28,
        }}
      >
        {[
          ['1,200+', 'Makers'],
          ['12', 'Categories'],
          ['4.7★', 'Avg Rating'],
        ].map(([num, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
              {num}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.55)',
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Admin link */}
      <button
        className="btn-ghost"
        style={{ color: 'rgba(255,255,255,0.35)', marginTop: 20, fontSize: 11 }}
        onClick={() => nav('admin-login')}
      >
        Admin →
      </button>
    </div>
  );
}
