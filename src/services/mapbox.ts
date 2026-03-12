import axios from 'axios';

const MAPBOX_KEY = process.env.MAPBOX_API_KEY || '';

interface GeocodingFeature {
  center: [number, number]; // [lng, lat]
  place_name: string;
}

interface GeocodingResponse {
  features: GeocodingFeature[];
}

/**
 * Geocode a UK address/postcode to [lng, lat] using Mapbox Geocoding API
 */
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!MAPBOX_KEY) {
    console.warn('MAPBOX_API_KEY not set — skipping geocoding');
    return null;
  }

  try {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=GB&limit=1&access_token=${MAPBOX_KEY}`;
    const res = await axios.get<GeocodingResponse>(url, { timeout: 8000 });

    if (res.data.features && res.data.features.length > 0) {
      return res.data.features[0].center; // [lng, lat]
    }
    return null;
  } catch (err) {
    console.error('Mapbox geocoding error:', err);
    return null;
  }
}

/**
 * Fetch a satellite+streets map image of the property at [lng, lat].
 * Returns a base64-encoded JPEG string, or null on failure.
 *
 * Mapbox Static Images API:
 * https://docs.mapbox.com/api/maps/static-images/
 */
export async function fetchPropertyMapImage(
  address: string,
  width = 800,
  height = 480
): Promise<string | null> {
  if (!MAPBOX_KEY) {
    console.warn('MAPBOX_API_KEY not set — skipping map image fetch');
    return null;
  }

  const coords = await geocodeAddress(address);
  if (!coords) {
    console.warn(`Could not geocode address: ${address}`);
    return null;
  }

  const [lng, lat] = coords;

  try {
    // Satellite streets style — zoom 18 shows individual buildings clearly
    const url =
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/` +
      `${lng},${lat},18,0/${width}x${height}@2x?access_token=${MAPBOX_KEY}`;

    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    const base64 = Buffer.from(res.data as ArrayBuffer).toString('base64');
    return base64;
  } catch (err) {
    console.error('Mapbox static image error:', err);
    return null;
  }
}
