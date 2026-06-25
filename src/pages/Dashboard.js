import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CAT_EMOJI = {
  'Home Food': '🍱',
  Tiffin: '🥡',
  Mehendi: '🌸',
  Bakery: '🎂',
  Tailoring: '✂️',
  Tuition: '📚',
  Beautician: '💄',
  Electrician: '⚡',
  Fruits: '🍎',
  Flowers: '💐',
  Freelance: '💻',
  Others: '🔧',
};

export default function Dashboard({ nav, user, showToast }) {
  const [profile, setProfile] = useState(null);
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [bizActive, setBizActive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(
    function () {
      if (user) loadData();
    },
    [user]
  );

  async function loadData() {
    setLoading(true);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(prof);

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (biz) {
        setBusiness(biz);
        setBizActive(biz.is_active);

        const { data: revs } = await supabase
          .from('reviews')
          .select('*, profiles(full_name)')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false })
          .limit(3);
        setReviews(revs || []);
      }
    } catch (e) {
      console.log('Load error:', e);
    }
    setLoading(false);
  }

  async function toggleActive() {
    if (!business) return;
    const newVal = !bizActive;
    setBizActive(newVal);
    await supabase
      .from('businesses')
      .update({ is_active: newVal })
      .eq('id', business.id);
    showToast(
      newVal
        ? 'Your listing is now visible to customers'
        : 'Your listing is now hidden'
    );
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

  function formatDate(dateStr) {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: '#516B61' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⊙</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}
    >
      <div className="topbar">
        <span className="topbar-title">My Dashboard</span>
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={function () {
            nav('create');
          }}
        >
          + New Listing
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Profile card */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div
            className="avatar"
            style={{ width: 48, height: 48, fontSize: 16 }}
          >
            {getInitials()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>
              {profile ? profile.full_name : 'Your Name'}
            </p>
            <p style={{ fontSize: 12, color: '#516B61' }}>
              +91 {profile ? profile.phone : ''}
            </p>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              <span className="pill pill-gray">Free Plan</span>
              {profile && profile.is_kyc_verified && (
                <span className="verified-badge">Verified</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="section-label">This Month</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num">{business ? business.views : 0}</div>
            <div className="stat-label">Profile Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">
              {business ? business.whatsapp_clicks : 0}
            </div>
            <div className="stat-label">WhatsApp Clicks</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">
              {business ? business.call_clicks : 0}
            </div>
            <div className="stat-label">Call Clicks</div>
          </div>
        </div>

        {/* My Listing */}
        <div className="section-label">My Listing</div>

        {business ? (
          <div
            style={{
              background: '#fff',
              border: '0.5px solid rgba(0,0,0,0.07)',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                height: 100,
                background: 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
              }}
            >
              {CAT_EMOJI[business.category] || '🔧'}
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <p style={{ fontWeight: 700, fontSize: 15 }}>{business.name}</p>
                <span
                  className={bizActive ? 'pill pill-green' : 'pill pill-gray'}
                >
                  {bizActive ? 'Visible' : 'Hidden'}
                </span>
              </div>

              {/* Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F2F6F4',
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginBottom: 10,
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>
                    {bizActive ? 'Business is ON' : 'Business is OFF'}
                  </p>
                  <p style={{ fontSize: 11, color: '#516B61' }}>
                    {bizActive
                      ? 'Customers can find and contact you'
                      : 'Hidden from all customers'}
                  </p>
                </div>
                <div
                  className={bizActive ? 'switch on' : 'switch'}
                  onClick={toggleActive}
                >
                  <div className="switch-thumb"></div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 6,
                }}
              >
                <span className="pill pill-green">{business.category}</span>
                <span style={{ fontSize: 12, color: '#516B61' }}>
                  {business.location_area}
                </span>
                {business.is_verified && (
                  <span className="verified-badge">Verified</span>
                )}
              </div>

              <p style={{ fontSize: 11, color: '#516B61', marginBottom: 10 }}>
                Active since {formatDate(business.active_since)}
              </p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-sm"
                  onClick={function () {
                    nav('biz-detail');
                  }}
                >
                  View
                </button>
                <button
                  className="btn btn-sm"
                  onClick={function () {
                    nav('create');
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm"
                  style={{ color: '#E03535', borderColor: '#E03535' }}
                  onClick={function () {
                    showToast('Business delisted.');
                  }}
                >
                  Delist
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-icon">🏪</div>
            <div className="empty-title">No listing yet</div>
            <div className="empty-sub">
              Create your first listing and start getting customers
            </div>
            <button
              className="btn btn-primary"
              onClick={function () {
                nav('create');
              }}
            >
              Create My Listing
            </button>
          </div>
        )}

        {/* Recent Reviews */}
        {reviews.length > 0 && (
          <div>
            <div className="section-label">Recent Reviews</div>
            <div className="card">
              {reviews.map(function (r, i) {
                return (
                  <div
                    key={r.id}
                    style={{
                      paddingBottom: i < reviews.length - 1 ? 12 : 0,
                      marginBottom: i < reviews.length - 1 ? 12 : 0,
                      borderBottom:
                        i < reviews.length - 1
                          ? '0.5px solid rgba(0,0,0,0.07)'
                          : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div
                        className="avatar"
                        style={{ width: 36, height: 36, fontSize: 13 }}
                      >
                        {r.profiles && r.profiles.full_name
                          ? r.profiles.full_name[0]
                          : '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <p style={{ fontWeight: 600, fontSize: 14 }}>
                            {r.profiles ? r.profiles.full_name : 'Customer'}
                          </p>
                          <span style={{ fontSize: 11, color: '#516B61' }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="stars-display" style={{ fontSize: 13 }}>
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: '#516B61',
                            marginTop: 3,
                          }}
                        >
                          {r.review_text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="nav-bar">
        <button className="nav-item active">
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
        <button
          className="nav-item"
          onClick={function () {
            nav('seller-profile');
          }}
        >
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
