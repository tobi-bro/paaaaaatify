# Paaaaaaatify — Android Build & Installation Guide

Package Name: `com.paaaaaaatify.app`  
Application Name: `Paaaaaaatify`

---

## 1. Prerequisites

- **Java JDK**: Eclipse Adoptium OpenJDK 21 (LTS) or JDK 17
- **Android SDK**: Android API 34 / 35 (Platforms and Build-Tools)
- **Node.js**: v20+ or v24+
- **Gradle**: 8.11.1 (bundled in `gradlew`)

---

## 2. Fast Build Instructions

### Step 1: Build Web Distribution
```powershell
cd frontend
npm install
npm run build
npx cap sync android
```

### Step 2: Build Native Android APKs
```powershell
cd android
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
.\gradlew.bat assembleDebug assembleRelease
```

---

## 3. APK File Output Locations

Upon compilation completion, the APK files are generated at:

- **Debug APK**:
  ```
  frontend/android/app/build/outputs/apk/debug/app-debug.apk
  ```
- **Signed Release APK**:
  ```
  frontend/android/app/build/outputs/apk/release/app-release.apk
  ```

---

## 4. Installation & Verification

### Install on Connected Device or Emulator via ADB:
```powershell
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Sideloading on Physical Android Device:
1. Transfer `app-debug.apk` or `app-release.apk` to your phone via USB, Google Drive, or local HTTP server.
2. Open the file on your device using a file manager.
3. Allow "Install unknown apps" if prompted.
4. Launch **Paaaaaaatify**.
5. Experience 100% free music streaming, real-time group listening, and background lock-screen audio playback!

