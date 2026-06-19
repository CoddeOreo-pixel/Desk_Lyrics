# Desk Lyrics 🎵

**English** | [中文](./README.md)

A real-time lyrics projector for your local network — play music on your PC's NetEase Cloud Music client, and any device on the same network can display synchronized lyrics in a browser.

## Features

- **Real-time lyrics sync** — Automatically detects the playing song from NetEase Cloud Music (NCM) PC client and pushes lyrics in real time
- **Bilingual lyrics** — Original lyrics + translation displayed side by side
- **Playback control** — Previous / Play-Pause / Next via Windows media keys
- **Multiple themes** — Dark Immersive, Brutalism, Apple Music style, switch with one tap
- **Immersive mode** — Hide all UI elements, lyrics only
- **Lyrics offset** — Manually adjust timing offset to fix out-of-sync lyrics
- **Font size** — Adjustable lyrics font size
- **Fullscreen** — Browser fullscreen mode
- **QR code** — Auto-generates a LAN QR code on startup, scan to open on your tablet

## Prerequisites

- **OS**: Windows (uses PowerShell to read NCM window title and send media keys)
- **Node.js**: v16+
- **NetEase Cloud Music PC client**: Running

## Install

```bash
git clone https://github.com/CoddeOreo-pixel/Desk_Lyrics.git
cd Desk_Lyrics
npm install
```

## Usage

### 1. Start the server

```bash
npm start
```

The terminal will display:

```
╔══════════════════════════════════════╗
║       Desk_Lyrics Lyrics Projector   ║
╠══════════════════════════════════════╣
║  Local:   http://localhost:3210
║  Network: http://192.168.x.x:3210
╠══════════════════════════════════════╣
║  Scan QR code to open on tablet:     ║
╚══════════════════════════════════════╝
```

### 2. Open NetEase Cloud Music

Launch the NCM client on your PC and start playing a song. The server will automatically detect the current track.

### 3. Open the web page

On your tablet (or any device on the same network), visit the LAN address shown in the terminal, or scan the QR code.

> **Firewall note**: If other devices can't connect, you may need to add a Windows Firewall inbound rule for TCP port 3210.

## Project Structure

```
Desk_Lyrics/
├── server/
│   ├── index.js              # Express + WebSocket server entry
│   ├── ws-handler.js         # WebSocket message protocol handler
│   └── services/
│       ├── ncm-local.js      # NCM client detection, window title parsing, media key control
│       ├── ncm-cloud.js      # NetEase Cloud Music API (lyrics/song details/search)
│       ├── lyrics-parser.js  # LRC lyrics parser
│       ├── player-state.js   # Playback state management (polling + event-driven)
│       └── crypto.js         # API encryption module
├── public/
│   ├── index.html            # Frontend page
│   ├── css/
│   │   ├── base.css          # Base styles + immersive mode
│   │   └── themes/
│   │       ├── dark-immersive.css  # Dark Immersive theme
│   │       ├── brutalism.css       # Brutalism theme
│   │       └── apple-music.css     # Apple Music theme
│   └── js/
│       ├── app.js            # Frontend main logic
│       ├── lyrics-renderer.js # Lyrics rendering engine
│       ├── ws-client.js      # WebSocket client (auto-reconnect)
│       └── theme-manager.js  # Theme manager
├── package.json
└── PRD.md                    # Product requirements document
```

## How It Works

1. **Song detection** — Every second, PowerShell reads the NCM window title (format: `Song - Artist`) to identify the current track
2. **Song matching** — Uses NeteaseCloudMusicApi to search and match the song ID, then fetches lyrics and cover art
3. **Real-time sync** — The server maintains playback progress and pushes updates via WebSocket; the frontend uses `requestAnimationFrame` for local timing + server calibration for low-latency lyrics scrolling
4. **Playback control** — Sends media keys (play/pause/prev/next) via Windows `keybd_event` API to control the NCM client

## Tech Stack

- **Backend**: Node.js + Express + WebSocket (ws)
- **Frontend**: Vanilla HTML/CSS/JS, zero framework dependencies
- **API**: NeteaseCloudMusicApi (lyrics, song details, search)
- **Lyrics rendering**: CSS `transform: translateY()` GPU compositing scroll + binary search for current line

## License

MIT
