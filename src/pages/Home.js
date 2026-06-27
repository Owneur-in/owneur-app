/**
 * Home.js — Customer discovery screen.
 * Location is editable with autocomplete suggestions (Nominatim/OpenStreetMap).
 * Shows businesses near selected location.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CAT_BG = {
  'Home Food': 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
  'Tiffin': 'linear-gradient(135deg,#FEF3DC,#FAC775)',
  'Mehendi': 'linear-gradient(135deg,#FBEAF0,#F4C0D1)',
  'Bakery': 'linear-gradient(135deg,#FAECE7,#F5C4B3)',
  'Tuition': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Beautician': 'linear-gradient(135deg,#FBEAF0,#ED93B1)',
  'Electrician': 'linear-gradient(135deg,#FEF3DC,#FAC775)',
  'Flowers': 'linear-gradient(135deg,#EAF3DE,#C0DD97)',
  'Fruits': 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
  'Freelance': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Tailoring': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Others': 'linear-gradient(135deg,#F1EFE8,#D3D1C7)',
}

const CAT_EMOJI = {
  'Home Food': '🍱', 'Tiffin': '🥡', 'Mehendi': '🌸', 'Bakery': '🎂',
  'Tailoring': '✂️', 'Tuition': '📚', 'Beautician': '💄', 'Electrician': '⚡',
  'Fruits': '🍎', 'Flowers': '💐', 'Freelance': '💻', 'Others': '🔧'
}

const CATEGORIES = [
  { emoji: '🍱', name: 'Home Food', bg: '#DDF4EC' },
  { emoji: '🥡', name: 'Tiffin', bg: '#FEF3DC' },
  { emoji: '🌸', name: 'Mehendi', bg: '#FBEAF0' },
  { emoji: '🎂', name: 'Bakery', bg: '#FAECE7' },
  { emoji: '📚', name: 'Tuition', bg: '#E8F0FB' },
  { emoji: '💄', name: 'Beautician', bg: '#FBEAF0' },
  { emoji: '⚡', name: 'Electrician', bg: '#FEF3DC' },
  { emoji: '→', name: 'All', bg: '#F1EFE8' },
]

export default function Home({ nav, setSelectedBiz, showToast }) {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('Chennai, Tamil Nadu')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showLocationEdit, setShowLocationEdit] = useState(false)

  useEffect(() => { loadBusinesses() }, [])

  async function loadBusinesses() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('businesses')
        .select('*, profiles(full_name)')
        .eq('is_active', true)
        .eq('is_suspended', false)
        .order('created_at', { ascending: false })
        .limit(20)
      setBusinesses(data || [])
    } catch (e) {
      console.error('Load businesses error:', e)
    }
    setLoading(false)
  }

  async function handleLocationSearch(val) {
    setLocation(val)
    if (val.length < 3) { setLocationSuggestions([]); setShowSuggestions(false); return }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ', India')}&format=json&limit=6&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const results = await res.json()
      const suggestions = [...new Set(results.map(r => r.display_name.split(', ').slice(0, 4).join(', ')))]
      setLocationSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } catch (e) {
      setLocationSuggestions([])
    }
  }

  function selectLocation(s) {
    setLocation(s)
    setLocationSuggestions([])
    setShowSuggestions(false)
    setShowLocationEdit(false)
    showToast('Location updated!')
    loadBusinesses()
  }

  function openGoogleMaps() {
    window.open('https://www.google.com/maps/search/' + encodeURIComponent(location), '_blank')
  }

  function openBiz(biz) {
    setSelectedBiz(biz)
    nav('biz-detail')
  }

  const featured = businesses.filter(b => b.is_featured)
  const nearby = businesses

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}>

      {/* Hero header */}
      <div className="hero" style={{ paddingTop: 20, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            {/* Editable location */}
            {showLocationEdit ? (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>📍</span>
                  <input
                    style={{ border: 'none', background: 'none', color: '#fff', fontSize: 13, outline: 'none', flex: 1, fontFamily: 'inherit' }}
                    value={location}
                    onChange={e => handleLocationSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoFocus
                    placeholder="Search your area..."
                  />
                  <button onClick={() => openGoogleMaps()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>🗺</button>
                  <button onClick={() => setShowLocationEdit(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
                {showSuggestions && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 12, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                    {locationSuggestions.map((s, i) => (
                      <div key={i} onMouseDown={() => selectLocation(s)}
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#0D1F18', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', gap: 8 }}>
                        <span>📍</span>{s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLocationEdit(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
              >
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>📍 {location} ✏️</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Find Makers Near You</p>
              </button>
            )}
          </div>
          <button style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0 }} onClick={() => nav('saved')}>♡</button>
        </div>

        {/* Search bar */}
        <div className="search-bar" onClick={() => nav('search')} style={{ cursor: 'pointer' }}>
          <svg style={{ width: 16, height: 16, stroke: 'rgba(255,255,255,0.7)', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Search tiffin, mehendi, tailor...</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Categories */}
        <div className="section-label">Browse by Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.name} onClick={() => nav('search')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 12, cursor: 'pointer', transition: 'transform 0.1s' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cat.emoji}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#0D1F18', textAlign: 'center', lineHeight: 1.2 }}>{cat.name}</span>
            </div>
          ))}
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <>
            <div className="section-label">✨ Featured on Owneur</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              {featured.map(biz => (
                <div key={biz.id} onClick={() => openBiz(biz)}
                  style={{ minWidth: 200, background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: CAT_BG[biz.category] || CAT_BG['Others'] }}>
                    {CAT_EMOJI[biz.category] || '🔧'}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{biz.name}</p>
                    <p style={{ fontSize: 11, color: '#516B61', marginBottom: 4 }}>by {biz.profiles?.full_name || 'Seller'}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="pill pill-green" style={{ fontSize: 10 }}>{biz.category}</span>
                      <span className="dist-badge" style={{ fontSize: 10 }}>{biz.location_area}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Nearby */}
        <div className="section-label">📍 Near You</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#516B61' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⊙</div>
            <p>Finding makers near you...</p>
          </div>
        ) : nearby.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <div className="empty-title">No makers near you yet</div>
            <div className="empty-sub">Owneur is growing! Be the first maker in your area.</div>
            <button className="btn btn-primary" onClick={() => nav('login')}>List Your Business</button>
          </div>
        ) : (
          nearby.map(biz => (
            <div key={biz.id} className="biz-card" onClick={() => openBiz(biz)}>
              <div className="biz-card-img" style={{ background: CAT_BG[biz.category] || CAT_BG['Others'] }}>
                <span style={{ fontSize: 42 }}>{CAT_EMOJI[biz.category] || '🔧'}</span>
                {biz.is_verified && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span className="verified-badge" style={{ fontSize: 10 }}>✓ Verified</span>
                  </div>
                )}
              </div>
              <div className="biz-card-body">
                <p className="biz-card-title">{biz.name}</p>
                <p style={{ fontSize: 12, color: '#516B61', marginBottom: 0 }}>by {biz.profiles?.full_name || 'Seller'}</p>
                <div className="biz-card-meta">
                  <span className="pill pill-green" style={{ fontSize: 11 }}>{biz.category}</span>
                  <span className="dist-badge">{biz.location_area}</span>
                </div>
                <p className="biz-card-price">{biz.price_range}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div className="nav-bar">
        <button className="nav-item active">
          <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Discover
        </button>
        <button className="nav-item" onClick={() => nav('search')}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Search
        </button>
        <button className="nav-item" onClick={() => nav('saved')}>
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          Saved
        </button>
        <button className="nav-item" onClick={() => nav('login')}>
          <svg viewBox="0 0 24 24"><path d="M3 9h13M3 15h13M16 5l5 7-5 7"/></svg>
          Sell
        </button>
      </div>
    </div>
  )
}
