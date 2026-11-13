
import type { Room, RoomInput } from './roomsApi';

/** Mesmo limite aplicado pela API em rooms.validation.ts. */
export const MAX_CAPACITY = 4;
/** Limite da coluna NUMERIC(10, 2). */
const MAX_DAILY_RATE = 99999999.99;

export interface RoomFormValues {
  number: string;
  capacity: string;
  dailyRate: string;
  description: string;
}

export type RoomFormErrors = Partial<Record<keyof RoomFormValues, string>>;

export const emptyRoomForm: RoomFormValues = { number: '', capacity: '', dailyRate: '', description: '' };

export function roomToFormValues(room: Room): RoomFormValues {
  return {
    number: room.number,
    capacity: String(room.capacity),
    dailyRate: Number(room.daily_rate).toFixed(2).replace('.', ','),
    description: room.description
  };
}

/**
 * Validação de conveniência na interface. A validação definitiva continua na API,
 * que também confere número de quarto repetido.
 */
export function validateRoomForm(values: RoomFormValues): { errors: RoomFormErrors; input?: RoomInput } {
  const errors: RoomFormErrors = {};
  const number = values.number.trim();
  const capacityText = values.capacity.trim();
  const dailyRateText = values.dailyRate.trim().replace(',', '.');

  if (!number) {
    errors.number = 'Informe o número do quarto.';
  } else if (!/^[1-9]\d{2}$/.test(number)) {
    errors.number = 'O número do quarto deve conter exatamente 3 dígitos numéricos.';
  }

  const capacity = Number(capacityText);
  if (!capacityText) errors.capacity = 'Informe a capacidade.';
  else if (!/^\d+$/.test(capacityText) || capacity <= 0) errors.capacity = 'A capacidade deve ser um número inteiro positivo.';
  else if (capacity > MAX_CAPACITY) errors.capacity = `A capacidade máxima é de ${MAX_CAPACITY} hóspedes.`;

  const dailyRate = Number(dailyRateText);
  if (!dailyRateText) errors.dailyRate = 'Informe o valor da diária.';
  else if (!/^\d+(\.\d{1,2})?$/.test(dailyRateText) || dailyRate <= 0) errors.dailyRate = 'A diária deve ser um valor positivo, com até duas casas decimais.';
  else if (dailyRate > MAX_DAILY_RATE) errors.dailyRate = 'O valor da diária é maior que o permitido.';

  if (values.description.length > 500) {
    errors.description = 'A descrição deve ter no máximo 500 caracteres.';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, input: { number, capacity, daily_rate: dailyRate, description: values.description.trim() } };
}
