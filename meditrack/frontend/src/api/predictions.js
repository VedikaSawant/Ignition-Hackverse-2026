import API from './client';

export const getRiskScore = () => API.get('/predictions/risk-score');
export const getNextMiss = () => API.get('/predictions/next-miss');
export const generatePredictions = () => API.post('/predictions/generate');
export const getInsights = () => API.get('/predictions/insights');
