const crypto = require('crypto');
const env = require('../config/env');

/**
 * Certificate Cryptographic Signing & Token Generator
 * Token: >=128 bits (24 bytes = 192 bits base64url)
 * HMAC-SHA256 over: (certificate_number, register_number, issue_date, request_id)
 */

function generateCertificateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function normalizeDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof d === 'string') {
    return d.split('T')[0].split(' ')[0];
  }
  return String(d);
}

function computeCertificateHmac({ certificateNumber, certificateId, registerNumber, issueDate, requestId }) {
  const certNum = certificateNumber || certificateId;
  const normalizedDate = normalizeDate(issueDate);
  const payload = `${certNum}|${registerNumber}|${normalizedDate}|${requestId}`;
  return crypto.createHmac('sha256', env.CERT_HMAC_KEY).update(payload).digest('hex');
}

function verifyCertificateHmac(params, maybeHmac) {
  const hmac = maybeHmac || (params && params.hmac);
  if (!hmac || typeof hmac !== 'string') return false;
  const certNum = params.certificateNumber || params.certificateId;
  const expected = computeCertificateHmac({
    certificateNumber: certNum,
    registerNumber: params.registerNumber,
    issueDate: params.issueDate,
    requestId: params.requestId
  });
  try {
    const bufExpected = Buffer.from(expected, 'hex');
    const bufActual = Buffer.from(hmac, 'hex');
    if (bufExpected.length !== bufActual.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufActual);
  } catch (e) {
    return false;
  }
}

function getVerificationUrl(token) {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  return `${base}/verify/${token}`;
}

module.exports = {
  generateCertificateToken,
  computeCertificateHmac,
  computeCertificateHMAC: computeCertificateHmac,
  verifyCertificateHmac,
  verifyCertificateHMAC: verifyCertificateHmac,
  getVerificationUrl
};
