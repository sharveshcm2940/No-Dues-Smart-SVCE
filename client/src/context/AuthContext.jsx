import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { getClientDeviceMetadata } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nodues_user');
      if (!saved || saved === 'undefined' || saved === 'null') {
        localStorage.removeItem('nodues_user');
        return null;
      }
      return JSON.parse(saved);
    } catch (err) {
      console.warn('Invalid user stored in localStorage, resetting:', err);
      localStorage.removeItem('nodues_user');
      localStorage.removeItem('nodues_token');
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('nodues_token');
    if (!savedToken || savedToken === 'undefined' || savedToken === 'null') {
      localStorage.removeItem('nodues_token');
      return null;
    }
    return savedToken;
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('nodues_token');
      localStorage.removeItem('nodues_user');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const meta = getClientDeviceMetadata();
      const response = await api.post('/auth/login', { 
        username, 
        password,
        location: meta.location,
        deviceName: meta.deviceName,
        deviceType: meta.deviceType
      });
      if (response.data.success) {
        const { token, refreshToken, user } = response.data;
        setToken(token);
        setUser(user);
        localStorage.setItem('nodues_token', token);
        if (refreshToken) {
          localStorage.setItem('nodues_refresh_token', refreshToken);
        }
        localStorage.setItem('nodues_user', JSON.stringify(user));
        return { success: true, user };
      } else {
        setAuthError(response.data.message || 'Login failed');
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      const msg = err.response?.data?.message || (isNetworkError ? 'Unable to connect to backend server (port 5000). Please ensure the backend is running.' : 'Invalid username or password. Please check your credentials.');
      setAuthError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (mfa_token, totp_code) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.post('/auth/mfa/verify', { 
        mfa_token, 
        totp_code,
        mfaPendingToken: mfa_token,
        totpCode: totp_code
      });
      if (response.data.success) {
        const { token, refreshToken, user } = response.data;
        setToken(token);
        setUser(user);
        localStorage.setItem('nodues_token', token);
        if (refreshToken) {
          localStorage.setItem('nodues_refresh_token', refreshToken);
        }
        localStorage.setItem('nodues_user', JSON.stringify(user));
        return { success: true, user };
      } else {
        setAuthError(response.data.message || 'MFA Verification failed');
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired TOTP code.';
      setAuthError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('nodues_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('nodues_token');
      localStorage.removeItem('nodues_refresh_token');
      localStorage.removeItem('nodues_user');
      try {
        sessionStorage.clear();
      } catch (e) {
        // Ignore sessionStorage error
      }
      // Purge all PWA Service Worker caches on logout
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        } catch (e) {
          // Ignore cache deletion error
        }
      }
    }
  };

  const updateUserData = (updatedProfile) => {
    if (user) {
      const newObj = {
        ...user,
        profile: {
          ...user.profile,
          ...updatedProfile
        }
      };
      setUser(newObj);
      localStorage.setItem('nodues_user', JSON.stringify(newObj));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        login,
        verifyMfa,
        logout,
        updateUserData,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
