import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nodues_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('nodues_token') || null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        const { token, user } = response.data;
        setToken(token);
        setUser(user);
        localStorage.setItem('nodues_token', token);
        localStorage.setItem('nodues_user', JSON.stringify(user));
        return { success: true };
      } else {
        setAuthError(response.data.message || 'Login failed');
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication error. Please check your credentials.';
      setAuthError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nodues_token');
    localStorage.removeItem('nodues_user');
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
