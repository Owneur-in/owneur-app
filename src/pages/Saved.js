import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Saved({ nav, user, setSelectedBiz, showToast }) {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(
    function () {
      if (user) loadSaved();
    },
    [user]
  );

  async function loadSaved() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('saved_businesses')
        .select('*, businesses(*, profiles(full_name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setSaved(data || []);
    } catch (e) {}
    setLoading(false);
  }

  async function removeSaved(bizId) {
    await supabase
      .from('saved_businesses')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', bizId);
    setSaved(function (prev) {
      return prev.filter(function (s) {
        return s.business_id !== bizId;
      });
    });
    showToast('Removed from saved');
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}
    >
      <div className="topbar">
        <button
          className="back-btn"
          onClick={function () {
            nav('home');
          }}
        >
          ←
        </button>
        <span className="topbar-title">Saved</span>
        <span
          style={{
            background: '#0A6B52',
            color: '#fff',
            borderRadius: 20,
            padding: '1px 8px',
            fontSize: 12,
            fontWeight: 700,
            marginLeft: 4,
          }}
        >
          {saved.length}
        </span>
      </div>
      <div style={{ padding: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#516B61' }}>
            Loading...
          </div>
        ) : !user ? (
          <div className="empty-state">
            <div className="empty-icon">💝</div>
            <div className="empty-title">Log in to see saved</div>
            <div className="empty-sub">
              Create an account to save your favourite businesses
            </div>
            <button
              className="btn btn-primary"
              onClick={function () {
                nav('login');
              }}
            >
              Log In
            </button>
          </div>
        ) : saved.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💝</div>
            <div className="empty-title">Nothing saved yet</div>
            <div className="empty-sub">
              Tap the heart on any listing to save it here
            </div>
            <button
              className="btn btn-primary"
              onClick={function () {
                nav('home');
              }}
            >
              Browse Makers
            </button>
          </div>
        ) : (
          saved.map(function (s) {
            const biz = s.businesses;
            if (!biz) return null;
            return (
              <div
                key={s.id}
                style={{
                  background: '#fff',
                  border: '0.5px solid rgba(0,0,0,0.07)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  marginBottom: 10,
                  position: 'relative',
                }}
              >
                <button
                  onClick={function () {
                    removeSaved(biz.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 26,
                    height: 26,
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '50%',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                    zIndex: 1,
                  }}
                >
                  x
                </button>
                <div
                  style={{
                    height: 100,
                    background: 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    cursor: 'pointer',
                  }}
                  onClick={function () {
                    setSelectedBiz(biz);
                    nav('biz-detail');
                  }}
                >
                  🍱
                </div>
                <div
                  style={{ padding: '12px 14px', cursor: 'pointer' }}
                  onClick={function () {
                    setSelectedBiz(biz);
                    nav('biz-detail');
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{biz.name}</p>
                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#0A6B52',
                      }}
                    >
                      {biz.price_range}
                    </p>
                  </div>
                  <p
                    style={{ fontSize: 12, color: '#516B61', marginBottom: 6 }}
                  >
                    by {biz.profiles ? biz.profiles.full_name : 'Seller'}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="pill pill-green" style={{ fontSize: 10 }}>
                      {biz.category}
                    </span>
                    <span className="dist-badge">{biz.location_area}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="nav-bar">
        <button
          className="nav-item"
          onClick={function () {
            nav('home');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Discover
        </button>
        <button
          className="nav-item"
          onClick={function () {
            nav('search');
          }}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Search
        </button>
        <button className="nav-item active">
          <svg viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          Saved
        </button>
        <button
          className="nav-item"
          onClick={function () {
            nav('login');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 9h13M3 15h13M16 5l5 7-5 7" />
          </svg>
          Sell
        </button>
      </div>
    </div>
  );
}
