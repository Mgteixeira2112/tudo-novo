import React, { useEffect, useState } from 'react';
import {
  Kanban as KanbanIcon,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Pencil,
  UserCheck,
  DoorOpen,
  Filter,
  Sparkles,
  Archive
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { KanbanTask, SectorType, TaskPriority, TaskStatus } from '../types.ts';
import { api } from '../services/api.ts';
import { TaskHistoryModal } from './TaskHistoryModal.tsx';

const SECTORS: { id: SectorType | 'Todos'; label: string; icon: string; color: string }[] = [
  { id: 'Todos', label: 'Todos os Setores', icon: '🏢', color: 'bg-gray-100 text-gray-800' },
  { id: 'Governanca', label: 'Governança & Limpeza', icon: '🧹', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'Cozinha', label: 'Cozinha & Restaurante', icon: '👨‍🍳', color: 'bg-amber-100 text-amber-800' },
  { id: 'RoomService', label: 'Room Service', icon: '🍷', color: 'bg-rose-100 text-rose-800' },
  { id: 'Recepcao', label: 'Recepção / Front Desk', icon: '🛎️', color: 'bg-blue-100 text-blue-800' },
  { id: 'Manutencao', label: 'Manutenção Predial', icon: '🔧', color: 'bg-purple-100 text-purple-800' },
];

interface KanbanBoardProps {
  initialSector?: SectorType | 'Todos';
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ initialSector = 'Todos' }) => {
  const { tasks, rooms, refreshData } = useHotel();

  const [selectedSector, setSelectedSector] = useState<SectorType | 'Todos'>(initialSector);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [archiveClock, setArchiveClock] = useState(() => Date.now());

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskSector, setTaskSector] = useState<SectorType>('Governanca');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Media');
  const [taskRoomNumber, setTaskRoomNumber] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskSector('Governanca');
    setTaskPriority('Media');
    setTaskRoomNumber('');
    setTaskAssignedTo('');
    setEditingTaskId(null);
  };

  const handleOpenNewTask = () => {
    resetTaskForm();
    setShowNewTaskModal(true);
  };

  const handleOpenEditTask = (task: KanbanTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskSector(task.sector);
    setTaskPriority(task.priority);
    setTaskRoomNumber(task.roomNumber || '');
    setTaskAssignedTo(task.assignedTo || '');
    setShowNewTaskModal(true);
  };

  const filteredTasks = selectedSector === 'Todos'
    ? tasks
    : tasks.filter(t => t.sector === selectedSector);

  const todoTasks = filteredTasks.filter(t => t.status === 'A_Fazer');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'Em_Andamento');
  const doneTasks = filteredTasks.filter(t => {
    if (t.status !== 'Concluido') return false;
    const completedAt = new Date(t.updatedAt).getTime();
    return !Number.isFinite(completedAt) || archiveClock - completedAt < 5 * 60 * 1000;
  });

  const handleMoveStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      setArchiveClock(Date.now());
      await refreshData();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;
    try {
      await api.deleteTask(taskId);
      await refreshData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription,
        sector: taskSector,
        priority: taskPriority,
        roomNumber: taskRoomNumber || undefined,
        assignedTo: taskAssignedTo || undefined
      };

      if (editingTaskId) {
        await api.updateTask(editingTaskId, payload);
      } else {
        await api.createTask({ ...payload, status: 'A_Fazer' });
      }

      resetTaskForm();
      setShowNewTaskModal(false);
      await refreshData();
    } catch (err) {
      console.error(editingTaskId ? 'Error editing task:' : 'Error creating task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgente':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]/40">
            <Flame className="w-3 h-3 text-[#BC6C25]" />
            <span>Urgente</span>
          </span>
        );
      case 'Alta':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAEDCD]/70 text-[#9C5A2B] border border-[#D4A373]/30">
            <AlertTriangle className="w-3 h-3 text-[#9C5A2B]" />
            <span>Alta</span>
          </span>
        );
      case 'Media':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2F5E8] text-[#3A5A40] border border-[#CCD5AE]">
            <Clock className="w-3 h-3 text-[#588157]" />
            <span>Média</span>
          </span>
        );
      case 'Baixa':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]">
            Baixa
          </span>
        );
    }
  };

  const getSectorBadge = (sector: SectorType) => {
    switch (sector) {
      case 'Governanca':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2F5E8] text-[#2C3327] border border-[#CCD5AE]">🧹 Governança</span>;
      case 'Cozinha':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]/40">👨‍🍳 Cozinha</span>;
      case 'RoomService':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]">🍷 Room Service</span>;
      case 'Recepcao':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E9EDC9] text-[#2C3327] border border-[#CCD5AE]">🛎️ Recepção</span>;
      case 'Manutencao':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D4A373]/20 text-[#3D4035] border border-[#D4A373]/30">🔧 Manutenção</span>;
      default:
        return null;
    }
  };

  const renderCard = (task: KanbanTask) => (
    <div
      key={task.id}
      className="bg-white rounded-xl border border-[#E6E3D8] p-4 shadow-xs hover:shadow-md transition space-y-3 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getPriorityBadge(task.priority)}
            {selectedSector === 'Todos' && getSectorBadge(task.sector)}
            {task.roomNumber && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F1EA] text-[#2C3327] border border-[#E6E3D8]">
                <DoorOpen className="w-3 h-3 text-[#6B705C]" />
                <span>Qto {task.roomNumber}</span>
              </span>
            )}
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-[#2C3327] leading-snug">
            {task.title}
          </h4>
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <button
            onClick={() => handleOpenEditTask(task)}
            className="text-[#8E9280] hover:text-[#2C3327] transition p-1"
            title="Editar tarefa"
            aria-label="Editar tarefa"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="text-[#8E9280] hover:text-rose-700 transition p-1"
            title="Excluir tarefa"
            aria-label="Excluir tarefa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-[#6B705C] font-light leading-relaxed line-clamp-3">
          {task.description}
        </p>
      )}

      <div className="pt-2 border-t border-[#E6E3D8] flex items-center justify-between text-[11px] text-[#6B705C]">
        <div className="flex items-center space-x-1 truncate max-w-[150px]">
          {task.assignedTo ? (
            <span className="flex items-center space-x-1 font-medium text-[#3D4035]">
              <UserCheck className="w-3 h-3 text-[#588157] shrink-0" />
              <span className="truncate">{task.assignedTo}</span>
            </span>
          ) : (
            <span className="text-[#8E9280] italic">Não atribuído</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {task.status !== 'A_Fazer' && (
            <button
              onClick={() => handleMoveStatus(task.id, task.status === 'Concluido' ? 'Em_Andamento' : 'A_Fazer')}
              className="p-1 rounded hover:bg-[#F4F1EA] text-[#6B705C] hover:text-[#2C3327]"
              title="Mover para coluna anterior"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {task.status !== 'Concluido' && (
            <button
              onClick={() => handleMoveStatus(task.id, task.status === 'A_Fazer' ? 'Em_Andamento' : 'Concluido')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#F2F5E8] hover:bg-[#E9EDC9] text-[#2C3327] border border-[#CCD5AE] font-semibold transition text-[11px]"
              title="Avançar status"
            >
              <span>{task.status === 'A_Fazer' ? 'Iniciar' : 'Concluir'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.status === 'Concluido' && (
            <span className="flex items-center text-[#588157] font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] tracking-tight">
              Kanbans em Tempo Real por Setor
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F2F5E8] text-[#2C3327] border border-[#CCD5AE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#588157] mr-1.5 animate-pulse"></span>
              Sincronizado via SQL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            Administração ágil das operações de Governança, Cozinha, Room Service, Manutenção e Recepção.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="flex items-center justify-center space-x-2 rounded-xl border border-[#DADFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#3D4035] shadow-sm transition hover:bg-[#F8FAF2]"
          >
            <Archive className="w-4 h-4 text-[#588157]" />
            <span>Histórico</span>
          </button>
          <button
            id="btn-new-kanban-task"
            onClick={handleOpenNewTask}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa de Setor</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#DADFD1] bg-[#F8FAF2] px-4 py-3 text-[11px] text-[#6B705C]">
        <strong className="text-[#3D4035]">Arquivamento automático:</strong> tarefas permanecem em Concluídos por 5 minutos e depois saem do Kanban operacional. O registro continua disponível em Histórico.
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {SECTORS.map(s => {
          const count = s.id === 'Todos'
            ? tasks.filter(t => t.status !== 'Concluido').length
            : tasks.filter(t => t.sector === s.id && t.status !== 'Concluido').length;

          const isActive = selectedSector === s.id;

          return (
            <button
              key={s.id}
              onClick={() => setSelectedSector(s.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-[#2C3327] text-[#FDFBF7] border-[#2C3327] shadow-sm'
                  : 'bg-white text-[#6B705C] border-[#E6E3D8] hover:bg-[#FDFBF7]'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-[#588157] text-white' : 'bg-[#F4F1EA] text-[#6B705C]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E6E3D8] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E3D8]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373]"></span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2C3327]">
                A Fazer / Pendentes
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-[#2C3327] border border-[#E6E3D8] shadow-2xs">
              {todoTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {todoTasks.length === 0 ? (
              <div className="text-center py-12 text-[#8E9280] text-xs italic">
                Nenhuma tarefa pendente nesta área.
              </div>
            ) : (
              todoTasks.map(renderCard)
            )}
          </div>
        </div>

        <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E6E3D8] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E3D8]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A3B18A]"></span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2C3327]">
                Em Andamento
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-[#2C3327] border border-[#E6E3D8] shadow-2xs">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {inProgressTasks.length === 0 ? (
              <div className="text-center py-12 text-[#8E9280] text-xs italic">
                Nenhum trabalho em execução no momento.
              </div>
            ) : (
              inProgressTasks.map(renderCard)
            )}
          </div>
        </div>

        <div className="bg-[#F7F5F0] rounded-2xl p-4 border border-[#E6E3D8] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E3D8]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#588157]"></span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2C3327]">
                Concluídos
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-[#2C3327] border border-[#E6E3D8] shadow-2xs">
              {doneTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {doneTasks.length === 0 ? (
              <div className="text-center py-12 text-[#8E9280] text-xs italic">
                Nenhuma tarefa finalizada recentemente.
              </div>
            ) : (
              doneTasks.map(renderCard)
            )}
          </div>
        </div>
      </div>

      {showHistory && <TaskHistoryModal onClose={() => setShowHistory(false)} />}

      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E6E3D8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
              <h3 className="text-base font-bold text-[#2C3327]">
                Nova Tarefa de Setor
              </h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-[#8E9280] hover:text-[#2C3327] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Título da Tarefa *
                </label>
                <input
                  id="input-task-title"
                  type="text"
                  required
                  placeholder="Ex: Trocar lâmpada do banheiro ou Repor toalhas"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Setor Responsável
                  </label>
                  <select
                    id="select-task-sector"
                    value={taskSector}
                    onChange={e => setTaskSector(e.target.value as SectorType)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="Governanca">🧹 Governança</option>
                    <option value="Cozinha">👨‍🍳 Cozinha</option>
                    <option value="RoomService">🍷 Room Service</option>
                    <option value="Recepcao">🛎️ Recepção</option>
                    <option value="Manutencao">🔧 Manutenção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Prioridade
                  </label>
                  <select
                    id="select-task-priority"
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Media">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Quarto Associado (Opcional)
                  </label>
                  <select
                    id="select-task-room"
                    value={taskRoomNumber}
                    onChange={e => setTaskRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="">Nenhum Quarto</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.number}>
                        Quarto {r.number} ({r.typeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Responsável / Atribuído
                  </label>
                  <input
                    id="input-task-assignee"
                    type="text"
                    placeholder="Ex: Maria Helena ou Técnico Marcos"
                    value={taskAssignedTo}
                    onChange={e => setTaskAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Instruções ou Detalhes
                </label>
                <textarea
                  id="textarea-task-desc"
                  rows={3}
                  placeholder="Descreva detalhes específicos da tarefa para a equipe..."
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B705C] hover:text-[#2C3327]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-task"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition"
                >
                  {submitting ? 'Salvando...' : 'Adicionar ao Kanban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};