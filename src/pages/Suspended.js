import React from 'react';

export default function Suspended({ nav }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#FDEAEA',
          borderRadius: 16,
          padding: 20,
          textAlign: 'center',
          marginBottom: 16,
          marginTop: 40,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#E03535',
            marginBottom: 6,
          }}
        >
          Your listing has been suspended
        </h2>
        <p style={{ fontSize: 13, color: '#516B61' }}>
          Reason: Reported for wrong information
        </p>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: '#516B61', lineHeight: 1.6 }}>
          Your listing has been temporarily suspended following a review by our
          team. This decision is under review.
        </p>
      </div>
      <div
        style={{
          background: '#FEF3DC',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 12, color: '#7A4B00', lineHeight: 1.5 }}>
          You can appeal this decision within 7 days. If your appeal is
          successful, your listing will be reinstated within 24 hours.
        </p>
      </div>
      <button
        className="btn btn-primary"
        style={{ marginBottom: 10 }}
        onClick={function () {
          window.open('tel:+919999900000');
        }}
      >
        Contact Support
      </button>
      <button
        className="btn"
        style={{ marginBottom: 10 }}
        onClick={function () {
          nav('terms');
        }}
      >
        Learn About Our Policies
      </button>
      <button
        className="btn-ghost"
        style={{ textAlign: 'center', color: '#516B61' }}
        onClick={function () {
          nav('landing');
        }}
      >
        Back to Home
      </button>
    </div>
  );
}
