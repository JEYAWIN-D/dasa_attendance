const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
const selfiesDir = path.join(uploadsDir, 'selfies');
const docsDir = path.join(uploadsDir, 'documents');

[uploadsDir, selfiesDir, docsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'selfie') {
      cb(null, selfiesDir);
    } else {
      cb(null, docsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, WEBP, and PDF files are permitted.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter
});

// Helper to save base64 selfie data URI to file
function saveBase64Image(base64Data, subfolder = 'selfies') {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return null;
  }
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `selfie-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const targetDir = path.join(uploadsDir, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${subfolder}/${filename}`;
}

module.exports = {
  upload,
  saveBase64Image
};

