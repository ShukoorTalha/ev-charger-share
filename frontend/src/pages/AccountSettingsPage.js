import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Notifications,
  Security,
  Delete,
  Edit,
  PhotoCamera,
  Save,
  Cancel
} from '@mui/icons-material';
import LoadingSpinner from '../components/LoadingSpinner';

const AccountSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: ''
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailBookingUpdates: true,
    emailMessages: true,
    emailPromotions: false,
    pushBookingUpdates: true,
    pushMessages: true,
    smsBookingUpdates: false
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Avatar upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  
  // Delete account dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        bio: user.profile?.bio || ''
      });
      
      // Load notification settings if available
      setNotificationSettings(prev => ({
        ...prev,
        ...user.notificationSettings
      }));
    }
  }, [user]);

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Sending profile update request:', {
        profile: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          bio: profileData.bio
        },
        notificationSettings
      });
      
      const response = await userAPI.updateProfile({
        profile: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          bio: profileData.bio
        },
        notificationSettings
      });
      
      console.log('Profile update response:', response);
      
      if (response.data && response.data.success) {
        setSuccess(response.data.message || 'Profile updated successfully!');
      } else {
        console.log('Response success is false or missing:', response.data);
        setError(response.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.log('Profile update error:', err);
      console.log('Error response:', err.response);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    
    setSaving(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await userAPI.uploadAvatar(formData);
      
      if (response.data.success) {
        setSuccess('Avatar updated successfully!');
        setAvatarFile(null);
        setAvatarPreview('');
        // Refresh the page to load the new avatar with signed URL
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      await userAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      await userAPI.deleteAccount();
      // Logout and redirect will be handled by the auth context
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Account Settings
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Profile Information"
              avatar={<Person />}
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profileData.email}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Bio"
                    value={profileData.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Save Profile'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Avatar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Profile Picture"
              avatar={<PhotoCamera />}
            />
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                src={avatarPreview || user?.profile?.avatarUrl || user?.profile?.avatar}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              >
                {user?.profile?.firstName?.[0]}{user?.profile?.lastName?.[0]}
              </Avatar>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="avatar-upload"
                type="file"
                onChange={handleAvatarChange}
              />
              <label htmlFor="avatar-upload">
                <Button variant="outlined" component="span" sx={{ mb: 2 }}>
                  Choose Photo
                </Button>
              </label>
              
              {avatarFile && (
                <Box>
                  <Button
                    variant="contained"
                    onClick={handleUploadAvatar}
                    disabled={saving}
                    sx={{ mr: 1 }}
                  >
                    Upload
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview('');
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Notification Preferences"
              avatar={<Notifications />}
            />
            <CardContent>
              <FormGroup>
                <Typography variant="subtitle1" gutterBottom>Email Notifications</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailBookingUpdates}
                      onChange={() => handleNotificationChange('emailBookingUpdates')}
                    />
                  }
                  label="Booking updates and confirmations"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailMessages}
                      onChange={() => handleNotificationChange('emailMessages')}
                    />
                  }
                  label="New messages"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailPromotions}
                      onChange={() => handleNotificationChange('emailPromotions')}
                    />
                  }
                  label="Promotions and updates"
                />
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>Push Notifications</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.pushBookingUpdates}
                      onChange={() => handleNotificationChange('pushBookingUpdates')}
                    />
                  }
                  label="Booking updates"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.pushMessages}
                      onChange={() => handleNotificationChange('pushMessages')}
                    />
                  }
                  label="New messages"
                />
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>SMS Notifications</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.smsBookingUpdates}
                      onChange={() => handleNotificationChange('smsBookingUpdates')}
                    />
                  }
                  label="Critical booking updates"
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* Password Change */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Change Password"
              avatar={<Security />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  />
                </Grid>
              </Grid>
              
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
                sx={{ mt: 2 }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Account Status"
              avatar={<Person />}
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Account Type</Typography>
                <Chip 
                  label={user?.role === 'charger_owner' ? 'Charger Owner' : 'User'} 
                  color="primary" 
                  size="small" 
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Member Since</Typography>
                <Typography variant="body1">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Email Status</Typography>
                <Chip 
                  label={user?.isEmailVerified ? 'Verified' : 'Not Verified'} 
                  color={user?.isEmailVerified ? 'success' : 'warning'} 
                  size="small" 
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" color="error" gutterBottom>
                Danger Zone
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action cannot be undone. This will permanently delete your account
            and remove all your data from our servers.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            Type "DELETE" to confirm:
          </DialogContentText>
          <TextField
            fullWidth
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteAccount} 
            color="error"
            disabled={saving || deleteConfirmText !== 'DELETE'}
          >
            {saving ? <CircularProgress size={20} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountSettingsPage;
