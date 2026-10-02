/**
 * Precise Location & Device Metadata Service
 * Captures real, authentic device details and precise geographic coordinates
 * via Browser Geolocation API (GPS / Wi-Fi) with IP Geolocation fallback.
 * NO HARDCODED OR FAKE LOCATIONS.
 */

const STORAGE_KEY_LOCATION = 'nodues_precise_location';
const STORAGE_KEY_COORDS = 'nodues_precise_coords';
const STORAGE_KEY_TIMESTAMP = 'nodues_location_timestamp';
const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

let isDetecting = false;

/**
 * Returns currently known precise location from cache, or timezone fallback.
 */
export function getPreciseLocation() {
  if (typeof window === 'undefined') {
    return 'Web Client (Node Environment)';
  }

  const cached = localStorage.getItem(STORAGE_KEY_LOCATION);
  if (cached && cached.trim()) {
    return cached.trim();
  }

  // Fast timezone-based realistic fallback while detection completes
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz) {
      const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
      return `${city} Region (${tz})`;
    }
  } catch (e) {
    // fallback
  }

  return 'Detecting precise location...';
}

/**
 * High-accuracy reverse geocode using free client reverse geocoding API
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const parts = [
        data.locality,
        data.city,
        data.principalSubdivision,
        data.countryName
      ].filter(Boolean);

      const uniqueParts = Array.from(new Set(parts));
      if (uniqueParts.length > 0) {
        return `${uniqueParts.join(', ')} (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`;
      }
    }
  } catch (err) {
    console.warn('Reverse geocode error, using exact coordinates:', err.message);
  }

  // Direct precision coordinates fallback
  return `Coordinates: ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`;
}

/**
 * Fast IP-based real location fallback
 */
async function fetchIPLocation() {
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.city) {
        const parts = [data.city, data.region, data.country].filter(Boolean);
        const lat = data.latitude ? `${data.latitude.toFixed(4)}° N` : '';
        const lon = data.longitude ? `${data.longitude.toFixed(4)}° E` : '';
        const coords = lat && lon ? ` (${lat}, ${lon})` : '';
        return `${parts.join(', ')}${coords}`;
      }
    }
  } catch (err) {
    console.warn('IP location fetch error:', err.message);
  }
  return null;
}

/**
 * Initiates precise location detection via GPS and IP
 */
export function initLocationDetection() {
  if (typeof window === 'undefined' || isDetecting) return;

  const cachedTime = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
  const now = Date.now();
  if (cachedTime && now - parseInt(cachedTime, 10) < CACHE_MAX_AGE_MS) {
    const existing = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (existing && existing !== 'Detecting precise location...') {
      return; // Cache is still fresh
    }
  }

  isDetecting = true;

  // 1. Trigger fast IP location immediately as baseline
  fetchIPLocation().then((ipLoc) => {
    if (ipLoc && !localStorage.getItem(STORAGE_KEY_COORDS)) {
      localStorage.setItem(STORAGE_KEY_LOCATION, ipLoc);
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
      window.dispatchEvent(new CustomEvent('nodues:location_updated', { detail: { location: ipLoc } }));
    }
  }).catch(() => {});

  // 2. Request high-accuracy GPS coordinates from device hardware
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        isDetecting = false;
        const { latitude, longitude, accuracy } = pos.coords;
        localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify({ latitude, longitude, accuracy }));

        const preciseText = await reverseGeocode(latitude, longitude);
        localStorage.setItem(STORAGE_KEY_LOCATION, preciseText);
        localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());

        window.dispatchEvent(new CustomEvent('nodues:location_updated', { 
          detail: { location: preciseText, coords: { latitude, longitude, accuracy } } 
        }));
      },
      async (err) => {
        isDetecting = false;
        console.info('Hardware GPS unavailable or permission denied, using IP geolocation:', err.message);
        const ipLoc = await fetchIPLocation();
        if (ipLoc) {
          localStorage.setItem(STORAGE_KEY_LOCATION, ipLoc);
          localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
          window.dispatchEvent(new CustomEvent('nodues:location_updated', { detail: { location: ipLoc } }));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  } else {
    isDetecting = false;
  }
}

/**
 * Returns accurate client device name, type, and real precise location
 */
export function getClientDeviceMetadata() {
  if (typeof window === 'undefined') {
    return {
      deviceName: 'Web Client',
      deviceType: 'Desktop',
      location: 'Localhost (Node Environment)'
    };
  }

  const ua = navigator.userAgent || '';
  const screenW = window.screen?.width || window.innerWidth || 1024;

  // 1. Device Type Detection
  let deviceType = 'Desktop';
  if (/ipad|tablet/i.test(ua) || (screenW >= 768 && screenW <= 1024 && /mobile/i.test(ua))) {
    deviceType = 'Tablet';
  } else if (/iphone|android.*mobile|mobile|ipod/i.test(ua) || screenW < 768) {
    deviceType = 'Mobile';
  }

  // 2. OS Detection
  let os = 'Windows PC';
  if (/iphone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/ipad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/android/i.test(ua)) os = 'Android Device';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 3. Browser Detection
  let browser = 'Chrome';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  const deviceName = `${os} (${browser})`;
  const location = getPreciseLocation();

  return { deviceName, deviceType, location };
}

// Automatically start location resolution on load in browser
if (typeof window !== 'undefined') {
  initLocationDetection();
}

export default {
  getPreciseLocation,
  initLocationDetection,
  getClientDeviceMetadata
};
