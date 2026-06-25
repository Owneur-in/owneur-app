import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CAT_BG = {
  'Home Food': 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
  Tiffin: 'linear-gradient(135deg,#FEF3DC,#FAC775)',
  Mehendi: 'linear-gradient(135deg,#FBEAF0,#F4C0D1)',
  Bakery: 'linear-gradient(135deg,#FAECE7,#F5C4B3)',
  Tuition: 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  Beautician: 'linear-gradient(135deg,#FBEAF0,#ED93B1)',
  Electrician: 'linear-gradient(135deg,#FEF3DC,#FAC775)',
  Flowers: 'linear-gradient(135deg,#EAF3DE,#C0DD97)',
  Fruits: 'linear-gradient(135deg,#DDF4EC,#7ECFB0)',
  Freelance: 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  Tailoring: 'linear-gradient(135deg,#E8F0FB,#B5D4F4)',
  Others: 'linear-gradient(135deg,#F1EFE8,#D3D1C7)',
};

const CAT_EMOJI = {
  'Home Food': '🍱',
  Tiffin: '🥡',
  Mehendi: '🌸',
  Bakery: '🎂',
  Tailoring: '✂️',
  Tuition: '📚',
  Beautician: '💄',
  Electrician: '⚡',
  Fruits: '🍎',
  Flowers: '💐',
  Freelance: '💻',
  Others: '🔧',
};

const CHIPS = [
  'All',
  'Home Food',
  'Tiffin',
  'Mehendi',
  'Bakery',
  'Tuition',
  'Beautician',
  'Electrician',
  'Verified',
];

export default function Search({ nav, setSelectedBiz }) {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(
    function () {
      doSearch(query, activeChip, sortBy);
    },
    [query, activeChip, sortBy]
  );

  async function doSearch(q, chip, sort) {
    setLoading(true);
    try {
      let req = supabase
        .from('businesses')
        .select('*, profiles(full_name)')
        .eq('is_active', true)
        .eq('is_suspended', false);

      if (chip === 'Verified') {
        req = req.eq('is_verified', true);
      } else if (chip !== 'All') {
        req = req.eq('category', chip);
      }

      if (q && q.trim()) {
        req = req.or(
          'name.ilike.%' +
            q +
            '%,description.ilike.%' +
            q +
            '%,location_area.ilike.%' +
            q +
            '%'
        );
      }

      if (sort === 'rating') {
        req = req.order('views', { ascending: false });
      } else {
        req = req.order('created_at', { ascending: false });
      }

      const { data } = await req.limit(30);
      setResults(data || []);
    } catch (e) {
      console.log('Search error:', e);
    }
    setLoading(false);
  }

  function openBiz(biz) {
    setSelectedBiz(biz);
    nav('biz-detail');
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 80 }}
    >
      {/* Search bar */}
      <div
        style={{
          background: '#fff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '0.5px solid rgba(0,0,0,0.07)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          className="back-btn"
          onClick={function () {
            nav('home');
          }}
        >
          ←
        </button>
        <div
          style={{
            flex: 1,
            background: '#F2F6F4',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            gap: 8,
          }}
        >
          <svg
            style={{
              width: 16,
              height: 16,
              stroke: '#516B61',
              fill: 'none',
              strokeWidth: 2,
              flexShrink: 0,
            }}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            style={{
              border: 'none',
              background: 'none',
              flex: 1,
              fontSize: 15,
              fontFamily: 'inherit',
              color: '#0D1F18',
              outline: 'none',
            }}
            placeholder="Search by name, category..."
            value={query}
            onChange={function (e) {
              setQuery(e.target.value);
            }}
            autoFocus
          />
          {query && (
            <button
              style={{
                border: 'none',
                background: 'none',
                color: '#516B61',
                cursor: 'pointer',
                fontSize: 16,
              }}
              onClick={function () {
                setQuery('');
              }}
            >
              x
            </button>
          )}
        </div>
        <button
          className="btn btn-sm"
          style={{ flexShrink: 0, padding: '8px 12px' }}
          onClick={function () {
            setShowFilter(!showFilter);
          }}
        >
          Filter
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div
          style={{
            background: '#fff',
            padding: '14px 16px',
            borderBottom: '0.5px solid rgba(0,0,0,0.07)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            Sort By
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { val: 'newest', label: 'Newest First' },
              { val: 'rating', label: 'Most Popular' },
            ].map(function (opt) {
              return (
                <button
                  key={opt.val}
                  onClick={function () {
                    setSortBy(opt.val);
                    setShowFilter(false);
                  }}
                  className={sortBy === opt.val ? 'chip active' : 'chip'}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="filter-row">
        {CHIPS.map(function (chip) {
          return (
            <button
              key={chip}
              className={activeChip === chip ? 'chip active' : 'chip'}
              onClick={function () {
                setActiveChip(chip);
              }}
            >
              {chip === 'Verified' ? 'Verified Only' : chip}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div style={{ padding: '0 14px 14px' }}>
        {!loading && (
          <p style={{ fontSize: 12, color: '#516B61', margin: '8px 0 10px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#516B61' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⊙</div>
            <p>Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No results found</div>
            <div className="empty-sub">Try a different word or category</div>
            <button
              className="btn btn-primary"
              onClick={function () {
                setQuery('');
                setActiveChip('All');
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          results.map(function (biz) {
            return (
              <div
                key={biz.id}
                onClick={function () {
                  openBiz(biz);
                }}
                style={{
                  background: '#fff',
                  border: '0.5px solid rgba(0,0,0,0.07)',
                  borderRadius: 16,
                  padding: '12px 14px',
                  marginBottom: 8,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    background: CAT_BG[biz.category] || CAT_BG['Others'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    flexShrink: 0,
                  }}
                >
                  {CAT_EMOJI[biz.category] || '🔧'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 4,
                    }}
                  >
                    <p
                      style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}
                    >
                      {biz.name}
                    </p>
                    {biz.is_verified && (
                      <span
                        className="verified-badge"
                        style={{ fontSize: 10, flexShrink: 0 }}
                      >
                        Verified
                      </span>
                    )}
                  </div>
                  <p
                    style={{ fontSize: 12, color: '#516B61', marginBottom: 5 }}
                  >
                    by {biz.profiles ? biz.profiles.full_name : 'Seller'} ·{' '}
                    {biz.location_area}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >
                    <span className="pill pill-green" style={{ fontSize: 10 }}>
                      {biz.category}
                    </span>
                    <span className="dist-badge">{biz.location_area}</span>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0A6B52',
                      }}
                    >
                      {biz.price_range}
                    </p>
                    {biz.active_since && (
                      <span style={{ fontSize: 10, color: '#516B61' }}>
                        Since{' '}
                        {new Date(biz.active_since).toLocaleDateString(
                          'en-IN',
                          { month: 'short', year: 'numeric' }
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom nav */}
      <div className="nav-bar">
        <button
          className="nav-item"
          onClick={function () {
            nav('home');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Discover
        </button>
        <button className="nav-item active">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Search
        </button>
        <button
          className="nav-item"
          onClick={function () {
            nav('saved');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          Saved
        </button>
        <button
          className="nav-item"
          onClick={function () {
            nav('login');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 9h13M3 15h13M16 5l5 7-5 7" />
          </svg>
          Sell
        </button>
      </div>
    </div>
  );
}
