import { useEffect, useState, type ReactNode } from 'react';
import { SESSION_EXPIRED_EVENT } from '../api';
import { getSession, logout, type Session } from './authApi';
import { LoginPage } from './LoginPage';
import './login.css';

interface AuthGateProps {
  children: (session: Session, onLogout: () => void) => ReactNode;
}

/** Mostra a tela de login até existir uma sessão válida; depois, o sistema. */
export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    function handleExpired() {
      setSession(null);
      setNotice('Sua sessão expirou. Entre novamente.');
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  async function handleLogout() {
    await logout().catch(() => undefined);
    setSession(null);
    setNotice('Você saiu do sistema.');
  }

  function handleLogin(newSession: Session) {
    setNotice(null);
    setSession(newSession);
  }

  if (checking) return <p className="login-loading" role="status">Carregando…</p>;
  if (!session) return <LoginPage notice={notice} onLogin={handleLogin} />;
  return <>{children(session, () => void handleLogout())}</>;
}
