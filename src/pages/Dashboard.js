/**
 * Dashboard.js — Seller home screen.
 * Shows seller name, phone, stats, all listings with actions.
 * Catalogue button navigates to catalogue screen (not create listing).
 * Edit button removed from listing cards per requirement.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const CAT_EMOJI = {
  'Home Food': '🍱', 'Tiffin': '🥡', 'Mehendi': '🌸', 'Bakery': '🎂',
  'Tailoring': '✂️', 'Tuition': '📚', 'Beautician': '💄', 'Electrician': '⚡',
  'Fruits': '🍎', 'Flowers': '💐', 'Freelance': '💻', 'Others': '🔧'
}

export default function Dashboard({ nav, user, showToast, sellerName }) {
  const [profile, setProfile] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      const { data: bizList } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setBusinesses(bizList || [])

      if (bizList && bizList.length > 0) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('*, profiles(full_name)')
          .eq('business_id', bizList[0].id)
          .order('created_at', { ascending: false })
          .limit(3)
        setReviews(revs || [])
      }
    } catch (e) {
      console.error('Dashboard load error:', e)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  async function toggleActive(biz) {
    const newVal = !biz.is_active
    await supabase.from('businesses').update({ is_active: newVal }).eq('id', biz.id)
    setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, is_active: newVal } : b))
    showToast(newVal ? 'Listing is now visible to customers' : 'Listing is now hidden')
  }

  async function delistBusiness(bizId) {
    if (!window.confirm('Are you sure you want to delist this business?')) return
    await supabase.from('businesses').update({ is_active: false }).eq('id', bizId)
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, is_active: false } : b))
    showToast('Business delisted.')
  }

  function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const displayName = profile?.full_name || sellerName || 'Your Name'
  const displayPhone = profile?.phone || ''

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#516B61' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⊙</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}>
      <div className="topbar">
        <span className="topbar-title">My Dashboard</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => nav('create')}>
          + New Listing
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Profile card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
            {getInitials(displayName)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{displayName}</p>
            <p style={{ fontSize: 12, color: '#516B61' }}>
              {displayPhone ? '+91 ' + displayPhone : 'No phone on file'}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span className="pill pill-gray">Free Plan</span>
              {profile?.is_kyc_verified && <span className="verified-badge">✓ KYC Verified</span>}
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => nav('seller-profile')}>Edit</button>
        </div>

        {/* Stats */}
        <div className="section-label">This Month</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num">{businesses.reduce((s, b) => s + (b.views || 0), 0)}</div>
            <div className="stat-label">Profile Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{businesses.reduce((s, b) => s + (b.whatsapp_clicks || 0), 0)}</div>
            <div className="stat-label">WhatsApp Clicks</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{businesses.reduce((s, b) => s + (b.call_clicks || 0), 0)}</div>
            <div className="stat-label">Call Clicks</div>
          </div>
        </div>

        {/* Listings */}
        <div className="section-label">My Listings ({businesses.length})</div>

        {businesses.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-icon">🏪</div>
            <div className="empty-title">No listing yet</div>
            <div className="empty-sub">Create your first listing and start getting customers today.</div>
            <button className="btn btn-primary" onClick={() => nav('create')}>
              Create My Listing →
            </button>
          </div>
        ) : (
          businesses.map(biz => (
            <div key={biz.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: 80, background: 'linear-gradient(135deg,#DDF4EC,#7ECFB0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
                {CAT_EMOJI[biz.category] || '🔧'}
                {biz.is_suspended && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span className="pill pill-red" style={{ fontSize: 10 }}>Suspended</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{biz.name}</p>
                  <span className={biz.is_active ? 'pill pill-green' : 'pill pill-gray'}>
                    {biz.is_active ? '● Live' : '● Hidden'}
                  </span>
                </div>

                {/* Active toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F2F6F4', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>
                      {biz.is_active ? 'Visible to customers' : 'Hidden from customers'}
                    </p>
                    <p style={{ fontSize: 11, color: '#516B61' }}>
                      {biz.category} · {biz.location_area}
                    </p>
                  </div>
                  <div className={biz.is_active ? 'switch on' : 'switch'} onClick={() => toggleActive(biz)}>
                    <div className="switch-thumb"></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {biz.is_verified && <span className="verified-badge">✓ Verified</span>}
                  <span style={{ fontSize: 11, color: '#516B61' }}>
                    Since {new Date(biz.active_since || biz.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Action buttons — View, Catalogue, Delist only. Edit removed. */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => nav('biz-detail')}
                  >View</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#DDF4EC', borderColor: '#0A6B52', color: '#0A6B52' }}
                    onClick={() => nav('catalogue')}
                  >Catalogue</button>
                  <button
                    className="btn btn-sm"
                    style={{ color: '#E03535', borderColor: '#E03535' }}
                    onClick={() => delistBusiness(biz.id)}
                  >Delist</button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Recent reviews */}
        {reviews.length > 0 && (
          <>
            <div className="section-label">Recent Reviews</div>
            <div className="card">
              {reviews.map((r, i) => (
                <div key={r.id} style={{ paddingBottom: i < reviews.length - 1 ? 12 : 0, marginBottom: i < reviews.length - 1 ? 12 : 0, borderBottom: i < reviews.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                      {r.profiles?.full_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{r.profiles?.full_name || 'Customer'}</p>
                        <span style={{ fontSize: 11, color: '#516B61' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="stars-display" style={{ fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      <p style={{ fontSize: 13, color: '#516B61', marginTop: 3 }}>{r.review_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="nav-bar">
        <button className="nav-item active">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </button>
        <button className="nav-item" onClick={() => nav('create')}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          New Listing
        </button>
        <button className="nav-item" onClick={() => nav('seller-profile')}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Profile
        </button>
      </div>
    </div>
  )
}
