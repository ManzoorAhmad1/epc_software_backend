'use strict';
const axios = require('axios');

const MAPBOX_KEY = process.env.MAPBOX_API_KEY || '';

async function geocodeAddress(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
  const response = await axios.get(url, {
    params: { access_token: MAPBOX_KEY, limit: 1 },
  });
  const features = response.data.features;
  if (!features || features.length === 0) return null;
  const [lng, lat] = features[0].center;
  return { lng, lat };
}

async function fetchPropertyMapImage(address, width = 600, height = 400) {
  const coords = await geocodeAddress(address);
  if (!coords) return null;
  return fetchPropertyMapImageByCoords(coords.lng, coords.lat, width, height);
}

async function fetchPropertyMapImageByCoords(lng, lat, zoom = 17, width = 600, height = 400) {
  const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},${zoom},0/${width}x${height}@2x`;
  const response = await axios.get(url, {
    params: { access_token: MAPBOX_KEY },
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
}

module.exports = { geocodeAddress, fetchPropertyMapImage, fetchPropertyMapImageByCoords };
