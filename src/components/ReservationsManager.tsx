import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  BedDouble,
  Users,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Reservation, ReservationStatus } from '../types.ts';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  Pendente: 'Pendente',
  Confirmada: 'Confirmada',
  CheckIn: 'Hospedado',
  CheckOut: 'Finalizada',
  Cancelada: 'Cancelada'
};

const STATUS_CLASSES: Record<ReservationStatus, string> = {
  Pendente: 'bg-[#FAEDCD] text-[#9C5B1A] border-[#D4A373]/40',
  Confirmada: 'bg-[#E9EDC9] text-[#3A5A40] border-[#CCD5AE]',
  CheckIn: 'bg-[#DDE5D5] text-[#2C5234] border-[#A3B18A]',
  CheckOut: 'bg-[#F4F1EA] text-[#6B705C] border-[#E6E3D8]',
  Cancelada: 'bg-red-50 text-red-700 border-red-200'
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

const formatDate = (value: string) =>
  toUtcDate(value).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

const formatMonth = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  });

const currency = (value: number, symbol: string) =>
  `${symbol} ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export const ReservationsManager: React.FC = () => {
  const { reservations, settings, refreshData } = useHotel();
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const [monthCursor, setMonthCursor] = useState(
    new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1))
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...reservations]
      .filter(res => statusFilter === 'ALL' || res.status === statusFilter)
      .filter(res => {
        if (!query) return true;
        return [res.code, res.guestName, res.guestEmail, res.roomNumber, res.roomTypeName]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  }, [reservations, search, statusFilter]);

  const reservationsForDay = (day: string) =>
    filteredReservations.filter(res => {
      if (res.status === 'Cancelada') return res.checkInDate === day;
      return res.checkInDate <= day && res.checkOutDate >= day;
    });

  const calendarDays = useMemo(() => {
    const first = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 1));
    const last = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0));
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    const totalCells = Math.ceil((mondayOffset + last.getUTCDate()) / 7) * 7;
    const start = new Date(first);
    start.setUTCDate(first.getUTCDate() - mondayOffset);
    return Array.from({ length: totalCells }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + index);
      return day;
    });
  }, [monthCursor]);

  const selectedReservations = selectedDay ? reservationsForDay(selectedDay) : filteredReservations;
  const upcoming = reservations.filter(
    res => res.status !== 'Cancelada' && res.status !== 'CheckOut' && res.checkInDate >= dateKey(todayUtc)
  ).length;
  const inHouse = reservations.filter(res => res.status === 'CheckIn').length;
  const confirmed = reservations.filter(res => res.status === 'Confirmada').length;
  const pending = reservations.filter(res => res.status === 'Pendente').length;

  const moveMonth = (offset: number) => {
    setMonthCursor(prev => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + offset, 1)));
    setSelectedDay(null);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider">
            <CalendarDays className="w-4 h-4" />
            <span>Central de Reservas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] mt-1">Calendário & Lista de Reservas</h2>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            Visualização administrativa das reservas reais sincronizadas com o PMS.
          </p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Próximas chegadas', upcoming],
          ['Hospedados', inHouse],
          ['Confirmadas', confirmed],
          ['Pendentes', pending]
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-white border border-[#E6E3D8] rounded-2xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-[#6B705C] font-semibold">{label}</span>
            <div className="text-2xl font-black text-[#2C3327] mt-1">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E6E3D8] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#E6E3D8] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="p-2 rounded-lg border border-[#E6E3D8] hover:bg-[#F4F1EA]" aria-label="Mês anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="min-w-[180px] text-center font-extrabold text-[#2C3327] capitalize">{formatMonth(monthCursor)}</h3>
            <button type="button" onClick={() => moveMonth(1)} className="p-2 rounded-lg border border-[#E6E3D8] hover:bg-[#F4F1EA]" aria-label="Próximo mês">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMonthCursor(new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1)));
                setSelectedDay(dateKey(todayUtc));
              }}
              className="hidden sm:inline-flex px-3 py-2 rounded-lg border border-[#E6E3D8] text-xs font-bold hover:bg-[#F4F1EA]"
            >
              Hoje
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <label className="relative min-w-0 sm:w-72">
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 bg-[#FDFBF7] border-b border-[#E6E3D8]">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(label => (
                <div key={label} className="px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#6B705C]">{label}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map(day => {
                const key = dateKey(day);
                const dayReservations = reservationsForDay(key);
                const inMonth = day.getUTCMonth() === monthCursor.getUTCMonth();
                const isToday = key === dateKey(todayUtc);
                const selected = key === selectedDay;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedDay(selected ? null : key)}
                    className={`min-h-[118px] p-2 text-left border-r border-b border-[#E6E3D8] align-top transition ${
                      selected ? 'bg-[#F2F5E8]' : 'hover:bg-[#FDFBF7]'
                    } ${!inMonth ? 'opacity-45' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold ${isToday ? 'w-6 h-6 rounded-full bg-[#2C3327] text-white inline-flex items-center justify-center' : 'text-[#3D4035]'}`}>
                        {day.getUTCDate()}
                      </span>
                      {dayReservations.length > 0 && <span className="text-[10px] font-bold text-[#588157]">{dayReservations.length}</span>}
                    </div>
                    <div className="space-y-1">
                      {dayReservations.slice(0, 3).map(res => (
                        <div key={res.id} className={`px-1.5 py-1 rounded border text-[9px] leading-tight truncate ${STATUS_CLASSES[res.status]}`} title={`${res.guestName} · Quarto ${res.roomNumber}`}>
                          <strong>Q{res.roomNumber}</strong> · {res.guestName}
                        </div>
                      ))}
                      {dayReservations.length > 3 && <div className="text-[9px] font-bold text-[#6B705C] pl-1">+ {dayReservations.length - 3} reservas</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E6E3D8] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E6E3D8] flex items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-[#2C3327]">
              {selectedDay ? `Reservas em ${formatDate(selectedDay)}` : 'Todas as reservas filtradas'}
            </h3>
            <p className="text-[11px] text-[#6B705C]">{selectedReservations.length} registro(s)</p>
          </div>
          {selectedDay && (
            <button type="button" onClick={() => setSelectedDay(null)} className="text-xs font-bold text-[#588157] hover:underline">Limpar dia</button>
          )}
        </div>

        {selectedReservations.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#8E9280]">Nenhuma reserva encontrada para os filtros selecionados.</div>
        ) : (
          <div className="divide-y divide-[#E6E3D8]">
            {selectedReservations.map((res: Reservation) => (
              <div key={res.id} className="p-4 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm text-[#2C3327]">{res.guestName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[res.status]}`}>{STATUS_LABELS[res.status]}</span>
                  </div>
                  <div className="text-[11px] text-[#6B705C] mt-1">{res.code} · {res.guestEmail || res.guestPhone || 'Contato não informado'}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#3D4035]">
                  <BedDouble className="w-4 h-4 text-[#588157] shrink-0" />
                  <div><strong>Quarto {res.roomNumber}</strong><span className="block text-[10px] text-[#6B705C]">{res.roomTypeName}</span></div>
                </div>
                <div className="text-xs text-[#3D4035]">
                  <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-[#6B705C]" /> {formatDate(res.checkInDate)} → {formatDate(res.checkOutDate)}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#6B705C]"><Users className="w-3.5 h-3.5" /> {res.adults} adulto(s){res.children ? ` · ${res.children} criança(s)` : ''}</div>
                </div>
                <div className="lg:text-right">
                  <div className="font-black text-sm text-[#2C3327]">{currency(res.totalNightsAmount, settings?.currency || 'R$')}</div>
                  <div className="flex lg:justify-end items-center gap-1 text-[10px] text-[#6B705C] mt-1"><CreditCard className="w-3.5 h-3.5" /> {res.paymentStatus} · {res.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
