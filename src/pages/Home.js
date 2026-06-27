/**
 * Home.js — Customer discovery screen.
 *
 * LOCATION FLOW:
 *   - First visit: LocationPicker opens automatically
 *   - Returning buyer: saved location from localStorage used (Scenario 10)
 *   - Location chip at top: always tappable to change
 *   - Outside Chennai: accepted, shown expand message (Scenario 11)
 *   - No results: distinct empty state with CTAs (Scenario 7)
 *
 * Categories loaded from DB — respects admin hide/show.
 * Businesses filtered by spatial proximity (PostGIS).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import LocationPicker from './LocationPicker'

const CAT_BG = {
  'Home Food': 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
  'Tiffin': 'linear-gradient(135deg,#FEF3DC,#FAC775)',
  'Mehendi': 'linear-gradient(135deg,#FBEAF0,#F4C0D1)',
  'Bakery': 'linear-gradient(135deg,#FAECE7,#F5C4B3)',
  'Tuition': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Dance class': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Beautician': 'linear-gradient(135deg,#FBEAF0,#ED93B1)',
  'Electrician': 'linear-gradient(135deg,#FEF3DC,#FAC775)',
  'Flowers': 'linear-gradient(135deg,#EAF3DE,#C0DD97)',
  'Fruits': 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
  'Freelance': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Tailoring': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Fish': 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  'Mechanic': 'linear-gradient(135deg,#F1EFE8,#D3D1C7)',
  'Others': 'linear-gradient(135deg,#F1EFE8,#D3D1C7)',
}

const CAT_EMOJI = {
  'Home Food': '🍱', 'Tiffin': '🥡', 'Mehendi': '🌸', 'Bakery': '🎂',
  'Tailoring': '✂️', 'Tuition': '📚', 'Dance class': '💃', 'Beautician': '💄',
  'Electrician': '⚡', 'Fruits': '🍎', 'Flowers': '💐', 'Freelance': '💻',
  'Fish': '🐟', 'Mechanic': '🔩', 'Others': '🔧'
}

// Key for localStorage — saves buyer's last location
const LOCATION_STORAGE_KEY = 'owneur_buyer_location'

// Check if a location is outside Chennai (Scenario 11)
function isOutsideChennai(lat, lng) {
  // Chennai bounding box approx
  return lat < 12.75 || lat > 13.25 || lng < 79.95 || lng > 80.45
}

export default function Home({ nav, setSelectedBiz, showToast }) {
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [activeLocation, setActiveLocation] = useState(null)
  const [outsideChennai, setOutsideChennai] = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [noResults, setNoResults] = useState(false)
  const locationDebounceRef = useRef(null)

  useEffect(() => {
    loadCategoriesFromDB()
    initLocation()
  }, [])

  // Load only active categories from DB
  async function loadCategoriesFromDB() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('name, emoji')
        .eq('is_active', true)
        .order('sort_order')
      if (data && data.length > 0) setCategories(data)
    } catch (e) {
      console.error('Category load error:', e)
    }
  }

  // Scenario 10 — check localStorage for saved location
  function initLocation() {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY)
      if (saved) {
        const loc = JSON.parse(saved)
        if (loc && loc.lat && loc.lng && loc.locality) {
          // Returning buyer — skip picker, use saved location
          setActiveLocation(loc)
          loadBusinessesByCoords(loc.lat, loc.lng)
          return
        }
      }
    } catch (e) {}
    // First visit — show location picker
    setShowLocationPicker(true)
    setLoading(false)
  }

  // Called when buyer confirms a location from LocationPicker
  function handleLocationSelected(location) {
    setShowLocationPicker(false)
    setActiveLocation(location)

    // Check Scenario 11 — outside Chennai
    if (isOutsideChennai(location.lat, location.lng)) {
      setOutsideChennai(true)
    } else {
      setOutsideChennai(false)
    }

    // Save to localStorage for returning visits
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
    } catch (e) {}

    loadBusinessesByCoords(location.lat, location.lng)
  }

  function handleLocationPickerClose() {
    setShowLocationPicker(false)
    if (!activeLocation) {
      // No location set yet — use Chennai default
      const defaultLoc = { locality: 'Chennai', fullAddress: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 }
      setActiveLocation(defaultLoc)
      loadBusinessesByCoords(defaultLoc.lat, defaultLoc.lng)
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
        // Fallback
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
      setNoResults(true)
    }
    setLoading(false)
  }, [])

  function openBiz(biz) {
    setSelectedBiz(biz)
    nav('biz-detail')
  }

  function changeLocation() {
    setShowLocationPicker(true)
  }

  // ── RENDER ────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}>

      {/* Location Picker — fullscreen overlay */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelected={handleLocationSelected}
          onClose={handleLocationPickerClose}
        />
      )}

      {/* Hero */}
      <div className="hero" style={{ paddingTop: 16, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            {/* Location chip — always tappable */}
            <button
              onClick={changeLocation}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                📍 {activeLocation ? activeLocation.locality : 'Set your location'}
                <span style={{ fontSize: 10, opacity: 0.6, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 8 }}>
                  Change
                </span>
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>
                Find Makers Near You
              </p>
            </button>
          </div>
          <button
            onClick={() => nav('saved')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0, marginLeft: 8 }}
          >♡</button>
        </div>
        <div className="search-bar" onClick={() => nav('search')} style={{ cursor: 'pointer' }}>
          <svg style={{ width: 16, height: 16, stroke: 'rgba(255,255,255,0.7)', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Search tiffin, mehendi, tailor...</span>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* Scenario 11 — Outside Chennai banner */}
        {outsideChennai && activeLocation && (
          <div style={{ background: '#DDF4EC', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#064434', marginBottom: 6 }}>
              owneur is live in Chennai right now 🌱
            </p>
            <p style={{ fontSize: 13, color: '#516B61', marginBottom: 12, lineHeight: 1.5 }}>
              We are expanding soon! Meanwhile you can browse Chennai sellers.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm"
                style={{ background: '#0A6B52', color: '#fff', borderColor: '#0A6B52', fontSize: 12 }}
                onClick={() => {
                  const chennai = { locality: 'Chennai', fullAddress: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 }
                  handleLocationSelected(chennai)
                }}
              >Browse Chennai sellers</button>
              <button className="btn btn-sm" style={{ fontSize: 12 }}
                onClick={() => showToast('We will notify you when owneur reaches ' + activeLocation.locality + '!')}>
                Notify me when we expand
              </button>
            </div>
          </div>
        )}

        {/* Categories from DB */}
        {categories.length > 0 && (
          <>
            <div className="section-label">Browse by Category</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[...categories.slice(0, 7), { name: 'All', emoji: '→' }].map(cat => (
                <div key={cat.name} onClick={() => nav('search')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 12, cursor: 'pointer' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: CAT_BG[cat.name] || '#F2F6F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {cat.emoji || CAT_EMOJI[cat.name] || '🔧'}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#0D1F18', textAlign: 'center', lineHeight: 1.2 }}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Results count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="section-label" style={{ margin: 0 }}>
            {activeLocation ? `📍 Near ${activeLocation.locality}` : '🏪 All Makers'}
          </div>
          {!loading && <span style={{ fontSize: 11, color: '#516B61' }}>{businesses.length} found</span>}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: '#516B61' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⊙</div>
            <p>Finding makers near you...</p>
          </div>
        )}

        {/* No location set yet */}
        {!loading && !activeLocation && !showLocationPicker && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Set your location</p>
            <p style={{ fontSize: 14, color: '#516B61', marginBottom: 20 }}>
              Tell us where you are so we can show nearby sellers
            </p>
            <button className="btn btn-primary" onClick={changeLocation}>Set My Location</button>
          </div>
        )}

        {/* Scenario 7 — No results */}
        {!loading && noResults && activeLocation && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px 24px', textAlign: 'center', border: '0.5px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏘️</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              No makers in {activeLocation.locality} yet
            </p>
            <p style={{ fontSize: 14, color: '#516B61', lineHeight: 1.6, marginBottom: 24 }}>
              owneur is growing fast! Be the first seller in your area, or expand your search.
            </p>
            <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={changeLocation}>
              Search a Different Area
            </button>
            <button className="btn btn-outline" onClick={() => nav('login')}>
              List My Business Here →
            </button>
          </div>
        )}

        {/* Business cards */}
        {!loading && !noResults && businesses.map(biz => (
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
        ))}
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
