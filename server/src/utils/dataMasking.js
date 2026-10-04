/**
 * Data Masking Utility for DPDP Act 2023 Compliance
 * Protects student Personally Identifiable Information (PII) and sensitive financial details (CTC)
 * based on the role and authorization scope of the accessing actor.
 */

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  const cleaned = phone.trim();
  if (cleaned.length < 5) return '*****';
  const prefix = cleaned.slice(0, 2);
  const suffix = cleaned.slice(-3);
  return `${prefix}${'*'.repeat(cleaned.length - 5)}${suffix}`;
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const parts = email.trim().split('@');
  if (parts.length !== 2) return '*****@svce.ac.in';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const first = name[0];
  const last = name[name.length - 1];
  return `${first}${'*'.repeat(name.length - 2)}${last}@${domain}`;
}

function maskCTC(ctc) {
  if (!ctc) return ctc;
  return '[Confidential - Placement/Student Only]';
}

/**
 * Sanitizes student profile fields based on the viewer's role and ownership
 */
function sanitizeStudentProfile(student, viewerRole, isOwner = false) {
  if (!student) return null;
  if (isOwner) return { ...student };

  const sanitized = { ...student };

  // Roles that do NOT need personal phone and email
  const needsPhoneAndEmail = ['faculty_advisor', 'hod'];
  if (!needsPhoneAndEmail.includes(viewerRole)) {
    if (sanitized.phone) sanitized.phone = maskPhone(sanitized.phone);
    if (sanitized.email) sanitized.email = maskEmail(sanitized.email);
  }

  return sanitized;
}

/**
 * Sanitizes No-Dues request fields (CTC, higher study contact, phone, email) based on viewer's role
 */
function sanitizeRequest(request, viewerRole, isOwner = false) {
  if (!request) return null;
  if (isOwner) return { ...request };

  const sanitized = { ...request };

  // CTC Package is ONLY visible to DPC, HOD, and the owning Student
  const allowedCTC = ['dpc', 'hod'];
  if (!allowedCTC.includes(viewerRole) && sanitized.ctc_package) {
    sanitized.ctc_package = maskCTC(sanitized.ctc_package);
  }

  // Personal contacts in higher studies / career option
  const allowedContacts = ['faculty_advisor', 'dpc', 'hod'];
  if (!allowedContacts.includes(viewerRole)) {
    if (sanitized.higher_contact) sanitized.higher_contact = maskPhone(sanitized.higher_contact);
    if (sanitized.student_phone) sanitized.student_phone = maskPhone(sanitized.student_phone);
    if (sanitized.student_email) sanitized.student_email = maskEmail(sanitized.student_email);
  }

  return sanitized;
}

module.exports = {
  maskPhone,
  maskEmail,
  maskCTC,
  sanitizeStudentProfile,
  sanitizeRequest
};
