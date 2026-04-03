import API from './client';

export const getIntelligenceMetrics = () => API.get('/intelligence/metrics');
export const getMLStats = () => API.get('/intelligence/ml-stats');
