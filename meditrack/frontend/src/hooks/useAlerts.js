import { useState, useEffect, useCallback } from 'react';
import { getAlerts, getUnreadCount } from '../api/alerts';

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([getAlerts(), getUnreadCount()]);
      setAlerts(a.data);
      setUnreadCount(c.data.count);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { alerts, unreadCount, loading, refresh: fetch };
}

export default useAlerts;
