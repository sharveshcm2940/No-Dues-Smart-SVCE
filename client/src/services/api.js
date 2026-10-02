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

// Interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('nodues_token');
      localStorage.removeItem('nodues_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
