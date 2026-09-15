import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, CreditCard, Pencil, Receipt, Utensils, Wine, X } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { api } from '../services/api.ts';
import {
  cancelReservationAtomicCloud,
  confirmReservationAtomicCloud,
  updateReservationAtomicCloud
} from '../services/reservationPages.ts';
import { KitchenOrder, Reservation, RoomMinibarConsumption } from '../types.ts';
import { evaluateRoomTypeCompatibility } from '../services/roomCompatibility.ts';
import { calculateReservationFolio } from '../utils/folio.ts';

type ActionMode = 'confirm' | 'edit' | 'cancel' | null;

interface ReservationActionsProps {
  reservation: Reservation;
  roomCapacity?: number;
  canManage: boolean;
  initialMode?: Exclude<ActionMode, null>;
  onUpdated: (reservation: Reservation) => void | Promise<void>;
}

interface EditFormState {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
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
  roomId: reservation.roomId,
  checkInDate: reservation.checkInDate,
  checkOutDate: reservation.checkOutDate,
  adults: reservation.adults,
  children: reservation.children,
  notes: reservation.notes || ''
});

export const ReservationActions: React.FC<ReservationActionsProps> = ({ reservation, roomCapacity, canManage, initialMode, onUpdated }) => {
  const { settings, transactions, rooms, reservations } = useHotel();
  const canManageReservation = canManage && ['Pendente', 'Confirmada'].includes(reservation.status);
  const [mode, setMode] = useState<ActionMode>(() => initialMode && canManageReservation ? initialMode : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [editForm, setEditForm] = useState<EditFormState>(() => buildEditForm(reservation));
  const [folioConsumptions, setFolioConsumptions] = useState<RoomMinibarConsumption[]>([]);
  const [folioOrders, setFolioOrders] = useState<KitchenOrder[]>([]);
  const [folioLoading, setFolioLoading] = useState(false);
  const [folioError, setFolioError] = useState('');

  useEffect(() => {
    setMode(initialMode && canManageReservation ? initialMode : null);
    setError('');
    setCancelReason('');
    setEditForm(buildEditForm(reservation));
  }, [reservation.id, initialMode]);

  useEffect(() => {
    setEditForm(buildEditForm(reservation));
  }, [reservation.status, reservation.roomId, reservation.checkInDate, reservation.checkOutDate]);

  useEffect(() => {
    let active = true;
    setFolioLoading(true);
    setFolioError('');

    Promise.all([
      api.getRoomConsumptions(reservation.roomId),
      api.getOrders()
    ])
      .then(([consumptions, orders]) => {
        if (!active) return;
        setFolioConsumptions(consumptions.filter(item => item.reservationId === reservation.id));
        setFolioOrders(orders.filter(item => item.reservationId === reservation.id));
      })
      .catch(err => {
        if (!active) return;
        setFolioConsumptions([]);
        setFolioOrders([]);
        setFolioError(err?.message || 'Não foi possível carregar todos os lançamentos do folio.');
      })
      .finally(() => {
        if (active) setFolioLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reservation.id, reservation.roomId]);

  const folio = useMemo(
    () => calculateReservationFolio(reservation, folioConsumptions, folioOrders, transactions),
    [reservation, folioConsumptions, folioOrders, transactions]
  );

  const reservationPayments = useMemo(
    () => transactions.filter(tx => tx.reservationId === reservation.id && tx.type === 'Receita' && tx.status === 'Pago'),
    [transactions, reservation.id]
  );

  const selectedEditRoom = useMemo(
    () => rooms.find(room => room.id === editForm.roomId) || rooms.find(room => room.id === reservation.roomId),
    [rooms, editForm.roomId, reservation.roomId]
  );

  const selectedEditRoomType = useMemo(
    () => settings?.roomTypes?.find(type => type.id === selectedEditRoom?.typeId || type.name === selectedEditRoom?.typeName),
    [settings?.roomTypes, selectedEditRoom?.typeId, selectedEditRoom?.typeName]
  );

  const editRoomOptions = useMemo(() => {
    const start = editForm.checkInDate;
    const end = editForm.checkOutDate;
    const adults = Number(editForm.adults || 0);
    const children = Number(editForm.children || 0);

    return [...rooms]
      .filter(room => {
        const isCurrent = room.id === reservation.roomId;
        const isSelected = room.id === editForm.roomId;
        if (!isCurrent && !isSelected && ['Manutencao', 'Bloqueado'].includes(room.status)) return false;

        const roomType = settings?.roomTypes?.find(type => type.id === room.typeId || type.name === room.typeName);
        if (roomType) {
          if (!evaluateRoomTypeCompatibility(roomType, adults, children).compatible && !isCurrent && !isSelected) return false;
        } else if (room.capacity && adults + children > room.capacity && !isCurrent && !isSelected) {
          return false;
        }

        if (!start || !end || end <= start || isCurrent || isSelected) return true;

        return !reservations.some(other =>
          other.id !== reservation.id
          && other.roomId === room.id
          && ['Pendente', 'Confirmada', 'CheckIn'].includes(other.status)
          && other.checkInDate < end
          && other.checkOutDate > start
        );
      })
      .sort((a, b) => a.number.localeCompare(b.number, 'pt-BR', { numeric: true }));
  }, [rooms, reservations, settings?.roomTypes, editForm.roomId, editForm.checkInDate, editForm.checkOutDate, editForm.adults, editForm.children, reservation.id, reservation.roomId]);

  const money = (value: number) => `${settings?.currency || 'R$'} ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

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
      await complete(await confirmReservationAtomicCloud(reservation.id));
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
      await complete(await cancelReservationAtomicCloud(reservation.id, reason));
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
    if (!editForm.roomId || !selectedEditRoom) {
      setError('Selecione um quarto válido para a reserva.');
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
    if (selectedEditRoomType) {
      const compatibility = evaluateRoomTypeCompatibility(
        selectedEditRoomType,
        Number(editForm.adults),
        Number(editForm.children)
      );
      if (!compatibility.compatible) {
        setError(compatibility.reason || 'A ocupação informada não é compatível com esta acomodação.');
        return;
      }
    } else if (selectedEditRoom.capacity && Number(editForm.adults) + Number(editForm.children) > selectedEditRoom.capacity) {
      setError(`A ocupação informada excede a capacidade do quarto (${selectedEditRoom.capacity} hóspede(s)).`);
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
        roomId: editForm.roomId,
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

  return (
    <>
      <section className="rounded-2xl border border-[#DADFD1] bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#588157]" />
              <h4 className="text-sm font-black text-[#2C3327]">Resumo financeiro da hospedagem</h4>
            </div>
            <p className="mt-1 text-[10px] text-[#7B806E]">Consulta do folio. A quitação continua sendo realizada no fluxo de Check-out.</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8A8F7D]">Saldo atual</span>
            <strong className={`text-lg ${folio.balance > 0 ? 'text-[#BC6C25]' : 'text-[#588157]'}`}>{money(folio.balance)}</strong>
          </div>
        </div>

        {folioLoading ? (
          <div className="mt-4 rounded-xl bg-[#F7F8F2] px-3 py-4 text-center text-xs text-[#6B705C]">Carregando lançamentos...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {folioError && <div className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">{folioError}</div>}

            <div className="rounded-xl border border-[#EEEAE1] bg-[#FDFBF7]">
              <div className="flex items-center justify-between gap-3 border-b border-[#EEEAE1] px-3 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#588157]" />
                  <span><strong>Hospedagem</strong> · {reservation.nights} diária(s)</span>
                </div>
                <strong>{money(folio.nightsTotal)}</strong>
              </div>

              <div className="border-b border-[#EEEAE1] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2"><Wine className="h-4 w-4 text-[#588157]" /><strong>Frigobar</strong></div>
                  <strong>{money(folio.minibarTotal)}</strong>
                </div>
                {folioConsumptions.length > 0 && (
                  <div className="mt-2 space-y-1 pl-6 text-[10px] text-[#6B705C]">
                    {folioConsumptions.map(item => (
                      <div key={item.id} className="flex justify-between gap-3">
                        <span>{item.itemName} · {item.quantity} × {money(item.unitPrice)}</span>
                        <span>{money(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b border-[#EEEAE1] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-[#BC6C25]" /><strong>Cozinha & Room Service entregues</strong></div>
                  <strong>{money(folio.kitchenTotal)}</strong>
                </div>
                {folio.deliveredKitchenOrders.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-6 text-[10px] text-[#6B705C]">
                    {folio.deliveredKitchenOrders.map(order => (
                      <div key={order.id} className="flex justify-between gap-3">
                        <span>#{order.orderNumber} · {order.items.map(item => `${item.quantity}× ${item.name}`).join(', ')}</span>
                        <span>{money(order.totalAmount + (order.deliveryFee || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#588157]" /><strong>Pagamentos já realizados</strong></div>
                  <strong className="text-[#588157]">− {money(folio.priorPaid)}</strong>
                </div>
                {reservationPayments.length > 0 && (
                  <div className="mt-2 space-y-1 pl-6 text-[10px] text-[#6B705C]">
                    {reservationPayments.map(payment => (
                      <div key={payment.id} className="flex justify-between gap-3">
                        <span>{payment.paymentMethod} · {payment.description}</span>
                        <span>− {money(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {folio.pendingKitchenOrders.length > 0 && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>{folio.pendingKitchenOrders.length} pedido(s) de Cozinha/Room Service ainda não entregue(s).</strong> Eles não entram no valor do folio até serem marcados como Entregue.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl bg-[#F7F8F2] px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-[#8A8F7D]">Total lançado</span><strong>{money(folio.grossTotal)}</strong></div>
              <div className="rounded-xl bg-[#F7F8F2] px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-[#8A8F7D]">Já pago</span><strong className="text-[#588157]">{money(folio.priorPaid)}</strong></div>
              <div className="col-span-2 rounded-xl bg-[#F2F5E8] px-3 py-2 sm:col-span-1"><span className="block text-[9px] uppercase tracking-wider text-[#6B705C]">Saldo</span><strong className={folio.balance > 0 ? 'text-[#BC6C25]' : 'text-[#588157]'}>{money(folio.balance)}</strong></div>
            </div>
          </div>
        )}
      </section>

      {canManageReservation && (
        <section className="rounded-2xl border border-[#CCD5AE] bg-[#F7F8F2] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-[#3A5A40]">Gestão da reserva</h4>
              <p className="mt-1 text-[10px] text-[#6B705C]">Ações com validação e persistência direta no Supabase.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reservation.status === 'Pendente' && (
                <button type="button" onClick={() => { setMode('confirm'); setError(''); }} className="inline-flex items-center gap-1.5 rounded-xl border border-[#588157] bg-[#588157] px-3 py-2 text-[11px] font-extrabold text-white hover:bg-[#466747]">
                  <CheckCircle2 className="h-4 w-4" /> Confirmar
                </button>
              )}
              <button type="button" onClick={() => { setEditForm(buildEditForm(reservation)); setMode('edit'); setError(''); }} className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADFD1] bg-white px-3 py-2 text-[11px] font-extrabold text-[#2C3327] hover:bg-[#F4F1EA]">
                <Pencil className="h-4 w-4 text-[#588157]" /> Editar
              </button>
              <button type="button" onClick={() => { setMode('cancel'); setError(''); setCancelReason(''); }} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-extrabold text-red-700 hover:bg-red-50">
                <Ban className="h-4 w-4" /> Cancelar
              </button>
            </div>
          </div>
        </section>
      )}

      {mode && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]" onClick={closeAction}>
          <section className={`w-full ${mode === 'edit' ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-hidden rounded-3xl border border-[#DADFD1] bg-[#FDFBF7] shadow-2xl`} onClick={event => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] bg-white px-5 py-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#588157]">{mode === 'confirm' ? 'Confirmar reserva' : mode === 'edit' ? 'Editar reserva' : 'Cancelar reserva'}</span>
                <h3 className="mt-1 text-lg font-black text-[#2C3327]">{reservation.code}</h3>
              </div>
              <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50"><X className="h-5 w-5" /></button>
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
                  <button type="button" onClick={confirmReservation} disabled={busy} className="rounded-xl bg-[#588157] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{busy ? 'Confirmando...' : 'Confirmar reserva'}</button>
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
                <label className="mt-4 block text-xs font-bold text-[#2C3327]">Motivo do cancelamento
                  <textarea value={cancelReason} onChange={event => setCancelReason(event.target.value)} rows={3} autoFocus placeholder="Ex.: hóspede solicitou cancelamento por telefone" className="mt-2 w-full resize-none rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-red-200" />
                </label>
                {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#6B705C] disabled:opacity-50">Voltar</button>
                  <button type="button" onClick={cancelReservation} disabled={busy} className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{busy ? 'Cancelando...' : 'Cancelar reserva'}</button>
                </div>
              </div>
            )}

            {mode === 'edit' && (
              <form onSubmit={saveEdit} className="flex max-h-[calc(92vh-74px)] flex-col">
                <div className="overflow-y-auto p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="text-xs font-bold text-[#2C3327]">Nome do hóspede<input value={editForm.guestName} onChange={event => setEditForm(previous => ({ ...previous, guestName: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327]">E-mail<input type="email" value={editForm.guestEmail} onChange={event => setEditForm(previous => ({ ...previous, guestEmail: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327]">Telefone<input value={editForm.guestPhone} onChange={event => setEditForm(previous => ({ ...previous, guestPhone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327]">Quarto
                      <select value={editForm.roomId} onChange={event => setEditForm(previous => ({ ...previous, roomId: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25">
                        {editRoomOptions.map(room => (
                          <option key={room.id} value={room.id}>Quarto {room.number} · {room.typeName}{room.id === reservation.roomId ? ' (Atual)' : ''}</option>
                        ))}
                      </select>
                      {selectedEditRoomType ? <span className="mt-1 block text-[10px] font-normal text-[#6B705C]">Capacidade: {selectedEditRoomType.capacityAdults} adulto(s) · {selectedEditRoomType.capacityChildren} criança(s) · máx. {selectedEditRoomType.maxOccupancy}</span> : null}
                    </label>
                    <label className="text-xs font-bold text-[#2C3327]">Entrada<input type="date" value={editForm.checkInDate} onChange={event => setEditForm(previous => ({ ...previous, checkInDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327]">Saída<input type="date" value={editForm.checkOutDate} onChange={event => setEditForm(previous => ({ ...previous, checkOutDate: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327]">Adultos<input type="number" min={1} value={editForm.adults} onChange={event => setEditForm(previous => ({ ...previous, adults: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327]">Crianças<input type="number" min={0} value={editForm.children} onChange={event => setEditForm(previous => ({ ...previous, children: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                    <label className="text-xs font-bold text-[#2C3327] md:col-span-2">Observações<textarea value={editForm.notes} onChange={event => setEditForm(previous => ({ ...previous, notes: event.target.value }))} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/25" /></label>
                  </div>
                  <div className="mt-3 rounded-xl border border-[#FAEDCD] bg-[#FFF8EF] px-3 py-2 text-[10px] leading-relaxed text-[#7A552C]">
                    O Supabase revalida disponibilidade, conflito e capacidade antes de salvar. Se o quarto for trocado, a tarifa original de <strong>{money(reservation.pricePerNight)} por diária</strong> será preservada e a troca ficará registrada nas observações.
                  </div>
                  {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
                </div>
                <footer className="flex justify-end gap-2 border-t border-[#E6E3D8] bg-white px-5 py-3">
                  <button type="button" onClick={closeAction} disabled={busy} className="rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#6B705C] disabled:opacity-50">Cancelar edição</button>
                  <button type="submit" disabled={busy} className="rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{busy ? 'Salvando...' : 'Salvar alterações'}</button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
};