/**
 * SVCE Smart No-Dues ERP - High Concurrency Load Test (500 Concurrent Users)
 * 
 * Simulates peak semester-end clearance traffic pattern:
 * - 500 concurrent connections
 * - Mixed workload: Health liveness, Readiness with deep MySQL ping, and Authenticated Announcements
 * - Measures throughput, p95 latency, error rate, and DB pool saturation
 */

process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.PORT = process.env.LOAD_TEST_PORT || '5002';
process.env.DB_CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT || '50';

const autocannon = require('autocannon');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const config = require('../src/config/env');
const { ensureReady, getPoolStats, getPool } = require('../src/config/db');

async function runLoadTest() {
  console.log(`================================================================`);
  console.log(`  SVCE Smart No-Dues ERP - Semester-End Peak Load Benchmark     `);
  console.log(`================================================================`);
  console.log(`Simulating: 500 Concurrent Users over 12 seconds`);
  console.log(`Target: http://localhost:${process.env.PORT}`);

  await ensureReady();
  const initialPoolStats = getPoolStats();
  console.log(`\nInitial MySQL Pool State:`, initialPoolStats);

  // Generate a valid mock student JWT token for authenticated benchmark requests
  const studentToken = jwt.sign(
    {
      id: 1,
      username: 'IT2024001',
      role: 'student',
      department: 'IT',
      must_change_password: 0
    },
    config.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(process.env.PORT, '0.0.0.0', resolve));
  console.log(`🚀 Benchmark target server listening on port ${process.env.PORT}`);

  const testUrl = `http://localhost:${process.env.PORT}`;

  const instance = autocannon({
    url: testUrl,
    connections: 500, // 500 concurrent connections
    duration: 12,     // 12 seconds sustained load
    pipelining: 1,
    headers: {
      Authorization: `Bearer ${studentToken}`
    },
    requests: [
      {
        method: 'GET',
        path: '/health'
      },
      {
        method: 'GET',
        path: '/ready'
      },
      {
        method: 'GET',
        path: '/api/student/announcements'
      }
    ]
  });

  autocannon.track(instance, { renderProgressBar: true });

  const result = await instance;
  const finalPoolStats = getPoolStats();

  const p95Latency = result.latency.p97_5 || result.latency.p90 || result.latency.average;

  console.log(`\n================================================================`);
  console.log(`                      LOAD TEST REPORT                         `);
  console.log(`================================================================`);
  console.log(`Concurrent Users (Connections): ${result.connections}`);
  console.log(`Total Requests Handled:          ${result.requests.total}`);
  console.log(`Throughput (Req / Sec):          ${result.requests.average.toFixed(1)} req/s`);
  console.log(`Data Transferred:                ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Latency Breakdown:`);
  console.log(`  Average Latency:               ${result.latency.average.toFixed(2)} ms`);
  console.log(`  p50 (Median):                  ${result.latency.p50} ms`);
  console.log(`  p90:                           ${result.latency.p90} ms`);
  console.log(`  p95 (approx 97.5th):           ${result.latency.p97_5} ms`);
  console.log(`  p99:                           ${result.latency.p99} ms`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Reliability & Errors:`);
  console.log(`  2xx Responses:                 ${result['2xx'] || result.requests.total}`);
  console.log(`  Non-2xx Responses:             ${result.non2xx || 0}`);
  console.log(`  Socket / HTTP Errors:          ${result.errors || 0}`);
  console.log(`  Timeouts:                      ${result.timeouts || 0}`);
  const totalReqs = result.requests.total || 1;
  const errorRate = ((result.errors + (result.non2xx || 0)) / totalReqs) * 100;
  console.log(`  Error Rate:                    ${errorRate.toFixed(3)}%`);
  console.log(`----------------------------------------------------------------`);
  console.log(`MySQL Connection Pool Behavior:`);
  console.log(`  Configured Pool Limit:         ${finalPoolStats.connectionLimit}`);
  console.log(`  Active Connections:            ${finalPoolStats.activeConnections}`);
  console.log(`  Free Connections:              ${finalPoolStats.freeConnections}`);
  console.log(`  Queued Requests:               ${finalPoolStats.queuedRequests}`);
  console.log(`================================================================\n`);

  if (server.closeAllConnections) {
    server.closeAllConnections();
  }
  await new Promise((resolve) => server.close(resolve));
  const pool = getPool();
  if (pool) {
    await pool.end();
  }

  return {
    throughput: result.requests.average,
    p95: result.latency.p97_5,
    p50: result.latency.p50,
    errorRate,
    poolLimit: finalPoolStats.connectionLimit
  };
}

if (require.main === module) {
  runLoadTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Load test failure:', err);
      process.exit(1);
    });
}

module.exports = { runLoadTest };
