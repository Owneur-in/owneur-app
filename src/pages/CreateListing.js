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
        // Format suggestions: Area, City, State — clean
