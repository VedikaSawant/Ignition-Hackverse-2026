import API from './client';

export const getDoctorPatients = () => API.get('/doctor/patients');
export const getDoctorPatientReport = (id) => API.get(`/doctor/patients/${id}/report`);
export const prescribeMedicine = (data) => API.post('/doctor/prescribe', data);
export const getNonCompliant = () => API.get('/doctor/non-compliant');
