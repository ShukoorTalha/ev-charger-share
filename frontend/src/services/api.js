import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      // Handle different HTTP status codes
      switch (response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 422:
          // Validation errors
          if (response.data && response.data.errors) {
            const errors = response.data.errors;
            Object.keys(errors).forEach(key => {
              toast.error(`${key}: ${errors[key]}`);
            });
          } else {
            toast.error('Validation error occurred.');
          }
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(response.data?.message || 'An error occurred.');
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Other error
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Export common API methods
export const apiMethods = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),
};

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/api/auth/verify-email', { token }),
  refreshToken: () => api.post('/api/auth/refresh-token'),
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data) => api.put('/api/users/profile', data),
};

// User API endpoints
export const userAPI = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data) => api.put('/api/users/profile', data),
  uploadAvatar: (formData) => api.post('/api/users/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAccount: () => api.delete('/api/users/profile'),
  changePassword: (data) => api.put('/api/users/profile/password', data),
};

// Charger API endpoints
export const chargerAPI = {
  search: (params) => api.get('/api/chargers', { params }),
  getById: (id) => api.get(`/api/chargers/${id}`),
  create: (data) => api.post('/api/chargers', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  }),
  update: (id, data) => api.put(`/api/chargers/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  }),
  delete: (id) => api.delete(`/api/chargers/${id}`),
  uploadImages: (id, formData) => api.post(`/api/chargers/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteImage: (id, imageId) => api.delete(`/api/chargers/${id}/images/${imageId}`),
  updateAvailability: (id, data) => api.put(`/api/chargers/${id}/availability`, data),
  getOwnerChargers: () => api.get('/api/chargers/owner/listings'),
  getOwnerStats: () => api.get('/api/chargers/owner/stats'),
};

// Booking API endpoints
export const bookingAPI = {
  getUserBookings: () => api.get('/api/bookings/user'),
  getOwnerBookings: () => api.get('/api/bookings/owner'),
  getById: (id) => api.get(`/api/bookings/${id}`),
  create: (data) => api.post('/api/bookings', data),
  updateStatus: (id, data) => api.put(`/api/bookings/${id}/status`, data),
  cancel: (id) => api.put(`/api/bookings/${id}/cancel`),
  addNotes: (id, notes) => api.put(`/api/bookings/${id}/notes`, { notes }),
  getAccessCode: (id) => api.get(`/api/bookings/${id}/access-code`),
};

// Payment API endpoints
export const paymentAPI = {
  processPayment: (bookingId, paymentData) => api.post('/api/payments/process', { bookingId, ...paymentData }),
  getPaymentHistory: () => api.get('/api/payments/history'),
  getPaymentById: (id) => api.get(`/api/payments/${id}`),
  requestRefund: (paymentId, reason) => api.post('/api/payments/refund', { paymentId, reason }),
  getEarnings: () => api.get('/api/payments/earnings'),
  getChargerEarnings: (chargerId) => api.get(`/api/payments/chargers/${chargerId}/earnings`),
};

// Message API endpoints
export const messageAPI = {
  getBookingMessages: (bookingId) => api.get(`/api/messages/booking/${bookingId}`),
  sendMessage: (data) => api.post('/api/messages', data),
  markAsRead: (messageId) => api.put(`/api/messages/${messageId}/read`),
  getUnreadCount: () => api.get('/api/messages/unread/count'),
  getUserConversations: () => api.get('/api/messages/conversations'),
  reportMessage: (messageId, data) => api.post(`/api/messages/${messageId}/report`, data),
};

// Rating API endpoints
export const ratingAPI = {
  create: (data) => api.post('/api/ratings', data),
  getByUser: (userId) => api.get(`/api/ratings/user/${userId}`),
  getByCharger: (chargerId) => api.get(`/api/ratings/charger/${chargerId}`),
  getById: (id) => api.get(`/api/ratings/${id}`),
  update: (id, data) => api.put(`/api/ratings/${id}`, data),
  delete: (id) => api.delete(`/api/ratings/${id}`),
  getReported: () => api.get('/api/ratings/admin/reported'),
  moderate: (id, data) => api.put(`/api/ratings/admin/${id}/moderate`, data),
};

// Admin API endpoints
export const adminAPI = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  getUsers: (params) => api.get('/api/admin/users', { params }),
  getUserDetails: (id) => api.get(`/api/admin/users/${id}`),
  updateUserStatus: (userId, status) => api.put(`/api/admin/users/${userId}/status`, { status }),
  getChargers: (params) => api.get('/api/admin/chargers', { params }),
  approveCharger: (chargerId) => api.put(`/api/admin/chargers/${chargerId}/approve`),
  rejectCharger: (chargerId, reason) => api.put(`/api/admin/chargers/${chargerId}/reject`, { reason }),
  getBookings: (params) => api.get('/api/admin/bookings', { params }),
  getBookingsWithIssues: () => api.get('/api/admin/bookings/issues'),
  updateBookingStatus: (id, data) => api.put(`/api/admin/bookings/${id}/status`, data),
  getPayments: (params) => api.get('/api/admin/payments', { params }),
  getRefundRequests: () => api.get('/api/admin/payments/refund-requests'),
  getReportedRatings: () => api.get('/api/admin/moderation/ratings'),
  moderateRating: (id, data) => api.put(`/api/admin/moderation/ratings/${id}`, data),
  getReportedMessages: () => api.get('/api/admin/moderation/messages'),
  moderateMessage: (id, data) => api.put(`/api/admin/moderation/messages/${id}`, data),
  getSettings: () => api.get('/api/admin/settings'),
  updateSettings: (data) => api.put('/api/admin/settings', data),
  getLogs: () => api.get('/api/admin/logs'),
};
