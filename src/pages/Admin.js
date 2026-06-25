import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const TABS = ['Businesses', 'Users', 'Reports', 'Reviews'];

export default function Admin({ nav, showToast }) {
  const [tab, setTab] = useState('Businesses');
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    users: 0,
    businesses: 0,
    pending: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*, profiles(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(50);
      setBusinesses(biz || []);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setUsers(prof || []);

      const { data: rpts } = await supabase
        .from('reports')
        .select('*, businesses(name)')
        .eq('status', 'open')
        .limit(20);
      setReports(rpts || []);

      const { data: revs } = await supabase
        .from('reviews')
        .select('*, businesses(name), profiles(full_name)')
        .eq('is_flagged', true)
        .limit(20);
      setReviews(revs || []);

      setStats({
        users: prof ? prof.length : 0,
        businesses: biz ? biz.length : 0,
        pending: biz
          ? biz.filter(function (b) {
              return !b.is_verified;
            }).length
          : 0,
        reports: rpts ? rpts.length : 0,
      });
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  }

  async function verifyBiz(id, val) {
    await supabase.from('businesses').update({ is_verified: val }).eq('id', id);
    setBusinesses(function (prev) {
      return prev.map(function (b) {
        return b.id === id ? Object.assign({}, b, { is_verified: val }) : b;
      });
    });
    showToast(val ? 'Business verified!' : 'Verification removed.');
  }

  async function suspendBiz(id) {
    await supabase
      .from('businesses')
      .update({ is_suspended: true, is_active: false })
      .eq('id', id);
    setBusinesses(function (prev) {
      return prev.map(function (b) {
        return b.id === id ? Object.assign({}, b, { is_suspended: true }) : b;
      });
    });
    showToast('Business suspended.');
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 20 }}
    >
      <div className="topbar">
        <button
          className="back-btn"
          onClick={function () {
            nav('landing');
          }}
        >
          ←
        </button>
        <span className="topbar-title">Admin Panel</span>
        <span className="verified-badge" style={{ marginLeft: 'auto' }}>
          Admin
        </span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            ['Total Users', stats.users],
            ['Businesses', stats.businesses],
            ['Pending Verify', stats.pending],
            ['Open Reports', stats.reports],
          ].map(function (s) {
            return (
              <div key={s[0]} className="stat-card">
                <div className="stat-num">{s[1]}</div>
                <div className="stat-label">{s[0]}</div>
              </div>
            );
          })}
        </div>

        <div className="filter-row" style={{ padding: 0, marginBottom: 14 }}>
          {TABS.map(function (t) {
            return (
              <button
                key={t}
                className={tab === t ? 'chip active' : 'chip'}
                onClick={function () {
                  setTab(t);
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#516B61' }}>
            Loading...
          </div>
        ) : tab === 'Businesses' ? (
          businesses.map(function (biz) {
            return (
              <div key={biz.id} className="card" style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <p style={{ fontWeight: 700, fontSize: 14 }}>
                        {biz.name}
                      </p>
                      {biz.is_verified && (
                        <span
                          className="verified-badge"
                          style={{ fontSize: 10 }}
                        >
                          V
                        </span>
                      )}
                      {biz.is_suspended && (
                        <span
                          className="pill pill-red"
                          style={{ fontSize: 10 }}
                        >
                          Suspended
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#516B61' }}>
                      {biz.profiles ? biz.profiles.full_name : ''} ·{' '}
                      {biz.category} · {biz.location_area}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    {biz.is_verified ? (
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: 11,
                          background: '#FDEAEA',
                          borderColor: '#E03535',
                          color: '#E03535',
                        }}
                        onClick={function () {
                          verifyBiz(biz.id, false);
                        }}
                      >
                        Unverify
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: 11,
                          background: '#DDF4EC',
                          borderColor: '#0A6B52',
                          color: '#0A6B52',
                        }}
                        onClick={function () {
                          verifyBiz(biz.id, true);
                        }}
                      >
                        Verify
                      </button>
                    )}
                    {!biz.is_suspended && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ fontSize: 11 }}
                        onClick={function () {
                          suspendBiz(biz.id);
                        }}
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : tab === 'Users' ? (
          users.map(function (u) {
            return (
              <div
                key={u.id}
                className="card"
                style={{
                  marginBottom: 8,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <div
                  className="avatar"
                  style={{ width: 40, height: 40, fontSize: 14 }}
                >
                  {u.full_name ? u.full_name[0] : '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>
                    {u.full_name || 'No name'}
                  </p>
                  <p style={{ fontSize: 12, color: '#516B61' }}>
                    +91 {u.phone}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span className="pill pill-gray">{u.plan || 'free'}</span>
                    {u.is_kyc_verified && (
                      <span className="verified-badge" style={{ fontSize: 10 }}>
                        KYC
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ fontSize: 11 }}
                  onClick={function () {
                    showToast('User suspended.');
                  }}
                >
                  Suspend
                </button>
              </div>
            );
          })
        ) : tab === 'Reports' ? (
          reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-title">No open reports</div>
            </div>
          ) : (
            reports.map(function (r) {
              return (
                <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>
                        {r.businesses ? r.businesses.name : 'Business'}
                      </p>
                      <p style={{ fontSize: 12, color: '#516B61' }}>
                        Reason: {r.reason}
                      </p>
                    </div>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ fontSize: 11 }}
                      onClick={function () {
                        showToast('Report actioned.');
                      }}
                    >
                      Action
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">No flagged reviews</div>
          </div>
        ) : (
          reviews.map(function (r) {
            return (
              <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                <p
                  style={{ fontSize: 13, fontStyle: 'italic', marginBottom: 4 }}
                >
                  {r.review_text}
                </p>
                <p style={{ fontSize: 11, color: '#516B61', marginBottom: 8 }}>
                  On: {r.businesses ? r.businesses.name : ''}
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-sm"
                    style={{ flex: 1 }}
                    onClick={function () {
                      showToast('Review kept.');
                    }}
                  >
                    Keep
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ flex: 1 }}
                    onClick={function () {
                      showToast('Review removed.');
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
