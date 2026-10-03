const jwt = require('jsonwebtoken');
const config = require('../config/env');
const JWT_SECRET = config.JWT_SECRET;

// Set of active SSE client connections
const clients = new Set();

/**
 * Handles incoming SSE connection requests (/api/sse)
 */
function handleSSEConnection(req, res) {
  // Extract user info from JWT query param or header
  const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required for SSE stream.' });
  }

  let user = null;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering for Nginx/IIS

  const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const client = {
    id: clientId,
    res,
    user: user ? user.username : null,
    role: user ? user.role : null
  };

  clients.add(client);
  console.log(`📡 SSE Client Connected: ${clientId} (User: ${client.user || 'Guest'}) | Total Connected: ${clients.size}`);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId, message: 'Server-Sent Events stream connected successfully.' })}\n\n`);

  // Send keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ping ${Date.now()}\n\n`);
  }, 15000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
    console.log(`📡 SSE Client Disconnected: ${clientId} | Total Connected: ${clients.size}`);
  });
}

/**
 * Broadcasts a Server-Sent Event to connected clients
 * @param {string} eventType - Type of event (e.g. 'notification', 'nodues_update', 'hallticket_update')
 * @param {object} payload - Event payload data
 * @param {string|null} targetUser - Specific username/emp_id to target (or null for all)
 */
function broadcastEvent(eventType, payload, targetUser = null) {
  const eventData = `data: ${JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() })}\n\n`;

  let sentCount = 0;
  clients.forEach((client) => {
    try {
      if (!targetUser || client.user === targetUser || targetUser === 'ALL') {
        client.res.write(eventData);
        sentCount++;
      }
    } catch (err) {
      console.error(`Error sending SSE to client ${client.id}:`, err);
      clients.delete(client);
    }
  });

  if (sentCount > 0) {
    console.log(`📢 SSE Event Sent [${eventType}] to ${sentCount} client(s). Target: ${targetUser || 'Broadcast All'}`);
  }
}

module.exports = {
  handleSSEConnection,
  broadcastEvent,
  getClientsCount: () => clients.size
};
