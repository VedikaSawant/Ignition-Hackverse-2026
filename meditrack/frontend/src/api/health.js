import API from './client';

export const logHealth = (data) => API.post('/health/log', data);
export const getHealthHistory = (days = 30) => API.get(`/health/history?days=${days}`);
export const getCorrelations = () => API.get('/health/correlations');
