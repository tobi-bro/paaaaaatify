import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Real Google OAuth 2.0 Web Client ID registered in Google Cloud Console
export const GOOGLE_WEB_CLIENT_ID = '691672483080-tnadcremhnfqu9nsos0g3thimhhvvp5d.apps.googleusercontent.com';

let initialized = false;
let isSigningIn = false;

export const getGoogleClientId = (): string => {
  const meta = import.meta as any;
  const envId = meta?.env?.VITE_GOOGLE_CLIENT_ID;
  if (envId && typeof envId === 'string' && envId.trim() && !envId.startsWith('PAAAAAAATIFY_')) {
    return envId.trim();
  }
  return GOOGLE_WEB_CLIENT_ID;
};

export const isGoogleAuthConfigured = (): boolean => {
  return Boolean(getGoogleClientId());
};

export const initGoogleAuth = () => {
  if (initialized) return;
  const clientId = getGoogleClientId();

  try {
    GoogleAuth.initialize({
      clientId: clientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    });
    initialized = true;
  } catch (e) {
    console.warn('GoogleAuth initialization warning:', e);
  }
};

export const signInWithGoogleToken = async (): Promise<string> => {
  if (isSigningIn) {
    throw new Error('Google Sign-In is already in progress.');
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is missing. Please check your configuration.');
  }

  isSigningIn = true;
  initGoogleAuth();

  try {
    const response = await GoogleAuth.signIn();
    // Retrieve ID Token from GoogleAuth response
    const idToken = response.authentication?.idToken || (response as any).idToken;
    if (!idToken) {
      throw new Error('Google Sign-In completed, but no ID Token was provided by Google Play Services.');
    }
    return idToken;
  } catch (error: any) {
    console.error('Google Sign-In Error details:', error);
    const msg = String(error?.message || error?.error || error || '');

    // User canceled
    if (
      msg.includes('popup_closed') ||
      msg.includes('canceled') ||
      msg.includes('12501') ||
      msg.includes('The user canceled')
    ) {
      throw new Error('Google Sign-In was canceled.');
    }

    // Developer / Fingerprint error 10
    if (msg.includes('10') || msg.includes('DEVELOPER_ERROR')) {
      throw new Error(
        'Google OAuth Error 10 (DEVELOPER_ERROR): Verify that your Google Cloud Console has an Android OAuth Client with package "com.paaaaaaatify.app" and your signing SHA-1 fingerprint.'
      );
    }

    // Network error 7
    if (msg.includes('7') || msg.includes('NETWORK_ERROR')) {
      throw new Error('Network error contacting Google Sign-In servers. Please check your internet connection.');
    }

    // Sign in failed 12500
    if (msg.includes('12500')) {
      throw new Error(
        'Google Sign-In failed (12500). Please verify Google Cloud OAuth Consent Screen configuration and test user access.'
      );
    }

    throw new Error(msg || 'Google Sign-In failed. Please verify your Google account and internet connection.');
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    await GoogleAuth.signOut();
  } catch (e) {
    // Ignore sign out errors if user wasn't signed in via Google SDK
  }
};
