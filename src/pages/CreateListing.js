/**
 * CreateListing.js
 *
 * PURPOSE: 4-step form for sellers to create a business listing.
 * STEPS:
 *   1. Business name, category, description
 *   2. Pricing
 *   3. Location (Google Places autocomplete) + service radius
 *   4. Contact details + photo upload
 * PREFILL: Phone number from seller profile is prefilled in step 4.
 * SECURITY: Only authenticated users can create listings.
 *   Content checked for prohibited keywords before saving.
 */
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

/** Categories with emoji */
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

/** Radius options — includes 1km */
const RADII = [
  { km: 1,  label: '1 km',  desc: 'Your immediate street or building' },
  { km: 2,  label: '2 km',  desc: 'Very local — your lane or colony' },
  { km: 5,  label: '5 km',  desc: 'Neighbourhood reach' },
  { km: 10, label: '10 km', desc: 'Across the city' },
  { km: 20, label: '20 km', desc: 'City and surroundings' },
]

/** Words not allowed in listings — legal protection */
const PROHIBITED = ['drugs', 'weapon', 'gun', 'bomb', 'hack', 'scam', 'fraud', 'illegal', 'fake']

export default function CreateListing({ nav, user, showToast, mobileNumber }) {
  const [step, setStep] = useState(1)

  // Step 1 fields
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [desc, setDesc] = useState('')

  // Step 2 fields
  const [price, setPrice] = useState('')

  // Step 3 fields
  const [location, setLocation] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [radius, setRadius] = useState(5)
  const [showMap, setShowMap] = useState(false)

  // Step 4 fields
  const [whatsapp, setWhatsapp] = useState('')
  const [phone, setPhone] = useState('')
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const locationRef = useRef(null)
  const fileInputRef = useRef(null)

  // Prefill phone from seller's profile
  useEffect(() => {
    if (mobileNumber) setPhone(mobileNumber)
  }, [mobileNumber])

  const progress = (step / 4) * 100

  /** Validate step 1 fields */
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

  /**
   * Google Places autocomplete for location field.
   * Uses the Places API to suggest Indian localities.
   */
  async function handleLocationInput(val) {
    setLocation(val)
    setErrors({})

    if (val.length < 3) { setLocationSuggestions([]); setShowSuggestions(false); return }

    try {
      // Using free Nominatim API (OpenStreetMap) — no billing required
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ', India')}&format=json&limit=5&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const results = await response.json()
      const suggestions = results.map(r => {
        // Clean up the display name to show just area, city
        const parts = r.display_name.split(', ')
        return parts.slice(0, 3).join(', ')
      })
      // Remove duplicates
      const unique = [...new Set(suggestions)]
      setLocationSuggestions(unique)
      setShowSuggestions(unique.length > 0)
    } catch (e) {
      console.error('Location search error:', e)
      setLocationSuggestions([])
    }
  }

  /** User selects a location suggestion */
  function selectLocation(suggestion) {
    setLocation(suggestion)
    setLocationSuggestions([])
    setShowSuggestions(false)
  }

  /**
   * Handle photo upload.
   * Accepts JPG, PNG, WEBP up to 5MB.
   * Uploads to Supabase Storage.
   */
  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    const maxSize = 5 * 1024 * 1024 // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showToast('Only JPG, PNG, and WEBP photos are allowed.')
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
      try {
        // Create a preview URL for immediate display
        const previewUrl = URL.createObjectURL(file)
        setPhotos(prev => [...prev, { url: previewUrl, file, uploading: true }])

        // Upload to Supabase storage
        const fileName = `business-photos/${user.id}/${Date.now()}-${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-photos')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: publicUrl } = supabase.storage
          .from('business-photos')
          .getPublicUrl(fileName)

        // Replace preview with real URL
        setPhotos(prev => prev.map(p =>
          p.url === previewUrl
            ? { url: publicUrl.publicUrl, uploading: false }
            : p
        ))
      } catch (e) {
        console.error('Photo upload error:', e)
        showToast('Photo upload failed. Please try again.')
        setPhotos(prev => prev.filter(p => !p.uploading))
      }
    }

    setUploadingPhoto(false)
  }

  /** Remove a photo */
  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  /** Submit the listing to Supabase */
  async function submit() {
    setLoading(true)
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()

      const { data: biz, error } = await supabase.from('businesses').insert({
        owner_id: user.id,
        name: name.trim(),
        category,
        description: desc.trim(),
        price_range: price.trim(),
        location_area: location.trim(),
        location_city: 'India',
        service_radius_km: radius,
        whatsapp: whatsapp || null,
        phone: phone || null,
        profile_url: slug,
        is_active: true,
      }).select().single()

      if (error) throw error

      // Save photo URLs to business_photos table
      if (photos.length > 0 && biz) {
        const photoRows = photos.map((p, i) => ({
          business_id: biz.id,
          photo_url: p.url,
          is_primary: i === 0,
          sort_order: i
        }))
        await supabase.from('business_photos').insert(photoRows)
      }

      showToast('You are live on Owneur!')
      nav('dashboard')
    } catch (e) {
      console.error('Submit listing error:', e)
      showToast('Error creating listing. Please try again.')
    }
    setLoading(false)
  }

  const stepLabels = ['Business Details', 'Pricing', 'Location and Reach', 'Contact and Photos']

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Top bar with back button */}
      <div className="topbar">
        <button className="back-btn" onClick={() => step === 1 ? nav('dashboard') : back()}>←</button>
        <span className="topbar-title">Create Listing</span>
      </div>

      {/* Progress bar */}
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
                      fontSize: 13, fontWeight: 500,
                      border: category === cat.name ? '1.5px solid #0A6B52' : '1.5px solid rgba(0,0,0,0.12)',
                      background: category === cat.name ? '#DDF4EC' : '#fff',
                      color: category === cat.name ? '#0A6B52' : '#0D1F18',
                      transition: 'all 0.12s'
                    }}
                  >
                    {cat.emoji} {cat.name}
                  </div>
                ))}
              </div>
              {errors.category && <div className="field-error show" style={{ display: 'block', marginTop: 8 }}>{errors.category}</div>}
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="input"
                placeholder="Tell customers what makes you special..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
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
              />
              {errors.price && <div className="field-error show">{errors.price}</div>}
            </div>

            <div style={{ background: '#F2F6F4', borderRadius: 12, padding: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#516B61', marginBottom: 4 }}>EXAMPLE FORMATS</p>
              <p style={{ fontSize: 13, color: '#516B61' }}>₹80 per plate · ₹2,500/month · ₹200/hour · ₹500 onwards</p>
            </div>

            <button className="btn btn-primary" onClick={next} style={{ marginBottom: 10 }}>Next →</button>
            <button className="btn" onClick={back}>← Back</button>
          </div>
        )}

        {/* ── STEP 3: Location and Reach ── */}
        {step === 3 && (
          <div>
            {/* Map placeholder — shows a tap-to-expand map modal */}
            <div
              onClick={() => setShowMap(true)}
              style={{
                height: 120, background: 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
                borderRadius: 12, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginBottom: 14, position: 'relative'
              }}
            >
              <span style={{ fontSize: 28, marginBottom: 4 }}>📍</span>
              <span style={{ fontSize: 13, color: '#0A6B52', fontWeight: 600 }}>Tap to confirm location on map</span>
              <span style={{ fontSize: 11, color: '#516B61', marginTop: 2 }}>Helps customers find you accurately</span>
            </div>

            {/* Map modal */}
            {showMap && (
              <div
                className="modal-overlay open"
                onClick={e => { if (e.target === e.currentTarget) setShowMap(false) }}
              >
                <div className="modal-sheet">
                  <div className="modal-handle"></div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Your Location</h3>
                  <div style={{
                    height: 220, background: 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
                    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12, fontSize: 48
                  }}>
                    📍
                    <p style={{ fontSize: 13, color: '#0A6B52', marginLeft: 8 }}>
                      {location || 'Enter your area below'}
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: '#516B61', marginBottom: 12 }}>
                    Full map integration available after domain setup. Enter your area in the field below for now.
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowMap(false)}>Confirm Location</button>
                </div>
              </div>
            )}

            {/* Location input with autocomplete */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label">Area / Locality *</label>
              <input
                ref={locationRef}
                className={errors.location ? 'input error' : 'input'}
                placeholder="e.g. Anna Nagar, Chennai"
                value={location}
                onChange={e => handleLocationInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoComplete="off"
              />
              {errors.location && <div className="field-error show">{errors.location}</div>}

              {/* Autocomplete dropdown */}
              {showSuggestions && locationSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 12, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', marginTop: 4
                }}>
                  {locationSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onMouseDown={() => selectLocation(s)}
                      style={{
                        padding: '12px 14px', cursor: 'pointer', fontSize: 14,
                        borderBottom: i < locationSuggestions.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 8
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F2F6F4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ color: '#0A6B52' }}>📍</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service radius — renamed to "How far you can serve?" */}
            <label className="input-label" style={{ marginBottom: 10, display: 'block' }}>
              How far you can serve?
            </label>
            {RADII.map(r => (
              <div
                key={r.km}
                onClick={() => setRadius(r.km)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer', marginBottom: 8,
                  border: radius === r.km ? '1.5px solid #0A6B52' : '1.5px solid rgba(0,0,0,0.12)',
                  background: radius === r.km ? '#DDF4EC' : '#fff',
                  transition: 'all 0.12s'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: radius === r.km ? '2px solid #0A6B52' : '2px solid rgba(0,0,0,0.2)',
                  background: radius === r.km ? '#0A6B52' : 'transparent',
                  transition: 'all 0.12s'
                }}></div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</p>
                  <p style={{ fontSize: 12, color: '#516B61' }}>{r.desc}</p>
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
            {/* WhatsApp — prefilled from profile */}
            <div className="input-group">
              <label className="input-label">WhatsApp Number</label>
              <p style={{ fontSize: 11, color: '#516B61', marginBottom: 6 }}>
                Customers will WhatsApp you on this number
              </p>
              <input
                className="input"
                type="tel"
                placeholder="98765 43210"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>

            {/* Call number — prefilled from login */}
            <div className="input-group">
              <label className="input-label">Call Number</label>
              <p style={{ fontSize: 11, color: '#516B61', marginBottom: 6 }}>
                Customers will call you on this number
              </p>
              <input
                className="input"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>

            {/* Photo upload */}
            <label className="input-label" style={{ display: 'block', marginBottom: 8 }}>
              Photos ({photos.length}/5)
            </label>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {photos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#F2F6F4' }}>
                    <img
                      src={photo.url}
                      alt={'Business photo ' + (i + 1)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {photo.uploading && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12
                      }}>Uploading...</div>
                    )}
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, background: 'rgba(0,0,0,0.5)',
                        border: 'none', borderRadius: '50%', color: '#fff',
                        cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >✕</button>
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
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #7ECFB0', borderRadius: 16, padding: '28px 20px',
                    textAlign: 'center', cursor: 'pointer', marginBottom: 12,
                    opacity: uploadingPhoto ? 0.6 : 1
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {uploadingPhoto ? 'Uploading...' : 'Add Photos'}
                  </p>
                  <p style={{ fontSize: 12, color: '#516B61' }}>
                    JPG, PNG or WEBP · Max 5MB each · Up to 5 photos
                  </p>
                </div>
              </>
            )}

            <div style={{ background: '#DDF4EC', borderRadius: 12, padding: '10px 14px', marginBottom: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#0A6B52' }}>📈 Listings with photos get 3× more enquiries</p>
            </div>

            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={loading || uploadingPhoto}
              style={{ marginBottom: 10, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Publishing...' : 'Publish My Business 🚀'}
            </button>
            <button className="btn" onClick={back}>← Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
