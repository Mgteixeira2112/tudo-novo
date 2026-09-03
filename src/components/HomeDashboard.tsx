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
  const { rooms, reservations, tasks, settings, currentUser } = useHotel();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());

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
      arrivals,
      departures,
      openTasks: tasks.filter(t => t.status !== 'Concluido').length
    };
  }, [rooms, activeReservations, tasks, today]);

  const roomReservation = (room: Room) =>
    activeReservations.find(r => r.roomId === room.id || r.roomNumber === room.number) || null;

  const openRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedReservation(roomReservation(room));
  };

  const openReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setSelectedRoom(rooms.find(r => r.id === reservation.roomId || r.number === reservation.roomNumber) || null);
  };

  const monthGrid = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [calendarCursor]);

  const reservationsForDay = (date: Date) => {
    const key = toDateKey(date);
    return reservations
      .filter(r => r.status !== 'Cancelada' && key >= r.checkInDate && key < r.checkOutDate)
      .slice(0, 3);
  };

  const closeDrawer = () => {
    setSelectedRoom(null);
    setSelectedReservation(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="rounded-3xl border border-[#DADFD1] bg-gradient-to-br from-[#F8FAF2] via-white to-[#EFF4E8] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#CCD5AE] bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#588157] mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Meu Painel · Operação
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2C3327]">
              {currentUser?.fullName ? `Olá, ${currentUser.fullName.split(' ')[0]}.` : 'Visão do hotel.'}
              <span className="font-medium text-[#6B705C]"> Tudo que importa, sem procurar em várias telas.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B705C] max-w-2xl">
              Esta tela apenas reorganiza os dados que o PMS já possui: quartos, reservas, hóspedes, tarefas e movimentação operacional.
            </p>
          </div>
          <div className="rounded-2xl border border-white bg-white/85 px-5 py-4 shadow-sm min-w-[210px]">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8A8F7D]">Ocupação agora</span>
            <div className="mt-1 flex items-center justify-between gap-4">
              <strong className="text-3xl font-black text-[#2C3327]">
                {rooms.length ? Math.round((metrics.occupied / rooms.length) * 100) : 0}%
              </strong>
              <BedDouble className="w-7 h-7 text-[#588157]" />
            </div>
            <span className="text-xs text-[#6B705C]">{metrics.occupied} de {rooms.length} quartos ocupados</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Ocupados', metrics.occupied, BedDouble],
          ['Disponíveis', metrics.available, Hotel],
          ['Chegadas hoje', metrics.arrivals.length, Users],
          ['Saídas hoje', metrics.departures.length, KeyRound],
          ['Em limpeza', metrics.cleaning, Sparkles],
          ['Indisponíveis', metrics.unavailable, Wrench]
        ].map(([label, value, Icon]: any) => (
          <div key={label} className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-[#7B806E]">{label}</span>
                <strong className="block mt-2 text-2xl font-black text-[#2C3327]">{value}</strong>
              </div>
              <div className="rounded-xl bg-[#F2F5E8] p-2 text-[#588157]"><Icon className="w-4 h-4" /></div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#588157]">Mapa operacional</span>
            <h3 className="mt-1 text-xl font-black text-[#2C3327]">Quartos em cards</h3>
            <p className="mt-1 text-xs text-[#8A8F7D]">Clique em qualquer quarto para abrir todas as informações relacionadas já disponíveis.</p>
          </div>
          <button onClick={() => onNavigate('rooms_inventory')} className="text-xs font-bold text-[#588157] hover:text-[#3A5A40] flex items-center gap-1">
            Abrir gestão completa <ChevronRight className="w-4 h-4" />
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

      <section className="rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#588157]">Reservas</span>
            <h3 className="mt-1 text-xl font-black text-[#2C3327]">Calendário operacional</h3>
            <p className="mt-1 text-xs text-[#8A8F7D]">A reserva aparece em todos os dias da estadia. Clique para abrir hóspede, quarto, valores e status.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))} className="px-3 py-2 rounded-xl border border-[#E6E3D8] text-xs font-bold">Anterior</button>
            <span className="min-w-[135px] text-center text-sm font-black text-[#2C3327] capitalize">{calendarCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))} className="px-3 py-2 rounded-xl border border-[#E6E3D8] text-xs font-bold">Próximo</button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-[10px] font-bold uppercase tracking-wider text-[#8A8F7D] mb-1">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(day => <div key={day} className="px-2 py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-[#E6E3D8] rounded-2xl overflow-hidden">
          {monthGrid.map(date => {
            const sameMonth = date.getMonth() === calendarCursor.getMonth();
            const dayReservations = reservationsForDay(date);
            const isToday = toDateKey(date) === today;
            return (
              <div key={date.toISOString()} className={`min-h-[112px] border-r border-b border-[#E6E3D8] p-2 ${sameMonth ? 'bg-white' : 'bg-[#FAF8F3]'}`}>
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-bold ${isToday ? 'bg-[#2C3327] text-white' : sameMonth ? 'text-[#2C3327]' : 'text-[#B3B0A7]'}`}>{date.getDate()}</div>
                <div className="mt-1 space-y-1">
                  {dayReservations.map(reservation => (
                    <button key={reservation.id} onClick={() => openReservation(reservation)} className={`w-full text-left rounded-lg px-2 py-1.5 text-[10px] font-bold truncate ${reservationTone[reservation.status]}`} title={`${reservation.guestName} · Quarto ${reservation.roomNumber}`}>
                      {reservation.roomNumber} · {reservation.guestName}
                    </button>
                  ))}
                  {reservations.filter(r => r.status !== 'Cancelada' && toDateKey(date) >= r.checkInDate && toDateKey(date) < r.checkOutDate).length > 3 && (
                    <span className="block text-[10px] font-bold text-[#8A8F7D] px-1">+ mais reservas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E6E3D8] bg-[#2C3327] p-5 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#CCD5AE]">Ações rápidas</span>
            <h3 className="mt-1 text-lg font-extrabold">Abra o módulo quando precisar executar.</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onNavigate('checkinout')} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Reservas / Check-in</button>
            <button onClick={() => onNavigate('guests')} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Hóspedes</button>
            <button onClick={() => onNavigate('rooms_inventory')} className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">Quartos</button>
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
                <button onClick={() => { closeDrawer(); onNavigate('checkinout'); }} className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-3 text-xs font-bold text-[#2C3327]">Reserva / Check-in</button>
                <button onClick={() => { closeDrawer(); onNavigate('rooms_inventory'); }} className="rounded-xl bg-[#2C3327] px-3 py-3 text-xs font-bold text-white">Gestão do Quarto</button>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
