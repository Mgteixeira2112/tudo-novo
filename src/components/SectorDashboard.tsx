import React, { useEffect, useMemo, useState } from 'react';
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
  Users,
  Wrench
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { api } from '../services/api.ts';
import { AdminTab, KitchenOrder, UserSector } from '../types.ts';
import { HomeDashboard } from './HomeDashboard.tsx';

interface SectorDashboardProps {
  onNavigate: (tab: AdminTab) => void;
}

interface MetricCard {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActionCard {
  label: string;
  tab: AdminTab;
  detail: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);
const money = (value: number, currency = 'R$') => `${currency} ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const SECTOR_COPY: Record<UserSector, { title: string; subtitle: string }> = {
  Geral: {
    title: 'Operação Geral',
    subtitle: 'Visão consolidada do hotel, reservas, quartos, tarefas e indicadores.'
  },
  Recepcao: {
    title: 'Painel da Recepção',
    subtitle: 'Chegadas, saídas, ocupação, hóspedes e prioridades do front desk.'
  },
  Governanca: {
    title: 'Painel da Governança',
    subtitle: 'Quartos em limpeza, liberações, pendências e tarefas de andares.'
  },
  Cozinha: {
    title: 'Painel da Cozinha',
    subtitle: 'Pedidos recebidos, em preparo, prontos e tarefas de alimentos & bebidas.'
  },
  RoomService: {
    title: 'Painel do Room Service',
    subtitle: 'Pedidos para quartos, entregas pendentes e acompanhamento do atendimento.'
  },
  Manutencao: {
    title: 'Painel da Manutenção',
    subtitle: 'Chamados, urgências, quartos bloqueados e intervenções em andamento.'
  },
  Financeiro: {
    title: 'Painel Financeiro',
    subtitle: 'Receita, pendências, despesas e resultado operacional.'
  }
};

export const SectorDashboard: React.FC<SectorDashboardProps> = ({ onNavigate }) => {
  const {
    currentUser,
    rooms,
    reservations,
    tasks,
    transactions,
    stats,
    settings,
    canAccessTab
  } = useHotel();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);

  useEffect(() => {
    if (!currentUser || !['Cozinha', 'RoomService'].includes(currentUser.sector)) {
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
  if (currentUser.sector === 'Geral') {
    return <HomeDashboard onNavigate={onNavigate} />;
  }

  const today = todayKey();
  const sector = currentUser.sector;
  const currency = settings?.currency || 'R$';

  const activeReservations = useMemo(
    () => reservations.filter(r => r.status !== 'Cancelada' && r.status !== 'CheckOut'),
    [reservations]
  );

  const arrivals = useMemo(
    () => activeReservations.filter(r => r.checkInDate === today && r.status !== 'CheckIn'),
    [activeReservations, today]
  );
  const departures = useMemo(
    () => activeReservations.filter(r => r.checkOutDate === today && r.status === 'CheckIn'),
    [activeReservations, today]
  );

  const sectorTasks = useMemo(
    () => tasks.filter(task => task.sector === sector && task.status !== 'Concluido'),
    [tasks, sector]
  );
  const urgentTasks = sectorTasks.filter(task => task.priority === 'Urgente' || task.priority === 'Alta');

  const roomServiceOrders = orders.filter(order => order.destination === 'Quarto' || order.deliverySector === 'Room Service');
  const kitchenOrders = orders.filter(order => order.deliverySector === 'Cozinha');

  let metrics: MetricCard[] = [];
  let actions: ActionCard[] = [];
  let highlights: Array<{ title: string; detail: string; badge?: string }> = [];

  if (sector === 'Recepcao') {
    metrics = [
      { label: 'Chegadas hoje', value: arrivals.length, detail: 'Reservas previstas para entrada', icon: CalendarDays },
      { label: 'Saídas hoje', value: departures.length, detail: 'Hóspedes com checkout previsto', icon: KeyRound },
      { label: 'Ocupados', value: rooms.filter(r => r.status === 'Ocupado').length, detail: `${rooms.length} quartos cadastrados`, icon: BedDouble },
      { label: 'Disponíveis', value: rooms.filter(r => r.status === 'Disponivel').length, detail: 'Prontos para hospedagem', icon: CheckCircle2 }
    ];
    actions = [
      { label: 'Reservas / Check-in', tab: 'checkinout', detail: 'Abrir operação de entradas e saídas' },
      { label: 'Cadastro de Hóspedes', tab: 'guests', detail: 'Consultar e atualizar hóspedes' },
      { label: 'Mapa de Quartos', tab: 'rooms_inventory', detail: 'Ver ocupação e disponibilidade' },
      { label: 'Kanbans', tab: 'kanbans', detail: 'Acompanhar demandas operacionais' }
    ];
    highlights = [...arrivals.slice(0, 4).map(r => ({ title: `${r.guestName} · Quarto ${r.roomNumber}`, detail: `Chegada hoje · ${r.code}`, badge: 'Chegada' })), ...departures.slice(0, 4).map(r => ({ title: `${r.guestName} · Quarto ${r.roomNumber}`, detail: `Saída hoje · ${r.code}`, badge: 'Saída' }))].slice(0, 6);
  } else if (sector === 'Governanca') {
    const cleaningRooms = rooms.filter(r => r.status === 'Limpeza');
    const unavailableRooms = rooms.filter(r => r.status === 'Manutencao' || r.status === 'Bloqueado');
    metrics = [
      { label: 'Em limpeza', value: cleaningRooms.length, detail: 'Quartos aguardando liberação', icon: Sparkles },
      { label: 'Tarefas abertas', value: sectorTasks.length, detail: 'Pendências da governança', icon: ClipboardList },
      { label: 'Prioridade alta', value: urgentTasks.length, detail: 'Exigem atenção imediata', icon: Clock3 },
      { label: 'Indisponíveis', value: unavailableRooms.length, detail: 'Manutenção ou bloqueio', icon: Wrench }
    ];
    actions = [
      { label: 'Quartos & Inventário', tab: 'rooms_inventory', detail: 'Atualizar status e consultar enxoval' },
      { label: 'Kanban da Governança', tab: 'kanbans', detail: 'Executar tarefas do setor' },
      { label: 'Frigobar & A&B', tab: 'fnb', detail: 'Registrar consumo quando permitido' }
    ];
    highlights = [...cleaningRooms.slice(0, 4).map(r => ({ title: `Quarto ${r.number}`, detail: `${r.typeName} · aguardando limpeza/liberação`, badge: 'Limpeza' })), ...sectorTasks.slice(0, 4).map(t => ({ title: t.title, detail: t.roomNumber ? `Quarto ${t.roomNumber}` : t.description, badge: t.priority }))].slice(0, 6);
  } else if (sector === 'Cozinha') {
    const active = kitchenOrders.filter(o => !['Entregue', 'Cancelado'].includes(o.status));
    metrics = [
      { label: 'Recebidos', value: kitchenOrders.filter(o => o.status === 'Recebido').length, detail: 'Aguardando início', icon: Receipt },
      { label: 'Em preparo', value: kitchenOrders.filter(o => o.status === 'Em Preparo').length, detail: 'Produção em andamento', icon: ChefHat },
      { label: 'Prontos', value: kitchenOrders.filter(o => o.status === 'Pronto').length, detail: 'Aguardando retirada/entrega', icon: PackageCheck },
      { label: 'Tarefas abertas', value: sectorTasks.length, detail: 'Pendências da cozinha', icon: ClipboardList }
    ];
    actions = [
      { label: 'Pedidos & Cardápio', tab: 'fnb', detail: 'Abrir operação de alimentos & bebidas' },
      { label: 'Kanban da Cozinha', tab: 'kanbans', detail: 'Ver tarefas e prioridades' },
      { label: 'Estoque', tab: 'rooms_inventory', detail: 'Consultar insumos quando permitido' }
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
      { label: 'Room Service', tab: 'fnb', detail: 'Abrir pedidos e entregas' },
      { label: 'Kanban', tab: 'kanbans', detail: 'Acompanhar demandas do setor' },
      { label: 'Quartos', tab: 'rooms_inventory', detail: 'Consultar destino dos pedidos' }
    ];
    highlights = active.slice(0, 6).map(o => ({ title: `${o.orderNumber} · Quarto ${o.roomNumber}`, detail: `${o.guestName} · ${o.items.length} item(ns)`, badge: o.status }));
  } else if (sector === 'Manutencao') {
    const maintenanceRooms = rooms.filter(r => r.status === 'Manutencao' || r.status === 'Bloqueado');
    metrics = [
      { label: 'Chamados abertos', value: sectorTasks.length, detail: 'Tarefas não concluídas', icon: Hammer },
      { label: 'Urgentes/altos', value: urgentTasks.length, detail: 'Atendimento prioritário', icon: Clock3 },
      { label: 'Em andamento', value: sectorTasks.filter(t => t.status === 'Em_Andamento').length, detail: 'Intervenções sendo executadas', icon: Wrench },
      { label: 'Quartos afetados', value: maintenanceRooms.length, detail: 'Bloqueados ou em manutenção', icon: BedDouble }
    ];
    actions = [
      { label: 'Kanban da Manutenção', tab: 'kanbans', detail: 'Executar e atualizar chamados' },
      { label: 'Quartos & Inventário', tab: 'rooms_inventory', detail: 'Consultar bloqueios e peças' }
    ];
    highlights = [...urgentTasks.slice(0, 4).map(t => ({ title: t.title, detail: t.roomNumber ? `Quarto ${t.roomNumber}` : t.description, badge: t.priority })), ...maintenanceRooms.slice(0, 4).map(r => ({ title: `Quarto ${r.number}`, detail: r.notes || `${r.typeName} · ${r.status}`, badge: r.status }))].slice(0, 6);
  } else if (sector === 'Financeiro') {
    const pendingTransactions = transactions.filter(t => t.status === 'Pendente');
    metrics = [
      { label: 'Receita hoje', value: money(stats?.totalRevenueToday || 0, currency), detail: 'Receitas reconhecidas hoje', icon: CircleDollarSign },
      { label: 'Receita no mês', value: money(stats?.totalRevenueMonth || 0, currency), detail: 'Faturamento acumulado', icon: Receipt },
      { label: 'Pendências', value: money(stats?.totalPendingFolios || 0, currency), detail: `${pendingTransactions.length} lançamento(s) pendente(s)`, icon: Clock3 },
      { label: 'Resultado do mês', value: money(stats?.netIncomeMonth || 0, currency), detail: `Despesas: ${money(stats?.totalExpensesMonth || 0, currency)}`, icon: CircleDollarSign }
    ];
    actions = [
      { label: 'Visão Geral & Faturamento', tab: 'overview', detail: 'Abrir indicadores e transações' },
      { label: 'Check-in / Check-out', tab: 'checkinout', detail: 'Consultar fechamentos de hospedagem' },
      { label: 'Hóspedes', tab: 'guests', detail: 'Consultar responsáveis pelos débitos' }
    ];
    highlights = pendingTransactions.slice(0, 6).map(t => ({ title: t.description, detail: `${money(t.amount, currency)}${t.roomNumber ? ` · Quarto ${t.roomNumber}` : ''}`, badge: 'Pendente' }));
  }

  const allowedActions = actions.filter(action => canAccessTab(action.tab));
  const copy = SECTOR_COPY[sector];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <section className="rounded-3xl border border-[#DADFD1] bg-gradient-to-br from-[#F8FAF2] via-white to-[#EFF4E8] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <span className="inline-flex rounded-full border border-[#CCD5AE] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#588157]">
              Meu Painel · {sector}
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-black text-[#2C3327]">{copy.title}</h2>
            <p className="mt-2 text-sm text-[#6B705C] max-w-2xl">{copy.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-[#E6E3D8] bg-white/90 px-5 py-4 min-w-[220px]">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8A8F7D]">Usuário</span>
            <strong className="block mt-1 text-sm text-[#2C3327]">{currentUser.fullName}</strong>
            <span className="text-xs text-[#6B705C]">Setor {sector}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#7B806E]">{label}</span>
                <strong className="block mt-2 text-2xl font-black text-[#2C3327]">{value}</strong>
                {detail && <span className="block mt-1 text-[11px] text-[#8A8F7D]">{detail}</span>}
              </div>
              <div className="rounded-xl bg-[#F2F5E8] p-2.5 text-[#588157]"><Icon className="w-5 h-5" /></div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-4">
        <div className="rounded-3xl border border-[#E6E3D8] bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#588157]">Agora</span>
              <h3 className="mt-1 text-lg font-black text-[#2C3327]">Prioridades do setor</h3>
            </div>
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
            <div className="rounded-2xl border border-dashed border-[#DADFD1] bg-[#FAFBF7] p-8 text-center text-sm text-[#7B806E]">
              Nenhuma prioridade pendente para este setor neste momento.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[#E6E3D8] bg-[#2C3327] p-5 sm:p-6 text-white shadow-sm">
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#CCD5AE]">Acesso rápido</span>
          <h3 className="mt-1 text-lg font-black">Módulos do seu trabalho</h3>
          <div className="mt-4 space-y-2">
            {allowedActions.map(action => (
              <button
                key={action.tab}
                onClick={() => onNavigate(action.tab)}
                className="w-full text-left rounded-2xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition"
              >
                <strong className="block text-sm">{action.label}</strong>
                <span className="block mt-1 text-[11px] text-white/65">{action.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
