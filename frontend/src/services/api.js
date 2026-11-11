import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartqueue_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to catch unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired, clear localStorage if not already on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('smartqueue_token');
        localStorage.removeItem('smartqueue_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  getMe: () => api.get('/auth/me'),
  getAdminMe: () => api.get('/auth/admin/me'),
};

export const servicesAPI = {
  getCentres: (params) => api.get('/services/centres', { params }),
  getCentre: (id) => api.get(`/services/centres/${id}`),
  createCentre: (data) => api.post('/services/centres', data),
  updateCentre: (id, data) => api.put(`/services/centres/${id}`, data),
  deleteCentre: (id) => api.delete(`/services/centres/${id}`),

  getCategories: (params) => api.get('/services/categories', { params }),
  createCategory: (data) => api.post('/services/categories', data),
  updateCategory: (id, data) => api.put(`/services/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/services/categories/${id}`),

  getSlots: (centre_id, category_id, slot_date) =>
    api.get('/services/slots', { params: { centre_id, category_id, slot_date } }),
};

export const appointmentsAPI = {
  book: (data) => api.post('/appointments/book', data),
  getMyAppointments: () => api.get('/appointments/my'),
  getActiveToken: () => api.get('/appointments/my/active-token'),
  cancel: (id) => api.post(`/appointments/${id}/cancel`),
  getAllAdmin: (params) => api.get('/appointments/all', { params }),
};

export const queueAPI = {
  getLiveStatus: (token_id) => api.get(`/queue/live/${token_id}`),
  getActiveQueue: (centre_id, operating_date, category_id) =>
    api.get('/queue/active', { params: { centre_id, operating_date, category_id } }),
  performAction: (data) => api.post('/queue/action', data),
  generateWalkin: (params) => api.post('/queue/walkin', null, { params }),
};

export const adminAPI = {
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
};

export const notificationsAPI = {
  getAll: (limit = 30) => api.get('/notifications', { params: { limit } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export default api;
