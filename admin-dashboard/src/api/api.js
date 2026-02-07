import axios from 'axios';

// API Base URL - uses environment variable or defaults to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH API
// ============================================================================

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/admin/login', { email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/api/admin/me');
    return response.data;
  },
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },
};

// ============================================================================
// USERS API
// ============================================================================

export const usersAPI = {
  getUsers: async (page = 1, limit = 20, search = '') => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const response = await api.get(`/api/admin/users?${params}`);
    return response.data;
  },

  getUser: async (userId) => {
    const response = await api.get(`/api/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, updates) => {
    const response = await api.patch(`/api/admin/users/${userId}`, updates);
    return response.data;
  },
};

// ============================================================================
// LESSONS API
// ============================================================================

export const lessonsAPI = {
  getAllLessons: async () => {
    const response = await api.get('/api/lessons/admin/all');
    return response.data;
  },

  getLesson: async (lessonId) => {
    const response = await api.get(`/api/lessons/${lessonId}`);
    return response.data;
  },

  createLesson: async (lessonData) => {
    const response = await api.post('/api/lessons', lessonData);
    return response.data;
  },

  updateLesson: async (lessonId, lessonData) => {
    const response = await api.patch(`/api/lessons/${lessonId}`, lessonData);
    return response.data;
  },

  deleteLesson: async (lessonId) => {
    const response = await api.delete(`/api/lessons/${lessonId}`);
    return response.data;
  },
};

export default api;
