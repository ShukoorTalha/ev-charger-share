import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ChargerManagementPage from './pages/ChargerManagementPage';
import ChargerFormPage from './pages/ChargerFormPage';
import ChargerSearchPage from './pages/ChargerSearchPage';
import ChargerDetailPage from './pages/ChargerDetailPage';
import BookingManagementPage from './pages/BookingManagementPage';
import BookingDetailPage from './pages/BookingDetailPage';
import ReviewFormPage from './pages/ReviewFormPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import MessagesPage from './pages/MessagesPage';
import ReviewsPage from './pages/ReviewsPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminChargerManagementPage from './pages/AdminChargerManagementPage';
import AdminUserManagementPage from './pages/AdminUserManagementPage';
import AdminBookingManagementPage from './pages/AdminBookingManagementPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminPaymentManagementPage from './pages/AdminPaymentManagementPage';
import AdminSystemSettingsPage from './pages/AdminSystemSettingsPage';
import AdminModerationPage from './pages/AdminModerationPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
          <Header />
          <Container component="main" sx={{ minHeight: 'calc(100vh - 140px)', py: 3 }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              
              {/* Charger Routes */}
              <Route path="/chargers" element={<ChargerSearchPage />} />
              <Route path="/chargers/:id" element={<ChargerDetailPage />} />
              
              {/* Charger Management Routes */}
              <Route path="/chargers/manage" element={
                <ProtectedRoute requiredRole="charger_owner">
                  <ChargerManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/chargers/new" element={
                <ProtectedRoute requiredRole="charger_owner">
                  <ChargerFormPage />
                </ProtectedRoute>
              } />
              <Route path="/chargers/:id/edit" element={
                <ProtectedRoute requiredRole="charger_owner">
                  <ChargerFormPage />
                </ProtectedRoute>
              } />
              
              {/* Booking Routes */}
              <Route path="/bookings" element={
                <ProtectedRoute>
                  <BookingManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/bookings/:id" element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              } />
              
              {/* Review Routes */}
              <Route path="/reviews/new" element={
                <ProtectedRoute>
                  <ReviewFormPage />
                </ProtectedRoute>
              } />
              <Route path="/reviews" element={
                <ProtectedRoute>
                  <ReviewsPage />
                </ProtectedRoute>
              } />
              
              {/* Message Routes */}
              <Route path="/messages" element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              } />
              
              {/* Account Settings Routes */}
              <Route path="/account" element={
                <ProtectedRoute>
                  <AccountSettingsPage />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUserManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/chargers" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminChargerManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/chargers/pending" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminChargerManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/chargers/:id" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminChargerManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/bookings" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminBookingManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/bookings/issues" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminBookingManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/payments" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPaymentManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSystemSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/moderation" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminModerationPage />
                </ProtectedRoute>
              } />
            </Routes>
          </Container>
          <Footer />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;