# 🎵 PAAAAAAATIFY
> **Tagline:** *Your Music. Your World. Together.*  
> **100% Free Music Streaming Platform + Real-Time Synchronized Group Listening + Android APK**

![Paaaaaaatify Hero](frontend/public/logo.svg)

---

## ⚡ 1. Core Philosophy & Business Guarantee

Paaaaaaatify is built on an absolute, unwavering principle: **100% Free for Every Feature and Every User.**

- 🚫 **No Premium plans or subscriptions**
- 🚫 **No paywalls or locked features**
- 🚫 **No in-app purchases or upgrade buttons**
- 🚫 **No advertisements or sponsor popups**
- 🚫 **No payment gateways or billing tables**
- ✅ **Every user gets the complete, industry-grade streaming and group listening experience without paying a dime.**

---

## 📱 2. Screen & Feature Architecture (Matching Design Reference)

Paaaaaaatify includes 10 implemented mobile screens inspired by futuristic dark cyberpunk aesthetics with neon green (`#1ED760`), vibrant purple (`#8B5CF6`), and deep space surfaces (`#08090D`, `#12141B`, `#1B1E28`):

1. **Splash Screen (`SplashPage.tsx`)**:
   - Glowing neon green Paaaaaaatify soundwave logo.
   - Tagline: *"Your Music. Your World. Together."*
   - Anime cyberpunk backdrop with animated audio spectrum bars.
   - Live loading status: *"Loading your vibe... 🎵"*.

2. **Authentication Screen (`AuthPage.tsx`)**:
   - Real Google Sign-in integration with Google OpenID Connect token verification.
   - Email registration and login with bcrypt password hashing and JWT access & refresh tokens.
   - Zero-paywall footer guarantee: *"No Premium. No Limits. Just Music. 🎵"*.

3. **Home Dashboard (`HomePage.tsx`)**:
   - Personalized time-aware greeting: *"Good Evening, Tobi! 👋"*, avatar with glowing aura.
   - Interactive search bar with instant autocomplete.
   - Hero Banner: *"Music Brings Us Together 🎵"* with quick group listen action.
   - *"Made for You"* personalized recommendation row (Chill Vibes, Coding Beats, Workout).
   - *"Recently Played"* history carousel.
   - Floating Mini-Player and 5-tab Bottom Navigation.

4. **Full-Screen Music Player (`FullScreenPlayer.tsx`)**:
   - High-fidelity cyberpunk album artwork with purple lightning aura.
   - Top action bar: Song/Queue toggle pill, Cast/Device menu, options.
   - Song metadata, artist credit, and green favorite heart toggle.
   - Precision seekbar with current elapsed and total song duration.
   - Shuffle, Previous, Giant Neon Green Play/Pause button, Next, Repeat.
   - Interactive Lyrics drawer (`LyricsDrawer.tsx`) and Queue drawer (`QueueDrawer.tsx`).

5. **Group Listening Room (`RoomPage.tsx`)**:
   - Authoritative room session with human-readable code (e.g., `PAAAA-8427`).
   - One-click copy and invite button: *"Invite Friends 🚀"*.
   - Live member list with Host Authority badge (👑), participant avatars, and online status.
   - Real-time synchronization badge: *"SYNCHRONIZED (Server Clock Drift: <15ms)"*.
   - Live shared audio equalizer bars and shared queue management.
   - Red outlined *"Leave Room"* button with seamless host transfer.

6. **Search & Discovery (`SearchPage.tsx`)**:
   - Instant search across songs, artists, albums, and genres.
   - Filter pills: *"All"*, *"Songs"*, *"Artists"*, *"Albums"*, *"Playlists"*.
   - *"Trending Now 🔥"* cards (APT. - ROSÉ, Beautiful - Bazzi, Lose Control - Teddy).
   - *"Popular Artists"* circular avatars (The Weeknd, Billie Eilish, Post Malone).

7. **Your Library & Playlist Management (`LibraryPage.tsx`)**:
   - Header with *"Import Local Audio"* (Section 11 User Uploads) and *"+"* new playlist modal.
   - Featured top grid: *"Liked Songs"* (742 songs), *"Chill Vibes"* (128 songs), *"Workout"* (215 songs).
   - *"My Playlists"* section (Study Beats, Gaming Mix, Road Trip).
   - Playlist Detail view (`PlaylistDetailPage.tsx`) with Play All, Shuffle, song duration calculation.

8. **User Profile (`ProfilePage.tsx`)**:
   - Glowing purple ring anime avatar, display name, handle (`@tobi_bro`), bio.
   - Listening statistics: *87 Playlists*, *12.5K Followers*, *243 Following*.
   - Edit Profile dialog (name, bio).
   - Recently played list.
   - Zero subscription badges or payment records.

9. **Settings Screen (`SettingsPage.tsx`)**:
   - User profile preview and management shortcut.
   - Notifications toggle with animated green switch.
   - Data & Storage, Playback settings, Appearance ("Dark").
   - Privacy & Security, Help & Support, About Paaaaaaatify.
   - Lock-screen controls simulator button.
   - Red *"Log Out"* button.

10. **Lock-Screen & Notification Controls (`LockScreenPreview.tsx` & Native MediaSession)**:
    - Android lock screen at `9:41 Sat, Nov 1` with cyberpunk backdrop.
    - Media widget with album thumbnail, title, artist, progress line, and play/pause button.
    - Official Paaaaaaatify soundwave branding.
    - Native `navigator.mediaSession` integration with hardware key and lock-screen hooks!

---

## 📡 3. Real-Time Synchronized Playback Engine

Paaaaaaatify features a custom **Server-Authoritative Real-Time Playback Engine**:

```
[ Host Device ]                  [ FastAPI WebSocket Server ]                [ Participant Device ]
       |                                      |                                         |
       |----- (1) Host taps PLAY ------------>|                                         |
       |                                      |-- (2) Validates host permissions        |
       |                                      |-- (3) Computes t_target = now + 250ms    |
       |                                      |-- (4) Increments sequence number        |
       |<---- (5) Broadcast PLAYBACK_SYNC ----|---------------------------------------->|
       |      (position, t_target, seq)       |                                         |
       |                                      |                                         |
       |-- (6) Schedules local playback       |                                         |-- (6) Schedules local playback
       |       at t_target                    |                                         |       at t_target
       |                                      |                                         |
       |== (7) Both devices start audio synchronously at t_target =====================>|
       |                                      |                                         |
       |                                      |<-- (8) DRIFT_REPORT (client pos, t) ----|
       |                                      |-- (9) Detects drift: skew > 120ms       |
       |                                      |-- (10) DRIFT_CORRECTION --------------->|
       |                                      |                                         |-- (11) Applies micro rate
       |                                      |                                                  adjustment / seek
```

- **Clock Skew Calculation (NTP Algorithm)**:  
  Clients periodically ping the server to calculate round-trip time ($RTT$) and clock offset ($\theta$):
  $$\theta = \frac{(t_1 - t_0) + (t_2 - t_3)}{2}$$
- **Sequence Numbering & Idempotency**: Prevents out-of-order or duplicate playback commands.
- **Micro-Drift Pitch Correction**: Minor drift ($50\text{ms} - 150\text{ms}$) is smoothly corrected by adjusting playback rate ($0.97\times - 1.03\times$) without audible stuttering. Major drift ($>150\text{ms}$) triggers a soft seek.

---

## 🛠️ 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Android Shell** | Capacitor 7, Android Gradle Plugin, Android SDK 35, OpenJDK 21 |
| **Audio Playback** | HTML5 Audio, Web Audio API, Android MediaSession, ExoPlayer bridge |
| **Backend API** | Python 3.14 / 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn |
| **Realtime Sync** | WebSockets (`ws://`), NTP Drift Synchronization |
| **Database** | SQLite (local zero-dependency) / PostgreSQL 16 (production) |
| **Audio Streaming**| RFC 7233 HTTP 206 Partial Content Range Requests |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## 🚀 5. Quickstart & Local Development

### Prerequisites
- Node.js v20+ or v24+
- Python 3.10+ (or Python 3.14)
- (Optional for Android APK): Android SDK & JDK 21

### 1. Run the Backend
```powershell
cd backend
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install email-validator

# Run tests to verify
python -m pytest -v

# Start the server
python run.py
```
> The API will be live at `http://localhost:8000`  
> Interactive OpenAPI documentation: `http://localhost:8000/docs`

### 2. Run the Frontend Web Application
```powershell
cd frontend
npm install
npm run dev
```
> The web interface will be live at `http://localhost:5173`

### 3. Run with Docker Compose
```bash
docker compose up --build
```
> Spins up PostgreSQL, Redis, FastAPI Backend (`:8000`), and Nginx Frontend (`:3000`).

---

## 🤖 6. Android APK Build & Installation

The Android application is built with package identifier `com.paaaaaaatify.app`.

### Build APKs via Gradle:
```powershell
cd frontend
npm run build
npx cap sync android

cd android
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
.\gradlew.bat assembleDebug assembleRelease
```

### Generated APK Output Locations:
- **Installable Debug APK**:
  ```
  frontend/android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **Signed Release APK**:
  ```
  frontend/android/app/build/outputs/apk/release/app-release.apk
  ```

### Install onto Device via ADB:
```powershell
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🧪 7. Automated Test Suite

The test suite covers:
- System health & 100% Free guarantee assertion
- User registration, bcrypt hashing, and JWT token lifecycle
- Music catalog retrieval and search
- Playlist creation, modification, and song ordering
- Group listening room creation, code validation, and host authorization
- Real-time recommendation engine output

Run tests:
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

---

## 📄 8. License

This project is licensed under the MIT License — free for everyone, always.

**Paaaaaaatify — Your Music. Your World. Together.**

