/**
 * Admin.js — Platform administration.
 * Tabs: Businesses, Users, Reports, Categories (Reviews removed per requirement).
 * Fixed: category edit now saves correctly and reflects for all users.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TABS = ['Businesses', 'Users', 'Reports', 'Categories']

export default function Admin({ nav, showToast }) {
  const [tab, setTab] = useState('Businesses')
  const [businesses, setBusinesses] = useState([])
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState({ users: 0, businesses: 0, pending: 0, reports: 0 })
  const [loading, setLoading] = useState(true)
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catName, setCatName] = useState('')
  const [catEmoji, setCatEmoji] = useState('🔧')
  const [catSaving, setCatSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [bizRes, profRes, rptRes, catRes] = await Promise.all([
        supabase.from('businesses').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('reports').select('*, businesses(name)').eq('status', 'open').limit(50),
        supabase.from('categories').select('*').order('sort_order')
      ])
      setBusinesses(bizRes.data || [])
      setUsers(profRes.data || [])
      setReports(rptRes.data || [])
      setCategories(catRes.data || [])
      setStats({
        users: profRes.data?.length || 0,
        businesses: bizRes.data?.length || 0,
        pending: bizRes.data?.filter(b => !b.is_verified).length || 0,
        reports: rptRes.data?.length || 0
      })
    } catch (e) {
      console.error('Admin load error:', e)
    }
    setLoading(false)
  }

  async function toggleVerify(id, current) {
    const { error } = await supabase.from('businesses').update({ is_verified: !current }).eq('id', id)
    if (error) { showToast('Error: ' + error.message); return }
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_verified: !current } : b))
    showToast(current ? 'Verification removed.' : 'Business verified!')
  }

  async function suspendBiz(id) {
    const { error } = await supabase.from('businesses').update({ is_suspended: true, is_active: false }).eq('id', id)
    if (error) { showToast('Error: ' + error.message); return }
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_suspended: true } : b))
    showToast('Business suspended.')
  }

  async function actionReport(id) {
    await supabase.from('reports').update({ status: 'reviewed' }).eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
    showToast('Report actioned.')
  }

  function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function getUserListingCount(userId) {
    return businesses.filter(b => b.owner_id === userId).length
  }

  function openAddCat() {
    setEditingCat(null)
    setCatName('')
    setCatEmoji('🔧')
    setShowCatForm(true)
  }

  function openEditCat(cat) {
    setEditingCat(cat)
    setCatName(cat.name)
    setCatEmoji(cat.emoji || '🔧')
    setShowCatForm(true)
  }

  async function saveCat() {
    if (!catName.trim()) { showToast('Category name is required'); return }
    setCatSaving(true)
    try {
      if (editingCat) {
        const { error } = await supabase
          .from('categories')
          .update({ name: catName.trim(), emoji: catEmoji })
          .eq('id', editingCat.id)
        if (error) throw error
        showToast('Category updated! Sellers and buyers will see the change.')
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({ name: catName.trim(), emoji: catEmoji, is_active: true, sort_order: categories.length })
        if (error) throw error
        showToast('Category added!')
      }
      setShowCatForm(false)
      // Reload categories from DB to confirm save
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order')
      setCategories(cats || [])
    } catch (e) {
      console.error('Save category error:', e)
      showToast('Could not save: ' + (e.message || 'Please try again.'))
    }
    setCatSaving(false)
  }

  async function toggleCatVisibility(id, currentActive) {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !currentActive })
      .eq('id', id)
    if (error) { showToast('Error: ' + error.message); return }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c))
    showToast(currentActive ? 'Category hidden from buyers and sellers.' : 'Category is now visible.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 20 }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('landing')}>←</button>
        <span className="topbar-title">Admin Panel</span>
        <span className="verified-badge" style={{ marginLeft: 'auto' }}>Admin</span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[['Total Users', stats.users], ['Active Businesses', stats.businesses], ['Pending Verify', stats.pending], ['Open Reports', stats.reports]].map(([label, value]) => (
            <div key={label} className="stat-card">
              <div className="stat-num">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="filter-row" style={{ padding: 0, marginBottom: 14, gap: 6 }}>
          {TABS.map(t => (
            <button key={t} className={tab === t ? 'chip active' : 'chip'} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#516B61' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⊙</div>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {/* BUSINESSES */}
            {tab === 'Businesses' && (
              businesses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏪</div>
                  <div className="empty-title">No businesses yet</div>
                </div>
              ) : businesses.map(biz => (
                <div key={biz.id} className="card" style={{ marginBottom: 8, opacity: biz.is_suspended ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{biz.name}</p>
                        {biz.is_verified && (
                          <div style={{ width: 18, height: 18, background: '#1459A8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                          </div>
                        )}
                        {biz.is_suspended && <span className="pill pill-red" style={{ fontSize: 10 }}>Suspended</span>}
                      </div>
                      <p style={{ fontSize: 12, color: '#516B61', marginBottom: 2 }}>
                        {biz.profiles?.full_name || 'Unknown'} · {biz.category} · {biz.location_area}
                      </p>
                      <p style={{ fontSize: 11, color: '#516B61' }}>
                        📱 {biz.profiles?.phone ? '+91 ' + biz.profiles.phone : 'No phone'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                      <button
                        className="btn btn-sm"
                        style={biz.is_verified
                          ? { fontSize: 11, background: '#FDEAEA', borderColor: '#E03535', color: '#E03535' }
                          : { fontSize: 11, background: '#DDF4EC', borderColor: '#0A6B52', color: '#0A6B52' }
                        }
                        onClick={() => toggleVerify(biz.id, biz.is_verified)}
                      >
                        {biz.is_verified ? 'Unverify' : '✓ Verify'}
                      </button>
                      {!biz.is_suspended && (
                        <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => suspendBiz(biz.id)}>Suspend</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* USERS */}
            {tab === 'Users' && (
              users.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <div className="empty-title">No users yet</div>
                </div>
              ) : users.map(u => (
                <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="avatar" style={{ width: 42, height: 42, fontSize: 15, flexShrink: 0 }}>
                    {getInitials(u.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name || 'No name yet'}</p>
                    <p style={{ fontSize: 12, color: '#516B61' }}>
                      {u.phone ? '+91 ' + u.phone : 'No phone'}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className="pill pill-gray">{u.plan || 'free'}</span>
                      <span className="pill pill-gray">{getUserListingCount(u.id)} listing{getUserListingCount(u.id) !== 1 ? 's' : ''}</span>
                      {u.is_kyc_verified && <span className="verified-badge" style={{ fontSize: 10 }}>✓ KYC</span>}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => showToast('Suspend feature coming soon.')}>Suspend</button>
                </div>
              ))
            )}

            {/* REPORTS */}
            {tab === 'Reports' && (
              reports.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <div className="empty-title">No open reports</div>
                  <div className="empty-sub">All clear!</div>
                </div>
              ) : reports.map(r => (
                <div key={r.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{r.businesses?.name || 'Unknown'}</p>
                      <p style={{ fontSize: 12, color: '#516B61' }}>Reason: {r.reason}</p>
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => actionReport(r.id)}>Action</button>
                  </div>
                </div>
              ))
            )}

            {/* CATEGORIES */}
            {tab === 'Categories' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: '#516B61' }}>{categories.length} categories total</p>
                  <button className="btn btn-primary btn-sm" onClick={openAddCat}>+ Add Category</button>
                </div>
                {categories.map(cat => (
                  <div key={cat.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, opacity: cat.is_active ? 1 : 0.5 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</p>
                      <p style={{ fontSize: 11, color: cat.is_active ? '#0A6B52' : '#516B61', fontWeight: 600 }}>
                        {cat.is_active ? '● Visible to all users' : '● Hidden from all users'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => openEditCat(cat)}>Edit</button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, color: cat.is_active ? '#E03535' : '#0A6B52', borderColor: cat.is_active ? '#E03535' : '#0A6B52' }}
                        onClick={() => toggleCatVisibility(cat.id, cat.is_active)}
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

      {/* Category form modal */}
      {showCatForm && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowCatForm(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle"></div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
              {editingCat ? 'Edit Category' : 'Add New Category'}
            </h3>
            <div className="input-group">
              <label className="input-label">Category Name *</label>
              <input className="input" placeholder="e.g. Home Food" value={catName} onChange={e => setCatName(e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Emoji Icon</label>
              <input className="input" placeholder="🔧" value={catEmoji} onChange={e => setCatEmoji(e.target.value)} style={{ fontSize: 22 }} />
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
