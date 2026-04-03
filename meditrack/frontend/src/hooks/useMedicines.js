import { useState, useEffect, useCallback } from 'react';
import { getMedicines } from '../api/medicines';

export function useMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await getMedicines();
      setMedicines(res.data);
    } catch (err) {
      console.error('Failed to fetch medicines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { medicines, loading, refresh: fetch };
}

export default useMedicines;
