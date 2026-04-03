import API from './client';

export const getMedicines = () => API.get('/medicines/');
export const addMedicine = (data) => API.post('/medicines/', data);
export const updateMedicine = (id, data) => API.put(`/medicines/${id}`, data);
export const deleteMedicine = (id) => API.delete(`/medicines/${id}`);
export const pauseMedicine = (id) => API.put(`/medicines/${id}/pause`);
export const getMedicineSchedule = (id) => API.get(`/medicines/${id}/schedule`);
