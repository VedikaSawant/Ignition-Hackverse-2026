import API from './client';

export const getCaregiverPatients = () => API.get('/caregiver/patients');
export const getPatientSummary = (id) => API.get(`/caregiver/patients/${id}/summary`);
export const getCaregiverAlerts = () => API.get('/caregiver/alerts');
export const markCaregiverAlertRead = (id) => API.post(`/caregiver/alerts/${id}/read`);
export const confirmDose = (data) => API.post('/caregiver/doses/confirm', data);
export const getPatientReport = (id) => API.get(`/caregiver/patients/${id}/report`);
