import { api } from './api.ts';
import { createOperationalNotification } from './operationalNotifications.ts';
import { KitchenOrder } from '../types.ts';

let installed = false;

function mapDeliverySector(order: KitchenOrder): string {
  return order.deliverySector === 'Room Service' ? 'RoomService' : 'Cozinha';
}

function buildOrderMessage(order: KitchenOrder): string {
  const details: string[] = [];
  if (order.roomNumber) details.push(`Quarto ${order.roomNumber}`);
  if (order.guestName) details.push(order.guestName);
  if (order.destination) details.push(`Destino: ${order.destination}`);
  if (order.items?.length) {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    details.push(`${totalItems} item${totalItems === 1 ? '' : 's'}`);
  }
  if (order.specialInstructions?.trim()) details.push(order.specialInstructions.trim());
  return details.join(' • ') || `Novo pedido ${order.orderNumber}.`;
}

export function installKitchenOrderAlertIntegration(): void {
  if (installed) return;
  installed = true;

  const baseCreateOrder = api.createOrder.bind(api);

  api.createOrder = async data => {
    const createdOrder = await baseCreateOrder(data);

    try {
      await createOperationalNotification({
        type: 'kitchen_order_created',
        priority: 'attention',
        title: `Novo pedido: ${createdOrder.orderNumber}`,
        message: buildOrderMessage(createdOrder),
        sector: mapDeliverySector(createdOrder),
        sourceType: 'kitchen_order',
        sourceId: createdOrder.id
      });
    } catch (error) {
      console.warn('[Operational Alerts] Pedido criado, mas o alerta não pôde ser publicado:', error);
    }

    return createdOrder;
  };
}
