# Paaaaaaatify — Google OAuth 2.0 & OpenID Connect Setup Guide

Paaaaaaatify integrates genuine Google Sign-In with server-side token verification (OpenID Connect / Google TokenInfo). Follow these steps to configure your own Google OAuth credentials.

---

## 1. Google Cloud Console Configuration

1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **Paaaaaaatify**.
3. Navigate to **APIs & Services** > **OAuth consent screen**.
4. Select **External** user type and click **Create**.
5. Fill in the App details:
   - **App name**: `Paaaaaaatify`
   - **User support email**: your email
   - **Developer contact information**: your email
6. In **Scopes**, add:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`

---

## 2. Create Credentials

### A. Web Application Client ID (For Web and Backend Verification)
1. Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Select **Application type**: `Web application`.
3. Set **Name**: `Paaaaaaatify Web Client`.
4. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - `http://10.0.2.2:8000`
5. Authorized redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:8000/api/v1/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**.

### B. Android Client ID (For Native Android APK)
1. In Credentials, click **Create Credentials** > **OAuth client ID**.
2. Select **Application type**: `Android`.
3. Set **Package name**:
   ```
   com.paaaaaaatify.app
   ```
4. Retrieve your **SHA-1 Fingerprint**:
   - For Debug Keystore (Windows):
     ```powershell
     keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
     ```
   - For Release Keystore (`paaaaaatify-release-key.jks`):
     ```powershell
     keytool -list -v -keystore "frontend\android\app\paaaaaatify-release-key.jks" -alias paaaaaatify -storepass paaaaaatify2026
     ```
5. Copy the certificate SHA-1 into the Google Cloud Console field.
6. Click **Create**.

---

## 3. Backend & Frontend Environment Configuration

In `backend/.env`:
```env
GOOGLE_CLIENT_ID="your-google-web-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

In `frontend/src/pages/AuthPage.tsx`:
Insert your `GOOGLE_CLIENT_ID` into the Google Sign-in component.

---

## 4. Verification Workflow

1. The client retrieves an OpenID `id_token` from Google Identity Services.
2. The client POSTs `{ "credential": "<id_token>" }` to `POST /api/v1/auth/google`.
3. The FastAPI backend verifies the signature and issuer with Google's public keys (`https://oauth2.googleapis.com/tokeninfo`).
4. If valid, the user account is created or linked, and a Paaaaaaatify JWT session is returned.

