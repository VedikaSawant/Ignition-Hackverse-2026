import API from './client';

export const getDailyAdherence = (days = 30) => API.get(`/analytics/adherence/daily?days=${days}`);
export const getWeeklyAdherence = () => API.get('/analytics/adherence/weekly');
export const getPerMedicineAdherence = (days = 30) => API.get(`/analytics/adherence/per-medicine?days=${days}`);
export const getHeatmap = (weeks = 12) => API.get(`/analytics/heatmap?weeks=${weeks}`);
export const getStreak = () => API.get('/analytics/streak');
export const getReport = () => API.get('/analytics/report');
export const getMissedPatterns = () => API.get('/analytics/missed-patterns');
export const sendReportToDoctor = () => API.post('/analytics/send-report-to-doctor');
