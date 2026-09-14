import { Reservation } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface CreateReservationForRoomInput {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestDocument?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  paymentMethod: Reservation['paymentMethod'];
  notes?: string;
}

const mapReservationRow = (row: any): Reservation => ({
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
  paymentMethod: row.payment_method || undefined,
  notes: row.notes || undefined,
  createdAt: row.created_at,
  checkedInAt: row.checked_in_at || undefined,
  checkedOutAt: row.checked_out_at || undefined
}) as Reservation;

export async function createReservationForRoomAtomic(
  input: CreateReservationForRoomInput
): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('create_reservation_for_room_atomic', {
    p_room_id: input.roomId,
    p_guest_name: input.guestName,
    p_guest_email: input.guestEmail,
    p_guest_phone: input.guestPhone,
    p_guest_document: input.guestDocument || null,
    p_check_in_date: input.checkInDate,
    p_check_out_date: input.checkOutDate,
    p_adults: input.adults,
    p_children: input.children,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes || null
  });

  if (error) {
    const message = String(error.message || 'Não foi possível criar a reserva.');
    if (message.includes('ROOM_UNAVAILABLE')) {
      throw new Error('O quarto deixou de estar disponível para o período selecionado. Atualize o calendário e tente novamente.');
    }
    if (message.includes('ROOM_BLOCKED')) {
      throw new Error('Este quarto está bloqueado ou em manutenção e não pode receber uma nova reserva.');
    }
    if (message.includes('PAST_CHECKIN')) {
      throw new Error('A data de entrada não pode ser anterior à data operacional atual.');
    }
    throw new Error(message);
  }

  return mapReservationRow(data);
}
