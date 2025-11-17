import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  CalendarToday,
  EvStation,
  LocationOn,
  AccessTime,
  AttachMoney,
  Cancel,
  Check,
  ArrowBack
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';

const BookingManagementPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Filter states
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await bookingAPI.getUserBookings();
        if (response.data.success) {
          const allBookings = response.data.data.bookings;
          setBookings(allBookings);
          
          // Filter bookings by status and date
          const now = new Date();
          
          setUpcomingBookings(
            allBookings.filter(booking => 
              (booking.status === 'confirmed' || booking.status === 'pending') && 
              new Date(booking.schedule?.endTime) >= now
            )
          );
          
          setPastBookings(
            allBookings.filter(booking => 
              booking.status === 'completed' || 
              (booking.status === 'confirmed' && new Date(booking.schedule?.endTime) < now)
            )
          );
          
          setCancelledBookings(
            allBookings.filter(booking => booking.status === 'cancelled')
          );
        } else {
          setError('Failed to load bookings');
        }
      } catch (err) {
        setError('Error loading bookings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
    setCancelError('');
  };

  const handleCancelConfirm = async () => {
    if (!bookingToCancel) return;
    
    setCancelLoading(true);
    setCancelError('');
    
    try {
      const response = await bookingAPI.cancel(bookingToCancel._id);
      
      if (response.data.success) {
        // Update booking in state
        const updatedBooking = response.data.data;
        
        setBookings(prevBookings => 
          prevBookings.map(b => 
            b._id === updatedBooking._id ? updatedBooking : b
          )
        );
        
        // Move booking from upcoming to cancelled
        setUpcomingBookings(prev => prev.filter(b => b._id !== updatedBooking._id));
        setCancelledBookings(prev => [...prev, updatedBooking]);
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
    setBookingToCancel(null);
    setCancelError('');
  };

  const renderBookingList = (bookingList) => {
    if (bookingList.length === 0) {
      return (
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No bookings found
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            to="/chargers"
          >
            Find Chargers
          </Button>
        </Paper>
      );
    }

    return (
      <List>
        {bookingList.map((booking) => (
          <Card key={booking._id} sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Box display="flex" alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        <EvStation />
                      </Avatar>
                    </ListItemAvatar>
                    <Box>
                      <Box display="flex" alignItems="center">
                        <Typography variant="h6" component="div">
                          {booking.charger.title}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={booking.status} 
                          color={
                            booking.status === 'confirmed' ? 'success' : 
                            booking.status === 'pending' ? 'warning' : 
                            booking.status === 'completed' ? 'info' :
                            booking.status === 'cancelled' ? 'error' : 'default'
                          }
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      <Box display="flex" alignItems="center" mt={0.5}>
                        <LocationOn fontSize="small" color="action" sx={{ mr: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {booking.charger.location?.address}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <CalendarToday fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {new Date(booking.schedule?.startTime).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <AccessTime fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {new Date(booking.schedule?.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {' '} - {' '}
                          {new Date(booking.schedule?.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <AttachMoney fontSize="small" color="primary" />
                        <Typography variant="body1" fontWeight="bold">
                          ${booking.pricing?.totalAmount?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Booking ID: {booking._id.substring(0, 8)}...
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                
                <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    component={Link}
                    to={`/bookings/${booking._id}`}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    View Details
                  </Button>
                  
                  {booking.status === 'confirmed' && new Date(booking.schedule?.startTime) > new Date() && (
                    <Button 
                      variant="outlined" 
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleCancelClick(booking)}
                      fullWidth
                    >
                      Cancel Booking
                    </Button>
                  )}
                  
                  {booking.status === 'completed' && !booking.hasReview && (
                    <Button 
                      variant="outlined" 
                      color="secondary"
                      component={Link}
                      to={`/reviews/new?bookingId=${booking._id}`}
                      fullWidth
                    >
                      Leave Review
                    </Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </List>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading your bookings..." />;
  }

  if (error) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          component={Link} 
          to="/dashboard" 
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
        My Bookings
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            label={`Upcoming (${upcomingBookings.length})`} 
            id="bookings-tab-0"
            aria-controls="bookings-tabpanel-0"
          />
          <Tab 
            label={`Past (${pastBookings.length})`} 
            id="bookings-tab-1"
            aria-controls="bookings-tabpanel-1"
          />
          <Tab 
            label={`Cancelled (${cancelledBookings.length})`} 
            id="bookings-tab-2"
            aria-controls="bookings-tabpanel-2"
          />
        </Tabs>
      </Paper>
      
      <Box role="tabpanel" hidden={tabValue !== 0} id="bookings-tabpanel-0" aria-labelledby="bookings-tab-0">
        {tabValue === 0 && renderBookingList(upcomingBookings)}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 1} id="bookings-tabpanel-1" aria-labelledby="bookings-tab-1">
        {tabValue === 1 && renderBookingList(pastBookings)}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 2} id="bookings-tabpanel-2" aria-labelledby="bookings-tab-2">
        {tabValue === 2 && renderBookingList(cancelledBookings)}
      </Box>
      
      {/* Cancel Booking Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCancelDialogClose}
      >
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          
          <DialogContentText>
            Are you sure you want to cancel your booking at {bookingToCancel?.charger.name} on {bookingToCancel ? new Date(bookingToCancel.startTime).toLocaleDateString() : ''}?
            
            {bookingToCancel && new Date(bookingToCancel.startTime) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && (
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
    </Box>
  );
};

export default BookingManagementPage;
