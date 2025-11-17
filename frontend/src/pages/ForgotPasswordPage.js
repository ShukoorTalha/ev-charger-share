import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  CircularProgress
} from '@mui/material';

const ForgotPasswordPage = () => {
  const { forgotPassword, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    setSuccess(false);
    
    try {
      const result = await forgotPassword(data.email);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Forgot password error:', error);
    } finally {
      setIsSubmitting(false);
    }
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
          Reset Password
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reset email sent! Please check your inbox and follow the instructions.
          </Alert>
        )}
        
        {!success ? (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            
            <TextField
              label="Email Address"
              variant="outlined"
              fullWidth
              margin="normal"
              autoComplete="email"
              autoFocus
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
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
                {isSubmitting ? <CircularProgress size={24} /> : 'Send Reset Link'}
              </Button>
            </Box>
          </form>
        ) : (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Button
              component={Link}
              to="/login"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ py: 1.2 }}
            >
              Return to Login
            </Button>
          </Box>
        )}
        
        <Grid container justifyContent="center">
          <Grid item>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" color="primary">
                Remember your password? Sign in
              </Typography>
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ForgotPasswordPage;
