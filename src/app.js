'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
const epcRoutes = require('./routes/epc.js');
const reportRoutes = require('./routes/report.js');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', exposedHeaders: ['X-Filename', 'Content-Disposition'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/epc', epcRoutes);
app.use('/api/report', reportRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`EPC Backend server running on http://localhost:${PORT}`);
});

module.exports = app;
