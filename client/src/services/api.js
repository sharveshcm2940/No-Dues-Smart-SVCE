import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { 
  getClientDeviceMetadata, 
  getPreciseLocation, 
  initLocationDetection 
} from './locationService';

export { getClientDeviceMetadata, getPreciseLocation, initLocationDetection };

// Interceptor to inject JWT token and Device & Location audit headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nodues_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach device & location audit headers safely encoded for HTTP header compliance
    const meta = getClientDeviceMetadata();
    config.headers['x-device-name'] = encodeURIComponent(meta.deviceName || 'Web Client');
    config.headers['x-device-type'] = meta.deviceType || 'Desktop';
    config.headers['x-client-location'] = encodeURIComponent(meta.location || 'Unknown');

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle token refresh and session expiration
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle mandatory password change requirement
    if (error.response && error.response.status === 403 && error.response.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      window.dispatchEvent(new CustomEvent('auth:password_change_required', { detail: error.response.data }));
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('nodues_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('nodues_token');
        localStorage.removeItem('nodues_refresh_token');
        localStorage.removeItem('nodues_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        if (res.data?.success && res.data?.token) {
          const newToken = res.data.token;
          const newRefreshToken = res.data.refreshToken;
          localStorage.setItem('nodues_token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('nodues_refresh_token', newRefreshToken);
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('nodues_token');
        localStorage.removeItem('nodues_refresh_token');
        localStorage.removeItem('nodues_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
