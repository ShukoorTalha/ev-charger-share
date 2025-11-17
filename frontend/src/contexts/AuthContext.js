import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize authentication state
  useEffect(() => {
    validateToken();
  }, []);

  // Validate token and load user data
  const validateToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await userAPI.getProfile();
      
      if (response.data.success && response.data.data) {
        setUser(response.data.data); // Set the full user object
      } else {
        // Invalid token
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Token validation error:', err);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await authAPI.login({ email, password });
      console.log('[LOGIN] API response:', response);
      if (response.data.success && response.data.token) {
        const token = response.data.token;
        localStorage.setItem('token', token);
        // Fetch user profile after login
        try {
          const profileResp = await userAPI.getProfile();
          if (profileResp.data.success && profileResp.data.data) {
            setUser(profileResp.data.data);
            console.log('[LOGIN] User set:', profileResp.data.data);
            toast.success('Login successful!');
            return { success: true, user: profileResp.data.data };
          } else {
            setError('Failed to fetch user profile after login.');
            toast.error('Failed to fetch user profile after login.');
            return { success: false, error: 'Failed to fetch user profile after login.' };
          }
        } catch (profileErr) {
          setError('Failed to fetch user profile after login.');
          toast.error('Failed to fetch user profile after login.');
          console.error('[LOGIN] getProfile error:', profileErr);
          return { success: false, error: 'Failed to fetch user profile after login.' };
        }
      } else {
        setError(response.data.message || 'Login failed');
        toast.error(response.data.message || 'Login failed');
        console.error('[LOGIN] Error:', response.data.message || 'Login failed');
        return { success: false, error: response.data.message || 'Login failed' };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('[LOGIN] Exception:', errorMessage, err);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const response = await authAPI.register(userData);
      console.log('[REGISTER] API response:', response);
      if (response.data.success && response.data.token) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        console.log('[REGISTER] Token stored:', localStorage.getItem('token'));
        console.log('[REGISTER] User set:', user);
        toast.success('Registration successful!');
        return { success: true, user };
      } else {
        setError(response.data.message || 'Registration failed');
        toast.error(response.data.message || 'Registration failed');
        console.error('[REGISTER] Error:', response.data.message || 'Registration failed');
        return { success: false, error: response.data.message || 'Registration failed' };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('[REGISTER] Exception:', errorMessage, err);
      return { success: false, error: errorMessage };
    }
  };

  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await authAPI.forgotPassword(email);
      
      if (response.data.success) {
        toast.success('Password reset email sent. Please check your inbox.');
        return { success: true };
      } else {
        setError(response.data.error?.message || 'Failed to send reset email');
        return { success: false, error: response.data.error?.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (token, password) => {
    setError(null);
    try {
      const response = await authAPI.resetPassword(token, password);
      
      if (response.data.success) {
        toast.success('Password reset successful. You can now log in with your new password.');
        return { success: true };
      } else {
        setError(response.data.error?.message || 'Password reset failed');
        return { success: false, error: response.data.error?.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Password reset failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Client-side cleanup only - no API call needed for JWT
    localStorage.removeItem('token');
    setUser(null);
    toast.info('You have been logged out');
  };

  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const response = await userAPI.updateProfile(profileData);
      
      if (response.data.success) {
        setUser(response.data.data.user);
        toast.success('Profile updated successfully');
        return { success: true, user: response.data.data.user };
      } else {
        setError(response.data.error?.message || 'Profile update failed');
        return { success: false, error: response.data.error?.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Profile update failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setError(null);
    try {
      const response = await userAPI.changePassword({ currentPassword, newPassword });
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        return { success: true };
      } else {
        setError(response.data.error?.message || 'Password change failed');
        return { success: false, error: response.data.error?.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || 'Password change failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOwner: user?.role === 'charger_owner',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};