import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Security as SecurityIcon,
  Report as ReportIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Delete as DeleteIcon,
  Check as ApproveIcon,
  Block as SuspendIcon,
  Person as PersonIcon,
  Message as MessageIcon,
  Star as RatingIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
  Timeline as TimelineIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import adminAPI from '../services/adminAPI';
import AdminLayout from '../components/AdminLayout';

const AdminModerationPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [reportedRatings, setReportedRatings] = useState([]);
  const [reportedMessages, setReportedMessages] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [moderationDialog, setModerationDialog] = useState(false);
  const [userSecurityDialog, setUserSecurityDialog] = useState(false);
  const [userSecurityData, setUserSecurityData] = useState(null);
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [moderationAction, setModerationAction] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('');

  useEffect(() => {
    fetchDashboard();
    if (activeTab === 1) fetchReportedRatings();
    if (activeTab === 2) fetchReportedMessages();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getModerationDashboard();
      setDashboard(response.data.data);
    } catch (error) {
      console.error('Error fetching moderation dashboard:', error);
      toast.error('Failed to load moderation dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportedRatings = async () => {
    try {
      const response = await adminAPI.getReportedRatings();
      setReportedRatings(response.data.data);
    } catch (error) {
      console.error('Error fetching reported ratings:', error);
      toast.error('Failed to load reported ratings');
    }
  };

  const fetchReportedMessages = async () => {
    try {
      const response = await adminAPI.getReportedMessages();
      setReportedMessages(response.data.data);
    } catch (error) {
      console.error('Error fetching reported messages:', error);
      toast.error('Failed to load reported messages');
    }
  };

  const handleModerateContent = async () => {
    try {
      const isRating = selectedItem.rating !== undefined;
      const apiCall = isRating 
        ? adminAPI.moderateRating(selectedItem._id, { action: moderationAction, reason: moderationReason })
        : adminAPI.moderateMessage(selectedItem._id, { action: moderationAction, reason: moderationReason });
      
      await apiCall;
      
      toast.success(`Content ${moderationAction}d successfully`);
      setModerationDialog(false);
      setSelectedItem(null);
      setModerationAction('');
      setModerationReason('');
      
      // Refresh the appropriate list
      if (isRating) {
        fetchReportedRatings();
      } else {
        fetchReportedMessages();
      }
      
      fetchDashboard();
    } catch (error) {
      console.error('Error moderating content:', error);
      toast.error('Failed to moderate content');
    }
  };

  const handleViewUserSecurity = async (userId) => {
    try {
      setLoading(true);
      const response = await adminAPI.getUserSecurityProfile(userId);
      setUserSecurityData(response.data.data);
      setUserSecurityDialog(true);
    } catch (error) {
      console.error('Error fetching user security profile:', error);
      toast.error('Failed to load user security profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    try {
      await adminAPI.suspendUser(selectedUser._id, {
        action: 'suspend',
        reason: moderationReason,
        duration: suspensionDuration ? parseInt(suspensionDuration) : null
      });
      
      toast.success('User suspended successfully');
      setSuspendDialog(false);
      setSelectedUser(null);
      setModerationReason('');
      setSuspensionDuration('');
      
      // Refresh data
      fetchDashboard();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const getRiskScoreColor = (riskScore) => {
    switch (riskScore) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
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

  if (loading && !dashboard) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Security & Moderation
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboard}
          >
            Refresh
          </Button>
        </Box>

        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab 
            label="Dashboard" 
            icon={<SecurityIcon />}
            iconPosition="start"
          />
          <Tab 
            label={
              <Badge badgeContent={dashboard?.statistics.reportedRatings || 0} color="error">
                Reported Ratings
              </Badge>
            }
            icon={<RatingIcon />}
            iconPosition="start"
          />
          <Tab 
            label={
              <Badge badgeContent={dashboard?.statistics.reportedMessages || 0} color="error">
                Reported Messages
              </Badge>
            }
            icon={<MessageIcon />}
            iconPosition="start"
          />
        </Tabs>

        {/* Dashboard Tab */}
        {activeTab === 0 && dashboard && (
          <>
            {/* Statistics Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Reported Content"
                  value={dashboard.statistics.totalReported}
                  icon={<ReportIcon fontSize="large" />}
                  color="error"
                  subtitle="Pending review"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Hidden Content"
                  value={dashboard.statistics.totalHidden}
                  icon={<HideIcon fontSize="large" />}
                  color="warning"
                  subtitle="Moderated content"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Reported Ratings"
                  value={dashboard.statistics.reportedRatings}
                  icon={<RatingIcon fontSize="large" />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Reported Messages"
                  value={dashboard.statistics.reportedMessages}
                  icon={<MessageIcon fontSize="large" />}
                  color="info"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Recent Moderation Activity */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardHeader 
                    title="Recent Moderation Activity"
                    avatar={<TimelineIcon />}
                  />
                  <CardContent>
                    {dashboard.recentActivity.length > 0 ? (
                      <List>
                        {dashboard.recentActivity.map((activity, index) => (
                          <ListItem key={index} divider>
                            <ListItemAvatar>
                              <Avatar>
                                {activity.hidden ? <HideIcon /> : <ApproveIcon />}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`Content ${activity.hidden ? 'hidden' : 'approved'}`}
                              secondary={
                                <>
                                  <Typography variant="body2" color="textSecondary">
                                    By: {activity.moderatedBy?.name || 'Unknown'}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    {format(new Date(activity.moderatedAt), 'MMM dd, yyyy HH:mm')}
                                  </Typography>
                                  {activity.moderationNotes && (
                                    <Typography variant="body2" color="textSecondary">
                                      Note: {activity.moderationNotes}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="textSecondary" align="center">
                        No recent moderation activity
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Reporters */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader 
                    title="Top Reporters"
                    avatar={<ShieldIcon />}
                  />
                  <CardContent>
                    {dashboard.topReporters.length > 0 ? (
                      <List>
                        {dashboard.topReporters.map((reporter, index) => (
                          <ListItem key={index}>
                            <ListItemAvatar>
                              <Avatar>
                                <PersonIcon />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={reporter.name}
                              secondary={`${reporter.reportCount} reports`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                size="small"
                                onClick={() => handleViewUserSecurity(reporter._id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="textSecondary" align="center">
                        No reporters found
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* Reported Ratings Tab */}
        {activeTab === 1 && (
          <Card>
            <CardHeader title="Reported Ratings" />
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rating</TableCell>
                      <TableCell>Reviewer</TableCell>
                      <TableCell>Reviewee</TableCell>
                      <TableCell>Content</TableCell>
                      <TableCell>Reported Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportedRatings.map((rating) => (
                      <TableRow key={rating._id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>{rating.rating}/5</Typography>
                            <Chip
                              label={rating.type}
                              size="small"
                              color={rating.type === 'user' ? 'primary' : 'secondary'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar src={rating.reviewer?.profileImage} sx={{ width: 32, height: 32 }}>
                              {rating.reviewer?.name?.[0]}
                            </Avatar>
                            <Typography variant="body2">
                              {rating.reviewer?.name || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar src={rating.reviewee?.profileImage} sx={{ width: 32, height: 32 }}>
                              {rating.reviewee?.name?.[0]}
                            </Avatar>
                            <Typography variant="body2">
                              {rating.reviewee?.name || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }}>
                            {rating.comment || 'No comment'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {format(new Date(rating.reportedAt || rating.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setSelectedItem(rating);
                                  setModerationAction('approve');
                                  setModerationDialog(true);
                                }}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hide">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => {
                                  setSelectedItem(rating);
                                  setModerationAction('hide');
                                  setModerationDialog(true);
                                }}
                              >
                                <HideIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedItem(rating);
                                  setModerationAction('delete');
                                  setModerationDialog(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportedRatings.length === 0 && (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No reported ratings found
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reported Messages Tab */}
        {activeTab === 2 && (
          <Card>
            <CardHeader title="Reported Messages" />
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sender</TableCell>
                      <TableCell>Content</TableCell>
                      <TableCell>Booking</TableCell>
                      <TableCell>Reported Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportedMessages.map((message) => (
                      <TableRow key={message._id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar src={message.sender?.profileImage} sx={{ width: 32, height: 32 }}>
                              {message.sender?.name?.[0]}
                            </Avatar>
                            <Typography variant="body2">
                              {message.sender?.name || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 300 }}>
                            {message.content}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {message.booking && (
                            <Typography variant="body2">
                              {format(new Date(message.booking.startTime), 'MMM dd, yyyy')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(message.reportedAt || message.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setSelectedItem(message);
                                  setModerationAction('approve');
                                  setModerationDialog(true);
                                }}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Hide">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => {
                                  setSelectedItem(message);
                                  setModerationAction('hide');
                                  setModerationDialog(true);
                                }}
                              >
                                <HideIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedItem(message);
                                  setModerationAction('delete');
                                  setModerationDialog(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportedMessages.length === 0 && (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No reported messages found
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Moderation Dialog */}
        <Dialog open={moderationDialog} onClose={() => setModerationDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {moderationAction === 'approve' && 'Approve Content'}
            {moderationAction === 'hide' && 'Hide Content'}
            {moderationAction === 'delete' && 'Delete Content'}
          </DialogTitle>
          <DialogContent>
            <Alert severity={moderationAction === 'delete' ? 'error' : 'info'} sx={{ mb: 2 }}>
              {moderationAction === 'approve' && 'This will approve the content and remove it from the reported list.'}
              {moderationAction === 'hide' && 'This will hide the content from public view but keep it in the system.'}
              {moderationAction === 'delete' && 'This will permanently delete the content. This action cannot be undone.'}
            </Alert>
            <TextField
              fullWidth
              label="Reason (optional)"
              multiline
              rows={3}
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="Provide a reason for this moderation action..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModerationDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleModerateContent}
              color={moderationAction === 'delete' ? 'error' : 'primary'}
              variant="contained"
            >
              {moderationAction === 'approve' && 'Approve'}
              {moderationAction === 'hide' && 'Hide'}
              {moderationAction === 'delete' && 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Security Profile Dialog */}
        <Dialog 
          open={userSecurityDialog} 
          onClose={() => setUserSecurityDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>User Security Profile</DialogTitle>
          <DialogContent>
            {userSecurityData && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="User Information" />
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar src={userSecurityData.user.profileImage} sx={{ width: 64, height: 64 }}>
                          {userSecurityData.user.name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{userSecurityData.user.name}</Typography>
                          <Typography color="textSecondary">{userSecurityData.user.email}</Typography>
                          <Chip 
                            label={userSecurityData.user.role} 
                            size="small" 
                            color="primary" 
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        Member since: {format(new Date(userSecurityData.user.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Security Assessment" />
                    <CardContent>
                      <Box mb={2}>
                        <Typography variant="body2" color="textSecondary">Risk Score</Typography>
                        <Chip 
                          label={userSecurityData.security.riskScore.toUpperCase()}
                          color={getRiskScoreColor(userSecurityData.security.riskScore)}
                          icon={<WarningIcon />}
                        />
                      </Box>
                      <Typography variant="body2">
                        Reported Ratings: {userSecurityData.security.reportedRatings}
                      </Typography>
                      <Typography variant="body2">
                        Reported Messages: {userSecurityData.security.reportedMessages}
                      </Typography>
                      <Typography variant="body2">
                        Reports Submitted: {userSecurityData.security.reportsSubmitted}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserSecurityDialog(false)}>Close</Button>
            {userSecurityData && (
              <Button
                color="error"
                variant="outlined"
                startIcon={<SuspendIcon />}
                onClick={() => {
                  setSelectedUser(userSecurityData.user);
                  setSuspendDialog(true);
                  setUserSecurityDialog(false);
                }}
              >
                Suspend User
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Suspend User Dialog */}
        <Dialog open={suspendDialog} onClose={() => setSuspendDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will suspend the user's account and prevent them from accessing the platform.
            </Alert>
            <TextField
              fullWidth
              label="Reason for suspension"
              multiline
              rows={3}
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Suspension Duration</InputLabel>
              <Select
                value={suspensionDuration}
                label="Suspension Duration"
                onChange={(e) => setSuspensionDuration(e.target.value)}
              >
                <MenuItem value="">Indefinite</MenuItem>
                <MenuItem value="1">1 Day</MenuItem>
                <MenuItem value="3">3 Days</MenuItem>
                <MenuItem value="7">1 Week</MenuItem>
                <MenuItem value="30">1 Month</MenuItem>
                <MenuItem value="90">3 Months</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuspendDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSuspendUser}
              color="error"
              variant="contained"
              disabled={!moderationReason.trim()}
            >
              Suspend User
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default AdminModerationPage;
