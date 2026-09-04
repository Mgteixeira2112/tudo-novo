import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  ClipboardList,
  DoorOpen,
  Filter,
  Search,
  Sparkles,
  Wrench,
  Ban,
  KeyRound
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Room, RoomStatus } from '../types.ts';
import { KanbanBoard } from './KanbanBoard.tsx';

type WorkspaceView = 'rooms' | 'tasks';

const ROOM_COLUMNS: Array<{
  status: RoomStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { status: 'Disponivel', label: 'Disponíveis', description: 'Prontos para hospedagem', icon: DoorOpen },
  { status: 'Ocupado', label: 'Ocupados', description: 'Com hóspede em estadia', icon: KeyRound },
  { status: 'Limpeza', label: 'Limpeza', description: 'Aguardando liberação', icon: Sparkles },
  { status: 'Manutencao', label: 'Manutenção', description: 'Intervenção técnica', icon: Wrench },
  { status: 'Bloqueado', label: 'Bloqueados', description: 'Indisponíveis por bloqueio', icon: Ban }
];

function RoomCard({ room }: { room: Room }) {
  return (
    <article className="rounded-xl border border-[#E6E3D8] bg-white p-4 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-[#588157]" />
            <h4 className="text-base font-black text-[#2C3327]">Quarto {room.number}</h4>
          </div>
          <p className="mt-1 text-xs font-medium text-[#6B705C]">{room.typeName}</p>
        </div>
        <span className="rounded-full border border-[#E6E3D8] bg-[#F8F7F2] px-2 py-1 text-[10px] font-bold text-[#6B705C]">
          {room.floor}º andar
        </span>
      </div>

      {room.currentGuestName && (
        <div className="mt-3 rounded-lg border border-[#E9EDC9] bg-[#F7F9EF] px-3 py-2">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8A8F7D]">Hóspede atual</span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-[#3D4035]">{room.currentGuestName}</span>
        </div>
      )}

      {room.notes && (
        <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-[#6B705C]">{room.notes}</p>
      )}

      <div className="mt-3 border-t border-[#EFECE3] pt-2 text-[10px] font-semibold text-[#8A8F7D]">
        Status vindo diretamente do cadastro de quartos
      </div>
    </article>
  );
}

function RoomsKanbanView() {
  const { rooms } = useHotel();
  const [search, setSearch] = useState('');
  const [floor, setFloor] = useState<string>('ALL');

  const floors = useMemo(
    () => Array.from(new Set(rooms.map(room => Number(room.floor)))).sort((a, b) => a - b),
    [rooms]
  );

  const visibleRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rooms.filter(room => {
      const matchesFloor = floor === 'ALL' || String(room.floor) === floor;
      const matchesSearch = !term ||
        room.number.toLowerCase().includes(term) ||
        room.typeName.toLowerCase().includes(term) ||
        (room.currentGuestName || '').toLowerCase().includes(term);
      return matchesFloor && matchesSearch;
    });
  }, [rooms, search, floor]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#DADFD1] bg-[#F8FAF2] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-[#588157]" />
              <h3 className="text-lg font-black text-[#2C3327]">Kanban de Quartos</h3>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B705C]">
              Visualização operacional de <strong>rooms.status</strong>. Nenhum card adicional é criado: cada card abaixo é o próprio quarto cadastrado no sistema.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E9280]" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar quarto ou hóspede"
                className="w-full rounded-xl border border-[#E6E3D8] bg-white py-2.5 pl-9 pr-3 text-xs text-[#3D4035] outline-none focus:border-[#A3B18A] sm:w-56"
              />
            </label>
            <label className="relative block">
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E9280]" />
              <select
                value={floor}
                onChange={event => setFloor(event.target.value)}
                className="w-full appearance-none rounded-xl border border-[#E6E3D8] bg-white py-2.5 pl-9 pr-7 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A] sm:w-40"
              >
                <option value="ALL">Todos os andares</option>
                {floors.map(item => <option key={item} value={String(item)}>{item}º andar</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {ROOM_COLUMNS.map(column => {
          const ColumnIcon = column.icon;
          const columnRooms = visibleRooms.filter(room => room.status === column.status);
          return (
            <section key={column.status} className="min-w-0 rounded-2xl border border-[#E6E3D8] bg-[#F8F7F2] p-3">
              <header className="mb-3 flex items-start justify-between gap-2 px-1 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <ColumnIcon className="h-4 w-4 text-[#588157]" />
                    <h4 className="text-xs font-black uppercase tracking-wide text-[#2C3327]">{column.label}</h4>
                  </div>
                  <p className="mt-1 text-[10px] text-[#8A8F7D]">{column.description}</p>
                </div>
                <span className="min-w-6 rounded-full bg-white px-2 py-1 text-center text-[10px] font-black text-[#3A5A40] shadow-sm">
                  {columnRooms.length}
                </span>
              </header>

              <div className="space-y-3">
                {columnRooms.map(room => <RoomCard key={room.id} room={room} />)}
                {columnRooms.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#DADFD1] bg-white/60 px-3 py-6 text-center text-[10px] text-[#8E9280]">
                    Nenhum quarto neste status
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#E6E3D8] bg-white px-4 py-3 text-[11px] text-[#6B705C]">
        <strong className="text-[#3D4035]">Fase 1 — somente leitura.</strong> Alterações de status continuam sendo feitas pelos fluxos já existentes. A movimentação segura entre colunas será tratada em uma PR posterior.
      </div>
    </div>
  );
}

export const KanbanWorkspace: React.FC = () => {
  const { rooms, tasks } = useHotel();
  const [view, setView] = useState<WorkspaceView>('rooms');
  const openTasks = tasks.filter(task => task.status !== 'Concluido').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#2C3327]">Central de Kanbans</h2>
          <p className="mt-1 text-xs text-[#6B705C]">Quartos e tarefas agora são visualizações independentes, cada uma com sua própria fonte de verdade.</p>
        </div>

        <div className="inline-flex rounded-xl border border-[#E6E3D8] bg-[#F8F7F2] p-1">
          <button
            onClick={() => setView('rooms')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${view === 'rooms' ? 'bg-[#2C3327] text-white shadow-sm' : 'text-[#6B705C] hover:bg-white'}`}
          >
            <BedDouble className="h-4 w-4" />
            Quartos
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${view === 'rooms' ? 'bg-white/15' : 'bg-white'}`}>{rooms.length}</span>
          </button>
          <button
            onClick={() => setView('tasks')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${view === 'tasks' ? 'bg-[#2C3327] text-white shadow-sm' : 'text-[#6B705C] hover:bg-white'}`}
          >
            <ClipboardList className="h-4 w-4" />
            Tarefas
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${view === 'tasks' ? 'bg-white/15' : 'bg-white'}`}>{openTasks}</span>
          </button>
        </div>
      </div>

      {view === 'rooms' ? <RoomsKanbanView /> : <KanbanBoard />}
    </div>
  );
};
