import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load existing session on boot
  useEffect(() => {
    const token = localStorage.getItem('dasa_auth_token');
    const storedUser = localStorage.getItem('dasa_user_data');

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed.user || null);
        setEmployee(parsed.employee || null);
      } catch (e) {
        console.error('Failed to parse cached user data', e);
      }
    }
    setLoading(false);
  }, []);

  // Admin Email/Password Login
  const loginAdmin = async (email, password) => {
    const res = await authApi.adminLogin({ email, password });
    if (res.data.success) {
      const userData = { user: res.data.user, employee: null };
      localStorage.setItem('dasa_auth_token', res.data.token);
      localStorage.setItem('dasa_user_data', JSON.stringify(userData));
      setUser(res.data.user);
      setEmployee(null);
      return res.data;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  // Employee PIN Verification
  const verifyEmployeePin = async (employeeId, pin) => {
    const res = await authApi.employeeVerifyPin({ employeeId, pin });
    if (res.data.success) {
      const userData = {
        user: { role: 'EMPLOYEE', id: res.data.employee.userId },
        employee: res.data.employee
      };
      localStorage.setItem('dasa_auth_token', res.data.token);
      localStorage.setItem('dasa_user_data', JSON.stringify(userData));
      setUser(userData.user);
      setEmployee(res.data.employee);
      return res.data;
    }
    throw new Error(res.data.message || 'PIN verification failed');
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('dasa_auth_token');
    localStorage.removeItem('dasa_user_data');
    setUser(null);
    setEmployee(null);
  };

  const isAdmin = user && user.role === 'SUPER_ADMIN';
  const isEmployee = user && user.role === 'EMPLOYEE';

  return (
    <AuthContext.Provider value={{
      user,
      employee,
      loading,
      isAdmin,
      isEmployee,
      loginAdmin,
      verifyEmployeePin,
      logout,
      setEmployee
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

