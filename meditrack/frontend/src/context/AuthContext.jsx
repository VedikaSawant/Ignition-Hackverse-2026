import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getMe, demoLogin as demoLoginApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('meditrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('meditrack_token'));
  const [loading, setLoading] = useState(true);
  const hasValidated = useRef(false);

  // Only validate stored token on initial mount — NOT after loginSuccess
  useEffect(() => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    const storedToken = localStorage.getItem('meditrack_token');
    if (storedToken) {
      getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('meditrack_user', JSON.stringify(res.data));
        })
        .catch((err) => {
          // Only logout on actual auth failure (401), not network errors
          if (err.response?.status === 401) {
            logout();
          }
          // For other errors, keep the stored user data
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginSuccess = (data) => {
    localStorage.setItem('meditrack_token', data.access_token);
    localStorage.setItem('meditrack_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('meditrack_token');
    localStorage.removeItem('meditrack_user');
    setToken(null);
    setUser(null);
  };

  const demoLogin = async (role) => {
    try {
      const res = await demoLoginApi(role);
      loginSuccess(res.data);
      return res.data;
    } catch (err) {
      console.error('Demo login failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginSuccess, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
