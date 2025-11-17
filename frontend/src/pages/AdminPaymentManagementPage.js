import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Undo as RefundIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminPaymentManagementPage = () => {
  const [payments, setPayments] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    platformFees: 0,
    ownerEarnings: 0,
    refunded: 0
  });
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    totalPayments: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    startDate: null,
    endDate: null,
    userId: ''
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundData, setRefundData] = useState({
    amount: '',
    reason: ''
  });
  const [activeTab, setActiveTab] = useState(0);
  const [refundRequestsPagination, setRefundRequestsPagination] = useState({
    page: 0,
    limit: 10,
    totalPayments: 0
  });

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    if (activeTab === 1) {
      fetchRefundRequests();
    }
  }, [activeTab, refundRequestsPagination.page, refundRequestsPagination.limit]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...filters,
        startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : undefined,
        endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : undefined
      };

      const response = await adminAPI.getAllPayments(params);
      setPayments(response.data.data);
      setSummary(response.data.summary);
      setPagination(prev => ({
        ...prev,
        totalPayments: response.data.pagination.totalPayments
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundRequests = async () => {
    try {
      const params = {
        page: refundRequestsPagination.page + 1,
        limit: refundRequestsPagination.limit,
        status: 'pending'
      };

      const response = await adminAPI.getRefundRequests(params);
      setRefundRequests(response.data.data.payments);
      setRefundRequestsPagination(prev => ({
        ...prev,
        totalPayments: response.data.data.pagination.totalPayments
      }));
    } catch (error) {
      console.error('Error fetching refund requests:', error);
      toast.error('Failed to fetch refund requests');
    }
  };

  const handleViewPaymentDetails = async (paymentId) => {
    try {
      const response = await adminAPI.getPaymentDetails(paymentId);
      setSelectedPayment(response.data.data);
      setPaymentDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error('Failed to fetch payment details');
    }
  };

  const handleProcessRefund = async () => {
    try {
      const response = await adminAPI.processRefund(selectedPayment.payment._id, refundData);
      toast.success(response.data.message);
      setRefundDialogOpen(false);
      setRefundData({ amount: '', reason: '' });
      fetchPayments();
      if (activeTab === 1) {
        fetchRefundRequests();
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
        return <SuccessIcon />;
      case 'pending':
        return <PendingIcon />;
      case 'failed':
        return <CancelIcon />;
      case 'cancelled':
        return <WarningIcon />;
      default:
        return <PaymentIcon />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const PaymentDetailsDialog = () => (
    <Dialog open={paymentDetailsOpen} onClose={() => setPaymentDetailsOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ReceiptIcon />
          Payment Details
        </Box>
      </DialogTitle>
      <DialogContent>
        {selectedPayment && (
          <Box>
            <Grid container spacing={3}>
              {/* Payment Information */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Payment Information</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Payment ID"
                      secondary={selectedPayment.payment._id}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Amount"
                      secondary={formatCurrency(selectedPayment.payment.amount.total)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Platform Fee"
                      secondary={formatCurrency(selectedPayment.payment.amount.platformFee)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Owner Earning"
                      secondary={formatCurrency(selectedPayment.payment.amount.ownerEarning)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={
                        <Chip
                          label={selectedPayment.payment.transaction.status}
                          color={getStatusColor(selectedPayment.payment.transaction.status)}
                          size="small"
                          icon={getStatusIcon(selectedPayment.payment.transaction.status)}
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Created At"
                      secondary={format(new Date(selectedPayment.payment.createdAt), 'PPpp')}
                    />
                  </ListItem>
                </List>
              </Grid>

              {/* User & Booking Information */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>User & Booking</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="User"
                      secondary={`${selectedPayment.payment.user.name} (${selectedPayment.payment.user.email})`}
                    />
                  </ListItem>
                  {selectedPayment.payment.booking && (
                    <>
                      <ListItem>
                        <ListItemText
                          primary="Booking Period"
                          secondary={`${format(new Date(selectedPayment.payment.booking.startTime), 'PPp')} - ${format(new Date(selectedPayment.payment.booking.endTime), 'PPp')}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Charger"
                          secondary={selectedPayment.payment.booking.charger?.title || 'N/A'}
                        />
                      </ListItem>
                    </>
                  )}
                </List>
              </Grid>

              {/* Stripe Details */}
              {selectedPayment.stripePaymentDetails && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Stripe Payment Details</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Stripe Payment ID"
                        secondary={selectedPayment.stripePaymentDetails.id}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Payment Method"
                        secondary={selectedPayment.stripePaymentDetails.paymentMethod || 'N/A'}
                      />
                    </ListItem>
                    {selectedPayment.stripePaymentDetails.receiptUrl && (
                      <ListItem>
                        <ListItemText
                          primary="Receipt"
                          secondary={
                            <Button
                              size="small"
                              href={selectedPayment.stripePaymentDetails.receiptUrl}
                              target="_blank"
                              startIcon={<ReceiptIcon />}
                            >
                              View Receipt
                            </Button>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
              )}

              {/* Refund Information */}
              {selectedPayment.payment.transaction.refunded && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Refund Information</Typography>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Refunded Amount:</strong> {formatCurrency(selectedPayment.payment.transaction.refundAmount)}<br />
                      <strong>Refund Date:</strong> {format(new Date(selectedPayment.payment.transaction.refundDate), 'PPpp')}<br />
                      <strong>Reason:</strong> {selectedPayment.payment.transaction.refundReason}
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {selectedPayment && !selectedPayment.payment.transaction.refunded && selectedPayment.payment.transaction.status === 'succeeded' && (
          <Button
            onClick={() => {
              setRefundData({
                amount: selectedPayment.payment.amount.total,
                reason: ''
              });
              setRefundDialogOpen(true);
            }}
            startIcon={<RefundIcon />}
            color="warning"
          >
            Process Refund
          </Button>
        )}
        <Button onClick={() => setPaymentDetailsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  const RefundDialog = () => (
    <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <RefundIcon />
          Process Refund
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Refund Amount"
            type="number"
            value={refundData.amount}
            onChange={(e) => setRefundData(prev => ({ ...prev, amount: e.target.value }))}
            margin="normal"
            helperText={selectedPayment ? `Maximum: ${formatCurrency(selectedPayment.payment.amount.total)}` : ''}
          />
          <TextField
            fullWidth
            label="Refund Reason"
            multiline
            rows={3}
            value={refundData.reason}
            onChange={(e) => setRefundData(prev => ({ ...prev, reason: e.target.value }))}
            margin="normal"
            placeholder="Enter reason for refund..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleProcessRefund} variant="contained" color="warning">
          Process Refund
        </Button>
      </DialogActions>
    </Dialog>
  );

  const PaymentsTab = () => (
    <Box>
      {/* Summary Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(summary.total)}
            icon={<TrendingUpIcon fontSize="large" />}
            color="success"
            subtitle="All time earnings"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Platform Fees"
            value={formatCurrency(summary.platformFees)}
            icon={<BankIcon fontSize="large" />}
            color="primary"
            subtitle="Commission earned"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Owner Earnings"
            value={formatCurrency(summary.ownerEarnings)}
            icon={<CardIcon fontSize="large" />}
            color="info"
            subtitle="Paid to owners"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Refunded"
            value={formatCurrency(summary.refunded)}
            icon={<RefundIcon fontSize="large" />}
            color="warning"
            subtitle="Total refunds"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="succeeded">Succeeded</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="User ID"
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({ status: '', startDate: null, endDate: null, userId: '' })}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Payments Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Refunded</TableCell>
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
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {payment._id.slice(-8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {payment.user?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {payment.user?.email || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(payment.amount.total)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Fee: {formatCurrency(payment.amount.platformFee)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.transaction.status}
                        color={getStatusColor(payment.transaction.status)}
                        size="small"
                        icon={getStatusIcon(payment.transaction.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {format(new Date(payment.createdAt), 'HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {payment.transaction.refunded ? (
                        <Chip
                          label={formatCurrency(payment.transaction.refundAmount)}
                          color="warning"
                          size="small"
                          icon={<RefundIcon />}
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPaymentDetails(payment._id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.totalPayments}
          page={pagination.page}
          onPageChange={(event, newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(event) => setPagination(prev => ({ ...prev, limit: parseInt(event.target.value, 10), page: 0 }))}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    </Box>
  );

  const RefundRequestsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Refund Requests
      </Typography>
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Requested Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refundRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No pending refund requests
                  </TableCell>
                </TableRow>
              ) : (
                refundRequests.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {payment._id.slice(-8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {payment.user?.firstName} {payment.user?.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {payment.user?.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.amount.total)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.refund?.requestedAt), 'PPp')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {payment.refund?.reason || 'No reason provided'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={<RefundIcon />}
                        onClick={() => {
                          setSelectedPayment({ payment });
                          setRefundData({
                            amount: payment.amount.total,
                            reason: payment.refund?.reason || ''
                          });
                          setRefundDialogOpen(true);
                        }}
                      >
                        Process
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={refundRequestsPagination.totalPayments}
          page={refundRequestsPagination.page}
          onPageChange={(event, newPage) => setRefundRequestsPagination(prev => ({ ...prev, page: newPage }))}
          rowsPerPage={refundRequestsPagination.limit}
          onRowsPerPageChange={(event) => setRefundRequestsPagination(prev => ({ ...prev, limit: parseInt(event.target.value, 10), page: 0 }))}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    </Box>
  );

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <PaymentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Payment Management
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PaymentIcon />
                All Payments
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <RefundIcon />
                Refund Requests
                {refundRequests.length > 0 && (
                  <Badge badgeContent={refundRequests.length} color="warning" />
                )}
              </Box>
            }
          />
        </Tabs>

        {activeTab === 0 && <PaymentsTab />}
        {activeTab === 1 && <RefundRequestsTab />}

        <PaymentDetailsDialog />
        <RefundDialog />
      </Box>
    </AdminLayout>
  );
};

export default AdminPaymentManagementPage;
