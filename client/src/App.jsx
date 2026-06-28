import React, { useState, useEffect } from 'react';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import ChatDashboard from './components/ChatDashboard';

export default function App() {
  // Splash Screen States
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('chat_token') || '');
  const [username, setUsername] = useState(localStorage.getItem('chat_username') || '');
  const [userId, setUserId] = useState(localStorage.getItem('chat_userid') || '');
  
  // Navigation Screen State (LOGIN, REGISTER, DASHBOARD)
  const [screen, setScreen] = useState('LOGIN');
  const [inviteToken, setInviteToken] = useState('');

  // Appearance settings (Theme & Wallpaper)
  const [theme, setTheme] = useState(localStorage.getItem('chat_theme') || 'theme-space-dark');
  const [wallpaper, setWallpaper] = useState(localStorage.getItem('chat_wallpaper') || 'wallpaper-space');

  // Splash Screen timer
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFade(true);
      const exitTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500);
      return () => clearTimeout(exitTimer);
    }, 2800);
    return () => clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('chat_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chat_wallpaper', wallpaper);
  }, [wallpaper]);
  
  // UI inputs
  const [inputUsername, setInputUsername] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [inputConfirmPassword, setInputConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL query parameters for invitation links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setInviteToken(invite);
      setScreen('REGISTER');
    }
  }, []);

  // Sync session on load
  useEffect(() => {
    if (token) {
      setScreen('DASHBOARD');
    } else {
      setScreen('LOGIN');
    }
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!inputUsername || !inputEmail || !inputPhone || !inputPassword || !inputConfirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (inputPassword !== inputConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: inputUsername,
          email: inputEmail,
          phone: inputPhone,
          password: inputPassword,
          inviteToken: inviteToken || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save credentials
      localStorage.setItem('chat_token', data.token);
      localStorage.setItem('chat_username', data.username);
      localStorage.setItem('chat_userid', data.userId.toString());
      
      setToken(data.token);
      setUsername(data.username);
      setUserId(data.userId.toString());
      setScreen('DASHBOARD');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!inputUsername || !inputPassword) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          loginId: inputUsername, // Can be username or mobile
          password: inputPassword 
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Save credentials
      localStorage.setItem('chat_token', data.token);
      localStorage.setItem('chat_username', data.username);
      localStorage.setItem('chat_userid', data.userId.toString());

      setToken(data.token);
      setUsername(data.username);
      setUserId(data.userId.toString());
      setScreen('DASHBOARD');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUsername('');
    setUserId('');
    setInputUsername('');
    setInputEmail('');
    setInputPhone('');
    setInputPassword('');
    setInputConfirmPassword('');
    setScreen('LOGIN');
  };

  // Render Splash Screen
  if (showSplash) {
    return (
      <div className={`splash-container ${splashFade ? 'fade-out' : ''}`}>
        <div className="splash-logo-only-wrapper">
          <img src="/logo.png" className="splash-logo-img" alt="Connectra" />
        </div>
      </div>
    );
  }

  // Render Dashboard
  if (screen === 'DASHBOARD' && token) {
    return (
      <ChatDashboard 
        token={token} 
        username={username} 
        userId={userId} 
        onLogout={handleLogout} 
        activeTheme={theme}
        onThemeChange={setTheme}
        activeWallpaper={wallpaper}
        onWallpaperChange={setWallpaper}
      />
    );
  }

  // Render Auth screens
  return (
    <div className="auth-container">
      <div className="auth-wrapper glass-card animate-fade-in">
        <div className="auth-branding">
          <div className="logo-icon-wrapper">
            <img src="/logo-icon.png" alt="Connectra" className="auth-logo-img" />
          </div>
          <h1>Connectra</h1>
          <p className="subtitle">Secure Communication Hub</p>
        </div>

        {screen === 'LOGIN' && (
          <form onSubmit={handleLogin} className="auth-form">
            <h2>Welcome Back</h2>
            {error && <div className="auth-error-msg">{error}</div>}
            
            <div className="input-group">
              <label>Username or Mobile</label>
              <input 
                type="text" 
                value={inputUsername} 
                onChange={(e) => setInputUsername(e.target.value)} 
                required 
                placeholder="Enter username or phone" 
              />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                value={inputPassword} 
                onChange={(e) => setInputPassword(e.target.value)} 
                required 
                placeholder="Enter password" 
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-full">
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Login'}
            </button>

            <p className="auth-footer-text">
              Don't have an account?{' '}
              <span onClick={() => { setError(''); setScreen('REGISTER'); }}>Register</span>
            </p>
          </form>
        )}

        {screen === 'REGISTER' && (
          <form onSubmit={handleRegister} className="auth-form">
            <h2>Create Account</h2>
            {inviteToken && (
              <div className="invite-alert">
                Linking contact automatically via invitation!
              </div>
            )}
            {error && <div className="auth-error-msg">{error}</div>}
            
            <div className="input-group">
              <label>Username</label>
              <input 
                type="text" 
                value={inputUsername} 
                onChange={(e) => setInputUsername(e.target.value)} 
                required 
                placeholder="Choose username" 
              />
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={inputEmail} 
                onChange={(e) => setInputEmail(e.target.value)} 
                required 
                placeholder="Enter email address" 
              />
            </div>

            <div className="input-group">
              <label>Mobile Number</label>
              <input 
                type="tel" 
                value={inputPhone} 
                onChange={(e) => setInputPhone(e.target.value)} 
                required 
                placeholder="Enter phone number" 
              />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                value={inputPassword} 
                onChange={(e) => setInputPassword(e.target.value)} 
                required 
                placeholder="Choose password" 
              />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                value={inputConfirmPassword} 
                onChange={(e) => setInputConfirmPassword(e.target.value)} 
                required 
                placeholder="Re-enter password" 
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-full">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating account...
                </>
              ) : (
                'Register'
              )}
            </button>

            <p className="auth-footer-text">
              Already have an account?{' '}
              <span onClick={() => { setError(''); setScreen('LOGIN'); }}>Login</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
