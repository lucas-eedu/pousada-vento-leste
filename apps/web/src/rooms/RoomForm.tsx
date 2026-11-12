import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Room, RoomInput } from './roomsApi';
import {
  MAX_CAPACITY,
  emptyRoomForm,
  roomToFormValues,
  validateRoomForm,
  type RoomFormErrors,
  type RoomFormValues,
} from './roomValidation';

interface RoomFormProps {
  room: Room | null;
  saving: boolean;
  serverError: string | null;
  onSubmit: (input: RoomInput) => void;
  onCancel: () => void;
}

export function RoomForm({ room, saving, serverError, onSubmit, onCancel }: RoomFormProps) {
  const [values, setValues] = useState<RoomFormValues>(() =>
    room ? roomToFormValues(room) : emptyRoomForm
  );
  const [errors, setErrors] = useState<RoomFormErrors>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const editing = room !== null;

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function update(field: keyof RoomFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateRoomForm(values);
    setErrors(result.errors);
    if (result.input) {
      onSubmit(result.input);
    } else {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }

  function fieldProps(field: keyof RoomFormValues) {
    return {
      id: `room-${field}`,
      value: values[field],
      'aria-invalid': errors[field] ? true : undefined,
      'aria-describedby': errors[field] ? `room-${field}-error` : undefined,
    };
  }

  function fieldError(field: keyof RoomFormValues) {
    return errors[field] ? (
      <p className="field-error" id={`room-${field}-error`}>{errors[field]}</p>
    ) : null;
  }

  return (
    <form className="room-form" onSubmit={handleSubmit} noValidate aria-labelledby="room-form-title">
      <div className="room-form-header">
        <h3 id="room-form-title">{room ? `Editando o quarto ${room.number}` : 'Novo quarto'}</h3>
        <p>Campos marcados com * são obrigatórios.</p>
      </div>

      {serverError && <p className="feedback feedback-error" role="alert">{serverError}</p>}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="room-number">Número do quarto *</label>
          <input {...fieldProps('number')} ref={firstFieldRef} required maxLength={20} placeholder="Ex.: 101" onChange={(e) => update('number', e.target.value)} />
          {fieldError('number')}
        </div>
        <div className="field">
          <label htmlFor="room-capacity">Capacidade (hóspedes) *</label>
          <input {...fieldProps('capacity')} type="number" inputMode="numeric" min={1} max={MAX_CAPACITY} step={1} required placeholder={`1 a ${MAX_CAPACITY}`} onChange={(e) => update('capacity', e.target.value)} />
          {fieldError('capacity')}
        </div>
        <div className="field">
          <label htmlFor="room-dailyRate">Valor da diária (R$) *</label>
          <input {...fieldProps('dailyRate')} inputMode="decimal" required placeholder="Ex.: 250,00" onChange={(e) => update('dailyRate', e.target.value)} />
          {fieldError('dailyRate')}
        </div>
        <div className="field field-wide">
          <label htmlFor="room-description">Descrição</label>
          <textarea {...fieldProps('description')} rows={3} maxLength={500} placeholder="Ex.: Vista para o mar, cama de casal e varanda." onChange={(e) => update('description', e.target.value)} />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar quarto'}
        </button>
      </div>
    </form>
  );
}
