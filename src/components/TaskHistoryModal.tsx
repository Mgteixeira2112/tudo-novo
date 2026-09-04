import React, { useEffect, useMemo, useState } from 'react';
import { Archive, CalendarDays, DoorOpen, Search, UserCheck, X } from 'lucide-react';
import { SectorType } from '../types.ts';
import { ArchivedTask, loadArchivedTaskHistory } from '../services/taskHistoryPages.ts';

const SECTORS: Array<{ value: SectorType | 'Todos'; label: string }> = [
  { value: 'Todos', label: 'Todos os setores' },
  { value: 'Governanca', label: 'Governança' },
  { value: 'Cozinha', label: 'Cozinha' },
  { value: 'RoomService', label: 'Room Service' },
  { value: 'Recepcao', label: 'Recepção' },
  { value: 'Manutencao', label: 'Manutenção' }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export const TaskHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tasks, setTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState<SectorType | 'Todos'>('Todos');
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    let mounted = true;
    loadArchivedTaskHistory()
      .then(data => {
        if (mounted) setTasks(data);
      })
      .catch(err => console.error('Erro ao carregar histórico de tarefas:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cutoff = period === 'all'
      ? null
      : Date.now() - Number(period) * 24 * 60 * 60 * 1000;

    return tasks.filter(task => {
      if (sector !== 'Todos' && task.sector !== sector) return false;
      if (cutoff && new Date(task.completedAt).getTime() < cutoff) return false;
      if (!term) return true;

      return [
        task.title,
        task.description,
        task.roomNumber,
        task.guestName,
        task.assignedTo,
        task.relatedType,
        task.relatedId
      ].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [tasks, search, sector, period]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] p-5">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-[#588157]" />
              <h3 className="text-lg font-black text-[#2C3327]">Histórico de Tarefas Concluídas</h3>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">
              Tarefas concluídas saem do Kanban operacional após 5 minutos, mas permanecem registradas aqui.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#8E9280] transition hover:bg-[#F4F1EA] hover:text-[#2C3327]"
            aria-label="Fechar histórico"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-[#EFECE3] bg-[#F8F7F2] p-4 md:grid-cols-[1fr_180px_160px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E9280]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar tarefa, quarto, hóspede ou responsável"
              className="w-full rounded-xl border border-[#E6E3D8] bg-white py-2.5 pl-9 pr-3 text-xs text-[#3D4035] outline-none focus:border-[#A3B18A]"
            />
          </label>

          <select
            value={sector}
            onChange={event => setSector(event.target.value as SectorType | 'Todos')}
            className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A]"
          >
            {SECTORS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>

          <select
            value={period}
            onChange={event => setPeriod(event.target.value as '7' | '30' | '90' | 'all')}
            className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A]"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o histórico</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#8E9280]">Carregando histórico...</div>
          ) : visibleTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DADFD1] bg-[#F8FAF2] px-4 py-12 text-center text-sm text-[#8E9280]">
              Nenhuma tarefa concluída encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map(task => (
                <article key={task.id} className="rounded-xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#6B705C]">
                        <span>{task.sector}</span>
                        <span>•</span>
                        <span>{task.priority}</span>
                        {task.roomNumber && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E3D8] bg-[#F8F7F2] px-2 py-1 normal-case tracking-normal text-[#3D4035]">
                            <DoorOpen className="h-3 w-3" /> Qto {task.roomNumber}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-[#2C3327]">{task.title}</h4>
                      {task.description && <p className="mt-1 text-xs leading-relaxed text-[#6B705C]">{task.description}</p>}
                    </div>

                    <div className="shrink-0 text-right text-[11px] text-[#6B705C]">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <CalendarDays className="h-3.5 w-3.5 text-[#588157]" />
                        {formatDate(task.completedAt)}
                      </span>
                      {task.assignedTo && (
                        <span className="mt-1 flex items-center justify-end gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> {task.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#E6E3D8] bg-[#F8F7F2] px-5 py-3 text-[11px] text-[#6B705C]">
          {visibleTasks.length} tarefa(s) exibida(s) de {tasks.length} concluída(s).
        </div>
      </div>
    </div>
  );
};
