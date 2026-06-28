import React, { useState } from 'react';
import { Copy, Check, X, Loader2, Link2 } from 'lucide-react';

export default function InviteModal({ onClose, token: userToken }) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateInvite = async () => {
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const response = await fetch('/api/invites/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      });
      const data = await response.json();
      if (response.ok && data.token) {
        // Construct complete URL using window.location.origin
        const url = `${window.location.origin}/register?invite=${data.token}`;
        setInviteUrl(url);
      } else {
        setError(data.error || 'Failed to create invitation link');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card animate-zoom-in">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
        
        <div className="modal-header-section">
          <Link2 size={28} className="modal-icon text-primary" />
          <h2>Invite Your Close Ones</h2>
          <p>Generate a secure link to add your friends, family, or partner directly to your contact list.</p>
        </div>

        <div className="modal-body-section">
          {error && <div className="modal-error">{error}</div>}

          {inviteUrl ? (
            <div className="invite-link-container">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="invite-link-input"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={copyToClipboard}
                className={`invite-copy-btn ${copied ? 'copied' : ''}`}
                title="Copy Link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={generateInvite}
              disabled={loading}
              className="btn btn-primary btn-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Generating...
                </>
              ) : (
                'Create Invitation Link'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
