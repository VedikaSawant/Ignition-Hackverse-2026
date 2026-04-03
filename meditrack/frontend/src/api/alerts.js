import API from './client';

export const getAlerts = () => API.get('/alerts/');
export const getUnreadCount = () => API.get('/alerts/unread-count');
export const markAlertRead = (id) => API.put(`/alerts/${id}/read`);
export const markAllRead = () => API.put('/alerts/mark-all-read');
export const testAlert = () => API.post('/alerts/test');
