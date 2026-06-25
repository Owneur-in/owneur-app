import React from 'react';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    text: 'By accessing or using Owneur, you agree to be bound by these Terms of Service. These Terms apply to all users — buyers, sellers, and visitors. If you do not agree, do not use the Platform.',
  },
  {
    title: '2. Platform Overview',
    text: 'Owneur is a hyperlocal business discovery platform. It facilitates discovery and lead generation only. Owneur does not facilitate, process, or guarantee any transactions, payments, deliveries, or services between buyers and sellers.',
  },
  {
    title: '3. Seller Registration and KYC',
    text: 'Sellers must provide a valid Indian mobile number for OTP verification. Each account may have one active listing under the Free Plan. Sellers must complete Aadhaar-based KYC. Providing false identity information is a criminal offence under Indian law. Owneur reserves the right to permanently ban any account found misrepresenting identity.',
  },
  {
    title: '4. Prohibited Content',
    text: 'Users must NOT list or promote: illegal goods or services, narcotics, weapons, counterfeit items, adult or obscene content, financial schemes or MLM, or any service that endangers health, safety, or public order. Owneur is not liable for illegal listings. Violations result in immediate suspension and potential reporting to law enforcement.',
  },
  {
    title: '5. Subscription and Payments',
    text: 'The Free Plan allows 1 active listing per verified account. Additional listings require a Premium subscription at Rs.99 per month per listing. Payments processed via Razorpay. No refunds for partial months. Owneur may modify pricing with 30 days notice.',
  },
  {
    title: '6. Reviews and Content',
    text: 'Customers may leave one review per business. Reviews must be based on genuine personal experience. Fake or malicious reviews violate these Terms. Sellers may not incentivise positive reviews. Owneur moderates reviews and may remove any that violate these Terms.',
  },
  {
    title: '7. Limitation of Liability',
    text: 'Owneur is a discovery platform only. We do not verify the quality, legality, or safety of any listed business. Owneur is not liable for any loss or harm arising from transactions between buyers and sellers. Maximum liability shall not exceed subscription fees paid in the last 3 months.',
  },
  {
    title: '8. Data and Privacy',
    text: 'We collect minimum data needed to operate the Platform. Aadhaar numbers are never stored. Your mobile number is visible on your public listing. We do not sell personal data to third parties. Data handling complies with the IT Act 2000 and Digital Personal Data Protection Act 2023.',
  },
  {
    title: '9. Suspension and Termination',
    text: 'Owneur may suspend or terminate any account for violation of these Terms, repeated customer reports, fraudulent activity, or inactivity exceeding 12 months. Suspended sellers will be notified and may appeal within 7 days at support@owneur.in.',
  },
  {
    title: '10. Governing Law',
    text: 'These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of the courts of Chennai, Tamil Nadu.',
  },
  {
    title: '11. Contact',
    text: 'For queries: support@owneur.in. WhatsApp: +91 99999 00000. Monday to Saturday, 9 AM to 8 PM IST.',
  },
];

export default function Terms({ nav }) {
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
        <span className="topbar-title">Terms and Conditions</span>
      </div>
      <div style={{ padding: 16 }}>
        <div className="card" style={{ marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            Owneur Terms of Service
          </p>
          <p style={{ fontSize: 12, color: '#516B61' }}>
            Effective: 1 January 2025. Last updated: 1 June 2025
          </p>
        </div>
        {SECTIONS.map(function (s) {
          return (
            <div key={s.title} style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#0D1F18',
                  marginBottom: 6,
                }}
              >
                {s.title}
              </p>
              <p style={{ fontSize: 13, color: '#516B61', lineHeight: 1.7 }}>
                {s.text}
              </p>
            </div>
          );
        })}
        <div style={{ height: 20 }}></div>
      </div>
    </div>
  );
}
