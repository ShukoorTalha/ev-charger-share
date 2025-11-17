import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  ElectricCar as ChargerIcon,
  BookOnline as BookingIcon,
  AttachMoney as RevenueIcon,
  Star as RatingIcon,
  Assessment as AnalyticsIcon
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { toast } from 'react-toastify';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAnalytics({ period });
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatPercentage = (num) => {
    return `${(num || 0).toFixed(1)}%`;
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!analytics) {
    return (
      <AdminLayout>
        <Alert severity="error">Failed to load analytics data</Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Analytics Dashboard
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Overview Stats */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={formatNumber(analytics.overview.totalUsers)}
              icon={<PeopleIcon fontSize="large" />}
              color="primary"
              subtitle={`${formatNumber(analytics.growth.newUsers)} new this period`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Chargers"
              value={formatNumber(analytics.overview.totalChargers)}
              icon={<ChargerIcon fontSize="large" />}
              color="success"
              subtitle={`${formatNumber(analytics.growth.newChargers)} new this period`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Bookings"
              value={formatNumber(analytics.overview.totalBookings)}
              icon={<BookingIcon fontSize="large" />}
              color="info"
              subtitle={`${formatNumber(analytics.growth.newBookings)} new this period`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(analytics.overview.totalRevenue)}
              icon={<RevenueIcon fontSize="large" />}
              color="warning"
              subtitle={`${formatCurrency(analytics.growth.revenueInPeriod)} this period`}
            />
          </Grid>
        </Grid>

        {/* Key Metrics */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Average Rating"
              value={analytics.overview.avgRating.toFixed(1)}
              icon={<RatingIcon fontSize="large" />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Conversion Rate"
              value={formatPercentage(analytics.insights.conversionRate)}
              icon={<TrendingUpIcon fontSize="large" />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Cancellation Rate"
              value={formatPercentage(analytics.insights.cancellationRate)}
              icon={<AnalyticsIcon fontSize="large" />}
              color="error"
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} mb={4}>
          {/* Users by Role */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Users by Role
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.charts.usersByRole}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.charts.usersByRole.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Chargers by Type */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Chargers by Type
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.charts.chargersByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Booking Status Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Booking Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.charts.bookingsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.charts.bookingsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Rating Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rating Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.charts.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top Performing Chargers */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Performing Chargers
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Charger Name</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="right">Bookings</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.insights.topChargers.map((charger, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            {charger.title}
                          </TableCell>
                          <TableCell>{charger.location}</TableCell>
                          <TableCell align="right">{formatNumber(charger.bookings)}</TableCell>
                          <TableCell align="right">{formatCurrency(charger.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
