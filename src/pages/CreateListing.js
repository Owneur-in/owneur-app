import React, { useState } from 'react';
import { supabase } from '../supabase';

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
];

const RADII = [
  { km: 2, label: '2 km', desc: 'Very local — your lane or colony' },
  { km: 5, label: '5 km', desc: 'Neighbourhood reach' },
  { km: 10, label: '10 km', desc: 'Across the city' },
  { km: 20, label: '20 km', desc: 'City and surroundings' },
];

export default function CreateListing({ nav, user, showToast }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(5);
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const progress = (step / 4) * 100;

  function validateStep1() {
    const e = {};
    if (!name.trim()) e.name = 'Business name is required';
    if (!category) e.category = 'Please select a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e = {};
    if (!price.trim()) e.price = 'Please add your pricing';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3() {
    const e = {};
    if (!location.trim()) e.location = 'Please enter your area';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(function (s) {
      return s + 1;
    });
  }

  async function submit() {
    setLoading(true);
    try {
      const slug =
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      const { error } = await supabase.from('businesses').insert({
        owner_id: user.id,
        name: name.trim(),
        category: category,
        description: desc.trim(),
        price_range: price.trim(),
        location_area: location.trim(),
        service_radius_km: radius,
        whatsapp: whatsapp || null,
        phone: phone || null,
        profile_url: slug,
        is_active: true,
      });
      if (error) throw error;
      showToast('You are live on Owneur!');
      nav('dashboard');
    } catch (e) {
      showToast('Error creating listing. Please try again.');
    }
    setLoading(false);
  }

  const stepLabels = [
    'Business Details',
    'Pricing',
    'Location and Reach',
    'Contact and Photos',
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button
          className="back-btn"
          onClick={function () {
            step > 1
              ? setStep(function (s) {
                  return s - 1;
                })
              : nav('dashboard');
          }}
        >
          ←
        </button>
        <span className="topbar-title">Create Listing</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: progress + '%' }}></div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 420, margin: '0 auto' }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#516B61',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Step {step} of 4 — {stepLabels[step - 1]}
        </p>

        {step === 1 && (
          <div>
            <div className="input-group">
              <label className="input-label">Business Name *</label>
              <input
                className={errors.name ? 'input error' : 'input'}
                placeholder="e.g. Priya Home Kitchen"
                value={name}
                onChange={function (e) {
                  setName(e.target.value);
                  setErrors({});
                }}
              />
              {errors.name && (
                <div className="field-error show">{errors.name}</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Category *</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {CATEGORIES.map(function (cat) {
                  const selected = category === cat.name;
                  return (
                    <div
                      key={cat.name}
                      onClick={function () {
                        setCategory(cat.name);
                        setErrors({});
                      }}
                      style={{
                        padding: '10px 12px',
                        border: selected
                          ? '1.5px solid #0A6B52'
                          : '1.5px solid rgba(0,0,0,0.12)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        background: selected ? '#DDF4EC' : '#fff',
                        color: selected ? '#0A6B52' : '#0D1F18',
                      }}
                    >
                      {cat.emoji} {cat.name}
                    </div>
                  );
                })}
              </div>
              {errors.category && (
                <div className="field-error show">{errors.category}</div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="input"
                placeholder="Tell customers what makes you special..."
                value={desc}
                onChange={function (e) {
                  setDesc(e.target.value);
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="input-group">
              <label className="input-label">Price Range *</label>
              <input
                className={errors.price ? 'input error' : 'input'}
                placeholder="e.g. Rs.80-Rs.200 per plate"
                value={price}
                onChange={function (e) {
                  setPrice(e.target.value);
                  setErrors({});
                }}
              />
              {errors.price && (
                <div className="field-error show">{errors.price}</div>
              )}
            </div>
            <div
              style={{
                background: '#F2F6F4',
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#516B61',
                  marginBottom: 4,
                }}
              >
                EXAMPLE FORMATS
              </p>
              <p style={{ fontSize: 13, color: '#516B61' }}>
                Rs.80 per plate, Rs.2500/month, Rs.200/hour, Rs.500 onwards
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="input-group">
              <label className="input-label">Area / Locality *</label>
              <input
                className={errors.location ? 'input error' : 'input'}
                placeholder="e.g. Anna Nagar, Chennai"
                value={location}
                onChange={function (e) {
                  setLocation(e.target.value);
                  setErrors({});
                }}
              />
              {errors.location && (
                <div className="field-error show">{errors.location}</div>
              )}
            </div>

            <label className="input-label" style={{ marginBottom: 10 }}>
              Service Radius
            </label>
            {RADII.map(function (r) {
              const selected = radius === r.km;
              return (
                <div
                  key={r.km}
                  onClick={function () {
                    setRadius(r.km);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    border: selected
                      ? '1.5px solid #0A6B52'
                      : '1.5px solid rgba(0,0,0,0.12)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    marginBottom: 8,
                    background: selected ? '#DDF4EC' : '#fff',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: selected
                        ? '2px solid #0A6B52'
                        : '2px solid rgba(0,0,0,0.2)',
                      background: selected ? '#0A6B52' : 'transparent',
                      flexShrink: 0,
                    }}
                  ></div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</p>
                    <p style={{ fontSize: 12, color: '#516B61' }}>{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="input-group">
              <label className="input-label">WhatsApp Number</label>
              <input
                className="input"
                type="tel"
                placeholder="98765 43210"
                value={whatsapp}
                onChange={function (e) {
                  setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10));
                }}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Call Number</label>
              <input
                className="input"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={function (e) {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                }}
              />
            </div>
            <div
              onClick={function () {
                showToast('Photo upload coming soon!');
              }}
              style={{
                border: '2px dashed #7ECFB0',
                borderRadius: 16,
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                Add Photos
              </p>
              <p style={{ fontSize: 12, color: '#516B61' }}>
                JPG or PNG, up to 5MB, max 5 photos
              </p>
            </div>
            <div
              style={{
                background: '#DDF4EC',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 12, color: '#0A6B52' }}>
                Listings with photos get 3x more enquiries
              </p>
            </div>
          </div>
        )}

        {step < 4 ? (
          <button className="btn btn-primary" onClick={next}>
            Next
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Publishing...' : 'Publish My Business'}
          </button>
        )}
      </div>
    </div>
  );
}
