import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ratingAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Rating,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Star,
  StarBorder,
  MoreVert,
  Edit,
  Delete,
  Report,
  ArrowBack,
  Add
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';

const ReviewsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Reviews data
  const [givenReviews, setGivenReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  
  // Edit review dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Menu for review actions
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await ratingAPI.getByUser(user._id);
      
      if (response.data.success) {
        const reviews = response.data.data;
        
        // Separate given and received reviews
        setGivenReviews(reviews.filter(review => review.reviewer._id === user._id));
        setReceivedReviews(reviews.filter(review => review.reviewee._id === user._id));
      }
    } catch (err) {
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event, review) => {
    setAnchorEl(event.currentTarget);
    setSelectedReview(review);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReview(null);
  };

  const handleEditClick = () => {
    setEditingReview(selectedReview);
    setEditRating(selectedReview.rating);
    setEditComment(selectedReview.comment);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeletingReview(selectedReview);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    
    try {
      const response = await ratingAPI.update(editingReview._id, {
        rating: editRating,
        comment: editComment
      });
      
      if (response.data.success) {
        // Update the review in the list
        setGivenReviews(prev => 
          prev.map(review => 
            review._id === editingReview._id 
              ? { ...review, rating: editRating, comment: editComment, updatedAt: new Date().toISOString() }
              : review
          )
        );
        
        setEditDialogOpen(false);
        setEditingReview(null);
      }
    } catch (err) {
      setError('Failed to update review');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    
    try {
      await ratingAPI.delete(deletingReview._id);
      
      // Remove the review from the list
      setGivenReviews(prev => prev.filter(review => review._id !== deletingReview._id));
      
      setDeleteDialogOpen(false);
      setDeletingReview(null);
    } catch (err) {
      setError('Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderReviewCard = (review, isGiven = false) => (
    <Card key={review._id} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="flex-start" flex={1}>
            <Avatar
              src={isGiven ? (review.reviewee?.profile?.avatarUrl || review.reviewee?.profile?.avatar) : (review.reviewer?.profile?.avatarUrl || review.reviewer?.profile?.avatar)}
              sx={{ mr: 2 }}
            >
              {isGiven 
                ? `${review.reviewee?.profile?.firstName?.[0]}${review.reviewee?.profile?.lastName?.[0]}`
                : `${review.reviewer?.profile?.firstName?.[0]}${review.reviewer?.profile?.lastName?.[0]}`
              }
            </Avatar>
            
            <Box flex={1}>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h6" component="div">
                  {isGiven 
                    ? `${review.reviewee?.profile?.firstName} ${review.reviewee?.profile?.lastName}`
                    : `${review.reviewer?.profile?.firstName} ${review.reviewer?.profile?.lastName}`
                  }
                </Typography>
                <Rating value={review.rating} readOnly size="small" sx={{ ml: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({review.rating}/5)
                </Typography>
              </Box>
              
              {review.booking && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Booking for: {review.booking.charger?.title}
                </Typography>
              )}
              
              <Typography variant="body1" paragraph>
                {review.comment}
              </Typography>
              
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {formatDate(review.createdAt)}
                  {review.updatedAt !== review.createdAt && ' (edited)'}
                </Typography>
                
                <Box>
                  {review.type && (
                    <Chip 
                      label={review.type === 'user_to_owner' ? 'For Owner' : 'For User'} 
                      size="small" 
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                  )}
                  
                  {review.booking && (
                    <Button
                      size="small"
                      component={Link}
                      to={`/bookings/${review.booking._id}`}
                    >
                      View Booking
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
          
          {isGiven && (
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, review)}
            >
              <MoreVert />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LoadingSpinner message="Loading reviews..." />;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" component="h1">
          Reviews
        </Typography>
        <Button
          component={Link}
          to="/dashboard"
          startIcon={<ArrowBack />}
          variant="outlined"
        >
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab 
            label={`Reviews Given (${givenReviews.length})`} 
            icon={<Star />}
          />
          <Tab 
            label={`Reviews Received (${receivedReviews.length})`} 
            icon={<StarBorder />}
          />
        </Tabs>
      </Paper>

      {/* Given Reviews Tab */}
      {tabValue === 0 && (
        <Box>
          {givenReviews.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No reviews given yet
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Complete a booking to leave a review for the charger owner.
              </Typography>
              <Button
                variant="contained"
                component={Link}
                to="/chargers"
                startIcon={<Add />}
              >
                Find Chargers
              </Button>
            </Paper>
          ) : (
            <Box>
              {givenReviews.map(review => renderReviewCard(review, true))}
            </Box>
          )}
        </Box>
      )}

      {/* Received Reviews Tab */}
      {tabValue === 1 && (
        <Box>
          {receivedReviews.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No reviews received yet
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {user?.role === 'charger_owner' 
                  ? 'Complete bookings to receive reviews from users.'
                  : 'Book chargers to receive reviews from owners.'
                }
              </Typography>
              <Button
                variant="contained"
                component={Link}
                to={user?.role === 'charger_owner' ? '/chargers/manage' : '/chargers'}
              >
                {user?.role === 'charger_owner' ? 'Manage Chargers' : 'Find Chargers'}
              </Button>
            </Paper>
          ) : (
            <Box>
              {receivedReviews.map(review => renderReviewCard(review, false))}
            </Box>
          )}
        </Box>
      )}

      {/* Review Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <Edit sx={{ mr: 1 }} />
          Edit Review
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <Delete sx={{ mr: 1 }} />
          Delete Review
        </MenuItem>
      </Menu>

      {/* Edit Review Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Review</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography component="legend">Rating</Typography>
            <Rating
              value={editRating}
              onChange={(event, newValue) => setEditRating(newValue)}
              size="large"
            />
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comment"
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            placeholder="Share your experience..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained"
            disabled={editLoading || !editRating}
          >
            {editLoading ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Review</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this review? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewsPage;
