import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Rating,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardMedia
} from '@mui/material';
import {
  Star,
  ArrowBack,
  Send
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';

const ReviewFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const bookingId = queryParams.get('bookingId');
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(`/api/bookings/${bookingId}`);
        if (response.data.success) {
          const bookingData = response.data.data.booking;
          
          // Check if this booking can be reviewed
          if (bookingData.status !== 'completed') {
            setError('Only completed bookings can be reviewed');
          } else if (bookingData.hasReview) {
            setError('You have already reviewed this booking');
          } else if (bookingData.user._id !== user._id) {
            setError('You can only review your own bookings');
          } else {
            setBooking(bookingData);
          }
        } else {
          setError('Failed to load booking details');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Error loading booking details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBookingDetails();
    } else {
      setError('You must be logged in to leave a review');
      setLoading(false);
    }
  }, [bookingId, user]);

  const validateForm = () => {
    const errors = {};
    
    if (rating === 0) {
      errors.rating = 'Please select a rating';
    }
    
    if (!comment.trim()) {
      errors.comment = 'Please provide a comment';
    } else if (comment.trim().length < 10) {
      errors.comment = 'Comment must be at least 10 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const reviewData = {
        bookingId,
        chargerId: booking.charger._id,
        rating,
        comment
      };
      
      const response = await axios.post('/api/reviews', reviewData);
      
      if (response.data.success) {
        toast.success('Review submitted successfully!');
        navigate(`/bookings/${bookingId}`);
      } else {
        toast.error(response.data.error?.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error(err.response?.data?.error?.message || 'An error occurred while submitting the review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading booking details..." />;
  }

  if (error) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          component={Link} 
          to="/bookings" 
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Bookings
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button 
        component={Link} 
        to={`/bookings/${bookingId}`} 
        startIcon={<ArrowBack />}
        sx={{ mb: 3 }}
      >
        Back to Booking
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        <Star sx={{ mr: 1, verticalAlign: 'middle' }} />
        Leave a Review
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom>
                How was your experience with this charger?
              </Typography>
              
              <Box mb={3}>
                <Typography component="legend" gutterBottom>Rating *</Typography>
                <Rating
                  name="review-rating"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue);
                    if (newValue > 0 && formErrors.rating) {
                      setFormErrors(prev => ({ ...prev, rating: undefined }));
                    }
                  }}
                  size="large"
                  precision={0.5}
                />
                {formErrors.rating && (
                  <Typography color="error" variant="caption" display="block">
                    {formErrors.rating}
                  </Typography>
                )}
              </Box>
              
              <Box mb={3}>
                <TextField
                  label="Your Review *"
                  multiline
                  rows={6}
                  fullWidth
                  variant="outlined"
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (e.target.value.trim().length >= 10 && formErrors.comment) {
                      setFormErrors(prev => ({ ...prev, comment: undefined }));
                    }
                  }}
                  placeholder="Share your experience with this charger. What did you like? What could be improved?"
                  error={!!formErrors.comment}
                  helperText={formErrors.comment}
                />
              </Box>
              
              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            {booking.charger.images && booking.charger.images.length > 0 && (
              <CardMedia
                component="img"
                height="200"
                image={booking.charger.images[0]}
                alt={booking.charger.name}
              />
            )}
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {booking.charger.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {booking.charger.address}
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Booking Details
              </Typography>
              
              <Typography variant="body2">
                Date: {new Date(booking.startTime).toLocaleDateString()}
              </Typography>
              
              <Typography variant="body2">
                Time: {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(booking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Typography>
              
              <Typography variant="body2">
                Total: ${booking.totalPrice.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
          
          <Box mt={2}>
            <Alert severity="info">
              Your review helps other users make informed decisions. Please be honest and constructive in your feedback.
            </Alert>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReviewFormPage;
