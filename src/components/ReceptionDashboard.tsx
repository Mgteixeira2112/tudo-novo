import React, { useMemo } from 'react';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  KeyRound,
  Sparkles,
  UserRoundCheck,
  Users,
  Wrench
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { AdminTab, Reservation } from '../types.ts';

const dateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shortDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}`;
};

const statusLabel: Record<Reservation['status'], string> = {
  Pendente: 'Pendente',
  Confirmada: 'Confirmada',
  CheckIn: 'Hospedado',
  CheckOut: 'Finalizada',
  Cancelada: 'Cancelada'
};

export const ReceptionDashboard: React.FC = () => {
  const {
    settings,
    rooms,
    reservations,
    tasks,
    currentUser,
    setActiveAdminTab
  } = useHotel();

  const today = dateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);

  const operational = useMemo(() => {
    const arrivalsToday = reservations.filter(
      reservation =>
        reservation.checkInDate === today &&
        reservation.status !== 'Cancelada' &&
        reservation.status !== 'CheckOut'
    );
    const departuresToday = reservations.filter(
      reservation =>
        reservation.checkOutDate === today &&
        reservation.status === 'CheckIn'
    );
    const arrivalsTomorrow = reservations.filter(
      reservation =>
        reservation.checkInDate === tomorrow &&
        reservation.status !== 'Cancelada' &&
        reservation.status !== 'CheckOut'
    );
    const occupied = rooms.filter(room => room.status === 'Ocupado');
    const cleaning = rooms.filter(room => room.status === 'Limpeza');
    const maintenance = rooms.filter(
      room => room.status === 'Manutencao' || room.status === 'Bloqueado'
    );
    const pendingReceptionTasks = tasks.filter(
      task => task.sector === 'Recepcao' && task.status !== 'Concluido'
    );

    return {
      arrivalsToday,
      departuresToday,
      arrivalsTomorrow,
      occupied,
      cleaning,
      maintenance,
      pendingReceptionTasks
    };
  }, [reservations, rooms, tasks, today, tomorrow]);

  const occupancyRate = rooms.length
    ? Math.round((operational.occupied.length / rooms.length) * 100)
    : 0;

  const needsAttention = [
    ...operational.arrivalsToday
      .filter(item => item.status === 'Pendente')
      .map(item => ({
        id: `arrival-${item.id}`,
        title: `Confirmar chegada de ${item.guestName}`,
        detail: `Quarto ${item.roomNumber} · reserva ${item.code}`,
        tone: 'amber' as const,
        action: 'checkinout' as AdminTab
      })),
    ...operational.cleaning.map(room => ({
      id: `cleaning-${room.id}`,
      title: `Quarto ${room.number} aguardando liberação`,
      detail: 'Acompanhar Governança antes de nova ocupação',
      tone: 'green' as const,
      action: 'rooms_inventory' as AdminTab
    })),
    ...operational.maintenance.map(room => ({
      id: `maintenance-${room.id}`,
      title: `Quarto ${room.number} indisponível`,
      detail: room.status === 'Bloqueado' ? 'Quarto bloqueado' : 'Em manutenção',
      tone: 'stone' as const,
      action: 'rooms_inventory' as AdminTab
    })),
    ...operational.pendingReceptionTasks.slice(0, 3).map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: task.roomNumber ? `Quarto ${task.roomNumber}` : 'Tarefa da Recepção',
      tone: task.priority === 'Urgente' || task.priority === 'Alta' ? ('amber' as const) : ('green' as const),
      action: 'kanbans' as AdminTab
    }))
  ].slice(0, 6);

  const nextMoves = [
    ...operational.arrivalsToday.map(item => ({ ...item, movement: 'Chegada hoje' })),
    ...operational.departuresToday.map(item => ({ ...item, movement: 'Saída hoje' })),
    ...operational.arrivalsTomorrow.map(item => ({ ...item, movement: 'Chegada amanhã' }))
  ].slice(0, 6);

  const navigate = (tab: AdminTab) => setActiveAdminTab(tab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#DADFD1] bg-gradient-to-br from-[#F8FAF2] via-white to-[#EFF4E8] p-6 sm:p-8 shadow-sm">
        <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-[#DDE8CF]/60 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#CCD5AE] bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#588157] mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Meu Painel · Recepção
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2C3327]">
              {currentUser?.fullName ? `Olá, ${currentUser.fullName.split(' ')[0]}.` : 'Visão do turno.'}
              <span className="font-medium text-[#6B705C]"> O hotel em uma única leitura.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6B705C] max-w-2xl">
              Prioridades, movimentação de hóspedes e situação dos quartos para você decidir o próximo passo sem procurar informação em várias telas.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-[#8A8F7D]">Ocupação agora</span>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-3xl font-black text-[#2C3327]">{occupancyRate}%</strong>
                <span className="pb-1 text-xs font-semibold text-[#6B705C]">
                  {operational.occupied.length}/{rooms.length} quartos
                </span>
              </div>
            </div>
            <div className="h-11 w-px bg-[#E6E3D8]" />
            <BedDouble className="w-7 h-7 text-[#588157]" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Chegadas hoje',
            value: operational.arrivalsToday.length,
            helper: `${operational.arrivalsTomorrow.length} previstas amanhã`,
            icon: UserRoundCheck,
            action: 'checkinout' as AdminTab
          },
          {
            label: 'Saídas hoje',
            value: operational.departuresToday.length,
            helper: `${settings?.checkOutTime || '11:00'} horário padrão`,
            icon: KeyRound,
            action: 'checkinout' as AdminTab
          },
          {
            label: 'Em limpeza',
            value: operational.cleaning.length,
            helper: 'Aguardando Governança',
            icon: ClipboardCheck,
            action: 'rooms_inventory' as AdminTab
          },
          {
            label: 'Indisponíveis',
            value: operational.maintenance.length,
            helper: 'Manutenção ou bloqueio',
            icon: Wrench,
            action: 'rooms_inventory' as AdminTab
          }
        ].map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => navigate(card.action)}
              className="group text-left rounded-2xl border border-[#E6E3D8] bg-white p-4 sm:p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-[#CCD5AE] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-[10px] sm:text-xs uppercase tracking-wider font-bold text-[#7B806E]">{card.label}</span>
                  <strong className="block mt-2 text-2xl sm:text-3xl font-black text-[#2C3327]">{card.value}</strong>
                </div>
                <div className="rounded-xl bg-[#F2F5E8] p-2.5 text-[#588157] group-hover:bg-[#E9EDC9] transition">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <span className="block mt-3 text-[11px] text-[#8A8F7D]">{card.helper}</span>
            </button>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#EEEAE1]">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-[#BC6C25]" />
                <h3 className="font-extrabold text-[#2C3327]">Prioridades do turno</h3>
              </div>
              <p className="mt-1 text-xs text-[#8A8F7D]">Itens que merecem atenção antes da rotina normal.</p>
            </div>
            <span className="rounded-full bg-[#F4F1EA] px-2.5 py-1 text-[10px] font-bold text-[#6B705C]">
              {needsAttention.length} agora
            </span>
          </div>

          <div className="mt-3 divide-y divide-[#F0EDE5]">
            {needsAttention.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#588157] mx-auto" />
                <p className="mt-3 text-sm font-bold text-[#2C3327]">Turno sem pendências críticas</p>
                <p className="mt-1 text-xs text-[#8A8F7D]">A operação está fluindo normalmente neste momento.</p>
              </div>
            ) : (
              needsAttention.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.action)}
                  className="w-full flex items-center gap-3 py-3.5 text-left group"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.tone === 'amber' ? 'bg-[#D4A373]' : item.tone === 'stone' ? 'bg-[#6B705C]' : 'bg-[#588157]'}`} />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-[#2C3327] truncate">{item.title}</strong>
                    <span className="block mt-0.5 text-[11px] text-[#8A8F7D] truncate">{item.detail}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#B4B8AA] group-hover:text-[#588157] group-hover:translate-x-0.5 transition" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-[#EEEAE1]">
            <CalendarDays className="w-4 h-4 text-[#588157]" />
            <div>
              <h3 className="font-extrabold text-[#2C3327]">Próximos movimentos</h3>
              <p className="mt-1 text-xs text-[#8A8F7D]">Hoje e amanhã na Recepção.</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {nextMoves.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8A8F7D]">Nenhuma chegada ou saída próxima.</div>
            ) : (
              nextMoves.map(item => (
                <button
                  key={`${item.movement}-${item.id}`}
                  onClick={() => navigate('checkinout')}
                  className="w-full rounded-2xl border border-transparent hover:border-[#E6E3D8] hover:bg-[#FDFBF7] p-3 text-left transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#588157]">{item.movement}</span>
                      <strong className="block mt-1 text-sm text-[#2C3327] truncate">{item.guestName}</strong>
                      <span className="block mt-0.5 text-[11px] text-[#8A8F7D]">Quarto {item.roomNumber} · {statusLabel[item.status]}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#6B705C] whitespace-nowrap">
                      {item.movement === 'Saída hoje' ? shortDate(item.checkOutDate) : shortDate(item.checkInDate)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E6E3D8] bg-[#2C3327] p-5 sm:p-6 text-[#FDFBF7] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#CCD5AE]">Ações rápidas</span>
            <h3 className="mt-1 text-lg font-extrabold">O próximo passo a um clique.</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
            {[
              { label: 'Reservas', icon: CalendarDays, tab: 'checkinout' as AdminTab },
              { label: 'Check-in / out', icon: KeyRound, tab: 'checkinout' as AdminTab },
              { label: 'Hóspedes', icon: Users, tab: 'guests' as AdminTab },
              { label: 'Quartos', icon: BedDouble, tab: 'rooms_inventory' as AdminTab }
            ].map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.tab)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-xs font-bold hover:bg-white/15 hover:border-white/20 transition"
                >
                  <Icon className="w-4 h-4 text-[#CCD5AE]" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
