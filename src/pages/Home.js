/**
 * Home.js — Customer discovery screen.
 * Categories loaded from database — respects admin hide/show.
 * Location uses browser geolocation + Nominatim reverse geocoding.
 * Spatial query via get_nearby_sellers RPC (PostGIS).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  'Fruits': '🍎', 'Flowers': '💐', 'Freelance': '💻', 'Others': '🔧','Fish': '🐟',
  'Mechanic': '🔩', 'Dance class': '💃',
}

export default function Home({ nav, setSelectedBiz, showToast }) {
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [locationText, setLocationText] = useState('Detecting location...')
  const [locationEditing, setLocationEditing] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [noResults, setNoResults] = useState(false)

  const searchDebounceRef = useRef(null)
  const locationDebounceRef = useRef(null)

  useEffect(() => {
    loadCategoriesFromDB()
    detectLocation()
  }, [])

  // Load ONLY active categories from database — respects admin hide/show
  async function loadCategoriesFromDB() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name, emoji, is_active')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      if (data && data.length > 0) {
        setCategories(data)
      }
    } catch (e) {
      console.error('Category load error:', e)
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setDefaultLocation()
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        await reverseGeocode(latitude, longitude)
        loadBusinessesByCoords(latitude, longitude)
      },
      () => { setDefaultLocation() },
      { timeout: 8000, maximumAge: 300000 }
    )
  }

  function setDefaultLocation() {
    setLocationText('Chennai, Tamil Nadu')
    setUserLat(13.0827)
    setUserLng(80.2707)
    loadBusinessesByCoords(13.0827, 80.2707)
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
      )
      const data = await res.json()
      const addr = data.address || {}
      const parts = []
      if (addr.neighbourhood) parts.push(addr.neighbourhood)
      else if (addr.suburb) parts.push(addr.suburb)
      if (addr.city || addr.town) parts.push(addr.city || addr.town)
      if (addr.state) parts.push(addr.state)
      setLocationText(parts.length > 0 ? parts.join(', ') : 'Your Location')
    } catch (e) {
      setLocationText('Your Location')
    }
  }

  const loadBusinessesByCoords = useCallback(async (lat, lng) => {
    setLoading(true)
    setNoResults(false)
    try {
      const { data, error } = await supabase.rpc('get_nearby_sellers', {
        user_lat: lat,
        user_lng: lng
      })
      if (error || !data || data.length === 0) {
        // Fallback — show all active businesses
        const { data: fallback } = await supabase
          .from('businesses')
          .select('*, profiles(full_name)')
          .eq('is_active', true)
          .eq('is_suspended', false)
          .order('created_at', { ascending: false })
          .limit(20)
        const list = fallback || []
        setBusinesses(list)
        setNoResults(list.length === 0)
      } else {
        setBusinesses(data)
        setNoResults(false)
      }
    } catch (e) {
      console.error('Load businesses error:', e)
    }
    setLoading(false)
  }, [])

  async function handleLocationSearchInput(val) {
    setLocationSearch(val)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (val.length < 2) { setLocationSuggestions([]); return }
    searchDebounceRef.current = setTimeout(async () => {
      setLocationLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&countrycodes=in&addressdetails=1`,
          { headers: { 'Accept': 'application/json' } }
        )
        const results = await res.json()
        if (results && results.length > 0) {
          const suggestions = results.map(r => {
            const addr = r.address || {}
            const parts = []
            if (addr.neighbourhood) parts.push(addr.neighbourhood)
            else if (addr.suburb) parts.push(addr.suburb)
            if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
            if (addr.state) parts.push(addr.state)
            return {
              text: parts.length > 0 ? parts.join(', ') : r.display_name.split(', ').slice(0, 3).join(', '),
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon)
            }
          })
          const seen = new Set()
          setLocationSuggestions(suggestions.filter(s => {
            if (seen.has(s.text)) return false
            seen.add(s.text)
            return true
          }))
        } else {
          setLocationSuggestions([])
        }
      } catch (e) {
        setLocationSuggestions([])
      }
      setLocationLoading(false)
    }, 400)
  }

  function selectLocation(s) {
    setUserLat(s.lat)
    setUserLng(s.lng)
    setLocationText(s.text)
    setLocationSearch('')
    setLocationSuggestions([])
    setLocationEditing(false)
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    locationDebounceRef.current = setTimeout(() => loadBusinessesByCoords(s.lat, s.lng), 300)
  }

  function openBiz(biz) {
    setSelectedBiz(biz)
    nav('biz-detail')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}>

      {/* Hero */}
      <div className="hero" style={{ paddingTop: 16, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {locationEditing ? (
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px' }}>
                <span>📍</span>
                <input
                  style={{ flex: 1, border: 'none', background: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                  placeholder="Search any city in India..."
                  value={locationSearch}
                  onChange={e => handleLocationSearchInput(e.target.value)}
                  autoFocus
                />
                {locationLoading && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>...</span>}
                <button onClick={() => { setLocationEditing(false); setLocationSearch(''); setLocationSuggestions([]) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, padding: 0 }}>✕</button>
              </div>
              {locationSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 14, zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', overflow: 'hidden', marginTop: 6 }}>
                  {locationSuggestions.map((s, i) => (
                    <div key={i} onClick={() => selectLocation(s)}
                      style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', borderBottom: i < locationSuggestions.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none', fontSize: 14, color: '#0D1F18', lineHeight: 1.4 }}>
                      <span style={{ color: '#0A6B52', flexShrink: 0 }}>📍</span>
                      {s.text}
                    </div>
                  ))}
                  <div onClick={() => window.open('https://www.google.com/maps/search/' + encodeURIComponent(locationSearch), '_blank')}
                    style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', background: '#F2F6F4', fontSize: 13, color: '#1459A8', fontWeight: 600 }}>
                    <span>🗺</span>Open Google Maps
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <button onClick={() => setLocationEditing(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 {locationText} <span style={{ fontSize: 10, opacity: 0.6 }}>✏️</span>
                </p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Find Makers Near You</p>
              </button>
            </div>
          )}
          <button onClick={() => nav('saved')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0, marginLeft: 8 }}>♡</button>
        </div>
        <div className="search-bar" onClick={() => nav('search')} style={{ cursor: 'pointer' }}>
          <svg style={{ width: 16, height: 16, stroke: 'rgba(255,255,255,0.7)', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Search tiffin, mehendi, tailor...</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Categories from DB — only active ones */}
        {categories.length > 0 && (
          <>
            <div className="section-label">Browse by Category</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[...categories.slice(0, 7), { name: 'All', emoji: '→' }].map(cat => (
                <div key={cat.name} onClick={() => nav('search')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 12, cursor: 'pointer' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: CAT_BG[cat.name] || '#F2F6F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {cat.emoji}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#0D1F18', textAlign: 'center', lineHeight: 1.2 }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Businesses */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="section-label" style={{ margin: 0 }}>📍 Near You</div>
          {!loading && <span style={{ fontSize: 11, color: '#516B61' }}>{businesses.length} found</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#516B61' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⊙</div>
            <p>Finding makers near you...</p>
          </div>
        ) : noResults ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px 24px', textAlign: 'center', border: '0.5px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No makers in your area yet</p>
            <p style={{ fontSize: 14, color: '#516B61', lineHeight: 1.6, marginBottom: 20 }}>Try a nearby area or be the first maker here!</p>
            <button className="btn btn-primary" onClick={() => setLocationEditing(true)}>📍 Try a Different Location</button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => nav('login')}>List My Business Here →</button>
          </div>
        ) : (
          businesses.map(biz => (
            <div key={biz.id} className="biz-card" onClick={() => openBiz(biz)}>
              <div className="biz-card-img" style={{ background: CAT_BG[biz.category] || 'linear-gradient(135deg,#F1EFE8,#D3D1C7)' }}>
                <span style={{ fontSize: 42 }}>{CAT_EMOJI[biz.category] || '🔧'}</span>
                {biz.is_verified && (
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span className="verified-badge" style={{ fontSize: 10 }}>✓ Verified</span>
                  </div>
                )}
              </div>
              <div className="biz-card-body">
                <p className="biz-card-title">{biz.name}</p>
                <p style={{ fontSize: 12, color: '#516B61', marginBottom: 4 }}>
                  by {biz.profiles?.full_name || biz.owner_name || 'Seller'}
                </p>
                <div className="biz-card-meta">
                  <span className="pill pill-green" style={{ fontSize: 11 }}>{biz.category}</span>
                  <span className="dist-badge">{biz.location_area}</span>
                  {biz.distance_km != null && (
                    <span style={{ fontSize: 11, background: '#E8F0FB', color: '#1459A8', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      {biz.distance_km} km
                    </span>
                  )}
                </div>
                <p className="biz-card-price">{biz.price_range}</p>
              </div>
            </div>
          ))
        )}
      </div>

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
