import { KitchenOrder } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export type KitchenProductionState = 'Nao_Iniciado' | 'Parcialmente_Preparado' | 'Totalmente_Preparado';
export type KitchenStockTreatment = 'Retorno_Total' | 'Perda_Total' | 'Retorno_Parcial';

export interface KitchenCancellationStockItem {
  itemId: string;
  itemName: string;
  requiredQuantity: number;
  unit: string;
  unitCost: number;
  returnedQuantity?: number;
  lostQuantity?: number;
}

export interface KitchenOrderCancellationContext {
  order: KitchenOrder;
  stockItems: KitchenCancellationStockItem[];
}

export interface CancelKitchenOrderInput {
  orderId: string;
  reason: string;
  productionState: KitchenProductionState;
  stockTreatment: KitchenStockTreatment;
  returnedItems?: { itemId: string; quantity: number }[];
}

function mapOrder(r: any): KitchenOrder {
  return {
    id: r.id,
    orderNumber: r.order_number,
    roomId: r.room_id || '',
    roomNumber: r.room_number,
    reservationId: r.reservation_id || '',
    guestName: r.guest_name || '',
    items: Array.isArray(r.items) ? r.items : [],
    totalAmount: Number(r.total_amount || 0),
    deliveryFee: Number(r.delivery_fee || 0),
    destination: r.destination,
    deliverySector: r.delivery_sector,
    status: r.status,
    specialInstructions: r.special_instructions || '',
    createdAt: r.created_at,
    completedAt: r.completed_at || undefined,
    cancellationReason: r.cancellation_reason || undefined,
    cancellationProductionState: r.cancellation_production_state || undefined,
    cancellationStockTreatment: r.cancellation_stock_treatment || undefined,
    cancellationStockDetails: Array.isArray(r.cancellation_stock_details) ? r.cancellation_stock_details : [],
    cancelledAt: r.cancelled_at || undefined,
    cancelledBy: r.cancelled_by || undefined,
    cancelledByName: r.cancelled_by_name || undefined,
    statusBeforeCancel: r.status_before_cancel || undefined
  } as KitchenOrder;
}

export async function updateKitchenOrderStatusAtomicCloud(
  orderId: string,
  status: KitchenOrder['status']
): Promise<KitchenOrder> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('update_kitchen_order_status_atomic', {
    p_order_id: orderId,
    p_status: status
  });
  if (error) throw error;
  return mapOrder(data);
}

export async function getKitchenOrderCancellationContextCloud(
  orderId: string
): Promise<KitchenOrderCancellationContext> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('get_kitchen_order_cancellation_context', {
    p_order_id: orderId
  });
  if (error) throw error;
  return {
    order: mapOrder(data.order),
    stockItems: Array.isArray(data.stockItems)
      ? data.stockItems.map((item: any) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          requiredQuantity: Number(item.requiredQuantity || 0),
          unit: item.unit || 'un',
          unitCost: Number(item.unitCost || 0)
        }))
      : []
  };
}

export async function cancelKitchenOrderAtomicCloud(
  input: CancelKitchenOrderInput
): Promise<KitchenOrder> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('cancel_kitchen_order_atomic', {
    p_order_id: input.orderId,
    p_reason: input.reason,
    p_production_state: input.productionState,
    p_stock_treatment: input.stockTreatment,
    p_returned_items: input.returnedItems || []
  });
  if (error) throw error;
  return mapOrder(data.order);
}

export async function loadKitchenOrdersAuditCloud(): Promise<KitchenOrder[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('kitchen_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrder);
}
