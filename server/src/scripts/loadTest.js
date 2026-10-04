const autocannon = require('autocannon');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const targetUrl = process.env.LOAD_TEST_TARGET || 'http://localhost:5000';

async function runSemesterEndLoadTest() {
  console.log(`================================================================`);
  console.log(`🚀 SVCE SMART NO-DUES ERP — HIGH-CONCURRENCY LOAD TEST`);
  console.log(`   Simulating 500 concurrent users in Semester-End Pattern`);
  console.log(`   Target Server: ${targetUrl}`);
  console.log(`================================================================\n`);

  // 1. Fetch initial DB pool status from /ready
  try {
    const preCheck = await fetch(`${targetUrl}/ready`).then(r => r.json());
    console.log('📊 Pre-Test DB Pool State:');
    console.log(JSON.stringify(preCheck.checks?.database?.pool, null, 2));
  } catch (err) {
    console.warn('⚠️ Could not fetch pre-test DB pool state:', err.message);
  }

  // 2. Pre-authenticate student user to obtain real JWT token for read operations
  let studentToken = '';
  try {
    const loginRes = await fetch(`${targetUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'IT2024001', password: 'Svce@2026!' })
    });
    const loginData = await loginRes.json();
    if (loginData.token) {
      studentToken = loginData.token;
      console.log('🔑 Authenticated test session established with student JWT');
    }
  } catch (err) {
    console.warn('⚠️ Could not pre-authenticate student:', err.message);
  }

  console.log('⚡ Launching 500 concurrent connections benchmark (15s duration)...\n');

  const authHeaders = studentToken ? { 'authorization': `Bearer ${studentToken}` } : {};

  const result = await autocannon({
    url: targetUrl,
    connections: 500,       // 500 concurrent users
    duration: 15,           // 15 seconds duration
    pipelining: 1,
    requests: [
      {
        method: 'GET',
        path: '/ready',
        weight: 20
      },
      {
        method: 'GET',
        path: '/health',
        weight: 15
      },
      {
        method: 'GET',
        path: '/api/student/profile',
        headers: authHeaders,
        weight: 35
      },
      {
        method: 'GET',
        path: '/api/student/requests',
        headers: authHeaders,
        weight: 20
      },
      {
        method: 'GET',
        path: '/api/verify/CERT-SVCE-IT-2026-0001',
        weight: 10
      }
    ]
  });

  console.log('\n================================================================');
  console.log('📈 BENCHMARK RESULTS & LATENCY DISTRIBUTION');
  console.log('================================================================');
  console.log(`Total Requests Sent : ${result.requests?.total || 0}`);
  console.log(`Requests / Second   : ${(result.requests?.average || 0).toFixed(2)} req/s`);
  console.log(`Throughput          : ${((result.throughput?.average || 0) / (1024 * 1024)).toFixed(2)} MB/s`);
  console.log(`Average Latency     : ${(result.latency?.average || 0).toFixed(2)} ms`);
  console.log(`p50 (Median)        : ${result.latency?.p50 || 0} ms`);
  console.log(`p90 Latency         : ${result.latency?.p90 || 0} ms`);
  console.log(`p95 Latency         : ${result.latency?.p95 || 0} ms`);
  console.log(`p99 Latency         : ${result.latency?.p99 || 0} ms`);
  console.log(`Max Latency         : ${result.latency?.max || 0} ms`);
  console.log(`2xx Responses       : ${result['2xx'] || 0}`);
  console.log(`Non-2xx Responses   : ${result.non2xx || 0}`);
  console.log(`Total Errors / Drop : ${result.errors || 0}`);
  console.log(`Timeouts            : ${result.timeouts || 0}`);

  const totalReq = (result.requests?.total || 1);
  const errorRate = (((result.errors || 0) + (result.timeouts || 0)) / totalReq * 100).toFixed(2);
  console.log(`Error Rate          : ${errorRate}%\n`);

  // 3. Fetch post-test DB pool state
  try {
    const postCheck = await fetch(`${targetUrl}/ready`).then(r => r.json());
    console.log('📊 Post-Test DB Pool State:');
    console.log(JSON.stringify(postCheck.checks?.database?.pool, null, 2));
  } catch (err) {
    console.warn('⚠️ Could not fetch post-test DB pool state:', err.message);
  }

  console.log('================================================================\n');
  return result;
}

if (require.main === module) {
  runSemesterEndLoadTest().catch(console.error);
}

module.exports = { runSemesterEndLoadTest };
