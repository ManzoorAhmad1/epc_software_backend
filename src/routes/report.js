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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
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

      if (!files?.epc?.[0]) {
        res.status(400).json({ error: 'EPC PDF file is required' });
        return;
      }

      // Parse EPC
      const epcData = await parseEPCFromBuffer(files.epc[0].buffer);

      // Handle property photo
      let propertyPhotoBase64;

      if (files?.photo?.[0]) {
        // Manual photo upload
        propertyPhotoBase64 = files.photo[0].buffer.toString('base64');
      } else if (req.body.mapAddress) {
        // If frontend sent exact coords (already geocoded), use them directly
        const lng = parseFloat(req.body.mapLng);
        const lat = parseFloat(req.body.mapLat);
        if (!isNaN(lng) && !isNaN(lat)) {
          console.log(`Fetching Mapbox image using coords: ${lng}, ${lat}`);
          propertyPhotoBase64 = (await fetchPropertyMapImageByCoords(lng, lat)) ?? undefined;
          if (propertyPhotoBase64) {
            propertyPhotoBase64 = propertyPhotoBase64.toString('base64');
          }
        } else {
          // Fall back to geocoding from address string
          const addressToUse = req.body.mapAddress || epcData.propertyAddress;
          console.log(`Fetching Mapbox image for: ${addressToUse}`);
          const imgBuffer = await fetchPropertyMapImage(addressToUse);
          if (imgBuffer) {
            propertyPhotoBase64 = imgBuffer.toString('base64');
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
