import { useState, useEffect, useCallback } from 'react';
import { getTodayDoses, logDose as logDoseApi, getMissedDoses } from '../api/doses';

export function useDoses() {
  const [todayDoses, setTodayDoses] = useState([]);
  const [missed, setMissed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    try {
      const res = await getTodayDoses();
      setTodayDoses(res.data);
    } catch (err) {
      console.error('Failed to fetch today doses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMissed = useCallback(async () => {
    try {
      const res = await getMissedDoses();
      setMissed(res.data);
    } catch (err) {
      console.error('Failed to fetch missed doses:', err);
    }
  }, []);

  const markDose = async (medicineId, scheduledTime, status, skipReason = null) => {
    try {
      await logDoseApi({
        medicine_id: medicineId,
        scheduled_time: scheduledTime,
        status,
        skip_reason: skipReason,
      });
      await fetchToday();
    } catch (err) {
      console.error('Failed to log dose:', err);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchMissed();
  }, [fetchToday, fetchMissed]);

  return { todayDoses, missed, loading, markDose, refresh: fetchToday };
}

export default useDoses;
