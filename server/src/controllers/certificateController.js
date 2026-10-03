const { query, getOne } = require('../config/db');
const { computeCertificateHmac, verifyCertificateHmac, generateCertificateToken } = require('../utils/certificateSigner');
const { logAuditEvent } = require('../utils/auditLogger');

exports.verifyCertificatePublic = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const request = await getOne(
      'SELECT id, request_number, register_number, overall_status, certificate_number, completion_date, certificate_token, certificate_hmac, certificate_version, certificate_status, revocation_reason FROM nodues_requests WHERE certificate_token = ?',
      [token.trim()]
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No-Dues Certificate record not found. The supplied verification token is invalid or has expired.'
      });
    }

    // Verify HMAC signature
    const isSignatureValid = verifyCertificateHmac({
      certificateNumber: request.certificate_number,
      registerNumber: request.register_number,
      issueDate: request.completion_date,
      requestId: request.id,
      hmac: request.certificate_hmac
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Cryptographic verification failed: Certificate signature is corrupt or has been tampered with.'
      });
    }

    const student = await getOne(
      'SELECT full_name, register_number, department, batch FROM students WHERE register_number = ?',
      [request.register_number]
    );

    // Return strictly public institutional verification payload
    // Excludes: stages, internal remarks, officer employee IDs, student phone/photo
    const data = {
      certificate_number: request.certificate_number,
      certificateNumber: request.certificate_number,
      student_name: student ? student.full_name : 'Verified Student',
      studentName: student ? student.full_name : 'Verified Student',
      register_number: student ? student.register_number : request.register_number,
      registerNumber: student ? student.register_number : request.register_number,
      department: student ? student.department : 'Information Technology',
      batch: student ? student.batch : '2022-2026',
      status: request.certificate_status || 'Valid',
      revocation_reason: request.certificate_status === 'Revoked' ? (request.revocation_reason || 'Administrative Revocation') : null,
      revocationReason: request.certificate_status === 'Revoked' ? (request.revocation_reason || 'Administrative Revocation') : null,
      issue_date: request.completion_date,
      issueDate: request.completion_date,
      version: request.certificate_version || 1
    };

    return res.json({
      success: true,
      data,
      ...data
    });

  } catch (err) {
    console.error('Public Certificate Verification Error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing certificate verification.' });
  }
};

exports.revokeCertificate = async (req, res) => {
  try {
    const { requestId, reason } = req.body;

    if (!requestId || !reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Request ID and Revocation Reason are required.' });
    }

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Clearance request record not found.' });
    }

    if (request.overall_status !== 'Approved' || !request.certificate_number) {
      return res.status(400).json({ success: false, message: 'Only issued certificates can be revoked.' });
    }

    const revokerName = req.user.username;

    await query(
      `UPDATE nodues_requests 
       SET certificate_status = 'Revoked',
           revocation_reason = ?,
           revoked_by = ?,
           revoked_at = NOW()
       WHERE id = ?`,
      [reason.trim(), revokerName, requestId]
    );

    await logAuditEvent({
      req,
      user: req.user,
      action: 'CERTIFICATE_REVOKED',
      details: `Certificate ${request.certificate_number} (Request #${requestId}) revoked by ${revokerName}. Reason: ${reason.trim()}`,
      module: 'Certificate Management'
    });

    return res.json({
      success: true,
      status: 'Revoked',
      message: `Certificate ${request.certificate_number} has been revoked successfully.`
    });

  } catch (err) {
    console.error('Revoke Certificate Error:', err);
    return res.status(500).json({ success: false, message: 'Server error revoking certificate.' });
  }
};

exports.reissueCertificate = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    const request = await getOne('SELECT * FROM nodues_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Clearance request record not found.' });
    }

    const newVersion = (request.certificate_version || 1) + 1;
    const newToken = generateCertificateToken();
    const newHmac = computeCertificateHmac({
      certificateNumber: request.certificate_number,
      registerNumber: request.register_number,
      issueDate: request.completion_date || new Date(),
      requestId: request.id
    });

    await query(
      `UPDATE nodues_requests 
       SET certificate_token = ?,
           certificate_hmac = ?,
           certificate_version = ?,
           certificate_status = 'Valid',
           revocation_reason = NULL,
           revoked_by = NULL,
           revoked_at = NULL
       WHERE id = ?`,
      [newToken, newHmac, newVersion, requestId]
    );

    await logAuditEvent({
      req,
      user: req.user,
      action: 'CERTIFICATE_REISSUED',
      details: `Certificate ${request.certificate_number} reissued as Version ${newVersion} with new cryptographic token.`,
      module: 'Certificate Management'
    });

    return res.json({
      success: true,
      message: `Certificate ${request.certificate_number} has been reissued successfully (v${newVersion}).`,
      version: newVersion,
      token: newToken
    });

  } catch (err) {
    console.error('Reissue Certificate Error:', err);
    return res.status(500).json({ success: false, message: 'Server error reissuing certificate.' });
  }
};
