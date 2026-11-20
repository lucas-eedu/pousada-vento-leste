import type { Reservation, ReservationInput } from './reservationsApi';

export interface ReservationFormValues {
  guestName: string;
  guestCount: string;
  checkIn: string;
  checkOut: string;
  notes: string;
}

export type ReservationFormErrors = Partial<
  Record<keyof ReservationFormValues, string>
>;

export const emptyReservationForm: ReservationFormValues = {
  guestName: '',
  guestCount: '',
  checkIn: '',
  checkOut: '',
  notes: ''
};

export function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export function formatReservationDate(value: string): string {
  const [year, month, day] = dateOnly(value).split('-');
  return `${day}/${month}/${year}`;
}

export function reservationToFormValues(
  reservation: Reservation
): ReservationFormValues {
  return {
    guestName: reservation.guest_name,
    guestCount: String(reservation.guest_count),
    checkIn: dateOnly(reservation.check_in),
    checkOut: dateOnly(reservation.check_out),
    notes: reservation.notes ?? ''
  };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(value + 'T00:00:00Z');

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export function validateReservationForm(
  values: ReservationFormValues,
  roomCapacity: number
): { errors: ReservationFormErrors; input?: ReservationInput } {
  const errors: ReservationFormErrors = {};

  const guestName = values.guestName.trim();
  const guestCount = Number(values.guestCount);
  const checkIn = values.checkIn;
  const checkOut = values.checkOut;

  if (!guestName) {
    errors.guestName = 'Informe o nome do hóspede.';
  } else if (guestName.length > 120) {
    errors.guestName = 'Informe no máximo 120 caracteres.';
  }

  if (values.notes.trim().length > 500) {
    errors.notes = 'Informe no máximo 500 caracteres.';
  }

  if (!Number.isSafeInteger(guestCount) || guestCount <= 0) {
    errors.guestCount = 'Informe uma quantidade válida de hóspedes.';
  } else if (guestCount > roomCapacity) {
    errors.guestCount = `Este quarto comporta até ${roomCapacity} hóspede(s).`;
  }

  if (!validDate(checkIn)) {
    errors.checkIn = 'Informe uma data de entrada válida.';
  }

  if (!validDate(checkOut)) {
    errors.checkOut = 'Informe uma data de saída válida.';
  }

  if (!errors.checkIn && !errors.checkOut && checkOut <= checkIn) {
    errors.checkOut = 'A saída deve ser posterior à entrada.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    input: {
      guest_name: guestName,
      guest_count: guestCount,
      check_in: checkIn,
      check_out: checkOut,
      notes: values.notes.trim()
    }
  };
}