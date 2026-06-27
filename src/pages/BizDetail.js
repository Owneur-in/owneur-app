/**
 * BizDetail.js — Business detail page for buyers.
 * Shows all business info, Call/WhatsApp/Save/Share/Report actions.
 * "Did seller respond" rating — works for logged-in users only.
 * Catalogue items and reviews displayed.
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CAT_EMOJI = {
  'Home Food': '🍱', 'Tiffin': '🥡', 'Mehendi': '🌸', 'Bakery': '🎂',
  'Tailoring': '✂️', 'Tuition': '📚', 'Beautician': '💄', 'Electrician': '⚡',
  'Fruits': '🍎', 'Flowers': '💐', 'Freelance': '💻', 'Others': '🔧'
}

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

export default function BizDetail({ nav, prevScreen, selectedBiz, user, showToast }) {
  const [reviews, setReviews] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [isSaved, setIsSaved] = useState(false)
  const [responseRated, setResponseRated] = useState(false)
  const [loading, setLoading] = useState(true)

  const biz = selectedBiz

  useEffect(() => {
    if (biz) {
      loadDetails()
      trackView()
    }
  }, [biz])

  async function loadDetails() {
    setLoading(true)
    try {
      // Load reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, profiles(full_name)')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setReviews(revs || [])

      // Load catalogue
      const { data: cat } = await supabase
        .from('catalogue_items')
        .select('*')
        .eq('business_id', biz.id)
        .order('sort_order')
      setCatalogue(cat || [])

      // Check if saved and if response already rated
      if (user) {
        const { data: saved } = await supabase
          .from('saved_businesses')
          .select('id')
          .eq('user_id', user.id)
          .eq('business_id', biz.id)
          .single()
        setIsSaved(!!saved)

        const { data: rated } = await supabase
          .from('response_ratings')
          .select('id')
          .eq('user_id', user.id)
          .eq('business_id', biz.id)
          .single()
        setResponseRated(!!rated)
      }
    } catch (e) {
      console.error('BizDetail load error:', e)
    }
    setLoading(false)
  }

  async function trackView() {
    try {
      await supabase
        .from('businesses')
        .update({ views: (biz.views || 0) + 1 })
        .eq('id', biz.id)
    } catch (e) {}
  }

  async function toggleSave() {
    if (!user) {
      showToast('Please log in to save businesses')
      return
    }
    try {
      if (isSaved) {
        await supabase
          .from('saved_businesses')
          .delete()
          .eq('user_id', user.id)
          .eq('business_id', biz.id)
        setIsSaved(false)
        showToast('Removed from saved')
      } else {
        await supabase
          .from('saved_businesses')
          .insert({ user_id: user.id, business_id: biz.id })
        setIsSaved(true)
        showToast('Saved!')
      }
    } catch (e) {
      showToast('Could not save. Please try again.')
    }
  }

  async function rateResponse(responded) {
    if (!user) {
      showToast('Please log in to rate seller response')
      return
    }
    if (responseRated) return

    try {
      const { error } = await supabase
        .from('response_ratings')
        .insert({
          business_id: biz.id,
          user_id: user.id,
          responded
        })
      if (error) {
        if (error.code === '23505') {
          // Already rated — unique constraint
          setResponseRated(true)
          showToast('You have already rated this seller.')
          return
        }
        throw error
      }
      setResponseRated(true)
      showToast(responded ? 'Thanks! Marked as responsive.' : 'Thanks for your feedback.')
    } catch (e) {
      console.error('Rate response error:', e)
      showToast('Could not save rating. Please try again.')
    }
  }

  function callSeller() {
    if (biz.phone) {
      supabase.from('businesses').update({ call_clicks: (biz.call_clicks || 0) + 1 }).eq('id', biz.id)
      window.location.href = 'tel:+91' + biz.phone
    } else {
      showToast('No call number provided by this seller')
    }
  }

  function openWhatsApp() {
    if (biz.whatsapp) {
      supabase.from('businesses').update({ whatsapp_clicks: (biz.whatsapp_clicks || 0) + 1 }).eq('id', biz.id)
      const msg = 'Hi, I found you on Owneur! I am interested in ' + biz.name
      window.open('https://wa.me/91' + biz.whatsapp + '?text=' + encodeURIComponent(msg), '_blank')
    } else {
      showToast('No WhatsApp number provided by this seller')
    }
  }

  function shareProfile() {
    const url = 'https://owneur-app.vercel.app'
    if (navigator.share) {
      navigator.share({ title: biz.name, text: 'Check out ' + biz.name + ' on Owneur!', url })
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
    }
  }

  async function reportBusiness() {
    if (!user) { showToast('Please log in to report a business'); return }
    try {
      await supabase.from('reports').insert({
        business_id: biz.id,
        reporter_id: user.id,
        reason: 'Reported by customer',
        status: 'open'
      })
      showToast('Report submitted. We will review within 24 hours.')
    } catch (e) {
      showToast('Report submitted.')
    }
  }

  if (!biz) return null

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Hero image */}
      <div style={{ height: 200, background: CAT_BG[biz.category] || CAT_BG['Others'], display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <button
          onClick={() => nav(prevScreen || 'home')}
          style={{ position: 'absolute', top: 12, left: 12, width: 36, height: 36, background: 'rgba(0,0,0,0.35)', borderRadius: '50%', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >←</button>
        <button
          onClick={toggleSave}
          style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, background: 'rgba(0,0,0,0.35)', borderRadius: '50%', border: 'none', color: isSaved ? '#ff6b6b' : '#fff', fontSize: 20, cursor: 'pointer' }}
        >{isSaved ? '♥' : '♡'}</button>
        <span style={{ fontSize: 64 }}>{CAT_EMOJI[biz.category] || '🔧'}</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Name and badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, flex: 1, marginRight: 8 }}>{biz.name}</h2>
          {biz.is_verified && <span className="verified-badge">✓ Verified</span>}
        </div>
        <p style={{ fontSize: 13, color: '#516B61', marginBottom: 8 }}>
          by {biz.profiles?.full_name || biz.owner_name || 'Seller'}
        </p>

        {!biz.is_active && (
          <div style={{ background: '#FEF3DC', border: '1px solid #F0A500', borderRadius: 12, padding: '10px 12px', marginBottom: 10, fontSize: 13, color: '#7A4B00' }}>
            This seller is currently not accepting new enquiries.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span className="pill pill-green">{biz.category}</span>
          <span className="dist-badge">{biz.location_area}</span>
        </div>

        {biz.active_since && (
          <p style={{ fontSize: 12, color: '#516B61', marginBottom: 14 }}>
            Active since {new Date(biz.active_since).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </p>
        )}

        {/* About */}
        {biz.description && (
          <div className="card" style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', marginBottom: 4, textTransform: 'uppercase' }}>About</p>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{biz.description}</p>
          </div>
        )}

        {/* Pricing */}
        <div className="card" style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', marginBottom: 4, textTransform: 'uppercase' }}>Pricing</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#0A6B52' }}>{biz.price_range}</p>
        </div>

        {/* Action buttons */}
        <div className="action-row">
          <button className="action-btn call" onClick={callSeller}>
            <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.99 1.18 2 2 0 013 .99h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            Call
          </button>
          <button className="action-btn chat" onClick={openWhatsApp}>
            <svg viewBox="0 0 24 24" style={{ stroke: '#2E7D32' }}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            WhatsApp
          </button>
          <button className="action-btn" onClick={toggleSave}>
            <svg viewBox="0 0 24 24" style={{ fill: isSaved ? '#E03535' : 'none', stroke: isSaved ? '#E03535' : 'currentColor' }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button className="action-btn" onClick={shareProfile}>
            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button className="action-btn" style={{ color: '#E03535' }} onClick={reportBusiness}>
            <svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            Report
          </button>
        </div>

        {/* Did seller respond */}
        <div className="card" style={{ marginBottom: 14, background: '#F2F6F4' }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            Did the seller respond to you?
          </p>
          <p style={{ fontSize: 11, color: '#516B61', marginBottom: 12 }}>
            Help other buyers know how responsive this seller is
          </p>
          {!user ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#516B61', marginBottom: 8 }}>Log in to rate seller response</p>
              <button className="btn btn-sm btn-primary" onClick={() => nav('login')}>Log In</button>
            </div>
          ) : responseRated ? (
            <p style={{ fontSize: 13, color: '#0A6B52', fontWeight: 600, textAlign: 'center' }}>
              ✓ Thanks for your feedback!
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm"
                style={{ flex: 1, background: '#DDF4EC', color: '#0A6B52', borderColor: '#0A6B52' }}
                onClick={() => rateResponse(true)}
              >
                Yes, responded
              </button>
              <button
                className="btn btn-sm"
                style={{ flex: 1 }}
                onClick={() => rateResponse(false)}
              >
                No response
              </button>
            </div>
          )}
        </div>

        {/* Catalogue */}
        {catalogue.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Menu / Catalogue</p>
            <div className="card">
              {catalogue.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < catalogue.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#DDF4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {item.emoji || '⭐'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</p>
                    {item.description && <p style={{ fontSize: 11, color: '#516B61' }}>{item.description}</p>}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 15, fontWeight: 700 }}>Reviews ({reviews.length})</p>
          {user && (
            <button
              className="btn-ghost"
              style={{ color: '#0A6B52', fontSize: 13, fontWeight: 600, padding: '4px 0' }}
              onClick={() => nav('write-review')}
            >
              Write a Review
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#516B61', fontSize: 13 }}>
            No reviews yet. Be the first to review!
          </div>
        ) : (
          <div className="card">
            {reviews.map((r, i) => (
              <div key={r.id} style={{ paddingBottom: i < reviews.length - 1 ? 12 : 0, marginBottom: i < reviews.length - 1 ? 12 : 0, borderBottom: i < reviews.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                    {r.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{r.profiles?.full_name || 'Customer'}</p>
                      <span style={{ fontSize: 11, color: '#516B61' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="stars-display" style={{ fontSize: 13 }}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </div>
                    <p style={{ fontSize: 13, color: '#516B61', marginTop: 3 }}>{r.review_text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 20 }}></div>
      </div>
    </div>
  )
}
