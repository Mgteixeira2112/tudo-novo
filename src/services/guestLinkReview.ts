import { getSupabaseClient } from './supabase.ts';

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export interface GuestLinkReviewResult {
  reservationId: string;
  reservationCode: string;
  previousGuestId: string;
  guestName: string;
  totalStays: number;
}

export interface GuestCreatedFromReservationResult {
  reservationId: string;
  reservationCode: string;
  guestId: string;
  guestName: string;
  totalStays: number;
}

export async function unlinkInconsistentReservationGuestCloud(
  reservationId: string,
  expectedGuestId: string
): Promise<GuestLinkReviewResult> {
  const { data, error } = await client().rpc('unlink_inconsistent_reservation_guest', {
    p_reservation_id: reservationId,
    p_expected_guest_id: expectedGuestId
  });

  if (error) throw error;

  return {
    reservationId: data?.reservationId || reservationId,
    reservationCode: data?.reservationCode || '',
    previousGuestId: data?.previousGuestId || expectedGuestId,
    guestName: data?.guestName || '',
    totalStays: Number(data?.totalStays || 0)
  };
}

export async function createGuestFromReservationCloud(
  reservationId: string
): Promise<GuestCreatedFromReservationResult> {
  const { data, error } = await client().rpc('create_guest_from_reservation_and_link', {
    p_reservation_id: reservationId
  });

  if (error) throw error;

  return {
    reservationId: data?.reservationId || reservationId,
    reservationCode: data?.reservationCode || '',
    guestId: data?.guestId || '',
    guestName: data?.guestName || '',
    totalStays: Number(data?.totalStays || 0)
  };
}
