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
  CardMedia,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminChargerManagementPage = () => {
  const navigate = useNavigate();
  const { tab = 'all' } = useParams();
  const [loading, setLoading] = useState(true);
  const [chargers, setChargers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    totalChargers: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: tab === 'pending' ? 'pending' : '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [chargerToReject, setChargerToReject] = useState(null);
  const [activeTab, setActiveTab] = useState(tab === 'pending' ? 1 : 0);

  useEffect(() => {
    fetchChargers();
  }, [pagination.page, pagination.limit, filters]);

  const fetchChargers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...filters
      };

      const response = activeTab === 1 
        ? await adminAPI.getPendingChargers(params)
        : await adminAPI.getAllChargers(params);

      setChargers(response.data.data.chargers);
      setPagination(prev => ({
        ...prev,
        totalChargers: response.data.data.pagination.totalChargers,
        totalPages: response.data.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching chargers:', error);
      toast.error('Failed to load chargers');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setFilters(prev => ({
      ...prev,
      status: newValue === 1 ? 'pending' : ''
    }));
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

  const handleViewDetails = (charger) => {
    setSelectedCharger(charger);
    setDetailsOpen(true);
  };

  const handleApproveCharger = async (chargerId) => {
    try {
      await adminAPI.approveCharger(chargerId);
      toast.success('Charger approved successfully');
      fetchChargers();
    } catch (error) {
      console.error('Error approving charger:', error);
      toast.error('Failed to approve charger');
    }
  };

  const handleRejectCharger = (charger) => {
    setChargerToReject(charger);
    setRejectDialogOpen(true);
  };

  const confirmRejectCharger = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await adminAPI.rejectCharger(chargerToReject._id, { reason: rejectionReason });
      toast.success('Charger rejected successfully');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setChargerToReject(null);
      fetchChargers();
    } catch (error) {
      console.error('Error rejecting charger:', error);
      toast.error('Failed to reject charger');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const ChargerDetailsDialog = () => (
    <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Charger Details</DialogTitle>
      <DialogContent>
        {selectedCharger && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography><strong>Name:</strong> {selectedCharger.title}</Typography>
                  <Typography><strong>Type:</strong> {selectedCharger.specifications?.type}</Typography>
                  <Typography><strong>Power:</strong> {selectedCharger.specifications?.power} kW</Typography>
                  <Typography><strong>Price:</strong> ₹{selectedCharger.pricing?.hourlyRate}/hour</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedCharger.status} 
                      color={getStatusColor(selectedCharger.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Owner Information
                  </Typography>
                  <Typography><strong>Name:</strong> {selectedCharger.owner?.profile?.firstName} {selectedCharger.owner?.profile?.lastName}</Typography>
                  <Typography><strong>Email:</strong> {selectedCharger.owner?.email}</Typography>
                  <Typography><strong>Phone:</strong> {selectedCharger.owner?.phone}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Location
                  </Typography>
                  <Typography><strong>Address:</strong> {selectedCharger.location?.address}</Typography>
                  <Typography><strong>City:</strong> {selectedCharger.location?.city}</Typography>
                  <Typography><strong>State:</strong> {selectedCharger.location?.state}</Typography>
                  <Typography><strong>Coordinates:</strong> {selectedCharger.location?.coordinates?.join(', ')}</Typography>
                </CardContent>
              </Card>
            </Grid>

            {selectedCharger.images && selectedCharger.images.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Images
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedCharger.images.map((image, index) => (
                        <Grid item xs={6} md={3} key={index}>
                          <CardMedia
                            component="img"
                            height="140"
                            image={image}
                            alt={`Charger image ${index + 1}`}
                            sx={{ borderRadius: 1 }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {selectedCharger.amenities && selectedCharger.amenities.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Amenities
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {selectedCharger.amenities.map((amenity, index) => (
                        <Chip key={index} label={amenity} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        {selectedCharger?.status === 'pending' && (
          <>
            <Button onClick={() => handleApproveCharger(selectedCharger._id)} color="success">
              Approve
            </Button>
            <Button onClick={() => handleRejectCharger(selectedCharger)} color="error">
              Reject
            </Button>
          </>
        )}
        <Button onClick={() => setDetailsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const RejectDialog = () => (
    <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Reject Charger</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Please provide a reason for rejecting this charger:
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter rejection reason..."
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
        <Button onClick={confirmRejectCharger} color="error" variant="contained">
          Reject Charger
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Charger Management
      </Typography>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="All Chargers" />
        <Tab label="Pending Approval" />
      </Tabs>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search chargers..."
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
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
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
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="status">Status</MenuItem>
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
                <TableCell>Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : chargers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Alert severity="info">No chargers found</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                chargers.map((charger) => (
                  <TableRow key={charger._id}>
                    <TableCell>{charger.title}</TableCell>
                    <TableCell>
                      {charger.owner?.profile?.firstName} {charger.owner?.profile?.lastName}
                    </TableCell>
                    <TableCell>{charger.location?.address}</TableCell>
                    <TableCell>{charger.specifications?.type}</TableCell>
                    <TableCell>
                      <Chip 
                        label={charger.status} 
                        color={getStatusColor(charger.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(charger.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewDetails(charger)}
                        color="primary"
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                      {charger.status === 'pending' && (
                        <>
                          <IconButton
                            onClick={() => handleApproveCharger(charger._id)}
                            color="success"
                            title="Approve"
                          >
                            <ApproveIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleRejectCharger(charger)}
                            color="error"
                            title="Reject"
                          >
                            <RejectIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={pagination.totalChargers}
          page={pagination.page}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      <ChargerDetailsDialog />
      <RejectDialog />
      </Box>
    </AdminLayout>
  );
};

export default AdminChargerManagementPage;
