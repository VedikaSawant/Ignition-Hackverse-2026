import API from './client';

export const getAchievements = () => API.get('/achievements/');
export const getAllBadges = () => API.get('/achievements/all');
export const getPoints = () => API.get('/achievements/points');
export const checkAchievements = () => API.post('/achievements/check');
