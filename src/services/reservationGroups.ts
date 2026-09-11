import { Reservation } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface ReservationGroupAllocationInput {
  roomTypeId: string;
  adults: number;
  children: number;
}

export type GroupedReservation = Reservation & {
  groupId?: string;
  groupCode?: string;
  groupIndex?: number;
  groupSize?: number;
};

function mapReservationRow(row: any): GroupedReservation {
  return {
    id: row.id,
    code: row.code,
    guestId: row.guest_id || '',
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone || '',
    roomId: row.room_id || '',
    roomNumber: row.room_number || '',
    roomTypeName: row.room_type_name,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    nights: Number(row.nights || 0),
    adults: Number(row.adults || 0),
    children: Number(row.children || 0),
    pricePerNight: Number(row.price_per_night || 0),
    totalNightsAmount: Number(row.total_nights_amount || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    checkedInAt: row.checked_in_at || undefined,
    checkedOutAt: row.checked_out_at || undefined,
    groupId: row.group_id || undefined,
    groupCode: row.group_code || undefined,
    groupIndex: row.group_index == null ? undefined : Number(row.group_index),
    groupSize: row.group_size == null ? undefined : Number(row.group_size)
  };
}

export async function createReservationGroupAtomicInSupabase(input: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  paymentMethod: Reservation['paymentMethod'];
  notes?: string;
  allocations: ReservationGroupAllocationInput[];
}): Promise<GroupedReservation[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('create_reservation_group_atomic', {
    p_guest_name: input.guestName,
    p_guest_email: input.guestEmail,
    p_guest_phone: input.guestPhone,
    p_check_in_date: input.checkInDate,
    p_check_out_date: input.checkOutDate,
    p_total_adults: input.adults,
    p_total_children: input.children,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes || null,
    p_allocations: input.allocations.map(item => ({
      roomTypeId: item.roomTypeId,
      adults: item.adults,
      children: item.children
    }))
  });

  if (error) {
    const message = String(error.message || 'Erro ao criar reserva agrupada.');
    if (message.includes('ROOM_UNAVAILABLE')) {
      throw new Error('Uma das acomodações deixou de estar disponível. Faça a busca novamente.');
    }
    if (message.includes('INVALID_ALLOCATION')) {
      throw new Error('A distribuição de hóspedes não é mais válida. Faça a busca novamente.');
    }
    throw error;
  }

  return (Array.isArray(data) ? data : data ? [data] : []).map(mapReservationRow);
}
