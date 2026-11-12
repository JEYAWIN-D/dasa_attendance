import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dasa_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired
      const isAuthRoute = error.config.url.includes('/auth/admin/login') || error.config.url.includes('/auth/employee/verify-pin');
      if (!isAuthRoute) {
        localStorage.removeItem('dasa_auth_token');
        localStorage.removeItem('dasa_user_data');
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTH API ---
export const authApi = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  employeeVerifyPin: (payload) => api.post('/auth/employee/verify-pin', payload),
  getMe: () => api.get('/auth/me'),
};

// --- EMPLOYEE API ---
export const employeeApi = {
  getPublicList: () => api.get('/employees/public'),
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  toggleStatus: (id) => api.patch(`/employees/${id}/toggle-status`),
};

// --- ATTENDANCE API ---
export const attendanceApi = {
  checkIn: (payload) => api.post('/attendance/check-in', payload),
  checkOut: (payload) => api.post('/attendance/check-out', payload),
  getTodayStatus: (employeeId) => api.get(`/attendance/today/${employeeId}`),
  getHistory: (params) => api.get('/attendance/history', { params }),
  getLiveStream: () => api.get('/attendance/live-stream'),
  correctRecord: (recordId, payload) => api.put(`/attendance/correct/${recordId}`, payload),
  getGeoIp: () => api.get('/attendance/geo-ip'),
};

// --- REQUESTS API (Leave, Permission, Weekend, Client) ---
export const requestsApi = {
  getLeaveTypes: () => api.get('/requests/leave-types'),
  getLeaves: (params) => api.get('/requests/leave', { params }),
  submitLeave: (data) => api.post('/requests/leave', data),
  reviewLeave: (id, data) => api.patch(`/requests/leave/${id}/review`, data),

  getPermissions: (params) => api.get('/requests/permission', { params }),
  submitPermission: (data) => api.post('/requests/permission', data),
  reviewPermission: (id, data) => api.patch(`/requests/permission/${id}/review`, data),

  getWeekendWork: (params) => api.get('/requests/weekend-work', { params }),
  submitWeekendWork: (data) => api.post('/requests/weekend-work', data),
  reviewWeekendWork: (id, data) => api.patch(`/requests/weekend-work/${id}/review`, data),

  getClientVisits: (params) => api.get('/requests/client-visits', { params }),
  submitClientVisit: (data) => api.post('/requests/client-visits', data),
  reviewClientVisit: (id, data) => api.patch(`/requests/client-visits/${id}/review`, data),

  getClientMeetings: (params) => api.get('/requests/client-meetings', { params }),
  submitClientMeeting: (data) => api.post('/requests/client-meetings', data),
};

// --- SHIFTS API ---
export const shiftApi = {
  getAll: () => api.get('/shifts'),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
};

// --- REPORTS API ---
export const reportsApi = {
  getReport: (params) => api.get('/reports', { params }),
  exportExcelUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `/api/reports/export/excel?${query}`;
  },
  exportCsvUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `/api/reports/export/csv?${query}`;
  },
};

// --- ADMIN API ---
export const adminApi = {
  getDashboardAnalytics: () => api.get('/admin/dashboard'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, data) => api.put(`/admin/settings/${key}`, data),
  getHolidays: () => api.get('/admin/holidays'),
  createHoliday: (data) => api.post('/admin/holidays', data),
  getDepartments: () => api.get('/admin/departments'),
};

// --- NOTIFICATIONS API ---
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

export default api;

