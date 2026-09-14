import { Reservation } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export type OverdueTransferRoom = {
  id: string;
  number: string;
  typeId: string;
  typeName: string;
  floor: number;
  capacity: number;
  pricePerNight: number;
};

function mapReservation(row: any): Reservation {
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
    checkedOutAt: row.checked_out_at || undefined
  } as Reservation;
}

export async function extendOverdueStayAtomic(input: {
  reservationId: string;
  newCheckOutDate: string;
  reason?: string;
}): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('extend_overdue_stay_atomic', {
    p_reservation_id: input.reservationId,
    p_new_check_out_date: input.newCheckOutDate,
    p_reason: input.reason || null
  });

  if (error) {
    const message = String(error.message || 'Erro ao prorrogar hospedagem.');
    if (message.includes('outra reserva ativa')) {
      const conflictError = new Error('Não é possível manter o quarto atual: existe outra reserva ativa no novo período.');
      (conflictError as any).code = 'ROOM_CONFLICT';
      throw conflictError;
    }
    throw new Error(message);
  }

  return mapReservation(data);
}

export async function findOverdueStayTransferRooms(input: {
  reservationId: string;
  newCheckOutDate: string;
}): Promise<OverdueTransferRoom[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('find_overdue_stay_transfer_rooms', {
    p_reservation_id: input.reservationId,
    p_new_check_out_date: input.newCheckOutDate
  });

  if (error) throw new Error(String(error.message || 'Erro ao buscar quartos compatíveis.'));

  return (data || []).map((row: any) => ({
    id: row.id,
    number: row.number,
    typeId: row.type_id,
    typeName: row.type_name,
    floor: Number(row.floor || 0),
    capacity: Number(row.capacity || 0),
    pricePerNight: Number(row.price_per_night || 0)
  }));
}

export async function extendOverdueStayWithTransferAtomic(input: {
  reservationId: string;
  newCheckOutDate: string;
  newRoomId: string;
  reason?: string;
}): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('extend_overdue_stay_with_transfer_atomic', {
    p_reservation_id: input.reservationId,
    p_new_check_out_date: input.newCheckOutDate,
    p_new_room_id: input.newRoomId,
    p_reason: input.reason || null
  });

  if (error) throw new Error(String(error.message || 'Erro ao prorrogar e transferir hospedagem.'));
  return mapReservation(data);
}
