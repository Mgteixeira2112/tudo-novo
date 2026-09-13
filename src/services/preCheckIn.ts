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

export interface IssuedPreCheckInLink {
  token: string;
  expiresAt: string;
}

export interface PublicPreCheckInData {
  reservationCode: string;
  checkInDate: string;
  checkOutDate: string;
  roomNumber: string;
  preCheckinStatus: PreCheckInStatus;
  guestName: string;
  socialName: string;
  birthDate: string;
  nationality: string;
  sex: string;
  documentType: string;
  document: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  addressComplement: string;
  district: string;
  postalCode: string;
  travelReason: string;
  travelOrigin: string;
  nextDestination: string;
  transportMode: string;
  vehiclePlate: string;
  minorsCount: number;
  legallyIncapableCount: number;
  responsibilityNotes: string;
  completedAt?: string;
}

export interface CompletePublicPreCheckInInput extends Omit<PublicPreCheckInData, 'reservationCode' | 'checkInDate' | 'checkOutDate' | 'roomNumber' | 'preCheckinStatus' | 'completedAt'> {
  declarationAccepted: boolean;
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

function mapPublicPreCheckIn(row: any): PublicPreCheckInData {
  return {
    reservationCode: row?.reservation_code || '',
    checkInDate: row?.check_in_date || '',
    checkOutDate: row?.check_out_date || '',
    roomNumber: row?.room_number || '',
    preCheckinStatus: (row?.pre_checkin_status || 'NaoIniciado') as PreCheckInStatus,
    guestName: row?.guest_name || '',
    socialName: row?.social_name || '',
    birthDate: row?.birth_date || '',
    nationality: row?.nationality || '',
    sex: row?.sex || '',
    documentType: row?.document_type || 'CPF',
    document: row?.document || '',
    email: row?.email || '',
    phone: row?.phone || '',
    country: row?.country || 'Brasil',
    state: row?.state || '',
    city: row?.city || '',
    address: row?.address || '',
    addressComplement: row?.address_complement || '',
    district: row?.district || '',
    postalCode: row?.postal_code || '',
    travelReason: row?.travel_reason || '',
    travelOrigin: row?.travel_origin || '',
    nextDestination: row?.next_destination || '',
    transportMode: row?.transport_mode || '',
    vehiclePlate: row?.vehicle_plate || '',
    minorsCount: Number(row?.minors_count || 0),
    legallyIncapableCount: Number(row?.legally_incapable_count || 0),
    responsibilityNotes: row?.responsibility_notes || '',
    completedAt: row?.completed_at || undefined
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

export async function issueReservationPreCheckInLinkCloud(reservationId: string): Promise<IssuedPreCheckInLink> {
  const { data, error } = await client().rpc('issue_reservation_precheckin_link', {
    p_reservation_id: reservationId
  });
  if (error) throw error;
  return {
    token: data?.token || '',
    expiresAt: data?.expires_at || ''
  };
}

export function buildPublicPreCheckInUrl(token: string) {
  if (typeof window === 'undefined') return `?precheckin=${encodeURIComponent(token)}`;
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('precheckin', token);
  return url.toString();
}

export async function loadPublicPreCheckInCloud(token: string): Promise<PublicPreCheckInData> {
  const { data, error } = await client().rpc('get_reservation_precheckin_public', {
    p_token: token
  });
  if (error) throw error;
  return mapPublicPreCheckIn(data);
}

export async function completePublicPreCheckInCloud(token: string, input: CompletePublicPreCheckInInput) {
  const { data, error } = await client().rpc('complete_reservation_precheckin_public', {
    p_token: token,
    p_full_name: input.guestName,
    p_social_name: input.socialName || null,
    p_birth_date: input.birthDate,
    p_nationality: input.nationality,
    p_sex: input.sex,
    p_document_type: input.documentType,
    p_document: input.document,
    p_email: input.email,
    p_phone: input.phone,
    p_country: input.country,
    p_state: input.state || null,
    p_city: input.city,
    p_address: input.address,
    p_address_complement: input.addressComplement || null,
    p_district: input.district || null,
    p_postal_code: input.postalCode,
    p_travel_reason: input.travelReason || null,
    p_travel_origin: input.travelOrigin || null,
    p_next_destination: input.nextDestination || null,
    p_transport_mode: input.transportMode || null,
    p_vehicle_plate: input.vehiclePlate || null,
    p_minors_count: input.minorsCount,
    p_legally_incapable_count: input.legallyIncapableCount,
    p_responsibility_notes: input.responsibilityNotes || null,
    p_declaration_accepted: input.declarationAccepted
  });
  if (error) throw error;
  return data;
}
