/**
 * Privacy-Preserving Device & Location Service (DPDP Act 2023 Compliant)
 * 
 * Rules:
 * 1. Default auditing relies solely on IP + User-Agent.
 * 2. GPS is strictly OPT-IN with explicit consent and a stated purpose.
 * 3. One-click revocation supported anytime.
 * 4. When GPS is enabled by consent, coordinates are coarse-rounded to 2 decimal places (~1.1km radius)
 *    to prevent tracking of precise residential locations.
 * 5. ZERO third-party network leaking (no BigDataCloud, no ipwho.is, no external APIs).
 */

const STORAGE_KEY_LOCATION = 'nodues_precise_location';
const STORAGE_KEY_CONSENT = 'nodues_gps_consent';

export function hasLocationConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_CONSENT) === 'true';
}

export function setLocationConsent(granted) {
  if (typeof window === 'undefined') return;
  if (granted) {
    localStorage.setItem(STORAGE_KEY_CONSENT, 'true');
    initLocationDetection(true);
  } else {
    localStorage.removeItem(STORAGE_KEY_CONSENT);
    localStorage.removeItem(STORAGE_KEY_LOCATION);
    window.dispatchEvent(new CustomEvent('nodues:location_updated', { detail: { location: 'Location tracking disabled (IP only)' } }));
  }
}

export function revokeLocationConsent() {
  setLocationConsent(false);
}

/**
 * Returns currently known coarse location or offline timezone default
 */
export function getPreciseLocation() {
  if (typeof window === 'undefined') {
    return 'Institutional Client (Standard)';
  }

  if (!hasLocationConsent()) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      return `Offline Locale (${tz})`;
    } catch (e) {
      return 'Institutional Client (IP Audited)';
    }
  }

  const cached = localStorage.getItem(STORAGE_KEY_LOCATION);
  if (cached && cached.trim()) {
    return cached.trim();
  }

  return 'Coarse Location (Consent Enabled)';
}

/**
 * Initiates coarse location detection only if user has explicitly opted in
 */
export function initLocationDetection(force = false) {
  if (typeof window === 'undefined') return;

  if (!hasLocationConsent() && !force) {
    return;
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // DPDP Act 2023: Round coordinates to ~2 decimal places (~1.1km coarse accuracy)
        const coarseLat = Number(pos.coords.latitude.toFixed(2));
        const coarseLon = Number(pos.coords.longitude.toFixed(2));
        const locationText = `Coarse Coordinates: ${coarseLat}° N, ${coarseLon}° E (~1km)`;

        localStorage.setItem(STORAGE_KEY_LOCATION, locationText);
        window.dispatchEvent(new CustomEvent('nodues:location_updated', { 
          detail: { location: locationText, coords: { latitude: coarseLat, longitude: coarseLon } } 
        }));
      },
      () => {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
          localStorage.setItem(STORAGE_KEY_LOCATION, `Offline Locale (${tz})`);
        } catch (e) {
          localStorage.setItem(STORAGE_KEY_LOCATION, 'Institutional Client');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  }
}

export function getDeviceDetails() {
  if (typeof window === 'undefined') {
    return { deviceName: 'Institutional Client', deviceType: 'Desktop' };
  }

  const ua = navigator.userAgent;
  let deviceType = 'Desktop';
  let osName = 'Windows';
  let browser = 'Browser';

  if (/mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet';

  if (/windows/i.test(ua)) osName = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) osName = 'macOS';
  else if (/android/i.test(ua)) osName = 'Android';
  else if (/iphone|ipad/i.test(ua)) osName = 'iOS';
  else if (/linux/i.test(ua)) osName = 'Linux';

  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';

  return {
    deviceName: `${osName} (${browser})`,
    deviceType
  };
}

export function getClientDeviceMetadata() {
  const dev = getDeviceDetails();
  return {
    deviceName: dev.deviceName,
    deviceType: dev.deviceType,
    location: getPreciseLocation()
  };
}
