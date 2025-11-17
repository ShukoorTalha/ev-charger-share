import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const ResetPasswordPage = () => {
  const { resetPassword, user, loading } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const result = await resetPassword(token, data.password);
      if (result.success) {
        navigate('/login');
      } else {
        setError(result.error || 'Password reset failed. Please try again.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Reset password error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: '100%' }}>
        <Typography variant="h4" align="center" gutterBottom>
          Reset Your Password
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please enter your new password below.
          </Typography>
          
          <TextField
            label="New Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
              }
            })}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            label="Confirm New Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword', { 
              required: 'Please confirm your password',
              validate: value => value === password || 'Passwords do not match'
            })}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{ py: 1.2 }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>
          </Box>
          
          <Grid container justifyContent="center">
            <Grid item>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Return to login
                </Typography>
              </Link>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ResetPasswordPage;
