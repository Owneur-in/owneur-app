import React, { useState } from 'react';

const FAQS = [
  {
    q: 'How do I create a listing on Owneur?',
    a: 'Tap List My Business on the home screen, verify your mobile number with OTP, complete KYC with Aadhaar, and fill the 4-step listing form. Your business goes live in under 2 minutes.',
  },
  {
    q: 'How do customers find me?',
    a: 'Customers in your selected service radius see your listing automatically. The closer you are, the higher you appear. Verified sellers with more reviews rank better.',
  },
  {
    q: 'What is the Free plan limit?',
    a: 'Free plan allows 1 active listing per verified account. Additional listings require a Premium subscription at Rs.99 per month.',
  },
  {
    q: 'How do I get Verified?',
    a: 'Complete Aadhaar OTP verification in your Profile. Once verified, you receive a blue Verified badge that improves your ranking and builds customer trust.',
  },
  {
    q: 'Can I add a product catalogue?',
    a: 'Yes! Go to your Dashboard, tap Catalogue, and add items with name, description, and price. Your catalogue is shown on your public listing page.',
  },
  {
    q: 'Does Owneur handle payments or delivery?',
    a: 'No. Owneur only helps customers discover and contact you. All payments, delivery, and arrangements are directly between you and your customer.',
  },
  {
    q: 'What is my Digital Address?',
    a: 'Every seller gets a unique URL like owneur.in/your-name. Share this in your WhatsApp status, Instagram bio, or visiting cards.',
  },
  {
    q: 'How do I respond to reviews?',
    a: 'In your Dashboard, scroll to Recent Reviews. You can see all reviews. You cannot delete customer reviews but you can reply to them.',
  },
  {
    q: 'What if my listing gets reported?',
    a: 'Our team reviews all reports within 24 hours. If valid, we may send a warning, temporarily suspend, or remove the listing. We always notify the seller with the reason.',
  },
];

export default function FAQ({ nav }) {
  const [open, setOpen] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: '#F2F6F4' }}>
      <div className="topbar">
        <button
          className="back-btn"
          onClick={function () {
            nav('seller-profile');
          }}
        >
          ←
        </button>
        <span className="topbar-title">Help and FAQ</span>
      </div>
      <div style={{ background: '#0A6B52', padding: 20, color: '#fff' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          How can we help?
        </h3>
        <p style={{ fontSize: 13, opacity: 0.85 }}>
          Browse common questions or contact us at support@owneur.in
        </p>
      </div>
      <div style={{ padding: 16 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          {FAQS.map(function (faq, i) {
            return (
              <div
                key={i}
                style={{
                  borderBottom:
                    i < FAQS.length - 1
                      ? '0.5px solid rgba(0,0,0,0.07)'
                      : 'none',
                }}
              >
                <div
                  onClick={function () {
                    setOpen(open === i ? null : i);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <span>{faq.q}</span>
                  <span
                    style={{
                      fontSize: 18,
                      color: '#516B61',
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {open === i ? '∧' : '›'}
                  </span>
                </div>
                {open === i && (
                  <p
                    style={{
                      fontSize: 13,
                      color: '#516B61',
                      lineHeight: 1.6,
                      paddingBottom: 14,
                    }}
                  >
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ background: '#DDF4EC', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            Still need help?
          </p>
          <p style={{ fontSize: 12, color: '#516B61', marginBottom: 12 }}>
            Mon–Sat, 9 AM – 8 PM IST
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, fontSize: 13, padding: 10 }}
              onClick={function () {
                window.open(
                  'https://wa.me/919999900000?text=Hi Owneur support, I need help with...',
                  '_blank'
                );
              }}
            >
              WhatsApp Us
            </button>
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontSize: 13, padding: 10 }}
              onClick={function () {
                window.open(
                  'mailto:support@owneur.in?subject=Help needed',
                  '_blank'
                );
              }}
            >
              Email Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
