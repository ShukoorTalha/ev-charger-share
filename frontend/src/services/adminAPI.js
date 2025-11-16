import api from './api';

const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/api/admin/dashboard'),

  // User Management
  getAllUsers: (params = {}) => api.get('/api/admin/users', { params }),
  getUserDetails: (id) => api.get(`/api/admin/users/${id}`),
  updateUserStatus: (id, data) => api.put(`/api/admin/users/${id}/status`, data),
  updateUserRole: (id, data) => api.put(`/api/admin/users/${id}/role`, data),

  // Charger Management
  getAllChargers: (params = {}) => api.get('/api/admin/chargers', { params }),
  getPendingChargers: (params = {}) => api.get('/api/admin/chargers/pending', { params }),
  approveCharger: (id, data = {}) => api.put(`/api/admin/chargers/${id}/approve`, data),
  rejectCharger: (id, data) => api.put(`/api/admin/chargers/${id}/reject`, data),

  // Booking Management
  getAllBookings: (params = {}) => api.get('/api/admin/bookings', { params }),
  getBookingsWithIssues: (params = {}) => api.get('/api/admin/bookings/issues', { params }),
  updateBookingStatus: (id, data) => api.put(`/api/admin/bookings/${id}/status`, data),

  // Payment Management
  getAllPayments: (params = {}) => api.get('/api/admin/payments', { params }),
  getRefundRequests: (params = {}) => api.get('/api/admin/payments/refund-requests', { params }),
  getPaymentDetails: (id) => api.get(`/api/admin/payments/${id}`),
  processRefund: (id, data) => api.post(`/api/admin/payments/${id}/refund`, data),

  // Content Moderation
  getModerationDashboard: () => api.get('/api/admin/moderation/dashboard'),
  getReportedRatings: (params = {}) => api.get('/api/admin/moderation/ratings', { params }),
  moderateRating: (id, data) => api.put(`/api/admin/moderation/ratings/${id}`, data),
  getReportedMessages: (params = {}) => api.get('/api/admin/moderation/messages', { params }),
  moderateMessage: (id, data) => api.put(`/api/admin/moderation/messages/${id}`, data),
  getUserSecurityProfile: (id) => api.get(`/api/admin/moderation/users/${id}/security`),
  suspendUser: (id, data) => api.put(`/api/admin/moderation/users/${id}/suspend`, data),

  // System Settings
  getSystemSettings: () => api.get('/api/admin/settings'),
  updateSystemSettings: (data) => api.put('/api/admin/settings', data),
  getAuditLogs: (params = {}) => api.get('/api/admin/logs', { params }),
  
  // Analytics (placeholder - not implemented in backend yet)
  getAnalytics: (params = {}) => api.get('/api/admin/analytics', { params })
};

export default adminAPI;
