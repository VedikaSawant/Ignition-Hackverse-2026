import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('meditrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear stored credentials on auth failure
      // Let AuthContext/ProtectedRoute handle the redirect — don't force a hard reload
      localStorage.removeItem('meditrack_token');
      localStorage.removeItem('meditrack_user');
    }
    return Promise.reject(err);
  }
);

export default API;
