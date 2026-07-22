import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import AuthGate from './AuthGate.jsx';
import App from './App.jsx';
import Admin from './admin/Admin.jsx';
import Profile from './Profile.jsx';
import './styles.css';

function Root() {
  const { loading, isAuthed, guest, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="center-msg">
        <div className="spinner" />
        <div>Učitavam…</div>
      </div>
    );
  }
  if (!isAuthed && !guest) return <AuthGate />;
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/profile" element={isAuthed ? <Profile /> : <Navigate to="/" replace />} />
      <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
