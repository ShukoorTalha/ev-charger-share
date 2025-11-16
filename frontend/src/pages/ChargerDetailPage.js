import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { chargerAPI, bookingAPI, ratingAPI } from '../services/api';
import ChargerMap from '../components/ChargerMap';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Rating,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import {
  EvStation,
  LocationOn,
  Power,
  AttachMoney,
  AccessTime,
  Info,
  Star,
  CalendarToday,
  ArrowBack,
  Edit,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';

const ChargerDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [charger, setCharger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchChargerDetails = async () => {
      try {
        const response = await chargerAPI.getById(id);
        if (response.data.success) {
          setCharger(response.data.data); // API returns charger directly in data
          // Fetch reviews
          try {
            const reviewsResponse = await ratingAPI.getByCharger(id);
            if (reviewsResponse.data.success) {
              setReviews(reviewsResponse.data.data.reviews);
            }
          } catch (reviewErr) {
            console.error('Error fetching reviews:', reviewErr);
          }
        } else {
          setError('Failed to load charger details');
        }
      } catch (err) {
        console.error('Error fetching charger:', err);
        setError('Error loading charger details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchChargerDetails();
  }, [id]);

  const handleBookingDialogOpen = () => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/chargers/${id}`;
      return;
    }
    setBookingDialogOpen(true);
  };

  const handleBookingDialogClose = () => {
    setBookingDialogOpen(false);
    setBookingError('');
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate || !startTime || !endTime) {
      setBookingError('Please fill in all booking details');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const bookingData = {
        chargerId: id,
        startTime: `${selectedDate}T${startTime}:00`,
        endTime: `${selectedDate}T${endTime}:00`
      };

      const response = await bookingAPI.create(bookingData);
      
      if (response.data.success) {
        window.location.href = `/bookings/${response.data.data._id}`;
      } else {
        setBookingError(response.data.message || 'Failed to create booking');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(err.response?.data?.message || 'An error occurred while creating the booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const nextImage = () => {
    if (charger?.images && Array.isArray(charger.images) && charger.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === charger.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevImage = () => {
    if (charger?.images && Array.isArray(charger.images) && charger.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? charger.images.length - 1 : prevIndex - 1
      );
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading charger details..." />;
  }

  if (error) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          component={Link} 
          to="/chargers" 
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Chargers
        </Button>
      </Box>
    );
  }

  if (!charger) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="warning">Charger not found</Alert>
        <Button 
          component={Link} 
          to="/chargers" 
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Chargers
        </Button>
      </Box>
    );
  }

  // Calculate average rating
  const averageRating = Array.isArray(reviews) && reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <Box>
      <Button 
        component={Link} 
        to="/chargers" 
        startIcon={<ArrowBack />}
        sx={{ mb: 3 }}
      >
        Back to Chargers
      </Button>

      <Grid container spacing={4}>
        {/* Charger Images and Main Info */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
            <Box sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height="400"
image={charger.images && Array.isArray(charger.images) && charger.images.length > 0 
                  ? (charger.images[currentImageIndex].startsWith('http') 
                     ? charger.images[currentImageIndex] // S3 URL or external URL
                     : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${charger.images[currentImageIndex]}`) // Local path
                  : 'https://via.placeholder.com/800x400?text=No+Image+Available'}
                alt={charger.title || 'Charger Image'}
              />
              {charger.images && Array.isArray(charger.images) && charger.images.length > 1 && (
                <>
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      left: 8, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                    }}
                    onClick={prevImage}
                  >
                    <ChevronLeft />
                  </IconButton>
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      right: 8, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                    }}
                    onClick={nextImage}
                  >
                    <ChevronRight />
                  </IconButton>
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 8, 
                      right: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      px: 1,
                      borderRadius: 1,
                      fontSize: '0.8rem'
                    }}
                  >
                    {currentImageIndex + 1} / {Array.isArray(charger.images) ? charger.images.length : 0}
                  </Box>
                </>
              )}
            </Box>

            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h4" component="h1" gutterBottom>
                  {charger.title}
                </Typography>
                <Chip 
                  label={charger.status} 
                  color={
                    charger.status === 'active' ? 'success' : 
                    charger.status === 'pending' ? 'warning' : 
                    'default'
                  }
                />
              </Box>

              <Box display="flex" alignItems="center" mb={2}>
                <LocationOn color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1">{charger.location?.address}</Typography>
              </Box>
              
              {/* Map display */}
              {charger.location && charger.location.coordinates && (
                <Box sx={{ height: 300, width: '100%', mb: 2, borderRadius: 1, overflow: 'hidden' }}>
                  <ChargerMap
                    chargers={[charger]}
                    center={[charger.location.coordinates[1], charger.location.coordinates[0]]}
                    zoom={15}
                    height="100%"
                  />
                </Box>
              )}

              <Box display="flex" alignItems="center" mb={2}>
                <Rating 
                  value={averageRating} 
                  precision={0.5} 
                  readOnly 
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2">
                  {averageRating.toFixed(1)} ({Array.isArray(reviews) ? reviews.length : 0} {Array.isArray(reviews) && reviews.length === 1 ? 'review' : 'reviews'})
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Description</Typography>
              <Typography variant="body1" paragraph>
                {charger.description}
              </Typography>

              {charger.location?.accessInstructions && (
                <>
                  <Typography variant="h6" gutterBottom>Access Instructions</Typography>
                  <Typography variant="body1" paragraph>
                    {charger.location?.accessInstructions}
                  </Typography>
                </>
              )}

              {charger.amenities && Array.isArray(charger.amenities) && charger.amenities.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>Amenities</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {charger.amenities.map((amenity, index) => (
                      <Chip 
                        key={index} 
                        label={amenity.charAt(0).toUpperCase() + amenity.slice(1).replace('_', ' ')} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    ))}
                  </Box>
                </>
              )}
            </Box>
          </Paper>

          {/* Reviews Section */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              <Star sx={{ mr: 1, verticalAlign: 'middle' }} />
              Reviews
            </Typography>

            {!Array.isArray(reviews) || reviews.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                No reviews yet
              </Typography>
            ) : (
              <List>
                {reviews.map((review) => (
                  <React.Fragment key={review._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <Avatar>{review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}</Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="subtitle1">
                              {review.user.firstName} {review.user.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Rating value={review.rating} readOnly size="small" sx={{ mb: 1 }} />
                            <Typography variant="body2" color="text.primary">
                              {review.comment}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Booking and Details Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
              ${charger.pricing?.hourlyRate.toFixed(2)}/hour
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={handleBookingDialogOpen}
              sx={{ mb: 2 }}
            >
              Book Now
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Charger Details
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <EvStation />
                </ListItemIcon>
                <ListItemText 
                  primary="Charger Type" 
                  secondary={charger.specifications?.type} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Power />
                </ListItemIcon>
                <ListItemText 
                  primary="Power Output" 
                  secondary={`${charger.specifications?.power} kW`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText 
                  primary="Connector Type" 
                  secondary={charger.specifications?.connector} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <AccessTime />
                </ListItemIcon>
                <ListItemText 
                  primary="Availability" 
                  secondary={
                    charger.availability === 'always' ? 'Always Available' :
                    charger.availability === 'scheduled' ? 'Scheduled Hours' :
                    'On Demand'
                  } 
                />
              </ListItem>
              
              {charger.location && charger.location.coordinates && (
                <ListItem>
                  <ListItemIcon>
                    <LocationOn />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Coordinates" 
                    secondary={`${charger.location.coordinates[1].toFixed(6)}, ${charger.location.coordinates[0].toFixed(6)}`} 
                  />
                </ListItem>
              )}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
              Listed by {charger.owner?.profile?.firstName} {charger.owner?.profile?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Member since {charger.owner?.createdAt ? new Date(charger.owner.createdAt).toLocaleDateString() : 'N/A'}
            </Typography>
          </Paper>

          {user && user._id === charger.owner?._id && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Owner Actions
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<Edit />}
                component={Link}
                to={`/chargers/${charger._id}/edit`}
                sx={{ mb: 2 }}
              >
                Edit Charger
              </Button>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<CalendarToday />}
                component={Link}
                to={`/chargers/${charger._id}/bookings`}
              >
                View Bookings
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={handleBookingDialogClose}>
        <DialogTitle>Book {charger.title}</DialogTitle>
        <DialogContent>
          {bookingError && <Alert severity="error" sx={{ mb: 2 }}>{bookingError}</Alert>}
          
          <TextField
            label="Date"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Start Time"
                type="time"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Time"
                type="time"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Grid>
          </Grid>
          
          {selectedDate && startTime && endTime && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2">Booking Summary</Typography>
              <Typography variant="body2">
                Date: {new Date(selectedDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                Time: {startTime} - {endTime}
              </Typography>
              
              {/* Calculate estimated cost if we have valid times */}
              {(() => {
                try {
                  const start = new Date(`${selectedDate}T${startTime}:00`);
                  const end = new Date(`${selectedDate}T${endTime}:00`);
                  const durationHours = (end - start) / (1000 * 60 * 60);
                  
                  if (durationHours > 0) {
                    const estimatedCost = durationHours * charger.pricing?.hourlyRate;
                    return (
                      <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                        Estimated Cost: ${estimatedCost.toFixed(2)}
                      </Typography>
                    );
                  }
                  return null;
                } catch (e) {
                  return null;
                }
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBookingDialogClose}>Cancel</Button>
          <Button 
            onClick={handleBookingSubmit} 
            variant="contained" 
            color="primary"
            disabled={bookingLoading || !selectedDate || !startTime || !endTime}
          >
            {bookingLoading ? <CircularProgress size={24} /> : 'Book Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChargerDetailPage;
