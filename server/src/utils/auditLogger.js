const { appendSystemAuditLog } = require('./auditChain');
const { broadcastSSE } = require('./sse');

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
  const clientDeviceType = req.headers['x-device-type'] || req.body?.deviceType;
  const clientDeviceName = safeDecode(req.headers['x-device-name']) || req.body?.deviceName;
  const userAgent = req.headers['user-agent'] || '';

  let deviceType = clientDeviceType || 'Desktop';
  let osName = 'Windows';
  let browserName = 'Chrome';

  // Detect OS
  if (/windows/i.test(userAgent)) {
    osName = 'Windows';
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

/**
 * Resolves location without third-party external network leaking (DPDP Act 2023)
 * If client provides GPS coordinates, they are sanitized to ~2 decimals (~1.1km coarse accuracy)
 */
function parseLocation(req) {
  const clientLocation = safeDecode(req.headers['x-client-location']) || req.body?.location;
  if (clientLocation && typeof clientLocation === 'string' && clientLocation.trim() && !clientLocation.includes('Detecting')) {
    let cleanLoc = clientLocation.trim();
    // Coarsen any raw floating point coordinates to 2 decimal places to protect exact residential location
    cleanLoc = cleanLoc.replace(/(-?\d+\.\d{3,})/g, (match) => {
      const num = parseFloat(match);
      return isNaN(num) ? match : num.toFixed(2);
    });
    return cleanLoc;
  }

  // Offline default based on local IP or institution subnet
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.')) {
    return 'SVCE Campus Intranet / Localhost';
  }

  return 'Authorized Institutional Network';
}

/**
 * Logs a system audit event with hash chaining, device name, device type, and location
 */
async function logAuditEvent({
  req,
  user = null,
  action,
  details = '',
  module = 'General',
  connection = null
}) {
  try {
    const actorUser = user || req?.user || {
      id: null,
      username: 'SYSTEM',
      full_name: 'System Engine',
      role: 'system'
    };

    const { deviceName, deviceType } = req ? parseDeviceDetails(req) : { deviceName: 'Server Engine', deviceType: 'Server' };
    const location = req ? parseLocation(req) : 'Server System Engine';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1') : '127.0.0.1';

    const userId = actorUser.id || actorUser.user_id || null;
    const username = actorUser.username || actorUser.register_number || 'UNKNOWN';
    const fullName = actorUser.full_name || actorUser.name || username;
    const role = actorUser.role || 'user';

    const result = await appendSystemAuditLog({
      userId,
      username,
      fullName,
      role,
      action,
      details,
      moduleName: module,
      deviceName,
      deviceType,
      location,
      ipAddress
    }, connection);

    // Optional SSE broadcast for real-time audit log updates
    try {
      if (typeof broadcastSSE === 'function') {
        broadcastSSE({
          type: 'audit_log_event',
          log: {
            id: result.id,
            username,
            full_name: fullName,
            role,
            action,
            details,
            module,
            device_name: deviceName,
            device_type: deviceType,
            location,
            created_at: new Date().toISOString(),
            entry_hash: result.entryHash
          }
        });
      }
    } catch (sseErr) {
      // Ignore SSE broadcast error
    }

    return result;
  } catch (err) {
    console.error('Error logging audit event:', err.message);
  }
}

module.exports = {
  parseDeviceDetails,
  parseLocation,
  logAuditEvent
};
