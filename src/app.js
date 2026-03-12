'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
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

// IP-based geolocation proxy — avoids CORS when called from the browser
app.get('/api/locate', async (_req, res) => {
  try {
    const r = await axios.get('https://ipapi.co/json/', { timeout: 6000 });
    const { latitude, longitude, city, country_name } = r.data;
    if (!latitude || !longitude) throw new Error('No coords from ipapi.co');
    res.json({ lat: latitude, lng: longitude, city, country: country_name });
  } catch {
    try {
      const r2 = await axios.get('http://ip-api.com/json/', { timeout: 6000 });
      if (r2.data.status === 'success') {
        res.json({ lat: r2.data.lat, lng: r2.data.lon, city: r2.data.city, country: r2.data.country });
      } else {
        res.status(502).json({ error: 'Could not determine location' });
      }
    } catch (e2) {
      res.status(502).json({ error: 'IP geolocation unavailable' });
    }
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`EPC Backend server running on http://localhost:${PORT}`);
});

module.exports = app;
