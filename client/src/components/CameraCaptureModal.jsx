import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

export default function CameraCaptureModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // Toggle user (front) vs environment (back) camera

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const constraints = {
        video: { facingMode: facingMode },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    // Mirror front camera capture
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        stopCamera();
        onClose();
      }
    }, 'image/jpeg', 0.95);
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="camera-modal-overlay">
      <div className="camera-card glass-card">
        <div className="camera-header">
          <h3>Take a Photo</h3>
          <button onClick={onClose} className="camera-close-btn" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="camera-viewport-wrapper">
          {error ? (
            <div className="camera-error">
              <p>{error}</p>
              <button onClick={startCamera} className="btn btn-secondary mt-2">Retry</button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
            />
          )}
        </div>

        <div className="camera-controls">
          <button onClick={toggleCamera} className="camera-action-btn toggle-btn" title="Switch Camera">
            <RefreshCw size={20} />
          </button>
          
          <button onClick={handleCapture} className="camera-capture-trigger" title="Capture Photo" disabled={!!error}>
            <div className="inner-ring">
              <Camera size={26} />
            </div>
          </button>

          <div style={{ width: '40px' }} /> {/* Spacer to center capture button */}
        </div>
      </div>
    </div>
  );
}
