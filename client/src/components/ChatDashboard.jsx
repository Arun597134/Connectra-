import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { 
  Send, Image, Music, Video, Shield, Check, CheckCheck, 
  UserPlus, LogOut, Smile, Paperclip, Sliders, Search, Lock, 
  Unlock, Circle, MoreVertical, X, Settings, ArrowLeft, ZoomIn,
  SmilePlus, Download, Mic, Trash2, Phone, Camera, Clock, Pin,
  Volume2, MapPin, Gamepad2, Bot, BarChart3, Languages, Share2, Sparkles, Undo, Plus, Eye, Heart, Users, Youtube, RefreshCw
} from 'lucide-react';
import { compressImage } from '../utils/mediaHelper';
import StickerGifPicker from './StickerGifPicker';
import EmojiPicker from './EmojiPicker';
import InviteModal from './InviteModal';
import SettingsModal from './SettingsModal';
import CallModal from './CallModal';
import CameraCaptureModal from './CameraCaptureModal';
import SharedMediaModal from './SharedMediaModal';
import ContactProfileModal from './ContactProfileModal';
import WhiteboardModal from './WhiteboardModal';
import GameModal from './GameModal';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

// Helper to parse dates stored in SQLite (UTC) properly to prevent local offset shifts
function parseUTCDateTime(dateStr) {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string') {
    // If it's stored in SQLite default UTC format (YYYY-MM-DD HH:MM:SS), format as ISO UTC string
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('T')) {
      const isoStr = dateStr.replace(' ', 'T') + 'Z';
      const parsed = new Date(isoStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date(dateStr);
}

// Helper to format messages list date-time (e.g., "Today, 9.00 PM" or "25/06/2026, 9.00 PM")
function formatMessageDateTime(dateStr) {
  if (!dateStr) return '';
  const d = parseUTCDateTime(dateStr);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();
                  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();
  
  let datePart = '';
  if (isToday) {
    datePart = 'Today';
  } else if (isYesterday) {
    datePart = 'Yesterday';
  } else {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    datePart = `${day}/${month}/${year}`;
  }
  
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${datePart}, ${hours}.${minutes} ${ampm}`;
}

// Helper to format sidebar contact item time (e.g., "9.00 PM", "Yesterday", or "25/06/2026")
function formatSidebarTime(dateStr) {
  if (!dateStr) return '';
  const d = parseUTCDateTime(dateStr);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();
                  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();
                      
  if (isToday) {
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}.${minutes} ${ampm}`;
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

// Helper to format "Last Seen" timestamp status for offline users
function formatLastSeen(dateStr) {
  if (!dateStr) return 'Offline';
  const d = parseUTCDateTime(dateStr);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();
                  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();
                      
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timePart = `${hours}.${minutes} ${ampm}`;
  
  if (isToday) {
    return `last seen today at ${timePart}`;
  } else if (isYesterday) {
    return `last seen yesterday at ${timePart}`;
  } else {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `last seen on ${day}/${month}/${year} at ${timePart}`;
  }
}

// MediaRenderer Component: Downloads and renders authenticated files
function MediaRenderer({ filePath, mediaType, mediaName, token, onImageClick }) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        console.error('Failed to load media:', err);
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

  if (loading) {
    const isDoc = mediaType === 'pdf' || mediaType === 'document' || mediaType === 'file';
    return (
      <div className="media-placeholder animate-pulse">
        <div className="spinner"></div>
        <span>{isDoc ? 'Loading document...' : 'Loading media...'}</span>
      </div>
    );
  }

  if (error) {
    const isDoc = mediaType === 'pdf' || mediaType === 'document' || mediaType === 'file';
    return (
      <div className="media-placeholder error">
        <Shield size={20} className="text-red" />
        <span>{isDoc ? 'Failed to load document' : 'Failed to load media'}</span>
      </div>
    );
  }

  if (mediaType === 'image') {
    return (
      <div className="chat-media-image-wrapper" onClick={() => onImageClick && onImageClick(blobUrl)}>
        <img src={blobUrl} alt="Upload" className="chat-media-image" />
        <div className="image-zoom-overlay">
          <ZoomIn size={20} />
        </div>
      </div>
    );
  }

  if (mediaType === 'video_note') {
    return (
      <div className="chat-media-video-note-wrapper">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="chat-media-video-note"
          onClick={(e) => {
            e.currentTarget.muted = !e.currentTarget.muted;
          }}
          style={{ cursor: 'pointer' }}
        >
          <source src={blobUrl} type="video/webm" />
          <source src={blobUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <video controls className="chat-media-video">
        <source src={blobUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

  if (mediaType === 'audio') {
    return (
      <audio controls className="chat-media-audio">
        <source src={blobUrl} type="audio/mpeg" />
        Your browser does not support the audio tag.
      </audio>
    );
  }

  // Handle PDF, document, or generic file types
  const handleDownload = (e) => {
    e.preventDefault();
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = mediaName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPdf = mediaType === 'pdf' || (mediaName && mediaName.toLowerCase().endsWith('.pdf'));
  const displayExt = isPdf ? 'PDF' : (mediaName ? mediaName.split('.').pop().toUpperCase() : 'DOC');

  return (
    <div className="chat-media-doc-card glass-card" onClick={handleDownload}>
      <div className="doc-icon-container">
        <div className={`doc-icon ${isPdf ? 'pdf-theme' : 'doc-theme'}`}>
          <span className="doc-ext">{displayExt.substring(0, 4)}</span>
        </div>
      </div>
      <div className="doc-details">
        <span className="doc-name" title={mediaName}>{mediaName || 'Document'}</span>
        <span className="doc-action-text">Click to download</span>
      </div>
      <button className="doc-download-btn" title="Download">
        <Download size={18} />
      </button>
    </div>
  );
}

// Image Preview Modal
function ImagePreviewModal({ imageUrl, message, token, userId, onMessageDeleted, onClose }) {
  if (!imageUrl) return null;
  const [deleting, setDeleting] = useState(false);

  const handleSave = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = message?.media_name || 'chat_image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!message || !message.id) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this message for everyone?');
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/messages/delete/${message.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const recipientId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        onMessageDeleted(message.id, recipientId);
      } else {
        alert('Failed to delete image.');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Error deleting image.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="image-preview-backdrop" onClick={onClose}>
      <button className="image-preview-close" onClick={onClose} title="Close">
        <X size={24} />
      </button>
      <div className="image-preview-container" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Full Preview" 
          className="image-preview-full" 
        />
        <div className="image-preview-actions">
          <button onClick={handleSave} className="preview-action-btn save">
            Save
          </button>
          {message && (message.sender_id === userId || message.receiver_id === userId) && (
            <button 
              onClick={handleDelete} 
              className="preview-action-btn delete"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// CallLogRenderer Component: Displays call log history inside chat feed
function CallLogRenderer({ msg }) {
  const isMissed = msg.content.toLowerCase().includes('missed');
  const isVideo = msg.content.toLowerCase().includes('video');
  
  const formatCallDuration = (secs) => {
    if (!secs) return '00:00';
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="chat-media-call-log">
      <div className={`call-log-icon-container ${isMissed ? 'missed' : 'connected'}`}>
        {isVideo ? <Video size={16} /> : <Phone size={16} />}
      </div>
      <div className="call-log-details">
        <span className="call-log-title">{msg.content}</span>
        {!isMissed && msg.media_name && (
          <span className="call-log-duration">Duration: {formatCallDuration(parseInt(msg.media_name))}</span>
        )}
      </div>
    </div>
  );
}

function renderMessageTextWithLinks(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="chat-message-link"
          style={{ color: 'var(--primary-glow)', textDecoration: 'underline', wordBreak: 'break-all', fontWeight: 'bold' }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function YoutubePlayer({ videoId, onPlayerReady, onPlayerStateChange }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            onPlayerReady(event.target);
          },
          onStateChange: (event) => {
            onPlayerStateChange(event);
          }
        }
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={containerRef} />
    </div>
  );
}

export default function ChatDashboard({ 
  token, 
  username, 
  userId: rawUserId, 
  onLogout,
  activeTheme,
  onThemeChange,
  activeWallpaper,
  onWallpaperChange
}) {
  const userId = parseInt(rawUserId);

  // Advanced appearance settings (Font Size, Bubble Style, Blur, Sidebar Position, Compact Mode)
  const [fontSize, setFontSize] = useState(localStorage.getItem('chat_font_size') || 'medium');
  const [bubbleStyle, setBubbleStyle] = useState(localStorage.getItem('chat_bubble_style') || 'glass');
  const [blurIntensity, setBlurIntensity] = useState(localStorage.getItem('chat_blur_intensity') || 'standard');
  const [sidebarPosition, setSidebarPosition] = useState(localStorage.getItem('chat_sidebar_position') || 'left');
  const [compactMode, setCompactMode] = useState(localStorage.getItem('chat_compact_mode') === 'true');

  useEffect(() => {
    localStorage.setItem('chat_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('chat_bubble_style', bubbleStyle);
  }, [bubbleStyle]);

  useEffect(() => {
    localStorage.setItem('chat_blur_intensity', blurIntensity);
  }, [blurIntensity]);

  useEffect(() => {
    localStorage.setItem('chat_sidebar_position', sidebarPosition);
  }, [sidebarPosition]);

  useEffect(() => {
    localStorage.setItem('chat_compact_mode', compactMode.toString());
  }, [compactMode]);

  // Socket & Connectivity
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Contacts & Chat Lists
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [lastSeenTimes, setLastSeenTimes] = useState({});

  // Input states
  const [textInput, setTextInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typingContact, setTypingContact] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const touchStartPosRef = useRef(null);

  // Modals & Panels Toggles
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUploadQualityModal, setShowUploadQualityModal] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showSharedMediaModal, setShowSharedMediaModal] = useState(false);
  const [showContactProfileModal, setShowContactProfileModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState({ about: 'Available', profile_picture: null, custom_wallpaper: null });
  
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [mediaQuality, setMediaQuality] = useState('standard');
  
  // Searching new contacts
  const [searchNewUserQuery, setSearchNewUserQuery] = useState('');
  const [searchNewUserResult, setSearchNewUserResult] = useState([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
 
  // WebRTC Calling & Camera Capture states
  const [activeCall, setActiveCall] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Collaborative Whiteboard states
  const [showWhiteboardModal, setShowWhiteboardModal] = useState(false);
  const [peerWhiteboardOpen, setPeerWhiteboardOpen] = useState(false);

  // In-chat Search states
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Scheduled message states
  const [showSchedulerPicker, setShowSchedulerPicker] = useState(false);

  // View-Once states
  const [viewOnceToggle, setViewOnceToggle] = useState(false);
  const [viewOnceActiveMedia, setViewOnceActiveMedia] = useState(null);
  const [viewOnceTimer, setViewOnceTimer] = useState(null);

  // Video Note recording states
  const [isRecordingVideoNote, setIsRecordingVideoNote] = useState(false);
  const [videoNoteTime, setVideoNoteTime] = useState(0);
  const [videoNoteFacingMode, setVideoNoteFacingMode] = useState('user');
  const videoNoteStreamRef = useRef(null);
  const videoNoteRecorderRef = useRef(null);
  const videoNoteChunksRef = useRef([]);
  const videoNoteIntervalRef = useRef(null);
  const videoNotePreviewRef = useRef(null);

  // Refs
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedContactRef = useRef(null);
  const socketRef = useRef(null);

  // Group Chat States
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState('chats'); // 'chats' or 'groups'
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]); // Array of member IDs for group creation
  const selectedGroupRef = useRef(null);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Ephemeral Secret Chat states
  const [isSecretChatActive, setIsSecretChatActive] = useState(false);
  const [secretActiveMessage, setSecretActiveMessage] = useState(null);
  const [secretTimer, setSecretTimer] = useState(null);

  // Poll States
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Status/Stories States
  const STATUS_GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Indigo Purple
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Warm Pink/Red
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)', // Teal Purple
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Green Neon
    'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)', // Orange Sunset
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Sakura Pink
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'  // Deep Blue/Purple
  ];

  const getStatusMediaDetails = (content) => {
    if (content && typeof content === 'string' && content.startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        return { filename: parsed.filename, caption: parsed.caption || '' };
      } catch(e) {}
    }
    return { filename: content || '', caption: '' };
  };

  const [statusTextBgIndex, setStatusTextBgIndex] = useState(0);
  const [mentionsSearchQuery, setMentionsSearchQuery] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [statusInputContent, setStatusInputContent] = useState('');
  const [statusInputMediaType, setStatusInputMediaType] = useState('text');
  const [statusInputImageFile, setStatusInputImageFile] = useState(null);
  const [statusInputImageSrc, setStatusInputImageSrc] = useState(null);
  const [statusInputRepostSourceContent, setStatusInputRepostSourceContent] = useState(null);
  const [statusReplyText, setStatusReplyText] = useState('');
  const [statusReplyFocused, setStatusReplyFocused] = useState(false);
  const [statusInputMentions, setStatusInputMentions] = useState([]);
  const [activeStatusUserGroup, setActiveStatusUserGroup] = useState(null);
  const [statusAddOnParentId, setStatusAddOnParentId] = useState(null);
  const [statusAddOnParentData, setStatusAddOnParentData] = useState(null);
  const statusImageInputRef = useRef(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showViewsDrawer, setShowViewsDrawer] = useState(false);

  // Image & Video Preview / Editor States
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState(null);
  const [editorFile, setEditorFile] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [previewVideoFile, setPreviewVideoFile] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [previewVideoType, setPreviewVideoType] = useState('video');
  const [brushColor, setBrushColor] = useState('#EF4444');
  const [brushSize, setBrushSize] = useState(5);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Audio Recorder voice filter state
  const [voiceFilter, setVoiceFilter] = useState('normal');

  // Chat Summarizer state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [chatSummaryText, setChatSummaryText] = useState('');

  // Translations cache
  const [translatedMessages, setTranslatedMessages] = useState({});

  // WebRTC Screen sharing states & refs
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenTrackRef = useRef(null);

  // Collaborative Game states
  const [showGameModal, setShowGameModal] = useState(false);
  const [isGameInitiator, setIsGameInitiator] = useState(false);
  const [gameContact, setGameContact] = useState(null);
  const [gameInitialAccept, setGameInitialAccept] = useState(false);
  const [gameType, setGameType] = useState('tic-tac-toe');

  const showGameModalRef = useRef(showGameModal);
  useEffect(() => {
    showGameModalRef.current = showGameModal;
  }, [showGameModal]);

  // Voice Note Transcription states & refs
  const recognitionRef = useRef(null);
  const transcriptTextRef = useRef('');
  const [showingTranscripts, setShowingTranscripts] = useState({});

  // YouTube Watch Party states & refs
  const [watchPartySession, setWatchPartySession] = useState(null);
  const [watchPartyStatus, setWatchPartyStatus] = useState('');
  const ytPlayerRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Shared Ambient Soundscape states & refs
  const [activeSoundscape, setActiveSoundscape] = useState('none');
  const [soundscapeVolume, setSoundscapeVolume] = useState(0.3);
  const [showSoundscapeMenu, setShowSoundscapeMenu] = useState(false);
  const soundscapeAudioRef = useRef(null);

  // Keep refs in sync
  const contactsRef = useRef(contacts);
  const groupsRef = useRef(groups);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, []);

  // 1. Initialize Socket Connection - connect directly to backend server
  useEffect(() => {
    // Connect to the backend server. In production, connect directly to the hosted Render server.
    const socketUrl = import.meta.env.PROD ? 'https://connectra-btxb.onrender.com' : window.location.origin;
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('✅ Connected to chat server, socket id:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected:', reason);
      setConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [token]);

  // Request HTML5 Browser Push Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('HTML5 Notification permission status:', permission);
      });
    }
  }, []);

  // Listen to watch party socket events
  useEffect(() => {
    if (!socket) return;

    const handleWatchPartyStarted = (data) => {
      console.log('🎬 Watch Party started by peer:', data);
      
      const currentContact = selectedContactRef.current;
      const currentGroup = selectedGroupRef.current;
      
      const isFromCurrentContact = currentContact && !data.isGroup && Number(data.senderId) === Number(currentContact.id);
      const isFromCurrentGroup = currentGroup && data.isGroup && Number(data.targetId) === Number(currentGroup.id);
      
      if (isFromCurrentContact || isFromCurrentGroup) {
        setWatchPartySession({
          ...data,
          isActive: true
        });
      }
    };

    let statusTimeout = null;
    const handleWatchPartySynced = (data) => {
      const player = ytPlayerRef.current;
      if (!player) return;

      isSyncingRef.current = true;
      
      if (data.action === 'play') {
        player.seekTo(data.time, true);
        player.playVideo();
        setWatchPartyStatus(`${data.senderName || 'Someone'} played the video`);
      } else if (data.action === 'pause') {
        player.pauseVideo();
        player.seekTo(data.time, true);
        setWatchPartyStatus(`${data.senderName || 'Someone'} paused the video`);
      }
      
      if (statusTimeout) clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        setWatchPartyStatus('');
      }, 4000);

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 1000);
    };

    const handleWatchPartyClosed = () => {
      console.log('🎬 Watch Party closed by peer.');
      setWatchPartySession(null);
      ytPlayerRef.current = null;
    };

    const handleSoundscapeChanged = (data) => {
      console.log('🎵 Soundscape changed by peer:', data);
      const currentContact = selectedContactRef.current;
      const currentGroup = selectedGroupRef.current;
      const isFromCurrentContact = currentContact && !data.isGroup && Number(data.senderId) === Number(currentContact.id);
      const isFromCurrentGroup = currentGroup && data.isGroup && Number(data.targetId) === Number(currentGroup.id);
      if (isFromCurrentContact || isFromCurrentGroup) {
        setActiveSoundscape(data.soundType);
      }
    };

    socket.on('watch_party_started', handleWatchPartyStarted);
    socket.on('watch_party_synced', handleWatchPartySynced);
    socket.on('watch_party_closed', handleWatchPartyClosed);
    socket.on('soundscape_changed', handleSoundscapeChanged);

    return () => {
      socket.off('watch_party_started', handleWatchPartyStarted);
      socket.off('watch_party_synced', handleWatchPartySynced);
      socket.off('watch_party_closed', handleWatchPartyClosed);
      socket.off('soundscape_changed', handleSoundscapeChanged);
    };
  }, [socket]);

  // Shared Ambient Soundscape Audio Playback Loop
  const SOUNDSCAPE_URLS = {
    none: '',
    rain: '/api/upload/download/rain.mp3',
    cafe: '/api/upload/download/cafe.mp3',
    lofi: '/api/upload/download/lofi.mp3',
    forest: '/api/upload/download/forest.mp3',
    romantic: '/api/upload/download/romantic.mp3'
  };

  useEffect(() => {
    if (!soundscapeAudioRef.current) {
      soundscapeAudioRef.current = new Audio();
      soundscapeAudioRef.current.loop = true;
    }
    const audio = soundscapeAudioRef.current;
    audio.volume = soundscapeVolume;

    if (activeSoundscape === 'none') {
      audio.pause();
    } else {
      const targetUrl = SOUNDSCAPE_URLS[activeSoundscape];
      if (targetUrl && audio.src !== targetUrl) {
        audio.src = targetUrl;
        audio.load();
      }
      audio.play().catch(err => {
        console.warn('Audio play request blocked by browser audio policy:', err.message);
      });
    }
  }, [activeSoundscape]);

  useEffect(() => {
    if (soundscapeAudioRef.current) {
      soundscapeAudioRef.current.volume = soundscapeVolume;
    }
  }, [soundscapeVolume]);

  useEffect(() => {
    return () => {
      if (soundscapeAudioRef.current) {
        soundscapeAudioRef.current.pause();
        soundscapeAudioRef.current = null;
      }
    };
  }, []);

  const extractYoutubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleStartWatchParty = () => {
    const url = window.prompt("Enter a YouTube Video Link to start a synchronized watch party:", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    if (!url) return;
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      alert("Invalid YouTube Link. Please try again.");
      return;
    }
    const targetId = selectedContact ? selectedContact.id : selectedGroup.id;
    const isGroup = !!selectedGroup;
    
    const session = {
      targetId,
      isGroup,
      videoId,
      senderName: username,
      senderId: userId,
      isActive: true
    };
    setWatchPartySession(session);
    socketRef.current?.emit('start_watch_party', session);

    // Send Watch Party Invitation Card into the chat
    const invitePayload = JSON.stringify({
      videoId: videoId,
      videoUrl: url,
      senderName: username
    });

    socketRef.current?.emit('send_message', {
      receiverId: selectedContact ? selectedContact.id : null,
      groupId: selectedGroup ? selectedGroup.id : null,
      content: invitePayload,
      mediaType: 'watch_party_invite',
      viewOnce: false,
      secretChat: false
    }, (response) => {
      if (response && response.success) {
        setMessages(prev => {
          if (prev.some(m => m.id === response.message.id)) return prev;
          return [...prev, response.message];
        });
      }
    });
  };

  const handlePlayerReady = (player) => {
    ytPlayerRef.current = player;
  };

  const handlePlayerStateChange = (event) => {
    if (!socketRef.current || isSyncingRef.current || !watchPartySession) return;
    const player = event.target;
    const time = player.getCurrentTime();
    
    let action = '';
    if (event.data === window.YT.PlayerState.PLAYING) {
      action = 'play';
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      action = 'pause';
    }

    if (action) {
      socketRef.current.emit('watch_party_sync', {
        targetId: watchPartySession.targetId,
        isGroup: watchPartySession.isGroup,
        action,
        time,
        senderName: username
      });
    }
  };

  const handleCloseWatchParty = () => {
    if (socketRef.current && watchPartySession) {
      socketRef.current.emit('close_watch_party', {
        targetId: watchPartySession.targetId,
        isGroup: watchPartySession.isGroup
      });
    }
    setWatchPartySession(null);
    ytPlayerRef.current = null;
  };

  const handleSelectSoundscape = (soundType) => {
    setActiveSoundscape(soundType);
    if (socketRef.current) {
      socketRef.current.emit('change_soundscape', {
        targetId: selectedContact ? selectedContact.id : selectedGroup.id,
        isGroup: !!selectedGroup,
        soundType
      });
    }
  };

  // 2. Fetch Contacts
  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setContacts(data);

        // Fetch online statuses
        if (socketRef.current && socketRef.current.connected && data.length > 0) {
          const ids = data.map(c => c.id);
          socketRef.current.emit('get_online_statuses', ids, (statuses) => {
            const mappedStatuses = {};
            const mappedLastSeens = {};
            Object.keys(statuses).forEach(id => {
              const info = statuses[id];
              if (info && typeof info === 'object') {
                mappedStatuses[id] = info.status;
                mappedLastSeens[id] = info.lastSeen;
              } else {
                mappedStatuses[id] = info;
              }
            });
            setOnlineStatuses(prev => ({ ...prev, ...mappedStatuses }));
            setLastSeenTimes(prev => ({ ...prev, ...mappedLastSeens }));
          });
        }
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  }, [token]);

  // 2b. Fetch Groups user belongs to
  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }, [token]);

  // Fetch Status Updates
  const fetchStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/statuses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStatuses(data);
      }
    } catch (err) {
      console.error('Failed to load statuses:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token && socket && connected) {
      fetchContacts();
      fetchStatuses();
      fetchGroups();
    }
  }, [token, socket, connected, fetchContacts, fetchStatuses, fetchGroups]);

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUserProfile(data);
          if (data.custom_wallpaper) {
            const localWp = localStorage.getItem('chat_wallpaper');
            if (!localWp || localWp === 'wallpaper-custom') {
              onWallpaperChange('wallpaper-custom');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load my profile info:', err);
      }
    };
    if (token) {
      fetchMyProfile();
    }
  }, [token]);

  // 3. Socket Event Listeners — register once when socket is created, use refs for current state
  useEffect(() => {
    if (!socket) return;

    const onNewGroup = (newGroup) => {
      setGroups(prev => {
        if (prev.some(g => g.id === newGroup.id)) return prev;
        return [...prev, newGroup];
      });
    };

    const onGroupUpdate = (data) => {
      const { groupId, members } = data;
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, members, member_count: members.length };
        }
        return g;
      }));
      const currentGroup = selectedGroupRef.current;
      if (currentGroup && currentGroup.id === groupId) {
        setSelectedGroup(prev => {
          if (!prev) return null;
          return {
            ...prev,
            members,
            member_count: members.length
          };
        });
      }
    };

    const onGroupRemoved = (data) => {
      const { groupId } = data;
      setGroups(prev => prev.filter(g => g.id !== groupId));
      const currentGroup = selectedGroupRef.current;
      if (currentGroup && currentGroup.id === groupId) {
        setSelectedGroup(null);
        alert('You have been removed from this group.');
      }
    };

    socket.on('new_group', onNewGroup);
    socket.on('group_update', onGroupUpdate);
    socket.on('group_removed', onGroupRemoved);

    const onStatusChange = (data) => {
      setOnlineStatuses(prev => ({
        ...prev,
        [data.userId]: data.status
      }));
      if (data.lastSeen !== undefined) {
        setLastSeenTimes(prev => ({
          ...prev,
          [data.userId]: data.lastSeen
        }));
      }
    };

    const onTypingStatus = (data) => {
      const currentContact = selectedContactRef.current;
      if (currentContact && currentContact.id === data.senderId) {
        setTypingContact(data.isTyping ? currentContact.username : null);
      }
    };

    const onMessagesRead = (data) => {
      const currentContact = selectedContactRef.current;
      if (currentContact && currentContact.id === data.readerId) {
        setMessages(prev => prev.map(m => m.sender_id === userId ? { ...m, is_read: 1 } : m));
      }
    };

    const onReceiveMessage = (msg) => {
      console.log('📩 Received message:', msg);
      const currentContact = selectedContactRef.current;
      const currentGroup = selectedGroupRef.current;
      
      const isForCurrentContact = currentContact && !msg.group_id && (msg.sender_id === currentContact.id || msg.receiver_id === currentContact.id);
      const isForCurrentGroup = currentGroup && msg.group_id && Number(msg.group_id) === Number(currentGroup.id);

      if (isForCurrentContact || isForCurrentGroup) {
        setMessages(prev => {
          // Prevent duplicate messages
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        // Mark as read if we're the receiver in direct chat
        if (isForCurrentContact && msg.sender_id === currentContact.id) {
          socket.emit('mark_read', { contactId: currentContact.id });
        }
      } else {
        // Message from someone we're not currently chatting with
        if (msg.group_id) {
          setGroups(prev => prev.map(g => {
            if (g.id === msg.group_id) {
              return { ...g, unreadCount: (g.unreadCount || 0) + 1 };
            }
            return g;
          }));
        } else {
          setContacts(prev => prev.map(c => {
            if (c.id === msg.sender_id) {
              return { ...c, unreadCount: (c.unreadCount || 0) + 1 };
            }
            return c;
          }));
        }
      }

      // Trigger HTML5 Push Notification if the app is in the background
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        let title = 'Connectra';
        let body = msg.content;
        
        if (msg.group_id) {
          const group = groupsRef.current.find(g => Number(g.id) === Number(msg.group_id));
          title = group ? `${group.name} (Group)` : 'Group Message';
          body = `${msg.sender_name || 'Someone'}: ${msg.content}`;
        } else {
          const sender = contactsRef.current.find(c => Number(c.id) === Number(msg.sender_id));
          title = sender ? sender.username : 'New Message';
        }
        
        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.ico'
        });
        
        notification.onclick = () => {
          window.focus();
          if (msg.group_id) {
            const group = groupsRef.current.find(g => Number(g.id) === Number(msg.group_id));
            if (group) {
              setSelectedGroup(group);
              setSelectedContact(null);
              setActiveSidebarTab('groups');
            }
          } else {
            const sender = contactsRef.current.find(c => Number(c.id) === Number(msg.sender_id));
            if (sender) {
              setSelectedContact(sender);
              setSelectedGroup(null);
              setActiveSidebarTab('chats');
            }
          }
        };
      }
    };

    const onReactionUpdate = (data) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== data.messageId) return m;
        let reactions = m.reactions ? [...m.reactions] : [];
        if (data.action === 'removed') {
          reactions = reactions.filter(r => r.user_id !== data.userId);
        } else {
          const existingIdx = reactions.findIndex(r => r.user_id === data.userId);
          if (existingIdx >= 0) {
            reactions[existingIdx] = { ...reactions[existingIdx], emoji: data.emoji };
          } else {
            reactions.push({ user_id: data.userId, username: data.username, emoji: data.emoji, message_id: data.messageId });
          }
        }
        return { ...m, reactions };
      }));
    };

    const onIncomingCall = (data) => {
      console.log('📞 Incoming call from:', data.callerName);
      if (activeCallRef.current) {
        socket.emit('reject_call', { to: data.from });
        return;
      }
      
      const isGroup = !!data.groupId;
      const contactObj = isGroup ? {
        id: `group_${data.groupId}`,
        username: data.groupName || 'Group Call',
        isGroup: true,
        groupId: data.groupId
      } : {
        id: data.from,
        username: data.callerName
      };

      setActiveCall({
        contact: contactObj,
        type: data.type,
        roomId: data.roomId || data.signalData.roomId,
        incomingOffer: data.signalData,
        callerName: isGroup ? `${data.groupName} (${data.callerName})` : data.callerName,
        isIncomingInit: true
      });
    };

    const onMessageDeleted = (data) => {
      console.log('🗑️ Message deleted event received:', data.messageId);
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
      fetchContacts();
    };

    const onToggleWhiteboard = (data) => {
      const currentContact = selectedContactRef.current;
      if (currentContact && currentContact.id === data.senderId) {
        setPeerWhiteboardOpen(data.open);
      }
    };

    const onMessageViewed = (data) => {
      console.log('👁️ Message viewed event received:', data.messageId);
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, is_viewed: 1 } : m));
    };

    const onToggleSecretMode = (data) => {
      const currentContact = selectedContactRef.current;
      if (currentContact && currentContact.id === data.senderId) {
        setIsSecretChatActive(data.active);
      }
    };

    const onPollUpdated = (data) => {
      setMessages(prev => prev.map(m => {
        if (String(m.id) === String(data.messageId)) {
          return { ...m, poll_votes: JSON.stringify(data.votes) };
        }
        return m;
      }));
    };

    const onIncomingGameResponse = (data) => {
      const currentContact = selectedContactRef.current;
      if (currentContact && currentContact.id === data.senderId && data.accept) {
        if (!showGameModalRef.current) {
          const gameName = data.gameType === 'connect-four' ? 'Connect Four' : 'Tic-Tac-Toe';
          if (window.confirm(`🎮 @${currentContact.username} has joined the ${gameName} lobby! Do you want to join?`)) {
            setGameType(data.gameType || 'tic-tac-toe');
            setGameContact(currentContact);
            setShowGameModal(true);
          }
        }
      }
    };

    const onStatusUpdate = (newStatus) => {
      setStatuses(prev => {
        if (prev.some(s => s.id === newStatus.id)) return prev;
        return [...prev, newStatus];
      });
    };

    const onStatusDeleted = (data) => {
      setStatuses(prev => prev.filter(s => s.id !== data.statusId));
      
      // Update active group in real-time if we are viewing it
      setActiveStatusUserGroup(prev => {
        if (!prev) return null;
        const updatedSlides = prev.slides.filter(s => s.id !== data.statusId);
        if (updatedSlides.length > 0) {
          return { ...prev, slides: updatedSlides };
        } else {
          setShowStatusModal(false);
          setCurrentSlideIndex(0);
          return null;
        }
      });
    };

    const onStatusInteractionUpdated = (data) => {
      console.log('🔄 status interaction updated:', data);
      setStatuses(prev => {
        return prev.map(s => {
          if (Number(s.id) === Number(data.statusId)) {
            if (Number(s.user_id) === Number(userId)) {
              const existingViews = s.views || [];
              const alreadyViewed = existingViews.find(v => Number(v.user_id) === Number(data.userId));
              let updatedViews;
              if (alreadyViewed) {
                updatedViews = existingViews.map(v => {
                  if (Number(v.user_id) === Number(data.userId)) {
                    return {
                      ...v,
                      liked: data.type === 'like' ? data.liked : v.liked,
                      viewed_at: data.viewed_at || v.viewed_at
                    };
                  }
                  return v;
                });
              } else {
                updatedViews = [
                  {
                    user_id: data.userId,
                    username: data.username,
                    profile_picture: data.profile_picture,
                    liked: data.type === 'like' ? data.liked : 0,
                    viewed_at: data.viewed_at
                  },
                  ...existingViews
                ];
              }
              return {
                ...s,
                views: updatedViews
              };
            } else {
              if (Number(data.userId) === Number(userId) && data.type === 'like') {
                return {
                  ...s,
                  liked_by_me: data.liked
                };
              }
            }
          }
          return s;
        });
      });

      setActiveStatusUserGroup(prevGroup => {
        if (!prevGroup) return null;
        const hasStatus = prevGroup.slides.some(slide => Number(slide.id) === Number(data.statusId));
        if (!hasStatus) return prevGroup;
        
        const updatedSlides = prevGroup.slides.map(slide => {
          if (Number(slide.id) === Number(data.statusId)) {
            if (Number(slide.user_id) === Number(userId)) {
              const existingViews = slide.views || [];
              const alreadyViewed = existingViews.find(v => Number(v.user_id) === Number(data.userId));
              let updatedViews;
              if (alreadyViewed) {
                updatedViews = existingViews.map(v => {
                  if (Number(v.user_id) === Number(data.userId)) {
                    return {
                      ...v,
                      liked: data.type === 'like' ? data.liked : v.liked,
                      viewed_at: data.viewed_at || v.viewed_at
                    };
                  }
                  return v;
                });
              } else {
                updatedViews = [
                  {
                    user_id: data.userId,
                    username: data.username,
                    profile_picture: data.profile_picture,
                    liked: data.type === 'like' ? data.liked : 0,
                    viewed_at: data.viewed_at
                  },
                  ...existingViews
                ];
              }
              return {
                ...slide,
                views: updatedViews
              };
            } else {
              if (Number(data.userId) === Number(userId) && data.type === 'like') {
                return {
                  ...slide,
                  liked_by_me: data.liked
                };
              }
            }
          }
          return slide;
        });
        return {
          ...prevGroup,
          slides: updatedSlides
        };
      });
    };

    socket.on('status_change', onStatusChange);
    socket.on('typing_status', onTypingStatus);
    socket.on('messages_read', onMessagesRead);
    socket.on('receive_message', onReceiveMessage);
    socket.on('reaction_update', onReactionUpdate);
    socket.on('incoming_call', onIncomingCall);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('toggle_whiteboard', onToggleWhiteboard);
    socket.on('message_viewed', onMessageViewed);
    socket.on('toggle_secret_mode', onToggleSecretMode);
    socket.on('game_response', onIncomingGameResponse);
    socket.on('poll_updated', onPollUpdated);
    socket.on('status_update', onStatusUpdate);
    socket.on('status_deleted', onStatusDeleted);
    socket.on('status_interaction_updated', onStatusInteractionUpdated);

    return () => {
      socket.off('new_group', onNewGroup);
      socket.off('group_update', onGroupUpdate);
      socket.off('group_removed', onGroupRemoved);
      socket.off('status_change', onStatusChange);
      socket.off('typing_status', onTypingStatus);
      socket.off('messages_read', onMessagesRead);
      socket.off('receive_message', onReceiveMessage);
      socket.off('reaction_update', onReactionUpdate);
      socket.off('incoming_call', onIncomingCall);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('toggle_whiteboard', onToggleWhiteboard);
      socket.off('message_viewed', onMessageViewed);
      socket.off('toggle_secret_mode', onToggleSecretMode);
      socket.off('game_response', onIncomingGameResponse);
      socket.off('poll_updated', onPollUpdated);
      socket.off('status_update', onStatusUpdate);
      socket.off('status_deleted', onStatusDeleted);
      socket.off('status_interaction_updated', onStatusInteractionUpdated);
    };
  }, [socket, userId]);

  // Keep activeCallRef in sync
  const activeCallRef = useRef(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // WhatsApp Status stories auto-advance timer
  useEffect(() => {
    if (!showStatusModal || !activeStatusUserGroup || showViewsDrawer || statusReplyFocused) return;
    
    // Auto advance slides every 5 seconds
    const slideTimer = setTimeout(() => {
      if (currentSlideIndex < activeStatusUserGroup.slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1);
        setShowViewsDrawer(false);
      } else {
        setShowStatusModal(false);
        setActiveStatusUserGroup(null);
        setCurrentSlideIndex(0);
        setShowViewsDrawer(false);
      }
    }, 5000);
    
    return () => clearTimeout(slideTimer);
  }, [showStatusModal, activeStatusUserGroup, currentSlideIndex, showViewsDrawer, statusReplyFocused]);

  useEffect(() => {
    if (activeStatusUserGroup) {
      setCurrentSlideIndex(0);
      setShowViewsDrawer(false);
    }
  }, [activeStatusUserGroup]);

  // Auto-log status views when showing slides
  useEffect(() => {
    if (!showStatusModal || !activeStatusUserGroup || activeStatusUserGroup.slides.length === 0) return;
    const slide = activeStatusUserGroup.slides[currentSlideIndex];
    if (!slide) return;
    
    if (Number(slide.user_id) !== Number(userId)) {
      const logStatusView = async () => {
        try {
          const res = await fetch(`/api/statuses/${slide.id}/view`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            // Update local state immediately so that status rings turn gray (seen) in real-time
            setStatuses(prev => prev.map(s => Number(s.id) === Number(slide.id) ? { ...s, seen: 1 } : s));
            setActiveStatusUserGroup(prev => {
              if (!prev) return null;
              return {
                ...prev,
                slides: prev.slides.map(s => Number(s.id) === Number(slide.id) ? { ...s, seen: 1 } : s)
              };
            });
          }
        } catch (err) {
          console.error('Failed to log status view:', err);
        }
      };
      logStatusView();
    }
  }, [showStatusModal, activeStatusUserGroup, currentSlideIndex, token, userId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingContact]);

  // 4. Fetch Message History when Contact or Group changes
  useEffect(() => {
    if (!selectedContact && !selectedGroup) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const url = selectedContact 
          ? `/api/messages/${selectedContact.id}` 
          : `/api/messages/group/${selectedGroup.id}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (response.ok) {
          setMessages(data);
          if (selectedContact) {
            socketRef.current?.emit('mark_read', { contactId: selectedContact.id });
            setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, unreadCount: 0 } : c));
          } else {
            setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g));
          }
        }
      } catch (err) {
        console.error('Failed to load message history:', err);
      }
    };

    loadMessages();
    
    // Check if there is an active watch party or soundscape for this conversation
    if (socketRef.current) {
      socketRef.current.emit('get_active_watch_party', {
        targetId: selectedContact ? selectedContact.id : selectedGroup.id,
        isGroup: !!selectedGroup
      }, (session) => {
        if (session) {
          setWatchPartySession(session);
        } else {
          setWatchPartySession(null);
        }
      });

      socketRef.current.emit('get_active_soundscape', {
        targetId: selectedContact ? selectedContact.id : selectedGroup.id,
        isGroup: !!selectedGroup
      }, (soundType) => {
        setActiveSoundscape(soundType || 'none');
      });
    } else {
      setWatchPartySession(null);
      setActiveSoundscape('none');
    }

    setTypingContact(null);
    setShowChatDropdown(false);
    setIsSecretChatActive(false);
  }, [selectedContact, selectedGroup, token, connected]);

  // 4b. Handle Emoji Reaction
  const handleAddReaction = (messageId, emoji) => {
    const currentSocket = socketRef.current;
    if (!currentSocket || !currentSocket.connected) return;

    currentSocket.emit('add_reaction', { messageId, emoji }, (response) => {
      if (response && response.success) {
        // Update local state immediately for sender
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId) return m;
          let reactions = m.reactions ? [...m.reactions] : [];
          if (response.action === 'removed') {
            reactions = reactions.filter(r => r.user_id !== userId);
          } else {
            const existingIdx = reactions.findIndex(r => r.user_id === userId);
            if (existingIdx >= 0) {
              reactions[existingIdx] = { ...reactions[existingIdx], emoji };
            } else {
              reactions.push({ user_id: userId, username, emoji, message_id: messageId });
            }
          }
          return { ...m, reactions };
        }));
      }
    });
  };

  // 4c. Insert Emoji into Text Input
  const handleInsertEmoji = (emoji) => {
    setTextInput(prev => prev + emoji);
  };

  // 5. Typing Indicator Trigger
  const handleTextInputChange = (e) => {
    setTextInput(e.target.value);
    if (!socketRef.current || !selectedContact) return;

    socketRef.current.emit('typing', { receiverId: selectedContact.id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { receiverId: selectedContact.id, isTyping: false });
    }, 2000);
  };

  // 6. Send Plain Text Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const currentSocket = socketRef.current;
    if (!textInput.trim() || (!selectedContact && !selectedGroup) || !currentSocket || !currentSocket.connected) return;

    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them from settings or chat actions to message.');
      return;
    }

    let text = textInput;
    setTextInput('');
    if (selectedContact) {
      currentSocket.emit('typing', { receiverId: selectedContact.id, isTyping: false });
    }

    if (replyingTo) {
      text = JSON.stringify({
        isReply: true,
        replyToSender: replyingTo.sender_id === userId ? "You" : (replyingTo.sender_name || "Someone"),
        replyToContent: replyingTo.media_type === 'image' ? '📷 Image' : (replyingTo.media_type === 'audio' ? '🎵 Voice Note' : replyingTo.content),
        originalId: replyingTo.id,
        text: text
      });
      setReplyingTo(null);
    }

    console.log('📤 Sending message:', text);

    currentSocket.emit('send_message', {
      receiverId: selectedContact ? selectedContact.id : null,
      groupId: selectedGroup ? selectedGroup.id : null,
      content: text,
      mediaType: 'text',
      viewOnce: isSecretChatActive ? true : false,
      secretChat: isSecretChatActive ? true : false
    }, (response) => {
      console.log('📤 Send callback response:', response);
      if (response && response.success) {
        setMessages(prev => {
          if (prev.some(m => m.id === response.message.id)) return prev;
          return [...prev, response.message];
        });
      } else {
        alert((response && response.error) || 'Failed to send message');
        setTextInput(text); // Restore the message
      }
    });
  };

  // 7. Send GIF
  const handleSendGif = (gifUrl) => {
    const currentSocket = socketRef.current;
    if ((!selectedContact && !selectedGroup) || !currentSocket || !currentSocket.connected) return;
    setShowGifPicker(false);

    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them first.');
      return;
    }

    console.log('📤 Sending GIF:', gifUrl);

    currentSocket.emit('send_message', {
      receiverId: selectedContact ? selectedContact.id : null,
      groupId: selectedGroup ? selectedGroup.id : null,
      content: gifUrl,
      mediaType: 'gif',
      viewOnce: isSecretChatActive ? true : false,
      secretChat: isSecretChatActive ? true : false
    }, (response) => {
      if (response && response.success) {
        setMessages(prev => {
          if (prev.some(m => m.id === response.message.id)) return prev;
          return [...prev, response.message];
        });
      } else {
        console.error('Failed to send GIF:', response);
      }
    });
  };

  const handleSendSticker = (stickerEmoji) => {
    const currentSocket = socketRef.current;
    if ((!selectedContact && !selectedGroup) || !currentSocket || !currentSocket.connected) return;
    setShowGifPicker(false);

    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them first.');
      return;
    }

    currentSocket.emit('send_message', {
      receiverId: selectedContact ? selectedContact.id : null,
      groupId: selectedGroup ? selectedGroup.id : null,
      content: stickerEmoji,
      mediaType: 'sticker',
      viewOnce: isSecretChatActive ? true : false,
      secretChat: isSecretChatActive ? true : false
    }, (response) => {
      if (response && response.success) {
        setMessages(prev => {
          if (prev.some(m => m.id === response.message.id)) return prev;
          return [...prev, response.message];
        });
      } else {
        console.error('Failed to send sticker:', response);
      }
    });
  };

  // --- Audio Filter Helpers & Wav Encoder ---
  function bufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length),
        view = new DataView(bufferArr),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for(i=0; i<buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while(pos < length) {
      for(i=0; i<numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], {type: 'audio/wav'});
  }

  const applyAudioFilter = async (audioBlob, filter) => {
    if (filter === 'normal') return audioBlob;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    let playbackRate = 1.0;
    if (filter === 'helium') playbackRate = 1.4;
    if (filter === 'slow-mo') playbackRate = 0.7;

    const renderLength = Math.ceil(audioBuffer.length / playbackRate);
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      renderLength,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate;

    let lastNode = source;

    if (filter === 'robot') {
      const filterNode = offlineCtx.createBiquadFilter();
      filterNode.type = 'bandpass';
      filterNode.frequency.value = 1200;
      filterNode.Q.value = 8;
      
      lastNode.connect(filterNode);
      lastNode = filterNode;

      const hpNode = offlineCtx.createBiquadFilter();
      hpNode.type = 'highpass';
      hpNode.frequency.value = 400;
      lastNode.connect(hpNode);
      lastNode = hpNode;
    } else if (filter === 'echo') {
      const delay = offlineCtx.createDelay(1.0);
      delay.delayTime.value = 0.25;

      const feedback = offlineCtx.createGain();
      feedback.gain.value = 0.4;

      const merger = offlineCtx.createGain();

      lastNode.connect(merger);
      lastNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(merger);

      lastNode = merger;
    }

    lastNode.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    audioCtx.close();

    return bufferToWav(renderedBuffer);
  };

  // 7b. Voice Recording Logic
  const startRecording = async () => {
    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them first.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        let audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());

        // Apply selected audio filter
        try {
          audioBlob = await applyAudioFilter(audioBlob, voiceFilter);
        } catch (filterErr) {
          console.error('Failed to apply voice filter:', filterErr);
        }

        const ext = voiceFilter === 'normal' ? 'webm' : 'wav';
        const mime = voiceFilter === 'normal' ? 'audio/webm' : 'audio/wav';
        const file = new File([audioBlob], `voice-message-${Date.now()}.${ext}`, { type: mime });

        processAndUploadFile(file, 'standard', null, transcriptTextRef.current);
      };

      transcriptTextRef.current = '';
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          transcriptTextRef.current = finalTranscript || interimTranscript;
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }

    if (shouldSend) {
      mediaRecorderRef.current.stop();
    } else {
      // Discard
      mediaRecorderRef.current.onstop = () => {
        // Release tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
  };

  const formatRecordingTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 7c. WebRTC Call Completed Logger
  const handleCallFinished = ({ type, status, duration }) => {
    const currentSocket = socketRef.current;
    if (!selectedContact || !currentSocket || !currentSocket.connected) return;

    const callLabel = type === 'audio' ? 'Voice Call' : 'Video Call';
    const content = status === 'missed' ? `Missed ${callLabel}` : callLabel;
    
    console.log('📤 Sending call log message:', content, 'duration:', duration);

    currentSocket.emit('send_message', {
      receiverId: selectedContact.id,
      content,
      mediaType: 'call_log',
      mediaName: duration.toString()
    }, (response) => {
      if (response && response.success) {
        setMessages(prev => {
          if (prev.some(m => m.id === response.message.id)) return prev;
          return [...prev, response.message];
        });
      } else {
        console.error('Failed to log call message:', response);
      }
    });
  };
  // --- AI Chatbot, Summarizer, Translations, & Poll Actions ---
  const handleSummarizeChat = async () => {
    if (!selectedContact) return;
    try {
      setShowChatDropdown(false);
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: selectedContact.id })
      });
      const data = await res.json();
      if (res.ok) {
        setChatSummaryText(data.summary);
        setShowSummaryModal(true);
      } else {
        alert(data.error || 'Failed to generate summary.');
      }
    } catch (err) {
      console.error('Failed to summarize chat:', err);
      alert('Error generating chat summary.');
    }
  };

  const handleTranslateMessage = async (msgId, text, lang = 'es') => {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, targetLang: lang })
      });
      const data = await res.json();
      if (res.ok) {
        setTranslatedMessages(prev => ({
          ...prev,
          [msgId]: data.translatedText
        }));
      } else {
        alert(data.error || 'Failed to translate.');
      }
    } catch (err) {
      console.error('Translation failed:', err);
    }
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim()) {
      alert('Please enter a question');
      return;
    }
    const filteredOptions = pollOptions.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      alert('Please enter at least 2 options');
      return;
    }

    const pollData = {
      question: pollQuestion,
      options: filteredOptions.map(opt => ({ text: opt, votes: [] }))
    };

    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    socket.emit('send_message', {
      receiverId: selectedContact.id,
      content: JSON.stringify(pollData),
      mediaType: 'poll'
    }, (response) => {
      if (response && response.success) {
        setMessages(prev => [...prev, response.message]);
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['', '']);
      } else {
        alert('Failed to send poll');
      }
    });
  };

  const handleVotePoll = (messageId, optionIndex) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('vote_poll', { messageId, optionIndex });
  };

  // WhatsApp Status/Stories Actions
  const handlePublishStatus = async () => {
    if (statusInputMediaType === 'text' && !statusInputContent.trim()) {
      alert('Please enter some text for your status.');
      return;
    }
    if ((statusInputMediaType === 'image' || statusInputMediaType === 'video') && !statusInputImageFile && !statusInputRepostSourceContent) {
      alert('Please select a media file first.');
      return;
    }
    
    try {
      let finalContent = statusInputContent;
      let finalMediaType = statusInputMediaType;
      
      if (statusInputMediaType === 'text') {
        finalContent = JSON.stringify({
          text: statusInputContent,
          background: STATUS_GRADIENTS[statusTextBgIndex]
        });
      }
      
      if ((statusInputMediaType === 'image' || statusInputMediaType === 'video') && statusInputImageFile) {
        const formData = new FormData();
        formData.append('file', statusInputImageFile);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          alert(uploadData.error || 'Failed to upload status file.');
          return;
        }
        finalContent = JSON.stringify({
          filename: uploadData.filename,
          caption: statusInputContent.trim()
        });
      } else if ((statusInputMediaType === 'image' || statusInputMediaType === 'video') && statusInputRepostSourceContent) {
        let repostFilename = statusInputRepostSourceContent;
        if (statusInputRepostSourceContent.startsWith('{')) {
          try {
            repostFilename = JSON.parse(statusInputRepostSourceContent).filename;
          } catch(e) {}
        }
        finalContent = JSON.stringify({
          filename: repostFilename,
          caption: statusInputContent.trim()
        });
      }
      
      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: finalContent,
          mediaType: finalMediaType,
          mentions: statusInputMentions,
          parentId: statusAddOnParentId
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        fetchStatuses();
        setShowCreateStatusModal(false);
        setStatusInputContent('');
        setStatusInputMediaType('text');
        setStatusInputImageFile(null);
        setStatusInputImageSrc(null);
        setStatusInputMentions([]);
        setStatusAddOnParentId(null);
        setStatusInputRepostSourceContent(null);
      } else {
        alert(data.error || 'Failed to publish status.');
      }
    } catch (err) {
      console.error('Error publishing status:', err);
      alert('Failed to publish status.');
    }
  };

  const handleSendStatusReply = () => {
    const currentSocket = socketRef.current;
    if (!statusReplyText.trim() || !activeStatusUserGroup || !currentSocket || !currentSocket.connected) return;

    const slide = activeStatusUserGroup.slides[currentSlideIndex];
    if (!slide) return;

    const targetId = Number(slide.user_id);
    if (isNaN(targetId)) return;

    const replyPayload = {
      statusId: slide.id,
      statusContent: slide.content,
      statusMediaType: slide.media_type,
      replyText: statusReplyText.trim()
    };

    console.log('📤 Sending status reply to:', targetId, replyPayload);

    currentSocket.emit('send_message', {
      receiverId: targetId,
      content: JSON.stringify(replyPayload),
      mediaType: 'status_reply'
    }, (response) => {
      if (response && response.success) {
        if (selectedContact && Number(selectedContact.id) === targetId) {
          setMessages(prev => {
            if (prev.some(m => m.id === response.message.id)) return prev;
            return [...prev, response.message];
          });
        }
      } else {
        alert((response && response.error) || 'Failed to send reply');
      }
    });

    setStatusReplyText('');
    setStatusReplyFocused(false);
    setShowStatusModal(false);
    setActiveStatusUserGroup(null);
    setCurrentSlideIndex(0);

    // Open chat thread with the status owner
    const contact = contacts.find(c => Number(c.id) === Number(targetId));
    if (contact) {
      setSelectedContact(contact);
      setSelectedGroup(null);
    }
  };

  const handleAddOnStatus = (parentStatusId, fallbackData = null) => {
    setStatusAddOnParentId(null); // Set to null so it publishes as user's own status (repost)
    
    let parentStatus = statuses.find(s => Number(s.id) === Number(parentStatusId));
    if (!parentStatus && fallbackData) {
      parentStatus = {
        id: parentStatusId,
        content: fallbackData.content,
        media_type: fallbackData.mediaType,
        username: fallbackData.senderUsername
      };
    }
    if (parentStatus) {
      setStatusAddOnParentData(parentStatus);
      setStatusInputRepostSourceContent(parentStatus.content);
      
      if (parentStatus.media_type === 'image' || parentStatus.media_type === 'video') {
        setStatusInputMediaType(parentStatus.media_type);
        const { filename, caption } = getStatusMediaDetails(parentStatus.content);
        setStatusInputImageSrc(`/api/upload/download/${filename}`);
        setStatusInputContent(caption || '');
        setStatusInputImageFile(null);
      } else {
        setStatusInputMediaType('text');
        let text = parentStatus.content;
        let bg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        if (parentStatus.content.startsWith('{')) {
          try {
            const parsed = JSON.parse(parentStatus.content);
            text = parsed.text;
            bg = parsed.background || bg;
          } catch(e) {}
        }
        setStatusInputContent(text);
        
        const bgIdx = STATUS_GRADIENTS.indexOf(bg);
        if (bgIdx !== -1) {
          setStatusTextBgIndex(bgIdx);
        } else {
          setStatusTextBgIndex(0);
        }
        setStatusInputImageFile(null);
        setStatusInputImageSrc(null);
      }
    } else {
      setStatusAddOnParentData(null);
      setStatusInputRepostSourceContent(null);
      setStatusInputMediaType('text');
      setStatusInputContent('');
      setStatusInputImageFile(null);
      setStatusInputImageSrc(null);
      setStatusTextBgIndex(0);
    }
    
    setStatusInputMentions([]);
    setShowCreateStatusModal(true);
  };

  const handleToggleLikeStatus = async (statusId) => {
    try {
      const res = await fetch(`/api/statuses/${statusId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setStatuses(prev => {
          return prev.map(s => {
            if (Number(s.id) === Number(statusId)) {
              return {
                ...s,
                liked_by_me: data.liked ? 1 : 0
              };
            }
            return s;
          });
        });
        
        setActiveStatusUserGroup(prevGroup => {
          if (!prevGroup) return null;
          const updatedSlides = prevGroup.slides.map(slide => {
            if (Number(slide.id) === Number(statusId)) {
              return {
                ...slide,
                liked_by_me: data.liked ? 1 : 0
              };
            }
            return slide;
          });
          return {
            ...prevGroup,
            slides: updatedSlides
          };
        });
      }
    } catch (err) {
      console.error('Failed to toggle status like:', err);
    }
  };

  const handleStatusImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusInputImageFile(file);
    if (file.type.startsWith('video/')) {
      setStatusInputMediaType('video');
    } else {
      setStatusInputMediaType('image');
    }
    setStatusInputImageSrc(URL.createObjectURL(file));
  };

  const handleDeleteStatus = async (statusId) => {
    if (!window.confirm('Are you sure you want to delete this status?')) return;
    
    try {
      const res = await fetch(`/api/statuses/${statusId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        // Remove locally immediately
        setStatuses(prev => prev.filter(s => s.id !== statusId));
        
        // Update active status user group slides
        const updatedSlides = activeStatusUserGroup.slides.filter(s => s.id !== statusId);
        if (updatedSlides.length > 0) {
          setActiveStatusUserGroup({
            ...activeStatusUserGroup,
            slides: updatedSlides
          });
          // Adjust slide index if needed
          if (currentSlideIndex >= updatedSlides.length) {
            setCurrentSlideIndex(updatedSlides.length - 1);
          }
        } else {
          // No slides left, close viewer
          setShowStatusModal(false);
          setActiveStatusUserGroup(null);
          setCurrentSlideIndex(0);
        }
      } else {
        alert('Failed to delete status');
      }
    } catch (err) {
      console.error('Error deleting status:', err);
      alert('Failed to delete status');
    }
  };

  // Canvas Image Editor Drawing Logic & useEffect
  useEffect(() => {
    if (!showImageEditor || !editorImageSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      // Limit dimensions to 800px to maintain rendering speed and viewport fit
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      setCanvasHistory([]);
    };
    img.src = editorImageSrc;
  }, [showImageEditor, editorImageSrc]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse and touch events
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Save state for undo history
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setCanvasHistory(prev => [...prev, state]);
    
    isDrawingRef.current = true;
    const pos = getCoordinates(e);
    lastPosRef.current = pos;
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, 2 * Math.PI);
    ctx.fillStyle = brushColor;
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault(); // Prevent touch-scrolling while drawing
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCoordinates(e);
    
    ctx.beginPath();
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleUndoDrawing = () => {
    if (canvasHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const previousState = canvasHistory[canvasHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setCanvasHistory(prev => prev.slice(0, -1));
  };

  const handleSendEditedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Failed to process image');
        return;
      }
      const origName = editorFile?.name || 'edited-image.png';
      const editedFile = new File([blob], origName, { type: 'image/png' });
      processAndUploadFile(editedFile, 'standard');
      setShowImageEditor(false);
      setEditorImageSrc(null);
      setEditorFile(null);
    }, 'image/png');
  };
  // 8. Handle File Upload (Image, Video, Audio)
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them first.');
      e.target.value = '';
      return;
    }

    const fileList = Array.from(files);

    if (fileList.length === 1 && fileList[0].type.startsWith('image/')) {
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditorImageSrc(event.target.result);
        setEditorFile(file);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    } else if (fileList.length === 1 && fileList[0].type.startsWith('video/')) {
      const file = fileList[0];
      setPreviewVideoFile(file);
      setPreviewVideoUrl(URL.createObjectURL(file));
      setPreviewVideoType('video');
      setShowVideoPreview(true);
    } else {
      fileList.forEach(file => {
        processAndUploadFile(file, 'standard');
      });
    }
    
    e.target.value = '';
  };

  // --- Pin/Unpin contacts toggle ---
  const handleTogglePinContact = async (contact, e) => {
    e.stopPropagation();
    const isPinned = contact.is_pinned === 1;
    const url = isPinned ? '/api/auth/contacts/unpin' : '/api/auth/contacts/pin';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: contact.id })
      });
      
      if (response.ok) {
        fetchContacts();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update contact pinning');
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // --- Get default scheduler local values (5 minutes in future) ---
  const getScheduleDefaults = () => {
    const now = new Date();
    const future = new Date(now.getTime() + 5 * 60 * 1000);
    
    const year = future.getFullYear();
    const month = (future.getMonth() + 1).toString().padStart(2, '0');
    const day = future.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    let hour = future.getHours();
    const minute = future.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    hour = hour % 12;
    hour = hour ? hour : 12;
    
    return { dateStr, hour, minute, ampm };
  };

  // --- Scheduled message scheduler ---
  const handleScheduleMessage = async () => {
    const dateInput = document.getElementById('scheduler-date');
    const hourSelect = document.getElementById('scheduler-hour');
    const minuteSelect = document.getElementById('scheduler-minute');
    const ampmSelect = document.getElementById('scheduler-ampm');
    
    if (!dateInput || !dateInput.value || !hourSelect || !minuteSelect || !ampmSelect) {
      alert('Please select a valid date and time.');
      return;
    }
    
    const dateVal = dateInput.value;
    let hourVal = parseInt(hourSelect.value);
    const minuteVal = parseInt(minuteSelect.value);
    const ampmVal = ampmSelect.value;
    
    // Convert 12-hour to 24-hour format
    if (ampmVal === 'PM' && hourVal < 12) {
      hourVal += 12;
    } else if (ampmVal === 'AM' && hourVal === 12) {
      hourVal = 0;
    }
    
    const [year, month, day] = dateVal.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, hourVal, minuteVal, 0);
    
    if (localDate.getTime() <= Date.now()) {
      alert('Schedule time must be in the future.');
      return;
    }
    
    if (!textInput.trim()) {
      alert('Please enter a message to schedule.');
      return;
    }
    
    const scheduledFor = localDate.toISOString();
    
    try {
      const response = await fetch('/api/auth/messages/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          content: textInput,
          mediaType: 'text',
          scheduledFor: scheduledFor
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(`Message scheduled successfully for ${localDate.toLocaleString()}`);
        setTextInput('');
        setShowSchedulerPicker(false);
      } else {
        alert(data.error || 'Failed to schedule message');
      }
    } catch (err) {
      console.error('Failed to schedule message:', err);
      alert('Error scheduling message.');
    }
  };

  // --- View Once Countdown handlers ---
  const startViewOnceCountdown = (msg) => {
    setViewOnceActiveMedia(msg);
  };

  const handleViewOnceFinished = async (msg) => {
    try {
      const response = await fetch(`/api/messages/viewed/${msg.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_viewed: 1 } : m));
        
        const currentSocket = socketRef.current;
        if (currentSocket && currentSocket.connected) {
          currentSocket.emit('message_viewed', { messageId: msg.id, receiverId: msg.sender_id });
        }
      }
    } catch (error) {
      console.error('Failed to update view-once viewed status:', error);
    } finally {
      setViewOnceActiveMedia(null);
      setViewOnceTimer(null);
    }
  };

  // View-Once Countdown Effect
  useEffect(() => {
    if (!viewOnceActiveMedia) return;
    
    setViewOnceTimer(10);
    
    const interval = setInterval(() => {
      setViewOnceTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleViewOnceFinished(viewOnceActiveMedia);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [viewOnceActiveMedia]);

  // --- Video Notes handlers ---
  const startVideoNoteRecording = async () => {
    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them first.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300, facingMode: videoNoteFacingMode }, 
        audio: true 
      });
      videoNoteStreamRef.current = stream;
      videoNoteChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      videoNoteRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoNoteChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoNoteChunksRef.current, { type: 'video/webm' });
        const file = new File([videoBlob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });
        
        stream.getTracks().forEach(track => track.stop());
        videoNoteStreamRef.current = null;
        
        setPreviewVideoFile(file);
        setPreviewVideoUrl(URL.createObjectURL(file));
        setPreviewVideoType('video_note');
        setShowVideoPreview(true);
      };

      mediaRecorder.start();
      setIsRecordingVideoNote(true);
      setVideoNoteTime(0);

      videoNoteIntervalRef.current = setInterval(() => {
        setVideoNoteTime(prev => prev + 1);
      }, 1000);

      setTimeout(() => {
        if (videoNotePreviewRef.current) {
          videoNotePreviewRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Failed to start video note recording:', err);
      alert('Could not access camera/mic for video note.');
    }
  };

  const stopVideoNoteRecording = (shouldSend = true) => {
    clearInterval(videoNoteIntervalRef.current);
    setIsRecordingVideoNote(false);
    
    const recorder = videoNoteRecorderRef.current;
    
    if (!shouldSend) {
      // Discard: override onstop to just clean up, then stop everything
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {}; // prevent preview from opening
        recorder.stop();
      }
      // Always clean up the stream tracks
      if (videoNoteStreamRef.current) {
        videoNoteStreamRef.current.getTracks().forEach(track => track.stop());
        videoNoteStreamRef.current = null;
      }
      videoNoteRecorderRef.current = null;
      return;
    }
    
    // Send: let the existing onstop handler create the blob and show preview
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleFlipVideoNoteCamera = async () => {
    if (!isRecordingVideoNote || !videoNoteStreamRef.current) return;
    const newFacingMode = videoNoteFacingMode === 'user' ? 'environment' : 'user';
    setVideoNoteFacingMode(newFacingMode);
    
    try {
      // 1. Get the new camera video track FIRST
      const newCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: newFacingMode }
      });
      const newVideoTrack = newCameraStream.getVideoTracks()[0];

      // 2. Grab the existing audio track (we keep the same mic throughout)
      const existingAudioTrack = videoNoteStreamRef.current.getAudioTracks()[0];

      // 3. Stop the current recorder — this flushes its chunks into videoNoteChunksRef
      //    but we override onstop so it doesn't create the final blob yet
      const oldRecorder = videoNoteRecorderRef.current;
      if (oldRecorder && oldRecorder.state !== 'inactive') {
        await new Promise(resolve => {
          oldRecorder.onstop = resolve; // just resolve, don't create blob
          oldRecorder.stop();
        });
      }

      // 4. Stop old video tracks (not audio — we reuse it)
      videoNoteStreamRef.current.getVideoTracks().forEach(track => track.stop());

      // 5. Build a new combined stream: new camera video + existing audio
      const newStream = new MediaStream();
      newStream.addTrack(newVideoTrack);
      if (existingAudioTrack) {
        newStream.addTrack(existingAudioTrack);
      }
      videoNoteStreamRef.current = newStream;

      // 6. Create a new recorder on the new stream, pushing into the SAME chunks array
      const newRecorder = new MediaRecorder(newStream, { mimeType: 'video/webm;codecs=vp8,opus' });
      videoNoteRecorderRef.current = newRecorder;

      newRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoNoteChunksRef.current.push(event.data);
        }
      };

      // Final onstop: combine ALL chunks (from all recorders) into one blob
      newRecorder.onstop = async () => {
        const videoBlob = new Blob(videoNoteChunksRef.current, { type: 'video/webm' });
        const file = new File([videoBlob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });

        newStream.getTracks().forEach(track => track.stop());
        videoNoteStreamRef.current = null;

        setPreviewVideoFile(file);
        setPreviewVideoUrl(URL.createObjectURL(file));
        setPreviewVideoType('video_note');
        setShowVideoPreview(true);
      };

      newRecorder.start();

      // 7. Refresh the preview element
      if (videoNotePreviewRef.current) {
        videoNotePreviewRef.current.srcObject = null;
        videoNotePreviewRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Failed to flip video note camera:', err);
    }
  };

  const processAndUploadFile = async (file, quality, customMediaType, transcriptText) => {
    setShowUploadQualityModal(false);
    const currentSocket = socketRef.current;

    if (!currentSocket || !currentSocket.connected || (!selectedContact && !selectedGroup)) {
      alert('Not connected. Please wait and try again.');
      return;
    }

    let mediaType = customMediaType;
    if (!mediaType) {
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) mediaType = 'pdf';
      else mediaType = 'document';
    }

    const loadingMessageId = Date.now();
    setMessages(prev => [...prev, {
      id: loadingMessageId,
      sender_id: userId,
      receiver_id: selectedContact ? selectedContact.id : null,
      group_id: selectedGroup ? selectedGroup.id : null,
      media_type: mediaType,
      content: `Uploading ${file.name}...`,
      isUploadingPlaceholder: true,
      created_at: new Date().toISOString()
    }]);

    try {
      let fileToUpload = file;
      if (mediaType === 'image') {
        fileToUpload = await compressImage(file, quality);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload, file.name);

      console.log('📤 Uploading file:', file.name, 'type:', mediaType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload error');

      console.log('📤 Upload success, sending via socket. Path:', data.path);

      currentSocket.emit('send_message', {
        receiverId: selectedContact ? selectedContact.id : null,
        groupId: selectedGroup ? selectedGroup.id : null,
        content: data.path,
        mediaType: mediaType,
        mediaName: file.name,
        viewOnce: (viewOnceToggle || isSecretChatActive) ? true : false,
        secretChat: isSecretChatActive ? true : false,
        transcript: transcriptText || null
      }, (socketResponse) => {
        console.log('📤 Media send callback:', socketResponse);
        // Remove placeholder
        setMessages(prev => prev.filter(m => m.id !== loadingMessageId));
        if (socketResponse && socketResponse.success) {
          setMessages(prev => {
            if (prev.some(m => m.id === socketResponse.message.id)) return prev;
            return [...prev, socketResponse.message];
          });
          setViewOnceToggle(false);
        } else {
          alert((socketResponse && socketResponse.error) || 'Failed to deliver upload');
        }
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setMessages(prev => prev.filter(m => m.id !== loadingMessageId));
      alert('Upload failed: ' + error.message);
    }
  };

  // --- Secret Message Countdown handlers ---
  const startSecretMessageCountdown = (msg) => {
    setSecretActiveMessage(msg);
  };

  const handleSecretMessageFinished = async (msg) => {
    try {
      const response = await fetch(`/api/messages/viewed/${msg.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_viewed: 1 } : m));
        
        const currentSocket = socketRef.current;
        if (currentSocket && currentSocket.connected) {
          currentSocket.emit('message_viewed', { messageId: msg.id, receiverId: msg.sender_id });
        }
      }
    } catch (error) {
      console.error('Failed to update secret message viewed status:', error);
    } finally {
      setSecretActiveMessage(null);
      setSecretTimer(null);
    }
  };

  // Secret Message Countdown Effect
  useEffect(() => {
    if (!secretActiveMessage) return;
    
    setSecretTimer(30);
    
    const interval = setInterval(() => {
      setSecretTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSecretMessageFinished(secretActiveMessage);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [secretActiveMessage]);

  const handleShareLocation = () => {
    if (selectedContact && selectedContact.is_blocked) {
      alert('You have blocked this contact. Unblock them first.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentSocket = socketRef.current;
        if (!currentSocket || !currentSocket.connected) {
          alert('Not connected. Please wait and try again.');
          return;
        }

        console.log('📤 Sending location:', latitude, longitude);

        currentSocket.emit('send_message', {
          receiverId: selectedContact ? selectedContact.id : null,
          groupId: selectedGroup ? selectedGroup.id : null,
          content: `${latitude},${longitude}`,
          mediaType: 'location',
          viewOnce: isSecretChatActive ? true : false,
          secretChat: isSecretChatActive ? true : false
        }, (response) => {
          if (response && response.success) {
            setMessages(prev => {
              if (prev.some(m => m.id === response.message.id)) return prev;
              return [...prev, response.message];
            });
          } else {
            alert('Failed to send location.');
          }
        });
      },
      (error) => {
        console.error('Error fetching geolocation:', error);
        alert(`Failed to retrieve location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleStartGroupVideoCall = () => {
    if (!selectedGroup) return;
    const roomId = `group_call_${selectedGroup.id}_${Date.now()}`;
    const groupCallContact = {
      id: `group_${selectedGroup.id}`,
      username: selectedGroup.name,
      isGroup: true,
      groupId: selectedGroup.id
    };
    setActiveCall({
      contact: groupCallContact,
      type: 'video',
      isIncomingInit: false,
      roomId
    });
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupNameInput.trim()) {
      alert('Please enter a group name');
      return;
    }
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupNameInput,
          members: selectedGroupMembers
        })
      });
      const data = await response.json();
      if (response.ok) {
        // Optimistically add/select group
        setGroups(prev => {
          if (prev.some(g => g.id === data.id)) return prev;
          return [...prev, data];
        });
        setSelectedGroup(data);
        setSelectedContact(null);
        setActiveSidebarTab('groups');
        setShowCreateGroupModal(false);
        setGroupNameInput('');
        setSelectedGroupMembers([]);
      } else {
        alert(data.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleToggleGroupMemberSelection = (contactId) => {
    setSelectedGroupMembers(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleAddGroupMembers = async (memberIds) => {
    if (!selectedGroup) return;
    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds: memberIds })
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedGroup(prev => {
          if (!prev) return null;
          return { ...prev, members: data.members, member_count: data.members.length };
        });
        setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, members: data.members, member_count: data.members.length } : g));
      } else {
        alert(data.error || 'Failed to add members');
      }
    } catch (err) {
      console.error('Failed to add members:', err);
    }
  };

  const handleToggleGroupAdmin = async (targetUserId, currentIsAdmin) => {
    if (!selectedGroup) return;
    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/admins`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, isAdmin: !currentIsAdmin })
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedGroup(prev => {
          if (!prev) return null;
          return { ...prev, members: data.members };
        });
        setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, members: data.members } : g));
      } else {
        alert(data.error || 'Failed to toggle admin status');
      }
    } catch (err) {
      console.error('Failed to toggle admin:', err);
    }
  };

  const handleRemoveGroupMember = async (targetUserId) => {
    if (!selectedGroup) return;
    const isSelf = targetUserId === userId;
    if (isSelf && !confirm('Are you sure you want to exit this group?')) return;
    if (!isSelf && !confirm('Remove this member from the group?')) return;
    
    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (isSelf) {
          setSelectedGroup(null);
          setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
          setShowGroupDrawer(false);
        } else {
          setSelectedGroup(prev => {
            if (!prev) return null;
            return { ...prev, members: data.members, member_count: data.members.length };
          });
          setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, members: data.members, member_count: data.members.length } : g));
        }
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Failed to remove group member:', err);
    }
  };

  const handleInviteGame = (type = 'tic-tac-toe') => {
    if (!selectedContact) return;
    setGameType(type);
    setGameContact(selectedContact);
    setShowGameModal(true);
  };

  const handleToggleSecretChat = (activeState) => {
    if (!selectedContact) return;
    setIsSecretChatActive(activeState);
    socketRef.current?.emit('toggle_secret_mode', {
      receiverId: selectedContact.id,
      active: activeState
    });
  };

  // 9. Chat Action Operations (Clear Chat, Block, Unblock)
  const handleClearChat = async () => {
    if (!selectedContact) return;
    setShowChatDropdown(false);
    if (!confirm(`Clear all chat history with ${selectedContact.username}?`)) return;

    try {
      const response = await fetch(`/api/messages/clear/${selectedContact.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessages([]);
      } else {
        alert('Failed to clear chat');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessageDeleted = (messageId, recipientId) => {
    if (socket) {
      socket.emit('delete_message', { messageId, receiverId: recipientId });
    }
    setMessages(prev => prev.filter(m => m.id !== messageId));
    fetchContacts();
    setPreviewImage(null);
  };

  const handleBlockContact = async () => {
    if (!selectedContact) return;
    setShowChatDropdown(false);
    if (!confirm(`Block ${selectedContact.username}? You won't receive messages from them.`)) return;

    try {
      const response = await fetch('/api/auth/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: selectedContact.id })
      });
      if (response.ok) {
        setSelectedContact(prev => ({ ...prev, is_blocked: 1 }));
        fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblockContact = async () => {
    if (!selectedContact) return;
    setShowChatDropdown(false);

    try {
      const response = await fetch('/api/auth/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: selectedContact.id })
      });
      if (response.ok) {
        setSelectedContact(prev => ({ ...prev, is_blocked: 0 }));
        fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 10. Search & Add Contacts Modal Logic
  const handleSearchNewUser = async (e) => {
    e.preventDefault();
    if (!searchNewUserQuery.trim()) return;
    try {
      const response = await fetch(`/api/auth/search-users?query=${encodeURIComponent(searchNewUserQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSearchNewUserResult(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async (contact) => {
    try {
      const response = await fetch('/api/auth/add-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: contact.id })
      });
      const data = await response.json();
      if (response.ok) {
        setShowAddContactModal(false);
        setSearchNewUserQuery('');
        setSearchNewUserResult([]);
        fetchContacts();
        setSelectedContact(data);
      } else {
        alert(data.error || 'Failed to add contact');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToMessage = (id) => {
    const el = document.getElementById(`msg-row-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.5s';
      el.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
      setTimeout(() => {
        el.style.backgroundColor = 'transparent';
      }, 1500);
    }
  };

  return (
    <div className={`dashboard-container font-size-${fontSize} bubble-style-${bubbleStyle} blur-intensity-${blurIntensity} sidebar-${sidebarPosition} ${compactMode ? 'layout-compact' : ''}`}>
      {/* Sidebar - Contacts */}
      <div className={`sidebar ${(selectedContact || selectedGroup) ? 'mobile-hidden' : ''}`}>
        <div className="sidebar-header glass-card">
          <div className="sidebar-brand-row">
            <div className="sidebar-brand-logo">
              <img src="/logo-icon.png" alt="Connectra" className="brand-logo-img" />
              <span className="brand-logo-text">Connectra</span>
            </div>
            <div className="header-actions">
              <button onClick={() => setShowAddContactModal(true)} title="Add Contact" className="icon-btn">
                <UserPlus size={18} />
              </button>
              <button onClick={() => setShowInviteModal(true)} title="Invite Someone" className="icon-btn">
                <Paperclip size={18} />
              </button>
              <button onClick={() => setShowSettingsModal(true)} title="Settings" className="icon-btn">
                <Settings size={18} />
              </button>
              <button onClick={onLogout} title="Logout" className="icon-btn logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="user-info">
            <div className="user-avatar">
              {currentUserProfile && currentUserProfile.profile_picture ? (
                <img src={currentUserProfile.profile_picture} alt={username} className="sidebar-avatar-img" />
              ) : (
                username[0].toUpperCase()
              )}
            </div>
            <div>
              <h3>{username}</h3>
              <div className="connection-status">
                <Circle size={8} fill={connected ? '#10B981' : '#EF4444'} className="status-dot" />
                <span>{connected ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sidebar-tabs">
          <button 
            type="button"
            className={`sidebar-tab-btn ${activeSidebarTab === 'chats' ? 'active' : ''}`}
            onClick={() => { setActiveSidebarTab('chats'); setSelectedGroup(null); }}
          >
            Chats
          </button>
          <button 
            type="button"
            className={`sidebar-tab-btn ${activeSidebarTab === 'groups' ? 'active' : ''}`}
            onClick={() => { setActiveSidebarTab('groups'); setSelectedContact(null); }}
          >
            Groups
          </button>
          {activeSidebarTab === 'groups' && (
            <button 
              type="button"
              className="create-group-btn"
              onClick={() => setShowCreateGroupModal(true)}
              title="Create New Group"
            >
              <Plus size={14} /> Create
            </button>
          )}
        </div>

        {/* Status/Stories Section */}
        {(() => {
          const statusGroups = {};
          
          statuses.forEach(s => {
            if (s.parent_id === null) {
              if (!statusGroups[s.user_id]) {
                statusGroups[s.user_id] = {
                  userId: s.user_id,
                  username: s.username,
                  profilePicture: s.profile_picture,
                  slides: [s]
                };
              } else {
                statusGroups[s.user_id].slides.push(s);
              }
            }
          });
          
          statuses.forEach(s => {
            if (s.parent_id !== null) {
              const parentStatus = statuses.find(ps => Number(ps.id) === Number(s.parent_id));
              if (parentStatus) {
                const ownerId = parentStatus.user_id;
                if (statusGroups[ownerId]) {
                  if (!statusGroups[ownerId].slides.some(slide => Number(slide.id) === Number(s.id))) {
                    statusGroups[ownerId].slides.push(s);
                  }
                }
              }
            }
          });
          
          const myStatusGroup = statusGroups[userId] || {
            userId,
            username: 'My Status',
            profilePicture: currentUserProfile?.profile_picture,
            slides: []
          };
          
          const otherStatusGroups = Object.values(statusGroups).filter(g => g.userId !== userId);
          
          return (
            <div className="status-section">
              <span className="status-section-title">Status Updates</span>
              <div className="status-list-container">
                {/* My Status Item */}
                <div className="status-circle-wrapper">
                  <div 
                    onClick={() => {
                      if (myStatusGroup.slides.length > 0) {
                        setActiveStatusUserGroup(myStatusGroup);
                        setShowStatusModal(true);
                      } else {
                        setStatusAddOnParentId(null);
                        setShowCreateStatusModal(true);
                      }
                    }}
                    className={`status-circle ${myStatusGroup.slides.length === 0 ? 'my-status' : 'seen'}`}
                  >
                    <div className="status-avatar-inner">
                      {myStatusGroup.profilePicture ? (
                        <img src={myStatusGroup.profilePicture} alt="Me" className="status-avatar-img" />
                      ) : (
                        username[0].toUpperCase()
                      )}
                    </div>
                  </div>
                  <span className="status-circle-label">My Status</span>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusAddOnParentId(null);
                      setShowCreateStatusModal(true);
                    }}
                    className="my-status-add-btn"
                  >
                    +
                  </button>
                </div>
                
                {/* Contacts Status Items */}
                {otherStatusGroups.map(group => {
                  const hasUnseen = group.slides.some(slide => slide.seen === 0);
                  return (
                    <div 
                      key={group.userId} 
                      className="status-circle-wrapper"
                      onClick={() => {
                        setActiveStatusUserGroup(group);
                        setShowStatusModal(true);
                      }}
                    >
                      <div className={`status-circle ${hasUnseen ? 'unseen' : 'seen'}`}>
                        <div className="status-avatar-inner">
                          {group.profilePicture ? (
                            <img src={group.profilePicture} alt={group.username} className="status-avatar-img" />
                          ) : (
                            group.username[0].toUpperCase()
                          )}
                        </div>
                      </div>
                      <span className="status-circle-label">{group.username}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="contacts-list">
          {activeSidebarTab === 'chats' ? (
            filteredContacts.length > 0 ? (
              filteredContacts.map(contact => {
                const isOnline = onlineStatuses[contact.id] === 'online';
                const isBlocked = contact.is_blocked === 1;
                const unread = contact.unread_count || contact.unreadCount || 0;
                const lastMsg = contact.last_message;
                const lastMsgType = contact.last_message_type;
                const lastMsgTime = contact.last_message_time;

                let lastMsgPreview = '';
                if (lastMsg) {
                  if (lastMsgType === 'image') lastMsgPreview = '📷 Photo';
                  else if (lastMsgType === 'video') lastMsgPreview = '🎥 Video';
                  else if (lastMsgType === 'audio') {
                    lastMsgPreview = lastMsg.includes('voice-message') ? '🎤 Voice Message' : '🎵 Audio';
                  }
                  else if (lastMsgType === 'gif') lastMsgPreview = 'GIF';
                  else if (lastMsgType === 'sticker') lastMsgPreview = '🎨 Sticker';
                  else if (lastMsgType === 'pdf') lastMsgPreview = '📄 PDF';
                  else if (lastMsgType === 'document' || lastMsgType === 'file') lastMsgPreview = '📄 Document';
                  else if (lastMsgType === 'status_reply') {
                    let replyText = 'Replied to status';
                    try {
                      const parsed = JSON.parse(lastMsg);
                      replyText = `💬 ${parsed.replyText}`;
                    } catch(e) {}
                    lastMsgPreview = replyText;
                  }
                  else lastMsgPreview = lastMsg.length > 30 ? lastMsg.substring(0, 30) + '...' : lastMsg;
                }

                const timeLabel = lastMsgTime ? formatSidebarTime(lastMsgTime) : '';

                return (
                  <div
                    key={contact.id}
                    onClick={() => { setSelectedContact(contact); setSelectedGroup(null); }}
                    className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
                  >
                    <div className="contact-avatar">
                      {contact.id === 0 ? (
                        <div className="avatar-bot-fallback" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-glow)' }}>
                          <Bot size={20} />
                        </div>
                      ) : contact.profile_picture ? (
                        <img src={contact.profile_picture} alt={contact.username} className="sidebar-avatar-img" />
                      ) : (
                        contact.username[0].toUpperCase()
                      )}
                      {isOnline && <span className="online-indicator"></span>}
                    </div>
                    <div className="contact-details">
                      <div className="contact-meta">
                        <h4>{contact.username}</h4>
                        {isBlocked && (
                          <span className="e2ee-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="contact-last-msg">
                        {lastMsgPreview || (isOnline ? 'Online' : 'Offline')}
                      </p>
                    </div>
                    <div className="contact-right-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {contact.is_pinned === 1 && (
                          <span className="contact-pin-badge" title="Pinned Conversation">
                            <Pin size={12} fill="currentColor" />
                          </span>
                        )}
                        {timeLabel && <span className="contact-time">{timeLabel}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {unread > 0 && (
                          <div className="unread-badge">{unread}</div>
                        )}
                        <button 
                          type="button"
                          className="contact-pin-action-btn"
                          onClick={(e) => handleTogglePinContact(contact, e)}
                          title={contact.is_pinned === 1 ? "Unpin Chat" : "Pin Chat"}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        >
                          <Pin size={12} className={contact.is_pinned === 1 ? "text-primary-glow" : ""} style={{ transform: contact.is_pinned === 1 ? 'none' : 'rotate(45deg)' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sidebar-empty">
                <Shield size={24} className="mb-2 text-muted" />
                <p>No active conversations</p>
                <button onClick={() => setShowInviteModal(true)} className="btn btn-secondary btn-sm mt-2">
                  Generate Invite Link
                </button>
              </div>
            )
          ) : (
            // Groups Render Tab
            groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
              groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map(group => {
                const unread = group.unreadCount || 0;
                return (
                  <div
                    key={group.id}
                    onClick={() => { setSelectedGroup(group); setSelectedContact(null); }}
                    className={`contact-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                  >
                    <div className="contact-avatar group-avatar-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-glass)', color: 'var(--primary-glow)' }}>
                      <Users size={18} />
                    </div>
                    <div className="contact-details">
                      <div className="contact-meta">
                        <h4>{group.name}</h4>
                        <span className="member-count-tag" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {group.member_count} members
                        </span>
                      </div>
                      <p className="contact-last-msg">
                        {group.last_message || 'No group messages yet'}
                      </p>
                    </div>
                    <div className="contact-right-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      {unread > 0 && (
                        <div className="unread-badge">{unread}</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sidebar-empty">
                <Users size={24} className="mb-2 text-muted" />
                <p>No groups joined yet</p>
                <button onClick={() => setShowCreateGroupModal(true)} className="btn btn-primary btn-sm mt-2">
                  Create First Group
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className={`chat-panel ${(!selectedContact && !selectedGroup) ? 'mobile-hidden' : ''}`}>
        {(selectedContact || selectedGroup) ? (
          <>
            <div className="chat-header glass-card">
              <button onClick={() => { setSelectedContact(null); setSelectedGroup(null); }} className="mobile-back-btn">
                <ArrowLeft size={20} />
              </button>
              
              {selectedContact ? (
                <div className="chat-contact-info">
                  <div className="contact-avatar">
                    {selectedContact.id === 0 ? (
                      <Bot size={20} className="header-avatar-bot" />
                    ) : selectedContact.profile_picture ? (
                      <img src={selectedContact.profile_picture} alt={selectedContact.username} className="header-avatar-img" />
                    ) : (
                      selectedContact.username[0].toUpperCase()
                    )}
                    {onlineStatuses[selectedContact.id] === 'online' && <span className="online-indicator"></span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{selectedContact.username}</h3>
                      {isSecretChatActive && (
                        <span 
                          className="secret-chat-header-badge" 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            border: '1px solid rgba(239, 68, 68, 0.3)', 
                            color: '#EF4444', 
                            fontSize: '0.75rem', 
                            fontWeight: 600 
                          }}
                          title="All messages sent in this session auto-delete after 30 seconds"
                        >
                          <Lock size={12} />
                          <span>Secret Chat Active</span>
                        </span>
                      )}
                    </div>
                    <p className="chat-sub">
                      {typingContact ? (
                        <span className="typing-indicator text-primary-glow">typing...</span>
                      ) : (
                        <span className="subtext-container" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="online-status-lbl">
                            {selectedContact.id === 0 
                              ? 'AI Assistant · Online' 
                              : onlineStatuses[selectedContact.id] === 'online' 
                                ? 'Online' 
                                : formatLastSeen(lastSeenTimes[selectedContact.id] || selectedContact.last_seen)}
                          </span>
                          {selectedContact.about && (
                            <span className="header-about-text" title={selectedContact.about}>
                              {" — "}{selectedContact.about}
                            </span>
                          )}
                          {peerWhiteboardOpen && (
                            <span className="wb-active-indicator" onClick={() => setShowWhiteboardModal(true)} style={{ cursor: 'pointer' }}>
                              Whiteboard Active
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="chat-contact-info" onClick={() => setShowGroupDrawer(true)} style={{ cursor: 'pointer' }}>
                  <div className="contact-avatar group-avatar-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-glass)', color: 'var(--primary-glow)', width: '40px', height: '40px', borderRadius: '50%' }}>
                    <Users size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{selectedGroup.name}</h3>
                    <p className="chat-sub" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedGroup.members?.map(m => m.username).join(', ')}
                    </p>
                  </div>
                </div>
              )}
 
              <div className="chat-actions">
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowSoundscapeMenu(!showSoundscapeMenu)}
                    className={`icon-btn ${activeSoundscape !== 'none' ? 'active-mood' : ''}`}
                    title="Ambient Soundscape"
                    style={{
                      color: activeSoundscape !== 'none' ? '#10B981' : 'var(--text-secondary)',
                      background: activeSoundscape !== 'none' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      border: activeSoundscape !== 'none' ? '1px solid rgba(16, 185, 129, 0.25)' : 'none',
                      borderRadius: '50%',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginRight: '8px'
                    }}
                  >
                    <Volume2 size={18} style={{ animation: activeSoundscape !== 'none' ? 'pulse 1.5s infinite' : 'none' }} />
                  </button>
                  {showSoundscapeMenu && (
                    <div className="soundscape-dropdown glass-card animate-zoom-in" style={{
                      position: 'absolute',
                      top: '46px',
                      right: '0',
                      zIndex: 1000,
                      width: '220px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Shared Ambient Mood</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {[
                          { id: 'none', label: 'Off', color: '#64748B' },
                          { id: 'rain', label: '🌧️ Rain', color: '#3B82F6' },
                          { id: 'cafe', label: '☕ Cafe', color: '#F59E0B' },
                          { id: 'lofi', label: '🎧 Lofi', color: '#8B5CF6' },
                          { id: 'forest', label: '🌲 Forest', color: '#10B981' },
                          { id: 'romantic', label: '💖 Romantic', color: '#EC4899' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              handleSelectSoundscape(item.id);
                              setShowSoundscapeMenu(false);
                            }}
                            style={{
                              background: activeSoundscape === item.id ? item.color : 'rgba(255,255,255,0.04)',
                              border: activeSoundscape === item.id ? `1px solid ${item.color}` : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              padding: '6px',
                              fontSize: '0.75rem',
                              color: activeSoundscape === item.id ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer',
                              fontWeight: activeSoundscape === item.id ? 'bold' : 'normal',
                              transition: 'all 0.15s'
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      
                      {activeSoundscape !== 'none' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            <span>Local Volume</span>
                            <span>{Math.round(soundscapeVolume * 100)}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={soundscapeVolume}
                            onChange={(e) => setSoundscapeVolume(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#10B981' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedContact ? (
                  <>
                    {!selectedContact.is_blocked && (
                      <>
                        <button
                          onClick={() => setActiveCall({ contact: selectedContact, type: 'audio', isIncomingInit: false, roomId: `call_${userId}_${Date.now()}` })}
                          className="icon-btn call-action-btn"
                          title="Audio Call"
                        >
                          <Phone size={18} />
                        </button>
                        <button
                          onClick={() => setActiveCall({ contact: selectedContact, type: 'video', isIncomingInit: false, roomId: `call_${userId}_${Date.now()}` })}
                          className="icon-btn call-action-btn"
                          title="Video Call"
                        >
                          <Video size={18} />
                        </button>
                        <button
                          onClick={() => setShowChatSearch(!showChatSearch)}
                          className={`icon-btn chat-search-btn ${showChatSearch ? 'active' : ''}`}
                          title="Search Messages"
                        >
                          <Search size={18} />
                        </button>
                      </>
                    )}
 
                    {selectedContact.is_blocked ? (
                      <button onClick={handleUnblockContact} className="btn btn-secondary btn-sm" style={{ marginRight: '10px' }}>
                        Unblock
                      </button>
                    ) : null}
                    <button 
                      onClick={() => setShowChatDropdown(!showChatDropdown)} 
                      className={`icon-btn ${showChatDropdown ? 'active' : ''}`}
                      title="More actions"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartGroupVideoCall}
                      className="icon-btn call-action-btn"
                      title="Group Video Call"
                    >
                      <Video size={18} />
                    </button>
                    <button 
                      onClick={() => setShowGroupDrawer(true)} 
                      className={`icon-btn ${showGroupDrawer ? 'active' : ''}`}
                      title="Group Info & Settings"
                    >
                      <Sliders size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Chat Actions Dropdown Menu */}
              {showChatDropdown && (
                <div className="chat-dropdown-menu glass-card">
                  <button onClick={() => { setShowChatDropdown(false); setShowContactProfileModal(true); }} className="chat-dropdown-item">
                    View Profile
                  </button>
                  {!selectedContact.is_blocked && (
                    <>
                      <button 
                        onClick={() => { 
                          setShowChatDropdown(false); 
                          handleToggleSecretChat(!isSecretChatActive); 
                        }} 
                        className="chat-dropdown-item"
                        style={{ color: isSecretChatActive ? '#EF4444' : 'var(--text-primary)' }}
                      >
                        {isSecretChatActive ? 'Exit Secret Chat' : 'Start Secret Chat'}
                      </button>
                      <button 
                        onClick={() => { 
                          setShowChatDropdown(false); 
                          handleInviteGame('tic-tac-toe'); 
                        }} 
                        className="chat-dropdown-item"
                      >
                        Play Tic-Tac-Toe
                      </button>
                      <button 
                        onClick={() => { 
                          setShowChatDropdown(false); 
                          handleInviteGame('connect-four'); 
                        }} 
                        className="chat-dropdown-item"
                      >
                        Play Connect Four
                      </button>
                    </>
                  )}
                  <button onClick={() => { setShowChatDropdown(false); setShowWhiteboardModal(true); }} className="chat-dropdown-item">
                    Collaborative Whiteboard
                  </button>
                  <button onClick={handleSummarizeChat} className="chat-dropdown-item">
                    Summarize Chat
                  </button>
                  <button onClick={handleClearChat} className="chat-dropdown-item">
                    Clear Chat
                  </button>
                  <button onClick={() => { setShowChatDropdown(false); setShowSharedMediaModal(true); }} className="chat-dropdown-item">
                    Shared Media
                  </button>
                  {selectedContact.is_blocked ? (
                    <button onClick={handleUnblockContact} className="chat-dropdown-item">
                      Unblock Contact
                    </button>
                  ) : (
                    <button onClick={handleBlockContact} className="chat-dropdown-item danger">
                      Block Contact
                    </button>
                  )}
                </div>
              )}

              {showChatSearch && (
                <div className="chat-search-bar-wrapper">
                  <Search size={16} className="text-muted" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    className="chat-search-input"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {chatSearchQuery && (
                    <span className="chat-search-results-lbl">
                      {messages.filter(m => m.content && m.content.toLowerCase().includes(chatSearchQuery.toLowerCase())).length} matches
                    </span>
                  )}
                  <button type="button" className="wb-tool-btn danger" onClick={() => { setChatSearchQuery(''); setShowChatSearch(false); }} style={{ padding: '4px' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {watchPartySession && watchPartySession.isActive && (
              <div className="watch-party-panel glass-card" style={{ padding: '12px', margin: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Youtube style={{ color: '#EF4444' }} size={20} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>YouTube Watch Party Lobby</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Started by {watchPartySession.senderName}</span>
                  </div>
                  <button 
                    onClick={handleCloseWatchParty}
                    className="btn btn-secondary btn-xs"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={12} /> End Session
                  </button>
                </div>
                <div className="watch-party-player-wrapper" style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '8px', overflow: 'hidden' }}>
                  <YoutubePlayer 
                    videoId={watchPartySession.videoId} 
                    onPlayerReady={handlePlayerReady} 
                    onPlayerStateChange={handlePlayerStateChange} 
                  />
                  {watchPartyStatus && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      zIndex: 100,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#38BDF8', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                      {watchPartyStatus}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages container with wallpaper */}
            <div 
              className={`chat-messages ${activeWallpaper === 'wallpaper-custom' && currentUserProfile.custom_wallpaper ? 'wallpaper-custom' : activeWallpaper}`}
              style={activeWallpaper === 'wallpaper-custom' && currentUserProfile.custom_wallpaper ? { backgroundImage: `url(${currentUserProfile.custom_wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
            >
              {(() => {
                const filteredMessages = chatSearchQuery.trim()
                  ? messages.filter(m => m.content && m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                  : messages;
                
                return filteredMessages.map((msg, index) => {
                  const isMe = msg.sender_id === userId;
                  
                  const msgReactions = msg.reactions || [];
                  // Group reactions by emoji
                  const reactionGroups = {};
                  msgReactions.forEach(r => {
                    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
                    reactionGroups[r.emoji].push(r);
                  });

                  return (
                    <div 
                      key={msg.id || index} 
                      id={`msg-row-${msg.id}`}
                      className={`message-row ${isMe ? 'me' : 'them'}`}
                      onTouchStart={(e) => {
                        if (!msg.id || msg.isUploadingPlaceholder) return;
                        touchStartPosRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
                      }}
                      onTouchMove={(e) => {
                        if (!touchStartPosRef.current || !msg.id || msg.isUploadingPlaceholder) return;
                        const currentX = e.targetTouches[0].clientX;
                        const currentY = e.targetTouches[0].clientY;
                        const diffX = currentX - touchStartPosRef.current.x;
                        const diffY = Math.abs(currentY - touchStartPosRef.current.y);
                        
                        if (diffY > 30) {
                          touchStartPosRef.current = null;
                          const el = document.getElementById(`msg-row-${msg.id}`);
                          if (el) el.style.transform = 'translateX(0px)';
                          return;
                        }

                        if (diffX > 5 && diffX < 80) { 
                          const el = document.getElementById(`msg-row-${msg.id}`);
                          if (el) el.style.transform = `translateX(${diffX}px)`;
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (!touchStartPosRef.current || !msg.id || msg.isUploadingPlaceholder) return;
                        const currentX = e.changedTouches[0].clientX;
                        const diffX = currentX - touchStartPosRef.current.x;
                        if (diffX > 50) {
                          setReplyingTo(msg);
                        }
                        const el = document.getElementById(`msg-row-${msg.id}`);
                        if (el) {
                          el.style.transition = 'transform 0.2s';
                          el.style.transform = 'translateX(0px)';
                          setTimeout(() => { if (el) el.style.transition = ''; }, 200);
                        }
                        touchStartPosRef.current = null;
                      }}
                    >
                      <div className="message-bubble glass-card" style={{ position: 'relative' }}>
                        {/* Quick reaction picker on hover */}
                        {!msg.isUploadingPlaceholder && msg.id && (
                          <div className="reaction-quick-picker">
                            {QUICK_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                className="reaction-quick-btn"
                                onClick={() => handleAddReaction(msg.id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedGroup && !isMe && msg.sender_name && (
                          <div className="message-sender-name" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary-glow)', marginBottom: '4px' }}>
                            {msg.sender_name}
                          </div>
                        )}

                        {msg.isUploadingPlaceholder ? (
                          <div className="media-placeholder animate-pulse">
                            <div className="spinner"></div>
                            <span>{msg.content}</span>
                          </div>
                        ) : msg.secret_chat === 1 ? (
                          msg.is_viewed === 1 ? (
                            <div className="secret-msg-bubble destructed" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, cursor: 'not-allowed', color: '#EF4444', padding: '10px 14px' }}>
                              <Lock size={16} />
                              <span>Secret Message Self-Destructed</span>
                            </div>
                          ) : isMe ? (
                            <div className="secret-msg-bubble sent" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', padding: '10px 14px' }}>
                              <Lock size={16} />
                              <span>Secret Message Sent</span>
                            </div>
                          ) : (
                            <div 
                              className="secret-msg-bubble click-to-view"
                              onClick={() => startSecretMessageCountdown(msg)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-glow)', cursor: 'pointer', padding: '10px 14px', border: '1px dashed var(--primary-glow)', borderRadius: '8px', background: 'rgba(var(--primary-glow-rgb), 0.05)' }}
                            >
                              <Lock size={16} style={{ animation: 'pulse 1.5s infinite' }} />
                              <span>Secret Message (Tap to read - 30s limit)</span>
                            </div>
                          )
                        ) : msg.view_once === 1 ? (
                          msg.is_viewed === 1 ? (
                            <div className="view-once-media-bubble viewed" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                              <div className="view-once-icon-container">
                                <Lock size={16} />
                              </div>
                              <div className="view-once-details">
                                <span className="view-once-title">Viewed Once Media</span>
                                <span className="view-once-desc">Self-destructed</span>
                              </div>
                            </div>
                          ) : isMe ? (
                            <div className="view-once-media-bubble sent" style={{ cursor: 'default' }}>
                              <div className="view-once-icon-container">
                                <Lock size={16} />
                              </div>
                              <div className="view-once-details">
                                <span className="view-once-title">Sent View-Once Media</span>
                                <span className="view-once-desc">Waiting for recipient</span>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="view-once-media-bubble click-to-view"
                              onClick={() => startViewOnceCountdown(msg)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="view-once-icon-container" style={{ animation: 'pulse 1.5s infinite' }}>
                                <Lock size={16} />
                              </div>
                              <div className="view-once-details">
                                <span className="view-once-title">View Once Media</span>
                                <span className="view-once-desc">Tap to view (10s limit)</span>
                              </div>
                            </div>
                          )
                        ) : msg.media_type === 'gif' ? (
                          <img src={msg.content} alt="Animated GIF" className="chat-media-gif" />
                        ) : msg.media_type === 'sticker' ? (
                          <img src={msg.content} alt="Sticker" className="chat-sticker-msg" />
                        ) : ['image', 'video', 'audio', 'pdf', 'document', 'file', 'video_note'].includes(msg.media_type) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                            <MediaRenderer
                              filePath={msg.content}
                              mediaType={msg.media_type}
                              mediaName={msg.media_name}
                              token={token}
                              onImageClick={(url) => setPreviewImage({ url, msg })}
                            />
                            {msg.media_type === 'audio' && msg.transcript && (
                              <div style={{ marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => setShowingTranscripts(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                  className="btn btn-secondary btn-xs"
                                  style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <span>{showingTranscripts[msg.id] ? 'Hide Transcript' : 'Show Transcript'}</span>
                                </button>
                                {showingTranscripts[msg.id] && (
                                  <div className="voice-transcript-container" style={{ marginTop: '6px', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderLeft: '2px solid var(--primary-glow)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-primary)', fontStyle: 'italic', wordBreak: 'break-word' }}>
                                    "{msg.transcript}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : msg.media_type === 'location' ? (() => {
                          const coords = msg.content.split(',');
                          const lat = parseFloat(coords[0]);
                          const lng = parseFloat(coords[1]);
                          
                          if (isNaN(lat) || isNaN(lng)) {
                            return <p className="message-text">Invalid Location Coordinates</p>;
                          }
                          
                          const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                          const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
                          
                          return (
                            <div className="location-bubble-container" style={{ width: '260px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                              <iframe
                                title="Shared Location Map"
                                width="100%"
                                height="150"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={embedUrl}
                              />
                              <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500 }}>
                                  <MapPin size={14} className="text-primary-glow" />
                                  <span>Shared Location</span>
                                </div>
                                <a 
                                  href={googleMapsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-primary btn-xs"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                                >
                                  Open Maps
                                </a>
                              </div>
                            </div>
                          );
                        })() : msg.media_type === 'poll' ? (() => {
                          let pollData = {};
                          try {
                            pollData = JSON.parse(msg.content);
                          } catch (e) {
                            return <p className="message-text">Error rendering poll</p>;
                          }

                          let votesMap = {};
                          try {
                            votesMap = msg.poll_votes ? JSON.parse(msg.poll_votes) : {};
                          } catch (e) {}

                          const voteValues = Object.values(votesMap);
                          const totalVotes = voteValues.length;
                          const myVote = votesMap[userId] !== undefined ? votesMap[userId] : votesMap[String(userId)];

                          return (
                            <div className="poll-message-card">
                              <div className="poll-question">{pollData.question}</div>
                              {pollData.options.map((opt, optIdx) => {
                                const optionVotesCount = voteValues.filter(v => Number(v) === optIdx).length;
                                const percentage = totalVotes > 0 ? Math.round((optionVotesCount / totalVotes) * 100) : 0;
                                const isMySelection = myVote !== undefined && Number(myVote) === optIdx;

                                return (
                                  <div 
                                    key={optIdx} 
                                    onClick={() => handleVotePoll(msg.id, optIdx)}
                                    className="poll-option-row"
                                    style={{
                                      borderColor: isMySelection ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'
                                    }}
                                  >
                                    <div className="poll-option-fill" style={{ width: `${percentage}%` }} />
                                    <span className="poll-option-text">
                                      {opt.text} {isMySelection && ' 🟢'}
                                    </span>
                                    <span className="poll-option-stats">
                                      {optionVotesCount} ({percentage}%)
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })() : msg.media_type === 'status_mention' ? (() => {
                          let mentionData = {};
                          try {
                            mentionData = JSON.parse(msg.content);
                          } catch (e) {
                            return <p className="message-text">Mentioned you in a status</p>;
                          }
                          
                          const isMeSender = msg.sender_id === userId;
                          
                          return (
                            <div className="status-mention-card" style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', minWidth: '220px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Sparkles size={16} className="text-primary-glow" style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {isMeSender ? 'You mentioned them' : `@${mentionData.senderUsername} mentioned you`}
                                </span>
                              </div>
                              
                              {/* Status content preview */}
                              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px', marginBottom: '10px', overflow: 'hidden' }}>
                                {mentionData.mediaType === 'image' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                    <img 
                                      src={`/api/upload/download/${getStatusMediaDetails(mentionData.content).filename}`} 
                                      alt="Status Preview" 
                                      style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px' }} 
                                    />
                                    {getStatusMediaDetails(mentionData.content).caption && (
                                      <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.78rem', textAlign: 'center', wordBreak: 'break-word', width: '100%', padding: '0 4px' }}>
                                        {getStatusMediaDetails(mentionData.content).caption}
                                      </div>
                                    )}
                                  </div>
                                ) : mentionData.mediaType === 'video' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                    <video 
                                      src={`/api/upload/download/${getStatusMediaDetails(mentionData.content).filename}`} 
                                      style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px' }} 
                                      muted
                                    />
                                    {getStatusMediaDetails(mentionData.content).caption && (
                                      <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.78rem', textAlign: 'center', wordBreak: 'break-word', width: '100%', padding: '0 4px' }}>
                                        {getStatusMediaDetails(mentionData.content).caption}
                                      </div>
                                    )}
                                  </div>
                                ) : (() => {
                                  let text = mentionData.content;
                                  let bg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                                  if (mentionData.content.startsWith('{')) {
                                    try {
                                      const parsed = JSON.parse(mentionData.content);
                                      text = parsed.text;
                                      bg = parsed.background || bg;
                                    } catch(e) {}
                                  }
                                  return (
                                    <div style={{ background: bg, padding: '12px', borderRadius: '4px', textAlign: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>
                                      {text}
                                    </div>
                                  );
                                })()}
                              </div>
                              
                              {!isMeSender && (
                                <button
                                  type="button"
                                  onClick={() => handleAddOnStatus(mentionData.statusId, mentionData)}
                                  className="btn btn-primary btn-xs"
                                  style={{ width: '100%', borderRadius: '20px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem' }}
                                >
                                  <Plus size={12} /> Add to your status
                                </button>
                              )}
                            </div>
                          );
                        })() : msg.media_type === 'status_reply' ? (() => {
                          let replyData = {};
                          try {
                            replyData = JSON.parse(msg.content);
                          } catch (e) {
                            return <p className="message-text">{msg.content}</p>;
                          }
                          
                          return (
                            <div className="status-reply-card" style={{ 
                              padding: '8px', 
                              background: 'rgba(255, 255, 255, 0.05)', 
                              borderLeft: '4px solid var(--primary)', 
                              borderRadius: '8px', 
                              minWidth: '200px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              {/* Parent Status Quote Preview */}
                              <div style={{ 
                                padding: '6px 8px', 
                                background: 'rgba(0, 0, 0, 0.2)', 
                                borderRadius: '4px', 
                                fontSize: '0.78rem',
                                color: 'rgba(255, 255, 255, 0.7)'
                              }}>
                                <span style={{ fontWeight: 600, display: 'block', fontSize: '0.72rem', color: 'var(--primary)', marginBottom: '4px' }}>
                                  Status Update:
                                </span>
                                {replyData.statusMediaType === 'image' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img 
                                      src={`/api/upload/download/${replyData.statusContent.startsWith('{') ? JSON.parse(replyData.statusContent).filename : replyData.statusContent}`} 
                                      alt="Status Preview" 
                                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                                    />
                                    <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {replyData.statusContent.startsWith('{') ? (JSON.parse(replyData.statusContent).caption || 'Photo status') : 'Photo status'}
                                    </span>
                                  </div>
                                ) : replyData.statusMediaType === 'video' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <video 
                                      src={`/api/upload/download/${replyData.statusContent.startsWith('{') ? JSON.parse(replyData.statusContent).filename : replyData.statusContent}`} 
                                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                                      muted
                                    />
                                    <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {replyData.statusContent.startsWith('{') ? (JSON.parse(replyData.statusContent).caption || 'Video status') : 'Video status'}
                                    </span>
                                  </div>
                                ) : (() => {
                                  let text = replyData.statusContent;
                                  if (replyData.statusContent.startsWith('{')) {
                                    try {
                                      text = JSON.parse(replyData.statusContent).text;
                                    } catch(e) {}
                                  }
                                  return (
                                    <div style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                      {text}
                                    </div>
                                  );
                                })()}
                              </div>
                              
                              {/* Reply Text */}
                              <div className="message-text" style={{ fontSize: '0.9rem', color: '#fff', padding: '2px 4px' }}>
                                {renderMessageTextWithLinks(replyData.replyText)}
                              </div>
                            </div>
                          );
                        })() : msg.media_type === 'location' ? (() => {
                          const coords = msg.content.split(',');
                          const lat = parseFloat(coords[0]);
                          const lng = parseFloat(coords[1]);
                          
                          if (isNaN(lat) || isNaN(lng)) {
                            return <p className="message-text">Invalid Location Coordinates</p>;
                          }
                          
                          const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                          const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
                          
                          return (
                            <div className="location-bubble-container" style={{ width: '260px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                              <iframe
                                title="Shared Location Map"
                                width="100%"
                                height="150"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={embedUrl}
                              />
                              <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500 }}>
                                  <MapPin size={14} className="text-primary-glow" />
                                  <span>Shared Location</span>
                                </div>
                                <a 
                                  href={googleMapsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-primary btn-xs"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                                >
                                  Open Maps
                                </a>
                              </div>
                            </div>
                          );
                        })() : msg.media_type === 'watch_party_invite' ? (() => {
                          let inviteData = {};
                          try {
                            inviteData = JSON.parse(msg.content);
                          } catch (e) {
                            inviteData = { videoId: '', videoUrl: '', senderName: 'Someone' };
                          }
                          const thumbnailUrl = `https://img.youtube.com/vi/${inviteData.videoId}/mqdefault.jpg`;
                          return (
                            <div className="watch-party-invite-card glass-card" style={{
                              padding: '12px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: '12px',
                              minWidth: '240px',
                              maxWidth: '300px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Youtube size={18} style={{ color: '#EF4444' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>YouTube Watch Party</span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                                {inviteData.senderName} has invited you to watch a video together!
                              </p>
                              {inviteData.videoId && (
                                <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                  <img 
                                    src={thumbnailUrl} 
                                    alt="Video Thumbnail" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setWatchPartySession({
                                    targetId: msg.group_id || (msg.sender_id === userId ? msg.receiver_id : msg.sender_id),
                                    isGroup: !!msg.group_id,
                                    videoId: inviteData.videoId,
                                    senderName: inviteData.senderName,
                                    senderId: msg.sender_id,
                                    isActive: true
                                  });
                                }}
                                className="btn btn-primary btn-xs"
                                style={{
                                  background: '#EF4444',
                                  borderColor: '#EF4444',
                                  width: '100%',
                                  padding: '6px',
                                  borderRadius: '20px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  marginTop: '4px'
                                }}
                              >
                                Join Watch Party
                              </button>
                            </div>
                          );
                        })() : msg.media_type === 'call_log' ? (
                          <CallLogRenderer msg={msg} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            {(() => {
                              let displayContent = msg.content;
                              let replyData = null;
                              try {
                                if (msg.content && msg.content.startsWith('{') && msg.content.includes('"isReply":true')) {
                                  const parsed = JSON.parse(msg.content);
                                  if (parsed.isReply) {
                                    replyData = parsed;
                                    displayContent = parsed.text;
                                  }
                                }
                              } catch(e) {}
                              return (
                                <>
                                  {replyData && (
                                    <div 
                                      className="replied-message-block"
                                      onClick={() => scrollToMessage(replyData.originalId)}
                                      style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        borderLeft: '3px solid var(--primary-glow)',
                                        padding: '6px 8px',
                                        borderRadius: '4px',
                                        marginBottom: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        userSelect: 'none'
                                      }}
                                    >
                                      <span style={{ fontSize: '0.7rem', color: 'var(--primary-glow)', fontWeight: 'bold' }}>{replyData.replyToSender}</span>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyData.replyToContent}</span>
                                    </div>
                                  )}
                                  <p className="message-text">{renderMessageTextWithLinks(displayContent)}</p>
                                </>
                              );
                            })()}
                            {translatedMessages[msg.id] && (
                              <div className="translated-text-container">
                                <Languages size={12} />
                                <span>{translatedMessages[msg.id]}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                onClick={() => {
                                  const targetLang = window.prompt("Enter target language code (e.g. 'es' for Spanish, 'fr' for French, 'hi' for Hindi, 'de' for German):", "es");
                                  if (targetLang) {
                                    handleTranslateMessage(msg.id, msg.content, targetLang);
                                  }
                                }}
                                className="icon-btn"
                                style={{ padding: '2px', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Translate Message"
                              >
                                <Languages size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Reactions display */}
                        {Object.keys(reactionGroups).length > 0 && (
                          <div className="message-reactions">
                            {Object.entries(reactionGroups).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                className={`reaction-chip ${users.some(u => u.user_id === userId) ? 'mine' : ''}`}
                                onClick={() => handleAddReaction(msg.id, emoji)}
                                title={users.map(u => u.username).join(', ')}
                              >
                                <span className="reaction-emoji">{emoji}</span>
                                {users.length > 1 && <span className="reaction-count">{users.length}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="message-timestamp" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {msg.media_type === 'text' && !msg.isUploadingPlaceholder && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const utterance = new SpeechSynthesisUtterance(msg.content);
                                window.speechSynthesis.cancel();
                                window.speechSynthesis.speak(utterance);
                              }}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
                              title="Read Message Aloud"
                              className="tts-btn"
                            >
                              <Volume2 size={12} className="hover:text-primary-glow" />
                            </button>
                          )}
                          <span>{formatMessageDateTime(msg.created_at)}</span>
                          {isMe && (
                            <span className="read-status">
                              {msg.is_read ? <CheckCheck size={14} className="text-primary-glow" /> : <Check size={14} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {typingContact && (
                <div className="message-row them">
                  <div className="message-bubble glass-card typing-bubble">
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {isRecordingVideoNote && (
              <div className="video-note-preview-container">
                <video 
                  ref={videoNotePreviewRef}
                  autoPlay 
                  muted 
                  playsInline 
                  className="video-note-preview-video"
                />
              </div>
            )}

            {showSchedulerPicker && (() => {
              const defaults = getScheduleDefaults();
              return (
                <div className="scheduler-popover glass-card animate-zoom-in" style={{ position: 'absolute', bottom: '80px', right: '80px', zIndex: 1000, padding: '16px', width: '280px', border: '1px solid var(--glass-border)', background: 'rgba(13, 17, 28, 0.95)', backdropFilter: 'blur(10px)' }}>
                  <div className="scheduler-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Schedule Message</h4>
                    <button type="button" onClick={() => setShowSchedulerPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select date & time for delivery (Local/IST):</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input 
                        type="date" 
                        id="scheduler-date"
                        min={defaults.dateStr}
                        defaultValue={defaults.dateStr}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', outline: 'none', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                        <select id="scheduler-hour" defaultValue={defaults.hour} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                          {Array.from({ length: 12 }, (_, i) => {
                            const hr = i + 1;
                            return <option key={hr} value={hr} style={{ backgroundColor: '#0e111a' }}>{hr}</option>;
                          })}
                        </select>
                        <select id="scheduler-minute" defaultValue={defaults.minute} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                          {Array.from({ length: 60 }, (_, i) => {
                            const min = i.toString().padStart(2, '0');
                            return <option key={i} value={i} style={{ backgroundColor: '#0e111a' }}>{min}</option>;
                          })}
                        </select>
                        <select id="scheduler-ampm" defaultValue={defaults.ampm} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                          <option value="AM" style={{ backgroundColor: '#0e111a' }}>AM</option>
                          <option value="PM" style={{ backgroundColor: '#0e111a' }}>PM</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleScheduleMessage} 
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                      Schedule Delivery
                    </button>
                  </div>
                </div>
              );
            })()}

            {showAttachmentMenu && !selectedContact?.is_blocked && (
              <div className="attachment-drawer">
                {/* Document/Media */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); triggerFileSelect(); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#8B5CF6' }}>
                    <Paperclip size={18} />
                  </div>
                  <span className="attachment-drawer-label">Document</span>
                </button>

                {/* Camera */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); setShowCameraModal(true); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#EC4899' }}>
                    <Camera size={18} />
                  </div>
                  <span className="attachment-drawer-label">Camera</span>
                </button>

                {/* Video Note */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); startVideoNoteRecording(); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#3B82F6' }}>
                    <Video size={18} />
                  </div>
                  <span className="attachment-drawer-label">Video Note</span>
                </button>

                {/* Location */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); handleShareLocation(); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#10B981' }}>
                    <MapPin size={18} />
                  </div>
                  <span className="attachment-drawer-label">Location</span>
                </button>

                {/* Poll */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); setShowPollModal(true); }}
                  className="attachment-drawer-item"
                  disabled={selectedContact?.id === 0}
                >
                  <div className="attachment-drawer-icon" style={{ background: '#F59E0B' }}>
                    <BarChart3 size={18} />
                  </div>
                  <span className="attachment-drawer-label">Poll</span>
                </button>

                {/* Stickers & GIFs */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#6366F1' }}>
                    <Smile size={18} />
                  </div>
                  <span className="attachment-drawer-label">Stickers</span>
                </button>

                {/* Watch Party */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); handleStartWatchParty(); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#EF4444' }}>
                    <Youtube size={18} />
                  </div>
                  <span className="attachment-drawer-label">Watch Party</span>
                </button>

                {/* Schedule Message */}
                <button 
                  type="button" 
                  onClick={() => { setShowAttachmentMenu(false); setShowSchedulerPicker(!showSchedulerPicker); }}
                  className="attachment-drawer-item"
                >
                  <div className="attachment-drawer-icon" style={{ background: '#475569' }}>
                    <Clock size={18} />
                  </div>
                  <span className="attachment-drawer-label">Schedule</span>
                </button>
              </div>
            )}

            {replyingTo && (
              <div className="replying-preview-box" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', borderLeft: '3px solid var(--primary-glow)', paddingLeft: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary-glow)', fontWeight: 'bold' }}>
                    Replying to {replyingTo.sender_id === userId ? "You" : (replyingTo.sender_name || "Someone")}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {replyingTo.media_type === 'image' ? '📷 Image' : (replyingTo.media_type === 'audio' ? '🎵 Voice Note' : replyingTo.content)}
                  </span>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="chat-input-area glass-card">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                multiple
                style={{ display: 'none' }}
              />
              
              {isRecordingVideoNote ? (
                <div className="voice-record-bar">
                  <div className="record-status-group">
                    <span className="record-dot animate-pulse">●</span>
                    <span className="record-timer">{formatRecordingTime(videoNoteTime)}</span>
                  </div>
                  <span className="recording-label">Recording video note...</span>
                  <div className="record-actions">
                    <button type="button" onClick={() => stopVideoNoteRecording(false)} className="record-btn cancel" title="Discard">
                      <Trash2 size={16} />
                    </button>
                    <button type="button" onClick={handleFlipVideoNoteCamera} className="record-btn" title="Switch Camera" style={{ background: 'rgba(59, 130, 246, 0.25)', color: '#60A5FA' }}>
                      <RefreshCw size={16} />
                    </button>
                    <button type="button" onClick={() => stopVideoNoteRecording(true)} className="record-btn send" title="Send Video Note">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              ) : isRecording ? (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="voice-record-bar">
                    <div className="record-status-group">
                      <span className="record-dot animate-pulse">●</span>
                      <span className="record-timer">{formatRecordingTime(recordingTime)}</span>
                    </div>
                    <span className="recording-label">Recording voice message...</span>
                    <div className="record-actions">
                      <button type="button" onClick={() => stopRecording(false)} className="record-btn cancel" title="Discard">
                        <Trash2 size={16} />
                      </button>
                      <button type="button" onClick={() => stopRecording(true)} className="record-btn send" title="Send Voice Message">
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="voice-filter-container">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Voice Effect:</span>
                    <select
                      value={voiceFilter}
                      onChange={(e) => setVoiceFilter(e.target.value)}
                      className="voice-filter-select"
                    >
                      <option value="normal">Normal</option>
                      <option value="robot">Robot</option>
                      <option value="helium">Helium</option>
                      <option value="slow-mo">Slow-mo</option>
                      <option value="echo">Echo</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    type="button" 
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} 
                    className={`input-action-btn ${showAttachmentMenu ? 'active' : ''}`} 
                    title="Attachments"
                    disabled={selectedContact?.is_blocked}
                  >
                    <Plus size={18} />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} 
                    className={`input-action-btn ${showEmojiPicker ? 'active' : ''}`} 
                    title="Emojis"
                    disabled={selectedContact?.is_blocked}
                  >
                    <SmilePlus size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={selectedContact?.is_blocked ? "Unblock contact to message..." : "Type a message..."}
                    value={textInput}
                    disabled={selectedContact?.is_blocked}
                    onChange={handleTextInputChange}
                    className="message-input"
                  />
                  {!selectedContact?.is_blocked && (
                    <button 
                      type="button" 
                      onClick={() => setShowSchedulerPicker(!showSchedulerPicker)} 
                      className={`input-action-btn scheduler-input-btn ${showSchedulerPicker ? 'active' : ''}`}
                      title="Schedule Message"
                      style={{ marginRight: '6px' }}
                    >
                      <Clock size={18} />
                    </button>
                  )}
                  
                  {!textInput.trim() ? (
                    <button 
                      type="button" 
                      onClick={startRecording} 
                      className="record-mic-btn-outside" 
                      title="Record Voice Message" 
                      disabled={selectedContact?.is_blocked}
                    >
                      <Mic size={18} />
                    </button>
                  ) : (
                    <button type="submit" className="send-btn" disabled={selectedContact?.is_blocked}>
                      <Send size={18} />
                    </button>
                  )}
                </>
              )}
            </form>

            {showGifPicker && (
              <StickerGifPicker
                onSelectGif={handleSendGif}
                onSelectSticker={handleSendSticker}
                onClose={() => setShowGifPicker(false)}
              />
            )}

            {showEmojiPicker && (
              <EmojiPicker
                onSelectEmoji={handleInsertEmoji}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </>
        ) : (
          <div className="dashboard-welcome-container glass-card animate-zoom-in">
            <div className="welcome-header">
              <div className="welcome-avatar-glow">
                {currentUserProfile && currentUserProfile.profile_picture ? (
                  <img src={currentUserProfile.profile_picture} alt="Me" className="welcome-avatar-img" />
                ) : (
                  <div className="welcome-avatar-initials">{username[0].toUpperCase()}</div>
                )}
                <span className="avatar-pulse-dot"></span>
              </div>
              <div className="welcome-greeting">
                <h2>Welcome, <span className="text-gradient">{username}</span>!</h2>
                <p className="welcome-date">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="welcome-status-banner">
              <div className="status-banner-item">
                <span className="banner-label">Network Link</span>
                <span className="banner-value connected">
                  <span className="pulse-green"></span>
                  {connected ? 'Secure Cyber Uplink Active' : 'Establishing Secure Link...'}
                </span>
              </div>
              <div className="status-banner-item">
                <span className="banner-label">Active Encryption</span>
                <span className="banner-value secure">
                  AES-256 / RSA-4096
                </span>
              </div>
            </div>

            <div className="welcome-stats-grid">
              <div className="welcome-stat-card glass-card">
                <span className="stat-num">{contacts.length}</span>
                <span className="stat-lbl">Secure Contacts</span>
              </div>
              <div className="welcome-stat-card glass-card">
                <span className="stat-num">
                  {contacts.filter(c => c.unread_count > 0).length}
                </span>
                <span className="stat-lbl">Unread Chats</span>
              </div>
              <div className="welcome-stat-card glass-card">
                <span className="stat-num">
                  {statuses.length}
                </span>
                <span className="stat-lbl">Total Stories</span>
              </div>
            </div>

            <div className="welcome-quick-actions">
              <h3>Secure Control Deck</h3>
              <div className="quick-actions-grid">
                <div className="quick-action-card glass-card" onClick={() => setShowAddContactModal(true)}>
                  <div className="action-icon-wrapper cyan">
                    <UserPlus size={20} />
                  </div>
                  <div className="action-details">
                    <h4>Add Contact</h4>
                    <p>Register new cyber link</p>
                  </div>
                </div>

                <div className="quick-action-card glass-card" onClick={() => setShowInviteModal(true)}>
                  <div className="action-icon-wrapper green">
                    <Paperclip size={20} />
                  </div>
                  <div className="action-details">
                    <h4>Invite Someone</h4>
                    <p>Generate invitation token</p>
                  </div>
                </div>

                <div className="quick-action-card glass-card" onClick={() => setShowSettingsModal(true)}>
                  <div className="action-icon-wrapper purple">
                    <Settings size={20} />
                  </div>
                  <div className="action-details">
                    <h4>Aesthetics Panel</h4>
                    <p>Customize themes & visuals</p>
                  </div>
                </div>

                <div className="quick-action-card glass-card" onClick={() => {
                  const aiContact = contacts.find(c => c.id === 0);
                  if (aiContact) {
                    setSelectedContact(aiContact);
                    setSelectedGroup(null);
                  }
                }}>
                  <div className="action-icon-wrapper teal">
                    <Bot size={20} />
                  </div>
                  <div className="action-details">
                    <h4>AI Cyber Companion</h4>
                    <p>Consult the core network AI</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="welcome-footer">
              <span className="footer-e2ee-tag">🛡️ Connectra Secure Protocol v2.5.0</span>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal 
          imageUrl={previewImage.url} 
          message={previewImage.msg}
          token={token}
          userId={userId}
          onMessageDeleted={handleMessageDeleted}
          onClose={() => setPreviewImage(null)} 
        />
      )}

      {showCreateGroupModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-zoom-in" style={{ maxWidth: '440px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create New Group</h2>
              <button onClick={() => setShowCreateGroupModal(false)} className="icon-btn">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden', height: '100%' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Group Name</label>
                <input 
                  type="text" 
                  value={groupNameInput} 
                  onChange={(e) => setGroupNameInput(e.target.value)} 
                  placeholder="Enter group name..."
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: '180px', paddingRight: '4px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Select Members</label>
                {contacts.filter(c => c.id !== 0).map(contact => {
                  const isSelected = selectedGroupMembers.includes(contact.id);
                  return (
                    <div 
                      key={contact.id} 
                      onClick={() => handleToggleGroupMemberSelection(contact.id)}
                      className={`contact-item ${isSelected ? 'active' : ''}`}
                      style={{ padding: '8px 12px', marginBottom: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: isSelected ? 'var(--primary-glass)' : 'transparent', border: '1px solid ' + (isSelected ? 'rgba(var(--primary-rgb), 0.2)' : 'transparent') }}
                    >
                      <div className="contact-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {contact.profile_picture ? (
                          <img src={contact.profile_picture} alt={contact.username} className="sidebar-avatar-img" />
                        ) : (
                          contact.username[0].toUpperCase()
                        )}
                      </div>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', flex: 1 }}>{contact.username}</span>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // handled by click
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="modal-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                <button type="button" onClick={() => setShowCreateGroupModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGroupDrawer && selectedGroup && (
        <div className="modal-backdrop" style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: 0 }}>
          <div className="modal-content glass-card" style={{ width: '380px', maxWidth: '100vw', borderRadius: 0, height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out' }}>
            <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedGroup.name}</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Group Information</span>
              </div>
              <button onClick={() => setShowGroupDrawer(false)} className="icon-btn">
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Group Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-glass)', color: 'var(--primary-glow)', width: '70px', height: '70px', borderRadius: '50%' }}>
                  <Users size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{selectedGroup.name}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Created at {new Date(selectedGroup.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions: Exit Group */}
              <div>
                <button 
                  onClick={() => handleRemoveGroupMember(userId)}
                  className="btn btn-secondary" 
                  style={{ width: '100%', color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <LogOut size={16} />
                  <span>Exit Group</span>
                </button>
              </div>

              {/* Members List */}
              <div>
                <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  <span>MEMBERS ({selectedGroup.members?.length || 0})</span>
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedGroup.members?.map(member => {
                    const currentUserIsAdmin = selectedGroup.members?.find(m => m.user_id === userId)?.is_admin === 1;
                    const isSelf = member.user_id === userId;
                    
                    return (
                      <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                        <div className="contact-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                          {member.profile_picture ? (
                            <img src={member.profile_picture} alt={member.username} className="sidebar-avatar-img" />
                          ) : (
                            member.username[0].toUpperCase()
                          )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {member.username} {isSelf && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(You)</span>}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {member.about || 'Connectra member'}
                          </span>
                        </div>
                        
                        {member.is_admin === 1 && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary-glow)', border: '1px solid rgba(var(--primary-rgb), 0.25)', fontWeight: 600 }}>
                            Admin
                          </span>
                        )}

                        {/* Admin Action options for other members */}
                        {currentUserIsAdmin && !isSelf && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleToggleGroupAdmin(member.user_id, member.is_admin === 1)}
                              className="icon-btn"
                              title={member.is_admin === 1 ? "Demote from Admin" : "Make Admin"}
                              style={{ padding: '4px' }}
                            >
                              <Shield size={14} className={member.is_admin === 1 ? 'text-primary-glow' : 'text-muted'} />
                            </button>
                            <button
                              onClick={() => handleRemoveGroupMember(member.user_id)}
                              className="icon-btn"
                              title="Remove member"
                              style={{ padding: '4px', color: '#EF4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Members Section (Admins only) */}
              {selectedGroup.members?.find(m => m.user_id === userId)?.is_admin === 1 && (
                <div>
                  <h4 style={{ marginBottom: '12px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ADD MEMBERS</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {contacts
                      .filter(c => c.id !== 0 && !selectedGroup.members?.some(m => m.user_id === c.id))
                      .map(contact => (
                        <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '6px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="contact-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                              {contact.profile_picture ? (
                                <img src={contact.profile_picture} alt={contact.username} className="sidebar-avatar-img" />
                              ) : (
                                contact.username[0].toUpperCase()
                              )}
                            </div>
                            <span style={{ fontSize: '0.85rem' }}>{contact.username}</span>
                          </div>
                          <button 
                            onClick={() => handleAddGroupMembers([contact.id])}
                            className="create-group-btn" 
                            style={{ margin: 0, padding: '2px 8px' }}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    {contacts.filter(c => c.id !== 0 && !selectedGroup.members?.some(m => m.user_id === c.id)).length === 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>All your contacts are in the group</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <InviteModal token={token} onClose={() => setShowInviteModal(false)} />
      )}

      {showSharedMediaModal && (
        <SharedMediaModal
          messages={messages}
          token={token}
          onImageClick={(url, msg) => {
            setPreviewImage({ url, msg });
            setShowSharedMediaModal(false);
          }}
          onClose={() => setShowSharedMediaModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal 
          token={token} 
          onClose={() => setShowSettingsModal(false)} 
          activeTheme={activeTheme}
          onThemeChange={onThemeChange}
          activeWallpaper={activeWallpaper}
          onWallpaperChange={onWallpaperChange}
          onUnblockSync={fetchContacts}
          onProfileUpdate={(updatedProfile) => setCurrentUserProfile(updatedProfile)}
          fontSize={fontSize}
          setFontSize={setFontSize}
          bubbleStyle={bubbleStyle}
          setBubbleStyle={setBubbleStyle}
          blurIntensity={blurIntensity}
          setBlurIntensity={setBlurIntensity}
          sidebarPosition={sidebarPosition}
          setSidebarPosition={setSidebarPosition}
          compactMode={compactMode}
          setCompactMode={setCompactMode}
        />
      )}

      {showContactProfileModal && (
        <ContactProfileModal 
          contact={selectedContact}
          token={token}
          onClose={() => setShowContactProfileModal(false)}
        />
      )}

      {showAddContactModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-zoom-in">
            <button className="modal-close-btn" onClick={() => setShowAddContactModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-section">
              <UserPlus size={28} className="modal-icon text-primary" />
              <h2>Add Contact</h2>
              <p>Search users by username or phone number to chat.</p>
            </div>
            
            <form onSubmit={handleSearchNewUser} className="search-form">
              <input
                type="text"
                placeholder="Enter username or mobile number..."
                value={searchNewUserQuery}
                onChange={(e) => setSearchNewUserQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="btn btn-primary">Search</button>
            </form>

            <div className="search-results-list">
              {searchNewUserResult.length > 0 ? (
                searchNewUserResult.map(user => (
                  <div key={user.id} className="search-result-item">
                    <span>{user.username} ({user.phone})</span>
                    <button onClick={() => handleAddContact(user)} className="btn btn-secondary btn-sm">
                      Chat
                    </button>
                  </div>
                ))
              ) : (
                <p className="search-empty">No results found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showUploadQualityModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-zoom-in max-w-sm">
            <button className="modal-close-btn" onClick={() => { setShowUploadQualityModal(false); setSelectedUploadFile(null); setViewOnceToggle(false); }}>
              <X size={18} />
            </button>
            <div className="modal-header-section">
              <Sliders size={28} className="modal-icon text-primary" />
              <h2>Send Image Quality</h2>
              <p>Choose the resolution quality for {selectedUploadFile?.name}.</p>
            </div>
            <div className="quality-options">
              <button
                onClick={() => processAndUploadFile(selectedUploadFile, 'standard')}
                className="quality-btn"
              >
                <h3>Standard Quality</h3>
                <p>Compresses the image for fast, data-saving transmission.</p>
              </button>
              <button
                onClick={() => processAndUploadFile(selectedUploadFile, 'hd')}
                className="quality-btn highlight"
              >
                <h3>HD Resolution</h3>
                <p>Sends the original file at full resolution.</p>
              </button>
            </div>
            <div className="view-once-upload-toggle" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <input 
                type="checkbox" 
                id="view-once-checkbox" 
                checked={viewOnceToggle} 
                onChange={(e) => setViewOnceToggle(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="view-once-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} className="text-yellow-400" />
                <span>View Once (Self-Destructs after 10s)</span>
              </label>
            </div>
          </div>
        </div>
      )}
      {activeCall && (
        <CallModal
          socket={socket}
          token={token}
          userId={userId}
          username={username}
          contact={activeCall.contact}
          callType={activeCall.type}
          roomId={activeCall.roomId}
          contacts={contacts}
          onlineStatuses={onlineStatuses}
          incomingOffer={activeCall.incomingOffer}
          callerName={activeCall.callerName}
          isIncomingInit={activeCall.isIncomingInit}
          onCallFinished={handleCallFinished}
          onClose={() => setActiveCall(null)}
        />
      )}

      {showCameraModal && (
        <CameraCaptureModal
          onCapture={(file) => {
            setShowCameraModal(false);
            const reader = new FileReader();
            reader.onload = (event) => {
              setEditorImageSrc(event.target.result);
              setEditorFile(file);
              setShowImageEditor(true);
            };
            reader.readAsDataURL(file);
          }}
          onClose={() => setShowCameraModal(false)}
        />
      )}

      {showWhiteboardModal && (
        <WhiteboardModal
          socket={socket}
          contact={selectedContact}
          onClose={() => setShowWhiteboardModal(false)}
        />
      )}

      {viewOnceActiveMedia && (
        <div className="view-once-overlay">
          <div className="view-once-countdown-overlay">
            <Clock size={16} />
            <span>Self-destructing in {viewOnceTimer}s</span>
          </div>
          <div className="view-once-wrapper glass-card">
            <div className="view-once-container">
              <MediaRenderer
                filePath={viewOnceActiveMedia.content}
                mediaType={viewOnceActiveMedia.media_type}
                mediaName={viewOnceActiveMedia.media_name}
                token={token}
                onImageClick={null}
              />
            </div>
          </div>
        </div>
      )}

      {secretActiveMessage && (
        <div className="view-once-overlay" style={{ zIndex: 12000 }}>
          <div className="view-once-countdown-overlay" style={{ background: '#EF4444' }}>
            <Lock size={16} />
            <span>Secret Message self-destructing in {secretTimer}s</span>
          </div>
          <div className="view-once-wrapper glass-card" style={{ maxWidth: '90%', maxHeight: '80%' }}>
            <div className="view-once-container" style={{ padding: '20px', minWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {secretActiveMessage.media_type === 'text' ? (
                <p style={{ fontSize: '1.25rem', color: 'var(--text-primary)', wordBreak: 'break-word', textAlign: 'center', margin: '20px 0' }}>
                  {secretActiveMessage.content}
                </p>
              ) : secretActiveMessage.media_type === 'gif' ? (
                <img src={secretActiveMessage.content} alt="Secret GIF" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} />
              ) : (
                <MediaRenderer
                  filePath={secretActiveMessage.content}
                  mediaType={secretActiveMessage.media_type}
                  mediaName={secretActiveMessage.media_name}
                  token={token}
                  onImageClick={null}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showGameModal && gameContact && (
        <GameModal
          socket={socketRef.current}
          userId={userId}
          contact={gameContact}
          gameType={gameType}
          onClose={() => {
            setShowGameModal(false);
            setGameContact(null);
          }}
        />
      )}

      {showPollModal && (
        <div className="modal-backdrop" style={{ zIndex: 12000 }}>
          <div className="modal-content glass-card animate-zoom-in" style={{ maxWidth: '400px' }}>
            <button className="modal-close-btn" onClick={() => setShowPollModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-section">
              <BarChart3 size={28} className="modal-icon text-primary" />
              <h2>Create Poll</h2>
              <p>Ask a question and let other users vote in real-time.</p>
            </div>
            <div className="modal-body-scroll" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Question</label>
                <input
                  type="text"
                  placeholder="e.g. What should we have for lunch?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Options</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...pollOptions];
                        updated[idx] = e.target.value;
                        setPollOptions(updated);
                      }}
                      className="search-input"
                      style={{ width: '100%' }}
                    />
                    {pollOptions.length > 2 && (
                      <button 
                        type="button" 
                        className="icon-btn danger" 
                        style={{ padding: '6px' }}
                        onClick={() => {
                          const updated = pollOptions.filter((_, oIdx) => oIdx !== idx);
                          setPollOptions(updated);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button 
                    type="button" 
                    onClick={() => setPollOptions([...pollOptions, ''])} 
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    + Add Option
                  </button>
                )}
              </div>
            </div>
            
            <div className="modal-footer-section" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', width: '100%' }}>
              <button type="button" onClick={() => setShowPollModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleCreatePoll} className="btn btn-primary">
                Create Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageEditor && (
        <div className="image-editor-backdrop">
          <div className="image-editor-content">
            <div className="modal-header-section" style={{ paddingBottom: '12px' }}>
              <h2>Edit Image</h2>
              <p>Draw or write annotations on the image before sending.</p>
            </div>
            
            <div className="image-editor-canvas-container">
              <canvas
                ref={canvasRef}
                className="image-editor-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="image-editor-toolbar">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FFFFFF', '#000000'].map((color) => (
                  <div
                    key={color}
                    className={`color-dot ${brushColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                  />
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size: {brushSize}px</span>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ width: '80px', cursor: 'pointer' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', marginRight: '8px' }}>
                <input
                  type="checkbox"
                  id="editorViewOnce"
                  checked={viewOnceToggle}
                  onChange={(e) => setViewOnceToggle(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#EF4444' }}
                />
                <label htmlFor="editorViewOnce" style={{ fontSize: '0.78rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: 0, userSelect: 'none' }}>
                  <Clock size={12} style={{ color: '#EF4444' }} /> View Once
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleUndoDrawing}
                  disabled={canvasHistory.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Undo size={14} /> Undo
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowImageEditor(false);
                    setEditorImageSrc(null);
                    setEditorFile(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSendEditedImage}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVideoPreview && (
        <div className="modal-backdrop" style={{ zIndex: 12000 }}>
          <div className="modal-content glass-card animate-zoom-in" style={{ maxWidth: '450px', background: 'rgba(15, 23, 42, 0.95)' }}>
            <button 
              className="modal-close-btn" 
              onClick={() => {
                setShowVideoPreview(false);
                setPreviewVideoFile(null);
                setPreviewVideoUrl(null);
                setViewOnceToggle(false);
              }}
            >
              <X size={18} />
            </button>
            <div className="modal-header-section" style={{ paddingBottom: '12px' }}>
              <Video size={28} className="modal-icon text-primary animate-pulse" />
              <h2>Preview Video</h2>
              <p>Review your video before sending it.</p>
            </div>
            
            <div style={{ position: 'relative', width: '100%', maxHeight: '300px', display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <video 
                src={previewVideoUrl} 
                controls 
                style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', alignSelf: 'center' }}>
              <input
                type="checkbox"
                id="videoPreviewViewOnce"
                checked={viewOnceToggle}
                onChange={(e) => setViewOnceToggle(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#EF4444' }}
              />
              <label htmlFor="videoPreviewViewOnce" style={{ fontSize: '0.78rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: 0, userSelect: 'none' }}>
                <Clock size={12} style={{ color: '#EF4444' }} /> View Once (Self-Destructs after viewing)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowVideoPreview(false);
                  setPreviewVideoFile(null);
                  setPreviewVideoUrl(null);
                  setViewOnceToggle(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  processAndUploadFile(previewVideoFile, 'standard', previewVideoType);
                  setShowVideoPreview(false);
                  setPreviewVideoFile(null);
                  setPreviewVideoUrl(null);
                }}
              >
                Send Video
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="modal-backdrop" style={{ zIndex: 12000 }}>
          <div className="modal-content glass-card animate-zoom-in" style={{ maxWidth: '550px' }}>
            <button className="modal-close-btn" onClick={() => setShowSummaryModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-section">
              <Sparkles size={28} className="modal-icon text-primary animate-pulse" />
              <h2>AI Chat Summary</h2>
              <p>Below is a summary generated by AI for your recent messages.</p>
            </div>
            <div className="modal-body-scroll" style={{ width: '100%', maxHeight: '60vh', overflowY: 'auto', padding: '8px 4px' }}>
              <div 
                className="summary-text-container" 
                style={{ 
                  background: 'rgba(0, 0, 0, 0.25)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '8px', 
                  padding: '16px', 
                  fontSize: '0.9rem', 
                  lineHeight: '1.6', 
                  color: 'var(--text-primary)', 
                  whiteSpace: 'pre-wrap' 
                }}
              >
                {chatSummaryText}
              </div>
            </div>
            <div className="modal-footer-section" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', width: '100%' }}>
              <button type="button" onClick={() => setShowSummaryModal(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateStatusModal && (
        <div className="modal-backdrop" style={{ zIndex: 12000, padding: '12px' }}>
          <div className="modal-content glass-card animate-zoom-in create-status-modal" style={{ 
            maxWidth: '450px', 
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '20px',
            gap: '12px'
          }}>
            <button 
              className="modal-close-btn" 
              onClick={() => {
                setShowCreateStatusModal(false);
                setStatusInputContent('');
                setStatusInputMediaType('text');
                setStatusInputImageFile(null);
                setStatusInputImageSrc(null);
                setStatusInputMentions([]);
                setStatusAddOnParentId(null);
                setStatusAddOnParentData(null);
                setMentionsSearchQuery('');
                setStatusTextBgIndex(0);
                setStatusInputRepostSourceContent(null);
              }}
            >
              <X size={18} />
            </button>
            
            <div className="modal-header-section" style={{ gap: '4px' }}>
              <Sparkles size={24} className="modal-icon text-primary" style={{ marginBottom: '2px' }} />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{statusAddOnParentId ? 'Add to Status' : 'Create Status'}</h2>
              <p style={{ fontSize: '0.78rem', margin: 0 }}>{statusAddOnParentId ? 'Add your reply/addon to this story' : 'Share what is happening with friends.'}</p>
            </div>
            
            <div className="modal-body-scroll" style={{ 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              overflowY: 'auto',
              flex: 1,
              paddingRight: '4px'
            }}>
              {statusAddOnParentData && (
                <div className="status-addon-preview-card" style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  width: '100%' 
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} className="text-primary-glow" />
                    Reposting @{statusAddOnParentData.username}'s Status:
                  </span>
                  <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '8px' }}>
                    {statusAddOnParentData.media_type === 'image' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', width: '100%' }}>
                        <img 
                          src={`/api/upload/download/${getStatusMediaDetails(statusAddOnParentData.content).filename}`} 
                          alt="Parent Status" 
                          style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} 
                        />
                        {getStatusMediaDetails(statusAddOnParentData.content).caption && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textAlign: 'center', wordBreak: 'break-word', width: '100%' }}>
                            {getStatusMediaDetails(statusAddOnParentData.content).caption}
                          </div>
                        )}
                      </div>
                    ) : statusAddOnParentData.media_type === 'video' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', width: '100%' }}>
                        <video 
                          src={`/api/upload/download/${getStatusMediaDetails(statusAddOnParentData.content).filename}`} 
                          style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} 
                          muted 
                        />
                        {getStatusMediaDetails(statusAddOnParentData.content).caption && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textAlign: 'center', wordBreak: 'break-word', width: '100%' }}>
                            {getStatusMediaDetails(statusAddOnParentData.content).caption}
                          </div>
                        )}
                      </div>
                    ) : (() => {
                      let text = statusAddOnParentData.content;
                      let bg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                      if (statusAddOnParentData.content.startsWith('{')) {
                        try {
                          const parsed = JSON.parse(statusAddOnParentData.content);
                          text = parsed.text;
                          bg = parsed.background || bg;
                        } catch(e) {}
                      }
                      return (
                        <div style={{ background: bg, width: '100%', padding: '12px 8px', color: '#fff', fontSize: '0.82rem', fontWeight: 'bold', textAlign: 'center' }}>
                          {text}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              {/* MediaType Toggle Buttons */}
              {!statusAddOnParentId && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusInputMediaType('text');
                      setStatusInputImageFile(null);
                      setStatusInputImageSrc(null);
                    }}
                    className={`btn btn-sm ${statusInputMediaType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Text Status
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      statusImageInputRef.current?.click();
                    }}
                    className={`btn btn-sm ${['image', 'video'].includes(statusInputMediaType) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Media Status
                  </button>
                </div>
              )}
              
              <input
                type="file"
                ref={statusImageInputRef}
                onChange={handleStatusImageChange}
                accept="image/*,video/*"
                style={{ display: 'none' }}
              />
              
              {/* Content Preview / Text Input */}
              {['image', 'video'].includes(statusInputMediaType) && statusInputImageSrc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '100%', maxHeight: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#000', display: 'flex', justifyContent: 'center' }}>
                    {statusInputMediaType === 'video' ? (
                      <video src={statusInputImageSrc} controls style={{ maxHeight: '140px', maxWidth: '100%' }} />
                    ) : (
                      <img src={statusInputImageSrc} alt="Status Preview" style={{ maxHeight: '140px', objectFit: 'contain' }} />
                    )}
                    <button
                      type="button"
                      className="icon-btn danger"
                      style={{ position: 'absolute', top: '8px', right: '8px', padding: '6px', background: 'rgba(0,0,0,0.6)' }}
                      onClick={() => {
                        setStatusInputImageFile(null);
                        setStatusInputImageSrc(null);
                        setStatusInputMediaType('text');
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={statusInputContent}
                    onChange={(e) => setStatusInputContent(e.target.value)}
                    className="search-input"
                    style={{ width: '100%' }}
                  />
                </div>
              ) : (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status Text</label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setStatusTextBgIndex(prev => (prev + 1) % STATUS_GRADIENTS.length)}
                      style={{ padding: '2px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      🎨 Change Background
                    </button>
                  </div>
                  <textarea
                    placeholder="What is on your mind?"
                    value={statusInputContent}
                    onChange={(e) => setStatusInputContent(e.target.value)}
                    className="search-input"
                    style={{ 
                      width: '100%', 
                      height: '100px', 
                      resize: 'none', 
                      padding: '16px 12px', 
                      fontSize: '1.1rem', 
                      fontWeight: 'bold',
                      color: '#fff', 
                      textAlign: 'center', 
                      background: STATUS_GRADIENTS[statusTextBgIndex],
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              )}
              
              {/* Mentions Checklist */}
              {!statusAddOnParentId && contacts.filter(c => c.id !== 0).length > 0 && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mention Friends</label>
                  <input
                    type="text"
                    placeholder="🔍 Search contacts by name..."
                    value={mentionsSearchQuery}
                    onChange={(e) => setMentionsSearchQuery(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', marginBottom: '4px', fontSize: '0.78rem', padding: '6px 10px' }}
                  />
                  <div style={{ maxHeight: '90px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)' }}>
                    {contacts
                      .filter(c => c.id !== 0)
                      .filter(c => c.username.toLowerCase().includes(mentionsSearchQuery.toLowerCase()))
                      .map(c => {
                        const isChecked = statusInputMentions.includes(c.id);
                        return (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                  if (isChecked) {
                                    setStatusInputMentions(prev => prev.filter(id => id !== c.id));
                                  } else {
                                    setStatusInputMentions(prev => [...prev, c.id]);
                                  }
                              }}
                            />
                            <span>@{c.username}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer-section" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', width: '100%' }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateStatusModal(false);
                  setStatusInputContent('');
                  setStatusInputMediaType('text');
                  setStatusInputImageFile(null);
                  setStatusInputImageSrc(null);
                  setStatusInputMentions([]);
                  setStatusAddOnParentId(null);
                  setStatusAddOnParentData(null);
                  setMentionsSearchQuery('');
                  setStatusTextBgIndex(0);
                  setStatusInputRepostSourceContent(null);
                }} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="button" onClick={handlePublishStatus} className="btn btn-primary">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && activeStatusUserGroup && activeStatusUserGroup.slides.length > 0 && (
        <div className="status-viewer-backdrop">
          <div className="status-viewer-content">
            {/* Progress Bars Indicator */}
            <div className="status-viewer-progress-bar-container">
              {activeStatusUserGroup.slides.map((_, idx) => (
                <div key={idx} className="status-viewer-progress-bar">
                  <div 
                    className={`status-viewer-progress-bar-fill ${idx === currentSlideIndex ? 'active' : idx < currentSlideIndex ? 'completed' : ''}`} 
                    style={idx === currentSlideIndex && (showViewsDrawer || statusReplyFocused) ? { animationPlayState: 'paused' } : {}}
                  />
                </div>
              ))}
            </div>
            
            {/* Header info */}
            <div className="status-viewer-header">
              <div className="status-viewer-user-info">
                <div className="status-viewer-avatar">
                  {activeStatusUserGroup.profilePicture ? (
                    <img src={activeStatusUserGroup.profilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    activeStatusUserGroup.username[0].toUpperCase()
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {activeStatusUserGroup.slides[currentSlideIndex].username}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                    {formatMessageDateTime(activeStatusUserGroup.slides[currentSlideIndex].created_at)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeStatusUserGroup.slides[currentSlideIndex].user_id === userId && (
                  <button 
                    className="icon-btn danger" 
                    style={{ color: '#EF4444', padding: '6px' }}
                    onClick={() => handleDeleteStatus(activeStatusUserGroup.slides[currentSlideIndex].id)}
                    title="Delete Status"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  className="icon-btn" 
                  style={{ color: '#fff', padding: '6px' }}
                  onClick={() => {
                    setShowStatusModal(false);
                    setActiveStatusUserGroup(null);
                    setCurrentSlideIndex(0);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Slide Body */}
            <div 
              className="status-viewer-body"
              style={(() => {
                const slide = activeStatusUserGroup.slides[currentSlideIndex];
                let bgStyle = { background: '#000', padding: '20px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 0, overflow: 'hidden' };
                if (slide.media_type === 'text') {
                  let bg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  if (slide.content.startsWith('{')) {
                    try {
                      bg = JSON.parse(slide.content).background || bg;
                    } catch(e) {}
                  }
                  bgStyle.background = bg;
                  bgStyle.padding = '24px';
                }
                return bgStyle;
              })()}
            >
              {/* Tap areas / Navigation (now restricted to the body area) */}
              <div 
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', cursor: 'pointer', zIndex: showViewsDrawer ? 0 : 5 }} 
                onClick={() => {
                  if (showViewsDrawer) return;
                  if (currentSlideIndex > 0) {
                    setCurrentSlideIndex(prev => prev - 1);
                    setShowViewsDrawer(false);
                  }
                }}
              />
              <div 
                style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '30%', cursor: 'pointer', zIndex: showViewsDrawer ? 0 : 5 }} 
                onClick={() => {
                  if (showViewsDrawer) return;
                  if (currentSlideIndex < activeStatusUserGroup.slides.length - 1) {
                    setCurrentSlideIndex(prev => prev + 1);
                    setShowViewsDrawer(false);
                  } else {
                    setShowStatusModal(false);
                    setActiveStatusUserGroup(null);
                    setCurrentSlideIndex(0);
                    setShowViewsDrawer(false);
                  }
                }}
              />

              {(() => {
                const slide = activeStatusUserGroup.slides[currentSlideIndex];
                if (slide.media_type === 'image') {
                  const { filename } = getStatusMediaDetails(slide.content);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', position: 'relative' }}>
                      <img src={`/api/upload/download/${filename}`} alt="Status slide" className="status-viewer-image" />
                      {slide.mentions && (
                        <div className="status-viewer-mentions-badge" style={{ position: 'absolute', top: '16px', right: '16px' }}>
                          Mentions Active
                        </div>
                      )}
                    </div>
                  );
                } else if (slide.media_type === 'video') {
                  const { filename } = getStatusMediaDetails(slide.content);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', position: 'relative' }}>
                      <video 
                        src={`/api/upload/download/${filename}`} 
                        className="status-viewer-image" 
                        controls
                        autoPlay
                        muted
                        playsInline
                        style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                      />
                      {slide.mentions && (
                        <div className="status-viewer-mentions-badge" style={{ position: 'absolute', top: '16px', right: '16px' }}>
                          Mentions Active
                        </div>
                      )}
                    </div>
                  );
                } else {
                  let text = slide.content;
                  if (slide.content.startsWith('{')) {
                    try {
                      text = JSON.parse(slide.content).text;
                    } catch(e) {}
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                      <p className="status-viewer-text" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{text}</p>
                      {slide.mentions && (
                        <div className="status-viewer-mentions-badge">
                          Mentions Active
                        </div>
                      )}
                    </div>
                  );
                }
              })()}
            </div>
            
            {/* Dedicated Bottom Bar Container */}
            {(() => {
              const slide = activeStatusUserGroup.slides[currentSlideIndex];
              const isOwnStatus = Number(slide.user_id) === Number(userId);
              const { caption } = slide.media_type !== 'text' ? getStatusMediaDetails(slide.content) : { caption: '' };
              const liked = slide.liked_by_me === 1;

              return (
                <div 
                  className="status-viewer-bottom-bar"
                  style={{
                    width: '100%',
                    background: 'rgba(18, 18, 22, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 10,
                    flexShrink: 0
                  }}
                >
                  {/* Caption Row */}
                  {caption && (
                    <div 
                      className="status-viewer-caption-container"
                      style={{
                        padding: '14px 16px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        textAlign: 'center',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        maxHeight: '120px',
                        overflowY: 'auto'
                      }}
                    >
                      {caption}
                    </div>
                  )}

                  {/* Interactions Row */}
                  <div 
                    className="status-viewer-interactions-container"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {isOwnStatus ? (
                      <button 
                        type="button" 
                        onClick={() => setShowViewsDrawer(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ 
                          borderRadius: '20px', 
                          padding: '6px 16px', 
                          fontSize: '0.8rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <Eye size={14} /> Seen by {slide.views?.length || 0}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowStatusModal(false);
                            handleAddOnStatus(slide.parent_id || slide.id);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Sparkles size={14} /> Add to Status
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleToggleLikeStatus(slide.id)}
                          className="icon-btn"
                          style={{
                            background: liked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                            border: liked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '50%',
                            padding: '8px',
                            color: liked ? '#EF4444' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          title={liked ? 'Unlike' : 'Like'}
                        >
                          <Heart size={16} fill={liked ? '#EF4444' : 'none'} style={{ filter: liked ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' : 'none' }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reply Input Bar (for other users' statuses) */}
                  {!isOwnStatus && (
                    <div 
                      className="status-viewer-reply-container"
                      style={{
                        padding: '10px 16px 16px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <input 
                        type="text"
                        placeholder="Type a reply..."
                        value={statusReplyText}
                        onChange={(e) => setStatusReplyText(e.target.value)}
                        onFocus={() => setStatusReplyFocused(true)}
                        onBlur={() => {
                          // Dynamic small delay so that clicking the send button registers before blurring clears statusReplyFocused
                          setTimeout(() => setStatusReplyFocused(false), 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSendStatusReply();
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '24px',
                          padding: '10px 16px',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSendStatusReply}
                        className="icon-btn"
                        style={{
                          background: 'var(--primary)',
                          borderRadius: '50%',
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          cursor: 'pointer',
                          boxShadow: 'var(--primary-glow)',
                          border: 'none',
                          outline: 'none'
                        }}
                        title="Send Reply"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Views list Drawer Overlay (for own statuses) */}
            {showViewsDrawer && (() => {
              const slide = activeStatusUserGroup.slides[currentSlideIndex];
              return (
                <div 
                  className="views-drawer-overlay"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    padding: '16px',
                    maxHeight: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    zIndex: 20,
                    boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Views ({slide.views?.length || 0})</span>
                    <button 
                      type="button"
                      onClick={() => setShowViewsDrawer(false)}
                      className="icon-btn"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                    {(!slide.views || slide.views.length === 0) ? (
                      <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '16px 0' }}>No views yet</p>
                    ) : (
                      slide.views.map(v => (
                        <div key={v.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#fff'
                            }}>
                              {v.profile_picture ? (
                                <img src={v.profile_picture} alt={v.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                v.username[0].toUpperCase()
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#fff' }}>@{v.username}</span>
                              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>{formatMessageDateTime(v.viewed_at)}</span>
                            </div>
                          </div>
                          
                          {v.liked === 1 && (
                            <Heart size={16} fill="#EF4444" color="#EF4444" style={{ filter: 'drop-shadow(0 0 3px rgba(239, 68, 68, 0.5))' }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
