import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function WriteReview({ nav, selectedBiz, user, showToast }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];

  async function submit() {
    if (!rating) {
      showToast('Please select a rating');
      return;
    }
    if (!user) {
      showToast('Please log in to write a review');
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from('reviews')
        .insert({
          business_id: selectedBiz.id,
          reviewer_id: user.id,
          rating,
          review_text: text,
        });
      showToast('Review submitted! Thank you.');
      nav('biz-detail');
    } catch (e) {
      showToast('You may have already reviewed this business.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="topbar">
        <button
          className="back-btn"
          onClick={function () {
            nav('biz-detail');
          }}
        >
          ←
        </button>
        <span className="topbar-title">Write a Review</span>
      </div>
      <div style={{ padding: '20px', maxWidth: 420, margin: '0 auto' }}>
        {selectedBiz && (
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 28 }}>🍱</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>
                {selectedBiz.name}
              </p>
              <span className="pill pill-green" style={{ fontSize: 11 }}>
                {selectedBiz.category}
              </span>
            </div>
          </div>
        )}
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Your Rating *
        </p>
        <div className="star-input">
          {[1, 2, 3, 4, 5].map(function (n) {
            return (
              <span
                key={n}
                className={rating >= n ? 'lit' : ''}
                onClick={function () {
                  setRating(n);
                }}
              >
                ★
              </span>
            );
          })}
        </div>
        <p style={{ fontSize: 13, color: '#516B61', marginBottom: 16 }}>
          {labels[rating] || 'Tap to rate'}
        </p>
        <div className="input-group">
          <label className="input-label">Share your experience</label>
          <textarea
            className="input"
            placeholder="What did you love? What could be better?"
            value={text}
            onChange={function (e) {
              setText(e.target.value);
            }}
            rows={4}
            maxLength={500}
          />
          <p style={{ fontSize: 11, color: '#516B61', marginTop: 4 }}>
            {text.length}/500 characters
          </p>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
