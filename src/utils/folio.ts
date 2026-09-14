import { FinancialTransaction, KitchenOrder, Reservation, RoomMinibarConsumption } from '../types.ts';

export interface FolioBreakdown {
  nightsTotal: number;
  minibarTotal: number;
  kitchenTotal: number;
  priorPaid: number;
  discount: number;
  grossTotal: number;
  balance: number;
  deliveredKitchenOrders: KitchenOrder[];
  pendingKitchenOrders: KitchenOrder[];
}

export function calculateReservationFolio(
  reservation: Reservation,
  consumptions: RoomMinibarConsumption[],
  orders: KitchenOrder[],
  transactions: FinancialTransaction[],
  discount = 0
): FolioBreakdown {
  const reservationConsumptions = consumptions.filter(item => item.reservationId === reservation.id);
  const reservationOrders = orders.filter(item => item.reservationId === reservation.id && item.status !== 'Cancelado');
  const deliveredKitchenOrders = reservationOrders.filter(item => item.status === 'Entregue');
  const pendingKitchenOrders = reservationOrders.filter(item => !['Entregue', 'Cancelado'].includes(item.status));

  const nightsTotal = Number(reservation.totalNightsAmount || 0);
  const minibarTotal = reservationConsumptions.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const kitchenTotal = deliveredKitchenOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0) + Number(order.deliveryFee || 0),
    0
  );
  const priorPaid = transactions
    .filter(tx => tx.reservationId === reservation.id && tx.type === 'Receita' && tx.status === 'Pago')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const normalizedDiscount = Math.max(0, Number(discount || 0));
  const grossTotal = nightsTotal + minibarTotal + kitchenTotal;
  const balance = Math.max(0, grossTotal - normalizedDiscount - priorPaid);

  return {
    nightsTotal,
    minibarTotal,
    kitchenTotal,
    priorPaid,
    discount: normalizedDiscount,
    grossTotal,
    balance,
    deliveredKitchenOrders,
    pendingKitchenOrders
  };
}
