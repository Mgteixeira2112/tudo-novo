import React, { useMemo } from 'react';
import { BedDouble, CalendarDays, CreditCard, Loader2, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Guest, Reservation, Room, RoomStatus } from '../types.ts';
import { ReservationActions } from './ReservationActions.tsx';

const STATUS_CLASSES: Record<Reservation['status'], string> = {
  Pendente: 'bg-[#FAEDCD] text-[#9C5B1A] border-[#D4A373]/50',
  Confirmada: 'bg-[#E9EDC9] text-[#3A5A40] border-[#CCD5AE]',
  CheckIn: 'bg-[#DDE5D5] text-[#2C5234] border-[#A3B18A]',
  CheckOut: 'bg-[#F4F1EA] text-[#6B705C] border-[#E6E3D8]',
  Cancelada: 'bg-red-50 text-red-700 border-red-200'
};

const STATUS_LABELS: Record<Reservation['status'], string> = {
  Pendente: 'Pendente',
  Confirmada: 'Confirmada',
  CheckIn: 'Hospedado',
  CheckOut: 'Finalizada',
  Cancelada: 'Cancelada'
};

const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '');
const normalizedText = (value?: string) => (value || '').trim().toLowerCase();

const safelyMatchesGuest = (guest: Guest, reservation: Reservation) => {
  if (normalizedText(guest.fullName) !== normalizedText(reservation.guestName)) return false;

  const guestEmail = normalizedText(guest.email);
  const reservationEmail = normalizedText(reservation.guestEmail);
  const guestPhone = normalizePhone(guest.phone);
  const reservationPhone = normalizePhone(reservation.guestPhone);
  const hasComparableContact = Boolean(
    (guestEmail && reservationEmail) || (guestPhone && reservationPhone)
  );

  return !hasComparableContact
    || Boolean(guestEmail && reservationEmail && guestEmail === reservationEmail)
    || Boolean(guestPhone && reservationPhone && guestPhone === reservationPhone);
};

const money = (value: number, symbol: string) => `${symbol} ${Number(value || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  } catch {
    return value;
  }
};

interface RoomReservationOperationalModalProps {
  room: Room;
  canManage: boolean;
  busy: boolean;
  safeTargets: RoomStatus[];
  statusLabel: (status: RoomStatus) => string;
  onClose: () => void;
  onChangeStatus: (room: Room, status: RoomStatus) => Promise<void>;
}

export const RoomReservationOperationalModal: React.FC<RoomReservationOperationalModalProps> = ({
  room,
  canManage,
  busy,
  safeTargets,
  statusLabel,
  onClose,
  onChangeStatus
}) => {
  const { reservations, guests, settings } = useHotel();
  const currency = settings?.currency || 'R$';

  const reservation = useMemo(() => {
    if (room.currentReservationId) {
      const active = reservations.find(item => item.id === room.currentReservationId);
      if (active) return active;
    }

    if (room.status !== 'Limpeza') return undefined;

    return [...reservations]
      .filter(item => (item.roomId === room.id || item.roomNumber === room.number) && item.status === 'CheckOut')
      .sort((a, b) => {
        const aTime = a.checkedOutAt || a.createdAt || '';
        const bTime = b.checkedOutAt || b.createdAt || '';
        return bTime.localeCompare(aTime);
      })[0];
  }, [reservations, room.currentReservationId, room.id, room.number, room.status]);

  const guest = useMemo(() => {
    if (!reservation) return undefined;
    if (reservation.guestId) {
      return guests.find(item => item.id === reservation.guestId && safelyMatchesGuest(item, reservation));
    }
    return guests.find(item => safelyMatchesGuest(item, reservation));
  }, [guests, reservation]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/35 backdrop-blur-[1px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={reservation ? `Ficha da reserva ${reservation.code}` : `Detalhes do Quarto ${room.number}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="h-full w-full max-w-lg bg-[#FDFBF7] shadow-2xl overflow-y-auto" onMouseDown={event => event.stopPropagation()}>
        <header className="sticky top-0 z-10 border-b border-[#E6E3D8] bg-[#FDFBF7]/95 backdrop-blur px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.16em] font-black text-[#588157]">
              {reservation ? 'Ficha operacional da reserva' : 'Ficha operacional do quarto'}
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-black text-[#2C3327]">{reservation?.code || `Quarto ${room.number}`}</h3>
              {reservation ? (
                <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${STATUS_CLASSES[reservation.status]}`}>
                  {STATUS_LABELS[reservation.status]}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-1 rounded-full border border-[#DADFD1] bg-white font-bold text-[#6B705C]">
                  {statusLabel(room.status)}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar ficha">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {reservation && (
            <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-black text-[#2C3327]">Hóspede</h4>
                {guest && (
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${guest.status === 'Restricao' ? 'border-amber-200 bg-amber-50 text-amber-800' : guest.status === 'VIP' ? 'border-[#D4A373]/50 bg-[#FAEDCD] text-[#9C5B1A]' : 'border-[#CCD5AE] bg-[#F2F5E8] text-[#3A5A40]'}`}>
                    {guest.status === 'Restricao' ? 'Restrição' : guest.status}
                  </span>
                )}
              </div>
              <strong className="block mt-2 text-base text-[#2C3327]">{reservation.guestName}</strong>
              <div className="mt-2 space-y-2 text-xs text-[#6B705C]">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#588157] shrink-0" /><span className="break-all">{reservation.guestEmail || 'E-mail não informado'}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#588157] shrink-0" /><span>{reservation.guestPhone || 'Telefone não informado'}</span></div>
              </div>
              {guest && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#EEEAE1] pt-3 text-[11px]">
                  <div><span className="block text-[#8A8F7D]">Documento</span><strong className="text-[#2C3327]">{guest.document ? `${guest.documentType}: ${guest.document}` : 'Não informado'}</strong></div>
                  <div><span className="block text-[#8A8F7D]">Cidade / UF</span><strong className="text-[#2C3327]">{[guest.city, guest.state].filter(Boolean).join(' / ') || 'Não informado'}</strong></div>
                  <div><span className="block text-[#8A8F7D]">Estadias registradas</span><strong className="text-[#2C3327]">{guest.totalStays || 0}</strong></div>
                  <div><span className="block text-[#8A8F7D]">Histórico de consumo</span><strong className="text-[#2C3327]">{money(guest.totalSpent || 0, currency)}</strong></div>
                </div>
              )}
            </section>
          )}

          {reservation && (
            <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
              <h4 className="flex items-center gap-2 text-sm font-black text-[#2C3327]"><CalendarDays className="w-4 h-4 text-[#588157]" />Estadia</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div><span className="block text-[#8A8F7D]">Entrada</span><strong className="text-[#2C3327]">{formatDate(reservation.checkInDate)}</strong></div>
                <div><span className="block text-[#8A8F7D]">Saída</span><strong className="text-[#2C3327]">{formatDate(reservation.checkOutDate)}</strong></div>
                <div><span className="block text-[#8A8F7D]">Noites</span><strong className="text-[#2C3327]">{reservation.nights}</strong></div>
                <div><span className="block text-[#8A8F7D]">Hóspedes</span><strong className="text-[#2C3327]">{reservation.adults} adulto(s){reservation.children ? ` + ${reservation.children} criança(s)` : ''}</strong></div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="flex items-center gap-2 text-sm font-black text-[#2C3327]"><BedDouble className="w-4 h-4 text-[#588157]" />Quarto</h4>
              <span className="rounded-full border border-[#DADFD1] bg-[#F8F7F2] px-2 py-1 text-[9px] font-black text-[#6B705C]">{statusLabel(room.status)}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><span className="block text-[#8A8F7D]">Número</span><strong className="text-[#2C3327]">{room.number}</strong></div>
              <div><span className="block text-[#8A8F7D]">Categoria</span><strong className="text-[#2C3327]">{room.typeName || reservation?.roomTypeName || 'Não informado'}</strong></div>
              <div><span className="block text-[#8A8F7D]">Andar</span><strong className="text-[#2C3327]">{room.floor}º andar</strong></div>
              <div><span className="block text-[#8A8F7D]">Capacidade</span><strong className="text-[#2C3327]">{room.capacity} hóspede(s)</strong></div>
            </div>
            {room.amenities?.length ? <div className="mt-3 border-t border-[#EEEAE1] pt-3 text-[10px] text-[#6B705C]"><strong className="text-[#2C3327]">Comodidades:</strong> {room.amenities.join(' · ')}</div> : null}
            {room.notes && <p className="mt-2 rounded-lg bg-[#F7F8F2] px-3 py-2 text-[10px] leading-relaxed text-[#6B705C]">{room.notes}</p>}
          </section>

          {reservation && (
            <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
              <h4 className="flex items-center gap-2 text-sm font-black text-[#2C3327]"><CreditCard className="w-4 h-4 text-[#588157]" />Pagamento</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div><span className="block text-[#8A8F7D]">Diária</span><strong className="text-[#2C3327]">{money(reservation.pricePerNight, currency)}</strong></div>
                <div><span className="block text-[#8A8F7D]">Total hospedagem</span><strong className="text-[#2C3327]">{money(reservation.totalNightsAmount, currency)}</strong></div>
                <div><span className="block text-[#8A8F7D]">Situação</span><strong className="text-[#2C3327]">{reservation.paymentStatus}</strong></div>
                <div><span className="block text-[#8A8F7D]">Forma</span><strong className="text-[#2C3327]">{reservation.paymentMethod}</strong></div>
              </div>
            </section>
          )}

          {reservation && (
            <ReservationActions reservation={reservation} roomCapacity={room.capacity} canManage={false} onUpdated={() => undefined} />
          )}

          {reservation?.checkedOutAt && room.status === 'Limpeza' && (
            <div className="rounded-xl border border-[#CCD5AE] bg-[#F7F8F2] px-4 py-3 text-[10px] text-[#6B705C]">
              Último checkout deste quarto: <strong className="text-[#2C3327]">{formatDateTime(reservation.checkedOutAt)}</strong>. O folio acima permanece disponível para consulta durante a higienização.
            </div>
          )}

          <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
            {room.status === 'Ocupado' ? (
              <div className="flex items-start gap-2 rounded-xl bg-[#F8F7F2] px-4 py-3 text-xs leading-relaxed text-[#6B705C]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#588157]" />
                <span>Estado protegido. Entrada e saída são controladas pelos fluxos de check-in e checkout.</span>
              </div>
            ) : canManage ? (
              <div className="space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8F7D]">Alterar status com segurança</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {safeTargets.map(target => (
                    <button
                      key={target}
                      type="button"
                      disabled={busy}
                      onClick={() => onChangeStatus(room, target)}
                      className="flex min-h-10 items-center justify-center rounded-xl border border-[#DADFD1] bg-[#F8FAF2] px-3 py-2 text-center text-xs font-bold leading-tight text-[#3A5A40] transition hover:bg-[#E9EDC9] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : statusLabel(target)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs font-semibold text-[#8A8F7D]">Somente leitura para este perfil.</div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};
