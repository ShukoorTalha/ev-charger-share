import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { chargerAPI } from '../services/api';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  FormLabel,
  FormControlLabel,
  FormHelperText,
  RadioGroup,
  Radio,
  MenuItem,
  Select,
  InputLabel,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import { EvStation, CloudUpload, Delete } from '@mui/icons-material';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// LocationMarker component for interactive map
const LocationMarker = ({ position, setCoordinates }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setCoordinates([lng, lat]); // Store as [longitude, latitude] to match backend format
    },
  });

  // Only show marker if we have valid coordinates
  return position[0] !== 0 && position[1] !== 0 ? (
    <Marker 
      position={[position[1], position[0]]} // Leaflet uses [lat, lng] order
      interactive={false} 
    />
  ) : null;
};

// Helper functions to map between backend and frontend values
const mapBackendToFrontendChargerType = (backendType) => {
  switch(backendType) {
    case 'Level1': return 'Level 1';
    case 'Level2': return 'Level 2';
    case 'DC_Fast': return 'DC Fast Charging';
    default: return '';
  }
};

const mapBackendToFrontendConnectorType = (backendConnector) => {
  switch(backendConnector) {
    case 'J1772': return 'J1772';
    case 'CCS': return 'CCS1';
    case 'Tesla': return 'Tesla';
    case 'CHAdeMO': return 'CHAdeMO';
    default: return '';
  }
};

const ChargerFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [coordinates, setCoordinates] = useState([0, 0]);
  const [geocodingStatus, setGeocodingStatus] = useState('idle'); // idle, loading, success, error
  const [mapCenter, setMapCenter] = useState([37.7749, -122.4194]); // Default to San Francisco
  const [deletingImageIndex, setDeletingImageIndex] = useState(null); // Track which image is being deleted
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm();

  // Redirect if not a charger owner
  useEffect(() => {
    if (user && user.role !== 'charger_owner') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch charger data when editing
  useEffect(() => {
    if (isEditMode && id) {
      setLoading(true);
      chargerAPI.getById(id)
        .then(response => {
          if (response.data.success) {
            const chargerData = response.data.data;
            
            // Map backend data to form fields
            reset({
              name: chargerData.title,
              description: chargerData.description,
              address: chargerData.location?.address,
              accessInstructions: chargerData.location?.accessInstructions,
              chargerType: mapBackendToFrontendChargerType(chargerData.specifications?.type),
              connectorType: mapBackendToFrontendConnectorType(chargerData.specifications?.connector),
              powerOutput: chargerData.specifications?.power,
              pricePerHour: chargerData.pricing?.hourlyRate,
              amenities: chargerData.amenities?.join(', ')
            });
            
            // Set coordinates and update map if available
            if (chargerData.location?.coordinates && 
                Array.isArray(chargerData.location.coordinates) && 
                chargerData.location.coordinates.length === 2) {
              const coords = chargerData.location.coordinates;
              setCoordinates(coords);
              setMapCenter([coords[1], coords[0]]); // Leaflet uses [lat, lng] order
            }
            
            setImages(chargerData.images || []);
          } else {
            setError('Failed to load charger data');
          }
        })
        .catch(err => {
          console.error('Error fetching charger:', err);
          setError('Failed to load charger data');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isEditMode, id, reset]);

  const handleImageChange = (e) => {
    e.preventDefault();
    
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Limit to 5 images total
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setError('Maximum 5 images allowed');
      return;
    }
    
    const newFiles = files.slice(0, remainingSlots);
    
    // Create preview URLs
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    
    setImageFiles(prevFiles => [...prevFiles, ...newFiles]);
    setImagePreviewUrls(prevUrls => [...prevUrls, ...newPreviewUrls]);
  };

  const handleRemoveImage = async (index) => {
    // If it's an existing image (from server)
    if (index < images.length) {
      const imageToDelete = images[index];
      console.log('Removing existing image:', imageToDelete);
      
      // If we're in edit mode and have a charger ID, delete from S3 via API
      if (isEditMode && id) {
        setDeletingImageIndex(index); // Set loading state
        try {
          // Extract the S3 key or use the full URL for the API call
          let imageId = imageToDelete;
          
          // If it's a signed URL, extract the S3 key
          if (imageToDelete.includes('amazonaws.com')) {
            try {
              const url = new URL(imageToDelete);
              // Extract the path without the leading slash
              const s3Key = url.pathname.substring(1);
              imageId = s3Key; // This will be something like 'chargers/uuid.jpg'
              console.log('Extracted S3 key from signed URL:', s3Key);
            } catch (error) {
              console.error('Error parsing signed URL:', error);
              // Fallback to original method
              const urlParts = imageToDelete.split('/');
              const keyPart = urlParts.slice(-1)[0].split('?')[0];
              imageId = keyPart;
            }
          }
          
          console.log('Calling API to delete image:', imageId);
          
          // Call the API to delete the image from S3
          await chargerAPI.deleteImage(id, imageId);
          console.log('Successfully deleted image from S3');
          
          // Show success message
          setSuccess('Image deleted successfully');
          setTimeout(() => setSuccess(''), 3000); // Clear success message after 3 seconds
          
        } catch (error) {
          console.error('Error deleting image from S3:', error);
          // Show error to user but continue with local removal
          setError('Failed to delete image from server. Please try again.');
        } finally {
          setDeletingImageIndex(null); // Clear loading state
        }
      }
      
      // Remove from local state
      setImages(prevImages => prevImages.filter((_, i) => i !== index));
      setImagePreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
    } 
    // If it's a new image (not yet uploaded)
    else {
      const newFileIndex = index - images.length;
      setImageFiles(prevFiles => prevFiles.filter((_, i) => i !== newFileIndex));
      setImagePreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
    }
  };

  // Geocode address to get coordinates
  const geocodeAddress = async (address) => {
    if (!address) return [0, 0];
    
    setGeocodingStatus('loading');
    try {
      // Use Nominatim API directly
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'EVChargerShare/1.0' // Required by Nominatim usage policy
        }
      });
      
      if (response.data && response.data.length > 0) {
        const place = response.data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        
        // Ensure we have valid numbers
        if (isNaN(lat) || isNaN(lon)) {
          console.error('Invalid coordinates from geocoding response:', place);
          setGeocodingStatus('error');
          return [0, 0];
        }
        
        // Store as [longitude, latitude] to match backend format
        const newCoords = [lon, lat]; 
        console.log('Geocoded coordinates:', newCoords);
        
        setCoordinates(newCoords);
        setMapCenter([lat, lon]); // Update map center (note: Leaflet uses [lat, lng] order)
        setGeocodingStatus('success');
        return newCoords; // Return for immediate use
      } else {
        console.error('No results from geocoding');
        setGeocodingStatus('error');
        return [0, 0]; // Default fallback
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setGeocodingStatus('error');
      return [0, 0]; // Default fallback
    }
  };
  
  // Listen for address changes to update coordinates
  useEffect(() => {
    const addressField = document.querySelector('input[name="address"]');
    if (addressField) {
      const handleBlur = async () => {
        if (addressField.value && addressField.value.length > 5) {
          await geocodeAddress(addressField.value);
        }
      };
      
      addressField.addEventListener('blur', handleBlur);
      return () => addressField.removeEventListener('blur', handleBlur);
    }
  }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Always geocode the address to get fresh coordinates when submitting
      // This ensures we have the latest coordinates for the address
      let locationCoordinates = coordinates;
      
      if (data.address) {
        console.log('Geocoding address on submit:', data.address);
        locationCoordinates = await geocodeAddress(data.address);
        console.log('Geocoded coordinates on submit:', locationCoordinates);
      }
      
      // Transform data to match backend expectations
      const transformedData = {
        title: data.name,
        description: data.description,
        address: data.address,
        coordinates: locationCoordinates, // Use geocoded coordinates
        accessInstructions: data.accessInstructions,
        type: (() => {
          switch(data.chargerType) {
            case 'Level 1': return 'Level1';
            case 'Level 2': return 'Level2';
            case 'DC Fast Charging': return 'DC_Fast';
            case 'Tesla Supercharger': return 'DC_Fast'; // Tesla Supercharger is also DC Fast
            default: return data.chargerType;
          }
        })(),
        connector: (() => {
          switch(data.connectorType) {
            case 'CCS1': return 'CCS';
            case 'CCS2': return 'CCS';
            case 'Type 2': return 'J1772'; // Map Type 2 to J1772 as closest match
            case 'J1772': return 'J1772';
            case 'Tesla': return 'Tesla';
            case 'CHAdeMO': return 'CHAdeMO';
            default: return data.connectorType;
          }
        })(),
        power: parseFloat(data.powerOutput),
        hourlyRate: parseFloat(data.pricePerHour),
        amenities: data.amenities ? data.amenities.split(',').map(a => {
          const amenity = a.trim().toLowerCase();
          // Map common variations to valid values
          const amenityMap = {
            'wifi': 'wifi',
            'wi-fi': 'wifi',
            'parking': 'parking',
            'covered': 'covered',
            'security': 'security_camera',
            'security_camera': 'security_camera',
            'restroom': 'restroom',
            'bathroom': 'restroom',
            'lighting': 'lighting',
            'lights': 'lighting'
          };
          return amenityMap[amenity] || amenity;
        }).filter(a => ['covered', 'security_camera', 'restroom', 'wifi', 'parking', 'lighting'].includes(a)) : []
      };
      
      let response;
      
      // Log the coordinates before submission
      console.log('Coordinates before submission:', transformedData.coordinates);
      
      // Ensure coordinates are valid before sending
      const validCoords = Array.isArray(transformedData.coordinates) && 
                         transformedData.coordinates.length === 2 && 
                         !isNaN(transformedData.coordinates[0]) && 
                         !isNaN(transformedData.coordinates[1]) ? 
                         transformedData.coordinates : [0, 0];
      
      console.log('Validated coordinates:', validCoords);
      
      if (isEditMode) {
        // For PUT requests with images, we need to use FormData
        const formData = new FormData();
        
        // Use validCoords that we already validated above
        console.log('Sending PUT with coordinates:', validCoords);
        
        // Add basic fields
        formData.append('title', transformedData.title);
        formData.append('description', transformedData.description);
        formData.append('address', transformedData.address);
        formData.append('coordinates', JSON.stringify(validCoords));
        formData.append('accessInstructions', transformedData.accessInstructions || '');
        
        // Add specification fields
        formData.append('type', transformedData.type);
        formData.append('connector', transformedData.connector);
        formData.append('power', transformedData.power);
        if (transformedData.voltage) formData.append('voltage', transformedData.voltage);
        if (transformedData.amperage) formData.append('amperage', transformedData.amperage);
        
        // Add pricing fields
        formData.append('hourlyRate', transformedData.hourlyRate);
        formData.append('currency', transformedData.currency || 'USD');
        
        // Add amenities as JSON string
        formData.append('amenities', JSON.stringify(transformedData.amenities));
        
        // Add existing images
        if (images.length > 0) {
          formData.append('existingImages', JSON.stringify(images));
        }
        
        // Add new image files
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
        
        console.log('Sending update with images:', imageFiles.length > 0);
        
        // For PUT requests with images, we use FormData
        response = await chargerAPI.update(id, formData);
      } else {
        // For POST requests, we use FormData (for file uploads)
        const formData = new FormData();
        
        // Use validCoords that we already validated above
        console.log('Sending POST with coordinates:', validCoords);
        
        Object.keys(transformedData).forEach(key => {
          if (key === 'amenities') {
            // Handle amenities array - send as JSON string
            formData.append('amenities', JSON.stringify(transformedData[key]));
          } else if (key === 'coordinates') {
            // Always use our validated coordinates
            formData.append('coordinates', JSON.stringify(validCoords));
          } else {
            formData.append(key, transformedData[key]);
          }
        });
        
        // Add existing images
        if (images.length > 0) {
          formData.append('existingImages', JSON.stringify(images));
        }
        
        // Add new image files
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
        
        response = await chargerAPI.create(formData);
      }
      
      if (response.data.success) {
        setSuccess(isEditMode ? 'Charger updated successfully!' : 'Charger created successfully!');
        
        // Navigate after a short delay
        setTimeout(() => {
          navigate(isEditMode ? `/chargers/${id}` : '/chargers/manage');
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to save charger');
      }
    } catch (err) {
      console.error('Charger save error:', err);
      
      // Handle detailed validation errors
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(error => 
          `${error.field}: ${error.message}`
        ).join(', ');
        setError(`Validation Error: ${errorMessages}`);
      } else if (err.response?.data?.details) {
        setError(`Error: ${err.response.data.details}`);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to save charger. Please check all required fields.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        <EvStation sx={{ mr: 1, verticalAlign: 'middle' }} />
        {isEditMode ? 'Edit Charger' : 'Add New Charger'}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Charger Name"
                variant="outlined"
                fullWidth
                {...register('name', { 
                  required: 'Charger name is required',
                  minLength: {
                    value: 3,
                    message: 'Name must be at least 3 characters'
                  }
                })}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full Address"
                variant="outlined"
                fullWidth
                {...register('address', { required: 'Address is required' })}
                error={!!errors.address}
                helperText={errors.address?.message}
                margin="normal"
                onBlur={(e) => {
                  if (e.target.value && e.target.value.length > 5) {
                    geocodeAddress(e.target.value);
                  }
                }}
              />
              
              {/* Location Map */}
              <Box mt={2} mb={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Charger Location {geocodingStatus === 'loading' && '(Loading...)'}
                </Typography>
                <Box sx={{ height: '300px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                  <MapContainer 
                    center={mapCenter} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={coordinates} setCoordinates={setCoordinates} />
                  </MapContainer>
                </Box>
                {coordinates[0] !== 0 && coordinates[1] !== 0 && (
                  <Typography variant="caption" color="textSecondary">
                    Selected coordinates: [{coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}]
                  </Typography>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                {...register('description', { 
                  required: 'Description is required',
                  minLength: {
                    value: 20,
                    message: 'Description must be at least 20 characters'
                  }
                })}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            </Grid>
            
            {/* Technical Specifications */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Technical Specifications</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.chargerType}>
                <InputLabel id="charger-type-label">Charger Type</InputLabel>
                <Controller
                  name="chargerType"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Charger type is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="charger-type-label"
                      label="Charger Type"
                    >
                      <MenuItem value="Level 1">Level 1 (120V)</MenuItem>
                      <MenuItem value="Level 2">Level 2 (240V)</MenuItem>
                      <MenuItem value="DC Fast Charging">DC Fast Charging</MenuItem>
                      <MenuItem value="Tesla Supercharger">Tesla Supercharger</MenuItem>
                    </Select>
                  )}
                />
                {errors.chargerType && <FormHelperText>{errors.chargerType.message}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.connectorType}>
                <InputLabel id="connector-type-label">Connector Type</InputLabel>
                <Controller
                  name="connectorType"
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Connector type is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="connector-type-label"
                      label="Connector Type"
                    >
                      <MenuItem value="J1772">J1772 (Type 1)</MenuItem>
                      <MenuItem value="CCS1">CCS1 (Combo 1)</MenuItem>
                      <MenuItem value="CCS2">CCS2 (Combo 2)</MenuItem>
                      <MenuItem value="CHAdeMO">CHAdeMO</MenuItem>
                      <MenuItem value="Tesla">Tesla</MenuItem>
                      <MenuItem value="Type 2">Type 2 (Mennekes)</MenuItem>
                    </Select>
                  )}
                />
                {errors.connectorType && <FormHelperText>{errors.connectorType.message}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Power Output (kW)"
                variant="outlined"
                fullWidth
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">kW</InputAdornment>,
                }}
                {...register('powerOutput', { 
                  required: 'Power output is required',
                  min: {
                    value: 1,
                    message: 'Power output must be at least 1 kW'
                  },
                  max: {
                    value: 350,
                    message: 'Power output cannot exceed 350 kW'
                  }
                })}
                error={!!errors.powerOutput}
                helperText={errors.powerOutput?.message}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Price Per Hour"
                variant="outlined"
                fullWidth
                type="number"
                step="0.01"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                {...register('pricePerHour', { 
                  required: 'Price per hour is required',
                  min: {
                    value: 0,
                    message: 'Price cannot be negative'
                  }
                })}
                error={!!errors.pricePerHour}
                helperText={errors.pricePerHour?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl component="fieldset" error={!!errors.availability}>
                <FormLabel component="legend">Availability</FormLabel>
                <Controller
                  name="availability"
                  control={control}
                  defaultValue="always"
                  render={({ field }) => (
                    <RadioGroup row {...field}>
                      <FormControlLabel value="always" control={<Radio />} label="Always Available" />
                      <FormControlLabel value="scheduled" control={<Radio />} label="Scheduled Hours" />
                      <FormControlLabel value="onDemand" control={<Radio />} label="On Demand" />
                    </RadioGroup>
                  )}
                />
                {errors.availability && <FormHelperText>{errors.availability.message}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Additional Information</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Access Instructions"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                placeholder="Provide instructions on how to access your charger"
                {...register('accessInstructions')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Amenities"
                variant="outlined"
                fullWidth
                placeholder="e.g., Restroom access, WiFi, Coffee shop nearby"
                {...register('amenities')}
              />
            </Grid>
            
            {/* Images */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Charger Images</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Upload up to 5 images of your charger and its location (Max 5MB each)
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ mb: 2 }}
              >
                Upload Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleImageChange}
                />
              </Button>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {/* Display existing images from server */}
                {images.map((img, index) => (
                  <Box
                    key={`existing-${index}`}
                    sx={{
                      position: 'relative',
                      width: 100,
                      height: 100,
                      border: '1px solid #ccc',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={img.startsWith('http') ? img : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${img}`}
                      alt={`Existing Charger ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      disabled={deletingImageIndex === index}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        }
                      }}
                      onClick={() => handleRemoveImage(index)}
                    >
                      {deletingImageIndex === index ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Delete fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                ))}
                
                {/* Display new image previews */}
                {imagePreviewUrls.map((url, index) => (
                  <Box
                    key={`new-${index}`}
                    sx={{
                      position: 'relative',
                      width: 100,
                      height: 100,
                      border: '1px solid #ccc',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={url}
                      alt={`New Charger ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        }
                      }}
                      onClick={() => handleRemoveImage(images.length + index)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
            
            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
                sx={{ py: 1.5, px: 4 }}
              >
                {submitting ? (
                  <CircularProgress size={24} />
                ) : isEditMode ? (
                  'Update Charger'
                ) : (
                  'Create Charger'
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{ ml: 2, py: 1.5, px: 4 }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ChargerFormPage;
