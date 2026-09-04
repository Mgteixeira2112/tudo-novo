import { Reservation } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface WalkInInput {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  document?: string;
  documentType?: 'CPF' | 'RG' | 'Passaporte';
  roomId: string;
  checkOutDate: string;
  adults: number;
  children: number;
  paymentMethod: Reservation['paymentMethod'];
  depositAmount?: number;
  keyCardNumber?: string;
  notes?: string;
}

export interface WalkInResult {
  reservation: any;
  room: any;
  guest: any;
  task: any;
  depositTransaction?: any;
}

export async function processWalkInAtomicCloud(input: WalkInInput): Promise<WalkInResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('process_walkin_atomic', {
    p_guest_name: input.guestName,
    p_guest_email: input.guestEmail,
    p_guest_phone: input.guestPhone,
    p_document: input.document || null,
    p_document_type: input.documentType || 'CPF',
    p_room_id: input.roomId,
    p_check_out_date: input.checkOutDate,
    p_adults: Number(input.adults || 1),
    p_children: Number(input.children || 0),
    p_payment_method: input.paymentMethod,
    p_deposit_amount: Number(input.depositAmount || 0),
    p_key_card_number: input.keyCardNumber || null,
    p_notes: input.notes || null
  });

  if (error) throw new Error(error.message || 'Erro ao realizar check-in direto.');
  return data as WalkInResult;
}
