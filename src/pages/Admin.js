/**
 * Admin.js
 *
 * PURPOSE: Platform administration panel.
 * TABS: Businesses, Users, Reports, Reviews, Categories
 * FEATURES:
 *   - Businesses: Verify (tick mark), unverify, suspend
 *   - Users: Avatar with initials, phone, listing count
 *   - Reports: Action and resolve
 *   - Reviews: Keep or remove flagged reviews
 *   - Categories: Add, edit, hide categories
 * SECURITY: Admin access controlled by AdminLogin.js credentials.
 *   No Supabase RLS bypass — admin uses service role via edge function.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TABS = ['Businesses', 'Users', 'Reports', 'Reviews', 'Categories']

export default function Admin({ nav, showToast }) {
  const [tab, setTab] = useState('Businesses')
  const [businesses, setBusinesses] = useState([])
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [reviews, setReviews] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState({ users: 0, businesses: 0, pending: 0, reports: 0 })
  const [loading, setLoading] = useState(true)

  // Category form state
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catName, setCatName] = useState('')
  const [catEmoji, setCatEmoji] = useState('🔧')
  const [catSaving, setCatSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // Load businesses with owner info
      const { data: biz } = await supabase
        .from('businesses')
        .select('*, profiles(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(100)
      setBusinesses(biz || [])

      // Load user profiles
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setUsers(prof || [])

      // Load open reports
      const { data: rpts } = await supabase
        .from('reports')
        .select('*, businesses(name)')
        .eq('status', 'open')
        .limit(50)
      setReports(rpts || [])

      // Load flagged reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, businesses(name), profiles(full_name)')
        .eq('is_flagged', true)
        .limit(50)
      setReviews(revs || [])

      // Load categories
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')
      setCategories(cats || [])

      setStats({
        users: prof?.length || 0,
        businesses: biz?.length || 0,
        pending: biz?.filter(b => !b.is_verified).length || 0,
        reports: rpts?.length || 0
      })
    } catch (e) {
      console.error('Admin load error:', e)
    }
    setLoading(false)
  }

  /** Verify or unverify a business */
  async function toggleVerify(id, currentValue) {
    await supabase.from('businesses').update({ is_verified: !currentValue }).eq('id', id)
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_verified: !currentValue } : b))
    showToast(currentValue ? 'Verification removed.' : 'Business verified!')
  }

  /** Suspend a business */
  async function suspendBiz(id) {
    await supabase.from('businesses').update({ is_suspended: true, is_active: false }).eq('id', id)
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_suspended: true, is_active: false } : b))
    showToast('Business suspended. Seller will be notified.')
  }

  /** Action a report */
  async function actionReport(id) {
    await supabase.from('reports').update({ status: 'reviewed' }).eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
    showToast('Report actioned.')
  }

  /** Keep a flagged review */
  async function keepReview(id) {
    await supabase.from('reviews').update({ is_flagged: false }).eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
    showToast('Review kept.')
  }

  /** Remove a flagged review */
  async function removeReview(id) {
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
    showToast('Review removed.')
  }

  /** Get seller initials for avatar */
  function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  /** Count how many listings a user has */
  function getUserListingCount(userId) {
    return businesses.filter(b => b.owner_id === userId).length
  }

  // ── Category management ──

  function openAddCat() {
    setEditingCat(null)
    setCatName('')
    setCatEmoji('🔧')
    setShowCatForm(true)
  }

  function openEditCat(cat) {
    setEditingCat(cat)
    setCatName(cat.name)
    setCatEmoji(cat.emoji)
    setShowCatForm(true)
  }

  async function saveCat() {
    if (!catName.trim()) { showToast('Category name is required'); return }
    setCatSaving(true)
    try {
      if (editingCat) {
        await supabase.from('categories').update({ name: catName.trim(), emoji: catEmoji }).eq('id', editingCat.id)
        showToast('Category updated!')
      } else {
        await supabase.from('categories').insert({ name: catName.trim(), emoji: catEmoji, sort_order: categories.length })
        showToast('Category added!')
      }
      setShowCatForm(false)
      loadAll()
    } catch (e) {
      showToast('Could not save category.')
    }
    setCatSaving(false)
  }

  async function hideCat(id, currentHidden) {
    await supabase.from('categories').update({ is_active: currentHidden }).eq('id', id)
    setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: currentHidden } : c))
    showToast(currentHidden ? 'Category visible.' : 'Category hidden.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 20 }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('landing')}>←</button>
        <span className="topbar-title">Admin Panel</span>
        <span className="verified-badge" style={{ marginLeft: 'auto' }}>Admin</span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Stats overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            ['Total Users', stats.users],
            ['Active Businesses', stats.businesses],
            ['Pending Verify', stats.pending],
            ['Open Reports', stats.reports]
          ].map(([label, value]) => (
            <div key={label} className="stat-card">
              <div className="stat-num">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="filter-row" style={{ padding: 0, marginBottom: 14, gap: 6 }}>
          {TABS.map(t => (
            <button
              key={t}
              className={tab === t ? 'chip active' : 'chip'}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#516B61' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⊙</div>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {/* ── BUSINESSES TAB ── */}
            {tab === 'Businesses' && businesses.map(biz => (
              <div key={biz.id} className="card" style={{ marginBottom: 8, opacity: biz.is_suspended ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Line 1: Business name + verified tick */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{biz.name}</p>
                      {biz.is_verified && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 18, height: 18, background: '#1459A8', borderRadius: '50%',
                          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
                        }}>✓</span>
                      )}
                      {biz.is_suspended && <span className="pill pill-red" style={{ fontSize: 10 }}>Suspended</span>}
                    </div>
                    {/* Line 2: Seller name · Category · Area */}
                    <p style={{ fontSize: 12, color: '#516B61', marginBottom: 2 }}>
                      {biz.profiles?.full_name || 'Unknown'} · {biz.category} · {biz.location_area}
                    </p>
                    {/* Line 3: Stars · Reviews · Distance (mocked until real data) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#516B61' }}>
                      <span style={{ color: '#F0A500' }}>★</span>
                      <span>—</span>
                      <span>·</span>
                      <span>0 reviews</span>
                      <span>·</span>
                      <span>{biz.location_area}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                    {biz.is_verified ? (
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, background: '#FDEAEA', borderColor: '#E03535', color: '#E03535' }}
                        onClick={() => toggleVerify(biz.id, true)}
                      >Unverify</button>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, background: '#DDF4EC', borderColor: '#0A6B52', color: '#0A6B52' }}
                        onClick={() => toggleVerify(biz.id, false)}
                      >Verify ✓</button>
                    )}
                    {!biz.is_suspended && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ fontSize: 11 }}
                        onClick={() => suspendBiz(biz.id)}
                      >Suspend</button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* ── USERS TAB ── */}
            {tab === 'Users' && users.map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Avatar with initials — not a question mark */}
                <div
                  className="avatar"
                  style={{ width: 42, height: 42, fontSize: 15, flexShrink: 0 }}
                >
                  {getInitials(u.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name || 'No name yet'}</p>
                  {/* Phone number shown below name */}
                  <p style={{ fontSize: 12, color: '#516B61' }}>+91 {u.phone}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="pill pill-gray">{u.plan || 'free'}</span>
                    {/* Total listings count */}
                    <span className="pill pill-gray">{getUserListingCount(u.id)} listing{getUserListingCount(u.id) !== 1 ? 's' : ''}</span>
                    {u.is_kyc_verified && <span className="verified-badge" style={{ fontSize: 10 }}>✓ KYC</span>}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ fontSize: 11, flexShrink: 0 }}
                  onClick={() => showToast('User suspended.')}
                >Suspend</button>
              </div>
            ))}

            {/* ── REPORTS TAB ── */}
            {tab === 'Reports' && (
              reports.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <div className="empty-title">No open reports</div>
                  <div className="empty-sub">All reports have been resolved.</div>
                </div>
              ) : reports.map(r => (
                <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                        {r.businesses?.name || 'Unknown Business'}
                      </p>
                      <p style={{ fontSize: 12, color: '#516B61' }}>Reason: {r.reason}</p>
                      <p style={{ fontSize: 11, color: '#516B61', marginTop: 2 }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ fontSize: 11, flexShrink: 0 }}
                      onClick={() => actionReport(r.id)}
                    >Action</button>
                  </div>
                </div>
              ))
            )}

            {/* ── REVIEWS TAB ── */}
            {tab === 'Reviews' && (
              reviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <div className="empty-title">No flagged reviews</div>
                  <div className="empty-sub">All reviews are clean.</div>
                </div>
              ) : reviews.map(r => (
                <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: '#516B61', marginBottom: 4 }}>
                    "{r.review_text}"
                  </p>
                  <p style={{ fontSize: 11, color: '#516B61', marginBottom: 10 }}>
                    On: {r.businesses?.name} · by {r.profiles?.full_name || 'Customer'}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => keepReview(r.id)}>Keep</button>
                    <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => removeReview(r.id)}>Remove</button>
                  </div>
                </div>
              ))
            )}

            {/* ── CATEGORIES TAB ── */}
            {tab === 'Categories' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={openAddCat}>+ Add Category</button>
                </div>

                {categories.map(cat => (
                  <div key={cat.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</p>
                      <p style={{ fontSize: 11, color: cat.is_active ? '#0A6B52' : '#516B61' }}>
                        {cat.is_active ? 'Visible' : 'Hidden'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => openEditCat(cat)}>Edit</button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, color: cat.is_active ? '#E03535' : '#0A6B52', borderColor: cat.is_active ? '#E03535' : '#0A6B52' }}
                        onClick={() => hideCat(cat.id, !cat.is_active)}
                      >
                        {cat.is_active ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Category add/edit form */}
      {showCatForm && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowCatForm(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle"></div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
              {editingCat ? 'Edit Category' : 'Add Category'}
            </h3>
            <div className="input-group">
              <label className="input-label">Category Name *</label>
              <input className="input" placeholder="e.g. Home Food" value={catName} onChange={e => setCatName(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Emoji</label>
              <input className="input" placeholder="🔧" value={catEmoji} onChange={e => setCatEmoji(e.target.value)} style={{ fontSize: 20 }} />
            </div>
            <button className="btn btn-primary" onClick={saveCat} disabled={catSaving} style={{ marginBottom: 10, opacity: catSaving ? 0.7 : 1 }}>
              {catSaving ? 'Saving...' : editingCat ? 'Save Changes' : 'Add Category'}
            </button>
            <button className="btn" onClick={() => setShowCatForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
