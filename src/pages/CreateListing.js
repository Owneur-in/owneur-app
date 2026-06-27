/**
 * CreateListing.js
 * 4-step seller listing form.
 * Step 1: Business name, category, description
 * Step 2: Pricing
 * Step 3: Location with full India-wide autocomplete + map link
 * Step 4: Contact details + photo upload
 * 
 * Location search uses Nominatim (OpenStreetMap) — free, no API key needed.
 * Works for all Indian cities: Chennai, Pune, Delhi, Mumbai etc.
 */
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

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

const PROHIBITED = ['drugs', 'weapon', 'gun', 'bomb', 'hack', 'scam', 'fraud', 'illegal', 'fake']

export default function CreateListing({ nav, user, showToast, mobileNumber }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [radius, setRadius] = useState(5)
  const [showMapModal, setShowMapModal] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [phone, setPhone] = useState('')
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef(null)
  const locationSearchTimer = useRef(null)

  // Prefill phone from login
  useEffect(() => {
    if (mobileNumber) {
      setPhone(mobileNumber)
      setWhatsapp(mobileNumber)
    }
  }, [mobileNumber])

  const progress = (step / 4) * 100
  const stepLabels = ['Business Details', 'Pricing', 'Location and Reach', 'Contact and Photos']

  // ── VALIDATION ────────────────────────────────────────────────────

  function validateStep1() {
    const e = {}
    if (!name.trim()) e.name = 'Business name is required'
    if (!category) e.category = 'Please select a category'
    const combined = (name + ' ' + desc).toLowerCase()
    for (const word of PROHIBITED) {
      if (combined.includes(word)) { e.name = 'Your listing contains content not allowed on Owneur.'; break }
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
    if (!location.trim()) e.location = 'Please enter your area'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    setErrors({})
    setStep(s => s + 1)
  }

  function back() {
    setErrors({})
    setStep(s => s - 1)
  }

  // ── LOCATION SEARCH ───────────────────────────────────────────────
  // Uses Nominatim (OpenStreetMap) — free, no API key, works all India

  function handleLocationInput(val) {
    setLocation(val)
    setErrors({})

    // Clear previous timer to debounce
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current)

    if (val.length < 2) {
      setLocationSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce search by 400ms to avoid too many requests
    locationSearchTimer.current = setTimeout(() => {
      searchLocation(val)
    }, 400)
  }

  async function searchLocation(query) {
    setLocationLoading(true)
    try {
      // Search all of India — no city restriction so Pune, Delhi, Mumbai etc all work
      const url = `https://nominatim.openstreetmap.org/search` +
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
        // Format suggestions: Area, City, State — clean and readable
        const suggestions = results.map(r => {
          const addr = r.address || {}
          const parts = []
          if (addr.neighbourhood) parts.push(addr.neighbourhood)
          else if (addr.suburb) parts.push(addr.suburb)
          else if (addr.residential) parts.push(addr.residential)
          if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
          if (addr.state) parts.push(addr.state)
          return parts.length > 0 ? parts.join(', ') : r.display_name.split(', ').slice(0, 3).join(', ')
        })

        // Remove duplicates
        const unique = [...new Set(suggestions)].filter(s => s.length > 3)
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

  function selectLocation(suggestion) {
    setLocation(suggestion)
    setLocationSuggestions([])
    setShowSuggestions(false)
  }

  function openInGoogleMaps() {
    const query = location || 'India'
    window.open('https://www.google.com/maps/search/' + encodeURIComponent(query), '_blank')
  }

  // ── PHOTO UPLOAD ──────────────────────────────────────────────────

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    const maxSize = 5 * 1024 * 1024

    for (const file of files) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        showToast('Only JPG, PNG, WEBP and HEIC photos allowed.')
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
      setPhotos(prev => [...prev, { url: previewUrl, uploading: true, tempId }])

      try {
        const ext = file.name.split('.').pop()
        const fileName = `business-photos/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('business-photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('business-photos')
          .getPublicUrl(fileName)

        setPhotos(prev => prev.map(p =>
          p.tempId === tempId
            ? { url: urlData.publicUrl, uploading: false }
            : p
        ))
      } catch (err) {
        console.error('Upload error:', err)
        showToast('Photo upload failed. Check that the business-photos bucket exists in Supabase Storage.')
        setPhotos(prev => prev.filter(p => p.tempId !== tempId))
      }
    }

    setUploadingPhoto(false)
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  // ── SUBMIT ────────────────────────────────────────────────────────

  async function submit() {
    setLoading(true)
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-') + '-' + Date.now()

      const { data: biz, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          category,
          description: desc.trim(),
          price_range: price.trim(),
          location_area: location.trim(),
          location_city: location.includes(',') ? location.split(',').pop().trim() : 'India',
          service_radius_km: radius,
          whatsapp: whatsapp || null,
          phone: phone || null,
          profile_url: slug,
          is_active: true,
          active_since: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Save photos
      const uploadedPhotos = photos.filter(p => !p.uploading && p.url && !p.url.startsWith('blob:'))
      if (uploadedPhotos.length > 0 && biz) {
        await supabase.from('business_photos').insert(
          uploadedPhotos.map((p, i) => ({
            business_id: biz.id,
            photo_url: p.url,
            is_primary: i === 0,
            sort_order: i
          }))
        )
      }

      showToast('Your business is now live on Owneur! 🎉')
      nav('dashboard')
    } catch (err) {
      console.error('Submit error:', err)
      showToast('Error publishing listing: ' + (err.message || 'Please try again.'))
    }
    setLoading(false)
  }

  // ── RENDER ────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>

      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => step === 1 ? nav('dashboard') : back()}>←</button>
        <span className="topbar-title">Create Listing</span>
      </div>

      {/* Progress */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: progress + '%' }}></div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 420, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>
          Step {step} of 4 — {stepLabels[step - 1]}
        </p>

        {/* ── STEP 1: Business Details ── */}
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
                      border: category === cat.name ? '1.5px solid #0A6B52' : '1.5px solid rgba(0,0,0,0.12)',
                      background: category === cat.name ? '#DDF4EC' : '#fff',
                      color: category === cat.name ? '#0A6B52' : '#0D1F18'
                    }}
                  >
                    {cat.emoji} {cat.name}
                  </div>
                ))}
              </div>
              {errors.category && (
                <div className="field-error show" style={{ display: 'block', marginTop: 8 }}>{errors.category}</div>
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

        {/* ── STEP 2: Pricing ── */}
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

            <div style={{ background: '#F2F6F4', borderRadius: 12, padding: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#516B61', marginBottom: 6 }}>EXAMPLES</p>
              {['₹80 per plate', '₹2,500/month', '₹200/hour', '₹500 onwards'].map(ex => (
                <div
                  key={ex}
                  onClick={() => setPrice(ex)}
                  style={{ fontSize: 13, color: '#0A6B52', cursor: 'pointer', marginBottom: 4, fontWeight: 500 }}
                >
                  → {ex}
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={next} style={{ marginBottom: 10 }}>Next →</button>
            <button className="btn" onClick={back}>← Back</button>
          </div>
        )}

        {/* ── STEP 3: Location ── */}
        {step === 3 && (
          <div>
            {/* Map preview — tappable to open Google Maps */}
            <div
              onClick={() => setShowMapModal(true)}
              style={{
                height: 110, background: 'linear-gradient(135deg, #DDF4EC, #7ECFB0)',
                borderRadius: 14, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginBottom: 14, position: 'relative',
                border: '1.5px solid rgba(10,107,82,0.2)'
              }}
            >
              <span style={{ fontSize: 32, marginBottom: 4 }}>📍</span>
              <span style={{ fontSize: 13, color: '#0A6B52', fontWeight: 600 }}>
                {location || 'Tap to select on map'}
              </span>
              <span style={{ fontSize: 11, color: '#516B61', marginTop: 2 }}>
                Opens Google Maps to pin your exact location
              </span>
            </div>

            {/* Map modal */}
            {showMapModal && (
              <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowMapModal(false) }}>
                <div className="modal-sheet">
                  <div className="modal-handle"></div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Select Your Location</h3>
                  <p style={{ fontSize: 13, color: '#516B61', marginBottom: 14, lineHeight: 1.5 }}>
                    Type your area below and pick from suggestions, or open Google Maps to pin your exact street location.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ marginBottom: 10 }}
                    onClick={() => {
                      openInGoogleMaps()
                      setShowMapModal(false)
                    }}
                  >
                    🗺 Open Google Maps to Pin Location
                  </button>
                  <button className="btn" onClick={() => setShowMapModal(false)}>
                    Type Location Instead
                  </button>
                </div>
              </div>
            )}

            {/* Location text input with autocomplete */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">Area / Locality *</label>
              <p style={{ fontSize: 11, color: '#516B61', marginBottom: 6 }}>
                Type any area in India — Chennai, Pune, Mumbai, Delhi all work
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  className={errors.location ? 'input error' : 'input'}
                  placeholder="e.g. Koregaon Park, Pune"
                  value={location}
                  onChange={e => handleLocationInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  onFocus={() => location.length >= 2 && setShowSuggestions(locationSuggestions.length > 0)}
                  autoComplete="off"
                  autoFocus
                />
                {locationLoading && (
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#516B61', fontSize: 12 }}>
                    Searching...
                  </div>
                )}
              </div>
              {errors.location && <div className="field-error show">{errors.location}</div>}

              {/* Autocomplete dropdown */}
              {showSuggestions && locationSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                  background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  overflow: 'hidden', marginTop: 4
                }}>
                  {locationSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onMouseDown={() => selectLocation(s)}
                      style={{
                        padding: '12px 14px', cursor: 'pointer', fontSize: 14,
                        color: '#0D1F18', display: 'flex', alignItems: 'flex-start', gap: 10,
                        borderBottom: i < locationSuggestions.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none',
                        background: '#fff', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F2F6F4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ color: '#0A6B52', flexShrink: 0, marginTop: 1 }}>📍</span>
                      <span style={{ lineHeight: 1.4 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How far you can serve */}
            <label className="input-label" style={{ display: 'block', marginBottom: 10 }}>
              How far you can serve?
            </label>
            {RADII.map(r => (
              <div
                key={r.km}
                onClick={() => setRadius(r.km)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  marginBottom: 8, transition: 'all 0.12s',
                  border: radius === r.km ? '1.5px solid #0A6B52' : '1.5px solid rgba(0,0,0,0.12)',
                  background: radius === r.km ? '#DDF4EC' : '#fff'
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, transition: 'all 0.12s',
                  border: radius === r.km ? '2px solid #0A6B52' : '2px solid rgba(0,0,0,0.2)',
                  background: radius === r.km ? '#0A6B52' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {radius === r.km && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }}></div>}
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

        {/* ── STEP 4: Contact and Photos ── */}
        {step === 4 && (
          <div>
            <div style={{ background: '#DDF4EC', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#0A6B52', fontWeight: 600 }}>
                These numbers are shown to customers who want to contact you
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">WhatsApp Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '13px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F2F6F4', whiteSpace: 'nowrap' }}>
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
              <p style={{ fontSize: 11, color: '#516B61', marginTop: 4 }}>Customers will message you on WhatsApp</p>
            </div>

            <div className="input-group">
              <label className="input-label">Call Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '13px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, fontSize: 14, fontWeight: 600, background: '#F2F6F4', whiteSpace: 'nowrap' }}>
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
              <p style={{ fontSize: 11, color: '#516B61', marginTop: 4 }}>Customers can call you directly</p>
            </div>

            {/* Photos */}
            <label className="input-label" style={{ display: 'block', marginBottom: 6 }}>
              Photos ({photos.length}/5) — optional but recommended
            </label>

            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {photos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#F2F6F4' }}>
                    <img
                      src={photo.url}
                      alt={'Photo ' + (i + 1)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {photo.uploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Uploading...</span>
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        onClick={() => removePhoto(i)}
                        style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                      >✕</button>
                    )}
                    {i === 0 && (
                      <div style={{ position: 'absolute', bottom: 4, left: 4, background: '#0A6B52', borderRadius: 6, padding: '2px 6px' }}>
                        <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>COVER</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {photos.length < 5 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <div
                  onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #7ECFB0', borderRadius: 16, padding: '28px 20px',
                    textAlign: 'center', cursor: uploadingPhoto ? 'default' : 'pointer',
                    marginBottom: 14, opacity: uploadingPhoto ? 0.6 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#0D1F18' }}>
                    {uploadingPhoto ? 'Uploading photo...' : 'Add Photos'}
                  </p>
                  <p style={{ fontSize: 12, color: '#516B61' }}>
                    JPG, PNG, WEBP · Max 5MB each · Up to 5 photos
                  </p>
                </div>
              </>
            )}

            <div style={{ background: '#DDF4EC', borderRadius: 12, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>📈</span>
              <p style={{ fontSize: 12, color: '#0A6B52', fontWeight: 500 }}>
                Listings with photos get 3× more customer enquiries
              </p>
            </div>

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
