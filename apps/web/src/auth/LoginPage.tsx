import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api';
import { login, type Session } from './authApi';
import './login.css';

interface LoginPageProps {
  /** Aviso mostrado acima do formulário, por exemplo quando a sessão expirou. */
  notice: string | null;
  onLogin: (session: Session) => void;
}

export function LoginPage({ notice, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Informe o usuário e a senha.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      onLogin(await login(username.trim(), password));
    } catch (loginError) {
      setError(errorMessage(loginError));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand login-brand">
          <span className="brand-mark">✺</span>
          <span>vento <strong>leste</strong><small>GESTÃO DA POUSADA</small></span>
        </div>

        <h1 id="login-title">Entrar</h1>
        <p className="login-subtitle">Acesso restrito à administração da pousada.</p>

        {notice && !error && <p className="feedback feedback-success" role="status">{notice}</p>}
        {error && <p className="feedback feedback-error" role="alert">{error}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-username">Usuário</label>
            <input id="login-username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Senha</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
