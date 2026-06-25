import React, { useState } from 'react';

export default function AdminLogin({ nav, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function login() {
    if (username === 'admin1' && password === 'owneur@2025') {
      nav('admin');
    } else {
      setError('Incorrect username or password');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F2F6F4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛡</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Admin Panel
          </h2>
          <p style={{ fontSize: 13, color: '#516B61' }}>
            Owneur Platform Administration
          </p>
        </div>
        <div className="card">
          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              className="input"
              placeholder="admin1"
              value={username}
              onChange={function (e) {
                setUsername(e.target.value);
                setError('');
              }}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={function (e) {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={function (e) {
                if (e.key === 'Enter') login();
              }}
            />
          </div>
          {error && (
            <div className="field-error show" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary" onClick={login}>
            Sign In
          </button>
        </div>
        <button
          className="btn-ghost"
          style={{ width: '100%', textAlign: 'center', marginTop: 16 }}
          onClick={function () {
            nav('landing');
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
