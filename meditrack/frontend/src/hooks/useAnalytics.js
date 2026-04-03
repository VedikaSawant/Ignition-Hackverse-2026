import { useState, useEffect, useCallback } from 'react';
import { getDailyAdherence, getStreak, getHeatmap, getPerMedicineAdherence, getMissedPatterns } from '../api/analytics';

export function useAnalytics(days = 30) {
  const [daily, setDaily] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, streak_history: [] });
  const [heatmap, setHeatmap] = useState([]);
  const [perMedicine, setPerMedicine] = useState([]);
  const [missedPatterns, setMissedPatterns] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const [d, s, h, p, m] = await Promise.all([
        getDailyAdherence(days),
        getStreak(),
        getHeatmap(),
        getPerMedicineAdherence(days),
        getMissedPatterns(),
      ]);
      setDaily(d.data);
      setStreak(s.data);
      setHeatmap(h.data);
      setPerMedicine(p.data);
      setMissedPatterns(m.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { daily, streak, heatmap, perMedicine, missedPatterns, loading, refresh: fetch };
}

export default useAnalytics;
