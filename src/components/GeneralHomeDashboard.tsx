import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  Clock3,
  Hotel,
  KeyRound,
  Mail,
  Phone,
  Sparkles,
  UserRound,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { AdminTab, Reservation, Room } from '../types.ts';

interface HomeDashboardProps {
  onNavigate: (tab: AdminTab) => void;
}

const KANBAN_NAVIGATION_KEY = 'novohotel:kanban-navigation';

const statusTone: Record<Room['status'], string> = {
  Disponivel: 'bg-[#EEF5E8] text-[#3A5A40] border-[#CCD5AE]',
  Ocupado: 'bg-[#FFF5DF] text-[#8A5A16] border-[#E9C98D]',
  Limpeza: 'bg-[#EEF1F4] text-[#58636F] border-[#CDD3D8]',
  Manutencao: 'bg-[#FFF0E8] text-[#9C5A2B] border-[#E6B89A]',
  Bloqueado: 'bg-[#F1EEEA] text-[#5E5952] border-[#D9D1C7]'
};

const reservationTone: Record<Reservation['status'], string> = {
  Pendente: 'bg-[#FFF5DF] text-[#8A5A16]',
  Confirmada: 'bg-[#EEF5E8] text-[#3A5A40]',
  CheckIn: 'bg-[#E9F0E5] text-[#2F5A37]',
  CheckOut: 'bg-[#F1EEEA] text-[#6B705C]',
  Cancelada: 'bg-[#FDECEC] text-[#9C3B32]'
};

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const money = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const { rooms, reservations, tasks, settings } = useHotel();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const openRoomsMap = (roomStatus?: Room['status']) => {
    try {
      sessionStorage.setItem(
        KANBAN_NAVIGATION_KEY,
        JSON.stringify({ view: 'rooms', ...(roomStatus ? { roomStatus } : {}) })
      );
    } catch {
      // Navigation still works even if transient browser storage is unavailable.
    }
    onNavigate('kanbans');
  };

  const openReservations = () => onNavigate('checkinout');

  const today = toDateKey(new Date());
  const activeReservations = useMemo(
    () => reservations.filter(r => r.status !== 'Cancelada' && r.status !== 'CheckOut'),
    [reservations]
  );

  const metrics = useMemo(() => {
    const arrivals = activeReservations.filter(r => r.checkInDate === today && r.status !== 'CheckIn');
    const departures = activeReservations.filter(r => r.checkOutDate === today && r.status === 'CheckIn');
    return {
      occupied: rooms.filter(r => r.status === 'Ocupado').length,
      available: rooms.filter(r => r.status === 'Disponivel').length,
      cleaning: rooms.filter(r => r.status === 'Limpeza').length,
      unavailable: rooms.filter(r => r.status === 'Manutencao' || r.status === 'Bloqueado').length,
      pending: reservations.filter(r => r.status === 'Pendente').length,
      arrivals,
      departures,
      openTasks: tasks.filter(t => t.status !== 'Concluido').length
    };
  }, [rooms, reservations, activeReservations, tasks, today]);

  const roomReservation = (room: Room) =>
    activeReservations.find(r => r.roomId === room.id || r.roomNumber === room.number) || null;

  const openRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedReservation(roomReservation(room));
  };

  const closeDrawer = () => {
    setSelectedRoom(null);
    setSelectedReservation(null);
  };

  const indicatorCards = [
    { label: 'Ocupados', value: metrics.occupied, Icon: BedDouble, onClick: () => openRoomsMap('Ocupado') },
    { label: 'Disponíveis', value: metrics.available, Icon: Hotel, onClick: () => openRoomsMap('Disponivel') },
    { label: 'Chegadas hoje', value: metrics.arrivals.length, Icon: Users, onClick: openReservations },
    { label: 'Saídas hoje', value: metrics.departures.length, Icon: KeyRound, onClick: openReservations },
    { label: 'Reservas pendentes', value: metrics.pending, Icon: Clock3, onClick: openReservations },
    { label: 'Em limpeza', value: metrics.cleaning, Icon: Sparkles, onClick: () => openRoomsMap('Limpeza') },
    { label: 'Indisponíveis', value: metrics.unavailable, Icon: Wrench, onClick: () => openRoomsMap() }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#2C3327]">Meu Painel</h2>
            <p className="mt-1 text-xs text-[#7B806E]">Visão operacional do hotel em tempo real.</p>
          </div>
          <button
            type="button"
            onClick={() => openRoomsMap()}
            className="flex items-center gap-4 rounded-xl bg-[#F7F8F2] px-4 py-3 text-left transition hover:bg-[#EEF2E7]"
            title="Abrir Mapa de Quartos"
          >
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#8A8F7D]">Ocupação agora</span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <strong className="text-2xl font-black text-[#2C3327]">
                  {rooms.length ? Math.round((metrics.occupied / rooms.length) * 100) : 0}%
                </strong>
                <span className="text-xs text-[#6B705C]">{metrics.occupied} de {rooms.length}</span>
              </div>
            </div>
            <BedDouble className="w-6 h-6 text-[#588157]" />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
        {indicatorCards.map(({ label, value, Icon, onClick }) => (
          <button
            type="button"
            key={label}
            onClick={onClick}
            className="rounded-2xl border border-[#E6E3D8] bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#AFC49B] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#588157]/30"
            title={`Abrir ${label.toLowerCase()}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-[#7B806E]">{label}</span>
                <strong className="block mt-2 text-2xl font-black text-[#2C3327]">{value}</strong>
              </div>
              <div className="rounded-xl bg-[#F2F5E8] p-2 text-[#588157]"><Icon className="w-4 h-4" /></div>
            </div>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xl font-black text-[#2C3327]">Mapa de Quartos</h3>
            <p className="mt-1 text-xs text-[#7B806E]">Situação operacional atual de cada acomodação.</p>
          </div>
          <button onClick={() => openRoomsMap()} className="text-xs font-bold text-[#588157] hover:text-[#3A5A40] flex items-center gap-1">
            Abrir Mapa de Quartos <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rooms.map(room => {
            const reservation = roomReservation(room);
            return (
              <button key={room.id} onClick={() => openRoom(room)} className="group text-left rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] p-4 hover:border-[#AFC49B] hover:shadow-md hover:-translate-y-0.5 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8F7D] font-bold">Quarto</span>
                    <strong className="block text-2xl font-black text-[#2C3327]">{room.number}</strong>
                    <span className="text-xs text-[#6B705C]">{room.typeName} · {room.floor}º andar</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${statusTone[room.status]}`}>{room.status}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-[#ECE8DF] min-h-[58px]">
                  {reservation ? (
                    <>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-[#2C3327]"><UserRound className="w-3.5 h-3.5 text-[#588157]" /> {reservation.guestName}</div>
                      <div className="mt-1 text-[11px] text-[#8A8F7D]">{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)} · {reservation.paymentStatus}</div>
                    </>
                  ) : (
                    <div className="text-xs text-[#8A8F7D]">Sem reserva ativa vinculada.</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E6E3D8] bg-[#2C3327] p-5 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h3 className="text-lg font-extrabold">Ações rápidas</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={openReservations} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Reservas</button>
            <button onClick={() => onNavigate('guests')} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Hóspedes</button>
            <button onClick={() => openRoomsMap()} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Mapa de Quartos</button>
            <button onClick={() => onNavigate('kanbans')} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Kanbans · {metrics.openTasks}</button>
          </div>
        </div>
      </section>

      {(selectedRoom || selectedReservation) && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex justify-end" onClick={closeDrawer}>
          <aside className="h-full w-full max-w-lg bg-[#FDFBF7] shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-[#FDFBF7]/95 backdrop-blur border-b border-[#E6E3D8] p-5 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#588157]">Detalhes relacionados</span>
                <h3 className="mt-1 text-2xl font-black text-[#2C3327]">{selectedRoom ? `Quarto ${selectedRoom.number}` : selectedReservation?.code}</h3>
              </div>
              <button onClick={closeDrawer} className="p-2 rounded-xl hover:bg-[#F4F1EA]"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5">
              {selectedRoom && (
                <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-black text-[#2C3327] flex items-center gap-2"><BedDouble className="w-4 h-4 text-[#588157]" /> Quarto</h4>
                    <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${statusTone[selectedRoom.status]}`}>{selectedRoom.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div><span className="text-[#8A8F7D] block">Categoria</span><strong>{selectedRoom.typeName}</strong></div>
                    <div><span className="text-[#8A8F7D] block">Andar</span><strong>{selectedRoom.floor}º</strong></div>
                    <div><span className="text-[#8A8F7D] block">Capacidade</span><strong>{selectedRoom.capacity} hóspedes</strong></div>
                    <div><span className="text-[#8A8F7D] block">Diária</span><strong>{money(selectedRoom.pricePerNight, settings?.currency || 'R$')}</strong></div>
                  </div>
                  {selectedRoom.notes && <p className="mt-4 text-xs text-[#6B705C] bg-[#F8F6F0] rounded-xl p-3">{selectedRoom.notes}</p>}
                </section>
              )}

              {selectedReservation && (
                <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-black text-[#2C3327] flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#588157]" /> Reserva {selectedReservation.code}</h4>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${reservationTone[selectedReservation.status]}`}>{selectedReservation.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#8A8F7D]">Hóspede</span>
                    <strong className="block mt-1 text-lg text-[#2C3327]">{selectedReservation.guestName}</strong>
                    <div className="mt-2 space-y-1 text-xs text-[#6B705C]">
                      <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {selectedReservation.guestEmail || 'E-mail não informado'}</div>
                      <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {selectedReservation.guestPhone || 'Telefone não informado'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-[#8A8F7D] block">Entrada</span><strong>{formatDate(selectedReservation.checkInDate)}</strong></div>
                    <div><span className="text-[#8A8F7D] block">Saída</span><strong>{formatDate(selectedReservation.checkOutDate)}</strong></div>
                    <div><span className="text-[#8A8F7D] block">Noites</span><strong>{selectedReservation.nights}</strong></div>
                    <div><span className="text-[#8A8F7D] block">Pagamento</span><strong>{selectedReservation.paymentStatus}</strong></div>
                    <div><span className="text-[#8A8F7D] block">Quarto</span><strong>{selectedReservation.roomNumber}</strong></div>
                    <div><span className="text-[#8A8F7D] block">Total hospedagem</span><strong>{money(selectedReservation.totalNightsAmount, settings?.currency || 'R$')}</strong></div>
                  </div>
                  {selectedReservation.notes && <p className="text-xs text-[#6B705C] bg-[#F8F6F0] rounded-xl p-3">{selectedReservation.notes}</p>}
                </section>
              )}

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button onClick={() => { closeDrawer(); onNavigate('guests'); }} className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-3 text-xs font-bold text-[#2C3327]">Abrir Hóspedes</button>
                <button onClick={() => { closeDrawer(); openReservations(); }} className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-3 text-xs font-bold text-[#2C3327]">Abrir Reservas</button>
                <button onClick={() => { closeDrawer(); openRoomsMap(); }} className="rounded-xl bg-[#2C3327] px-3 py-3 text-xs font-bold text-white">Mapa de Quartos</button>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
