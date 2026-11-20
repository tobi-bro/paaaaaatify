// Test suite for Paaaaaatify API Configuration, Validation & WebSocket derivation
import assert from 'node:assert';

function createApiValidator(isProd) {
  return function validateApiUrl(rawUrl) {
    if (!rawUrl || !rawUrl.trim()) {
      return { valid: false, error: 'API URL cannot be empty.' };
    }

    const trimmed = rawUrl.trim();
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format. Please include protocol (e.g. https://...).'
      };
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        error: 'Protocol must be https:// (or http:// in local development).'
      };
    }

    const isPrivateOrLoopback =
      /^(localhost|\[?::1\]?|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|.*\.local)$/i.test(
        parsed.hostname
      );

    if (isProd) {
      if (parsed.protocol === 'http:') {
        return {
          valid: false,
          error: 'Production builds require secure HTTPS. Cleartext HTTP is blocked in release.'
        };
      }
      if (isPrivateOrLoopback) {
        return {
          valid: false,
          error: 'Localhost, emulator, and private network addresses are not permitted in production release builds.'
        };
      }
    }

    let pathname = parsed.pathname.replace(/\/+$/, '');
    pathname = pathname.replace(/(?:\/api(?:\/v1)?)+$/i, '');
    pathname = `${pathname}/api/v1`;

    const normalized = `${parsed.protocol}//${parsed.host}${pathname}`;
    return { valid: true, normalized };
  };
}

function createUrlResolver({ isNative, isProd, isDev, customUrl, envUrl, webOrigin, webHostname }) {
  const validator = createApiValidator(isProd);

  // 1. User-configured custom URL
  if (customUrl && customUrl.trim()) {
    const v = validator(customUrl.trim());
    if (v.valid) return v.normalized;
  }

  // 2. VITE_API_URL
  if (envUrl && envUrl.trim()) {
    const v = validator(envUrl.trim());
    if (v.valid) return v.normalized;
  }

  // 3. Native Android
  if (isNative) {
    if (isDev) return 'http://10.0.2.2:8000/api/v1';
    return ''; // Release Android unconfigured
  }

  // 4. Web browser
  if (webOrigin) {
    const isLocalWeb = webHostname === 'localhost' || webHostname === '127.0.0.1';
    if (isDev && isLocalWeb) return 'http://localhost:8000/api/v1';
    if (
      webOrigin &&
      !webOrigin.includes('capacitor://') &&
      !webOrigin.includes('http://localhost') &&
      !webOrigin.startsWith('file:') &&
      !isLocalWeb
    ) {
      return `${webOrigin}/api/v1`;
    }
  }

  return '';
}

function deriveWsUrl(apiBase, isDev) {
  if (!apiBase) return '';
  const rootUrl = apiBase.replace(/\/api\/v1\/?$/, '');
  if (rootUrl.startsWith('https://')) {
    return rootUrl.replace(/^https:\/\//i, 'wss://');
  }
  if (isDev && rootUrl.startsWith('http://')) {
    return rootUrl.replace(/^http:\/\//i, 'ws://');
  }
  return '';
}

console.log('--- Running Paaaaaatify API Configuration Audit Tests ---');

const validateProd = createApiValidator(true);
const validateDev = createApiValidator(false);

// Test 1: Valid HTTPS URL
{
  const res = validateProd('https://backend.example.com');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, 'https://backend.example.com/api/v1');
  console.log('✓ Test 1 Passed: Valid HTTPS URL normalized correctly');
}

// Test 2: Invalid URL
{
  const res = validateProd('not-a-valid-url');
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /Invalid URL format/i);
  console.log('✓ Test 2 Passed: Invalid URL format rejected');
}

// Test 3: Empty URL
{
  const res1 = validateProd('');
  assert.strictEqual(res1.valid, false);
  assert.match(res1.error, /cannot be empty/i);

  const res2 = validateProd('   ');
  assert.strictEqual(res2.valid, false);
  assert.match(res2.error, /cannot be empty/i);
  console.log('✓ Test 3 Passed: Empty / whitespace URLs rejected');
}

// Test 4: Localhost in release
{
  const res = validateProd('http://localhost:8000');
  assert.strictEqual(res.valid, false);
  console.log('✓ Test 4 Passed: Localhost blocked in release mode');
}

// Test 5: 127.0.0.1 in release
{
  const res = validateProd('http://127.0.0.1:8000');
  assert.strictEqual(res.valid, false);
  console.log('✓ Test 5 Passed: 127.0.0.1 blocked in release mode');
}

// Test 6: 10.x.x.x (including 10.0.2.2 emulator alias) in release
{
  const resEmulator = validateProd('http://10.0.2.2:8000');
  assert.strictEqual(resEmulator.valid, false);
  const resSubnet = validateProd('https://10.1.2.3:8000');
  assert.strictEqual(resSubnet.valid, false);
  console.log('✓ Test 6 Passed: 10.x.x.x / 10.0.2.2 blocked in release mode');
}

// Test 7: 192.168.x.x in release
{
  const res = validateProd('http://192.168.1.100:8000');
  assert.strictEqual(res.valid, false);
  const resHttps = validateProd('https://192.168.1.100:8000');
  assert.strictEqual(resHttps.valid, false);
  console.log('✓ Test 7 Passed: 192.168.x.x LAN addresses blocked in release mode');
}

// Test 8: HTTP cleartext URL in release
{
  const res = validateProd('http://api.production-server.com/api/v1');
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /require secure HTTPS/i);
  console.log('✓ Test 8 Passed: Cleartext HTTP rejected in release mode');
}

// Test 9: Duplicate /api/v1 paths
{
  const resDuplicate = validateProd('https://example.com/api/v1/api/v1');
  assert.strictEqual(resDuplicate.valid, true);
  assert.strictEqual(resDuplicate.normalized, 'https://example.com/api/v1');

  const resTriple = validateProd('https://example.com/api/v1/api/v1/api/v1');
  assert.strictEqual(resTriple.valid, true);
  assert.strictEqual(resTriple.normalized, 'https://example.com/api/v1');

  const resSubpath = validateProd('https://example.com/custom/api/v1/api/v1');
  assert.strictEqual(resSubpath.valid, true);
  assert.strictEqual(resSubpath.normalized, 'https://example.com/custom/api/v1');
  console.log('✓ Test 9 Passed: Duplicate /api/v1 paths collapsed to canonical /api/v1');
}

// Test 10: Trailing slash handling
{
  const resSlash = validateProd('https://example.com/api/v1/');
  assert.strictEqual(resSlash.valid, true);
  assert.strictEqual(resSlash.normalized, 'https://example.com/api/v1');

  const resRootSlash = validateProd('https://example.com/');
  assert.strictEqual(resRootSlash.valid, true);
  assert.strictEqual(resRootSlash.normalized, 'https://example.com/api/v1');
  console.log('✓ Test 10 Passed: Trailing slashes normalized');
}

// Test 11: Native Android Release Mode Resolution (Unconfigured State)
{
  const resolved = createUrlResolver({
    isNative: true,
    isProd: true,
    isDev: false,
    customUrl: '',
    envUrl: '',
    webOrigin: 'http://localhost', // WebView origin
    webHostname: 'localhost'
  });
  assert.strictEqual(resolved, '');
  console.log('✓ Test 11 Passed: Native Android release returns explicit unconfigured state ("") without using WebView origin');
}

// Test 12: Native Android Debug Mode Resolution
{
  const resolved = createUrlResolver({
    isNative: true,
    isProd: false,
    isDev: true,
    customUrl: '',
    envUrl: '',
    webOrigin: 'http://localhost',
    webHostname: 'localhost'
  });
  assert.strictEqual(resolved, 'http://10.0.2.2:8000/api/v1');
  console.log('✓ Test 12 Passed: Native Android debug returns 10.0.2.2 emulator alias only in DEV');
}

// Test 13: User-Configured HTTPS URL Priority in Android Release
{
  const resolved = createUrlResolver({
    isNative: true,
    isProd: true,
    isDev: false,
    customUrl: 'https://my-live-server.com',
    envUrl: '',
    webOrigin: 'http://localhost',
    webHostname: 'localhost'
  });
  assert.strictEqual(resolved, 'https://my-live-server.com/api/v1');
  console.log('✓ Test 13 Passed: User-configured HTTPS backend takes priority on native Android');
}

// Test 14: VITE_API_URL Priority in Android Release
{
  const resolved = createUrlResolver({
    isNative: true,
    isProd: true,
    isDev: false,
    customUrl: '',
    envUrl: 'https://prod-api.cloudprovider.com/api/v1',
    webOrigin: 'http://localhost',
    webHostname: 'localhost'
  });
  assert.strictEqual(resolved, 'https://prod-api.cloudprovider.com/api/v1');
  console.log('✓ Test 14 Passed: VITE_API_URL configured takes priority when set');
}

// Test 15: WebSocket URL Derivation
{
  // HTTPS -> WSS in Prod & Dev
  const wsProd = deriveWsUrl('https://my-backend.com/api/v1', false);
  assert.strictEqual(wsProd, 'wss://my-backend.com');

  // HTTP -> WS allowed ONLY in DEV
  const wsDevHttp = deriveWsUrl('http://localhost:8000/api/v1', true);
  assert.strictEqual(wsDevHttp, 'ws://localhost:8000');

  // HTTP -> WS blocked in PROD (returns "")
  const wsProdHttp = deriveWsUrl('http://insecure.com/api/v1', false);
  assert.strictEqual(wsProdHttp, '');

  // Missing / empty API base returns ""
  const wsEmpty = deriveWsUrl('', false);
  assert.strictEqual(wsEmpty, '');
  console.log('✓ Test 15 Passed: WebSocket converts HTTPS to WSS, HTTP to WS only in DEV, empty when unconfigured');
}

console.log('--- ALL 15 API CONFIGURATION TESTS PASSED SUCCESSFULLY ---');

