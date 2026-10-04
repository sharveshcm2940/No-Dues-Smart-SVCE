const request = require('supertest');
const app = require('../src/server');
const { query, getOne, ensureReady } = require('../src/config/db');
const { calculateOverdueFine } = require('../src/utils/fineCalculator');
const { 
  generateCertificateToken, 
  computeCertificateHmac, 
  verifyCertificateHmac,
  getVerificationUrl 
} = require('../src/utils/certificateSigner');
const errorHandler = require('../src/middleware/errorHandler');
const {
  evaluateStageSla,
  calculateMedian,
  identifyBottleneckStage,
  calculateElapsedHours
} = require('../src/utils/slaCalculator');
const { executeStageTransition } = require('../src/utils/workflowHelper');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

describe('Task 1: Comprehensive Unit & Integration Test Suite', () => {

  beforeAll(async () => {
    await ensureReady();
  });

  // ===========================================================================
  // SECTION 1: UNIT TESTS
  // ===========================================================================
  describe('1. Unit Tests', () => {

    describe('A. Stage-Transition Logic & State Machine', () => {
      test('Rejects transition if clearance request does not exist', async () => {
        const result = await executeStageTransition({
          requestId: 999999,
          departmentName: 'Department Library',
          action: 'Approve',
          actorUser: { id: 3, username: 'EMP-LIB-IT-01', role: 'library_staff' }
        });
        expect(result.status || result.statusCode).toBe(404);
      });

      test('Rejects transition if target department is not found in request stages', async () => {
        const reqRow = await getOne('SELECT id FROM nodues_requests ORDER BY id ASC LIMIT 1');
        if (reqRow) {
          const result = await executeStageTransition({
            requestId: reqRow.id,
            departmentName: 'NonExistentDepartment',
            action: 'Approve',
            actorUser: { id: 1, username: 'EMP-HOD-IT-01', role: 'hod' }
          });
          expect(result.statusCode || result.status).toBe(404);
        }
      });
    });

    describe('B. Fine Calculation Matrix', () => {
      test('Returns 0 fine for book returned on or before due date', async () => {
        const result = await calculateOverdueFine('2026-10-10', '2026-10-05', {
          ratePerDay: 5,
          graceDays: 2,
          capAmount: 500
        });
        expect(result.daysOverdue).toBe(0);
        expect(result.calculatedFine).toBe(0);
      });

      test('Applies grace days policy correctly before imposing fine', async () => {
        // Due on Oct 1, returned on Oct 3 (2 days overdue) with grace period of 3 days -> 0 fine
        const resWithinGrace = await calculateOverdueFine('2026-10-01', '2026-10-03', {
          ratePerDay: 5,
          graceDays: 3,
          capAmount: 500
        });
        expect(resWithinGrace.daysOverdue).toBe(2);
        expect(resWithinGrace.billableDays).toBe(0);
        expect(resWithinGrace.calculatedFine).toBe(0);

        // Due on Oct 1, returned on Oct 6 (5 days overdue) with grace period of 2 days -> 3 billable days
        const resPastGrace = await calculateOverdueFine('2026-10-01', '2026-10-06', {
          ratePerDay: 10,
          graceDays: 2,
          capAmount: 500
        });
        expect(resPastGrace.daysOverdue).toBe(5);
        expect(resPastGrace.billableDays).toBe(3);
        expect(resPastGrace.calculatedFine).toBe(30);
      });

      test('Strictly enforces maximum cap ceiling on large overdue fines', async () => {
        // 100 days overdue at ₹10/day = ₹1000, cap is ₹250
        const cappedRes = await calculateOverdueFine('2026-01-01', '2026-04-11', {
          ratePerDay: 10,
          graceDays: 0,
          capAmount: 250
        });
        expect(cappedRes.calculatedFine).toBe(250);
      });
    });

    describe('C. Token & Cryptographic HMAC Generation', () => {
      test('Certificate token has at least 192 bits (24 bytes) entropy in base64url format', () => {
        const token1 = generateCertificateToken();
        const token2 = generateCertificateToken();
        expect(token1).not.toBe(token2);
        expect(typeof token1).toBe('string');
        expect(token1.length).toBeGreaterThanOrEqual(32);
        expect(token1).toMatch(/^[A-Za-z0-9_-]+$/);
      });

      test('Certificate HMAC-SHA256 signature is deterministic and tamper-sensitive', () => {
        const payload = {
          certificateNumber: 'CERT-TEST-2026-0001',
          registerNumber: 'IT2024001',
          issueDate: '2026-10-04',
          requestId: 101
        };

        const hmac1 = computeCertificateHmac(payload);
        const hmac2 = computeCertificateHmac(payload);
        expect(hmac1).toBe(hmac2);
        expect(hmac1).toMatch(/^[0-9a-f]{64}$/);

        // Verify valid HMAC
        expect(verifyCertificateHmac(payload, hmac1)).toBe(true);

        // Tamper with register number
        expect(verifyCertificateHmac({ ...payload, registerNumber: 'IT2024999' }, hmac1)).toBe(false);

        // Tamper with certificate number
        expect(verifyCertificateHmac({ ...payload, certificateNumber: 'CERT-TAMPERED' }, hmac1)).toBe(false);
      });

      test('Generates valid canonical QR verification URL', () => {
        const url = getVerificationUrl('test-sample-token-12345');
        expect(url).toContain('/verify/test-sample-token-12345');
      });
    });

    describe('D. SLA Turnaround Time & Bottleneck Calculation', () => {
      test('Calculates elapsed hours correctly', () => {
        const start = new Date('2026-10-01T10:00:00Z');
        const end = new Date('2026-10-02T16:30:00Z'); // 30.5 hours later
        const hours = calculateElapsedHours(start, end);
        expect(hours).toBe(30.5);
      });

      test('Detects SLA breach when elapsed time exceeds stage threshold', () => {
        const start = new Date(Date.now() - 36 * 60 * 60 * 1000); // 36h ago
        const evalResult = evaluateStageSla('Department Library', start, new Date());
        expect(evalResult.breached).toBe(true);
        expect(evalResult.thresholdHours).toBe(24);
        expect(evalResult.elapsedHours).toBeGreaterThanOrEqual(35.9);
      });

      test('Computes exact median turnaround time across odd and even sample sizes', () => {
        expect(calculateMedian([10, 20, 30])).toBe(20);
        expect(calculateMedian([10, 20, 30, 40])).toBe(25);
        expect(calculateMedian([15])).toBe(15);
        expect(calculateMedian([])).toBe(0);
      });

      test('Accurately identifies bottleneck stage based on median latency and friction', () => {
        const stageMetrics = [
          { stageName: 'Department Library', medianHours: 12, holdCount: 1, rejectionCount: 0 },
          { stageName: 'Finance', medianHours: 65, holdCount: 10, rejectionCount: 2 },
          { stageName: 'DPC', medianHours: 24, holdCount: 3, rejectionCount: 1 }
        ];

        const bottleneck = identifyBottleneckStage(stageMetrics);
        expect(bottleneck).toBeDefined();
        expect(bottleneck.stageName).toBe('Finance');
      });
    });

    describe('E. Centralized Error Handler Hardening & Data Leak Prevention', () => {
      function mockContext() {
        const req = { id: 'req-corr-99', headers: {}, method: 'POST', originalUrl: '/api/test', ip: '127.0.0.1' };
        const res = {
          statusCode: 200,
          payload: null,
          status(c) { this.statusCode = c; return this; },
          json(p) { this.payload = p; return this; }
        };
        return { req, res };
      }

      test('Transforms CORS violation into 403 Forbidden with correlation ID', () => {
        const { req, res } = mockContext();
        errorHandler(new Error('CORS policy violation: Origin not allowed'), req, res);
        expect(res.statusCode).toBe(403);
        expect(res.payload.success).toBe(false);
        expect(res.payload.requestId).toBe('req-corr-99');
      });

      test('Transforms payload limit violation into 413 Payload Too Large', () => {
        const { req, res } = mockContext();
        const err = new Error('Too large');
        err.type = 'entity.too.large';
        errorHandler(err, req, res);
        expect(res.statusCode).toBe(413);
        expect(res.payload.message).toContain('Payload size limit exceeded');
      });

      test('Transforms JSON syntax parse error into 400 Bad Request', () => {
        const { req, res } = mockContext();
        const err = new SyntaxError('Unexpected token in JSON');
        err.status = 400;
        err.body = '{ broken json ';
        errorHandler(err, req, res);
        expect(res.statusCode).toBe(400);
        expect(res.payload.message).toContain('Malformed JSON payload');
      });

      test('Transforms file upload limit violation into 400 Bad Request', () => {
        const { req, res } = mockContext();
        const err = new Error('File too large');
        err.code = 'LIMIT_FILE_SIZE';
        errorHandler(err, req, res);
        expect(res.statusCode).toBe(400);
        expect(res.payload.message).toContain('File upload error');
      });

      test('Sanitizes production SQL errors to prevent internal schema leaks', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
          const { req, res } = mockContext();
          const sqlErr = new Error('Table svce_nodues.secrets does not exist');
          sqlErr.code = 'ER_NO_SUCH_TABLE';
          sqlErr.sql = 'SELECT * FROM secrets';
          errorHandler(sqlErr, req, res);
          expect(res.statusCode).toBe(500);
          expect(res.payload.message).not.toContain('secrets');
          expect(res.payload.message).toContain('internal server error occurred');
          expect(res.payload.debug).toBeUndefined();
        } finally {
          process.env.NODE_ENV = origEnv;
        }
      });
    });
  });

  // ===========================================================================
  // SECTION 2: INTEGRATION TESTS: COMPLETE LIFECYCLE WORKFLOWS
  // ===========================================================================
  describe('2. Integration Tests: Complete Lifecycle Workflows', () => {
    let studentToken;
    let libToken, dpcToken, mainLibToken, faToken, financeToken, hodToken, adminToken;
    let testRequestId;
    let testCertToken;

    beforeAll(async () => {
      const makeToken = (id, username, role) => jwt.sign(
        { id, username, role, must_change_password: 0 },
        env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      studentToken = makeToken(11, 'IT2024002', 'student');
      libToken = makeToken(3, 'EMP-LIB-IT-01', 'library_staff');
      dpcToken = makeToken(2, 'EMP-DPC-IT-01', 'dpc');
      mainLibToken = makeToken(4, 'EMP-MLIB-IT-01', 'main_library_staff');
      faToken = makeToken(6, 'EMP-FA-IT-01', 'faculty_advisor');
      financeToken = makeToken(5, 'EMP-FIN-IT-01', 'finance');
      hodToken = makeToken(1, 'EMP-HOD-IT-01', 'hod');
      adminToken = makeToken(458, 'admin', 'admin');

      // Purge any stale test requests for IT2024002 to guarantee reproducible isolation
      await query("DELETE FROM nodues_stages WHERE request_id IN (SELECT id FROM nodues_requests WHERE register_number = 'IT2024002')");
      await query("DELETE FROM nodues_requests WHERE register_number = 'IT2024002'");
    });

    afterAll(async () => {
      // Clean up test request after test completion
      await query("DELETE FROM nodues_stages WHERE request_id IN (SELECT id FROM nodues_requests WHERE register_number = 'IT2024002')");
      await query("DELETE FROM nodues_requests WHERE register_number = 'IT2024002'");
    });

    test('1. Student submits a new No-Dues clearance request', async () => {
      const submitRes = await request(app)
        .post('/api/student/request-nodues')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          career_option: 'Placements',
          company_name: 'Zoho Corporation',
          job_designation: 'Member Technical Staff',
          ctc_package: '8.5 LPA'
        });

      expect([200, 201]).toContain(submitRes.status);
      expect(submitRes.body.success).toBe(true);

      const reqRow = await getOne("SELECT id FROM nodues_requests WHERE register_number = 'IT2024002' ORDER BY id DESC LIMIT 1");
      expect(reqRow).toBeDefined();
      testRequestId = reqRow.id;

      // Verify initial state: Stage 1 is Pending, Stage 2 is Locked (or DPC pending for 4th year)
      const stages = await query('SELECT * FROM nodues_stages WHERE request_id = ? ORDER BY stage_order ASC', [testRequestId]);
      expect(stages.length).toBe(6);
      expect(stages[0].department_name).toBe('Department Library');
      expect(stages[0].status).toBe('Pending');
    });

    test('2. Parallel / Out-of-order clearance transition is strictly blocked', async () => {
      expect(testRequestId).toBeDefined();

      // Attempting to jump directly to Stage 6 (HOD) while preceding stages are Pending
      const outOfOrderRes = await request(app)
        .post('/api/hod/process-nodues')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          requestId: testRequestId,
          action: 'Approve',
          remarks: 'Bypassing prerequisite stages'
        });

      expect(outOfOrderRes.status).toBe(400);
      expect(outOfOrderRes.body.success).toBe(false);
      expect(outOfOrderRes.body.message).toMatch(/order violation|prior approval/i);
    });

    test('3. Hold -> Clear cycle: Officer puts stage on Hold and then Approves', async () => {
      expect(testRequestId).toBeDefined();

      // Dept Library puts request on Hold
      const holdRes = await request(app)
        .post('/api/library/process-nodues')
        .set('Authorization', `Bearer ${libToken}`)
        .send({
          requestId: testRequestId,
          action: 'Hold',
          remarks: 'Please return 1 overdue lab reference manual'
        });

      expect(holdRes.status).toBe(200);
      expect(holdRes.body.success).toBe(true);

      const stageAfterHold = await getOne(
        `SELECT status FROM nodues_stages WHERE request_id = ? AND department_name = 'Department Library'`,
        [testRequestId]
      );
      expect(stageAfterHold.status).toBe('Hold');

      // Dept Library approves after student resolves hold
      const approveRes = await request(app)
        .post('/api/library/process-nodues')
        .set('Authorization', `Bearer ${libToken}`)
        .send({
          requestId: testRequestId,
          action: 'Approve',
          remarks: 'Manual returned in good condition. Clearance approved.'
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);

      // Verify Stage 1 is Approved and Stage 2 (DPC) is unlocked to Pending
      const stage1 = await getOne(
        `SELECT status FROM nodues_stages WHERE request_id = ? AND department_name = 'Department Library'`,
        [testRequestId]
      );
      expect(stage1.status).toBe('Approved');

      const stage2 = await getOne(
        `SELECT status FROM nodues_stages WHERE request_id = ? AND department_name = 'DPC'`,
        [testRequestId]
      );
      expect(stage2.status).toBe('Pending');
    });

    test('4. Full clearance pipeline progression: DPC -> Central Library -> FA -> Finance -> HOD', async () => {
      expect(testRequestId).toBeDefined();

      // Step 2: DPC Approves
      const dpcRes = await request(app)
        .post('/api/dpc/process-nodues')
        .set('Authorization', `Bearer ${dpcToken}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Placement offer verified.' });
      expect(dpcRes.status).toBe(200);

      // Step 3: Central Library Approves
      const mlibRes = await request(app)
        .post('/api/main-library/process-nodues')
        .set('Authorization', `Bearer ${mainLibToken}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Central library accounts cleared.' });
      expect(mlibRes.status).toBe(200);

      // Step 4: Faculty Advisor Approves
      const faRes = await request(app)
        .post('/api/fa/process-nodues')
        .set('Authorization', `Bearer ${faToken}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Advisee academic clearance verified.' });
      expect(faRes.status).toBe(200);

      // Step 5: Finance Section Approves
      const finRes = await request(app)
        .post('/api/finance/process-nodues')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'All semester tuition & hostel dues cleared.' });
      expect(finRes.status).toBe(200);

      // Step 6: Head of Department (HOD) Final Sign-off
      const hodRes = await request(app)
        .post('/api/hod/process-nodues')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ requestId: testRequestId, action: 'Approve', remarks: 'Final department approval granted.' });
      expect(hodRes.status).toBe(200);

      // Verify Request is now Approved, 100% progress, certificate generated
      const completedReq = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [testRequestId]);
      expect(completedReq.overall_status).toBe('Approved');
      expect(completedReq.progress_percentage).toBe(100);
      expect(completedReq.certificate_number).toBeDefined();
      expect(completedReq.certificate_token).toBeDefined();
      expect(completedReq.certificate_hmac).toBeDefined();
      expect(completedReq.certificate_status).toBe('Valid');

      testCertToken = completedReq.certificate_token;
    });

    test('5. Certificate public verification endpoint validates HMAC integrity via QR URL', async () => {
      expect(testCertToken).toBeDefined();

      const verifyRes = await request(app).get(`/api/verify/${testCertToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.registerNumber).toBe('IT2024002');
      expect(verifyRes.body.status).toBe('Valid');
    });

    test('6. Certificate revocation updates certificate status to Revoked with reason', async () => {
      expect(testRequestId).toBeDefined();
      expect(testCertToken).toBeDefined();

      const revokeRes = await request(app)
        .post('/api/hod/certificate/revoke')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          requestId: testRequestId,
          reason: 'Auditor requested temporary hold on certificate issuance'
        });

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.success).toBe(true);
      expect(revokeRes.body.status).toBe('Revoked');

      // Verify public verification now reflects Revoked status
      const verifyAfterRevoke = await request(app).get(`/api/verify/${testCertToken}`);
      expect(verifyAfterRevoke.status).toBe(200);
      expect(verifyAfterRevoke.body.status).toBe('Revoked');
      expect(verifyAfterRevoke.body.revocationReason).toMatch(/temporary hold/i);
    });

    test('7. Reopen stage triggers cascading reset of downstream stages', async () => {
      expect(testRequestId).toBeDefined();

      const reopenRes = await request(app)
        .post('/api/nodues/reopen-stage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          requestId: testRequestId,
          departmentName: 'Finance',
          reason: 'Reconciliation of semester lab fees'
        });

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.success).toBe(true);
      expect(reopenRes.body.result.departmentName).toBe('Finance');

      // Finance stage should now be Hold, downstream stage (HOD) reset to Pending
      const finStage = await getOne(
        `SELECT status FROM nodues_stages WHERE request_id = ? AND department_name = 'Finance'`,
        [testRequestId]
      );
      expect(finStage.status).toBe('Hold');

      const hodStage = await getOne(
        `SELECT status FROM nodues_stages WHERE request_id = ? AND department_name = 'HOD'`,
        [testRequestId]
      );
      expect(hodStage.status).toBe('Pending');
    });

    test('8. Delegation and Escalation: Complaint ticket assignment and status resolution', async () => {
      // 1. Student files a grievance/complaint
      const createCmpRes = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Hostel caution deposit refund status',
          description: 'Awaiting refund receipt for caution deposit reconciliation.',
          category: 'General',
          department: 'Finance'
        });

      expect(createCmpRes.status).toBe(201);
      expect(createCmpRes.body.success).toBe(true);
      const complaintId = createCmpRes.body.id;
      expect(complaintId).toBeDefined();

      // 2. Delegation: Officer delegates/assigns complaint to specific staff member
      const assignRes = await request(app)
        .put(`/api/complaints/${complaintId}/assign`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          assigneeUserId: 5,
          assigneeName: 'Finance Officer M',
          assigneeRole: 'finance',
          remarks: 'Assigned for priority ledger audit'
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.success).toBe(true);

      // 3. Escalation / Resolution: Officer updates complaint status with resolution
      const updateStatusRes = await request(app)
        .put(`/api/complaints/${complaintId}/status`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          status: 'Resolved',
          remarks: 'Ledger reconciled and clearance confirmed.'
        });

      expect(updateStatusRes.status).toBe(200);
      expect(updateStatusRes.body.success).toBe(true);

      // Clean up test complaint
      await query('DELETE FROM complaint_status_history WHERE complaint_id = ?', [complaintId]);
      await query('DELETE FROM complaints WHERE id = ?', [complaintId]);
    });
  });
});
