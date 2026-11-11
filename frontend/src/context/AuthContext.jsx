import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smartqueue_token') || null);
  const [role, setRole] = useState(localStorage.getItem('smartqueue_role') || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartqueue_token');
      const storedRole = localStorage.getItem('smartqueue_role');
      const storedUser = localStorage.getItem('smartqueue_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setRole(storedRole);
        } catch (e) {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loginCustomer = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    setRole('customer');
    localStorage.setItem('smartqueue_token', access_token);
    localStorage.setItem('smartqueue_user', JSON.stringify(userData));
    localStorage.setItem('smartqueue_role', 'customer');
    return userData;
  };

  const loginAdmin = async (email, password) => {
    const res = await authAPI.adminLogin({ email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    setRole('admin');
    localStorage.setItem('smartqueue_token', access_token);
    localStorage.setItem('smartqueue_user', JSON.stringify(userData));
    localStorage.setItem('smartqueue_role', 'admin');
    return userData;
  };

  const registerCustomer = async (data) => {
    const res = await authAPI.register(data);
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    setRole('customer');
    localStorage.setItem('smartqueue_token', access_token);
    localStorage.setItem('smartqueue_user', JSON.stringify(userData));
    localStorage.setItem('smartqueue_role', 'customer');
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem('smartqueue_token');
    localStorage.removeItem('smartqueue_user');
    localStorage.removeItem('smartqueue_role');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token,
        isAdmin: role === 'admin' || role === 'superadmin' || role === 'operator',
        isLoading,
        loginCustomer,
        loginAdmin,
        registerCustomer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
