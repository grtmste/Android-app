import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; role?: string }) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Equipment
export const equipmentApi = {
  getAll: (params?: Record<string, string>) => api.get('/equipment', { params }),
  getOne: (id: string) => api.get(`/equipment/${id}`),
  create: (data: unknown) => api.post('/equipment', data),
  update: (id: string, data: unknown) => api.put(`/equipment/${id}`, data),
  remove: (id: string) => api.delete(`/equipment/${id}`),
  checkout: (id: string, data: unknown) => api.post(`/equipment/${id}/checkout`, data),
  checkin: (id: string, data: unknown) => api.post(`/equipment/${id}/checkin`, data),
  getCategories: () => api.get('/equipment/categories'),
};

// Projects
export const projectsApi = {
  getAll: (params?: Record<string, string>) => api.get('/projects', { params }),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: unknown) => api.post('/projects', data),
  update: (id: string, data: unknown) => api.put(`/projects/${id}`, data),
  remove: (id: string) => api.delete(`/projects/${id}`),
  getTasks: (id: string) => api.get(`/projects/${id}/tasks`),
  createTask: (id: string, data: unknown) => api.post(`/projects/${id}/tasks`, data),
  updateTask: (id: string, taskId: string, data: unknown) => api.put(`/projects/${id}/tasks/${taskId}`, data),
  addEquipment: (id: string, data: unknown) => api.post(`/projects/${id}/equipment`, data),
  addCrew: (id: string, data: unknown) => api.post(`/projects/${id}/crew`, data),
};

// Crew
export const crewApi = {
  getAll: (params?: Record<string, string>) => api.get('/crew', { params }),
  getOne: (id: string) => api.get(`/crew/${id}`),
  create: (data: unknown) => api.post('/crew', data),
  update: (id: string, data: unknown) => api.put(`/crew/${id}`, data),
  remove: (id: string) => api.delete(`/crew/${id}`),
  getSchedule: (params?: Record<string, string>) => api.get('/crew/schedule', { params }),
  addAvailability: (id: string, data: unknown) => api.post(`/crew/${id}/availability`, data),
};

// Clients
export const clientsApi = {
  getAll: (params?: Record<string, string>) => api.get('/clients', { params }),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post('/clients', data),
  update: (id: string, data: unknown) => api.put(`/clients/${id}`, data),
  remove: (id: string) => api.delete(`/clients/${id}`),
  addLog: (id: string, data: unknown) => api.post(`/clients/${id}/logs`, data),
};

// Quotes
export const quotesApi = {
  getAll: (params?: Record<string, string>) => api.get('/quotes', { params }),
  getOne: (id: string) => api.get(`/quotes/${id}`),
  create: (data: unknown) => api.post('/quotes', data),
  update: (id: string, data: unknown) => api.put(`/quotes/${id}`, data),
  remove: (id: string) => api.delete(`/quotes/${id}`),
};

// Invoices
export const invoicesApi = {
  getAll: (params?: Record<string, string>) => api.get('/invoices', { params }),
  getOne: (id: string) => api.get(`/invoices/${id}`),
  create: (data: unknown) => api.post('/invoices', data),
  update: (id: string, data: unknown) => api.put(`/invoices/${id}`, data),
  remove: (id: string) => api.delete(`/invoices/${id}`),
};

// Analytics
export const analyticsApi = {
  getRevenue: (params?: Record<string, string>) => api.get('/analytics/revenue', { params }),
};

// Notifications
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
};
