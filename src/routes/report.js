'use strict';

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Detect real image MIME type from buffer magic bytes (multer can trust wrong content-type from browser)
function detectImageMime(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  return 'image/jpeg'; // fallback
}
const { parseEPCFromBuffer } = require('../services/epcParser.js');
const { generateEPCReport } = require('../services/pdfGenerator.js');
const { fetchPropertyMapImage, fetchPropertyMapImageByCoords } = require('../services/mapbox.js');
const sharp = require('sharp');

const router = Router();

// Uploads directory for saving generated reports
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer for handling both EPC + photo upload in one request
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, fieldSize: 15 * 1024 * 1024 }, // 20 MB file, 15 MB field (for base64 map image)
});

// POST /api/report/generate
router.post(
  '/generate',
  upload.fields([
    { name: 'epc', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files;

      // Parse EPC — either from uploaded PDF or manually entered JSON
      let epcData;
      if (req.body.manualEpcData) {
        try {
          epcData = JSON.parse(req.body.manualEpcData);
        } catch {
          res.status(400).json({ error: 'Invalid manual EPC data' });
          return;
        }
      } else if (files?.epc?.[0]) {
        epcData = await parseEPCFromBuffer(files.epc[0].buffer);
      } else {
        res.status(400).json({ error: 'EPC PDF file or manual EPC data is required' });
        return;
      }

      // Handle property photo
      let propertyPhotoBase64;

      if (files?.photo?.[0]) {
        const wavePath = require('path').join(__dirname, '../../../frontend/renderer/public/images/coverPage.png');
        const W = 1190, H = 1682;
        const photoTop = 430, centerH = 870; // photo covers canvas 430–1300

        // Background: white top (header area) + dark navy bottom (so wave transitions blend into navy, no white bleed)
        const bgSplit = 1200; // canvas px where navy starts
        const navyStrip = await sharp({
          create: { width: W, height: H - bgSplit, channels: 3, background: { r: 11, g: 48, b: 96 } }
        }).png().toBuffer();
        const bgCanvas = await sharp({
          create: { width: W, height: H, channels: 3, background: { r: 255, g: 255, b: 255 } }
        }).composite([{ input: navyStrip, top: bgSplit, left: 0 }]).jpeg({ quality: 95 }).toBuffer();

        // fit:'cover' zooms+crops image to fill exact area — no stretch, no white gaps
        const finalPhoto = await sharp(files.photo[0].buffer)
          .resize(W, centerH, { fit: 'cover', position: 'centre' })
          .toBuffer();

        // Wave overlay resized to full canvas
        const waveOverlay = await sharp(wavePath)
          .resize(W, H, { fit: 'fill' })
          .toBuffer();

        // Composite: bg (white+navy) → photo at center → wave on top
        const composited = await sharp(bgCanvas)
          .composite([
            { input: finalPhoto, top: photoTop, left: 0 },
            { input: waveOverlay, top: 0, left: 0, blend: 'over' },
          ])
          .jpeg({ quality: 88 })
          .toBuffer();
        console.log('[Photo] composited (white+photo+wave), size:', composited.length);
        propertyPhotoBase64 = `data:image/jpeg;base64,${composited.toString('base64')}`;
      } else if (req.body.mapImageBase64) {
        // Canvas screenshot sent directly from frontend (data URI string) — preferred
        propertyPhotoBase64 = req.body.mapImageBase64;
        console.log('Using canvas-captured map image from frontend, size:', req.body.mapImageBase64.length);
      }

      // If no canvas image (capture failed), fall back to Mapbox Static API using coords
      if (!propertyPhotoBase64) {
        const lng = parseFloat(req.body.mapLng);
        const lat = parseFloat(req.body.mapLat);
        const zoom = parseFloat(req.body.mapZoom) || 17;
        if (!isNaN(lng) && !isNaN(lat)) {
          console.log(`Fetching Mapbox static image for coords: ${lng}, ${lat}, zoom: ${zoom}`);
          try {
            const imgBuffer = await fetchPropertyMapImageByCoords(lng, lat, zoom);
            if (imgBuffer) {
              propertyPhotoBase64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
            }
          } catch (mapErr) {
            console.warn('Mapbox image fetch failed:', mapErr.message);
          }
        } else if (req.body.mapAddress) {
          // Fall back to geocoding from address string
          const addressToUse = req.body.mapAddress || epcData.propertyAddress;
          console.log(`Fetching Mapbox image for: ${addressToUse}`);
          try {
            const imgBuffer = await fetchPropertyMapImage(addressToUse);
            if (imgBuffer) {
              propertyPhotoBase64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
            }
          } catch (mapErr) {
            console.warn('Mapbox geocode fetch failed:', mapErr.message);
          }
        }
      }

      // Override assessor details if provided in form
      if (req.body.assessorName) epcData.assessorName = req.body.assessorName;
      if (req.body.companyName) epcData.companyName = req.body.companyName;
      if (req.body.assessorContact) epcData.assessorContact = req.body.assessorContact;
      if (req.body.propertyAddress) epcData.propertyAddress = req.body.propertyAddress;

      // Generate PDF report
      const pdfBuffer = await generateEPCReport(epcData, propertyPhotoBase64);

      // Save to uploads folder with timestamp name
      const filename = `epc-report-${Date.now()}.pdf`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, pdfBuffer);

      // Return the PDF as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-EPC-Address', encodeURIComponent(epcData.propertyAddress));
      res.setHeader('X-Filename', filename);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// POST /api/report/preview-data
router.post(
  '/preview-data',
  upload.fields([{ name: 'epc', maxCount: 1 }]),
  async (req, res) => {
    try {
      const files = req.files;

      if (!files?.epc?.[0]) {
        res.status(400).json({ error: 'EPC PDF file is required' });
        return;
      }

      const epcData = await parseEPCFromBuffer(files.epc[0].buffer);
      const { rawText, ...dataToSend } = epcData;

      res.json({ success: true, data: dataToSend });
    } catch (error) {
      console.error('Preview parse error:', error);
      res.status(500).json({
        error: 'Failed to parse EPC',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// GET /api/report/list
router.get('/list', (_req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR).filter((f) => f.endsWith('.pdf'));
    const reports = files.map((f) => ({
      filename: f,
      createdAt: fs.statSync(path.join(UPLOADS_DIR, f)).mtime,
      url: `/uploads/${f}`,
    }));
    reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json({ success: true, reports });
  } catch {
    res.json({ success: true, reports: [] });
  }
});

module.exports = router;
