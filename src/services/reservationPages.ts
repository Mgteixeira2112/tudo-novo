import { Reservation } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

function mapReservationRow(row: any): Reservation {
  return {
    id: String(row.id || ''),
    code: String(row.code || ''),
    guestId: String(row.guest_id || ''),
    guestName: String(row.guest_name || ''),
    guestEmail: String(row.guest_email || ''),
    guestPhone: String(row.guest_phone || ''),
    roomId: String(row.room_id || ''),
    roomNumber: String(row.room_number || ''),
    roomTypeName: String(row.room_type_name || ''),
    checkInDate: String(row.check_in_date || ''),
    checkOutDate: String(row.check_out_date || ''),
    nights: Number(row.nights || 0),
    adults: Number(row.adults || 0),
    children: Number(row.children || 0),
    pricePerNight: Number(row.price_per_night || 0),
    totalNightsAmount: Number(row.total_nights_amount || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    notes: row.notes || undefined,
    createdAt: String(row.created_at || ''),
    checkedInAt: row.checked_in_at || undefined,
    checkedOutAt: row.checked_out_at || undefined
  };
}

export async function confirmReservationAtomicCloud(reservationId: string): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('confirm_reservation_atomic', {
    p_reservation_id: reservationId
  });

  if (error) throw new Error(error.message || 'Não foi possível confirmar a reserva.');
  return mapReservationRow(data);
}

export async function cancelReservationAtomicCloud(reservationId: string, reason?: string): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('cancel_reservation_atomic', {
    p_reservation_id: reservationId,
    p_reason: reason?.trim() || null
  });

  if (error) throw new Error(error.message || 'Não foi possível cancelar a reserva.');
  return mapReservationRow(data);
}

export async function updateReservationAtomicCloud(data: {
  reservationId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  notes?: string;
}): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: result, error } = await supabase.rpc('update_reservation_atomic', {
    p_reservation_id: data.reservationId,
    p_guest_name: data.guestName.trim(),
    p_guest_email: data.guestEmail.trim(),
    p_guest_phone: data.guestPhone.trim(),
    p_check_in_date: data.checkInDate,
    p_check_out_date: data.checkOutDate,
    p_adults: Number(data.adults),
    p_children: Number(data.children),
    p_notes: data.notes?.trim() || null
  });

  if (error) throw new Error(error.message || 'Não foi possível editar a reserva.');
  return mapReservationRow(result);
}
