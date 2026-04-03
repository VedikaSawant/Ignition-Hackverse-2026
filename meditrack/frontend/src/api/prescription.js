import API from './client';

export const scanPrescription = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/prescription/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const confirmPrescription = (medicines) =>
  API.post('/prescription/confirm', medicines);

export const scanAndSavePrescription = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/prescription/scan-and-save', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
