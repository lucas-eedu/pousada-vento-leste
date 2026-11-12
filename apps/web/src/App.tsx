import { useEffect, useState } from 'react';
import { RoomsPage } from './rooms/RoomsPage';
import type { Room } from './rooms/roomsApi';

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
    description: 'Cadastre, consulte, edite e exclua os quartos da pousada. Escolha um quarto para ver as reservas dele.'
  },
  reservas: {
    title: 'Reservas',
    eyebrow: 'AGENDA',
    description: 'Aqui a equipe irá gerenciar as reservas e conferir datas, capacidade e disponibilidade.'
  }
};

export function App() {
  const [section, setSection] = useState<Section>('inicio');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [apiStatus, setApiStatus] = useState<'verificando' | 'conectada' | 'indisponível'>('verificando');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => { if (!response.ok) throw new Error('API indisponível'); return response.json(); })
      .then(() => setApiStatus('conectada'))
      .catch(() => setApiStatus('indisponível'));
  }, []);

  function goTo(next: Section) {
    if (next !== 'reservas') setSelectedRoom(null);
    setSection(next);
  }

  function viewReservations(room: Room) {
    setSelectedRoom(room);
    setSection('reservas');
  }

  const content = sections[section];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✺</span><span>vento <strong>leste</strong><small>GESTÃO DA POUSADA</small></span></div>
        <div className="nav-label">ESPAÇO DE TRABALHO</div>
        <nav aria-label="Navegação principal">
          <button className={section === 'inicio' ? 'active' : ''} aria-current={section === 'inicio' ? 'page' : undefined} onClick={() => goTo('inicio')}><span>⌂</span> Visão geral</button>
          <button className={section === 'quartos' ? 'active' : ''} aria-current={section === 'quartos' ? 'page' : undefined} onClick={() => goTo('quartos')}><span>▦</span> Quartos</button>
          <button className={section === 'reservas' ? 'active' : ''} aria-current={section === 'reservas' ? 'page' : undefined} onClick={() => goTo('reservas')}><span>▤</span> Reservas</button>
        </nav>
        <div className="sidebar-footer"><span className="status-dot" data-status={apiStatus} /> API {apiStatus}</div>
      </aside>
      <main className="main">
        <header className="topbar"><span>POUSADA VENTO LESTE</span><span className="topbar-date">Gestão de quartos e reservas</span></header>
        <section className="hero">
          <div className="hero-copy"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p>{content.description}</p></div>
          <div className="hero-art" aria-hidden="true"><span className="sun" /><span className="hill hill-back" /><span className="hill hill-front" /></div>
        </section>
        {section === 'quartos' ? (
          <RoomsPage onViewReservations={viewReservations} />
        ) : (
          <section className="content-card" aria-live="polite">
            <div className="card-icon">{section === 'inicio' ? '✧' : '▤'}</div>
            <div>
              <p className="eyebrow">EM CONSTRUÇÃO</p>
              <h2>{section === 'inicio' ? 'Boas-vindas ao projeto' : selectedRoom ? `Reservas do quarto ${selectedRoom.number}` : 'Módulo de reservas'}</h2>
              <p>{section === 'inicio' ? 'Esta é a base visual da aplicação. Use o menu para conhecer os espaços que serão desenvolvidos pela equipe.' : 'Esta área foi preparada para receber a listagem, os formulários e as mensagens de validação.'}</p>
              {selectedRoom && <button type="button" className="btn btn-ghost btn-small back-button" onClick={() => goTo('quartos')}>← Voltar aos quartos</button>}
            </div>
          </section>
        )}
        <footer>Feito para uma rotina mais leve na Vento Leste.</footer>
      </main>
    </div>
  );
}
