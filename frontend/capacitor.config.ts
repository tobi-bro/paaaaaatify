import { CapacitorConfig } from '@capacitor/cli';
import { loadEnv } from 'vite';

// Load environment variables from frontend or root .env files
const mode = process.env.NODE_ENV || 'development';
const env = loadEnv(mode, process.cwd(), '');
const isProd = mode === 'production';
const googleClientId = env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '691672483080-tnadcremhnfqu9nsos0g3thimhhvvp5d.apps.googleusercontent.com';

const config: CapacitorConfig = {
  appId: 'com.paaaaaaatify.app',
  appName: 'Paaaaaaatify',
  webDir: 'dist',
  backgroundColor: '#08090D',
  server: {
    androidScheme: 'https',
    cleartext: !isProd
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#08090D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false
      }
    }
  }
};

export default config;
