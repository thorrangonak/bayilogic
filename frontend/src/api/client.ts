import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export const quotesApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/quotes', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/quotes/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/quotes', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/quotes/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/quotes/${id}`);
    return response.data;
  },
  addItem: async (quoteId: string, data: any) => {
    const response = await apiClient.post(`/quotes/${quoteId}/items`, data);
    return response.data;
  },
  updateItem: async (quoteId: string, itemId: string, data: any) => {
    const response = await apiClient.put(`/quotes/${quoteId}/items/${itemId}`, data);
    return response.data;
  },
  deleteItem: async (quoteId: string, itemId: string) => {
    const response = await apiClient.delete(`/quotes/${quoteId}/items/${itemId}`);
    return response.data;
  },
  send: async (id: string) => {
    const response = await apiClient.post(`/quotes/${id}/send`);
    return response.data;
  },
  approve: async (id: string) => {
    const response = await apiClient.post(`/quotes/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/quotes/${id}/reject`, { reason });
    return response.data;
  },
  convertToOrder: async (id: string) => {
    const response = await apiClient.post(`/quotes/${id}/convert`);
    return response.data;
  },
  calculate: async (data: any) => {
    const response = await apiClient.post('/quotes/calculate', data);
    return response.data;
  },
  downloadPdf: async (id: string) => {
    const response = await apiClient.get(`/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const customersApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/customers', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/customers', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },
  stats: async (id: string) => {
    const response = await apiClient.get(`/customers/${id}/stats`);
    return response.data;
  },
};

export const productsApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
  grouped: async () => {
    const response = await apiClient.get('/products/grouped');
    return response.data;
  },
  bySystem: async (systemType: string) => {
    const response = await apiClient.get(`/products/system/${systemType}`);
    return response.data;
  },
  bulkPrices: async (updates: any[]) => {
    const response = await apiClient.put('/products/bulk-prices', { updates });
    return response.data;
  },
};

export const dealersApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/dealers', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/dealers/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/dealers', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/dealers/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/dealers/${id}`);
    return response.data;
  },
  stats: async (id: string) => {
    const response = await apiClient.get(`/dealers/${id}/stats`);
    return response.data;
  },
  allStats: async () => {
    const response = await apiClient.get('/dealers/stats/all');
    return response.data;
  },
};

export const ordersApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await apiClient.put(`/orders/${id}/status`, { status, notes });
    return response.data;
  },
  updateNotes: async (id: string, data: any) => {
    const response = await apiClient.put(`/orders/${id}/notes`, data);
    return response.data;
  },
  recipes: async (id: string) => {
    const response = await apiClient.get(`/orders/${id}/recipes`);
    return response.data;
  },
  updateRecipeStatus: async (orderId: string, recipeId: string, status: string, notes?: string) => {
    const response = await apiClient.put(`/orders/${orderId}/recipes/${recipeId}/status`, { status, notes });
    return response.data;
  },
  stats: async () => {
    const response = await apiClient.get('/orders/stats');
    return response.data;
  },
};

export const usersApi = {
  list: async (params?: any) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
  changePassword: async (id: string, data: { currentPassword?: string; newPassword: string }) => {
    const response = await apiClient.put(`/users/${id}/password`, data);
    return response.data;
  },
  profile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },
};
