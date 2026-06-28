import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Loader2 } from 'lucide-react';

export default function ContactProfileModal({ contact, token, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/auth/profile/${contact.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to load contact profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (contact && contact.id) fetchProfile();
  }, [contact, token]);

  const getInitials = (name) => {
    if (!name) return 'C';
    return name[0].toUpperCase();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card animate-zoom-in max-w-sm">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {loading ? (
          <div className="profile-card-loading">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="mt-2 text-sm text-gray-400">Loading profile...</p>
          </div>
        ) : profile ? (
          <div className="contact-profile-card">
            <div className="contact-profile-avatar-container">
              {profile.profile_picture ? (
                <img src={profile.profile_picture} alt={profile.username} className="contact-large-avatar" />
              ) : (
                <div className="contact-large-avatar initials">
                  {getInitials(profile.username)}
                </div>
              )}
            </div>

            <h2 className="contact-profile-name">@{profile.username}</h2>
            <div className="contact-profile-about-badge">
              <span className="about-label">Status Description</span>
              <p className="about-content">"{profile.about || 'Available'}"</p>
            </div>

            <div className="contact-profile-details-list">
              <div className="contact-profile-detail-item">
                <Phone size={16} className="text-primary" />
                <div className="detail-info">
                  <span className="detail-label">Mobile Number</span>
                  <span className="detail-value">{profile.phone}</span>
                </div>
              </div>
              <div className="contact-profile-detail-item">
                <Mail size={16} className="text-primary" />
                <div className="detail-info">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{profile.email}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-card-error">
            <p>Failed to load profile details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
