# Connectra — Premium Real-Time Communication Platform

<div align="center">
  <img src="https://media.giphy.com/media/l0Exd3l4rR4lSszXq/giphy.gif" width="120" height="120" alt="Connectra Logo Animation" />
  
  # 💬 CONNECTRA
  
  **An ultra-modern, glassmorphic, real-time collaboration hub built for speed, aesthetics, and rich engagement.**

  [![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white&style=flat-square)](#)
  [![Vite](https://img.shields.io/badge/Vite-Fast--HMR-purple?logo=vite&logoColor=white&style=flat-square)](#)
  [![Socket.io](https://img.shields.io/badge/Socket.io-WebSockets-black?logo=socket.io&logoColor=white&style=flat-square)](#)
  [![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-blueviolet?logo=sqlite&logoColor=white&style=flat-square)](#)
  [![CSS3](https://img.shields.io/badge/CSS3-Glassmorphic-orange?logo=css3&logoColor=white&style=flat-square)](#)
</div>

---

## 🌟 Visual Feature Showcase

| Feature Component | Animated Demo | Details & Capabilities |
| :--- | :---: | :--- |
| **Direct & Group Chats** | <img src="https://media.giphy.com/media/Cmr1OMJ2VK0FM4O9b7/200w.gif" width="80" alt="Chat Animation" /> | Real-time direct messaging, group rooms, typing indicators, read badges, and contact pinning. |
| **Resilient Sticker & GIF Engine** | <img src="https://media.giphy.com/media/12SAyDwHyVVr44/200w.gif" width="80" alt="Sticker Animation" /> | Curated picker with over 140+ animated local stickers & GIFs that search instantly with 0% api-failure rate. |
| **YouTube Watch Party** | <img src="https://media.giphy.com/media/26ufdipOdGD2PAODK/200w.gif" width="80" alt="Watch Party Animation" /> | Synchronized video playback lobby. Synchronizes seek time, pause/play events, and floating user-status alerts. |
| **WebRTC Audio/Video Calls** | <img src="https://media.giphy.com/media/Y4pAQpsTOR5hC/200w.gif" width="80" alt="Call Animation" /> | 1-to-1 and group calling. Supports rear/front camera swapping, screenshare, and live transcripts. |
| **Shared Soundscapes** | <img src="https://media.giphy.com/media/3o7aCRloybJlXpNjSU/200w.gif" width="80" alt="Fire Animation" /> | Synced background loops (Rain, Cafe, Lofi study, Forest) with independent local volume controls. |

---

## 🚀 Technical Highlights

- **WebRTC Camera Swapping**: Dynamically switch camera streams (front to rear) mid-call or mid-recording for mobile and desktop screens.
- **Resilient Fallback Mode**: Instantly switches Giphy/Tenor querying to a client-side search engine when API keys are unauthorized or offline.
- **Glassmorphism Design**: High-fidelity dark mode layouts with blur backdrops, Outfit typography, and micro-interactions.
- **SQLite WAL Mode**: Optimized database query layer using Write-Ahead Logging to handle high concurrent user reads and writes smoothly.

---

## 🛠️ Quickstart Guide

### 1. Set Environment Configuration
Create a `.env` file in `client/` to override the default Sticker & GIF APIs:
```env
VITE_GIPHY_API_KEY=your_giphy_api_key_here
VITE_TENOR_API_KEY=your_tenor_api_key_here
```

### 2. Installation
Install dependencies in both root folders:
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 3. Run Locally
Start both servers concurrently:
```bash
# Start Backend Server (runs on port 5000)
cd server
npm start

# Start Frontend Client (runs on port 5173 with HMR)
cd client
npm run dev
```

Navigate to [http://localhost:5173](http://localhost:5173) in your browser!
