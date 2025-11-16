import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const LoginPage = () => {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setLoginError('');
    
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setLoginError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setLoginError('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
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
          Sign In
        </Typography>
        
        {loginError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loginError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
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
          
          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
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
              {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Forgot password?
                </Typography>
              </Link>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Don't have an account? Sign Up
                </Typography>
              </Link>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;