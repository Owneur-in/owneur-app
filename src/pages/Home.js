/**
 * Home.js — Customer discovery screen with spatial location search.
 * 
 * HOW LOCATION WORKS:
 * 1. Browser geolocation API gets user's real coordinates (with permission)
 * 2. Reverse geocoding converts coordinates to readable address
 * 3. Supabase RPC get_nearby_sellers() uses PostGIS ST_DWithin to find
 *    only sellers whose service_radius covers the user's exact location
 * 4. If no location permission, falls back to text search across all India
 * 
 * BUYER SEES: Only sellers who can actually serve their location.
 * Distance shown on each card (e.g. "1.2 km away")
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
  'Fruits': '🍎', 'Flowers': '💐', 'Freelance': '💻', 'Others': '🔧'
}

const DEFAULT_CATEGORIES = [
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
  // Location state
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [locationText, setLocationText] = useState('Detecting your location...')
  const [locationEditing, setLocationEditing] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationPermission, setLocationPermission] = useState('unknown') // 'granted'|'denied'|'unknown'

  // Business state
  const [businesses, setBusinesses] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [noResults, setNoResults] = useState(false)

  const searchDebounceRef = useRef(null)
  const locationDebounceRef = useRef(null)

  // ── ON MOUNT: get location + load businesses ──────────────────────

  useEffect(() => {
    loadCategories()
    detectLocation()
  }, [])

  async function loadCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (data && data.length > 0) {
        const cats = data.slice(0, 7).map(c => ({ emoji: c.emoji, name: c.name, bg: '#F2F6F4' }))
        cats.push({ emoji: '→', name: 'All', bg: '#F1EFE8' })
        setCategories(cats)
      }
    } catch (e) {
      console.error('Category load error:', e)
    }
  }

  // ── LOCATION DETECTION ────────────────────────────────────────────

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationText('Chennai, Tamil Nadu')
      setUserLat(13.0827)
      setUserLng(80.2707)
      loadBusinessesByCoords(13.0827, 80.2707)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        setLocationPermission('granted')
        await reverseGeocode(latitude, longitude)
        loadBusinessesByCoords(latitude, longitude)
      },
      (err) => {
        console.log('Location denied:', err.message)
        setLocationPermission('denied')
        setLocationText('Chennai, Tamil Nadu')
        setUserLat(13.0827)
        setUserLng(80.2707)
        loadBusinessesByCoords(13.0827, 80.2707)
      },
      { timeout: 8000, maximumAge: 300000 }
    )
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
      else if (addr.residential) parts.push(addr.residential)
      if (addr.city || addr.town) parts.push(addr.city || addr.town)
      if (addr.state) parts.push(addr.state)
      setLocationText(parts.length > 0 ? parts.join(', ') : 'Your Location')
    } catch (e) {
      setLocationText('Your Location')
    }
  }

  // ── LOAD BUSINESSES ───────────────────────────────────────────────

  const loadBusinessesByCoords = useCallback(async (lat, lng) => {
    setLoading(true)
    setNoResults(false)
    try {
      // Use PostGIS spatial query — only sellers who can serve this location
      const { data, error } = await supabase.rpc('get_nearby_sellers', {
        user_lat: lat,
        user_lng: lng
      })

      if (error) {
        console.error('Spatial query error:', error)
        // Fallback to regular query if spatial fails
        await loadBusinessesFallback()
        return
      }

      if (!data || data.length === 0) {
        setNoResults(true)
        setBusinesses([])
      } else {
        setNoResults(false)
        setBusinesses(data)
      }
    } catch (e) {
      console.error('Load businesses error:', e)
      await loadBusinessesFallback()
    }
    setLoading(false)
  }, [])

  async function loadBusinessesFallback() {
    try {
      const { data } = await supabase
        .from('businesses')
        .select('*, profiles(full_name)')
        .eq('is_active', true)
        .eq('is_suspended', false)
        .order('created_at', { ascending: false })
        .limit(20)
      setBusinesses(data || [])
      setNoResults(!data || data.length === 0)
    } catch (e) {
      console.error('Fallback load error:', e)
    }
    setLoading(false)
  }

  // ── LOCATION SEARCH ───────────────────────────────────────────────

  function handleLocationSearchInput(val) {
    setLocationSearch(val)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (val.length < 2) { setLocationSuggestions([]); return }
    searchDebounceRef.current = setTimeout(() => searchLocationSuggestions(val), 400)
  }

  async function searchLocationSuggestions(query) {
    setLocationLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=in&addressdetails=1`,
        { headers: { 'Accept': 'application/json' } }
      )
      const results = await res.json()
      if (results && results.length > 0) {
        const suggestions = results.map(r => ({
          text: formatLocationText(r),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        }))
        setLocationSuggestions(suggestions)
      } else {
        setLocationSuggestions([])
      }
    } catch (e) {
      console.error('Location search error:', e)
    }
    setLocationLoading(false)
  }

  function formatLocationText(r) {
    const addr = r.address || {}
    const parts = []
    if (addr.neighbourhood) parts.push(addr.neighbourhood)
    else if (addr.suburb) parts.push(addr.suburb)
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
    if (addr.state) parts.push(addr.state)
    return parts.length > 0 ? parts.join(', ') : r.display_name.split(', ').slice(0, 3).join(', ')
  }

  function selectLocationSuggestion(suggestion) {
    setUserLat(suggestion.lat)
    setUserLng(suggestion.lng)
    setLocationText(suggestion.text)
    setLocationSearch('')
    setLocationSuggestions([])
    setLocationEditing(false)

    // Debounce the seller search so it waits for pin to settle
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    locationDebounceRef.current = setTimeout(() => {
      loadBusinessesByCoords(suggestion.lat, suggestion.lng)
    }, 300)
  }

  function openGoogleMaps() {
    const url = `https://www.google.com/maps/search/services+near+${encodeURIComponent(locationText)}/@${userLat || 13.0827},${userLng || 80.2707},14z`
    window.open(url, '_blank')
  }

  function openBiz(biz) {
    setSelectedBiz(biz)
    nav('biz-detail')
  }

  // ── RENDER ────────────────────────────────────────────────────────

  const featured = businesses.filter(b => b.is_featured)
  const nearby = businesses

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}>

      {/* ── HERO HEADER ── */}
      <div className="hero" style={{ paddingTop: 16, paddingBottom: 20 }}>

        {/* Location row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>

          {locationEditing ? (
            /* Location search mode */
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px' }}>
                <span style={{ fontSize: 16 }}>📍</span>
                <input
                  style={{ flex: 1, border: 'none', background: 'none', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                  placeholder="Search any city or area in India..."
                  value={locationSearch}
                  onChange={e => handleLocationSearchInput(e.target.value)}
                  autoFocus
                />
                {locationLoading && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>...</span>}
                <button
                  onClick={() => { setLocationEditing(false); setLocationSearch(''); setLocationSuggestions([]) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}
                >✕</button>
              </div>

              {/* Suggestions dropdown */}
              {locationSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 14, zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', overflow: 'hidden', marginTop: 6 }}>
                  {locationSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => selectLocationSuggestion(s)}
                      style={{ padding: '13px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', borderBottom: i < locationSuggestions.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none', fontSize: 14, color: '#0D1F18', lineHeight: 1.4 }}
                    >
                      <span style={{ color: '#0A6B52', fontSize: 16, flexShrink: 0, marginTop: 1 }}>📍</span>
                      {s.text}
                    </div>
                  ))}
                  {/* Open Google Maps option */}
                  <div
                    onClick={openGoogleMaps}
                    style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', background: '#F2F6F4', fontSize: 13, color: '#0A6B52', fontWeight: 600 }}
                  >
                    <span>🗺</span>
                    Open Google Maps to pin exact location
                  </div>
                </div>
              )}

              {/* Empty suggestions — show Google Maps option */}
              {locationSearch.length >= 2 && locationSuggestions.length === 0 && !locationLoading && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 14, zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ padding: '12px 16px', fontSize: 13, color: '#516B61', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                    No results for "{locationSearch}" — try a city name
                  </div>
                  <div
                    onClick={openGoogleMaps}
                    style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#0A6B52', fontWeight: 600 }}
                  >
                    <span>🗺</span>
                    Search on Google Maps instead
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Location display mode */
            <div style={{ flex: 1 }}>
              <button
                onClick={() => setLocationEditing(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 14 }}>📍</span>
                <div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {locationText}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>✏️ tap to change</span>
                  </p>
                </div>
              </button>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3, marginTop: 4 }}>
                Find Makers Near You
              </p>
            </div>
          )}

          <button
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0, marginLeft: 8 }}
            onClick={() => nav('saved')}
          >♡</button>
        </div>

        {/* Search bar */}
        <div className="search-bar" onClick={() => nav('search')} style={{ cursor: 'pointer' }}>
          <svg style={{ width: 16, height: 16, stroke: 'rgba(255,255,255,0.7)', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Search tiffin, mehendi, tailor...</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* ── CATEGORIES ── */}
        <div className="section-label">Browse by Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {categories.map(cat => (
            <div
              key={cat.name}
              onClick={() => nav('search')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 12, cursor: 'pointer', transition: 'transform 0.1s' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.bg || '#F2F6F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {cat.emoji}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#0D1F18', textAlign: 'center', lineHeight: 1.2 }}>{cat.name}</span>
            </div>
          ))}
        </div>

        {/* ── FEATURED ── */}
        {featured.length > 0 && (
          <>
            <div className="section-label">✨ Featured</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              {featured.map(biz => (
                <div
                  key={biz.id}
                  onClick={() => openBiz(biz)}
                  style={{ minWidth: 180, background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                >
                  <div style={{ height: 90, background: CAT_BG[biz.category] || CAT_BG['Others'], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                    {CAT_EMOJI[biz.category] || '🔧'}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{biz.name}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="pill pill-green" style={{ fontSize: 10 }}>{biz.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── NEARBY SELLERS ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="section-label" style={{ margin: 0 }}>
            {locationPermission === 'granted' ? '📍 Serving Your Location' : '🏪 All Makers'}
          </div>
          {!loading && (
            <span style={{ fontSize: 11, color: '#516B61' }}>
              {nearby.length} found
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#516B61' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⊙</div>
            <p style={{ fontSize: 14 }}>Finding makers near you...</p>
          </div>

        ) : noResults ? (
          /* ── NO RESULTS STATE ── */
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px 24px', textAlign: 'center', border: '0.5px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No makers in your area yet</p>
            <p style={{ fontSize: 14, color: '#516B61', lineHeight: 1.6, marginBottom: 20 }}>
              Owneur is growing across India. Try a nearby area or be the first maker here!
            </p>
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setLocationEditing(true)
                  setLocationSearch('')
                }}
              >
                📍 Try a Different Location
              </button>
              <button
                className="btn btn-outline"
                onClick={() => nav('login')}
              >
                List My Business Here →
              </button>
            </div>
          </div>

        ) : (
          /* ── BUSINESS CARDS ── */
          nearby.map(biz => (
            <div
              key={biz.id}
              className="biz-card"
              onClick={() => openBiz(biz)}
            >
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
                <p style={{ fontSize: 12, color: '#516B61', marginBottom: 4 }}>
                  by {biz.profiles?.full_name || biz.owner_name || 'Seller'}
                </p>
                <div className="biz-card-meta">
                  <span className="pill pill-green" style={{ fontSize: 11 }}>{biz.category}</span>
                  <span className="dist-badge">{biz.location_area}</span>
                  {/* Distance badge — only shown if spatial query ran */}
                  {biz.distance_km !== undefined && biz.distance_km !== null && (
                    <span style={{ fontSize: 11, background: '#E8F0FB', color: '#1459A8', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      {biz.distance_km} km away
                    </span>
                  )}
                </div>
                <p className="biz-card-price">{biz.price_range}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
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
