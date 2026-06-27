/**
 * CreateListing.js
 *
 * PURPOSE: 4-step form for sellers to create a business listing.
 * STEPS:
 *   1. Business name, category, description
 *   2. Pricing (with quick-pick examples)
 *   3. Location with India-wide autocomplete + coordinates captured
 *   4. Contact details + photo upload
 *
 * LOCATION: Uses Nominatim (OpenStreetMap) — free, no API key.
 *   Captures lat/lng for spatial queries (PostGIS ST_DWithin).
 *   Works for all Indian cities: Chennai, Pune, Delhi, Mumbai, etc.
 *
 * PHOTOS: Uploads to Supabase Storage bucket "business-photos".
 *   Accepts JPG, PNG, WEBP, HEIC. Max 5MB each. Up to 5 photos.
 *
 * SECURITY: Prohibited keywords checked before publish.
 *   Phone prefilled from login but editable.
 */
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { emoji: '🍱', name: 'Home Food' },
  { emoji: '🥡', name: 'Tiffin' },
  { emoji: '🌸', name: 'Mehendi' },
  { emoji: '🎂', name: 'Bakery' },
  { emoji: '✂️', name: 'Tailoring' },
  { emoji: '📚', name: 'Tuition' },
  { emoji: '💄', name: 'Beautician' },
  { emoji: '⚡', name: 'Electrician' },
  { emoji: '🍎', name: 'Fruits' },
  { emoji: '💐', name: 'Flowers' },
  { emoji: '💻', name: 'Freelance' },
  { emoji: '🔧', name: 'Others' },
]

const RADII = [
  { km: 1,  label: '1 km',  desc: 'Your immediate street or building' },
  { km: 2,  label: '2 km',  desc: 'Very local — your lane or colony' },
  { km: 5,  label: '5 km',  desc: 'Neighbourhood reach' },
  { km: 10, label: '10 km', desc: 'Across the city' },
  { km: 20, label: '20 km', desc: 'City and surroundings' },
]

// Words that are not allowed in listings
const PROHIBITED = ['drugs', 'weapon', 'gun', 'bomb', 'hack', 'scam', 'fraud', 'illegal', 'fake']

// Default coordinates — Chennai city centre (used if seller does not pick location)
const DEFAULT_LAT = 13.0827
const DEFAULT_LNG = 80.2707

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function CreateListing({ nav, user, showToast, mobileNumber }) {

  // Step tracking
  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [desc, setDesc] = useState('')

  // Step 2
  const [price, setPrice] = useState('')

  // Step 3 — location
  const [location, setLocation] = useState('')
  const [selectedLat, setSelectedLat] = useState(null)
  const [selectedLng, setSelectedLng] = useState(null)
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [radius, setRadius] = useState(5)
  const [showMapModal, setShowMapModal] = useState(false)

  // Step 4 — contact and photos
  const [whatsapp, setWhatsapp] = useState('')
  const [phone, setPhone] = useState('')
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form state
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef(null)
  const locationDebounceRef = useRef(null)

  // Prefill phone from login flow
  useEffect(() => {
    if (mobileNumber) {
      setPhone(mobileNumber)
      setWhatsapp(mobileNumber)
    }
  }, [mobileNumber])

  const progress = (step / 4) * 100
  const stepLabels = ['Business Details', 'Pricing', 'Location and Reach', 'Contact and Photos']

  // ── VALIDATION ──────────────────────────────────────────────────────────────

  function validateStep1() {
    const e = {}
    if (!name.trim()) e.name = 'Business name is required'
    if (!category) e.category = 'Please select a category'
    // Check for prohibited content
    const combined = (name + ' ' + desc).toLowerCase()
    for (const word of PROHIBITED) {
      if (combined.includes(word)) {
        e.name = 'Your listing contains content that is not allowed on Owneur.'
        break
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e = {}
    if (!price.trim()) e.price = 'Please add your pricing'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep3() {
    const e = {}
    if (!location.trim()) e.location = 'Please enter your area or locality'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    setErrors({})
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  function back() {
    setErrors({})
    setStep(s => s - 1)
    window.scrollTo(0, 0)
  }

  // ── LOCATION SEARCH ─────────────────────────────────────────────────────────

  /**
   * Handles location text input with debounce.
   * Clears coordinates if user types a new location manually.
   */
  function handleLocationInput(val) {
    setLocation(val)
    setErrors({})
    // Clear stored coordinates since user changed the text
    setSelectedLat(null)
    setSelectedLng(null)

    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)

    if (val.length < 2) {
      setLocationSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce: wait 400ms after user stops typing
    locationDebounceRef.current = setTimeout(() => {
      searchLocation(val)
    }, 400)
  }

  /**
   * Searches Nominatim for location suggestions.
   * Returns coordinates alongside display text.
   * Works for all Indian cities — no city restriction applied.
   */
  async function searchLocation(query) {
    setLocationLoading(true)
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&limit=6` +
        `&countrycodes=in` +
        `&addressdetails=1` +
        `&accept-language=en`

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      })
      const results = await response.json()

      if (results && results.length > 0) {
        const suggestions = results.map(r => ({
          text: formatSuggestionText(r),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        }))
        // Remove duplicates by text
        const seen = new Set()
        const unique = suggestions.filter(s => {
          if (seen.has(s.text)) return false
          seen.add(s.text)
          return s.text.length > 3
        })
        setLocationSuggestions(unique)
        setShowSuggestions(unique.length > 0)
      } else {
        setLocationSuggestions([])
        setShowSuggestions(false)
      }
    } catch (e) {
      console.error('Location search error:', e)
      setLocationSuggestions([])
      setShowSuggestions(false)
    }
    setLocationLoading(false)
  }

  /**
   * Formats a Nominatim result into a clean readable address.
   * Example: "Koregaon Park, Pune, Maharashtra"
   */
  function formatSuggestionText(r) {
    const addr = r.address || {}
    const parts = []
    // Neighbourhood or suburb first (most specific)
    if (addr.neighbourhood) parts.push(addr.neighbourhood)
    else if (addr.suburb) parts.push(addr.suburb)
    else if (addr.residential) parts.push(addr.residential)
    else if (addr.road) parts.push(addr.road)
    // City / town
    if (addr.city) parts.push(addr.city)
    else if (addr.town) parts.push(addr.town)
    else if (addr.village) parts.push(addr.village)
    // State
    if (addr.state) parts.push(addr.state)
    return parts.length > 0
      ? parts.join(', ')
      : r.display_name.split(', ').slice(0, 3).join(', ')
  }

  /**
   * User picks a suggestion — store text AND coordinates.
   * These coordinates are saved to DB for spatial queries.
   */
  function selectLocation(suggestion) {
    setLocation(suggestion.text)
    setSelectedLat(suggestion.lat)
    setSelectedLng(suggestion.lng)
    setLocationSuggestions([])
    setShowSuggestions(false)
    setErrors({})
  }

  /** Opens Google Maps so seller can see/confirm their area */
  function openInGoogleMaps() {
    const query = location || 'India'
    window.open('https://www.google.com/maps/search/' + encodeURIComponent(query), '_blank')
  }

  // ── PHOTO UPLOAD ────────────────────────────────────────────────────────────

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const maxSize = 5 * 1024 * 1024 // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        showToast('Only JPG, PNG, WEBP and HEIC photos are allowed.')
        return
      }
      if (file.size > maxSize) {
        showToast('Each photo must be under 5MB.')
        return
      }
    }

    if (photos.length + files.length > 5) {
      showToast('Maximum 5 photos allowed.')
      return
    }

    setUploadingPhoto(true)

    for (const file of files) {
      const previewUrl = URL.createObjectURL(file)
      const tempId = Date.now() + Math.random()

      // Show preview immediately while uploading
      setPhotos(prev => [...prev, { url: previewUrl, uploading: true, tempId }])

      try {
        const ext = file.name.split('.').pop().toLowerCase()
        const fileName = `business-photos/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('business-photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('business-photos')
          .getPublicUrl(fileName)

        // Replace preview with real uploaded URL
        setPhotos(prev => prev.map(p =>
          p.tempId === tempId
            ? { url: urlData.publicUrl, uploading: false }
            : p
        ))
      } catch (err) {
        console.error('Upload error:', err)
        showToast('Photo upload failed. Make sure the business-photos bucket exists in Supabase Storage.')
        setPhotos(prev => prev.filter(p => p.tempId !== tempId))
      }
    }

    setUploadingPhoto(false)
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // ── SUBMIT ──────────────────────────────────────────────────────────────────

  /**
   * Publishes the business listing to Supabase.
   * Stores lat/lng and location_point for spatial queries.
   * If seller did not pick from suggestions, uses DEFAULT_LAT/LNG.
   */
  async function submit() {
    setLoading(true)
    try {
      // Use coordinates from suggestion selection, or default to Chennai
      const finalLat = selectedLat || DEFAULT_LAT
      const finalLng = selectedLng || DEFAULT_LNG

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
        '-' + Date.now()

      const { data: biz, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          category,
          description: desc.trim(),
          price_range: price.trim(),
          location_area: location.trim(),
          location_city: location.includes(',')
            ? location.split(',').slice(-2, -1)[0]?.trim() || 'India'
            : 'India',
          // Coordinates for spatial queries (PostGIS ST_DWithin)
          lat: finalLat,
          lng: finalLng,
          service_radius_km: radius,
          whatsapp: whatsapp.trim() || null,
          phone: phone.trim() || null,
          profile_url: slug,
          is_active: true,
          active_since: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update the location_point geography column for spatial queries
      // This runs separately because the GEOGRAPHY type needs a raw SQL update
      if (biz) {
        await supabase.rpc('update_business_location', {
          business_id: biz.id,
          business_lat: finalLat,
          business_lng: finalLng
        }).catch(e => {
          // Non-fatal — spatial query will use default location
          console.log('Location point update note:', e.message)
        })
      }

      // Save photos to business_photos table
      const uploadedPhotos = photos.filter(p => !p.uploading && p.url && !p.url.startsWith('blob:'))
      if (uploadedPhotos.length > 0 && biz) {
        const photoRows = uploadedPhotos.map((p, i) => ({
          business_id: biz.id,
          photo_url: p.url,
          is_primary: i === 0,
          sort_order: i
        }))
        await supabase.from('business_photos').insert(photoRows)
      }

      showToast('Your business is now live on Owneur!')
      nav('dashboard')

    } catch (err) {
      console.error('Submit error:', err)
      showToast('Error publishing: ' + (err.message || 'Please try again.'))
    }
    setLoading(false)
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>

      {/* Top bar — back button works on all steps */}
      <div className="topbar">
        <button
          className="back-btn"
          onClick={() => step === 1 ? nav('dashboard') : back()}
        >←</button>
        <span className="topbar-title">Create Listing</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: progress + '%' }}></div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 420, margin: '0 auto' }}>

        {/* Step label */}
        <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>
          Step {step} of 4 — {stepLabels[step - 1]}
        </p>

        {/* ── STEP 1: Business Details ─────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="input-group">
              <label className="input-label">Business Name *</label>
              <input
                className={errors.name ? 'input error' : 'input'}
                placeholder="e.g. Priya Home Kitchen"
                value={name}
                onChange={e => { setName(e.target.value); setErrors({}) }}
                autoFocus
              />
              {errors.name && <div className="field-error show">{errors.name}</div>}
            </div>

            <div className="input-group">
              <label className="input-label">Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.name}
                    onClick={() => { setCategory(cat.name); setErrors({}) }}
                    style={{
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                      fontSize: 13, fontWeight: 500, transition: 'all 0.12s',
                      border: category === cat.name
                        ? '1.5px solid #0A6B52'
                        : '1.5px solid rgba(0,0,0,0.12)',
                      background: category === cat.name ? '#DDF4EC' : '#fff',
                      color: category === cat.name ? '#0A6B52' : '#0D1F18'
                    }}
                  >
                    {cat.emoji} {cat.name}
                  </div>
                ))}
              </div>
              {errors.category && (
                <div className="field-error show" style={{ display: 'block', marginTop: 8 }}>
                  {errors.category}
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="input"
                placeholder="Tell customers what makes you special..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
              />
            </div>

            <button className="btn btn-primary" onClick={next}>Next →</button>
          </div>
        )}

        {/* ── STEP 2: Pricing ──────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="input-group">
              <label className="input-label">Price Range *</label>
              <input
                className={errors.price ? 'input error' : 'input'}
                placeholder="e.g. ₹80–₹200 per plate"
                value={price}
                onChange={e => { setPrice(e.target.value); setErrors({}) }}
                autoFocus
              />
              {errors.price && <div className="field-error show">{errors.price}</div>}
            </div>

            {/* Quick pick examples */}
            <div style={{ background: '#F2F6F4', borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tap to use an example format
              </p>
              {[
                '₹80 per plate',
                '₹2,500 per month',
                '₹200 per hour',
                '₹500 onwards',
                '₹100–₹300 per order'
              ].map(ex => (
                <div
                  key={ex}
                  onClick={() => { setPrice(ex); setErrors({}) }}
                  style={{
                    fontSize: 14, color: '#0A6B52', cursor: 'pointer',
                    marginBottom: 8, fontWeight: 500,
                    padding: '6px 10px',
                    background: price === ex ? '#DDF4EC' : 'transparent',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span style={{ color: '#7ECFB0' }}>→</span> {ex}
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={next} style={{ marginBottom: 10 }}>Next →</button>
            <button className="btn" onClick={back}>← Back</button>
          </div>
        )}

        {/* ── STEP 3: Location ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            {/* Map preview — taps to open modal */}
            <div
              onClick={() => setShowMapModal(true)}
              style={{
                height: 110,
                background: selectedLat
                  ? 'linear-gradient(135deg, #0A6B52, #12895F)'
                  : 'linear-gradient(135deg, #DDF4EC, #7ECFB0)',
                borderRadius: 14,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginBottom: 14,
                border: '1.5px solid rgba(10,107,82,0.2)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 30, marginBottom: 6 }}>📍</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: selectedLat ? '#fff' : '#0A6B52' }}>
                {selectedLat ? location || 'Location selected' : 'Tap to open on Google Maps'}
              </span>
              <span style={{ fontSize: 11, color: selectedLat ? 'rgba(255,255,255,0.7)' : '#516B61', marginTop: 2 }}>
                {selectedLat
                  ? `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`
                  : 'Confirm your exact location'}
              </span>
            </div>

            {/* Map modal */}
            {showMapModal && (
              <div
                className="modal-overlay open"
                onClick={e => { if (e.target === e.currentTarget) setShowMapModal(false) }}
              >
                <div className="modal-sheet">
                  <div className="modal-handle"></div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    Select Your Location
                  </h3>
                  <p style={{ fontSize: 13, color: '#516B61', marginBottom: 16, lineHeight: 1.6 }}>
                    Type your area in the search box below for instant suggestions, or open Google Maps to pin your exact street.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ marginBottom: 10 }}
                    onClick={() => { openInGoogleMaps(); setShowMapModal(false) }}
                  >
                    🗺 Open Google Maps to Pin Location
                  </button>
                  <button className="btn" onClick={() => setShowMapModal(false)}>
                    Use Text Search Below
                  </button>
                </div>
              </div>
            )}

            {/* Location text input with live autocomplete */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">Area / Locality *</label>
              <p style={{ fontSize: 11, color: '#516B61', marginBottom: 6, lineHeight: 1.4 }}>
                Type any area in India — Chennai, Pune, Delhi, Mumbai, Bengaluru all work
              </p>

              <div style={{ position: 'relative' }}>
                <input
                  className={errors.location ? 'input error' : 'input'}
                  placeholder="e.g. Koregaon Park, Pune"
                  value={location}
                  onChange={e => handleLocationInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                  autoFocus
                />
                {/* Loading indicator inside input */}
                {locationLoading && (
                  <div style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#516B61', fontSize: 12
                  }}>
                    Searching...
                  </div>
                )}
                {/* Green tick when coordinates are captured */}
                {selectedLat && !locationLoading && (
                  <div style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#0A6B52', fontSize: 16, fontWeight: 700
                  }}>
                    ✓
                  </div>
                )}
              </div>

              {errors.location && <div className="field-error show">{errors.location}</div>}

              {/* Coordinates confirmed message */}
              {selectedLat && (
                <p style={{ fontSize: 11, color: '#0A6B52', marginTop: 4, fontWeight: 600 }}>
                  ✓ Location confirmed — coordinates saved for accurate search results
                </p>
              )}

              {/* Autocomplete dropdown */}
              {showSuggestions && locationSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 14,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  marginTop: 4,
                  zIndex: 300
                }}>
                  {locationSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onMouseDown={() => selectLocation(s)}
                      style={{
                        padding: '13px 16px',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#0D1F18',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        borderBottom: i < locationSuggestions.length - 1
                          ? '0.5px solid rgba(0,0,0,0.07)'
                          : 'none',
                        lineHeight: 1.4,
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F2F6F4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ color: '#0A6B52', flexShrink: 0, marginTop: 2, fontSize: 16 }}>📍</span>
                      <span>{s.text}</span>
                    </div>
                  ))}
                  {/* Always show Google Maps option at bottom */}
                  <div
                    onMouseDown={openInGoogleMaps}
                    style={{
                      padding: '11px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#1459A8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#F8F9FF',
                      fontWeight: 600,
                      borderTop: '0.5px solid rgba(0,0,0,0.07)'
                    }}
                  >
                    <span>🗺</span>
                    Can't find it? Open Google Maps
                  </div>
                </div>
              )}
            </div>

            {/* How far you can serve */}
            <label className="input-label" style={{ display: 'block', marginBottom: 10, marginTop: 4 }}>
              How far you can serve?
            </label>
            {RADII.map(r => (
              <div
                key={r.km}
                onClick={() => setRadius(r.km)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12,
                  cursor: 'pointer', marginBottom: 8,
                  transition: 'all 0.12s',
                  border: radius === r.km
                    ? '1.5px solid #0A6B52'
                    : '1.5px solid rgba(0,0,0,0.12)',
                  background: radius === r.km ? '#DDF4EC' : '#fff'
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: radius === r.km ? '2px solid #0A6B52' : '2px solid rgba(0,0,0,0.2)',
                  background: radius === r.km ? '#0A6B52' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s'
                }}>
                  {radius === r.km && (
                    <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }}></div>
                  )}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: '#516B61', marginTop: 1 }}>{r.desc}</p>
                </div>
              </div>
            ))}

            <div style={{ height: 14 }}></div>
            <button className="btn btn-primary" onClick={next} style={{ marginBottom: 10 }}>Next →</button>
            <button className="btn" onClick={back}>← Back</button>
          </div>
        )}

        {/* ── STEP 4: Contact and Photos ───────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div style={{ background: '#DDF4EC', borderRadius: 12, padding: '10px 14px', marginBottom: 18 }}>
              <p style={{ fontSize: 12, color: '#0A6B52', fontWeight: 600 }}>
                These numbers are how customers will contact you. Both are optional but recommended.
              </p>
            </div>

            {/* WhatsApp */}
            <div className="input-group">
              <label className="input-label">WhatsApp Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  padding: '13px 14px',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: '#F2F6F4', whiteSpace: 'nowrap'
                }}>
                  🇮🇳 +91
                </div>
                <input
                  className="input"
                  type="tel"
                  placeholder="98765 43210"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ flex: 1 }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#516B61', marginTop: 4 }}>
                Customers will message you on WhatsApp
              </p>
            </div>

            {/* Call number */}
            <div className="input-group">
              <label className="input-label">Call Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  padding: '13px 14px',
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: '#F2F6F4', whiteSpace: 'nowrap'
                }}>
                  🇮🇳 +91
                </div>
                <input
                  className="input"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ flex: 1 }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#516B61', marginTop: 4 }}>
                Customers can call you directly
              </p>
            </div>

            {/* Photos section */}
            <label className="input-label" style={{ display: 'block', marginBottom: 6 }}>
              Photos ({photos.length}/5) — optional but strongly recommended
            </label>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#F2F6F4' }}
                  >
                    <img
                      src={photo.url}
                      alt={'Photo ' + (i + 1)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Uploading overlay */}
                    {photo.uploading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Uploading...</span>
                      </div>
                    )}
                    {/* Remove button */}
                    {!photo.uploading && (
                      <button
                        onClick={() => removePhoto(i)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 24, height: 24, background: 'rgba(0,0,0,0.55)',
                          border: 'none', borderRadius: '50%', color: '#fff',
                          cursor: 'pointer', fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700
                        }}
                      >✕</button>
                    )}
                    {/* Cover badge on first photo */}
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: 4, left: 4,
                        background: '#0A6B52', borderRadius: 6,
                        padding: '2px 6px'
                      }}>
                        <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>COVER</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {photos.length < 5 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <div
                  onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #7ECFB0', borderRadius: 16,
                    padding: '28px 20px', textAlign: 'center',
                    cursor: uploadingPhoto ? 'default' : 'pointer',
                    marginBottom: 14,
                    opacity: uploadingPhoto ? 0.6 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#0D1F18' }}>
                    {uploadingPhoto ? 'Uploading...' : 'Add Photos'}
                  </p>
                  <p style={{ fontSize: 12, color: '#516B61' }}>
                    JPG, PNG, WEBP or HEIC · Max 5MB each · Up to 5 photos
                  </p>
                </div>
              </>
            )}

            {/* Pro tip */}
            <div style={{
              background: '#DDF4EC', borderRadius: 12,
              padding: '12px 14px', marginBottom: 20,
              display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <span style={{ fontSize: 18 }}>📈</span>
              <p style={{ fontSize: 12, color: '#0A6B52', fontWeight: 500 }}>
                Listings with photos get 3× more customer enquiries
              </p>
            </div>

            {/* Submit */}
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={loading || uploadingPhoto}
              style={{ marginBottom: 10, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Publishing...' : '🚀 Publish My Business'}
            </button>
            <button className="btn" onClick={back}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
