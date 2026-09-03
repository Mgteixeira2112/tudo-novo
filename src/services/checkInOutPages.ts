import { KanbanTask, Reservation, Room } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface AtomicCheckInResult {
  reservation: Reservation;
  room: Room;
  task: KanbanTask;
  depositTransaction?: unknown;
}

export interface AtomicCheckOutResult {
  reservation: Reservation;
  room: Room;
  folio: {
    nightsTotal: number;
    minibarTotal: number;
    kitchenTotal: number;
    discount?: number;
    totalCharges: number;
    priorPaid?: number;
    amountPaid: number;
    balance: number;
  };
  task: KanbanTask;
  settlementTransaction?: unknown;
}

export async function processCheckInAtomicCloud(data: {
  reservationId: string;
  roomId: string;
  depositAmount?: number;
  paymentMethod?: Reservation['paymentMethod'];
  keyCardNumber?: string;
  notes?: string;
}): Promise<AtomicCheckInResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: result, error } = await supabase.rpc('process_checkin_atomic', {
    p_reservation_id: data.reservationId,
    p_room_id: data.roomId,
    p_deposit_amount: Number(data.depositAmount || 0),
    p_payment_method: data.paymentMethod || 'Cartao_Credito',
    p_key_card_number: data.keyCardNumber || null,
    p_notes: data.notes || null
  });

  if (error) throw new Error(error.message || 'Erro ao realizar check-in.');
  return result as AtomicCheckInResult;
}

export async function processCheckOutAtomicCloud(data: {
  reservationId: string;
  paymentMethod: Reservation['paymentMethod'];
  amountPaid: number;
  discount?: number;
  inspectorName?: string;
  notes?: string;
}): Promise<AtomicCheckOutResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: result, error } = await supabase.rpc('process_checkout_atomic', {
    p_reservation_id: data.reservationId,
    p_payment_method: data.paymentMethod,
    p_amount_paid: Number(data.amountPaid || 0),
    p_discount: Number(data.discount || 0),
    p_inspector_name: data.inspectorName || null,
    p_notes: data.notes || null
  });

  if (error) throw new Error(error.message || 'Erro ao realizar check-out.');
  return result as AtomicCheckOutResult;
}
