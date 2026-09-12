import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowRight,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
  X
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { loadGuestsCloud } from '../services/adminPages.ts';
import { Guest, Reservation, ReservationStatus, Room } from '../types.ts';

const VIEW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const RESERVATION_NAVIGATION_KEY = 'novohotel:reservation-navigation';
const KANBAN_NAVIGATION_KEY = 'novohotel:kanban-navigation';
const GUEST_NAVIGATION_KEY = 'novohotel:guest-navigation';

type DashboardReservationFilter = 'ALL' | 'ARRIVALS_TODAY' | 'DEPARTURES_TODAY' | 'PENDING';

const DASHBOARD_FILTER_LABELS: Record<Exclude<DashboardReservationFilter, 'ALL'>, string> = {
  ARRIVALS_TODAY: 'Chegadas hoje',
  DEPARTURES_TODAY: 'Saídas hoje',
  PENDING: 'Reservas pendentes'
};

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

const currency = (value: number, symbol: string) =>
  `${symbol} ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '');
const normalizedText = (value?: string) => (value || '').trim().toLowerCase();

const roomMatchesReservation = (room: Room, reservation: Reservation) =>
  reservation.roomId === room.id || reservation.roomNumber === room.number;

interface ReservationsManagerProps {
  onOpenCheckInOut?: () => void;
}

export const ReservationsManager: React.FC<ReservationsManagerProps> = ({ onOpenCheckInOut }) => {
  const { reservations, rooms, guests, settings, refreshData, canAccessTab, hasPermission } = useHotel();
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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardReservationFilter>('ALL');
  const [guestDirectory, setGuestDirectory] = useState<Guest[]>(guests);

  useEffect(() => {
    if (guests.length > 0) {
      setGuestDirectory(guests);
      return;
    }

    let active = true;
    loadGuestsCloud()
      .then(data => {
        if (active) setGuestDirectory(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [guests]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESERVATION_NAVIGATION_KEY);
      if (!raw) return;
      sessionStorage.removeItem(RESERVATION_NAVIGATION_KEY);
      const parsed = JSON.parse(raw) as { filter?: DashboardReservationFilter };
      if (!parsed.filter || !['ARRIVALS_TODAY', 'DEPARTURES_TODAY', 'PENDING'].includes(parsed.filter)) return;

      setSearch('');
      setRoomTypeFilter('ALL');
      setFloorFilter('ALL');
      setTimelineStart(today);
      setArchiveOpen(false);
      setSelectedReservation(null);
      setDashboardFilter(parsed.filter);

      if (parsed.filter === 'DEPARTURES_TODAY') {
        setStatusFilter('CheckIn');
        setOperationalView('staying');
      } else if (parsed.filter === 'PENDING') {
        setStatusFilter('Pendente');
        setOperationalView('active');
      } else {
        setStatusFilter('ALL');
        setOperationalView('active');
      }
    } catch {
      // Keep the default Central de Reservas view if transient navigation state is unavailable.
    }
  }, [today]);

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

  const selectedRoom = selectedReservation
    ? roomsById.get(selectedReservation.roomId) || roomsByNumber.get(selectedReservation.roomNumber)
    : undefined;

  const selectedGuest = selectedReservation
    ? guestDirectory.find(guest => guest.id === selectedReservation.guestId)
      || guestDirectory.find(guest => selectedReservation.guestEmail && normalizedText(guest.email) === normalizedText(selectedReservation.guestEmail))
      || guestDirectory.find(guest => {
        const reservationPhone = normalizePhone(selectedReservation.guestPhone);
        return Boolean(reservationPhone) && normalizePhone(guest.phone) === reservationPhone;
      })
      || guestDirectory.find(guest => normalizedText(guest.fullName) === normalizedText(selectedReservation.guestName))
    : undefined;

  const scopedReservations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...reservations]
      .filter(reservation => {
        if (dashboardFilter === 'ARRIVALS_TODAY' && !(reservation.checkInDate === today && reservation.status !== 'CheckIn' && reservation.status !== 'CheckOut' && reservation.status !== 'Cancelada')) return false;
        if (dashboardFilter === 'DEPARTURES_TODAY' && !(reservation.checkOutDate === today && reservation.status === 'CheckIn')) return false;
        if (dashboardFilter === 'PENDING' && reservation.status !== 'Pendente') return false;

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
  }, [reservations, roomsById, roomsByNumber, search, roomTypeFilter, floorFilter, dashboardFilter, today]);

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
        const reservationMatch = filteredReservations.some(reservation => roomMatchesReservation(room, reservation));
        if (dashboardFilter !== 'ALL' && !reservationMatch) return false;
        if (!query) return true;
        const directMatch = [room.number, room.typeName, room.floor]
          .some(value => String(value).toLowerCase().includes(query));
        return directMatch || reservationMatch;
      })
      .sort((a, b) => {
        const floorComparison = a.floor - b.floor;
        if (floorComparison !== 0) return floorComparison;
        return a.number.localeCompare(b.number, 'pt-BR', { numeric: true });
      });
  }, [rooms, roomTypeFilter, floorFilter, search, filteredReservations, dashboardFilter]);

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
    dashboardFilter !== 'ALL' || search.trim() || statusFilter !== 'ALL' || roomTypeFilter !== 'ALL' || floorFilter !== 'ALL'
  );

  const clearFilters = () => {
    setDashboardFilter('ALL');
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

  const openReservationDetails = (reservation: Reservation, closeArchive = false) => {
    if (closeArchive) setArchiveOpen(false);
    setSelectedReservation(reservation);
  };

  const showSelectedOnTimeline = () => {
    if (!selectedReservation) return;
    setDashboardFilter('ALL');
    setSearch('');
    setRoomTypeFilter('ALL');
    setFloorFilter('ALL');
    setStatusFilter(selectedReservation.status === 'Cancelada' ? 'Cancelada' : 'ALL');
    setTimelineStart(selectedReservation.checkInDate);
    setArchiveOpen(false);
    setSelectedReservation(null);
  };

  const openCheckFlow = () => {
    setSelectedReservation(null);
    onOpenCheckInOut?.();
  };

  const openSelectedRoomMap = () => {
    if (!selectedReservation) return;
    try {
      sessionStorage.setItem(
        KANBAN_NAVIGATION_KEY,
        JSON.stringify({ view: 'rooms', roomSearch: selectedReservation.roomNumber })
      );
    } catch {}
    setSelectedReservation(null);
    window.dispatchEvent(new CustomEvent('hotel:navigate-standalone-module', { detail: { module: 'roomMap' } }));
  };

  const openSelectedGuestRecord = () => {
    if (!selectedReservation) return;
    const query = selectedGuest?.document
      || selectedGuest?.email
      || selectedReservation.guestEmail
      || selectedReservation.guestPhone
      || selectedReservation.guestName;
    try {
      sessionStorage.setItem(GUEST_NAVIGATION_KEY, JSON.stringify({ query }));
    } catch {}
    setSelectedReservation(null);
    window.dispatchEvent(new CustomEvent('hotel:navigate-admin-tab', { detail: { tab: 'guests' } }));
  };

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

          {dashboardFilter !== 'ALL' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#CCD5AE] bg-[#F2F5E8] px-3 py-2 text-xs text-[#3A5A40]">
              <span className="font-bold">Filtro recebido do Meu Painel:</span>
              <strong>{DASHBOARD_FILTER_LABELS[dashboardFilter]}</strong>
              <button
                type="button"
                onClick={() => {
                  setDashboardFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold hover:bg-white/70"
              >
                <X className="w-3.5 h-3.5" /> Remover
              </button>
            </div>
          )}
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
                          <button
                            type="button"
                            key={reservation.id}
                            onClick={() => openReservationDetails(reservation)}
                            className={`z-10 mx-1 my-3 h-10 rounded-lg border px-2 flex items-center overflow-hidden shadow-sm text-left cursor-pointer hover:brightness-[0.98] focus:outline-none focus:ring-2 focus:ring-[#588157]/30 ${STATUS_CLASSES[reservation.status]}`}
                            style={{
                              gridColumn: `${startIndex + 2} / span ${span}`,
                              gridRow: 1
                            }}
                            title={`Abrir ${reservation.code} · ${reservation.guestName}`}
                          >
                            <div className="min-w-0 leading-tight">
                              <strong className="block truncate text-[10px]">
                                {beginsBefore ? '← ' : ''}{reservation.guestName}{endsAfter ? ' →' : ''}
                              </strong>
                              <span className="block truncate text-[9px] opacity-80">{reservation.code}</span>
                            </div>
                          </button>
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
                  <button
                    type="button"
                    key={reservation.id}
                    onClick={() => openReservationDetails(reservation)}
                    className="rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] p-4 hover:border-[#CCD5AE] hover:shadow-sm transition text-left focus:outline-none focus:ring-2 focus:ring-[#588157]/20"
                  >
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

                    <div className="mt-3 pt-3 border-t border-[#E6E3D8] flex items-center justify-end gap-1 text-[11px] font-bold text-[#588157]">
                      Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
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
                    <button
                      type="button"
                      key={reservation.id}
                      onClick={() => openReservationDetails(reservation, true)}
                      className="rounded-2xl border border-[#E6E3D8] bg-white p-4 text-left hover:border-[#CCD5AE] hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#588157]/20"
                    >
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

                      <div className="mt-3 pt-3 border-t border-[#E6E3D8] flex items-center justify-end gap-1 text-[11px] font-bold text-[#588157]">
                        Consultar detalhes <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
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

      {selectedReservation && (
        <div className="fixed inset-0 z-[110] bg-black/35 backdrop-blur-[1px] flex justify-end" onClick={() => setSelectedReservation(null)}>
          <aside className="h-full w-full max-w-lg bg-[#FDFBF7] shadow-2xl overflow-y-auto" onClick={event => event.stopPropagation()}>
            <header className="sticky top-0 z-10 border-b border-[#E6E3D8] bg-[#FDFBF7]/95 backdrop-blur px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.16em] font-black text-[#588157]">Ficha operacional da reserva</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black text-[#2C3327]">{selectedReservation.code}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${STATUS_CLASSES[selectedReservation.status]}`}>
                    {STATUS_LABELS[selectedReservation.status]}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReservation(null)}
                className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]"
                aria-label="Fechar detalhes"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-5 space-y-4">
              <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-black text-[#2C3327]">Hóspede</h4>
                  {selectedGuest && (
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${selectedGuest.status === 'Restricao' ? 'border-amber-200 bg-amber-50 text-amber-800' : selectedGuest.status === 'VIP' ? 'border-[#D4A373]/50 bg-[#FAEDCD] text-[#9C5B1A]' : 'border-[#CCD5AE] bg-[#F2F5E8] text-[#3A5A40]'}`}>
                      {selectedGuest.status === 'Restricao' ? 'Restrição' : selectedGuest.status}
                    </span>
                  )}
                </div>
                <strong className="block mt-2 text-base text-[#2C3327]">{selectedReservation.guestName}</strong>
                <div className="mt-2 space-y-2 text-xs text-[#6B705C]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#588157] shrink-0" />
                    {selectedReservation.guestEmail ? (
                      <a className="break-all hover:text-[#3A5A40] hover:underline" href={`mailto:${selectedReservation.guestEmail}`}>{selectedReservation.guestEmail}</a>
                    ) : (
                      <span>E-mail não informado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#588157] shrink-0" />
                    {selectedReservation.guestPhone ? (
                      <a className="hover:text-[#3A5A40] hover:underline" href={`tel:${selectedReservation.guestPhone}`}>{selectedReservation.guestPhone}</a>
                    ) : (
                      <span>Telefone não informado</span>
                    )}
                  </div>
                </div>

                {selectedGuest && (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#EEEAE1] pt-3 text-[11px]">
                      <div>
                        <span className="block text-[#8A8F7D]">Documento</span>
                        <strong className="text-[#2C3327]">{selectedGuest.document ? `${selectedGuest.documentType}: ${selectedGuest.document}` : 'Não informado'}</strong>
                      </div>
                      <div>
                        <span className="block text-[#8A8F7D]">Cidade / UF</span>
                        <strong className="text-[#2C3327]">{[selectedGuest.city, selectedGuest.state].filter(Boolean).join(' / ') || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span className="block text-[#8A8F7D]">Estadias registradas</span>
                        <strong className="text-[#2C3327]">{selectedGuest.totalStays || 0}</strong>
                      </div>
                      <div>
                        <span className="block text-[#8A8F7D]">Histórico de consumo</span>
                        <strong className="text-[#2C3327]">{currency(selectedGuest.totalSpent || 0, settings?.currency || 'R$')}</strong>
                      </div>
                    </div>
                    {(selectedGuest.preferences || selectedGuest.allergiesNotes) && (
                      <div className="mt-3 space-y-2 text-[10px]">
                        {selectedGuest.preferences && <div className="rounded-lg bg-[#F7F8F2] px-3 py-2 text-[#5D6355]"><strong>Preferências:</strong> {selectedGuest.preferences}</div>}
                        {selectedGuest.allergiesNotes && <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800"><strong>Alergias/Restrições:</strong> {selectedGuest.allergiesNotes}</div>}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                <h4 className="text-sm font-black text-[#2C3327]">Estadia</h4>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[#8A8F7D]">Entrada</span>
                    <strong className="text-[#2C3327]">{formatDate(selectedReservation.checkInDate)}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Saída</span>
                    <strong className="text-[#2C3327]">{formatDate(selectedReservation.checkOutDate)}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Noites</span>
                    <strong className="text-[#2C3327]">{selectedReservation.nights}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Hóspedes</span>
                    <strong className="text-[#2C3327]">
                      {selectedReservation.adults} adulto(s){selectedReservation.children ? ` + ${selectedReservation.children} criança(s)` : ''}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-black text-[#2C3327]">Quarto</h4>
                  {selectedRoom && (
                    <span className="rounded-full border border-[#DADFD1] bg-[#F8F7F2] px-2 py-1 text-[9px] font-black text-[#6B705C]">{selectedRoom.status}</span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[#8A8F7D]">Número</span>
                    <strong className="text-[#2C3327]">{selectedReservation.roomNumber}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Categoria</span>
                    <strong className="text-[#2C3327]">{selectedRoom?.typeName || selectedReservation.roomTypeName}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Andar</span>
                    <strong className="text-[#2C3327]">{selectedRoom ? `${selectedRoom.floor}º andar` : '—'}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Capacidade</span>
                    <strong className="text-[#2C3327]">{selectedRoom ? `${selectedRoom.capacity} hóspede(s)` : '—'}</strong>
                  </div>
                </div>
                {selectedRoom?.amenities?.length ? (
                  <div className="mt-3 border-t border-[#EEEAE1] pt-3 text-[10px] text-[#6B705C]">
                    <strong className="text-[#2C3327]">Comodidades:</strong> {selectedRoom.amenities.join(' · ')}
                  </div>
                ) : null}
                {selectedRoom?.notes && <p className="mt-2 rounded-lg bg-[#F7F8F2] px-3 py-2 text-[10px] leading-relaxed text-[#6B705C]">{selectedRoom.notes}</p>}
              </section>

              <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                <h4 className="text-sm font-black text-[#2C3327]">Pagamento</h4>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[#8A8F7D]">Diária</span>
                    <strong className="text-[#2C3327]">{currency(selectedReservation.pricePerNight, settings?.currency || 'R$')}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Total hospedagem</span>
                    <strong className="text-[#2C3327]">{currency(selectedReservation.totalNightsAmount, settings?.currency || 'R$')}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Situação</span>
                    <strong className="text-[#2C3327]">{selectedReservation.paymentStatus}</strong>
                  </div>
                  <div>
                    <span className="block text-[#8A8F7D]">Forma</span>
                    <strong className="text-[#2C3327]">{selectedReservation.paymentMethod}</strong>
                  </div>
                </div>
              </section>

              {selectedReservation.notes && (
                <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                  <h4 className="text-sm font-black text-[#2C3327]">Observações da reserva</h4>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#6B705C]">{selectedReservation.notes}</p>
                </section>
              )}

              <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-[#2C3327]">
                  <Clock3 className="w-4 h-4 text-[#588157]" />
                  Registro
                </h4>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#8A8F7D]">Criada em</span>
                    <strong className="text-right text-[#2C3327]">{formatDateTime(selectedReservation.createdAt)}</strong>
                  </div>
                  {selectedReservation.checkedInAt && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#8A8F7D]">Check-in registrado</span>
                      <strong className="text-right text-[#2C3327]">{formatDateTime(selectedReservation.checkedInAt)}</strong>
                    </div>
                  )}
                  {selectedReservation.checkedOutAt && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#8A8F7D]">Check-out registrado</span>
                      <strong className="text-right text-[#2C3327]">{formatDateTime(selectedReservation.checkedOutAt)}</strong>
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={showSelectedOnTimeline}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DADFD1] bg-white px-3 py-3 text-xs font-extrabold text-[#2C3327] hover:bg-[#F4F1EA]"
                >
                  <CalendarDays className="w-4 h-4 text-[#588157]" />
                  Calendário
                </button>

                {canAccessTab('guests') && (
                  <button
                    type="button"
                    onClick={openSelectedGuestRecord}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DADFD1] bg-white px-3 py-3 text-xs font-extrabold text-[#2C3327] hover:bg-[#F4F1EA]"
                  >
                    <Users className="w-4 h-4 text-[#588157]" />
                    Hóspede
                  </button>
                )}

                {hasPermission('view_rooms') && (
                  <button
                    type="button"
                    onClick={openSelectedRoomMap}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DADFD1] bg-white px-3 py-3 text-xs font-extrabold text-[#2C3327] hover:bg-[#F4F1EA]"
                  >
                    <BedDouble className="w-4 h-4 text-[#588157]" />
                    Mapa do quarto
                  </button>
                )}

                {onOpenCheckInOut && ['Pendente', 'Confirmada', 'CheckIn'].includes(selectedReservation.status) && (
                  <button
                    type="button"
                    onClick={openCheckFlow}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2C3327] bg-[#2C3327] px-3 py-3 text-xs font-extrabold text-white hover:bg-[#3A4235]"
                  >
                    {selectedReservation.status === 'CheckIn' ? 'Abrir Check-out' : 'Abrir Check-in'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};