import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as ApproveIcon,
  Search as SearchIcon,
  Warning as IssueIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminBookingManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    totalBookings: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchBookings();
  }, [pagination.page, pagination.limit, filters, activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...filters
      };

      const response = activeTab === 1 
        ? await adminAPI.getBookingsWithIssues(params)
        : await adminAPI.getAllBookings(params);

      setBookings(response.data.data.bookings);
      setPagination(prev => ({
        ...prev,
        totalBookings: response.data.data.pagination.totalBookings,
        totalPages: response.data.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0
    }));
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setDetailsOpen(true);
  };

  const handleUpdateStatus = (booking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.status);
    setStatusReason('');
    setStatusDialogOpen(true);
  };

  const confirmStatusUpdate = async () => {
    if (!statusReason.trim()) {
      toast.error('Please provide a reason for status change');
      return;
    }

    try {
      await adminAPI.updateBookingStatus(selectedBooking._id, {
        status: newStatus,
        reason: statusReason
      });
      toast.success('Booking status updated successfully');
      setStatusDialogOpen(false);
      setStatusReason('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      case 'in-progress': return 'primary';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const BookingDetailsDialog = () => (
    <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Booking Details</DialogTitle>
      <DialogContent>
        {selectedBooking && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Booking Information
                  </Typography>
                  <Typography><strong>Booking ID:</strong> {selectedBooking._id}</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedBooking.status} 
                      color={getStatusColor(selectedBooking.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography><strong>Start Time:</strong> {new Date(selectedBooking.schedule?.startTime).toLocaleString()}</Typography>
                  <Typography><strong>End Time:</strong> {new Date(selectedBooking.schedule?.endTime).toLocaleString()}</Typography>
                  <Typography><strong>Duration:</strong> {selectedBooking.schedule?.duration} hours</Typography>
                  <Typography><strong>Total Amount:</strong> {formatCurrency(selectedBooking.pricing?.totalAmount)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Information
                  </Typography>
                  <Typography><strong>Name:</strong> {selectedBooking.user?.firstName} {selectedBooking.user?.lastName}</Typography>
                  <Typography><strong>Email:</strong> {selectedBooking.user?.email}</Typography>
                  <Typography><strong>Phone:</strong> {selectedBooking.user?.phone}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Charger Information
                  </Typography>
                  <Typography><strong>Name:</strong> {selectedBooking.charger?.name}</Typography>
                  <Typography><strong>Type:</strong> {selectedBooking.charger?.type}</Typography>
                  <Typography><strong>Power:</strong> {selectedBooking.charger?.power} kW</Typography>
                  <Typography><strong>Location:</strong> {selectedBooking.charger?.location?.address}</Typography>
                  <Typography><strong>Owner:</strong> {selectedBooking.charger?.owner?.firstName} {selectedBooking.charger?.owner?.lastName}</Typography>
                </CardContent>
              </Card>
            </Grid>

            {selectedBooking.payment && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Payment Information
                    </Typography>
                    <Typography><strong>Payment Status:</strong> 
                      <Chip 
                        label={selectedBooking.payment.status} 
                        color={selectedBooking.payment.status === 'completed' ? 'success' : 'warning'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Typography><strong>Amount:</strong> {formatCurrency(selectedBooking.payment.amount)}</Typography>
                    <Typography><strong>Method:</strong> {selectedBooking.payment.method}</Typography>
                    {selectedBooking.payment.transactionId && (
                      <Typography><strong>Transaction ID:</strong> {selectedBooking.payment.transactionId}</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {selectedBooking.notes && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Notes
                    </Typography>
                    <Typography>{selectedBooking.notes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleUpdateStatus(selectedBooking)} color="primary">
          Update Status
        </Button>
        <Button onClick={() => setDetailsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const StatusUpdateDialog = () => (
    <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Update Booking Status</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Reason for status change"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Enter reason for status change..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
        <Button onClick={confirmStatusUpdate} color="primary" variant="contained">
          Update Status
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Booking Management
      </Typography>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="All Bookings" />
        <Tab label="Issues & Disputes" />
      </Tabs>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search bookings..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                label="Sort By"
              >
                <MenuItem value="createdAt">Created Date</MenuItem>
                <MenuItem value="startTime">Start Time</MenuItem>
                <MenuItem value="totalAmount">Amount</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                label="Order"
              >
                <MenuItem value="desc">Descending</MenuItem>
                <MenuItem value="asc">Ascending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Charger</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Alert severity="info">No bookings found</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking._id.slice(-8)}</TableCell>
                    <TableCell>
                      {booking.user?.profile?.firstName} {booking.user?.profile?.lastName}
                    </TableCell>
                    <TableCell>{booking.charger?.title}</TableCell>
                    <TableCell>
                      {new Date(booking.schedule?.startTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{booking.schedule?.duration}h</TableCell>
                    <TableCell>{formatCurrency(booking.pricing?.totalAmount)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.status} 
                        color={getStatusColor(booking.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewDetails(booking)}
                        color="primary"
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleUpdateStatus(booking)}
                        color="primary"
                        title="Update Status"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={pagination.totalBookings}
          page={pagination.page}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      <BookingDetailsDialog />
      <StatusUpdateDialog />
      </Box>
    </AdminLayout>
  );
};

export default AdminBookingManagementPage;
