import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingAPI, messageAPI, ratingAPI, userAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Button,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Person,
  EvStation,
  CalendarToday,
  Payment,
  Message,
  Star,
  Settings,
  Add,
  Assessment
} from '@mui/icons-material';

// Profile component for user profile management
const ProfileSection = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        setSuccess('Profile updated successfully');
        setIsEditing(false);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
          My Profile
        </Typography>
        <Button 
          variant={isEditing ? "outlined" : "contained"} 
          color="primary"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">First Name</Typography>
              <input
                type="text"
                name="firstName"
                value={profileData.firstName}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Last Name</Typography>
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Email</Typography>
              <input
                type="email"
                name="email"
                value={profileData.email}
                disabled
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5'
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Email cannot be changed
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Phone</Typography>
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </form>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">First Name</Typography>
            <Typography variant="body1">{user?.profile?.firstName}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Last Name</Typography>
            <Typography variant="body1">{user?.profile?.lastName}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography variant="body1">{user?.email}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
            <Typography variant="body1">{user?.profile?.phone || 'Not provided'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Account Type</Typography>
            <Typography variant="body1">
              {user?.role === 'admin' ? 'Administrator' : 
               user?.role === 'charger_owner' ? 'Charger Owner' : 'EV Driver'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Member Since</Typography>
            <Typography variant="body1">
              {new Date(user?.createdAt).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

// Bookings component to display user's bookings
const BookingsSection = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await bookingAPI.getUserBookings();
        if (response.data.success) {
          // Only show the most recent 5 bookings in the dashboard
          const sortedBookings = response.data.data.bookings
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 5);
          setBookings(sortedBookings);
        } else {
          setError('Failed to load bookings');
        }
      } catch (err) {
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleViewBooking = (bookingId) => {
    navigate(`/bookings/${bookingId}`);
  };

  const handleViewAllBookings = () => {
    navigate('/bookings');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
          Recent Bookings
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleViewAllBookings}
          size="small"
        >
          View All Bookings
        </Button>
      </Box>
      
      {bookings.length === 0 ? (
        <Box textAlign="center" py={3}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No bookings found
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/chargers')}
          >
            Find Chargers
          </Button>
        </Box>
      ) : (
        <List>
          {bookings.map((booking) => (
            <React.Fragment key={booking._id}>
              <ListItem 
                alignItems="flex-start" 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                }}
                onClick={() => handleViewBooking(booking._id)}
              >
                <ListItemAvatar>
                  <Avatar>
                    <EvStation />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <>
                      <Typography component="span" variant="subtitle1">
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
                    </>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {new Date(booking.schedule?.startTime).toLocaleDateString()} {new Date(booking.schedule?.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {' '} - {' '}
                        {new Date(booking.schedule?.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.charger.location?.address}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Total:</strong> ${booking.pricing?.totalAmount?.toFixed(2) || '0.00'}
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
  );
};

// Main Dashboard component
const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Define tabs based on user role
  const tabs = [
    { icon: <Person />, label: 'Profile', component: <ProfileSection /> },
    { icon: <CalendarToday />, label: 'Bookings', component: <BookingsSection /> },
  ];

  if (user?.role === 'charger_owner') {
    tabs.push({
      icon: <EvStation />, 
      label: 'My Chargers', 
      component: (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>My Chargers</Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Manage your EV charger listings and monitor their performance.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Add />}
              onClick={() => navigate('/chargers/new')}
            >
              Add New Charger
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<EvStation />}
              onClick={() => navigate('/chargers/manage')}
            >
              Manage Chargers
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              startIcon={<Assessment />}
              onClick={() => navigate('/chargers/analytics')}
            >
              View Analytics
            </Button>
          </Box>
        </Paper>
      )
    });
  }

  tabs.push(
    {
      icon: <Payment />, 
      label: 'Payments', 
      component: (
        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>Payments</Typography>
          <Typography variant="body1">
            View your payment history and manage payment methods.
          </Typography>
        </Paper>
      )
    },
    { icon: <Message />, label: 'Messages', component: <MessagesSection /> },
    { icon: <Star />, label: 'Reviews', component: <ReviewsSection /> },
    { icon: <Settings />, label: 'Settings', component: <AccountSettingsSection /> }
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.profile.firstName}!
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab key={index} icon={tab.icon} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {tabs[tabValue] && tabs[tabValue].component}
    </Box>
  );
};

// Messages Section Component
const MessagesSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await messageAPI.getUserConversations();
      if (response.data.success) {
        setConversations(response.data.data.slice(0, 5)); // Show only recent 5
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await messageAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const getOtherUser = (conversation) => {
    // Backend returns otherParty directly
    return conversation.otherParty;
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Messages</Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/messages')}
          disabled={conversations.length === 0}
        >
          View All {unreadCount > 0 && `(${unreadCount} unread)`}
        </Button>
      </Box>
      
      {conversations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No messages yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Book a charger to start conversations with owners.
          </Typography>
        </Box>
      ) : (
        <List>
          {conversations.map((conversation, index) => {
            const otherUser = getOtherUser(conversation);
            return (
              <React.Fragment key={conversation._id}>
                <ListItem 
                  button 
                  onClick={() => navigate('/messages')}
                  sx={{ px: 0 }}
                >
                  <ListItemAvatar>
                    <Avatar src={otherUser?.profile?.avatarUrl || otherUser?.profile?.avatar}>
                      {otherUser?.profile?.firstName?.[0]}{otherUser?.profile?.lastName?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${otherUser?.profile?.firstName} ${otherUser?.profile?.lastName}`}
                    secondary={
                      <Box>
                        {conversation.charger && (
                          <Chip 
                            label={conversation.charger?.title} 
                            size="small" 
                            variant="outlined" 
                            sx={{ mb: 0.5, fontSize: '0.7rem', height: 20 }} 
                          />
                        )}
                        <Typography variant="body2" component="div">
                          {conversation.latestMessage?.content || 'No messages yet'}
                        </Typography>
                      </Box>
                    }
                  />
                  {conversation.unreadCount > 0 && (
                    <Chip 
                      label={conversation.unreadCount} 
                      color="primary" 
                      size="small" 
                    />
                  )}
                </ListItem>
                {index < conversations.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );
};

// Reviews Section Component
const ReviewsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState({ given: [], received: [] });
    const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await ratingAPI.getByUser(user._id);
      if (response.data.success) {
        const allReviews = response.data.data;
        setReviews({
          given: allReviews.filter(review => review.reviewer._id === user._id).slice(0, 3),
          received: allReviews.filter(review => review.reviewee._id === user._id).slice(0, 3)
        });
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  const totalReviews = reviews.given.length + reviews.received.length;

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Reviews</Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/reviews')}
          disabled={totalReviews === 0}
        >
          View All Reviews
        </Button>
      </Box>
      
      {totalReviews === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No reviews yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Complete bookings to give and receive reviews.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Reviews Given ({reviews.given.length})</Typography>
            {reviews.given.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No reviews given yet</Typography>
            ) : (
              <List dense>
                {reviews.given.map((review) => (
                  <ListItem key={review._id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar src={review.reviewee?.profile?.avatarUrl || review.reviewee?.profile?.avatar}>
                        {review.reviewee?.profile?.firstName?.[0]}{review.reviewee?.profile?.lastName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${review.reviewee?.profile?.firstName} ${review.reviewee?.profile?.lastName}`}
                      secondary={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography component="span" variant="body2">
                              {Array.from({ length: review.rating }, (_, _i) => '⭐').join('')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {review.comment.length > 50 ? `${review.comment.substring(0, 50)}...` : review.comment}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Reviews Received ({reviews.received.length})</Typography>
            {reviews.received.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No reviews received yet</Typography>
            ) : (
              <List dense>
                {reviews.received.map((review) => (
                  <ListItem key={review._id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar src={review.reviewer?.profile?.avatarUrl || review.reviewer?.profile?.avatar}>
                        {review.reviewer?.profile?.firstName?.[0]}{review.reviewer?.profile?.lastName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${review.reviewer?.profile?.firstName} ${review.reviewer?.profile?.lastName}`}
                      secondary={
                        <Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography component="span" variant="body2">
                              {Array.from({ length: review.rating }, (_, _i) => '⭐').join('')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {review.comment.length > 50 ? `${review.comment.substring(0, 50)}...` : review.comment}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

// Account Settings Section Component
const AccountSettingsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSettingsTab, setActiveSettingsTab] = useState(0);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    bookingReminders: true,
    marketingEmails: false
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      // Load notification settings from user preferences if available
      if (user.preferences) {
        setNotificationSettings({
          emailNotifications: user.preferences.emailNotifications ?? true,
          smsNotifications: user.preferences.smsNotifications ?? false,
          pushNotifications: user.preferences.pushNotifications ?? true,
          bookingReminders: user.preferences.bookingReminders ?? true,
          marketingEmails: user.preferences.marketingEmails ?? false
        });
      }
    }
  }, [user]);

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    console.log('Password change attempt:', {
      currentPassword: passwordData.currentPassword ? '***' : 'empty',
      newPassword: passwordData.newPassword ? '***' : 'empty',
      confirmPassword: passwordData.confirmPassword ? '***' : 'empty'
    });
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      console.log('Password change response:', response.data);
      
      if (response.data.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Password change failed');
      }
    } catch (err) {
      console.error('Password change error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    console.log('Saving notification preferences:', notificationSettings);
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const requestData = {
        preferences: notificationSettings
      };
      console.log('Sending request data:', requestData);
      const response = await userAPI.updateProfile(requestData);
      console.log('Notification save response:', response.data);
      
      if (response.data.success) {
        setSuccess('Notification preferences updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const settingsTabs = [
    { label: 'Security', icon: <Settings /> },
    { label: 'Notifications', icon: <Message /> }
  ];

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Account Settings</Typography>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/account')}
        >
          Full Settings Page
        </Button>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeSettingsTab} onChange={(e, newValue) => setActiveSettingsTab(newValue)}>
          {settingsTabs.map((tab, index) => (
            <Tab key={index} icon={tab.icon} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Security Settings Tab */}
      {activeSettingsTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Password
            </Typography>
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                placeholder="Enter current password"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              New Password
            </Typography>
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                placeholder="Enter new password"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Confirm New Password
            </Typography>
            <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                placeholder="Confirm new password"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handlePasswordChange}
              disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              sx={{ mr: 2 }}
            >
              {saving ? <CircularProgress size={20} /> : 'Change Password'}
            </Button>
          </Grid>
        </Grid>
      )}

      {/* Notification Settings Tab */}
      {activeSettingsTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
          </Grid>
          
          {Object.entries({
            emailNotifications: 'Email Notifications',
            smsNotifications: 'SMS Notifications',
            pushNotifications: 'Push Notifications',
            bookingReminders: 'Booking Reminders',
            marketingEmails: 'Marketing Emails'
          }).map(([key, label]) => (
            <Grid item xs={12} key={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body1">{label}</Typography>
                <input
                  type="checkbox"
                  checked={notificationSettings[key]}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  style={{ transform: 'scale(1.2)' }}
                />
              </Box>
            </Grid>
          ))}
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleNotificationSave}
              disabled={saving}
              sx={{ mr: 2 }}
            >
              {saving ? <CircularProgress size={20} /> : 'Save Preferences'}
            </Button>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default DashboardPage;