import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Pencil, X } from 'lucide-react';
import {
  cancelReservationAtomicCloud,
  confirmReservationAtomicCloud,
  updateReservationAtomicCloud
} from '../services/reservationPages.ts';
import { Reservation } from '../types.ts';

type ActionMode = 'confirm' | 'edit' | 'cancel' | null;

interface ReservationActionsProps {
  reservation: Reservation;
  roomCapacity?: number;
  canManage: boolean;
  onUpdated: (reservation: Reservation) => void | Promise<void>;
}

interface EditFormState {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  notes: string;
}

const buildEditForm = (reservation: Reservation): EditFormState => ({
  guestName: reservation.guestName,
  guestEmail: reservation.guestEmail,
  guestPhone: reservation.guestPhone || '',
  checkInDate: reservation.checkInDate,
  checkOutDate: reservation.checkOutDate,
  adults: reservation.adults,
  children: reservation.children,
  notes: reservation.notes || ''
});

export const ReservationActions: React.FC<ReservationActionsProps> = ({
  reservation,
  roomCapacity,
  canManage,
  onUpdated
}) => {
  const [mode, setMode] = useState<ActionMode>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [editForm, setEditForm] = useState<EditFormState>(() => buildEditForm(reservation));

  useEffect(() => {
    setMode(null);
    setError('');
    setCancelReason('');
    setEditForm(buildEditForm(reservation));
  }, [reservation.id, reservation.status, reservation.checkInDate, reservation.checkOutDate]);

  const closeAction = () => {
    if (busy) return;
    setMode(null);
    setError('');
    setCancelReason('');
    setEditForm(buildEditForm(reservation));
  };

  const complete = async (updated: Reservation) => {
    await onUpdated(updated);
    setMode(null);
    setError('');
    setCancelReason('');
  };

  const confirmReservation = async () => {
    try {
      setBusy(true);
      setError('');
      const updated = await confirmReservationAtomicCloud(reservation.id);
      await complete(updated);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível confirmar a reserva.');
    } finally {
      setBusy(false);
    }
  };

  const cancelReservation = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setError('Informe o motivo do cancelamento para manter o histórico da reserva.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const updated = await cancelReservationAtomicCloud(reservation.id, reason);
      await complete(updated);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível cancelar a reserva.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editForm.guestName.trim() || !editForm.guestEmail.trim()) {
      setError('Nome e e-mail do hóspede são obrigatórios.');
      return;
    }
    if (!editForm.checkInDate || !editForm.checkOutDate || editForm.checkOutDate <= editForm.checkInDate) {
      setError('A data de saída deve ser posterior à data de entrada.');
      return;
    }
    if (Number(editForm.adults) < 1 || Number(editForm.children) < 0) {
      setError('Informe ao menos 1 adulto e uma quantidade válida de crianças.');
      return;
    }
    if (roomCapacity && Number(editForm.adults) + Number(editForm.children) > roomCapacity) {
      setError(`A ocupação informada excede a capacidade do quarto (${roomCapacity} hóspede(s)).`);
      return;
    }

    try {
      setBusy(true);
      setError('');
      const updated = await updateReservationAtomicCloud({
        reservationId: reservation.id,
        guestName: editForm.guestName,
        guestEmail: editForm.guestEmail,
        guestPhone: editForm.guestPhone,
        checkInDate: editForm.checkInDate,
        checkOutDate: editForm.checkOutDate,
        adults: Number(editForm.adults),
        children: Number(editForm.children),
        notes: editForm.notes
      });
      await complete(updated);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível editar a reserva.');
    } finally {
      setBusy(false);
    }
  };

  if (!canManage || !['Pendente', 'Confirmada'].includes(reservation.status)) return null;

  return (
    <>
      <section className="rounded-2xl border border-[#CCD5AE] bg-[#F7F8F2] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.12em] text-[#3A5A40]">Gestão da reserva</h4>
            <p className="mt-1 text-[10px] text-[#6B705C]">Ações com validação e persistência direta no Supabase.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {reservation.status === 'Pendente' && (
              <button
                type="button"
                onClick={() => { setMode('confirm'); setError(''); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#588157] bg-[#588157] px-3 py-2 text-[11px] font-extrabold text-white hover:bg-[#466747]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar
              </button>
            )}
            <button
              type="button"
              onClick={() => { setEditForm(buildEditForm(reservation)); setMode('edit'); setError(''); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADFD1] bg-white px-3 py-2 text-[11px] font-extrabold text-[#2C3327] hover:bg-[#F4F1EA]"
            >
              <Pencil className="h-4 w-4 text-[#588157]" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => { setMode('cancel'); setError(''); setCancelReason(''); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-extrabold text-red-700 hover:bg-red-50"
            >
              <Ban className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        </div>
      </section>

      {mode && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]" onClick={closeAction}>
          <section
            className={`w-full ${mode === 'edit' ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-hidden rounded-3xl border border-[#DADFD1] bg-[#FDFBF7] shadow-2xl`}
            onClick={event => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] bg-white px-5 py-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#588157]">
                  {mode === 'confirm' ? 'Confirmar reserva' : mode === 'edit' ? 'Editar reserva' : 'Cancelar reserva'}
                </span>
                <h3 className="mt-1 text-lg font-black text-[#2C3327]">{reservation.code}</h3>
              </div>
              <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </header>

            {mode === 'confirm' && (
              <div className="p-5">
                <div className="rounded-2xl border border-[#CCD5AE] bg-[#F2F5E8] p-4 text-sm text-[#3A5A40]">
                  <strong className="block">Confirmar a reserva de {reservation.guestName}?</strong>
                  <span className="mt-1 block text-xs">Ela passará de Pendente para Confirmada e continuará ocupando o mesmo quarto e período.</span>
                </div>
                {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#6B705C] disabled:opacity-50">Voltar</button>
                  <button type="button" onClick={confirmReservation} disabled={busy} className="rounded-xl bg-[#588157] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                    {busy ? 'Confirmando...' : 'Confirmar reserva'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'cancel' && (
              <div className="p-5">
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <strong className="block text-sm">A reserva sairá da operação atual e irá para o Arquivo.</strong>
                    <span className="mt-1 block text-xs">Nada será apagado do Supabase. O motivo ficará registrado nas observações da reserva.</span>
                  </div>
                </div>
                <label className="mt-4 block text-xs font-bold text-[#2C3327]">
                  Motivo do cancelamento
                  <textarea
                    value={cancelReason}
                    onChange={event => setCancelReason(event.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Ex.: hóspede solicitou cancelamento por telefone"
                    className="mt-2 w-full resize-none rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-red-200"
                  />
                </label>
                {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#6B705C] disabled:opacity-50">Voltar</button>
                  <button type="button" onClick={cancelReservation} disabled={busy} className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                    {busy ? 'Cancelando...' : 'Cancelar reserva'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'edit' && (
              <form onSubmit={saveEdit} className="flex max-h-[calc(92vh-74px)] flex-col">
                <div className="overflow-y-auto p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="text-xs font-bold text-[#2C3327]">
                      Nome do hóspede
                      <input value={editForm.guestName} onChange={event => setEditForm(previous => ({ ...previous, guestName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <label className="text-xs font-bold text-[#2C3327]">
                      E-mail
                      <input type="email" value={editForm.guestEmail} onChange={event => setEditForm(previous => ({ ...previous, guestEmail: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <label className="text-xs font-bold text-[#2C3327]">
                      Telefone
                      <input value={editForm.guestPhone} onChange={event => setEditForm(previous => ({ ...previous, guestPhone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <div className="rounded-xl border border-[#E6E3D8] bg-[#F7F8F2] px-3 py-2.5 text-xs text-[#6B705C]">
                      <span className="block text-[10px] uppercase tracking-wider">Quarto mantido</span>
                      <strong className="mt-0.5 block text-[#2C3327]">{reservation.roomNumber} · {reservation.roomTypeName}</strong>
                      {roomCapacity ? <span className="mt-0.5 block">Capacidade: {roomCapacity} hóspede(s)</span> : null}
                    </div>
                    <label className="text-xs font-bold text-[#2C3327]">
                      Entrada
                      <input type="date" value={editForm.checkInDate} onChange={event => setEditForm(previous => ({ ...previous, checkInDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <label className="text-xs font-bold text-[#2C3327]">
                      Saída
                      <input type="date" value={editForm.checkOutDate} onChange={event => setEditForm(previous => ({ ...previous, checkOutDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <label className="text-xs font-bold text-[#2C3327]">
                      Adultos
                      <input type="number" min={1} value={editForm.adults} onChange={event => setEditForm(previous => ({ ...previous, adults: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <label className="text-xs font-bold text-[#2C3327]">
                      Crianças
                      <input type="number" min={0} value={editForm.children} onChange={event => setEditForm(previous => ({ ...previous, children: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                    <label className="text-xs font-bold text-[#2C3327] md:col-span-2">
                      Observações
                      <textarea value={editForm.notes} onChange={event => setEditForm(previous => ({ ...previous, notes: event.target.value }))} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" />
                    </label>
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-[#7B806E]">Ao alterar as datas, o Supabase verifica novamente conflito de quarto e recalcula noites e valor total da hospedagem.</p>
                  {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
                </div>
                <footer className="flex justify-end gap-2 border-t border-[#E6E3D8] bg-white px-5 py-3">
                  <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#6B705C] disabled:opacity-50">Cancelar edição</button>
                  <button type="submit" disabled={busy} className="rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                    {busy ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
};
