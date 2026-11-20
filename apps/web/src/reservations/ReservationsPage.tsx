import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api';
import type { Room } from '../rooms/roomsApi';
import { ReservationForm } from './ReservationForm';
import {
  listReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  type Reservation,
  type ReservationInput
} from './reservationsApi';

import { formatPhone, formatReservationDate } from './reservationValidation';
import './reservations.css';

interface ReservationsPageProps {
  room: Room;
  onBack: () => void;
}

export function ReservationsPage({ room, onBack }: ReservationsPageProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      setReservations(await listReservations(room.id));
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (reservationToDelete && !dialog.open) {
      dialog.showModal();
    }

    if (!reservationToDelete && dialog.open) {
      dialog.close();
    }
  }, [reservationToDelete]);

  function openForm(reservation: Reservation | null = null) {
    setEditing(reservation);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setError(null);
  }

  async function handleSubmit(input: ReservationInput) {
    setSaving(true);
    setError(null);

    try {
      if (editing) {
        await updateReservation(editing.id, input);
        setSuccess('Reserva atualizada com sucesso.');
      } else {
        await createReservation(room.id, input);
        setSuccess('Reserva cadastrada com sucesso.');
      }

      closeForm();
      await loadReservations();

    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(reservation: Reservation) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteReservation(reservation.id);

      if (editing?.id === reservation.id) {
        closeForm();
      }

      setSuccess('Reserva excluída com sucesso.');
      await loadReservations();

    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
      setReservationToDelete(null);
    }
  }

  return (
    <section className="rooms-panel reservations-panel">

      <div className="rooms-header">
        <div>
          <p className="eyebrow">AGENDA DE RESERVAS</p>
          <h2>Reservas do quarto {room.number}</h2>
          <p className="reservation-room-info">
            Capacidade: {room.capacity} hóspede(s)
          </p>
        </div>

        <div className="reservation-header-actions">
          <button
            className="btn btn-ghost"
            onClick={onBack}
            disabled={saving}
          >
            ← Voltar aos quartos
          </button>

          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={() => openForm()}
              disabled={saving}
            >
              + Nova reserva
            </button>
          )}
        </div>
      </div>

      {success && (
        <p className="feedback feedback-success" role="status">
          {success}
        </p>
      )}

      {error && !showForm && (
        <p className="feedback feedback-error" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <ReservationForm
          key={editing?.id ?? 'new'}
          room={room}
          reservation={editing}
          saving={saving}
          serverError={error}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      {loading ? (
        <p className="rooms-empty">Carregando reservas...</p>
      ) : loadError ? (
        <div className="feedback feedback-error" role="alert">
          <span>
            Não foi possível carregar as reservas: {loadError}
          </span>

          <button
            className="btn btn-ghost btn-small"
            onClick={() => void loadReservations()}
          >
            Tentar novamente
          </button>
        </div>
      ) : reservations.length === 0 ? (
        <p className="rooms-empty">
          Nenhuma reserva cadastrada para este quarto.
        </p>
      ) : (
        <ul className="rooms-list">
          {reservations.map(reservation => (
            <li
              key={reservation.id}
              className="room-card reservation-card"
            >
              <div className="room-card-top">
                <h3>{reservation.guest_name}</h3>
              </div>

              <p className="room-capacity">
                {reservation.guest_count} hóspede(s)
              </p>

              <p className="reservation-contact">
                {reservation.guest_phone && (
                  <a href={`tel:+55${reservation.guest_phone}`}>{formatPhone(reservation.guest_phone)}</a>
                )}
                {reservation.guest_email && (
                  <a href={`mailto:${reservation.guest_email}`}>{reservation.guest_email}</a>
                )}
              </p>

              <div className="reservation-dates">
                <div>
                  <small>Entrada</small>
                  <strong>
                    {formatReservationDate(reservation.check_in)}
                  </strong>
                </div>

                <div>
                  <small>Saída</small>
                  <strong>
                    {formatReservationDate(reservation.check_out)}
                  </strong>
                </div>
              </div>

              {reservation.notes && (
                <p className="room-description">
                  {reservation.notes}
                </p>
              )}

              <div className="room-actions">
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => openForm(reservation)}
                  disabled={saving}
                >
                  Editar
                </button>

                <button
                  className="btn btn-danger btn-small"
                  onClick={() => setReservationToDelete(reservation)}
                  disabled={saving}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby="delete-reservation-title"
        aria-describedby="delete-reservation-description"
        onCancel={event => {
          event.preventDefault();
          if (!saving) setReservationToDelete(null);
        }}
      >
        <h3 id="delete-reservation-title">
          Excluir reserva?
        </h3>

        <p id="delete-reservation-description">
          Deseja excluir a reserva de {reservationToDelete?.guest_name}?
          Esta ação não pode ser desfeita.
        </p>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setReservationToDelete(null)}
            disabled={saving}
            autoFocus
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (reservationToDelete) {
                void handleDelete(reservationToDelete);
              }
            }}
            disabled={saving}
          >
            {saving ? 'Excluindo...' : 'Excluir reserva'}
          </button>
        </div>
      </dialog>
    </section>
  );
}