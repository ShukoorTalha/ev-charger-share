import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ElectricCar as ChargerIcon,
  People as UsersIcon,
  BookOnline as BookingsIcon,
  Payment as PaymentIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingChargers, setPendingChargers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, pendingResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getPendingChargers({ limit: 5 })
      ]);

      setStats(statsResponse.data.data);
      setPendingChargers(pendingResponse.data.data.chargers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCharger = async (chargerId) => {
    try {
      await adminAPI.approveCharger(chargerId);
      toast.success('Charger approved successfully');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error approving charger:', error);
      toast.error('Failed to approve charger');
    }
  };

  const handleRejectCharger = async (chargerId) => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    try {
      await adminAPI.rejectCharger(chargerId, { reason });
      toast.success('Charger rejected successfully');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting charger:', error);
      toast.error('Failed to reject charger');
    }
  };

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <Card sx={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            icon={<UsersIcon />}
            color="primary.main"
            onClick={() => navigate('/admin/users')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Chargers"
            value={stats?.chargers?.total || 0}
            icon={<ChargerIcon />}
            color="success.main"
            onClick={() => navigate('/admin/chargers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approval"
            value={stats?.chargers?.pending || 0}
            icon={<PendingIcon />}
            color="warning.main"
            onClick={() => navigate('/admin/chargers/pending')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={stats?.bookings?.total || 0}
            icon={<BookingsIcon />}
            color="info.main"
            onClick={() => navigate('/admin/bookings')}
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Pending Charger Approvals
            </Typography>
            
            {pendingChargers.length === 0 ? (
              <Alert severity="info">No pending chargers for approval</Alert>
            ) : (
              <List>
                {pendingChargers.map((charger) => (
                  <ListItem key={charger._id} divider>
                    <ListItemAvatar>
                      <Avatar>
                        <ChargerIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={charger.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Owner: {charger.owner?.firstName} {charger.owner?.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Location: {charger.location?.address}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Submitted: {new Date(charger.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <IconButton
                          color="primary"
                          onClick={() => navigate(`/admin/chargers/${charger._id}`)}
                          title="View Details"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          color="success"
                          onClick={() => handleApproveCharger(charger._id)}
                          title="Approve"
                        >
                          <ApproveIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleRejectCharger(charger._id)}
                          title="Reject"
                        >
                          <RejectIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            
            {pendingChargers.length > 0 && (
              <Box mt={2} textAlign="center">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/admin/chargers/pending')}
                >
                  View All Pending Chargers
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<UsersIcon />}
                onClick={() => navigate('/admin/users')}
                fullWidth
              >
                Manage Users
              </Button>
              <Button
                variant="contained"
                startIcon={<ChargerIcon />}
                onClick={() => navigate('/admin/chargers')}
                fullWidth
              >
                Manage Chargers
              </Button>
              <Button
                variant="contained"
                startIcon={<BookingsIcon />}
                onClick={() => navigate('/admin/bookings')}
                fullWidth
              >
                Manage Bookings
              </Button>
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => navigate('/admin/payments')}
                fullWidth
              >
                Manage Payments
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      </Box>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
