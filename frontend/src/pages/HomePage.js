import React, { useEffect } from 'react';
import { Box, Typography, Button, Container, Grid, Paper, CircularProgress } from '@mui/material';
import { ElectricCar, LocationOn, Payment } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const features = [
    {
      icon: <LocationOn sx={{ fontSize: 40 }} />,
      title: 'Find Chargers',
      description: 'Locate available EV chargers near you with real-time availability.',
    },
    {
      icon: <ElectricCar sx={{ fontSize: 40 }} />,
      title: 'Book & Charge',
      description: 'Reserve charging slots and charge your vehicle conveniently.',
    },
    {
      icon: <Payment sx={{ fontSize: 40 }} />,
      title: 'Earn Money',
      description: 'List your home charger and earn money when you\'re not using it.',
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to EvChargerShare
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          The peer-to-peer platform for electric vehicle charging
        </Typography>
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
          >
            Get Started
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ py: 8 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box sx={{ color: 'primary.main', mb: 2 }}>
                {feature.icon}
              </Box>
              <Typography variant="h6" gutterBottom>
                {feature.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {feature.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default HomePage;