import React, { useState, useEffect, useRef } from 'react';
import { X, Palette, Ban, Loader2, User, Upload, Image as ImageIcon, Trash2, Sliders, Type, MessageSquare, Columns, Eye, Check } from 'lucide-react';

const THEMES = [
  { id: 'theme-space-dark', name: 'Space Dark', color: '#0d0e15', desc: 'Premium deep sci-fi ambiance' },
  { id: 'theme-light-glass', name: 'Light Glass', color: '#f3f4f6', desc: 'Frosted light theme' },
  { id: 'theme-midnight-navy', name: 'Midnight Navy', color: '#0f172a', desc: 'Rich maritime navy shade' },
  { id: 'theme-sakura-romance', name: 'Sakura Pink', color: '#ffe4e6', desc: 'Warm romantic pastel tint' },
  { id: 'theme-cyber-neon', name: 'Cyber Neon', color: '#022013', desc: 'Glowing matrix-style cyber green' },
  { id: 'theme-solar-sunset', name: 'Solar Sunset', color: '#1e0b24', desc: 'Amber orange and violet dusk' },
  { id: 'theme-forest-mint', name: 'Forest Mint', color: '#091912', desc: 'Deep forest shades with fresh mint' },
  { id: 'theme-dracula-noir', name: 'Dracula Noir', color: '#181825', desc: 'Classic gothic dark purple' },
  { id: 'theme-ocean-abyss', name: 'Ocean Abyss', color: '#020c1b', desc: 'Deep underwater blues' },
  { id: 'theme-aurora-borealis', name: 'Aurora', color: '#04120a', desc: 'Northern lights emerald shimmer' },
  { id: 'theme-rose-gold', name: 'Rose Gold', color: '#1a0f0f', desc: 'Warm copper and blush tones' },
  { id: 'theme-midnight-purple', name: 'Royal Purple', color: '#0d0520', desc: 'Deep regal amethyst dark' }
];

const WALLPAPERS = [
  { id: 'wallpaper-space', name: 'Deep Space', emoji: '🌌' },
  { id: 'wallpaper-romance', name: 'Love Hearts', emoji: '💕' },
  { id: 'wallpaper-birthday', name: 'Birthday Party', emoji: '🎂' },
  { id: 'wallpaper-rain', name: 'Cyber Rain', emoji: '🌧️' },
  { id: 'wallpaper-romantic', name: 'Rose Petals', emoji: '🌹' },
  { id: 'wallpaper-friends', name: 'Best Friends', emoji: '🤝' },
  { id: 'wallpaper-couples', name: 'Sweet Couple', emoji: '💑' },
  { id: 'wallpaper-galaxy', name: 'Galaxy Swirl', emoji: '🪐' },
  { id: 'wallpaper-starry', name: 'Starry Night', emoji: '✨' },
  { id: 'wallpaper-ocean', name: 'Ocean Waves', emoji: '🌊' },
  { id: 'wallpaper-cherry', name: 'Cherry Blossom', emoji: '🌸' },
  { id: 'wallpaper-snowfall', name: 'Snowfall', emoji: '❄️' },
  { id: 'wallpaper-sunset', name: 'Sunset Beach', emoji: '🌅' },
  { id: 'wallpaper-nightlife', name: 'Neon City', emoji: '🏙️' },
  { id: 'wallpaper-vintage', name: 'Retro Vintage', emoji: '📻' },
  { id: 'wallpaper-aurora', name: 'Aurora Lights', emoji: '🌈' },
  { id: 'wallpaper-moonlight', name: 'Moonlit Night', emoji: '🌙' },
  { id: 'wallpaper-tropical', name: 'Tropical Paradise', emoji: '🌴' },
  { id: 'wallpaper-festival', name: 'Festival Lights', emoji: '🎆' },
  { id: 'wallpaper-gaming', name: 'Gaming Zone', emoji: '🎮' },
  { id: 'wallpaper-lavender', name: 'Lavender Fields', emoji: '💜' },
  { id: 'wallpaper-solid-dark', name: 'Solid Dark', emoji: '⬛' },
  { id: 'wallpaper-solid-light', name: 'Solid Light', emoji: '⬜' }
];

export default function SettingsModal({ 
  token, 
  onClose, 
  activeTheme, 
  onThemeChange, 
  activeWallpaper, 
  onWallpaperChange,
  onUnblockSync,
  onProfileUpdate,
  fontSize,
  setFontSize,
  bubbleStyle,
  setBubbleStyle,
  blurIntensity,
  setBlurIntensity,
  sidebarPosition,
  setSidebarPosition,
  compactMode,
  setCompactMode
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  // Profile states
  const [userProfile, setUserProfile] = useState({ about: 'Available', profile_picture: null, custom_wallpaper: null });
  const [aboutInput, setAboutInput] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingWp, setUploadingWp] = useState(false);

  const fileInputRef = useRef(null);
  const wpInputRef = useRef(null);

  // Fetch current profile details
  const fetchMyProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        setAboutInput(data.about || 'Available');
        if (typeof onProfileUpdate === 'function') {
          onProfileUpdate(data);
        }
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  };

  // Fetch blocked list
  const fetchBlockedList = async () => {
    setLoadingBlocked(true);
    try {
      const response = await fetch('/api/auth/blocked-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setBlockedUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    fetchMyProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'blocked') {
      fetchBlockedList();
    }
  }, [activeTab]);

  const handleUnblock = async (contactId) => {
    setUnblockingId(contactId);
    try {
      const response = await fetch('/api/auth/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId })
      });
      if (response.ok) {
        setBlockedUsers(prev => prev.filter(u => u.id !== contactId));
        if (typeof onUnblockSync === 'function') onUnblockSync();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUnblockingId(null);
    }
  };

  // Update Status / About text
  const handleUpdateProfileText = async (e) => {
    e.preventDefault();
    if (!aboutInput.trim()) return;
    setUpdatingProfile(true);
    setProfileSuccessMsg('');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ about: aboutInput })
      });
      if (res.ok) {
        setProfileSuccessMsg('Profile description updated!');
        fetchMyProfile();
        setTimeout(() => setProfileSuccessMsg(''), 3000);
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Upload Avatar image
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPic(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      const profileRes = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profile_picture: uploadData.path })
      });

      if (profileRes.ok) {
        fetchMyProfile();
      } else {
        alert('Failed to update profile picture.');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  // Upload Custom Wallpaper
  const handleWallpaperFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingWp(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      const profileRes = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ custom_wallpaper: uploadData.path })
      });

      if (profileRes.ok) {
        fetchMyProfile();
        onWallpaperChange('wallpaper-custom');
      } else {
        alert('Failed to save wallpaper.');
      }
    } catch (err) {
      console.error('Error uploading wallpaper:', err);
      alert('Failed to upload custom wallpaper.');
    } finally {
      setUploadingWp(false);
    }
  };

  // Reset custom wallpaper to default
  const handleRemoveCustomWallpaper = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ custom_wallpaper: null })
      });
      if (res.ok) {
        fetchMyProfile();
        onWallpaperChange('wallpaper-space');
      }
    } catch (err) {
      console.error('Failed to reset wallpaper:', err);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name[0].toUpperCase();
  };

  return (
    <div className="modal-backdrop settings-modal-backdrop">
      <div className="settings-split-wrapper glass-card animate-zoom-in">
        
        {/* Left Settings Navigation Sidebar */}
        <div className="settings-modal-sidebar">
          <div className="settings-sidebar-branding">
            <Sliders size={20} className="text-primary" />
            <h2>Settings Control</h2>
          </div>
          
          <div className="settings-modal-tabs">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`settings-sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            >
              <User size={16} />
              <span>Profile Info</span>
            </button>
            <button 
              onClick={() => setActiveTab('general')} 
              className={`settings-sidebar-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            >
              <Palette size={16} />
              <span>Appearance</span>
            </button>
            <button 
              onClick={() => setActiveTab('blocked')} 
              className={`settings-sidebar-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
            >
              <Ban size={16} />
              <span>Blocked List</span>
            </button>
          </div>

          <button className="settings-sidebar-close-btn" onClick={onClose}>
            <X size={16} style={{ marginRight: '6px' }} />
            <span>Close settings</span>
          </button>
        </div>

        {/* Right Settings Content Area */}
        <div className="settings-modal-content">
          <button className="settings-modal-mobile-close" onClick={onClose}>
            <X size={18} />
          </button>

          {/* Profile Section */}
          {activeTab === 'profile' && (
            <div className="settings-content-section animate-fade-in">
              <div className="section-header-badge">
                <User size={14} /> <span>USER ACCOUNT</span>
              </div>
              <h2 className="section-title">My Profile Info</h2>
              <p className="section-desc">Manage your public avatar details, phone registry, and secure system presence description.</p>
              
              <div className="settings-profile-photo-container">
                <div className="settings-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
                  {uploadingPic ? (
                    <div className="avatar-loading">
                      <Loader2 className="animate-spin" size={24} />
                    </div>
                  ) : userProfile.profile_picture ? (
                    <img src={userProfile.profile_picture} alt="Profile" className="settings-profile-avatar" />
                  ) : (
                    <div className="settings-profile-initials">
                      {getInitials(userProfile.username)}
                    </div>
                  )}
                  <div className="settings-avatar-hover">
                    <Upload size={18} />
                    <span>Upload Image</span>
                  </div>
                </div>
                
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarFileSelect}
                  className="hidden-file-input"
                />
                
                <div className="settings-profile-brief">
                  <span className="profile-brief-username">@{userProfile.username}</span>
                  <span className="profile-brief-phone">{userProfile.phone}</span>
                  <span className="profile-brief-email">{userProfile.email}</span>
                </div>
              </div>

              <form onSubmit={handleUpdateProfileText} className="settings-profile-form">
                <div className="form-group">
                  <label>Status Signature</label>
                  <input 
                    type="text" 
                    value={aboutInput} 
                    onChange={(e) => setAboutInput(e.target.value)}
                    placeholder="Hey there! I am using Connectra."
                    maxLength={100}
                    className="settings-text-input"
                  />
                  <p className="form-help-text">This will be broadcasted to all your connected secure contacts.</p>
                </div>
                <button type="submit" disabled={updatingProfile} className="btn btn-primary">
                  {updatingProfile ? 'Updating Uplink...' : 'Update Status Signature'}
                </button>
                {profileSuccessMsg && <p className="settings-success-label">{profileSuccessMsg}</p>}
              </form>
            </div>
          )}

          {/* Appearance Section */}
          {activeTab === 'general' && (
            <div className="settings-content-section animate-fade-in">
              <div className="section-header-badge">
                <Palette size={14} /> <span>AESTHETICS</span>
              </div>
              <h2 className="section-title">Theme & Chat Appearance</h2>
              <p className="section-desc">Customize UI color layers, background wallpapers, message bubbles, and sidebar properties.</p>

              {/* Theme Selector */}
              <h3 className="sub-section-title"><Palette size={14} style={{ marginRight: '6px' }} /> Color Core Themes</h3>
              <div className="appearance-theme-grid">
                {THEMES.map(theme => (
                  <div 
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    className={`theme-card-premium ${activeTheme === theme.id ? 'active' : ''}`}
                  >
                    <div className="theme-card-glow-preview" style={{ backgroundColor: theme.color }}>
                      {activeTheme === theme.id && (
                        <div className="theme-check-icon">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="theme-card-info">
                      <h4>{theme.name}</h4>
                      <p>{theme.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preset Wallpapers Selector */}
              <h3 className="sub-section-title" style={{ marginTop: '24px' }}><ImageIcon size={14} style={{ marginRight: '6px' }} /> Wallpaper Presets ({WALLPAPERS.length} styles)</h3>
              <div className="appearance-wallpaper-grid">
                {WALLPAPERS.map(wp => (
                  <div 
                    key={wp.id}
                    onClick={() => onWallpaperChange(wp.id)}
                    className={`wallpaper-preview-card ${activeWallpaper === wp.id ? 'active' : ''}`}
                  >
                    <div className={`wp-preview-thumb ${wp.id}`}>
                      <span className="wp-emoji-badge">{wp.emoji}</span>
                      <div className="mini-chat-bubble me"></div>
                      <div className="mini-chat-bubble them"></div>
                      {activeWallpaper === wp.id && (
                        <div className="wp-active-check"><Check size={10} strokeWidth={3} /></div>
                      )}
                    </div>
                    <div className="wp-preview-label">
                      <span>{wp.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Chat Wallpaper */}
              <h3 className="sub-section-title" style={{ marginTop: '24px' }}><Upload size={14} style={{ marginRight: '6px' }} /> Custom Image Wallpaper</h3>
              <div className="custom-wallpaper-section">
                <input 
                  ref={wpInputRef}
                  type="file" 
                  accept="image/*"
                  onChange={handleWallpaperFileSelect}
                  className="hidden-file-input"
                />
                
                {userProfile.custom_wallpaper ? (
                  <div 
                    className={`custom-wp-select-card ${activeWallpaper === 'wallpaper-custom' ? 'active' : ''}`}
                    onClick={() => onWallpaperChange('wallpaper-custom')}
                  >
                    <div className="wp-preview-thumb custom-wp" style={{ backgroundImage: `url(${userProfile.custom_wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <div className="mini-chat-bubble me"></div>
                      <div className="mini-chat-bubble them"></div>
                    </div>
                    <div className="custom-wp-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {activeWallpaper === 'wallpaper-custom' && <Check size={14} className="text-primary" />}
                        <h4>Uploaded Custom Wallpaper</h4>
                      </div>
                      <p>Select card to apply background or delete it permanently</p>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleRemoveCustomWallpaper(); 
                        }} 
                        className="custom-wp-remove-btn"
                      >
                        <Trash2 size={12} /> Delete Uploaded Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="custom-wp-upload-zone" onClick={() => wpInputRef.current?.click()}>
                    {uploadingWp ? (
                      <Loader2 className="animate-spin text-primary" size={24} />
                    ) : (
                      <Upload size={24} className="upload-icon" />
                    )}
                    <span>Upload Custom Image Wallpaper</span>
                    <p>Supports PNG, JPG, JPEG up to 10MB</p>
                  </div>
                )}
              </div>

              {/* Advanced Chat Customization */}
              <h3 className="sub-section-title" style={{ marginTop: '28px' }}><Sliders size={14} style={{ marginRight: '6px' }} /> Advanced View Controls</h3>
              <div className="advanced-controls-container">
                
                {/* Font Size Preference */}
                <div className="control-row">
                  <div className="control-meta">
                    <div className="control-icon"><Type size={16} /></div>
                    <div className="control-desc">
                      <h4>Chat Bubble Font Size</h4>
                      <p>Scale message bubble text for optimal readability.</p>
                    </div>
                  </div>
                  <div className="segmented-selector">
                    {['small', 'medium', 'large'].map(sz => (
                      <button 
                        key={sz}
                        type="button"
                        onClick={() => setFontSize(sz)}
                        className={`segmented-btn ${fontSize === sz ? 'active' : ''}`}
                      >
                        {sz.charAt(0).toUpperCase() + sz.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Bubble Style */}
                <div className="control-row">
                  <div className="control-meta">
                    <div className="control-icon"><MessageSquare size={16} /></div>
                    <div className="control-desc">
                      <h4>Bubble Render Style</h4>
                      <p>Choose between futuristic glassmorphic and high-contrast solid bubbles.</p>
                    </div>
                  </div>
                  <div className="segmented-selector">
                    <button 
                      type="button" 
                      onClick={() => setBubbleStyle('glass')} 
                      className={`segmented-btn ${bubbleStyle === 'glass' ? 'active' : ''}`}
                    >
                      Glassmorphic
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setBubbleStyle('flat')} 
                      className={`segmented-btn ${bubbleStyle === 'flat' ? 'active' : ''}`}
                    >
                      Solid Flat
                    </button>
                  </div>
                </div>

                {/* Glass Blur Level */}
                <div className="control-row">
                  <div className="control-meta">
                    <div className="control-icon"><Eye size={16} /></div>
                    <div className="control-desc">
                      <h4>Glass Blur Intensity</h4>
                      <p>Adjust background frosted glass blur depth.</p>
                    </div>
                  </div>
                  <div className="segmented-selector">
                    {['none', 'low', 'standard', 'deep'].map(bl => (
                      <button 
                        key={bl}
                        type="button"
                        onClick={() => setBlurIntensity(bl)}
                        className={`segmented-btn ${blurIntensity === bl ? 'active' : ''}`}
                      >
                        {bl.charAt(0).toUpperCase() + bl.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Alignment */}
                <div className="control-row">
                  <div className="control-meta">
                    <div className="control-icon"><Columns size={16} /></div>
                    <div className="control-desc">
                      <h4>Chat List Position</h4>
                      <p>Align the conversation list panel to the left or right of the chat feed.</p>
                    </div>
                  </div>
                  <div className="segmented-selector">
                    <button 
                      type="button" 
                      onClick={() => setSidebarPosition('left')} 
                      className={`segmented-btn ${sidebarPosition === 'left' ? 'active' : ''}`}
                    >
                      Left Side
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSidebarPosition('right')} 
                      className={`segmented-btn ${sidebarPosition === 'right' ? 'active' : ''}`}
                    >
                      Right Side
                    </button>
                  </div>
                </div>

                {/* Compact Mode Toggle */}
                <div className="control-row">
                  <div className="control-meta">
                    <div className="control-icon"><Sliders size={16} /></div>
                    <div className="control-desc">
                      <h4>Compact Mode Dense Rows</h4>
                      <p>Reduce padding and spacing in the sidebar for dense list items.</p>
                    </div>
                  </div>
                  <label className="cyber-switch">
                    <input 
                      type="checkbox" 
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                    />
                    <span className="cyber-switch-slider"></span>
                  </label>
                </div>

              </div>
            </div>
          )}

          {/* Blocked List Section */}
          {activeTab === 'blocked' && (
            <div className="settings-content-section animate-fade-in">
              <div className="section-header-badge">
                <Ban size={14} /> <span>SECURITY</span>
              </div>
              <h2 className="section-title">Blocked Contacts</h2>
              <p className="section-desc">Restricted contacts will not be able to call you, send messages, or view your status updates.</p>
              
              {loadingBlocked ? (
                <div className="settings-empty">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : blockedUsers.length > 0 ? (
                <div className="blocked-list-scroller">
                  {blockedUsers.map(user => (
                    <div key={user.id} className="blocked-contact-premium-row">
                      <div className="blocked-avatar-circle">
                        {getInitials(user.username)}
                      </div>
                      <div className="blocked-info">
                        <h4>{user.username}</h4>
                        <p>{user.phone || 'No phone registered'}</p>
                      </div>
                      <button 
                        onClick={() => handleUnblock(user.id)}
                        disabled={unblockingId === user.id}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px' }}
                      >
                        {unblockingId === user.id ? 'Unblocking...' : 'Unblock User'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="settings-empty">
                  <Ban size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                  <p>You have not blocked any contacts yet.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
