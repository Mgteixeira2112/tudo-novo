import { api } from './api.ts';
import { createOperationalNotification } from './operationalNotifications.ts';

let installed = false;

export function installGovernanceCheckoutAlertIntegration(): void {
  if (installed) return;
  installed = true;

  const baseProcessCheckOut = api.processCheckOut.bind(api);

  api.processCheckOut = async data => {
    const result = await baseProcessCheckOut(data);

    if (result.room?.status === 'Limpeza') {
      try {
        await createOperationalNotification({
          type: 'room_cleaning_required',
          priority: 'attention',
          title: `Quarto ${result.room.number} aguardando limpeza`,
          message: `Checkout concluído. O quarto ${result.room.number} foi encaminhado para limpeza.`,
          sector: 'Governanca',
          sourceType: 'governance_room_cleaning',
          sourceId: result.room.id
        });
      } catch (error) {
        console.warn('[Operational Alerts] Checkout concluído, mas o alerta de Governança não pôde ser publicado:', error);
      }
    }

    return result;
  };
}
