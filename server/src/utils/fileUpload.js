const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { scanFile } = require('./malwareScanner');

const DOCUMENTS_DIR = path.resolve(__dirname, '../../uploads/documents');
const PHOTOS_DIR = path.resolve(__dirname, '../../uploads/photos');

// Ensure upload directories exist outside web root
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png'
]);

// Verify actual magic bytes (file signature)
function verifyMagicBytes(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  // PDF signature: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}

// Multer storage engine generating completely random server filenames
function createDiskStorage(targetDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const sanitizedExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.bin';
      const randomName = `${crypto.randomBytes(20).toString('hex')}${sanitizedExt}`;
      cb(null, randomName);
    }
  });
}

const documentStorage = createDiskStorage(DOCUMENTS_DIR);
const photoStorage = createDiskStorage(PHOTOS_DIR);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are permitted.'), false);
  }
  cb(null, true);
}

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

/**
 * Validates file magic bytes and executes malware scan.
 * Deletes file and throws if validation fails.
 */
async function validateAndScanUploadedFile(filePath) {
  const verifiedMime = verifyMagicBytes(filePath);
  if (!verifiedMime || !ALLOWED_MIME_TYPES.has(verifiedMime)) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new Error('File integrity error: File content signature does not match allowed PDF, JPG, or PNG format.');
  }

  const scanResult = await scanFile(filePath);
  if (!scanResult.isClean) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new Error(`Security threat detected: ${scanResult.details}`);
  }

  return verifiedMime;
}

/**
 * Resizes image to 400x400 and strips all EXIF metadata using sharp
 */
async function processProfilePhoto(inputPath, outputPath) {
  await sharp(inputPath)
    .rotate() // Automatically orient based on EXIF before stripping
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .toFormat('jpeg', { quality: 85 })
    .toFile(outputPath);

  // If output differs from input, delete input
  if (inputPath !== outputPath && fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }
}

module.exports = {
  uploadDocument,
  uploadPhoto,
  validateAndScanUploadedFile,
  processProfilePhoto,
  DOCUMENTS_DIR,
  PHOTOS_DIR
};
