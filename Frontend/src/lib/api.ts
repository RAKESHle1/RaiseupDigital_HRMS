import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/home';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth API ────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  getMe: () => api.get('/api/auth/me'),
};

// ─── Users API ───────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/api/users'),
  getAllIncludingInactive: () => api.get('/api/users/all'),
  getById: (id: string) => api.get(`/api/users/${id}`),
  create: (data: any) => api.post('/api/users', data),
  update: (id: string, data: any) => api.put(`/api/users/${id}`, data),
  deactivate: (id: string) => api.put(`/api/users/${id}/deactivate`),
  activate: (id: string) => api.put(`/api/users/${id}/activate`),
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Attendance API ──────────────────────────────────────
export const attendanceAPI = {
  clockIn: () => api.post('/api/attendance/clock-in'),
  clockOut: () => api.post('/api/attendance/clock-out'),
  getMyAttendance: (month?: number, year?: number, date_filter?: string) =>
    api.get('/api/attendance/my', { params: { month, year, date_filter } }),
  getToday: () => api.get('/api/attendance/today'),
  getAll: (params?: any) => api.get('/api/attendance/all', { params }),
  getReport: (month?: number, year?: number) =>
    api.get('/api/attendance/report', { params: { month, year } }),
};

// ─── Leaves API ──────────────────────────────────────────
export const leavesAPI = {
  apply: (data: any) => api.post('/api/leaves/', data),
  getMyLeaves: (params?: any) => api.get('/api/leaves/my', { params }),
  getAllLeaves: (params?: any) => api.get('/api/leaves/all', { params }),
  getStats: () => api.get('/api/leaves/stats'),
  getMyStats: () => api.get('/api/leaves/my-stats'),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/leaves/${id}`, { status }),
  delete: (id: string) => api.delete(`/api/leaves/${id}`),
};

// ─── Chat API ────────────────────────────────────────────
export const chatAPI = {
  sendMessage: (data: any) => api.post('/api/chat/messages', data),
  getMessages: (userId: string) => api.get(`/api/chat/messages/${userId}`),
  getConversations: () => api.get('/api/chat/conversations'),
  createGroup: (data: any) => api.post('/api/chat/groups', data),
  getMyGroups: () => api.get('/api/chat/groups'),
  getAllGroups: () => api.get('/api/chat/groups/all'),
  getGroup: (id: string) => api.get(`/api/chat/groups/${id}`),
  getGroupMessages: (id: string) => api.get(`/api/chat/groups/${id}/messages`),
  sendGroupMessage: (id: string, data: any) =>
    api.post(`/api/chat/groups/${id}/messages`, data),
  addGroupMember: (groupId: string, memberId: string) =>
    api.put(`/api/chat/groups/${groupId}/members?member_id=${memberId}`),
  getAdminStats: () => api.get('/api/chat/admin/stats'),
};

// ─── Notifications API ───────────────────────────────────
export const notificationsAPI = {
  getMyNotifications: () => api.get('/api/notifications/'),
};
