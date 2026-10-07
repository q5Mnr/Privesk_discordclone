import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const API_URL = '';

function getSavedAccounts() {
  try { return JSON.parse(localStorage.getItem('accounts') || '[]'); } catch { return []; }
}

function saveAccount(token, user) {
  const accounts = getSavedAccounts();
  const exists = accounts.findIndex(a => a.user?.id === user.id);
  if (exists >= 0) {
    accounts[exists] = { token, user };
  } else {
    accounts.push({ token, user });
  }
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

function removeSavedAccount(userId) {
  const accounts = getSavedAccounts().filter(a => a.user?.id !== userId);
  localStorage.setItem('accounts', JSON.stringify(accounts));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState(getSavedAccounts);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser(data);
            saveAccount(token, data);
            setAccounts(getSavedAccounts());
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      const newSocket = io(API_URL || window.location.origin, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    saveAccount(data.token, data.user);
    setAccounts(getSavedAccounts());
    return data;
  };

  const register = async (username, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    saveAccount(data.token, data.user);
    setAccounts(getSavedAccounts());
    return data;
  };

  const switchAccount = (newToken) => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setUser(null);
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const addAccount = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const logout = () => {
    if (user) removeSavedAccount(user.id);
    setAccounts(getSavedAccounts());
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      saveAccount(token, updated);
      setAccounts(getSavedAccounts());
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, socket, loading, login, register, logout, updateUser, accounts, switchAccount, addAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
