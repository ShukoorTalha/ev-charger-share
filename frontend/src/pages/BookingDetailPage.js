import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, ratingAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Rating,
  TextField
} from '@mui/material';
import {
  CalendarToday,
  EvStation,
  LocationOn,
  AccessTime,
  AttachMoney,
  Cancel,
  ArrowBack,
  Receipt,
  Star,
  Person,
  Phone,
  Email
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Cancel booking state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  
  // Review state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const response = await bookingAPI.getById(id);
        if (response.data.success) {
          setBooking(response.data.data);
        } else {
          setError('Failed to load booking details');
        }
      } catch (err) {
        setError('Error loading booking details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [id]);

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
    setCancelError('');
  };

  const handleCancelConfirm = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      const response = await bookingAPI.cancel(id);
      if (response.data.success) {
        setBooking(response.data.data);
      } else {
        setCancelError(response.data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      setCancelError('An error occurred while cancelling the booking');
    } finally {
      setCancelLoading(false);
      setCancelDialogOpen(false);
    }
  };

  const handleCancelDialogClose = () => {
    setCancelDialogOpen(false);
    setCancelError('');
  };

  const handleReviewClick = () => {
    setReviewDialogOpen(true);
    setReviewError('');
  };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0) {
      setReviewError('Please select a rating');
      return;
    }
    setReviewLoading(true);
    setReviewError('');
    try {
      const reviewData = {
        bookingId: id,
        chargerId: booking.charger._id,
        rating: reviewRating,
        comment: reviewComment
      };
      const response = await ratingAPI.create(reviewData);
      if (response.data.success) {
        setBooking(prev => ({
          ...prev,
          hasReview: true,
          review: response.data.data.review
        }));
        setReviewDialogOpen(false);
      } else {
        setReviewError(response.data.message || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError('An error occurred while submitting the review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewDialogClose = () => {
    setReviewDialogOpen(false);
    setReviewError('');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes > 0 ? ` ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : ''}`;
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

  if (!booking) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="warning">Booking not found</Alert>
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

  const isUpcoming = new Date(booking.schedule.startTime) > new Date();
  const isPast = new Date(booking.schedule.endTime) < new Date();
  const canCancel = booking.status === 'confirmed' && isUpcoming;
  const canReview = booking.status === 'completed' && !booking.hasReview;
  const isOwner = user && booking.charger && user._id === booking.charger.owner;

  return (
    <Box>
      <Button 
        component={Link} 
        to="/bookings" 
        startIcon={<ArrowBack />}
        sx={{ mb: 3 }}
      >
        Back to Bookings
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
        Booking Details
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" component="h2">
                {booking.charger.title}
              </Typography>
              <Chip 
                label={booking.status} 
                color={
                  booking.status === 'confirmed' ? 'success' : 
                  booking.status === 'pending' ? 'warning' : 
                  booking.status === 'completed' ? 'info' :
                  booking.status === 'cancelled' ? 'error' : 'default'
                }
              />
            </Box>

            <Box display="flex" alignItems="center" mb={2}>
              <LocationOn color="primary" sx={{ mr: 1 }} />
              <Typography variant="body1">{booking.charger.location?.address}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>Booking Information</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Start Time</Typography>
                <Typography variant="body1">{formatDateTime(booking.schedule.startTime)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">End Time</Typography>
                <Typography variant="body1">{formatDateTime(booking.schedule.endTime)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                <Typography variant="body1">{calculateDuration(booking.schedule.startTime, booking.schedule.endTime)}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Booking ID</Typography>
                <Typography variant="body1">{booking._id}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Created On</Typography>
                <Typography variant="body1">{new Date(booking.createdAt).toLocaleDateString()}</Typography>
              </Grid>
              
              {booking.cancelledAt && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Cancelled On</Typography>
                  <Typography variant="body1">{new Date(booking.cancelledAt).toLocaleDateString()}</Typography>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>Charger Details</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Charger Type</Typography>
                <Typography variant="body1">{booking.charger.specifications?.type}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Power Output</Typography>
                <Typography variant="body1">{booking.charger.specifications?.power} kW</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Connector Type</Typography>
                <Typography variant="body1">{booking.charger.specifications?.connector}</Typography>
              </Grid>
            </Grid>

            {booking.charger.location?.accessInstructions && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Access Instructions</Typography>
                <Typography variant="body1">{booking.charger.location.accessInstructions}</Typography>
              </>
            )}

            {booking.review && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Your Review</Typography>
                <Box mb={1}>
                  <Rating value={booking.review.rating} readOnly />
                </Box>
                <Typography variant="body1">{booking.review.comment}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Submitted on {new Date(booking.review.createdAt).toLocaleDateString()}
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
              Payment Summary
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Price per hour" 
                  secondary={`$${booking.charger.pricing?.hourlyRate?.toFixed(2) || '0.00'}`} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Duration" 
                  secondary={calculateDuration(booking.schedule.startTime, booking.schedule.endTime)} 
                />
              </ListItem>
              
              <Divider component="li" />
              
              <ListItem>
                <ListItemText 
                  primary={<Typography variant="subtitle1" fontWeight="bold">Total</Typography>} 
                  secondary={<Typography variant="subtitle1" fontWeight="bold">${booking.pricing?.totalAmount?.toFixed(2) || '0.00'}</Typography>} 
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Payment Status" 
                  secondary={
                    <Chip 
                      size="small" 
                      label={booking.payment?.status || 'Pending'} 
                      color={booking.payment?.status === 'paid' ? 'success' : 'warning'}
                    />
                  } 
                />
              </ListItem>
            </List>
            
            {booking.payment?.status === 'paid' && (
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Receipt />}
                sx={{ mt: 1 }}
              >
                View Receipt
              </Button>
            )}
          </Paper>

          {isOwner ? (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                User Information
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Person fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Name" 
                    secondary={`${booking.user.profile?.firstName || ''} ${booking.user.profile?.lastName || ''}`} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Email fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email" 
                    secondary={booking.user.email} 
                  />
                </ListItem>
                
                {booking.user.phone && (
                  <ListItem>
                    <ListItemIcon>
                      <Phone fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Phone" 
                      secondary={booking.user.phone} 
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          ) : (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              
              {canCancel && (
                <Button 
                  variant="contained" 
                  color="error" 
                  fullWidth 
                  startIcon={<Cancel />}
                  onClick={handleCancelClick}
                  sx={{ mb: 2 }}
                >
                  Cancel Booking
                </Button>
              )}
              
              {canReview && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  startIcon={<Star />}
                  onClick={handleReviewClick}
                >
                  Leave Review
                </Button>
              )}
              
              {!canCancel && !canReview && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  component={Link}
                  to={`/chargers/${booking.charger._id}`}
                >
                  View Charger
                </Button>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Cancel Booking Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCancelDialogClose}
      >
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          
          <DialogContentText>
            Are you sure you want to cancel your booking at {booking.charger.name} on {new Date(booking.startTime).toLocaleDateString()}?
            
            {new Date(booking.startTime) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && (
              <Box component="span" sx={{ display: 'block', mt: 2, color: 'error.main', fontWeight: 'bold' }}>
                Warning: This booking is within 24 hours. You may be charged a cancellation fee.
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} disabled={cancelLoading}>
            Keep Booking
          </Button>
          <Button 
            onClick={handleCancelConfirm} 
            color="error" 
            variant="contained"
            disabled={cancelLoading}
            startIcon={cancelLoading ? <CircularProgress size={20} /> : <Cancel />}
          >
            {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={handleReviewDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Leave a Review</DialogTitle>
        <DialogContent>
          {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}
          
          <Typography variant="subtitle1" gutterBottom>
            How was your experience at {booking.charger.name}?
          </Typography>
          
          <Box display="flex" alignItems="center" mb={2}>
            <Typography component="legend" mr={2}>Rating:</Typography>
            <Rating
              name="review-rating"
              value={reviewRating}
              onChange={(event, newValue) => {
                setReviewRating(newValue);
              }}
              size="large"
            />
          </Box>
          
          <TextField
            label="Comments"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience with this charger..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReviewDialogClose} disabled={reviewLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleReviewSubmit} 
            color="primary" 
            variant="contained"
            disabled={reviewLoading || reviewRating === 0}
            startIcon={reviewLoading ? <CircularProgress size={20} /> : <Star />}
          >
            {reviewLoading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingDetailPage;
