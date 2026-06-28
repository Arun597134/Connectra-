import express from 'express';
import multer from 'multer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { authenticateToken } from './auth.js';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Upload endpoint
router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({ 
    filename: req.file.filename,
    path: `/api/upload/download/${req.file.filename}` 
  });
});

// Download endpoint
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = join(uploadDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

export default router;
