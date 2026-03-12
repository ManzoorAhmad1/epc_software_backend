import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parseEPCFromBuffer } from '../services/epcParser';

const router = Router();

// Configure multer for EPC file uploads (keep in memory for parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

// POST /api/epc/parse
// Upload an EPC PDF and parse its contents
router.post('/parse', upload.single('epc'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No EPC file uploaded' });
      return;
    }

    const epcData = await parseEPCFromBuffer(req.file.buffer);

    // Don't send raw text in the response (can be very large)
    const { rawText: _raw, ...dataToSend } = epcData;

    res.json({ success: true, data: dataToSend });
  } catch (error) {
    console.error('EPC parse error:', error);
    res.status(500).json({
      error: 'Failed to parse EPC file',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
