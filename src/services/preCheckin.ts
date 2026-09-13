import { getSupabaseClient } from './supabase.ts';

export type PreCheckInStatus = 'NaoIniciado' | 'EmAndamento' | 'Concluido';

export interface ReservationPreCheckInData {
  travelReason: string;
  travelOrigin: string;
  nextDestination: string;
  transportMode: string;
  vehiclePlate: string;
  minorsCount: number;
  legallyIncapableCount: number;
  responsibilityNotes: string;
  preCheckinStatus: PreCheckInStatus;
  preCheckinUpdatedAt?: string;
  preCheckedInAt?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface SaveReservationPreCheckInInput {
  reservationId: string;
  travelReason: string;
  travelOrigin: string;
  nextDestination: string;
  transportMode: string;
  vehiclePlate: string;
  minorsCount: number;
  legallyIncapableCount: number;
  responsibilityNotes: string;
}

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export function mapReservationPreCheckIn(row: any): ReservationPreCheckInData {
  return {
    travelReason: row?.travel_reason || '',
    travelOrigin: row?.travel_origin || '',
    nextDestination: row?.next_destination || '',
    transportMode: row?.transport_mode || '',
    vehiclePlate: row?.vehicle_plate || '',
    minorsCount: Number(row?.minors_count || 0),
    legallyIncapableCount: Number(row?.legally_incapable_count || 0),
    responsibilityNotes: row?.responsibility_notes || '',
    preCheckinStatus: (row?.pre_checkin_status || 'NaoIniciado') as PreCheckInStatus,
    preCheckinUpdatedAt: row?.pre_checkin_updated_at || undefined,
    preCheckedInAt: row?.pre_checked_in_at || undefined,
    termsAcceptedAt: row?.terms_accepted_at || undefined,
    termsVersion: row?.terms_version || undefined
  };
}

export async function loadReservationPreCheckInCloud(reservationId: string): Promise<ReservationPreCheckInData> {
  const { data, error } = await client()
    .from('reservations')
    .select('travel_reason,travel_origin,next_destination,transport_mode,vehicle_plate,minors_count,legally_incapable_count,responsibility_notes,pre_checkin_status,pre_checkin_updated_at,pre_checked_in_at,terms_accepted_at,terms_version')
    .eq('id', reservationId)
    .single();
  if (error) throw error;
  return mapReservationPreCheckIn(data);
}

export async function loadReservationPreCheckInStatusesCloud(): Promise<Record<string, PreCheckInStatus>> {
  const { data, error } = await client()
    .from('reservations')
    .select('id,pre_checkin_status')
    .in('status', ['Confirmada', 'CheckIn']);
  if (error) throw error;
  return Object.fromEntries((data || []).map((row: any) => [row.id, (row.pre_checkin_status || 'NaoIniciado') as PreCheckInStatus]));
}

export async function saveReservationPreCheckInStaffCloud(input: SaveReservationPreCheckInInput): Promise<ReservationPreCheckInData> {
  const { data, error } = await client().rpc('save_reservation_precheckin_staff', {
    p_reservation_id: input.reservationId,
    p_travel_reason: input.travelReason || null,
    p_travel_origin: input.travelOrigin || null,
    p_next_destination: input.nextDestination || null,
    p_transport_mode: input.transportMode || null,
    p_vehicle_plate: input.vehiclePlate || null,
    p_minors_count: input.minorsCount,
    p_legally_incapable_count: input.legallyIncapableCount,
    p_responsibility_notes: input.responsibilityNotes || null
  });
  if (error) throw error;
  return mapReservationPreCheckIn(data);
}
