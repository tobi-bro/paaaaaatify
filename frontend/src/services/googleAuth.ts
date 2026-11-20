import { SocialLogin, type GoogleLoginResponseOnline } from '@capgo/capacitor-social-login';

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

export const initGoogleAuth = async (): Promise<void> => {
  if (initialized) return;
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is missing. Please check your configuration.');
  }

  try {
    await SocialLogin.initialize({
      google: {
        webClientId: clientId,
        mode: 'online',
      },
    });
    initialized = true;
  } catch (e: any) {
    console.error('SocialLogin initialization error:', e);
    throw new Error(e?.message || 'Failed to initialize Google Sign-In SDK.');
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
  try {
    await initGoogleAuth();

    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['profile', 'email'],
      },
    }) as { provider: 'google'; result: GoogleLoginResponseOnline };

    const idToken = response.result.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In completed, but no ID Token was provided.');
    }
    return idToken;
  } catch (error: any) {
    console.error('Google Sign-In Error details:', error);
    const msg = String(error?.message || error?.error || error || '');

    // User canceled
    if (
      msg.includes('popup_closed') ||
      msg.includes('canceled') ||
      msg.includes('cancelled') ||
      msg.includes('12501') ||
      msg.includes('The user canceled') ||
      msg.includes('User cancelled')
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
    await SocialLogin.logout({ provider: 'google' });
  } catch (e) {
    // Ignore sign out errors if user wasn't signed in via Google SDK
  }
};
