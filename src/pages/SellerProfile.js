import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function SellerProfile({ nav, user, setUser, showToast }) {
  const [profile, setProfile] = useState(null);
  const [notifOn, setNotifOn] = useState(true);

  useEffect(
    function () {
      if (user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(function (result) {
            setProfile(result.data);
          });
      }
    },
    [user]
  );

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    nav('landing');
  }

  function getInitials() {
    if (!profile || !profile.full_name) return '?';
    return profile.full_name
      .split(' ')
      .map(function (n) {
        return n[0];
      })
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function formatActiveSince() {
    if (!profile || !profile.active_since) return 'Recently';
    return new Date(profile.active_since).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }

  const menuItems = [
    {
      icon: '🪪',
      bg: '#E8F0FB',
      label: 'KYC / Identity Verification',
      sub:
        profile && profile.is_kyc_verified
          ? 'Verified'
          : 'Pending — tap to verify',
      subColor: profile && profile.is_kyc_verified ? '#0A6B52' : null,
      action: function () {
        nav('kyc');
      },
    },
    {
      icon: '👑',
      bg: '#FEF3DC',
      label: 'Upgrade to Premium',
      sub: 'Add more listings at Rs.99/month each',
      action: function () {
        showToast('Payment coming soon!');
      },
    },
    {
      icon: '✏️',
      bg: '#FEF3DC',
      label: 'Edit Profile',
      sub: null,
      action: function () {
        showToast('Edit profile coming soon!');
      },
    },
  ];

  return (
    <div
      style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}
    >
      <div className="topbar">
        <button
          className="back-btn"
          onClick={function () {
            nav('dashboard');
          }}
        >
          ←
        </button>
        <span className="topbar-title">Profile</span>
      </div>

      <div style={{ padding: 20 }}>
        {/* Avatar section */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            className="avatar"
            style={{
              width: 72,
              height: 72,
              fontSize: 24,
              margin: '0 auto 10px',
            }}
          >
            {getInitials()}
          </div>
          <p style={{ fontSize: 18, fontWeight: 700 }}>
            {profile ? profile.full_name : 'Your Name'}
          </p>
          <p style={{ fontSize: 13, color: '#516B61' }}>
            +91 {profile ? profile.phone : ''}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            <span className="pill pill-gray">Free Plan</span>
            {profile && profile.is_kyc_verified && (
              <span className="verified-badge">KYC Verified</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#516B61', marginTop: 6 }}>
            Active since {formatActiveSince()}
          </p>
        </div>

        {/* Digital address */}
        <div className="card" style={{ marginBottom: 12 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#516B61',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            Your Digital Address
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F2F6F4',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: '#0A6B52',
                fontWeight: 500,
                flex: 1,
              }}
            >
              owneur.in/{profile ? profile.phone : ''}
            </span>
            <button
              className="btn btn-sm"
              style={{ padding: '5px 12px' }}
              onClick={function () {
                showToast('Link copied!');
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#516B61', marginTop: 6 }}>
            Share this link with your customers
          </p>
        </div>

        {/* Menu items */}
        <div className="card">
          {menuItems.map(function (item) {
            return (
              <div key={item.label} className="list-item" onClick={item.action}>
                <div className="list-item-icon" style={{ background: item.bg }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">{item.label}</div>
                  {item.sub && (
                    <div
                      className="list-item-sub"
                      style={item.subColor ? { color: item.subColor } : {}}
                    >
                      {item.sub}
                    </div>
                  )}
                </div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>
            );
          })}

          <div
            className="list-item"
            onClick={function () {
              setNotifOn(!notifOn);
              showToast(notifOn ? 'Notifications off' : 'Notifications on');
            }}
          >
            <div className="list-item-icon" style={{ background: '#FEF3DC' }}>
              🔔
            </div>
            <div style={{ flex: 1 }}>
              <div className="list-item-title">Notifications</div>
            </div>
            <div className={notifOn ? 'switch on' : 'switch'}>
              <div className="switch-thumb"></div>
            </div>
          </div>

          <div
            className="list-item"
            onClick={function () {
              nav('faq');
            }}
          >
            <div className="list-item-icon" style={{ background: '#DDF4EC' }}>
              ❓
            </div>
            <div style={{ flex: 1 }}>
              <div className="list-item-title">Help and FAQ</div>
            </div>
            <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
          </div>

          <div
            className="list-item"
            onClick={function () {
              nav('terms');
            }}
          >
            <div className="list-item-icon" style={{ background: '#F1EFE8' }}>
              📄
            </div>
            <div style={{ flex: 1 }}>
              <div className="list-item-title">Terms and Conditions</div>
            </div>
            <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
          </div>

          <div
            className="list-item"
            style={{ borderBottom: 'none' }}
            onClick={signOut}
          >
            <div className="list-item-icon" style={{ background: '#FDEAEA' }}>
              🚪
            </div>
            <div style={{ flex: 1 }}>
              <div className="list-item-title" style={{ color: '#E03535' }}>
                Sign Out
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-bar">
        <button
          className="nav-item"
          onClick={function () {
            nav('dashboard');
          }}
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </button>
        <button
          className="nav-item"
          onClick={function () {
            nav('create');
          }}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          New Listing
        </button>
        <button className="nav-item active">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          Profile
        </button>
      </div>
    </div>
  );
}
