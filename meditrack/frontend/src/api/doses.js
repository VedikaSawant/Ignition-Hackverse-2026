import API from './client';

export const getTodayDoses = () => API.get('/doses/today');
export const logDose = (data) => API.post('/doses/log', data);
export const getDoseHistory = (days = 30, medicineId = null) => {
  let url = `/doses/history?days=${days}`;
  if (medicineId) url += `&medicine_id=${medicineId}`;
  return API.get(url);
};
export const updateDose = (id, data) => API.put(`/doses/${id}`, data);
export const getMissedDoses = () => API.get('/doses/missed');
