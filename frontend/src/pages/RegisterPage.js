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
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Checkbox,
  FormHelperText
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const RegisterPage = () => {
  const { register: registerUser, user, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');
  
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
    setRegisterError('');
    
    // Remove confirmPassword from data before sending to API
    const { confirmPassword, termsAccepted, ...userData } = data;
    
    try {
      const result = await registerUser(userData);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setRegisterError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setRegisterError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', error);
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
      py={4}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%' }}>
        <Typography variant="h4" align="center" gutterBottom>
          Create Account
        </Typography>
        
        {registerError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {registerError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                variant="outlined"
                fullWidth
                {...register('firstName', { 
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters'
                  }
                })}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                variant="outlined"
                fullWidth
                {...register('lastName', { 
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters'
                  }
                })}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                autoComplete="email"
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
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Phone Number"
                variant="outlined"
                fullWidth
                {...register('phone', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
                    message: 'Invalid phone number format'
                  }
                })}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Password"
                variant="outlined"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Confirm Password"
                variant="outlined"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl component="fieldset" error={!!errors.role}>
                <FormLabel component="legend">Account Type</FormLabel>
                <RadioGroup row>
                  <FormControlLabel 
                    value="ev_user" 
                    control={
                      <Radio {...register('role', { required: 'Please select an account type' })} />
                    } 
                    label="EV Driver" 
                  />
                  <FormControlLabel 
                    value="charger_owner" 
                    control={
                      <Radio {...register('role', { required: 'Please select an account type' })} />
                    } 
                    label="Charger Owner" 
                  />
                </RadioGroup>
                {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl error={!!errors.termsAccepted} fullWidth>
                <FormControlLabel
                  control={
                    <Checkbox 
                      {...register('termsAccepted', { 
                        required: 'You must accept the terms and conditions' 
                      })} 
                    />
                  }
                  label="I agree to the terms and conditions"
                />
                {errors.termsAccepted && <FormHelperText>{errors.termsAccepted.message}</FormHelperText>}
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, mb: 2 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{ py: 1.2 }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
          </Box>
          
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Already have an account? Sign in
                </Typography>
              </Link>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default RegisterPage;