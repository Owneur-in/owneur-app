/**
 * LocationPicker.js
 *
 * PURPOSE: Full location selection flow for buyers.
 * Handles all 11 scenarios from the user story.
 *
 * SCENARIOS COVERED:
 *   1. Auto GPS detection succeeds → confirmation sheet
 *   2. Manual search with autocomplete
 *   3. Drop a pin on map (Google Maps link)
 *   4. Permission denied first time → explainer card
 *   5. Permission permanently blocked → settings guide
 *   6. Wrong location detected → reopen search
 *   7. No results → handled by Home.js
 *   8. Slow GPS (8s timeout) → manual fallback
 *   9. API failure → Chennai fallback list
 *  10. Returning buyer → skip picker (handled by Home.js)
 *  11. Outside Chennai → accept + show expand message
 *
 * PROPS:
 *   onLocationSelected(location) — called when buyer confirms location
 *     location = { locality, fullAddress, lat, lng }
 *   onClose() — called when buyer dismisses without selecting
 *   initialSearch — pre-fill search (Scenario 6)
 */
import React, { useState, useEffect, useRef } from 'react'

// Chennai fallback localities (Scenario 9 — API failure)
const CHENNAI_FALLBACK = [
  { name: 'Anna Nagar', fullAddress: 'Anna Nagar, Chennai, Tamil Nadu', lat: 13.0850, lng: 80.2101 },
  { name: 'T. Nagar', fullAddress: 'T. Nagar, Chennai, Tamil Nadu', lat: 13.0418, lng: 80.2341 },
  { name: 'Velachery', fullAddress: 'Velachery, Chennai, Tamil Nadu', lat: 12.9815, lng: 80.2180 },
  { name: 'Adyar', fullAddress: 'Adyar, Chennai, Tamil Nadu', lat: 13.0012, lng: 80.2565 },
  { name: 'OMR', fullAddress: 'Old Mahabalipuram Road, Chennai, Tamil Nadu', lat: 12.9010, lng: 80.2279 },
  { name: 'Tambaram', fullAddress: 'Tambaram, Chennai, Tamil Nadu', lat: 12.9249, lng: 80.1000 },
  { name: 'Sholinganallur', fullAddress: 'Sholinganallur, Chennai, Tamil Nadu', lat: 12.9010, lng: 80.2279 },
  { name: 'Porur', fullAddress: 'Porur, Chennai, Tamil Nadu', lat: 13.0358, lng: 80.1560 },
  { name: 'Mylapore', fullAddress: 'Mylapore, Chennai, Tamil Nadu', lat: 13.0368, lng: 80.2676 },
  { name: 'Nungambakkam', fullAddress: 'Nungambakkam, Chennai, Tamil Nadu', lat: 13.0569, lng: 80.2425 },
  { name: 'Perambur', fullAddress: 'Perambur, Chennai, Tamil Nadu', lat: 13.1140, lng: 80.2350 },
  { name: 'Kodambakkam', fullAddress: 'Kodambakkam, Chennai, Tamil Nadu', lat: 13.0530, lng: 80.2244 },
  { name: 'Vadapalani', fullAddress: 'Vadapalani, Chennai, Tamil Nadu', lat: 13.0525, lng: 80.2121 },
  { name: 'Ashok Nagar', fullAddress: 'Ashok Nagar, Chennai, Tamil Nadu', lat: 13.0369, lng: 80.2157 },
  { name: 'Pallavaram', fullAddress: 'Pallavaram, Chennai, Tamil Nadu', lat: 12.9675, lng: 80.1491 },
  { name: 'Chromepet', fullAddress: 'Chromepet, Chennai, Tamil Nadu', lat: 12.9516, lng: 80.1462 },
  { name: 'Guindy', fullAddress: 'Guindy, Chennai, Tamil Nadu', lat: 13.0067, lng: 80.2206 },
  { name: 'Kilpauk', fullAddress: 'Kilpauk, Chennai, Tamil Nadu', lat: 13.0812, lng: 80.2357 },
  { name: 'Korattur', fullAddress: 'Korattur, Chennai, Tamil Nadu', lat: 13.1127, lng: 80.1952 },
  { name: 'Pallikaranai', fullAddress: 'Pallikaranai, Chennai, Tamil Nadu', lat: 12.9382, lng: 80.2109 },
]

export default function LocationPicker({ onLocationSelected, onClose, initialSearch = '' }) {
  // View states
  const [view, setView] = useState('detecting') 
  // 'detecting' | 'denied' | 'blocked' | 'confirming' | 'searching' | 'timeout'

  // Detection state
  const [detectedLocation, setDetectedLocation] = useState(null)
  const [gpsTimeout, setGpsTimeout] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [suggestions, setSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [apiFailed, setApiFailed] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  // Confirmation state
  const [pendingLocation, setPendingLocation] = useState(null)

  const debounceRef = useRef(null)
  const gpsTimerRef = useRef(null)
  const searchInputRef = useRef(null)

  // On mount — start GPS detection
  useEffect(() => {
    if (initialSearch) {
      // Scenario 6 — pre-filled search
      setView('searching')
      setSearchQuery(initialSearch)
    } else {
      startLocationDetection()
    }
    return () => {
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Auto-focus search when switching to search view
  useEffect(() => {
    if (view === 'searching' && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [view])

  // ── GPS DETECTION ─────────────────────────────────────────────────

  function startLocationDetection() {
    setView('detecting')
    setGpsTimeout(false)

    if (!navigator.geolocation) {
      setView('searching')
      return
    }

    // Scenario 8 — 8 second timeout
    gpsTimerRef.current = setTimeout(() => {
      setGpsTimeout(true)
    }, 8000)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(gpsTimerRef.current)
        const { latitude, longitude } = pos.coords
        const loc = await reverseGeocode(latitude, longitude)
        setDetectedLocation(loc)
        setPendingLocation(loc)
        setView('confirming')
      },
      (err) => {
        clearTimeout(gpsTimerRef.current)
        if (err.code === 1) {
          // Permission denied
          // Check if permanently blocked
          if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(result => {
              if (result.state === 'denied') {
                setView('blocked') // Scenario 5
              } else {
                setView('denied') // Scenario 4
              }
            }).catch(() => setView('denied'))
          } else {
            setView('denied')
          }
        } else {
          // Timeout or other error — go to manual search
          setView('searching')
        }
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
    )
  }

  // ── REVERSE GEOCODING ─────────────────────────────────────────────

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        { headers: { 'Accept': 'application/json' } }
      )
      const data = await res.json()
      const addr = data.address || {}
      const locality = addr.neighbourhood || addr.suburb || addr.residential || addr.city_district || addr.city || 'Your Location'
      const city = addr.city || addr.town || ''
      const state = addr.state || ''
      const fullAddress = [locality, city, state].filter(Boolean).join(', ')
      return { locality, fullAddress, lat, lng }
    } catch (e) {
      return { locality: 'Your Location', fullAddress: 'Detected location', lat, lng }
    }
  }

  // ── LOCATION SEARCH ───────────────────────────────────────────────

  function handleSearchInput(val) {
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.length < 2) {
      setSuggestions([])
      setShowFallback(false)
      return
    }

    // Show Chennai fallback filtered by query while waiting
    const filtered = CHENNAI_FALLBACK.filter(l =>
      l.name.toLowerCase().includes(val.toLowerCase())
    )
    if (filtered.length > 0) {
      setSuggestions(filtered.map(l => ({
        text: l.name,
        secondary: l.fullAddress,
        lat: l.lat,
        lng: l.lng,
        isFallback: true
      })))
    }

    debounceRef.current = setTimeout(() => searchLocations(val), 300)
  }

  async function searchLocations(query) {
    setSearchLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}` +
        `&format=json&limit=6&countrycodes=in&addressdetails=1&accept-language=en`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
      )
      const results = await res.json()
      if (results && results.length > 0) {
        const formatted = results.map(r => {
          const addr = r.address || {}
          const locality = addr.neighbourhood || addr.suburb || addr.residential || addr.city_district || addr.city || query
          const city = addr.city || addr.town || addr.village || ''
          const state = addr.state || ''
          const secondary = [city, state].filter(Boolean).join(', ')
          return {
            text: locality,
            secondary,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            isFallback: false
          }
        })
        // Remove duplicates
        const seen = new Set()
        setSuggestions(formatted.filter(s => {
          const key = s.text + s.secondary
          if (seen.has(key)) return false
          seen.add(key)
          return true
        }))
        setApiFailed(false)
        setShowFallback(false)
      } else {
        // No results — show fallback
        setShowFallback(true)
        setSuggestions(CHENNAI_FALLBACK.map(l => ({
          text: l.name,
          secondary: l.fullAddress,
          lat: l.lat,
          lng: l.lng,
          isFallback: true
        })))
      }
    } catch (e) {
      // Scenario 9 — API failed — show fallback list
      setApiFailed(true)
      setShowFallback(true)
      setSuggestions(CHENNAI_FALLBACK.map(l => ({
        text: l.name,
        secondary: l.fullAddress,
        lat: l.lat,
        lng: l.lng,
        isFallback: true
      })))
    }
    setSearchLoading(false)
  }

  function selectSuggestion(s) {
    const loc = {
      locality: s.text,
      fullAddress: s.secondary || s.text,
      lat: s.lat,
      lng: s.lng
    }
    setPendingLocation(loc)
    setView('confirming')
  }

  function useCurrentLocation() {
    setView('detecting')
    startLocationDetection()
  }

  function openDropPin() {
    if (pendingLocation) {
      window.open(
        `https://www.google.com/maps/search/services+near+${encodeURIComponent(pendingLocation.locality)}/@${pendingLocation.lat},${pendingLocation.lng},14z`,
        '_blank'
      )
    } else {
      window.open('https://www.google.com/maps/search/services+near+Chennai', '_blank')
    }
  }

  function confirmLocation() {
    if (pendingLocation) {
      onLocationSelected(pendingLocation)
    }
  }

  // ── RENDER HELPERS ────────────────────────────────────────────────

  function highlightMatch(text, query) {
    if (!query || query.length < 2) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <strong>{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* ── DETECTING (loading spinner) ── */}
      {view === 'detecting' && !gpsTimeout && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>📍</div>
          <div style={{ width: 48, height: 48, border: '4px solid #DDF4EC', borderTop: '4px solid #0A6B52', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 20 }}></div>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0D1F18' }}>Finding your location...</p>
          <p style={{ fontSize: 14, color: '#516B61', textAlign: 'center', lineHeight: 1.5 }}>
            This helps us show you sellers in your neighbourhood
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* ── SCENARIO 8: GPS TIMEOUT ── */}
      {view === 'detecting' && gpsTimeout && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏱️</div>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Taking too long to detect location</p>
          <p style={{ fontSize: 14, color: '#516B61', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
            Your GPS is slow. You can search manually instead.
          </p>
          <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={() => setView('searching')}>
            Search My Area Manually
          </button>
          <button className="btn" onClick={startLocationDetection}>
            Try Again
          </button>
        </div>
      )}

      {/* ── SCENARIO 4: PERMISSION DENIED ── */}
      {view === 'denied' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <button className="back-btn" onClick={onClose} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>✕</button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', fontSize: 52, marginBottom: 20 }}>
              📍
              <span style={{ position: 'absolute', bottom: 0, right: -8, fontSize: 22 }}>🚫</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
              We need your location to find nearby sellers
            </p>
            <p style={{ fontSize: 14, color: '#516B61', textAlign: 'center', lineHeight: 1.6, marginBottom: 32 }}>
              owneur shows you sellers within your neighbourhood. Your location is never shared with sellers.
            </p>
            <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={() => setView('searching')}>
              Search My Area Manually
            </button>
            <button className="btn" onClick={() => setView('settings-help')}>
              How to enable location
            </button>
          </div>
        </div>
      )}

      {/* ── SCENARIO 5: PERMANENTLY BLOCKED ── */}
      {view === 'blocked' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <button className="back-btn" onClick={onClose} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>✕</button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', fontSize: 52, marginBottom: 20 }}>
              📍
              <span style={{ position: 'absolute', bottom: 0, right: -8, fontSize: 22 }}>🔒</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
              Location access is blocked
            </p>
            <p style={{ fontSize: 14, color: '#516B61', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
              You have blocked location access for this site. Enable it in your device settings to auto-detect your area.
            </p>
            <div style={{ background: '#F2F6F4', borderRadius: 14, padding: 16, marginBottom: 24, width: '100%', textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#0D1F18' }}>How to enable:</p>
              {[
                'Open Settings on your phone',
                'Tap Chrome / Safari → Location',
                'Select "Allow" or "While using app"',
                'Come back and tap "Try Again"'
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, background: '#0A6B52', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#516B61', lineHeight: 1.4 }}>{step}</p>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={startLocationDetection}>
              Try Again
            </button>
            <button className="btn" onClick={() => setView('searching')}>
              Search My Area Manually
            </button>
          </div>
        </div>
      )}

      {/* ── SETTINGS HELP SHEET ── */}
      {view === 'settings-help' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <button className="back-btn" onClick={() => setView('denied')} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>←</button>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>How to enable location</p>
          <div style={{ background: '#F2F6F4', borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#0A6B52' }}>On Android (Chrome):</p>
            {['Tap the lock icon in the address bar', 'Tap "Permissions"', 'Toggle Location to "Allow"', 'Refresh the page'].map((s, i) => (
              <p key={i} style={{ fontSize: 13, color: '#516B61', marginBottom: 6, lineHeight: 1.4 }}>{i + 1}. {s}</p>
            ))}
          </div>
          <div style={{ background: '#F2F6F4', borderRadius: 14, padding: 16, marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#0A6B52' }}>On iPhone (Safari):</p>
            {['Go to Settings → Privacy', 'Tap "Location Services"', 'Find Safari and tap "While Using"', 'Return to owneur'].map((s, i) => (
              <p key={i} style={{ fontSize: 13, color: '#516B61', marginBottom: 6, lineHeight: 1.4 }}>{i + 1}. {s}</p>
            ))}
          </div>
          <button className="btn btn-primary" onClick={startLocationDetection}>Try Again Now</button>
        </div>
      )}

      {/* ── SCENARIO 1 & 6: CONFIRMATION SHEET ── */}
      {view === 'confirming' && pendingLocation && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Map thumbnail */}
          <div
            style={{ height: 240, background: 'linear-gradient(160deg, #12895F 0%, #064434 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
            onClick={openDropPin}
          >
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>📍</div>
              <p style={{ fontSize: 13, opacity: 0.8 }}>Tap to open Google Maps</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose() }}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', fontSize: 16 }}>
              ✕
            </button>
          </div>

          {/* Confirmation card */}
          <div style={{ flex: 1, padding: '20px 20px 32px', display: 'flex', flexDirection: 'column' }}>
            <span className="pill pill-green" style={{ alignSelf: 'flex-start', marginBottom: 12, fontSize: 12, padding: '4px 12px' }}>
              📍 Location detected
            </span>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#0D1F18', marginBottom: 6, letterSpacing: -0.5 }}>
              {pendingLocation.locality}
            </p>
            <p style={{ fontSize: 14, color: '#516B61', marginBottom: 24, lineHeight: 1.5 }}>
              {pendingLocation.fullAddress}
            </p>

            <button className="btn btn-primary" style={{ marginBottom: 14, fontSize: 16, padding: '16px' }} onClick={confirmLocation}>
              Use This Location
            </button>
            <button
              className="btn-ghost"
              style={{ textAlign: 'center', color: '#0A6B52', fontSize: 14, fontWeight: 600 }}
              onClick={() => {
                // Scenario 6 — wrong location, open search pre-filled
                setSearchQuery(pendingLocation.locality)
                setView('searching')
              }}
            >
              Not your location? Change it
            </button>
          </div>
        </div>
      )}

      {/* ── SCENARIO 2: MANUAL SEARCH ── */}
      {view === 'searching' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Search header */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', gap: 10, alignItems: 'center', background: '#fff' }}>
            <button className="back-btn" onClick={onClose}>✕</button>
            <div style={{ flex: 1, background: '#F2F6F4', borderRadius: 12, display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
              <svg style={{ width: 16, height: 16, stroke: '#516B61', fill: 'none', strokeWidth: 2, flexShrink: 0 }} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
                style={{ border: 'none', background: 'none', flex: 1, fontSize: 15, fontFamily: 'inherit', color: '#0D1F18', outline: 'none' }}
                placeholder="Search your area, locality or landmark..."
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
              />
              {searchQuery && (
                <button style={{ border: 'none', background: 'none', color: '#516B61', cursor: 'pointer', fontSize: 16, padding: 0 }}
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowFallback(false) }}>✕</button>
              )}
            </div>
          </div>

          {/* Results list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Use current location row */}
            <div
              onClick={useCurrentLocation}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', cursor: 'pointer', background: '#FAFFFE' }}
            >
              <div style={{ width: 40, height: 40, background: '#DDF4EC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                🎯
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#0A6B52' }}>Use my current location</p>
                <p style={{ fontSize: 12, color: '#516B61' }}>Detect automatically via GPS</p>
              </div>
            </div>

            {/* Drop pin option */}
            <div
              onClick={openDropPin}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', cursor: 'pointer' }}
            >
              <div style={{ width: 40, height: 40, background: '#E8F0FB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                🗺
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#1459A8' }}>Drop a pin on map</p>
                <p style={{ fontSize: 12, color: '#516B61' }}>Open Google Maps to pin exact location</p>
              </div>
            </div>

            {/* API failed notice */}
            {apiFailed && (
              <div style={{ background: '#FEF3DC', padding: '10px 20px', fontSize: 12, color: '#7A4B00' }}>
                Showing common areas — type to find yours
              </div>
            )}

            {/* Fallback notice */}
            {showFallback && !apiFailed && (
              <div style={{ background: '#F2F6F4', padding: '10px 20px', fontSize: 12, color: '#516B61' }}>
                Showing common Chennai areas — type to find yours
              </div>
            )}

            {/* Loading */}
            {searchLoading && (
              <div style={{ padding: '16px 20px', display: 'flex', gap: 8, alignItems: 'center', color: '#516B61', fontSize: 14 }}>
                <span>Searching...</span>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => selectSuggestion(s)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F2F6F4'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <span style={{ color: '#0A6B52', fontSize: 18, marginTop: 2, flexShrink: 0 }}>📍</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#0D1F18', marginBottom: 2 }}>
                    {highlightMatch(s.text, searchQuery)}
                  </p>
                  <p style={{ fontSize: 12, color: '#516B61' }}>{s.secondary}</p>
                </div>
              </div>
            ))}

            {/* Empty search state */}
            {!searchLoading && searchQuery.length >= 2 && suggestions.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#516B61' }}>
                <p style={{ fontSize: 14, marginBottom: 4 }}>No results for "{searchQuery}"</p>
                <p style={{ fontSize: 12 }}>Try a different spelling or nearby landmark</p>
              </div>
            )}

            {/* Prompt before typing */}
            {searchQuery.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: '#516B61' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 14 }}>Type your area, locality or landmark</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Works for all cities in India</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
