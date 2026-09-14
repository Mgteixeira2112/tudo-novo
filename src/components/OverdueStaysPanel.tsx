import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CalendarPlus, Clock3, DoorOpen, LogOut, X } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { extendOverdueStayAtomic } from '../services/overdueStayPages.ts';

const saoPauloNowKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

const addIsoDays = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const overdueLabel = (checkOutDate: string, checkOutTime: string) => {
  const due = new Date(`${checkOutDate}T${checkOutTime}:00-03:00`).getTime();
  const diff = Math.max(0, Date.now() - due);
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
};

export const OverdueStaysPanel: React.FC = () => {
  const { reservations, rooms, settings, refreshData } = useHotel();
  const checkOutTime = settings?.checkOutTime || '11:00';
  const nowKey = saoPauloNowKey();
  const hotelDate = nowKey.slice(0, 10);
  const minimumNewCheckOutDate = addIsoDays(hotelDate, 1);

  const [extendingReservationId, setExtendingReservationId] = useState<string | null>(null);
  const [newCheckOutDate, setNewCheckOutDate] = useState(minimumNewCheckOutDate);
  const [extensionReason, setExtensionReason] = useState('');
  const [savingExtension, setSavingExtension] = useState(false);
  const [extensionError, setExtensionError] = useState('');

  const overdue = useMemo(() => {
    return reservations
      .filter(reservation =>
        reservation.status === 'CheckIn' &&
        `${reservation.checkOutDate}T${checkOutTime}` <= nowKey
      )
      .map(reservation => ({
        reservation,
        room: rooms.find(room => room.id === reservation.roomId || room.number === reservation.roomNumber)
      }))
      .sort((a, b) =>
        `${a.reservation.checkOutDate}T${checkOutTime}`.localeCompare(`${b.reservation.checkOutDate}T${checkOutTime}`)
      );
  }, [reservations, rooms, checkOutTime, nowKey]);

  const reservationBeingExtended = reservations.find(item => item.id === extendingReservationId) || null;

  const openCheckout = () => {
    window.dispatchEvent(new CustomEvent('hotel:navigate-standalone-module', { detail: { module: 'checkout' } }));
  };

  const openAlerts = () => {
    window.dispatchEvent(new CustomEvent('hotel:open_operational_alerts'));
  };

  const openExtension = (reservationId: string) => {
    setExtendingReservationId(reservationId);
    setNewCheckOutDate(minimumNewCheckOutDate);
    setExtensionReason('');
    setExtensionError('');
  };

  const closeExtension = () => {
    if (savingExtension) return;
    setExtendingReservationId(null);
    setExtensionError('');
  };

  const confirmExtension = async () => {
    if (!reservationBeingExtended) return;
    if (!newCheckOutDate || newCheckOutDate < minimumNewCheckOutDate) {
      setExtensionError(`Escolha uma nova saída a partir de ${formatDate(minimumNewCheckOutDate)}.`);
      return;
    }

    try {
      setSavingExtension(true);
      setExtensionError('');
      await extendOverdueStayAtomic({
        reservationId: reservationBeingExtended.id,
        newCheckOutDate,
        reason: extensionReason
      });
      await refreshData();
      setExtendingReservationId(null);
    } catch (error: any) {
      setExtensionError(error?.message || 'Não foi possível prorrogar a hospedagem.');
    } finally {
      setSavingExtension(false);
    }
  };

  if (overdue.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-3xl border border-[#DADFD1] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F5E8] text-[#588157]">
            <Clock3 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-black text-[#2C3327]">Nenhuma hospedagem vencida</h3>
          <p className="mt-2 text-sm text-[#7B806E]">Não há reservas em Check-in acima do horário oficial de checkout.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <section className="rounded-3xl border border-[#E7C8A2] bg-[#FFF8EF] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[#BC6C25] p-3 text-white shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-[#5F3717]">Regularização obrigatória</h3>
                  <span className="rounded-full bg-[#7F1D1D] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                    {overdue.length} vencida{overdue.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#85562F]">
                  Checkout oficial: {checkOutTime}. Os quartos permanecem fora do fluxo normal até a regularização.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openAlerts}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8B48A] bg-white px-4 py-2.5 text-xs font-black text-[#6B4423] transition hover:bg-[#FFF3E4]"
            >
              <Bell className="h-4 w-4" />
              Central de Alertas
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4">
          {overdue.map(({ reservation, room }) => {
            const roomProtected = room?.status === 'Bloqueado' && room.currentReservationId === reservation.id;
            return (
              <article key={reservation.id} className="rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#7F1D1D] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        Hospedagem vencida
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${roomProtected ? 'bg-[#FDE8E8] text-[#8B1E1E]' : 'bg-[#F4F1EA] text-[#6B705C]'}`}>
                        {roomProtected ? 'Quarto bloqueado' : `Quarto: ${room?.status || 'não localizado'}`}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#8A8F7D]">Quarto</span>
                        <strong className="mt-1 block text-2xl font-black text-[#2C3327]">{reservation.roomNumber}</strong>
                      </div>
                      <div className="sm:col-span-1 lg:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#8A8F7D]">Hóspede</span>
                        <strong className="mt-1 block truncate text-base font-black text-[#2C3327]">{reservation.guestName}</strong>
                        <span className="mt-0.5 block text-xs text-[#7B806E]">Reserva {reservation.code}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#8A8F7D]">Tempo vencido</span>
                        <strong className="mt-1 block text-base font-black text-[#A14E16]">
                          {overdueLabel(reservation.checkOutDate, checkOutTime)}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6B705C]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        Checkout previsto: {formatDate(reservation.checkOutDate)} às {checkOutTime}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <DoorOpen className="h-3.5 w-3.5" />
                        Reserva permanece em Check-in
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
                    <button
                      type="button"
                      onClick={() => openExtension(reservation.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#A3B18A] bg-[#F2F5E8] px-4 py-2.5 text-xs font-black text-[#3A5A40] transition hover:bg-[#E9EDC9]"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Prorrogar hospedagem
                    </button>
                    <button
                      type="button"
                      onClick={openCheckout}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#394233]"
                    >
                      <LogOut className="h-4 w-4" />
                      Ir para Checkout
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {reservationBeingExtended && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#E6E3D8] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#588157]">Regularização</span>
                <h3 className="mt-1 text-xl font-black text-[#2C3327]">Prorrogar hospedagem</h3>
                <p className="mt-1 text-sm text-[#6B705C]">
                  Quarto {reservationBeingExtended.roomNumber} · {reservationBeingExtended.guestName}
                </p>
              </div>
              <button type="button" onClick={closeExtension} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[#E7C8A2] bg-[#FFF8EF] p-4 text-xs text-[#6B4423]">
              A prorrogação recalcula a quantidade de diárias e o valor da hospedagem. Se o quarto tiver outra reserva no novo período, a operação será bloqueada.
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black text-[#2C3327]">Nova data de saída</label>
                <input
                  type="date"
                  min={minimumNewCheckOutDate}
                  value={newCheckOutDate}
                  onChange={event => setNewCheckOutDate(event.target.value)}
                  className="w-full rounded-xl border border-[#DADFD1] px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:border-[#588157] focus:ring-2 focus:ring-[#588157]/15"
                />
                <p className="mt-1 text-[11px] text-[#8A8F7D]">Checkout continuará às {checkOutTime} na nova data.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black text-[#2C3327]">Motivo / observação</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={extensionReason}
                  onChange={event => setExtensionReason(event.target.value)}
                  placeholder="Ex.: hóspede solicitou extensão de mais uma diária"
                  className="w-full resize-none rounded-xl border border-[#DADFD1] px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:border-[#588157] focus:ring-2 focus:ring-[#588157]/15"
                />
              </div>

              {extensionError && (
                <div className="rounded-xl border border-[#F3C4C4] bg-[#FFF1F1] px-3 py-2.5 text-xs font-semibold text-[#8B1E1E]">
                  {extensionError}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeExtension}
                disabled={savingExtension}
                className="rounded-xl border border-[#DADFD1] px-4 py-2.5 text-xs font-black text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmExtension}
                disabled={savingExtension}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-black text-white hover:bg-[#394233] disabled:opacity-50"
              >
                <CalendarPlus className="h-4 w-4" />
                {savingExtension ? 'Prorrogando...' : 'Confirmar prorrogação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
