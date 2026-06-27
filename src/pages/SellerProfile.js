/**
 * SellerProfile.js
 *
 * PURPOSE: Seller's profile and settings screen.
 * FEATURES: View and edit profile, KYC status, upgrade to premium,
 *   notifications toggle, help, terms, sign out.
 * EDIT PROFILE: Full name and email editable. Phone shown as read-only.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function SellerProfile({ nav, user, setUser, showToast }) {
  const [profile, setProfile] = useState(null)
  const [notifOn, setNotifOn] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAbout, setEditAbout] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) loadProfile()
  }, [user])

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
    if (data) {
      setEditName(data.full_name || '')
      setEditEmail(data.email || '')
      setEditAbout(data.about || '')
    }
  }

  /** Save edited profile */
  async function saveProfile() {
    if (!editName.trim()) { showToast('Name cannot be empty'); return }
    setSaving(true)
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: editName.trim(),
          email: editEmail.trim(),
          about: editAbout.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      await loadProfile()
      setEditMode(false)
      showToast('Profile saved!')
    } catch (e) {
      showToast('Could not save profile. Try again.')
    }
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    nav('landing')
  }

  function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function formatActiveSince() {
    if (!profile?.active_since) return 'Recently'
    return new Date(profile.active_since).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}>
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('dashboard')}>←</button>
        <span className="topbar-title">Profile</span>
      </div>

      <div style={{ padding: 20 }}>
        {/* Avatar and name */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="avatar" style={{ width: 72, height: 72, fontSize: 24, margin: '0 auto 10px' }}>
            {getInitials(profile?.full_name)}
          </div>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{profile?.full_name || 'Your Name'}</p>
          <p style={{ fontSize: 13, color: '#516B61' }}>+91 {profile?.phone}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="pill pill-gray">Free Plan</span>
            {profile?.is_kyc_verified && <span className="verified-badge">✓ KYC Verified</span>}
          </div>
          <p style={{ fontSize: 12, color: '#516B61', marginTop: 6 }}>
            🕐 Active since {formatActiveSince()}
          </p>
        </div>

        {/* Edit Profile form */}
        {editMode ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Edit Profile</p>

            <div className="input-group">
              <label className="input-label">Full Name *</label>
              <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <input className="input" value={'+91 ' + (profile?.phone || '')} disabled style={{ opacity: 0.6 }} />
              <p style={{ fontSize: 11, color: '#516B61', marginTop: 4 }}>Mobile number cannot be changed</p>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input className="input" type="email" placeholder="you@gmail.com" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">About You</label>
              <textarea className="input" placeholder="Tell customers a bit about yourself..." value={editAbout} onChange={e => setEditAbout(e.target.value)} rows={3} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {/* Digital address */}
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', marginBottom: 6, textTransform: 'uppercase' }}>
                Your Digital Address
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F2F6F4', borderRadius: 12, padding: '10px 12px' }}>
                <span style={{ fontSize: 13, color: '#0A6B52', fontWeight: 500, flex: 1 }}>
                  owneur.in/{profile?.phone || ''}
                </span>
                <button className="btn btn-sm" style={{ padding: '5px 12px' }} onClick={() => showToast('Link copied!')}>Copy</button>
              </div>
              <p style={{ fontSize: 11, color: '#516B61', marginTop: 6 }}>Share this link with your customers</p>
            </div>

            {/* Menu */}
            <div className="card">
              <div className="list-item" onClick={() => setEditMode(true)}>
                <div className="list-item-icon" style={{ background: '#FEF3DC' }}>✏️</div>
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">Edit Profile</div>
                  <div className="list-item-sub">Update your name, email, bio</div>
                </div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>

              <div className="list-item" onClick={() => nav('catalogue')}>
                <div className="list-item-icon" style={{ background: '#DDF4EC' }}>📋</div>
                <div style={{ flex: 1 }}><div className="list-item-title">My Catalogue</div></div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>

              <div className="list-item" onClick={() => nav('kyc')}>
                <div className="list-item-icon" style={{ background: '#E8F0FB' }}>🪪</div>
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">KYC Verification</div>
                  <div className="list-item-sub" style={{ color: profile?.is_kyc_verified ? '#0A6B52' : undefined }}>
                    {profile?.is_kyc_verified ? 'Verified ✓' : 'Pending — tap to verify'}
                  </div>
                </div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>

              <div
                className="list-item"
                style={{ background: '#FFFBEB', borderRadius: 12, padding: '14px 10px', border: 'none' }}
                onClick={() => showToast('Premium subscription coming soon!')}
              >
                <div className="list-item-icon" style={{ background: '#FEF3DC' }}>👑</div>
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">Upgrade to Premium</div>
                  <div className="list-item-sub">Add more listings · ₹99/month each</div>
                </div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>

              <div
                className="list-item"
                onClick={() => { setNotifOn(!notifOn); showToast(notifOn ? 'Notifications off' : 'Notifications on') }}
              >
                <div className="list-item-icon" style={{ background: '#FEF3DC' }}>🔔</div>
                <div style={{ flex: 1 }}><div className="list-item-title">Notifications</div></div>
                <div className={notifOn ? 'switch on' : 'switch'}><div className="switch-thumb"></div></div>
              </div>

              <div className="list-item" onClick={() => nav('faq')}>
                <div className="list-item-icon" style={{ background: '#DDF4EC' }}>❓</div>
                <div style={{ flex: 1 }}><div className="list-item-title">Help and FAQ</div></div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>

              <div className="list-item" onClick={() => nav('terms')}>
                <div className="list-item-icon" style={{ background: '#F1EFE8' }}>📄</div>
                <div style={{ flex: 1 }}><div className="list-item-title">Terms and Conditions</div></div>
                <span style={{ color: '#516B61', fontSize: 18 }}>›</span>
              </div>

              <div className="list-item" style={{ borderBottom: 'none' }} onClick={signOut}>
                <div className="list-item-icon" style={{ background: '#FDEAEA' }}>🚪</div>
                <div style={{ flex: 1 }}><div className="list-item-title" style={{ color: '#E03535' }}>Sign Out</div></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="nav-bar">
        <button className="nav-item" onClick={() => nav('dashboard')}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </button>
        <button className="nav-item" onClick={() => nav('create')}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          New Listing
        </button>
        <button className="nav-item active">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Profile
        </button>
      </div>
    </div>
  )
}
