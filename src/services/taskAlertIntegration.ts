import { api } from './api.ts';
import { createOperationalNotification, OperationalNotificationPriority } from './operationalNotifications.ts';
import { KanbanTask, TaskPriority } from '../types.ts';

let installed = false;

function mapTaskPriority(priority: TaskPriority): OperationalNotificationPriority {
  if (priority === 'Urgente') return 'critical';
  if (priority === 'Alta') return 'attention';
  return 'info';
}

function buildTaskMessage(task: KanbanTask): string {
  const details: string[] = [];
  if (task.roomNumber) details.push(`Quarto ${task.roomNumber}`);
  if (task.assignedTo) details.push(`Atribuída a ${task.assignedTo}`);
  if (task.description?.trim()) details.push(task.description.trim());
  return details.length > 0
    ? details.join(' • ')
    : `Nova tarefa para o setor ${task.sector}.`;
}

export function installTaskAlertIntegration(): void {
  if (installed) return;
  installed = true;

  const baseCreateTask = api.createTask.bind(api);

  api.createTask = async task => {
    const createdTask = await baseCreateTask(task);

    try {
      await createOperationalNotification({
        type: 'task_created',
        priority: mapTaskPriority(createdTask.priority),
        title: `Nova tarefa: ${createdTask.title}`,
        message: buildTaskMessage(createdTask),
        sector: createdTask.sector,
        sourceType: 'kanban_task',
        sourceId: createdTask.id
      });
    } catch (error) {
      console.warn('[Operational Alerts] Tarefa criada, mas o alerta não pôde ser publicado:', error);
    }

    return createdTask;
  };
}
