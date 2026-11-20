# PAAAAAAATIFY — RELEASE NOTES (v1.0.0-production)

## Application Summary
- **App Name**: PAAAAAAATIFY
- **Tagline**: Your Music. Your World. Together.
- **Package ID**: `com.paaaaaaatify.app`
- **Release Version**: `1.0.0`
- **Build Date**: November 19, 2026
- **Architecture**: React 18 + TypeScript + Vite 6 + Capacitor 7 + FastAPI + PostgreSQL / SQLite

---

## 1. Release APK Binary Details

- **Release APK Path**: `frontend/android/app/build/outputs/apk/release/app-release.apk`
- **File Size**: `3,687,194 bytes` (approx. 3.52 MB)
- **SHA-256 Checksum**:
  ```
  DA056621F8012F0F55ADB5990D930B8CC225E63838C35DE889C4C1917CECB138
  ```
- **Signing Keystore**: `frontend/android/app/paaaaaatify-release-key.jks`
- **Key Alias**: `paaaaaatify`
- **Signature Schemes**: v1 (JAR Signature) + v2 (APK Signature Scheme v2) Verified
- **Certificate SHA-1 Fingerprint**:
  ```
  6A:86:2F:7C:53:98:0B:06:49:0B:7D:A4:56:5C:F6:4C:AA:A4:91:96
  ```

---

## 2. Key Features & Capabilities

### Synchronized Group Listening Rooms
- Real-time room creation with 6-character room codes.
- High-precision NTP ping-pong clock synchronization (`offsetMs`, `rttMs`, `clockSkewMs`).
- Drift detection and compensation with 250ms lead-time server buffer for jitter-free multi-device synchronization.
- Resilient WebSocket connection with automatic exponential backoff reconnection and state reconciliation upon wake/reconnect.

### Core Music Experience (100% Free & Open)
- No premium tier, no paywalls, and no subscription gates.
- Unified search, genre browsing, personal playlists, favorites, and recommendations.
- Streaming audio with support for MP3, WAV, OGG, and M4A/AAC.
- Safe media URL resolution ensuring native Android WebViews play uploaded tracks seamlessly.

### Native Android Quality of Life
- **Lock-Screen & Notification Media Controls**: Full `navigator.mediaSession` integration with Play, Pause, Previous, Next, and Seek action handlers.
- **Hardware Back Button Handling**: Native `@capacitor/app` integration that walks backwards through open lyrics, fullscreen players, modals, and tab history before cleanly exiting.
- **Network Security Profiles**: Separate debug (local cleartext enabled for emulator) and release (strict HTTPS/WSS enforcement) manifests.

---

## 3. Security Enhancements

1. **Google OAuth 2.0 Verification**:
   - Web Client ID: `691672483080-tnadcremhnfqu9nsos0g3thimhhvvp5d.apps.googleusercontent.com`
   - Android Client ID: `691672483080-6mi5limad0a0tmqrl7vnehvgjmhtu56i.apps.googleusercontent.com`
   - Backend zero-trust token signature verification against Google JWKS certs with RS256 cryptography.
2. **Brute Force & DoS Shield**:
   - In-memory sliding-window rate limiter (25 requests/min on auth routes; 240 requests/min general).
3. **Upload Security**:
   - Magic byte header inspection and chunked 64KB streaming capped at 50MB.
4. **Credential Isolation**:
   - Complete removal of demo bypasses and static passwords.
   - Zero development IPs or invented domains compiled into release assets.

---

## 4. Connecting the App to Your Live Backend

When launching `app-release.apk` on a physical phone:
1. **First Launch**: Since no live backend URL has been pre-baked into the binary (to prevent hardcoding nonexistent domains), the application displays a connection dialog:
   ```
   "Backend Server Not Configured"
   ```
2. **Connecting to Your Backend**:
   - Tap **"Configure Server"** or navigate to **Settings -> Server Connection**.
   - Enter your live production backend URL (e.g. `https://your-paaaaaatify-backend.onrender.com/api/v1`).
   - Tap **"Save & Connect"**. The app immediately verifies the URL, stores it securely in persistent local storage, and initializes all API and WebSocket services.
3. **Permanent Build Configuration (Optional)**:
   - When your backend domain is live, set `VITE_API_URL=https://<your-domain>/api/v1` in `frontend/.env.production` and run:
     ```powershell
     cd frontend; npm run build; npx cap sync android; cd android; .\gradlew.bat assembleRelease
     ```
