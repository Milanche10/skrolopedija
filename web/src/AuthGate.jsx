import { useState } from 'react';
import { useAuth } from './auth.jsx';

export default function AuthGate() {
  const { login, register, enterAsGuest } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ identifier: '', email: '', username: '', password: '', firstName: '', lastName: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(form.identifier.trim(), form.password);
      else
        await register({
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-bg" />
      <div className="auth-card">
        <img src="/logo-full.svg" alt="Digitalni Zenit" className="auth-logo" />
        <h1 className="auth-title">
          Skrol<span>opedija</span>
        </h1>
        <p className="auth-sub">Uči dok skroluješ — od Digitalnog Zenita.</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(null); }}>
            Prijava
          </button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(null); }}>
            Registracija
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'login' ? (
            <input placeholder="Email ili korisničko ime" value={form.identifier} onChange={set('identifier')} autoComplete="username" />
          ) : (
            <>
              <input placeholder="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              <input placeholder="Korisničko ime" value={form.username} onChange={set('username')} autoComplete="username" />
              <div className="auth-row">
                <input placeholder="Ime" value={form.firstName} onChange={set('firstName')} />
                <input placeholder="Prezime" value={form.lastName} onChange={set('lastName')} />
              </div>
            </>
          )}
          <input placeholder="Lozinka" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {err && <div className="auth-err">{err}</div>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Trenutak…' : mode === 'login' ? 'Prijavi se' : 'Napravi nalog'}
          </button>
        </form>

        <div className="auth-divider"><span>ili</span></div>
        <button className="auth-guest" onClick={enterAsGuest}>
          Uđi kao gost →
        </button>
        <p className="auth-note">Gost vidi po 5 kartica iz svake oblasti. Registruj se za pun pristup, napredak i bedževe.</p>
      </div>
    </div>
  );
}
