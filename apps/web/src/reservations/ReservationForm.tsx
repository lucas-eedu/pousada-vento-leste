import { useState, type FormEvent } from 'react';
import type { Room } from '../rooms/roomsApi';
import type { Reservation, ReservationInput } from './reservationsApi';
import {
  emptyReservationForm,
  reservationToFormValues,
  validateReservationForm,
  type ReservationFormErrors,
  type ReservationFormValues
} from './reservationValidation';

interface ReservationFormProps {
  room: Room;
  reservation: Reservation | null;
  saving: boolean;
  serverError: string | null;
  onSubmit: (input: ReservationInput) => void;
  onCancel: () => void;
}

export function ReservationForm({
  room,
  reservation,
  saving,
  serverError,
  onSubmit,
  onCancel
}: ReservationFormProps) {

  const [values, setValues] = useState<ReservationFormValues>(
    () => reservation
      ? reservationToFormValues(reservation)
      : emptyReservationForm
  );

  const [errors, setErrors] = useState<ReservationFormErrors>({});

  function update(field: keyof ReservationFormValues, value: string) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateReservationForm(values, room.capacity);

    setErrors(result.errors);

    if (result.input) {
      onSubmit(result.input);
    }
  }

  function fieldError(field: keyof ReservationFormValues) {
    return errors[field] ? (
      <p className="field-error">{errors[field]}</p>
    ) : null;
  }

  return (
    <form className="room-form" onSubmit={handleSubmit} noValidate>

      <div className="room-form-header">
        <h3>
          {reservation ? 'Editar reserva' : 'Nova reserva'}
        </h3>

        <p>
          Quarto {room.number} — Capacidade: {room.capacity} hóspede(s).
        </p>
      </div>

      {serverError && (
        <p className="feedback feedback-error" role="alert">
          {serverError}
        </p>
      )}

      <div className="form-grid">

        <div className="field field-wide">
          <label htmlFor="guestName">Nome do hóspede *</label>

          <input
            id="guestName"
            value={values.guestName}
            required
            onChange={e => update('guestName', e.target.value)}
          />

          {fieldError('guestName')}
        </div>

        <div className="field">
          <label htmlFor="guestPhone">Telefone *</label>

          <input
            id="guestPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(85) 99999-9999"
            value={values.guestPhone}
            required
            onChange={e => update('guestPhone', e.target.value)}
          />

          {fieldError('guestPhone')}
        </div>

        <div className="field">
          <label htmlFor="guestEmail">E-mail</label>

          <input
            id="guestEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@exemplo.com"
            value={values.guestEmail}
            onChange={e => update('guestEmail', e.target.value)}
          />

          {fieldError('guestEmail')}
        </div>

        <div className="field">
          <label htmlFor="guestCount">Quantidade de hóspedes *</label>

          <input
            id="guestCount"
            type="number"
            min={1}
            max={room.capacity}
            value={values.guestCount}
            required
            onChange={e => update('guestCount', e.target.value)}
          />

          {fieldError('guestCount')}
        </div>

        <div className="field">
          <label htmlFor="checkIn">Data de entrada *</label>

          <input
            id="checkIn"
            type="date"
            value={values.checkIn}
            required
            onChange={e => update('checkIn', e.target.value)}
          />

          {fieldError('checkIn')}
        </div>

        <div className="field">
          <label htmlFor="checkOut">Data de saída *</label>

          <input
            id="checkOut"
            type="date"
            value={values.checkOut}
            required
            onChange={e => update('checkOut', e.target.value)}
          />

          {fieldError('checkOut')}
        </div>

        <div className="field field-wide">
          <label htmlFor="notes">Observações</label>

          <textarea
            id="notes"
            rows={3}
            value={values.notes}
            onChange={e => update('notes', e.target.value)}
          />
          {fieldError('notes')}
        </div>

      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving
            ? 'Salvando...'
            : reservation
              ? 'Salvar alterações'
              : 'Cadastrar reserva'}
        </button>
      </div>

    </form>
  );
}