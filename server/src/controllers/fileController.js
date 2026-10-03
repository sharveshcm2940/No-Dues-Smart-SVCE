const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { query, getOne } = require('../config/db');
const { validateAndScanUploadedFile, processProfilePhoto, PHOTOS_DIR } = require('../utils/fileUpload');
const { logAuditEvent } = require('../utils/auditLogger');

exports.uploadDocumentFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }

    const filePath = req.file.path;
    const category = req.body.category || 'document';
    const requestId = req.body.requestId ? parseInt(req.body.requestId, 10) : null;

    // Validate magic bytes and scan for threats
    let verifiedMime;
    try {
      verifiedMime = await validateAndScanUploadedFile(filePath);
    } catch (valErr) {
      return res.status(400).json({ success: false, message: valErr.message });
    }

    const fileId = crypto.randomBytes(16).toString('hex');
    const originalName = path.basename(req.file.originalname).slice(0, 255);
    const storedFilename = req.file.filename;

    await query(
      `INSERT INTO uploaded_files 
       (file_id, original_name, stored_filename, file_path, mime_type, file_size, category, owner_user_id, request_id, malware_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Clean')`,
      [fileId, originalName, storedFilename, filePath, verifiedMime, req.file.size, category, req.user.id, requestId]
    );

    await logAuditEvent({
      req,
      user: req.user,
      action: 'FILE_UPLOADED',
      details: `File uploaded: ${originalName} (Category: ${category}, File ID: ${fileId})`,
      module: 'File Management'
    });

    return res.json({
      success: true,
      fileId,
      url: `/api/files/${fileId}`,
      filename: originalName
    });
  } catch (err) {
    console.error('File upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ success: false, message: 'Server error processing file upload.' });
  }
};

exports.serveFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await getOne('SELECT * FROM uploaded_files WHERE file_id = ?', [fileId]);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ success: false, message: 'File asset missing from secure storage.' });
    }

    // Role-based Access Control:
    // (a) Owning student
    const isOwner = req.user.id === file.owner_user_id;

    // (b) Assigned approvers (HOD, DPC, FA, Finance, Library)
    const isExecutive = ['hod'].includes(req.user.role);
    const isDpc = req.user.role === 'dpc' && ['offer_letter', 'pitch_deck', 'higher_studies', 'exam'].includes(file.category);

    let isAssignedFA = false;
    if (req.user.role === 'faculty_advisor') {
      const student = await getOne(
        `SELECT s.id FROM students s 
         JOIN users u ON s.user_id = u.id 
         WHERE u.id = ? AND (s.advisor_emp_id = ? OR s.advisor_name = ?)`,
        [file.owner_user_id, req.user.username, req.user.full_name || '']
      );
      if (student) isAssignedFA = true;
    }

    const isStaffApprover = ['finance', 'library_staff', 'main_library_staff'].includes(req.user.role);

    // Profile photos are viewable by any authenticated institutional user
    const isProfilePhoto = file.category === 'profile_photo';

    if (!isOwner && !isExecutive && !isDpc && !isAssignedFA && !isStaffApprover && !isProfilePhoto) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to view this document.'
      });
    }

    // Log access in file_access_logs
    await query(
      `INSERT INTO file_access_logs (file_id, user_id, username, role, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fileId, req.user.id, req.user.username, req.user.role, req.ip || '127.0.0.1', req.headers['user-agent'] || '']
    );

    // Set secure response headers
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);

    return res.sendFile(path.resolve(file.file_path));
  } catch (err) {
    console.error('Serve file error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving file.' });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo provided.' });
    }

    const rawPath = req.file.path;

    // Validate magic bytes
    try {
      await validateAndScanUploadedFile(rawPath);
    } catch (valErr) {
      return res.status(400).json({ success: false, message: valErr.message });
    }

    // Process photo with sharp (resize 400x400, strip EXIF metadata)
    const processedFilename = `photo_${crypto.randomBytes(16).toString('hex')}.jpg`;
    const processedPath = path.join(PHOTOS_DIR, processedFilename);

    await processProfilePhoto(rawPath, processedPath);

    const fileId = crypto.randomBytes(16).toString('hex');
    const stats = fs.statSync(processedPath);

    await query(
      `INSERT INTO uploaded_files 
       (file_id, original_name, stored_filename, file_path, mime_type, file_size, category, owner_user_id, malware_status)
       VALUES (?, 'profile_photo.jpg', ?, ?, 'image/jpeg', ?, 'profile_photo', ?, 'Clean')`,
      [fileId, processedFilename, processedPath, stats.size, req.user.id]
    );

    // Update students table
    const photoUrl = `/api/files/${fileId}`;
    await query('UPDATE students SET photo_url = ? WHERE user_id = ?', [photoUrl, req.user.id]);

    await logAuditEvent({
      req,
      user: req.user,
      action: 'PROFILE_PHOTO_UPDATED',
      details: 'Profile photo uploaded, resized, and stripped of EXIF metadata',
      module: 'Profile Management'
    });

    return res.json({
      success: true,
      fileId,
      photoUrl,
      message: 'Profile photo updated successfully.'
    });
  } catch (err) {
    console.error('Profile photo error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ success: false, message: 'Server error updating profile photo.' });
  }
};

exports.uploadDocument = exports.uploadDocumentFile;
exports.downloadFile = exports.serveFile;

