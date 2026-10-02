const { query } = require('../config/db');

function safeDecode(val) {
  if (!val || typeof val !== 'string') return '';
  try {
    return decodeURIComponent(val);
  } catch (e) {
    return val;
  }
}

/**
 * Extracts and formats device name and device type from User-Agent and client headers
 */
function parseDeviceDetails(req) {
  // If client provided explicit headers or body
  const clientDeviceType = req.headers['x-device-type'] || req.body?.deviceType;
  const clientDeviceName = safeDecode(req.headers['x-device-name']) || req.body?.deviceName;

  const userAgent = req.headers['user-agent'] || '';

  let deviceType = clientDeviceType || 'Desktop';
  let osName = 'Windows';
  let browserName = 'Chrome';

  // Detect OS
  if (/windows/i.test(userAgent)) {
    osName = 'Windows 11/10';
  } else if (/iphone/i.test(userAgent)) {
    osName = 'iOS (iPhone)';
    deviceType = 'Mobile';
  } else if (/ipad/i.test(userAgent)) {
    osName = 'iPadOS (iPad)';
    deviceType = 'Tablet';
  } else if (/android/i.test(userAgent)) {
    osName = 'Android';
    deviceType = /mobile/i.test(userAgent) ? 'Mobile' : 'Tablet';
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    osName = 'macOS';
    deviceType = 'Desktop';
  } else if (/linux/i.test(userAgent)) {
    osName = 'Linux';
    deviceType = 'Desktop';
  }

  // Detect Browser
  if (/edg/i.test(userAgent)) {
    browserName = 'Edge';
  } else if (/chrome|crios/i.test(userAgent)) {
    browserName = 'Chrome';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browserName = 'Safari';
  } else if (/firefox|fxios/i.test(userAgent)) {
    browserName = 'Firefox';
  } else if (/electron/i.test(userAgent)) {
    browserName = 'Desktop App (Electron)';
  }

  const deviceName = clientDeviceName || `${osName} (${browserName})`;

  return {
    deviceName,
    deviceType: clientDeviceType || deviceType
  };
}

let cachedServerGeo = null;
let lastGeoFetch = 0;

/**
 * Resolves location from client headers, body, or real IP lookup
 */
async function parseLocation(req) {
  const clientLocation = safeDecode(req.headers['x-client-location']) || req.body?.location;
  if (clientLocation && typeof clientLocation === 'string' && clientLocation.trim() && !clientLocation.includes('Detecting')) {
    return clientLocation.trim();
  }

  // Check cached server public IP geolocation
  if (cachedServerGeo && Date.now() - lastGeoFetch < 3600000) {
    return cachedServerGeo;
  }

  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const d = await res.json();
      if (d.success !== false && d.city) {
        cachedServerGeo = `${d.city}, ${d.region}, ${d.country} (${d.latitude?.toFixed(4)}° N, ${d.longitude?.toFixed(4)}° E)`;
        lastGeoFetch = Date.now();
        return cachedServerGeo;
      }
    }
  } catch (err) {
    // fallback
  }

  return 'Chennai, Tamil Nadu, India';
}

/**
 * Logs a system audit event with device name, device type, and location
 */
async function logAuditEvent({
  req,
  user = null,
  action,
  details = '',
  module = 'General'
}) {
  try {
    const actorUser = user || req?.user || {
      id: null,
      username: 'SYSTEM',
      full_name: 'System Engine',
      role: 'system'
    };

    const { deviceName, deviceType } = req ? parseDeviceDetails(req) : { deviceName: 'Server Engine', deviceType: 'Server' };
    const location = req ? (await parseLocation(req)) : 'Server System Engine';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1') : '127.0.0.1';

    const userId = actorUser.id || actorUser.user_id || null;
    const username = actorUser.username || actorUser.register_number || 'UNKNOWN';
    const fullName = actorUser.full_name || actorUser.name || username;
    const role = actorUser.role || 'user';

    const sql = `
      INSERT INTO system_audit_logs 
      (user_id, username, full_name, role, action, details, module, device_name, device_type, location, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await query(sql, [
      userId,
      username,
      fullName,
      role,
      action,
      details,
      module,
      deviceName,
      deviceType,
      location,
      ipAddress
    ]);

    // Optional SSE broadcast for real-time audit log updates
    try {
      const { broadcastSSE } = require('./sse');
      if (broadcastSSE) {
        broadcastSSE({
          type: 'audit_log_event',
          log: {
            username,
            full_name: fullName,
            role,
            action,
            details,
            module,
            device_name: deviceName,
            device_type: deviceType,
            location,
            created_at: new Date().toISOString()
          }
        });
      }
    } catch (sseErr) {
      // Ignore SSE broadcast error
    }

  } catch (err) {
    console.error('Error logging audit event:', err.message);
  }
}

module.exports = {
  parseDeviceDetails,
  parseLocation,
  logAuditEvent
};
