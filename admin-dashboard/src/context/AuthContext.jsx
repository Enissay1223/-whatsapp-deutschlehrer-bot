import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('admin_token');
      const savedUser = localStorage.getItem('admin_user');

      if (token && savedUser) {
        try {
          const currentAdmin = await authAPI.getMe();
          setUser(currentAdmin);
        } catch (error) {
          console.warn('Session expired, clearing stored credentials');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    validateSession();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);

      // Save token and user info
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));

      setUser(data.admin);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Login fehlgeschlagen';

      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Verbindung zum Server fehlgeschlagen. Bitte pruefen Sie ob das Backend laeuft und die URL korrekt ist.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Falsche E-Mail oder Passwort';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
