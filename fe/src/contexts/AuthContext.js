// frontend/src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const setAuthData = (data) => {
    if (data?.session) {
      // Lưu token vào localStorage
      localStorage.setItem('authToken', data.session.access_token);
      localStorage.setItem('refreshToken', data.session.refresh_token);
      
      // Set user
      setCurrentUser(data.user);
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/functions/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      setAuthData(data);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/functions/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          display_name: displayName 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setCurrentUser(null);
    navigate('/login');
  };

  const getUserProfile = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setCurrentUser(null);
        return null;
      }

      const response = await fetch(`${API_URL}/functions/v1/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Token không hợp lệ
        if (response.status === 401) {
          logout();
          return null;
        }
        throw new Error('Failed to get user profile');
      }

      const data = await response.json();
      setCurrentUser({
        ...data.user,
        profile: data.profile
      });
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Kiểm tra xem user đã đăng nhập chưa khi load trang
    const checkLoggedIn = async () => {
      await getUserProfile();
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    getUserProfile,
    getAuthHeaders,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}