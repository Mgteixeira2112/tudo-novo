import { Reservation } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

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
      throw new Error('Não é possível prorrogar: o quarto possui outra reserva ativa no novo período.');
    }
    throw new Error(message);
  }

  return mapReservation(data);
}
