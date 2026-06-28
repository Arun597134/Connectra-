# Connectra — Modern Real-Time Collaboration & Communication Platform

Connectra is a premium, web-scale real-time communication platform designed with a glassmorphic aesthetic, responsive mobile-first layouts, and advanced collaboration features. It is built using Node.js, SQLite, React, Vite, and WebSockets (Socket.io).

---

## 🚀 Architectural Tech Stack

### 1. Frontend Client
- **Framework**: React 18, Vite (Fast Hot Module Replacement).
- **Styling**: Vanilla CSS with HSL-tailored color variables, premium dark mode, and glassmorphic panels.
- **Icons**: Lucide React.
- **Native Browser Web APIs**:
  - `webkitSpeechRecognition` / `SpeechRecognition` (Voice transcription).
  - `Notification` (HTML5 Push Notifications).
  - `Audio` (HTML5 background soundscapes looping).
  - `Canvas` (Image editing brush and shared whiteboard).
  - `navigator.mediaDevices` (WebRTC camera, microphone, and rear-camera switching).

### 2. Backend Server
- **Runtime**: Node.js & Express.
- **Real-Time Layer**: Socket.io (WebSocket protocol for chat synchronization, calling signals, watch parties, and soundscapes).
- **Database**: SQLite (local server database for message history, group schemas, call logs, and status stores).
- **File Storage**: Local uploads folder served via Express static download endpoints.

---

## 🌟 Core Feature Suite

### 1. Direct & Group Chat Engine
- **Conversation Management**: Direct messaging and collaborative group chats.
- **Rich Media Sharing**: Batch upload multiple photos, videos, and PDFs with preview thumbnails before sending.
- **Image Editor**: Premium canvas image editor with brush color selection, brush size slider, drawing brush strokes, and undo history.
- **Audio Message Tools**: Record and download voice notes. Includes speech-to-text transcriptions and Text-to-Speech (TTS) read-aloud readers.
- **View-Once Mode**: Self-destructing media (images/videos) overlayed with a 10-second viewing timer.
- **Emoji Picker & Reactions**: Quick emoji picker drawer and heart/thumbs-up message reactions.
- **Location Sharing**: Share current coordinate coordinates, rendered with interactive links opening Google Maps.
- **Ephemeral Secret Sessions**: Secure chats with 30-second self-destruct timers.
- **AI Companion chatbot**: Chat with `@AI_Assistant` and generate instant conversational summaries.

### 2. Status & Stories
- **Stories Bar**: Share text/media updates with friends.
- **Features**: Support for text gradients, direct mention tagging, user views drawer, story likes, and repost chain sharing.

### 3. Collaborative Games & Whiteboards
- **Tic-Tac-Toe & Connect Four**: Challenge users to real-time synchronized games.
- **Whiteboard**: Shared drawing canvas where lines draw instantly on both clients.

---

## 📞 WebRTC Calling Engine & Video Notes

- **Audio/Video Calls**: 1-to-1 calling and multi-user conference calling.
- **Swapping Camera & Screenshare**: Dynamically swap tracks (front/rear cameras) and share your desktop screen.
- **Live Call Subtitles**: 
  - Real-time speech-to-text transcripts generated via browser Speech Recognition.
  - Transcripts are broadcasted via socket rooms and display as floating glassmorphic captions at the bottom center of the active call screen.
  - Automatically fades captions after 5 seconds of silence or pauses if mic is muted.
- **Mobile Video Notes**:
  - Record video notes with instant switching between front and back camera streams mid-recording.
  - Interactive Preview Modal allows reviewing the recorded clip and applying a **View Once** toggle before sharing.

---

## 💎 Newly Integrated Premium Features

### 1. Resilient Curated Sticker & GIF Fallback Picker
- **API Integration**: Query the Tenor or GIPHY API via environment variable configuration.
- **Zero-Config Fallback Library**: When API keys are not supplied or fail (e.g. rate limit / network error), the picker utilizes a local database populated with over 140+ trending GIFs and transparent stickers.
- **Local Keyword Search Engine**: Matches user input queries against multiple search tags on client-side arrays, returning matches instantly.

### 2. Synchronized YouTube Watch Party
- **Lobby Concept**: Launch a shared watch party from the attachment menu drawer.
- **Synced Playback**: Embeds the YouTube IFrame Player. Play, pause, and seek events are synchronized over WebSockets.
- **Action Feedback notice**: Displays a floating notification overlay (e.g. *"Arunvijay paused the video"*) over the video container.
- **Auto-Join Session**: Switching chats checks the active sessions map, automatically loading the active watch party lobby.
- **Invitation Cards**: Automatically sends a styled card in the chat featuring the video thumbnail, inviter's name, and a click-to-join button.

### 3. Shared Ambient Soundscapes
- **Soundscape Deck**: Dropdown menu in the Chat Header featuring **Rainfall (🌧️)**, **Cozy Cafe (☕)**, **Lofi beats (🎧)**, **Forest (🌲)**, and **Romantic/Friendship (💖)**.
- **Local Audio Hosting**: All loop tracks are hosted locally on your backend server (`server/uploads/`), resolving CORS or third-party hotlink blockages.
- **Local Volume & Mute**: Slider to adjust background loudness locally (or mute entirely) without affecting peers' synced playback.

### 4. HTML5 Browser Push Notifications
- **Permission Prompts**: Prompts for system permissions on dashboard load.
- **Background Delivery**: Shows desktop/mobile notifications when messages arrive while the app is hidden or minimized.
- **Interactive Clicking**: Clicking the notification auto-focuses the browser window and opens the corresponding chat thread.

### 5. Chat Panel Mobile Responsiveness
- **Grid Attachment Drawer**: Compacts the attachment list into a 4x2 grid on small screens, preventing vertical overflow.
- **Mobile input row**: Hides optional buttons and moves secondary action toggles into overlays, maximizing the text input textbox.
- **Overlay Panels**: Popovers (like the Scheduler and Soundscapes selector) are rendered as full-viewport fixed cards on mobile screens for easy touch interactions.

---

## 🛠️ Configuration & Quickstart Guide

### 1. Environment Configuration
Create a `.env` file in `client/` to override the default Sticker & GIF APIs:
```env
VITE_GIPHY_API_KEY=your_giphy_api_key_here
VITE_TENOR_API_KEY=your_tenor_api_key_here
```

### 2. Installation
Run npm install in both server and client directories:
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 3. Run Locally
Start both backend server and client dev environment concurrently:
```bash
# Start Backend (runs on port 5000)
cd server
npm start

# Start Frontend Dev Server (runs on port 5173)
cd client
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173) to launch the app!
