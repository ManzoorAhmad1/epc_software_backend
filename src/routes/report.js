'use strict';

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseEPCFromBuffer } = require('../services/epcParser.js');
const { generateEPCReport } = require('../services/pdfGenerator.js');
const { fetchPropertyMapImage, fetchPropertyMapImageByCoords } = require('../services/mapbox.js');

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
        // Manual photo upload — use actual mime type (jpeg/png/webp)
        const mime = files.photo[0].mimetype || 'image/jpeg';
        propertyPhotoBase64 = `data:${mime};base64,${files.photo[0].buffer.toString('base64')}`;
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
