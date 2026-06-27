
/**
 * Catalogue.js
 *
 * PURPOSE: Seller manages their product/service menu.
 * FEATURES: Add item, edit item, delete item.
 * DATA: Reads/writes to catalogue_items table in Supabase.
 * SECURITY: Only the business owner can modify items (enforced by RLS).
 */
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Catalogue({ nav, user, showToast }) {
  const [business, setBusiness] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formEmoji, setFormEmoji] = useState('⭐')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) loadData() }, [user])

  /** Load business and its catalogue items */
  async function loadData() {
    setLoading(true)
    try {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, category')
        .eq('owner_id', user.id)
        .single()
      setBusiness(biz)

      if (biz) {
        const { data: catItems } = await supabase
          .from('catalogue_items')
          .select('*')
          .eq('business_id', biz.id)
          .order('sort_order')
        setItems(catItems || [])
      }
    } catch (e) {
      console.error('Catalogue load error:', e)
    }
    setLoading(false)
  }

  /** Open add form (blank) */
  function openAddForm() {
    setEditingItem(null)
    setFormName('')
    setFormDesc('')
    setFormPrice('')
    setFormCategory('')
    setFormEmoji('⭐')
    setFormError('')
    setShowForm(true)
  }

  /** Open edit form prefilled with item data */
  function openEditForm(item) {
    setEditingItem(item)
    setFormName(item.name)
    setFormDesc(item.description || '')
    setFormPrice(item.price || '')
    setFormCategory(item.category_label || '')
    setFormEmoji(item.emoji || '⭐')
    setFormError('')
    setShowForm(true)
  }

  /** Save item — insert or update */
  async function saveItem() {
    if (!formName.trim()) { setFormError('Item name is required'); return }
    if (!formPrice.trim()) { setFormError('Price is required'); return }
    setSaving(true)
    try {
      const payload = {
        business_id: business.id,
        name: formName.trim(),
        description: formDesc.trim(),
        price: formPrice.trim(),
        category_label: formCategory.trim(),
        emoji: formEmoji,
        sort_order: editingItem ? editingItem.sort_order : items.length
      }

      if (editingItem) {
        // Update existing item
        await supabase.from('catalogue_items').update(payload).eq('id', editingItem.id)
        showToast('Item updated!')
      } else {
        // Add new item
        await supabase.from('catalogue_items').insert(payload)
        showToast('Item added!')
      }

      setShowForm(false)
      await loadData()
    } catch (e) {
      setFormError('Could not save item. Please try again.')
      console.error('Save item error:', e)
    }
    setSaving(false)
  }

  /** Delete item with confirmation */
  async function deleteItem(item) {
    if (!window.confirm('Delete "' + item.name + '"? This cannot be undone.')) return
    try {
      await supabase.from('catalogue_items').delete().eq('id', item.id)
      showToast('Item deleted.')
      await loadData()
    } catch (e) {
      showToast('Could not delete item. Try again.')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#516B61' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⊙</div>
          <p>Loading catalogue...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4', paddingBottom: 40 }}>
      {/* Top bar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('dashboard')}>←</button>
        <span className="topbar-title">My Catalogue</span>
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={openAddForm}
        >+ Add Item</button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Business name */}
        {business && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>📋</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{business.name}</p>
              <p style={{ fontSize: 12, color: '#516B61' }}>{items.length} item{items.length !== 1 ? 's' : ''} in catalogue</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No items yet</div>
            <div className="empty-sub">Add your products or services so customers know what you offer and at what price.</div>
            <button className="btn btn-primary" onClick={openAddForm}>Add First Item</button>
          </div>
        ) : (
          /* Group items by category_label */
          Object.entries(
            items.reduce((groups, item) => {
              const key = item.category_label || 'General'
              if (!groups[key]) groups[key] = []
              groups[key].push(item)
              return groups
            }, {})
          ).map(([category, categoryItems]) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#516B61', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {category}
              </p>
              <div className="card">
                {categoryItems.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 0',
                      borderBottom: i < categoryItems.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none'
                    }}
                  >
                    {/* Emoji thumbnail */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: '#DDF4EC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0
                    }}>
                      {item.emoji || '⭐'}
                    </div>

                    {/* Item details */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                      {item.description && (
                        <p style={{ fontSize: 12, color: '#516B61', marginTop: 2 }}>{item.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#0D1F18' }}>{item.price}</p>
                    </div>

                    {/* Edit / Delete buttons */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => openEditForm(item)}
                      >Edit</button>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, padding: '5px 10px', color: '#E03535', borderColor: '#E03535' }}
                        onClick={() => deleteItem(item)}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit form — slide-up sheet */}
      {showForm && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal-sheet">
            <div className="modal-handle"></div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>

            <div className="input-group">
              <label className="input-label">Item Name *</label>
              <input
                className={formError && !formName ? 'input error' : 'input'}
                placeholder="e.g. Chicken Biryani"
                value={formName}
                onChange={e => { setFormName(e.target.value); setFormError('') }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <input
                className="input"
                placeholder="e.g. Full plate, serves 1"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Price *</label>
              <input
                className={formError && !formPrice ? 'input error' : 'input'}
                placeholder="e.g. ₹180 per plate"
                value={formPrice}
                onChange={e => { setFormPrice(e.target.value); setFormError('') }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Category / Section Label</label>
              <input
                className="input"
                placeholder="e.g. Rice Meals, Tiffin, Desserts"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Emoji Icon</label>
              <input
                className="input"
                placeholder="⭐"
                value={formEmoji}
                onChange={e => setFormEmoji(e.target.value)}
                style={{ fontSize: 20 }}
              />
            </div>

            {formError && <div className="field-error show" style={{ marginBottom: 12 }}>{formError}</div>}

            <button
              className="btn btn-primary"
              onClick={saveItem}
              disabled={saving}
              style={{ marginBottom: 10, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
            </button>
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
