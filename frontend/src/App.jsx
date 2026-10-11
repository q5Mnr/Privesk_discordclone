import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { UISettingsProvider } from './contexts/UISettingsContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

function ImpersonationBanner() {
  const { user, switchAccount } = useAuth();
  const { t } = useI18n();
  const returnToken = localStorage.getItem('adminReturnToken');
  const returnName = localStorage.getItem('adminReturnName') || 'админ';
  const returnId = localStorage.getItem('adminReturnId');

  if (!returnToken || !returnId || !user || user.id === returnId) return null;

  const goBack = () => {
    const token = localStorage.getItem('adminReturnToken');
    localStorage.removeItem('adminReturnToken');
    localStorage.removeItem('adminReturnName');
    localStorage.removeItem('adminReturnId');
    if (token) switchAccount(token);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-yellow-500 text-black px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium">
      <span>{t('Вы вошли как')} <b>{user.username}</b> · {t('возврат к')} {returnName}</span>
      <button onClick={goBack}
        className="px-3 py-1 bg-black/20 hover:bg-black/30 rounded-lg text-xs font-semibold transition-colors">
        {t('Вернуться')}
      </button>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <div className="flex items-center justify-center h-screen bg-discord-mid"><div className="text-white">{t('Загрузка...')}</div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <div className="flex items-center justify-center h-screen bg-discord-mid"><div className="text-white">{t('Загрузка...')}</div></div>;
  if (user) return <Navigate to="/channels/@me" />;
  return children;
}

export default function App() {
  return (
    <I18nProvider>
      <UISettingsProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/channels/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/channels/@me" />} />
            </Routes>
          </BrowserRouter>
          <ImpersonationBanner />
        </AuthProvider>
      </UISettingsProvider>
    </I18nProvider>
  );
}
