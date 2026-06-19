import { useState } from 'react';
import { apiCall } from '../api';

export default function Auth({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!username || !password) return alert('Enter username and password');
    setLoading(true);
    const res = await apiCall('/login', { username, password });
    setLoading(false);
    if (res.error) return alert(res.error);
    onLogin(res, username);
  }

  async function handleRegister() {
    if (!username || !password) return alert('Enter username and password');
    setLoading(true);
    const res = await apiCall('/register', { username, password });
    setLoading(false);
    if (res.error) return alert(res.error);
    alert('Account created! You can now log in.');
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <div className="auth-container">
      <div className="auth-brand">IRON LOG</div>
      <div className="card" style={{ padding: 24 }}>
        <input
          type="text"
          className="input-field"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={handleKey}
          style={{ marginBottom: 16 }}
          autoCapitalize="none"
        />
        <input
          type="password"
          className="input-field"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKey}
          style={{ marginBottom: 24 }}
        />
        <button
          className="btn btn-primary"
          style={{ marginBottom: 12, padding: 14 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Log In'}
        </button>
        <button
          className="btn"
          style={{ padding: 14 }}
          onClick={handleRegister}
          disabled={loading}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
