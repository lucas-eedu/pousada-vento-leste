import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomForm } from './RoomForm';
import { ApiError, createRoom, deleteRoom, listRooms, updateRoom, type Room, type RoomInput } from './roomsApi';
import './rooms.css';

type FormState = { open: false } | { open: true; room: Room | null };
type Feedback = { type: 'success' | 'error'; text: string } | null;

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
}

interface RoomsPageProps {
  onViewReservations: (room: Room) => void;
}

export function RoomsPage({ onViewReservations }: RoomsPageProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ open: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRooms(await listRooms());
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRooms(); }, [loadRooms]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (roomToDelete && !dialog.open) dialog.showModal();
    if (!roomToDelete && dialog.open) dialog.close();
  }, [roomToDelete]);

  function openForm(room: Room | null) {
    setFeedback(null);
    setFormError(null);
    setForm({ open: true, room });
  }

  function closeForm() {
    setForm({ open: false });
    setFormError(null);
  }

  async function handleSubmit(input: RoomInput) {
    if (!form.open) return;
    setSaving(true);
    setFormError(null);
    try {
      if (form.room) {
        await updateRoom(form.room.id, input);
        setFeedback({ type: 'success', text: `Quarto ${input.number} atualizado com sucesso.` });
      } else {
        await createRoom(input);
        setFeedback({ type: 'success', text: `Quarto ${input.number} cadastrado com sucesso.` });
      }
      closeForm();
      await loadRooms();
    } catch (error) {
      setFormError(errorMessage(error));
      if (error instanceof ApiError && error.status === 404) await loadRooms();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!roomToDelete) return;
    setDeleting(true);
    try {
      await deleteRoom(roomToDelete.id);
      setFeedback({ type: 'success', text: `Quarto ${roomToDelete.number} excluído com sucesso.` });
      if (form.open && form.room?.id === roomToDelete.id) closeForm();
      await loadRooms();
    } catch (error) {
      setFeedback({ type: 'error', text: errorMessage(error) });
    } finally {
      setDeleting(false);
      setRoomToDelete(null);
    }
  }

  return (
    <section className="rooms-panel" aria-labelledby="rooms-title">
      <div className="rooms-header">
        <div>
          <p className="eyebrow">ACOMODAÇÕES</p>
          <h2 id="rooms-title">Quartos cadastrados</h2>
        </div>
        {!form.open && <button type="button" className="btn btn-primary" onClick={() => openForm(null)}>+ Novo quarto</button>}
      </div>

      <div aria-live="polite">
        {feedback && (
          <p className={`feedback feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            {feedback.text}
            <button type="button" className="feedback-close" aria-label="Fechar mensagem" onClick={() => setFeedback(null)}>×</button>
          </p>
        )}
      </div>

      {form.open && (
        <RoomForm key={form.room?.id ?? 'new'} room={form.room} saving={saving} serverError={formError} onSubmit={handleSubmit} onCancel={closeForm} />
      )}

      {loading ? (
        <p className="rooms-empty" role="status">Carregando quartos…</p>
      ) : loadError ? (
        <div className="feedback feedback-error" role="alert">
          {loadError}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => void loadRooms()}>Tentar novamente</button>
        </div>
      ) : rooms.length === 0 ? (
        <p className="rooms-empty">Nenhum quarto cadastrado ainda. Use “Novo quarto” para começar.</p>
      ) : (
        <ul className="rooms-list">
          {rooms.map((room) => (
            <li key={room.id} className={`room-card${form.open && form.room?.id === room.id ? ' is-editing' : ''}`}>
              <div className="room-card-top">
                <h3>Quarto {room.number}</h3>
                <span className="room-rate">{currency.format(Number(room.daily_rate))}<small>/diária</small></span>
              </div>
              <p className="room-capacity">Até {room.capacity} {room.capacity === 1 ? 'hóspede' : 'hóspedes'}</p>
              <p className="room-description">{room.description || 'Sem descrição.'}</p>
              <div className="room-actions">
                <button type="button" className="btn btn-primary btn-small" onClick={() => onViewReservations(room)}>Ver reservas</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => openForm(room)} aria-label={`Editar quarto ${room.number}`}>Editar</button>
                <button type="button" className="btn btn-danger btn-small" onClick={() => setRoomToDelete(room)} aria-label={`Excluir quarto ${room.number}`}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); if (!deleting) setRoomToDelete(null); }}>
        <h3 id="delete-title">Excluir quarto {roomToDelete?.number}?</h3>
        <p id="delete-description">Esta ação não pode ser desfeita. Quartos com reservas não podem ser excluídos.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setRoomToDelete(null)} disabled={deleting} autoFocus>Cancelar</button>
          <button type="button" className="btn btn-danger" onClick={() => void confirmDelete()} disabled={deleting}>{deleting ? 'Excluindo…' : 'Excluir quarto'}</button>
        </div>
      </dialog>
    </section>
  );
}
