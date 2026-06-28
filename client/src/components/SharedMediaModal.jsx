import React, { useState, useEffect } from 'react';
import { X, Image, Video, Music, FileText, Download, Play, Pause } from 'lucide-react';

// Sub-component to download and render items in the media modal
function SharedMediaItem({ msg, token, onImageClick }) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);

  const mediaType = msg.media_type;
  const filePath = msg.content;
  const mediaName = msg.media_name || 'shared_file';

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;

    const loadMedia = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(filePath, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load shared media:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (filePath) {
      loadMedia();
    }

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filePath, token]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = mediaName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (loading) {
    return (
      <div className="shared-media-loading-card animate-pulse">
        <div className="spinner-small"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-media-error-card">
        <span>Failed to load</span>
      </div>
    );
  }

  if (mediaType === 'image') {
    return (
      <div className="shared-media-grid-item" onClick={() => onImageClick && onImageClick(blobUrl, msg)}>
        <img src={blobUrl} alt={mediaName} className="shared-media-img-preview" />
        <div className="shared-media-hover-overlay">
          <Image size={18} />
        </div>
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="shared-media-grid-item video">
        <video src={blobUrl} className="shared-media-vid-preview" />
        <div className="shared-media-hover-overlay show">
          <Video size={18} />
          <button onClick={handleDownload} className="media-dl-btn" title="Download">
            <Download size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="shared-audio-list-item glass-card">
        <div className="audio-icon-container">
          <Music size={18} />
        </div>
        <div className="audio-details">
          <span className="audio-name">{mediaName}</span>
          <span className="audio-date">{new Date(msg.created_at).toLocaleDateString()}</span>
        </div>
        <audio 
          ref={audioRef} 
          src={blobUrl} 
          onEnded={() => setIsPlaying(false)} 
          className="hidden-audio"
        />
        <div className="audio-actions">
          <button onClick={toggleAudio} className="audio-play-btn" title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={handleDownload} className="audio-download-btn" title="Download">
            <Download size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Documents and general files
  return (
    <div className="shared-doc-list-item glass-card">
      <div className="doc-icon-container">
        <FileText size={18} />
      </div>
      <div className="doc-details">
        <span className="doc-name">{mediaName}</span>
        <span className="doc-date">{new Date(msg.created_at).toLocaleDateString()}</span>
      </div>
      <button onClick={handleDownload} className="doc-download-btn" title="Download">
        <Download size={18} />
      </button>
    </div>
  );
}

export default function SharedMediaModal({ messages, token, onImageClick, onClose }) {
  const [activeTab, setActiveTab] = useState('media'); // 'media', 'voice', 'docs'

  // Filter messages based on categories
  const mediaMessages = messages.filter(m => 
    !m.isUploadingPlaceholder && 
    (m.media_type === 'image' || m.media_type === 'video' || m.media_type === 'gif')
  );

  const voiceMessages = messages.filter(m => 
    !m.isUploadingPlaceholder && 
    m.media_type === 'audio'
  );

  const docMessages = messages.filter(m => 
    !m.isUploadingPlaceholder && 
    ['pdf', 'document', 'file'].includes(m.media_type)
  );

  return (
    <div className="shared-media-overlay" onClick={onClose}>
      <div className="shared-media-drawer glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="shared-media-header">
          <h3>Shared Media</h3>
          <button className="icon-btn close-drawer" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="shared-media-tabs">
          <button 
            className={`shared-media-tab ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Photos & Videos
          </button>
          <button 
            className={`shared-media-tab ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            Voice Notes
          </button>
          <button 
            className={`shared-media-tab ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            Documents
          </button>
        </div>

        <div className="shared-media-content scrollable-container">
          {activeTab === 'media' && (
            mediaMessages.length > 0 ? (
              <div className="shared-media-grid">
                {mediaMessages.map(msg => (
                  <SharedMediaItem 
                    key={msg.id} 
                    msg={msg} 
                    token={token} 
                    onImageClick={(url, message) => onImageClick(url, message)} 
                  />
                ))}
              </div>
            ) : (
              <div className="shared-media-empty">
                <Image size={32} />
                <p>No photos or videos shared yet</p>
              </div>
            )
          )}

          {activeTab === 'voice' && (
            voiceMessages.length > 0 ? (
              <div className="shared-media-list">
                {voiceMessages.map(msg => (
                  <SharedMediaItem 
                    key={msg.id} 
                    msg={msg} 
                    token={token} 
                  />
                ))}
              </div>
            ) : (
              <div className="shared-media-empty">
                <Music size={32} />
                <p>No voice notes shared yet</p>
              </div>
            )
          )}

          {activeTab === 'docs' && (
            docMessages.length > 0 ? (
              <div className="shared-media-list">
                {docMessages.map(msg => (
                  <SharedMediaItem 
                    key={msg.id} 
                    msg={msg} 
                    token={token} 
                  />
                ))}
              </div>
            ) : (
              <div className="shared-media-empty">
                <FileText size={32} />
                <p>No documents shared yet</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
