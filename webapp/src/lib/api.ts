import axios from 'axios';
import { supabase } from './supabase';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

export const chatAPI = {
  sendMessage: async (message: string) => {
    const response = await api.post('/api/webapp/chat', { message });
    return response.data;
  },
};

export const lessonsAPI = {
  getLessons: async (level?: string) => {
    const params = level ? { level } : {};
    const response = await api.get('/api/lessons', { params });
    return response.data;
  },

  getLesson: async (id: string) => {
    const response = await api.get(`/api/lessons/${id}`);
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/api/webapp/profile');
    return response.data;
  },

  updateProfile: async (data: Record<string, unknown>) => {
    const response = await api.patch('/api/webapp/profile', data);
    return response.data;
  },

  getProgress: async () => {
    const response = await api.get('/api/webapp/progress');
    return response.data;
  },
};

export const paymentsAPI = {
  createCheckout: async () => {
    const response = await api.post('/api/webapp/checkout');
    return response.data;
  },
};
