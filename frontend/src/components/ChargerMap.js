import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Box, Typography, Button, Chip, Rating } from '@mui/material';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Create custom marker icon
const customIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to update map view when center changes
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
};

const ChargerMap = ({ chargers, center, zoom = 13, height = 500 }) => {
  const [mapCenter, setMapCenter] = useState(center || [37.7749, -122.4194]); // Default to San Francisco
  const [mapZoom, setMapZoom] = useState(zoom);

  // Update map center if provided center changes
  useEffect(() => {
    if (center) {
      setMapCenter(center);
    } else if (chargers && chargers.length > 0 && chargers[0].location) {
      // If no center provided but we have chargers, center on first charger
      setMapCenter([chargers[0].location.coordinates[1], chargers[0].location.coordinates[0]]);
    }
  }, [center, chargers]);

  return (
    <Box sx={{ height: height, width: '100%', position: 'relative' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {chargers && chargers.map((charger) => (
          charger.location && charger.location.coordinates && (
            <Marker 
              key={charger._id}
              position={[charger.location.coordinates[1], charger.location.coordinates[0]]}
              icon={customIcon}
            >
              <Popup>
                <Typography variant="subtitle1" fontWeight="bold">
                  {charger.title || 'Unnamed Charger'}
                </Typography>
                <Box display="flex" alignItems="center" mt={0.5} mb={1}>
                  <Chip 
                    size="small" 
                    label={charger.available ? "Available" : "Busy"}
                    color={charger.available ? "success" : "default"}
                    sx={{ mr: 1 }}
                  />
                  <Rating value={charger.averageRating || 0} precision={0.5} readOnly size="small" />
                </Box>
                <Typography variant="body2">
                  {charger.location?.address || 'No address provided'}
                </Typography>
                <Typography variant="body2" mt={1}>
                  <strong>${charger.pricing?.hourlyRate?.toFixed(2) || '0.00'}/hour</strong> • {charger.specifications?.power || 0} kW
                </Typography>
                <Button 
                  component={Link}
                  to={`/chargers/${charger._id}`}
                  variant="contained" 
                  color="primary"
                  size="small"
                  sx={{ mt: 1, width: '100%' }}
                >
                  View Details
                </Button>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </Box>
  );
};

export default ChargerMap;
