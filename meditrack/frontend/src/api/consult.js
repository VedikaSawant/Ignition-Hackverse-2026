import API from './client';

export const checkTrigger = () => API.get('/consult/trigger');
export const generateConsultResponse = (message) => API.post('/consult/generate', { message });
export const getConsultHistory = () => API.get('/consult/history');
