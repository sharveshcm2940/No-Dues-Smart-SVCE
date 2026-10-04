const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { logger } = require('./logger');
const JWT_SECRET = config.JWT_SECRET;

// Maximum allowed concurrent SSE streams per user
const MAX_CONNECTIONS_PER_USER = parseInt(process.env.SSE_MAX_PER_USER || '3', 10);

// Map of active SSE client connections: clientId -> client object
const clients = new Map();

// Map tracking active connection count per username: username -> Set of clientIds
const userConnections = new Map();

/**
 * Handles incoming SSE connection requests (/api/sse or /api/events)
 */
function handleSSEConnection(req, res) {
  // Extract user info from JWT query param or Authorization header
  const authHeader = req.headers['authorization'];
  const token = req.query.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required for SSE stream.' });
  }

  let user = null;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }

  const username = user.username || `user_${user.id}`;

  // Enforce per-user connection limits: prune oldest connection if limit reached
  if (!userConnections.has(username)) {
    userConnections.set(username, new Set());
  }

  const userActiveSet = userConnections.get(username);
  if (userActiveSet.size >= MAX_CONNECTIONS_PER_USER) {
    // Prune the oldest active connection for this user
    const oldestClientId = userActiveSet.values().next().value;
    const oldestClient = clients.get(oldestClientId);
    if (oldestClient) {
      try {
        oldestClient.res.write(`event: superseded\ndata: ${JSON.stringify({ message: 'Session superseded by newer connection.' })}\n\n`);
        oldestClient.res.end();
      } catch (err) {
        // Ignored
      }
      cleanupClient(oldestClientId);
    }
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering for Nginx
    'Access-Control-Allow-Origin': req.headers.origin || '*'
  });

  const clientId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const client = {
    id: clientId,
    res,
    user: username,
    role: user.role || 'user',
    ip: req.ip || req.connection?.remoteAddress,
    connectedAt: new Date(),
    heartbeat: null
  };

  clients.set(clientId, client);
  userActiveSet.add(clientId);

  logger.info({
    clientId,
    user: username,
    role: user.role,
    totalConnected: clients.size,
    userActive: userActiveSet.size
  }, 'SSE client connected');

  // Tell browser EventSource to retry after 5000ms if connection is dropped
  res.write('retry: 5000\n\n');

  // Send initial connected acknowledgement event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    clientId,
    user: username,
    message: 'Server-Sent Events stream connected successfully.',
    serverTime: new Date().toISOString()
  })}\n\n`);

  // Heartbeat ping every 15 seconds to prevent intermediate proxy timeouts
  client.heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ping ${Date.now()}\n\n`);
    } catch (err) {
      cleanupClient(clientId);
    }
  }, 15000);

  // Centralized cleanup handler
  function onClientDisconnect() {
    cleanupClient(clientId);
  }

  req.on('close', onClientDisconnect);
  req.on('error', onClientDisconnect);
  res.on('finish', onClientDisconnect);
  res.on('error', onClientDisconnect);
}

/**
 * Cleanly frees a client's resources and updates maps
 */
function cleanupClient(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  if (client.heartbeat) {
    clearInterval(client.heartbeat);
    client.heartbeat = null;
  }

  clients.delete(clientId);

  if (client.user && userConnections.has(client.user)) {
    const userSet = userConnections.get(client.user);
    userSet.delete(clientId);
    if (userSet.size === 0) {
      userConnections.delete(client.user);
    }
  }

  logger.info({ clientId, user: client.user, totalConnected: clients.size }, 'SSE client disconnected and cleaned up');
}

/**
 * Broadcasts an event to targeted user or all active clients
 */
function broadcastEvent(eventType, payload, targetUser = null) {
  const eventData = `data: ${JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() })}\n\n`;
  let sentCount = 0;

  for (const [clientId, client] of clients.entries()) {
    try {
      if (!targetUser || client.user === targetUser || targetUser === 'ALL') {
        client.res.write(eventData);
        sentCount++;
      }
    } catch (err) {
      logger.warn({ clientId, err: err.message }, 'Failed to deliver SSE event; cleaning up client');
      cleanupClient(clientId);
    }
  }

  return sentCount;
}

/**
 * Gracefully shuts down all active SSE client connections (e.g. during server termination)
 */
function closeAllSSE() {
  for (const [clientId, client] of clients.entries()) {
    try {
      client.res.write(`event: shutdown\ndata: ${JSON.stringify({ message: 'Server is restarting for maintenance.' })}\n\n`);
      client.res.end();
    } catch (e) {
      // Ignored
    }
    cleanupClient(clientId);
  }
}

module.exports = {
  handleSSEConnection,
  broadcastEvent,
  cleanupClient,
  closeAllSSE,
  getClientsCount: () => clients.size,
  getUserActiveStreamsCount: (username) => (userConnections.get(username) ? userConnections.get(username).size : 0)
};
