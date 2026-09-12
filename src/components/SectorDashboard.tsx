import React, { useEffect, useState } from 'react';
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Hammer,
  KeyRound,
  PackageCheck,
  Receipt,
  Sparkles,
  Truck,
  Wrench
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { api } from '../services/api.ts';
import { AdminTab, KitchenOrder, SectorType, UserSector } from '../types.ts';
import { HomeDashboard } from './HomeDashboard.tsx';

interface SectorDashboardProps {
  onNavigate: (tab: AdminTab) => void;
}

interface KanbanIntent {
  view: 'rooms' | 'tasks';
  roomStatus?: 'Disponivel' | 'Ocupado' | 'Limpeza' | 'Manutencao' | 'Bloqueado';
  taskSector?: SectorType;
}

interface ReservationIntent {
  filter: 'ARRIVALS_TODAY' | 'DEPARTURES_TODAY' | 'PENDING';
}

interface ActionCard {
  label: string;
  tab: AdminTab;
  detail: string;
  kanbanIntent?: KanbanIntent;
  reservationIntent?: ReservationIntent;
}

interface MetricCard {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: ActionCard;
}

interface Highlight {
  title: string;
  detail: string;
  badge?: string;
}

const KANBAN_NAVIGATION_KEY = 'novohotel:kanban-navigation';
const RESERVATION_NAVIGATION_KEY = 'novohotel:reservation-navigation';

const SECTOR_COPY: Record<UserSector, { title: string; subtitle: string }> = {
  Geral: { title: 'Operação Geral', subtitle: 'Visão consolidada do hotel, reservas, quartos, tarefas e indicadores.' },
  Recepcao: { title: 'Painel da Recepção', subtitle: 'Chegadas, saídas, ocupação, hóspedes e prioridades do front desk.' },
  Governanca: { title: 'Painel da Governança', subtitle: 'Quartos em limpeza, liberações, pendências e tarefas de andares.' },
  Cozinha: { title: 'Painel da Cozinha', subtitle: 'Pedidos recebidos, em preparo, prontos e tarefas de alimentos & bebidas.' },
  RoomService: { title: 'Painel do Room Service', subtitle: 'Pedidos para quartos, entregas pendentes e acompanhamento do atendimento.' },
  Manutencao: { title: 'Painel da Manutenção', subtitle: 'Chamados, urgências, quartos bloqueados e intervenções em andamento.' },
  Financeiro: { title: 'Painel Financeiro', subtitle: 'Receita, pendências, despesas e resultado operacional.' }
};

const todayKey = () => {
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

const money = (value: number, currency = 'R$') =>
  `${currency} ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export const SectorDashboard: React.FC<SectorDashboardProps> = ({ onNavigate }) => {
  const { currentUser, rooms, reservations, tasks, transactions, stats, settings, canAccessTab } = useHotel();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  useEffect(() => {
    const sector = currentUser?.sector;
    if (!sector || !['Cozinha', 'RoomService'].includes(sector)) {
      setOrders([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const result = await api.getOrders();
        if (!cancelled) setOrders(result);
      } catch {
        if (!cancelled) setOrders([]);
      }
    };

    load();
    const interval = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentUser?.id, currentUser?.sector]);

  if (!currentUser) return null;
  if (currentUser.sector === 'Geral') return <HomeDashboard onNavigate={onNavigate} />;

  const handleActionNavigation = (action: ActionCard) => {
    if (action.tab === 'kanbans' && action.kanbanIntent) {
      try {
        sessionStorage.setItem(KANBAN_NAVIGATION_KEY, JSON.stringify(action.kanbanIntent));
      } catch {
        // Navigation still works even if transient browser storage is unavailable.
      }
    }
    if (action.tab === 'checkinout' && action.reservationIntent) {
      try {
        sessionStorage.setItem(RESERVATION_NAVIGATION_KEY, JSON.stringify(action.reservationIntent));
      } catch {
        // Navigation still works even if transient browser storage is unavailable.
      }
    }
    onNavigate(action.tab);
  };

  const sector = currentUser.sector;
  const today = todayKey();
  const currency = settings?.currency || 'R$';
  const activeReservations = reservations.filter(r => r.status !== 'Cancelada' && r.status !== 'CheckOut');
  const arrivals = activeReservations.filter(r => r.checkInDate === today && r.status !== 'CheckIn');
  const departures = activeReservations.filter(r => r.checkOutDate === today && r.status === 'CheckIn');
  const sectorTasks = tasks.filter(t => t.sector === sector && t.status !== 'Concluido');
  const urgentTasks = sectorTasks.filter(t => t.priority === 'Urgente' || t.priority === 'Alta');
  const roomServiceOrders = orders.filter(o => o.destination === 'Quarto' || o.deliverySector === 'Room Service');
  const kitchenOrders = orders.filter(o => o.deliverySector === 'Cozinha');

  let metrics: MetricCard[] = [];
  let actions: ActionCard[] = [];
  let highlights: Highlight[] = [];

  if (sector === 'Recepcao') {
    const occupiedRooms = rooms.filter(r => r.status === 'Ocupado');
    const availableRooms = rooms.filter(r => r.status === 'Disponivel');
    const cleaningRooms = rooms.filter(r => r.status === 'Limpeza');
    const unavailableRooms = rooms.filter(r => r.status === 'Manutencao' || r.status === 'Bloqueado');
    const pendingReservations = reservations.filter(r => r.status === 'Pendente');
    const occupancyRate = rooms.length ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0;

    metrics = [
      {
        label: 'Chegadas hoje',
        value: arrivals.length,
        detail: 'Reservas previstas para entrada',
        icon: CalendarDays,
        action: { label: 'Chegadas hoje', tab: 'checkinout', detail: 'Abrir chegadas de hoje', reservationIntent: { filter: 'ARRIVALS_TODAY' } }
      },
      {
        label: 'Saídas hoje',
        value: departures.length,
        detail: 'Checkouts previstos',
        icon: KeyRound,
        action: { label: 'Saídas hoje', tab: 'checkinout', detail: 'Abrir saídas de hoje', reservationIntent: { filter: 'DEPARTURES_TODAY' } }
      },
      {
        label: 'Hospedados agora',
        value: occupiedRooms.length,
        detail: `${rooms.length} quartos cadastrados`,
        icon: BedDouble,
        action: { label: 'Hospedados agora', tab: 'kanbans', detail: 'Abrir quartos ocupados', kanbanIntent: { view: 'rooms', roomStatus: 'Ocupado' } }
      },
      {
        label: 'Quartos disponíveis',
        value: availableRooms.length,
        detail: 'Prontos para hospedagem',
        icon: CheckCircle2,
        action: { label: 'Quartos disponíveis', tab: 'kanbans', detail: 'Abrir quartos disponíveis', kanbanIntent: { view: 'rooms', roomStatus: 'Disponivel' } }
      },
      {
        label: 'Reservas pendentes',
        value: pendingReservations.length,
        detail: 'Aguardando confirmação',
        icon: Clock3,
        action: { label: 'Reservas pendentes', tab: 'checkinout', detail: 'Abrir reservas pendentes', reservationIntent: { filter: 'PENDING' } }
      },
      {
        label: 'Ocupação atual',
        value: `${occupancyRate}%`,
        detail: `${occupiedRooms.length} de ${rooms.length} quartos`,
        icon: BedDouble,
        action: { label: 'Ocupação atual', tab: 'kanbans', detail: 'Abrir mapa de quartos', kanbanIntent: { view: 'rooms' } }
      },
      {
        label: 'Em limpeza',
        value: cleaningRooms.length,
        detail: 'Aguardando Governança',
        icon: Sparkles,
        action: { label: 'Em limpeza', tab: 'kanbans', detail: 'Abrir quartos em limpeza', kanbanIntent: { view: 'rooms', roomStatus: 'Limpeza' } }
      },
      {
        label: 'Indisponíveis',
        value: unavailableRooms.length,
        detail: 'Manutenção ou bloqueio',
        icon: Wrench,
        action: { label: 'Indisponíveis', tab: 'kanbans', detail: 'Abrir mapa de quartos', kanbanIntent: { view: 'rooms' } }
      }
    ];
    actions = [
      { label: 'Reservas / Check-in', tab: 'checkinout', detail: 'Entradas, saídas e reservas' },
      { label: 'Cadastro de Hóspedes', tab: 'guests', detail: 'Consultar e atualizar hóspedes' },
      { label: 'Mapa de Quartos', tab: 'kanbans', detail: 'Ocupação e disponibilidade', kanbanIntent: { view: 'rooms' } },
      { label: 'Tarefas da Recepção', tab: 'kanbans', detail: 'Demandas operacionais da recepção', kanbanIntent: { view: 'tasks', taskSector: 'Recepcao' } }
    ];
    highlights = [
      ...arrivals.slice(0, 4).map(r => ({ title: `${r.guestName} · Quarto ${r.roomNumber}`, detail: `${r.code} · chegada hoje`, badge: 'Chegada' })),
      ...departures.slice(0, 4).map(r => ({ title: `${r.guestName} · Quarto ${r.roomNumber}`, detail: `${r.code} · saída hoje`, badge: 'Saída' }))
    ].slice(0, 6);
  } else if (sector === 'Governanca') {
    const cleaningRooms = rooms.filter(r => r.status === 'Limpeza');
    const unavailableRooms = rooms.filter(r => r.status === 'Manutencao' || r.status === 'Bloqueado');
    metrics = [
      { label: 'Em limpeza', value: cleaningRooms.length, detail: 'Aguardando liberação', icon: Sparkles },
      { label: 'Tarefas abertas', value: sectorTasks.length, detail: 'Pendências da governança', icon: ClipboardList },
      { label: 'Prioridade alta', value: urgentTasks.length, detail: 'Exigem atenção imediata', icon: Clock3 },
      { label: 'Indisponíveis', value: unavailableRooms.length, detail: 'Manutenção ou bloqueio', icon: Wrench }
    ];
    actions = [
      { label: 'Quartos em Limpeza', tab: 'kanbans', detail: 'Liberar quartos aguardando higienização', kanbanIntent: { view: 'rooms', roomStatus: 'Limpeza' } },
      { label: 'Tarefas da Governança', tab: 'kanbans', detail: 'Pendências e prioridades do setor', kanbanIntent: { view: 'tasks', taskSector: 'Governanca' } },
      { label: 'Cadastro & Estoque', tab: 'rooms_inventory', detail: 'Cadastro de quartos e itens permitidos' },
      { label: 'Frigobar & A&B', tab: 'fnb', detail: 'Consumos permitidos' }
    ];
    highlights = [
      ...cleaningRooms.slice(0, 4).map(r => ({ title: `Quarto ${r.number}`, detail: `${r.typeName} · aguardando limpeza/liberação`, badge: 'Limpeza' })),
      ...sectorTasks.slice(0, 4).map(t => ({ title: t.title, detail: t.roomNumber ? `Quarto ${t.roomNumber}` : t.description, badge: t.priority }))
    ].slice(0, 6);
  } else if (sector === 'Cozinha') {
    const active = kitchenOrders.filter(o => !['Entregue', 'Cancelado'].includes(o.status));
    metrics = [
      { label: 'Recebidos', value: kitchenOrders.filter(o => o.status === 'Recebido').length, detail: 'Aguardando início', icon: Receipt },
      { label: 'Em preparo', value: kitchenOrders.filter(o => o.status === 'Em Preparo').length, detail: 'Produção em andamento', icon: ChefHat },
      { label: 'Prontos', value: kitchenOrders.filter(o => o.status === 'Pronto').length, detail: 'Aguardando retirada/entrega', icon: PackageCheck },
      { label: 'Tarefas abertas', value: sectorTasks.length, detail: 'Pendências da cozinha', icon: ClipboardList }
    ];
    actions = [
      { label: 'Pedidos & Cardápio', tab: 'fnb', detail: 'Operação de alimentos & bebidas' },
      { label: 'Tarefas da Cozinha', tab: 'kanbans', detail: 'Pendências e prioridades do setor', kanbanIntent: { view: 'tasks', taskSector: 'Cozinha' } },
      { label: 'Estoque', tab: 'rooms_inventory', detail: 'Insumos quando permitido' }
    ];
    highlights = active.slice(0, 6).map(o => ({ title: `${o.orderNumber} · ${o.destination}`, detail: `${o.items.length} item(ns) · ${o.guestName}`, badge: o.status }));
  } else if (sector === 'RoomService') {
    const active = roomServiceOrders.filter(o => !['Entregue', 'Cancelado'].includes(o.status));
    metrics = [
      { label: 'Aguardando', value: roomServiceOrders.filter(o => o.status === 'Recebido').length, detail: 'Pedidos recebidos', icon: Receipt },
      { label: 'Em preparo', value: roomServiceOrders.filter(o => o.status === 'Em Preparo').length, detail: 'Cozinha preparando', icon: ChefHat },
      { label: 'Prontos', value: roomServiceOrders.filter(o => o.status === 'Pronto').length, detail: 'Aguardando entrega', icon: Truck },
      { label: 'Tarefas abertas', value: sectorTasks.length, detail: 'Pendências do setor', icon: ClipboardList }
    ];
    actions = [
      { label: 'Room Service', tab: 'fnb', detail: 'Pedidos e entregas' },
      { label: 'Tarefas do Room Service', tab: 'kanbans', detail: 'Demandas do setor', kanbanIntent: { view: 'tasks', taskSector: 'RoomService' } },
      { label: 'Mapa de Quartos', tab: 'kanbans', detail: 'Consultar destinos e ocupação', kanbanIntent: { view: 'rooms' } }
    ];
    highlights = active.slice(0, 6).map(o => ({ title: `${o.orderNumber} · Quarto ${o.roomNumber}`, detail: `${o.guestName} · ${o.items.length} item(ns)`, badge: o.status }));
  } else if (sector === 'Manutencao') {
    const affectedRooms = rooms.filter(r => r.status === 'Manutencao' || r.status === 'Bloqueado');
    metrics = [
      { label: 'Chamados abertos', value: sectorTasks.length, detail: 'Tarefas não concluídas', icon: Hammer },
      { label: 'Urgentes/altos', value: urgentTasks.length, detail: 'Atendimento prioritário', icon: Clock3 },
      { label: 'Em andamento', value: sectorTasks.filter(t => t.status === 'Em_Andamento').length, detail: 'Intervenções sendo executadas', icon: Wrench },
      { label: 'Quartos afetados', value: affectedRooms.length, detail: 'Bloqueados ou em manutenção', icon: BedDouble }
    ];
    actions = [
      { label: 'Quartos em Manutenção', tab: 'kanbans', detail: 'Quartos que exigem intervenção técnica', kanbanIntent: { view: 'rooms', roomStatus: 'Manutencao' } },
      { label: 'Tarefas da Manutenção', tab: 'kanbans', detail: 'Executar e atualizar chamados', kanbanIntent: { view: 'tasks', taskSector: 'Manutencao' } },
      { label: 'Cadastro & Estoque', tab: 'rooms_inventory', detail: 'Cadastro de quartos e peças permitidas' }
    ];
    highlights = [
      ...urgentTasks.slice(0, 4).map(t => ({ title: t.title, detail: t.roomNumber ? `Quarto ${t.roomNumber}` : t.description, badge: t.priority })),
      ...affectedRooms.slice(0, 4).map(r => ({ title: `Quarto ${r.number}`, detail: r.notes || `${r.typeName} · ${r.status}`, badge: r.status }))
    ].slice(0, 6);
  } else if (sector === 'Financeiro') {
    const pendingTransactions = transactions.filter(t => t.status === 'Pendente');
    metrics = [
      { label: 'Receita hoje', value: money(stats?.totalRevenueToday || 0, currency), detail: 'Receitas reconhecidas hoje', icon: CircleDollarSign },
      { label: 'Receita no mês', value: money(stats?.totalRevenueMonth || 0, currency), detail: 'Faturamento acumulado', icon: Receipt },
      { label: 'Pendências', value: money(stats?.totalPendingFolios || 0, currency), detail: `${pendingTransactions.length} lançamento(s) pendente(s)`, icon: Clock3 },
      { label: 'Resultado do mês', value: money(stats?.netIncomeMonth || 0, currency), detail: `Despesas: ${money(stats?.totalExpensesMonth || 0, currency)}`, icon: CircleDollarSign }
    ];
    actions = [
      { label: 'Visão Geral & Faturamento', tab: 'overview', detail: 'Indicadores e transações' },
      { label: 'Check-in / Check-out', tab: 'checkinout', detail: 'Fechamentos de hospedagem' },
      { label: 'Hóspedes', tab: 'guests', detail: 'Responsáveis pelos débitos' }
    ];
    highlights = pendingTransactions.slice(0, 6).map(t => ({ title: t.description, detail: `${money(t.amount, currency)}${t.roomNumber ? ` · Quarto ${t.roomNumber}` : ''}`, badge: 'Pendente' }));
  }

  const allowedActions = actions.filter(action => canAccessTab(action.tab));
  const copy = SECTOR_COPY[sector];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="rounded-2xl border border-[#DADFD1] bg-white px-5 py-4 sm:px-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-black text-[#2C3327]">{copy.title}</h2>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map(metric => {
          const Icon = metric.icon;
          const cardContent = (
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#7B806E]">{metric.label}</span>
                <strong className="block mt-2 text-2xl font-black text-[#2C3327]">{metric.value}</strong>
                <span className="block mt-1 text-[11px] text-[#8A8F7D]">{metric.detail}</span>
              </div>
              <div className="rounded-xl bg-[#F2F5E8] p-2.5 text-[#588157]"><Icon className="w-5 h-5" /></div>
            </div>
          );

          if (metric.action) {
            return (
              <button
                key={metric.label}
                type="button"
                onClick={() => handleActionNavigation(metric.action!)}
                className="rounded-2xl border border-[#E6E3D8] bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#AFC49B] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#588157]/30"
                title={metric.action.detail}
              >
                {cardContent}
              </button>
            );
          }

          return (
            <div key={metric.label} className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
              {cardContent}
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-4">
        <div className="rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-black text-[#2C3327]">Prioridades do setor</h3>
            <ClipboardList className="w-5 h-5 text-[#588157]" />
          </div>
          {highlights.length ? (
            <div className="space-y-2">
              {highlights.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-2xl border border-[#ECE8DF] bg-[#FDFBF7] px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block text-sm text-[#2C3327] truncate">{item.title}</strong>
                    <span className="block mt-1 text-xs text-[#7B806E] truncate">{item.detail}</span>
                  </div>
                  {item.badge && <span className="shrink-0 rounded-full bg-[#F2F5E8] px-2.5 py-1 text-[10px] font-bold text-[#588157]">{item.badge}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#DADFD1] bg-[#FAFBF7] p-8 text-center text-sm text-[#7B806E]">Nenhuma prioridade pendente para este setor neste momento.</div>
          )}
        </div>

        <div className="rounded-3xl border border-[#E6E3D8] bg-[#2C3327] p-5 sm:p-6 text-white shadow-sm">
          <h3 className="text-lg font-black">Acesso rápido</h3>
          <div className="mt-4 space-y-2">
            {allowedActions.map(action => (
              <button key={`${action.tab}-${action.label}`} onClick={() => handleActionNavigation(action)} className="w-full text-left rounded-2xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition">
                <strong className="block text-sm">{action.label}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};