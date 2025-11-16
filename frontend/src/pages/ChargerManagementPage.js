import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { chargerAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  Add,
  EvStation,
  CalendarToday,
  AttachMoney
} from '@mui/icons-material';

const ChargerManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chargerToDelete, setChargerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    // Redirect if not a charger owner
    if (user && user.role !== 'charger_owner') {
      navigate('/dashboard');
    }

    const fetchChargers = async () => {
      try {
        const response = await chargerAPI.getOwnerChargers();
        if (response.data.success) {
          setChargers(response.data.data.chargers);
        } else {
          setError('Failed to load chargers');
        }
      } catch (err) {
        setError('Error loading chargers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchChargers();
  }, [user, navigate]);

  const handleDeleteClick = (charger) => {
    setChargerToDelete(charger);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chargerToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await chargerAPI.remove(chargerToDelete._id);
      if (response.data.success) {
        setChargers(chargers.filter(c => c._id !== chargerToDelete._id));
      } else {
        setError('Failed to delete charger');
      }
    } catch (err) {
      setError('Error deleting charger. Please try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setChargerToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setChargerToDelete(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <EvStation sx={{ mr: 1, verticalAlign: 'middle' }} />
          My Chargers
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          component={Link}
          to="/chargers/new"
        >
          Add New Charger
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {chargers.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            You don't have any chargers listed yet
          </Typography>
          <Typography variant="body1" paragraph>
            Start earning by listing your EV charger for others to use.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            component={Link}
            to="/chargers/new"
            size="large"
          >
            Add Your First Charger
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {chargers.map((charger) => (
            <Grid item xs={12} md={6} lg={4} key={charger._id}>
              <Card elevation={3}>
                <CardMedia
                  component="img"
                  height="140"
                  image={charger.images && charger.images.length > 0 
                    ? charger.images[0] 
                    : 'https://via.placeholder.com/300x140?text=EV+Charger'}
                  alt={charger.title}
                />
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" component="div" gutterBottom>
                      {charger.title}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={charger.status} 
                      color={
                        charger.status === 'active' ? 'success' : 
                        charger.status === 'pending' ? 'warning' : 
                        'default'
                      }
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {charger.location?.address}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Type: {charger.specifications?.type}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Power: {charger.specifications?.power} kW
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box display="flex" alignItems="center" mt={1}>
                        <AttachMoney fontSize="small" color="primary" />
                        <Typography variant="body1" fontWeight="bold">
                          ${charger.pricing?.hourlyRate?.toFixed(2) || '0.00'}/hour
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
                <CardActions>
                  <Tooltip title="View Charger">
                    <IconButton 
                      component={Link} 
                      to={`/chargers/${charger._id}`}
                      color="primary"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Charger">
                    <IconButton 
                      component={Link} 
                      to={`/chargers/${charger._id}/edit`}
                      color="secondary"
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Charger">
                    <IconButton 
                      color="error"
                      onClick={() => handleDeleteClick(charger)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                  <Box flexGrow={1} />
                  <Button 
                    size="small" 
                    component={Link} 
                    to={`/chargers/${charger._id}/bookings`}
                    startIcon={<CalendarToday />}
                  >
                    Bookings
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the charger "{chargerToDelete?.name}"? 
            This action cannot be undone and will cancel any pending bookings.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChargerManagementPage;
