import { useEffect, useState } from 'react';

type Section = 'inicio' | 'quartos' | 'reservas';

const sections: Record<Section, { title: string; eyebrow: string; description: string }> = {
  inicio: {
    title: 'Hospitalidade em cada detalhe.',
    eyebrow: 'PAINEL DA POUSADA',
    description: 'Uma visão simples do que acontece na Vento Leste. Em breve, os quartos e as reservas estarão reunidos aqui.'
  },
  quartos: {
    title: 'Quartos',
    eyebrow: 'ACOMODAÇÕES',
    description: 'Aqui a equipe irá cadastrar, consultar, editar e excluir os quartos da pousada.'
  },
  reservas: {
    title: 'Reservas',
    eyebrow: 'AGENDA',
    description: 'Aqui a equipe irá gerenciar as reservas e conferir datas, capacidade e disponibilidade.'
  }
};

export function App() {
  const [section, setSection] = useState<Section>('inicio');
  const [apiStatus, setApiStatus] = useState<'verificando' | 'conectada' | 'indisponível'>('verificando');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => { if (!response.ok) throw new Error('API indisponível'); return response.json(); })
      .then(() => setApiStatus('conectada'))
      .catch(() => setApiStatus('indisponível'));
  }, []);

  const content = sections[section];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✺</span><span>vento <strong>leste</strong><small>GESTÃO DA POUSADA</small></span></div>
        <div className="nav-label">ESPAÇO DE TRABALHO</div>
        <nav aria-label="Navegação principal">
          <button className={section === 'inicio' ? 'active' : ''} onClick={() => setSection('inicio')}><span>⌂</span> Visão geral</button>
          <button className={section === 'quartos' ? 'active' : ''} onClick={() => setSection('quartos')}><span>▦</span> Quartos</button>
          <button className={section === 'reservas' ? 'active' : ''} onClick={() => setSection('reservas')}><span>▤</span> Reservas</button>
        </nav>
        <div className="sidebar-footer"><span className="status-dot" data-status={apiStatus} /> API {apiStatus}</div>
      </aside>
      <main className="main">
        <header className="topbar"><span>POUSADA VENTO LESTE</span><span className="topbar-date">Gestão de quartos e reservas</span></header>
        <section className="hero">
          <div className="hero-copy"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p>{content.description}</p></div>
          <div className="hero-art" aria-hidden="true"><span className="sun" /><span className="hill hill-back" /><span className="hill hill-front" /></div>
        </section>
        <section className="content-card" aria-live="polite">
          <div className="card-icon">{section === 'inicio' ? '✧' : section === 'quartos' ? '▦' : '▤'}</div>
          <div><p className="eyebrow">EM CONSTRUÇÃO</p><h2>{section === 'inicio' ? 'Bem-vindo ao projeto' : `Módulo de ${section}`}</h2><p>{section === 'inicio' ? 'Esta é a base visual da aplicação. Use o menu para conhecer os espaços que serão desenvolvidos pela equipe.' : 'Esta área foi preparada para receber a listagem, os formulários e as mensagens de validação.'}</p></div>
        </section>
        <footer>Feito para uma rotina mais leve na Vento Leste.</footer>
      </main>
    </div>
  );
}
