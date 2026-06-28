import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2, Download, Edit2 } from 'lucide-react';

export default function WhiteboardModal({ socket, contact, onClose }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366F1'); // Indigo default
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('pencil'); // pencil or eraser

  useEffect(() => {
    // Notify peer that whiteboard is opened
    socket?.emit('toggle_whiteboard', { receiverId: contact.id, open: true });

    // Initialize Canvas
    const canvas = canvasRef.current;
    canvas.width = 650;
    canvas.height = 450;
    
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Fill background with black space color for premium look
    context.fillStyle = '#090a0f';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Socket listeners
    const onDrawStroke = (data) => {
      if (data.senderId === contact.id) {
        drawRemoteStroke(data.stroke);
      }
    };

    const onClearCanvas = (data) => {
      if (data.senderId === contact.id) {
        clearLocalCanvas();
      }
    };

    socket?.on('draw_stroke', onDrawStroke);
    socket?.on('clear_canvas', onClearCanvas);

    return () => {
      socket?.emit('toggle_whiteboard', { receiverId: contact.id, open: false });
      socket?.off('draw_stroke', onDrawStroke);
      socket?.off('clear_canvas', onClearCanvas);
    };
  }, [contact, socket]);

  // Adjust stroke settings when color, size, or tool changes
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = tool === 'eraser' ? '#090a0f' : color;
    contextRef.current.lineWidth = brushSize;
  }, [color, brushSize, tool]);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    // Emit stroke details to peer
    const strokeData = {
      x: offsetX,
      y: offsetY,
      color: tool === 'eraser' ? '#090a0f' : color,
      size: brushSize,
      isNew: false
    };

    socket?.emit('draw_stroke', {
      receiverId: contact.id,
      stroke: strokeData
    });
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);

    // Signal stroke end to close path on remote side
    socket?.emit('draw_stroke', {
      receiverId: contact.id,
      stroke: { isNew: true }
    });
  };

  const getCoordinates = (event) => {
    if (event.touches && event.touches[0]) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top
      };
    }
    return {
      offsetX: event.offsetX,
      offsetY: event.offsetY
    };
  };

  const drawRemoteStroke = (stroke) => {
    const context = contextRef.current;
    if (!context) return;

    if (stroke.isNew) {
      context.beginPath();
      return;
    }

    context.save();
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.size;
    context.lineTo(stroke.x, stroke.y);
    context.stroke();
    context.restore();
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.fillStyle = '#090a0f';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleClear = () => {
    clearLocalCanvas();
    socket?.emit('clear_canvas', { receiverId: contact.id });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card animate-zoom-in max-w-2xl text-center">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="modal-header-section">
          <h2>Collaborative Whiteboard</h2>
          <p>Draw in real-time with @{contact.username}</p>
        </div>

        <div className="whiteboard-container">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="whiteboard-canvas"
            style={{ touchAction: 'none' }}
          />

          <div className="whiteboard-toolbar">
            <button 
              onClick={() => setTool('pencil')} 
              className={`wb-tool-btn ${tool === 'pencil' ? 'active' : ''}`}
              title="Pencil"
            >
              <Edit2 size={16} />
            </button>

            <button 
              onClick={() => setTool('eraser')} 
              className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              title="Eraser"
            >
              <Eraser size={16} />
            </button>

            <div className="wb-color-picker-wrapper" title="Pick Stroke Color">
              <input 
                type="color" 
                value={color} 
                onChange={(e) => { setColor(e.target.value); setTool('pencil'); }} 
                className="wb-color-input"
              />
            </div>

            <div className="wb-brush-slider" title="Brush Size">
              <span className="slider-label">Brush: {brushSize}px</span>
              <input 
                type="range" 
                min={2} 
                max={20} 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                className="wb-slider"
              />
            </div>

            <div style={{ flexGrow: 1 }} />

            <button onClick={handleClear} className="wb-tool-btn danger" title="Clear Canvas">
              <Trash2 size={16} />
            </button>

            <button onClick={handleDownload} className="wb-tool-btn success" title="Save Drawing">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
