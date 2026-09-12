import React, { useMemo, useState } from 'react';
import {
  Archive,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Search,
  Users,
  X
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Reservation, ReservationStatus, Room } from '../types.ts';

const VIEW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<ReservationStatus, string> = {
  Pendente: 'Pendente',
  Confirmada: 'Confirmada',
  CheckIn: 'Hospedado',
  CheckOut: 'Finalizada',
  Cancelada: 'Cancelada'
};

const STATUS_CLASSES: Record<ReservationStatus, string> = {
  Pendente: 'bg-[#FAEDCD] text-[#9C5B1A] border-[#D4A373]/50',
  Confirmada: 'bg-[#E9EDC9] text-[#3A5A40] border-[#CCD5AE]',
  CheckIn: 'bg-[#DDE5D5] text-[#2C5234] border-[#A3B18A]',
  CheckOut: 'bg-[#F4F1EA] text-[#6B705C] border-[#E6E3D8]',
  Cancelada: 'bg-red-50 text-red-700 border-red-200'
};

const hotelTodayKey = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value || '';
  const month = parts.find(part => part.type === 'month')?.value || '';
  const day = parts.find(part => part.type === 'day')?.value || '';
  return `${year}-${month}-${day}`;
};

const toUtcDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const dateKey = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (value: string, amount: number) => {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
};

const diffDays = (start: string, end: string) =>
  Math.round((toUtcDate(end).getTime() - toUtcDate(start).getTime()) / DAY_MS);

const formatDate = (value: string) =>
  toUtcDate(value).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

const formatDayNumber = (value: string) =>
  toUtcDate(value).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit'
  });

const formatWeekday = (value: string) =>
  toUtcDate(value)
    .toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short' })
    .replace('.', '');

const currency = (value: number, symbol: string) =>
  `${symbol} ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const roomMatchesReservation = (room: Room, reservation: Reservation) =>
  reservation.roomId === room.id || reservation.roomNumber === room.number;

export const ReservationsManager: React.FC = () => {
  const { reservations, rooms, settings, refreshData } = useHotel();
  const today = hotelTodayKey();

  const [timelineStart, setTimelineStart] = useState(today);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [operationalView, setOperationalView] = useState<'active' | 'staying'>('active');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatus, setArchiveStatus] = useState<'ALL' | 'CheckOut' | 'Cancelada'>('ALL');
  const [archivePeriod, setArchivePeriod] = useState<'7' | '30' | '90' | 'ALL'>('ALL');

  const timelineEnd = addDays(timelineStart, VIEW_DAYS);
  const visibleDays = useMemo(
    () => Array.from({ length: VIEW_DAYS }, (_, index) => addDays(timelineStart, index)),
    [timelineStart]
  );

  const roomsById = useMemo(() => new Map(rooms.map(room => [room.id, room])), [rooms]);
  const roomsByNumber = useMemo(() => new Map(rooms.map(room => [room.number, room])), [rooms]);

  const roomTypes = useMemo(
    () => Array.from(new Set(rooms.map(room => room.typeName))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rooms]
  );

  const floors = useMemo(
    () => Array.from(new Set(rooms.map(room => room.floor))).sort((a, b) => a - b),
    [rooms]
  );

  const scopedReservations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...reservations]
      .filter(reservation => {
        const room = roomsById.get(reservation.roomId) || roomsByNumber.get(reservation.roomNumber);
        if (roomTypeFilter !== 'ALL' && (room?.typeName || reservation.roomTypeName) !== roomTypeFilter) return false;
        if (floorFilter !== 'ALL' && String(room?.floor ?? '') !== floorFilter) return false;
        if (!query) return true;

        return [
          reservation.code,
          reservation.guestName,
          reservation.guestEmail,
          reservation.guestPhone,
          reservation.roomNumber,
          reservation.roomTypeName,
          room?.floor
        ]
          .filter(value => value !== undefined && value !== null)
          .some(value => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const dateComparison = a.checkInDate.localeCompare(b.checkInDate);
        if (dateComparison !== 0) return dateComparison;
        return a.roomNumber.localeCompare(b.roomNumber, 'pt-BR', { numeric: true });
      });
  }, [reservations, roomsById, roomsByNumber, search, roomTypeFilter, floorFilter]);

  const filteredReservations = useMemo(
    () => scopedReservations.filter(reservation => statusFilter === 'ALL' || reservation.status === statusFilter),
    [scopedReservations, statusFilter]
  );

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...rooms]
      .filter(room => roomTypeFilter === 'ALL' || room.typeName === roomTypeFilter)
      .filter(room => floorFilter === 'ALL' || String(room.floor) === floorFilter)
      .filter(room => {
        if (!query) return true;
        const directMatch = [room.number, room.typeName, room.floor]
          .some(value => String(value).toLowerCase().includes(query));
        const reservationMatch = filteredReservations.some(reservation => roomMatchesReservation(room, reservation));
        return directMatch || reservationMatch;
      })
      .sort((a, b) => {
        const floorComparison = a.floor - b.floor;
        if (floorComparison !== 0) return floorComparison;
        return a.number.localeCompare(b.number, 'pt-BR', { numeric: true });
      });
  }, [rooms, roomTypeFilter, floorFilter, search, filteredReservations]);

  const activeReservations = useMemo(
    () => scopedReservations.filter(reservation => ['Pendente', 'Confirmada'].includes(reservation.status)),
    [scopedReservations]
  );

  const stayingReservations = useMemo(
    () => scopedReservations.filter(reservation => reservation.status === 'CheckIn'),
    [scopedReservations]
  );

  const archiveReservations = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();
    const cutoff = archivePeriod === 'ALL' ? null : addDays(today, -Number(archivePeriod));

    return reservations
      .filter(reservation => reservation.status === 'CheckOut' || reservation.status === 'Cancelada')
      .filter(reservation => archiveStatus === 'ALL' || reservation.status === archiveStatus)
      .filter(reservation => !cutoff || reservation.checkOutDate >= cutoff)
      .filter(reservation => {
        if (!query) return true;
        return [
          reservation.code,
          reservation.guestName,
          reservation.guestEmail,
          reservation.guestPhone,
          reservation.roomNumber,
          reservation.roomTypeName
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => b.checkOutDate.localeCompare(a.checkOutDate));
  }, [reservations, archiveSearch, archiveStatus, archivePeriod, today]);

  const currentOperationalReservations = operationalView === 'active' ? activeReservations : stayingReservations;

  const hasFilters = Boolean(
    search.trim() || statusFilter !== 'ALL' || roomTypeFilter !== 'ALL' || floorFilter !== 'ALL'
  );

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setRoomTypeFilter('ALL');
    setFloorFilter('ALL');
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const shiftTimeline = (days: number) => setTimelineStart(previous => addDays(previous, days));

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider">
              <CalendarDays className="w-4 h-4" />
              <span>Central de Reservas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] mt-1">Calendário & Reservas</h2>
            <p className="mt-1 text-xs text-[#7B806E]">Ocupação planejada na timeline e operação atual separada do arquivo histórico.</p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E6E3D8] bg-white text-xs font-bold text-[#2C3327] hover:bg-[#F4F1EA] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Sincronizando...' : 'Sincronizar reservas'}
          </button>
        </div>

        <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_180px_220px_150px_auto] gap-2">
            <label className="relative min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9280]" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar hóspede, reserva ou quarto"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6E3D8] text-sm outline-none focus:ring-2 focus:ring-[#588157]/30"
              />
            </label>

            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'ALL' | ReservationStatus)}
              className="px-3 py-2.5 rounded-xl border border-[#E6E3D8] text-sm bg-white outline-none"
            >
              <option value="ALL">Todos os status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Confirmada">Confirmadas</option>
              <option value="CheckIn">Hospedados</option>
              <option value="CheckOut">Finalizadas</option>
              <option value="Cancelada">Canceladas</option>
            </select>

            <select
              value={roomTypeFilter}
              onChange={event => setRoomTypeFilter(event.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[#E6E3D8] text-sm bg-white outline-none min-w-0"
            >
              <option value="ALL">Todas as categorias</option>
              {roomTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>

            <select
              value={floorFilter}
              onChange={event => setFloorFilter(event.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[#E6E3D8] text-sm bg-white outline-none"
            >
              <option value="ALL">Todos os andares</option>
              {floors.map(floor => <option key={floor} value={String(floor)}>{floor}º andar</option>)}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#E6E3D8] text-xs font-bold text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-40"
            >
              <X className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </section>

        <section className="bg-white border border-[#E6E3D8] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#E6E3D8] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-[#2C3327]">Ocupação por quarto</h3>
              <p className="mt-1 text-[11px] text-[#7B806E]">
                {formatDate(timelineStart)} até {formatDate(addDays(timelineEnd, -1))} · {filteredRooms.length} quarto(s)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => shiftTimeline(-7)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#E6E3D8] text-xs font-bold hover:bg-[#F4F1EA]"
                aria-label="Voltar sete dias"
              >
                <ChevronLeft className="w-4 h-4" />
                7 dias
              </button>
              <button
                type="button"
                onClick={() => setTimelineStart(today)}
                className="px-3 py-2 rounded-lg border border-[#E6E3D8] text-xs font-bold hover:bg-[#F4F1EA]"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => shiftTimeline(7)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#E6E3D8] text-xs font-bold hover:bg-[#F4F1EA]"
                aria-label="Avançar sete dias"
              >
                7 dias
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-2.5 border-b border-[#E6E3D8] bg-[#FDFBF7] flex flex-wrap gap-x-4 gap-y-2">
            {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map(status => (
              <div key={status} className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B705C]">
                <span className={`w-3 h-3 rounded border ${STATUS_CLASSES[status]}`} />
                {STATUS_LABELS[status]}
              </div>
            ))}
            <span className="text-[10px] text-[#8A8F7D]">Canceladas só aparecem na grade quando esse status é filtrado.</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1380px]">
              <div
                className="grid border-b border-[#E6E3D8] bg-[#F8F8F3]"
                style={{ gridTemplateColumns: `180px repeat(${VIEW_DAYS}, minmax(84px, 1fr))` }}
              >
                <div className="sticky left-0 z-30 bg-[#F8F8F3] px-3 py-3 border-r border-[#E6E3D8] text-[10px] uppercase tracking-wider font-extrabold text-[#6B705C]">
                  Quarto
                </div>
                {visibleDays.map(day => {
                  const isToday = day === today;
                  return (
                    <div
                      key={day}
                      className={`px-2 py-2.5 text-center border-r border-[#E6E3D8] ${isToday ? 'bg-[#E9EDC9]' : ''}`}
                    >
                      <span className="block text-[9px] uppercase tracking-wider font-bold text-[#7B806E]">{formatWeekday(day)}</span>
                      <strong className={`block mt-0.5 text-xs ${isToday ? 'text-[#3A5A40]' : 'text-[#2C3327]'}`}>{formatDayNumber(day)}</strong>
                    </div>
                  );
                })}
              </div>

              {filteredRooms.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#8E9280]">Nenhum quarto encontrado para os filtros selecionados.</div>
              ) : (
                filteredRooms.map(room => {
                  const roomReservations = filteredReservations.filter(reservation => {
                    if (!roomMatchesReservation(room, reservation)) return false;
                    if (reservation.status === 'Cancelada' && statusFilter !== 'Cancelada') return false;
                    return reservation.checkInDate < timelineEnd && reservation.checkOutDate > timelineStart;
                  });

                  return (
                    <div
                      key={room.id}
                      className="grid relative border-b border-[#E6E3D8] last:border-b-0"
                      style={{ gridTemplateColumns: `180px repeat(${VIEW_DAYS}, minmax(84px, 1fr))` }}
                    >
                      <div className="sticky left-0 z-20 bg-white px-3 py-3 border-r border-[#E6E3D8] min-h-[66px] flex items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <BedDouble className="w-4 h-4 text-[#588157] shrink-0" />
                            <strong className="text-sm text-[#2C3327]">Quarto {room.number}</strong>
                          </div>
                          <span className="block mt-1 text-[10px] text-[#7B806E] truncate">{room.typeName} · {room.floor}º andar</span>
                        </div>
                      </div>

                      {visibleDays.map((day, index) => (
                        <div
                          key={`${room.id}-${day}`}
                          className={`min-h-[66px] border-r border-[#EEEAE1] ${day === today ? 'bg-[#F6F8ED]' : index % 2 === 1 ? 'bg-[#FDFCF9]' : 'bg-white'}`}
                          style={{ gridColumn: index + 2, gridRow: 1 }}
                        />
                      ))}

                      {roomReservations.map(reservation => {
                        const visibleStart = reservation.checkInDate < timelineStart ? timelineStart : reservation.checkInDate;
                        const visibleFinish = reservation.checkOutDate > timelineEnd ? timelineEnd : reservation.checkOutDate;
                        const startIndex = diffDays(timelineStart, visibleStart);
                        const span = Math.max(1, diffDays(visibleStart, visibleFinish));
                        const beginsBefore = reservation.checkInDate < timelineStart;
                        const endsAfter = reservation.checkOutDate > timelineEnd;

                        return (
                          <div
                            key={reservation.id}
                            className={`z-10 mx-1 my-3 h-10 rounded-lg border px-2 flex items-center overflow-hidden shadow-sm ${STATUS_CLASSES[reservation.status]}`}
                            style={{
                              gridColumn: `${startIndex + 2} / span ${span}`,
                              gridRow: 1
                            }}
                            title={`${reservation.code} · ${reservation.guestName} · ${formatDate(reservation.checkInDate)} → ${formatDate(reservation.checkOutDate)} · ${STATUS_LABELS[reservation.status]}`}
                          >
                            <div className="min-w-0 leading-tight">
                              <strong className="block truncate text-[10px]">
                                {beginsBefore ? '← ' : ''}{reservation.guestName}{endsAfter ? ' →' : ''}
                              </strong>
                              <span className="block truncate text-[9px] opacity-80">{reservation.code}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#E6E3D8] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E6E3D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-[#2C3327]">Reservas em operação</h3>
              <p className="text-[11px] text-[#6B705C]">Somente reservas que ainda fazem parte da operação atual.</p>
            </div>

            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[#DADFD1] bg-[#F4F1EA] text-xs font-extrabold text-[#2C3327] hover:bg-[#E9EDC9]"
            >
              <Archive className="w-4 h-4 text-[#588157]" />
              Arquivo
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#6B705C]">
                {reservations.filter(item => item.status === 'CheckOut' || item.status === 'Cancelada').length}
              </span>
            </button>
          </div>

          <div className="px-4 pt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOperationalView('active')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition ${operationalView === 'active' ? 'bg-[#2C3327] text-white border-[#2C3327]' : 'bg-white text-[#6B705C] border-[#E6E3D8] hover:bg-[#F4F1EA]'}`}
            >
              Ativas · {activeReservations.length}
            </button>
            <button
              type="button"
              onClick={() => setOperationalView('staying')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition ${operationalView === 'staying' ? 'bg-[#2C3327] text-white border-[#2C3327]' : 'bg-white text-[#6B705C] border-[#E6E3D8] hover:bg-[#F4F1EA]'}`}
            >
              Hospedados · {stayingReservations.length}
            </button>
          </div>

          {currentOperationalReservations.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#8E9280]">
              {operationalView === 'active' ? 'Nenhuma reserva pendente ou confirmada nos filtros atuais.' : 'Nenhum hóspede em check-in nos filtros atuais.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4">
              {currentOperationalReservations.map((reservation: Reservation) => {
                const room = roomsById.get(reservation.roomId) || roomsByNumber.get(reservation.roomNumber);
                return (
                  <article key={reservation.id} className="rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] p-4 hover:border-[#CCD5AE] transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-[#2C3327] truncate">{reservation.guestName}</strong>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[reservation.status]}`}>
                            {STATUS_LABELS[reservation.status]}
                          </span>
                        </div>
                        <span className="block mt-1 text-[10px] text-[#7B806E]">{reservation.code}</span>
                      </div>
                      <strong className="text-sm text-[#2C3327] whitespace-nowrap">{currency(reservation.totalNightsAmount, settings?.currency || 'R$')}</strong>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#3D4035]">
                      <div className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-[#588157] shrink-0" />
                        <span>Quarto {reservation.roomNumber}{room ? ` · ${room.floor}º andar` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[#6B705C] shrink-0" />
                        <span>{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6B705C]">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>{reservation.adults} adulto(s){reservation.children ? ` · ${reservation.children} criança(s)` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6B705C]">
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span>{reservation.paymentStatus} · {reservation.paymentMethod}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {archiveOpen && (
        <div className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setArchiveOpen(false)}>
          <section className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl border border-[#DADFD1] bg-[#FDFBF7] shadow-2xl" onClick={event => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[#588157] text-[10px] font-black uppercase tracking-[0.16em]">
                  <Archive className="w-4 h-4" />
                  Arquivamento visual
                </div>
                <h3 className="mt-1 text-xl font-black text-[#2C3327]">Arquivo de Reservas</h3>
                <p className="mt-1 text-xs text-[#6B705C]">Check-outs e cancelamentos permanecem no Supabase e saem apenas da operação atual.</p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]"
                aria-label="Fechar arquivo"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="border-b border-[#E6E3D8] bg-[#F8F8F3] p-4 space-y-3">
              <label className="relative block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9280]" />
                <input
                  value={archiveSearch}
                  onChange={event => setArchiveSearch(event.target.value)}
                  placeholder="Buscar hóspede, código, telefone, e-mail ou quarto"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E6E3D8] bg-white text-sm outline-none focus:ring-2 focus:ring-[#588157]/30"
                />
              </label>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {([['ALL', 'Todas'], ['CheckOut', 'Finalizadas'], ['Cancelada', 'Canceladas']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setArchiveStatus(value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${archiveStatus === value ? 'bg-[#2C3327] text-white border-[#2C3327]' : 'bg-white text-[#6B705C] border-[#E6E3D8]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {([['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['ALL', 'Tudo']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setArchivePeriod(value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold ${archivePeriod === value ? 'bg-[#E9EDC9] text-[#3A5A40] border-[#CCD5AE]' : 'bg-white text-[#6B705C] border-[#E6E3D8]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-4">
              {archiveReservations.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#8E9280]">Nenhuma reserva encontrada no arquivo com esses filtros.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {archiveReservations.map((reservation: Reservation) => (
                    <article key={reservation.id} className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-[#2C3327]">{reservation.guestName}</strong>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[reservation.status]}`}>
                              {STATUS_LABELS[reservation.status]}
                            </span>
                          </div>
                          <span className="block mt-1 text-[10px] text-[#7B806E]">{reservation.code}</span>
                        </div>
                        <strong className="text-sm text-[#2C3327] whitespace-nowrap">{currency(reservation.totalNightsAmount, settings?.currency || 'R$')}</strong>
                      </div>

                      <div className="mt-3 space-y-2 text-xs text-[#3D4035]">
                        <div className="flex items-center gap-2">
                          <BedDouble className="w-4 h-4 text-[#588157] shrink-0" />
                          <span>Quarto {reservation.roomNumber} · {reservation.roomTypeName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-[#6B705C] shrink-0" />
                          <span>{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#6B705C]">
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span>{reservation.paymentStatus} · {reservation.paymentMethod}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <footer className="border-t border-[#E6E3D8] bg-white px-5 py-3 text-right text-[11px] text-[#6B705C]">
              {archiveReservations.length} registro(s) no arquivo atual
            </footer>
          </section>
        </div>
      )}
    </>
  );
};
