import axios from 'axios';

// OpenStreetMap Nominatim API service for geocoding
// Documentation: https://nominatim.org/release-docs/develop/api/Overview/

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Convert address to coordinates
export const geocodeAddress = async (address) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'EvChargerShare/1.0' // Required by Nominatim usage policy
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        displayName: result.display_name,
        boundingBox: result.boundingbox
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
};

// Convert coordinates to address (reverse geocoding)
export const reverseGeocode = async (lat, lon) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'EvChargerShare/1.0' // Required by Nominatim usage policy
      }
    });

    if (response.data) {
      return {
        displayName: response.data.display_name,
        address: response.data.address
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Failed to reverse geocode coordinates');
  }
};

// Search for locations by name/address
export const searchLocations = async (query) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'EvChargerShare/1.0' // Required by Nominatim usage policy
      }
    });

    return response.data.map(item => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
      type: item.type,
      importance: item.importance
    }));
  } catch (error) {
    console.error('Location search error:', error);
    throw new Error('Failed to search locations');
  }
};

export default {
  geocodeAddress,
  reverseGeocode,
  searchLocations
};
