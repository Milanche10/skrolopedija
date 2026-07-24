import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import AuthGate from './AuthGate.jsx';
import App from './App.jsx';
import Admin from './admin/Admin.jsx';
import Profile from './Profile.jsx';
import Leaderboard from './Leaderboard.jsx';
import SiteLayout from './site/SiteLayout.jsx';
import { Home, About, Pillars, Areas, KnowledgeBase, Partners, ForSchools, ForCompanies, Team, Contact, Support, Privacy, Terms } from './site/pages.jsx';
import { Vesti, VestDetail } from './site/Vesti.jsx';
import './styles.css';

// Aplikacija (Skrolpedija) — traži prijavu ili gost mod; inače deljena login forma.
function AppGate() {
  const { isAuthed, guest } = useAuth();
  if (!isAuthed && !guest) return <AuthGate />;
  return <App />;
}

function Root() {
  const { loading, isAuthed, isAdmin, isModerator } = useAuth();
  if (loading) {
    return (
      <div className="center-msg">
        <div className="spinner" />
        <div>Učitavam…</div>
      </div>
    );
  }
  return (
    <Routes>
      {/* Statički sajt Digitalni Zenit — javno dostupno */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/o-nama" element={<About />} />
        <Route path="/stubovi" element={<Pillars />} />
        <Route path="/oblasti" element={<Areas />} />
        <Route path="/baza-znanja" element={<KnowledgeBase />} />
        <Route path="/partneri" element={<Partners />} />
        <Route path="/za-skole" element={<ForSchools />} />
        <Route path="/za-kompanije" element={<ForCompanies />} />
        <Route path="/vesti" element={<Vesti />} />
        <Route path="/vesti/:slug" element={<VestDetail />} />
        <Route path="/tim" element={<Team />} />
        <Route path="/kontakt" element={<Contact />} />
        <Route path="/podrzi" element={<Support />} />
        <Route path="/privatnost" element={<Privacy />} />
        <Route path="/uslovi" element={<Terms />} />
      </Route>

      {/* Aplikacija — iza deljene login forme */}
      <Route path="/app" element={<AppGate />} />
      <Route path="/profile" element={isAuthed ? <Profile /> : <Navigate to="/app" replace />} />
      <Route path="/leaderboard" element={isAuthed ? <Leaderboard /> : <Navigate to="/app" replace />} />
      <Route path="/admin" element={isModerator ? <Admin /> : <Navigate to="/app" replace />} />

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
