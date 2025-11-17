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
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Search as SearchIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminUserManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    totalUsers: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ role: '', status: '' });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...filters
      };

      const response = await adminAPI.getAllUsers(params);
      setUsers(response.data.data.users);
      setPagination(prev => ({
        ...prev,
        totalUsers: response.data.data.pagination.totalUsers,
        totalPages: response.data.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
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

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditData({ role: user.role, status: user.status });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      // Update role if changed
      if (editData.role !== selectedUser.role) {
        await adminAPI.updateUserRole(selectedUser._id, { role: editData.role });
      }
      
      // Update status if changed
      if (editData.status !== selectedUser.status) {
        await adminAPI.updateUserStatus(selectedUser._id, { status: editData.status });
      }

      toast.success('User updated successfully');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await adminAPI.updateUserStatus(user._id, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'charger_owner': return 'primary';
      case 'ev_user': return 'secondary';
      default: return 'default';
    }
  };

  const UserDetailsDialog = () => (
    <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>User Details</DialogTitle>
      <DialogContent>
        {selectedUser && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ mr: 2, width: 56, height: 56 }}>
                      {(selectedUser.profile?.avatarUrl || selectedUser.profile?.avatar) ? (
                        <img src={selectedUser.profile?.avatarUrl || selectedUser.profile.avatar} alt="Avatar" />
                      ) : (
                        <PersonIcon />
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {selectedUser.profile?.firstName} {selectedUser.profile?.lastName}
                      </Typography>
                      <Typography color="textSecondary">
                        {selectedUser.email}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography><strong>Role:</strong> 
                    <Chip 
                      label={selectedUser.role} 
                      color={getRoleColor(selectedUser.role)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedUser.status} 
                      color={getStatusColor(selectedUser.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography><strong>Email Verified:</strong> {selectedUser.isEmailVerified ? 'Yes' : 'No'}</Typography>
                  <Typography><strong>Phone:</strong> {selectedUser.profile?.phone || 'Not provided'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Account Information
                  </Typography>
                  <Typography><strong>Member Since:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</Typography>
                  <Typography><strong>Last Updated:</strong> {new Date(selectedUser.updatedAt).toLocaleDateString()}</Typography>
                  {selectedUser.profile?.address && (
                    <>
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Address</Typography>
                      <Typography>{selectedUser.profile.address.street}</Typography>
                      <Typography>{selectedUser.profile.address.city}, {selectedUser.profile.address.state}</Typography>
                      <Typography>{selectedUser.profile.address.zipCode}</Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {selectedUser.ratings && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Ratings
                    </Typography>
                    <Typography><strong>Average Rating:</strong> {selectedUser.ratings.average || 'No ratings'}</Typography>
                    <Typography><strong>Total Reviews:</strong> {selectedUser.ratings.count || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleEditUser(selectedUser)} color="primary">
          Edit User
        </Button>
        <Button onClick={() => setDetailsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const EditUserDialog = () => (
    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editData.role}
                onChange={(e) => setEditData(prev => ({ ...prev, role: e.target.value }))}
                label="Role"
              >
                <MenuItem value="ev_user">EV User</MenuItem>
                <MenuItem value="charger_owner">Charger Owner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editData.status}
                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleUpdateUser} color="primary" variant="contained">
          Update User
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                label="Role"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ev_user">EV User</MenuItem>
                <MenuItem value="charger_owner">Charger Owner</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
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
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
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
                <MenuItem value="createdAt">Join Date</MenuItem>
                <MenuItem value="firstName">Name</MenuItem>
                <MenuItem value="email">Email</MenuItem>
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
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Alert severity="info">No users found</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {(user.profile?.avatarUrl || user.profile?.avatar) ? (
                            <img src={user.profile?.avatarUrl || user.profile.avatar} alt="Avatar" />
                          ) : (
                            <PersonIcon />
                          )}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {user.profile?.firstName} {user.profile?.lastName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user._id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status} 
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewDetails(user)}
                        color="primary"
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleEditUser(user)}
                        color="primary"
                        title="Edit User"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleToggleUserStatus(user)}
                        color={user.status === 'active' ? 'error' : 'success'}
                        title={user.status === 'active' ? 'Suspend' : 'Activate'}
                      >
                        {user.status === 'active' ? <BlockIcon /> : <ActivateIcon />}
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
          count={pagination.totalUsers}
          page={pagination.page}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      <UserDetailsDialog />
      <EditUserDialog />
      </Box>
    </AdminLayout>
  );
};

export default AdminUserManagementPage;
