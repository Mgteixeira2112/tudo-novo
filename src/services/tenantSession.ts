import type { TenantHotel } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

const ACTIVE_HOTEL_STORAGE_KEY = 'novohotel_active_hotel_id';
let activeHotelId: string | null = null;

export function getActiveHotelId(): string | null {
  return activeHotelId;
}

export function requireActiveHotelId(): string {
  if (!activeHotelId) throw new Error('HOTEL_TENANT_NOT_SELECTED');
  return activeHotelId;
}

export function clearActiveHotelId() {
  activeHotelId = null;
  try {
    localStorage.removeItem(ACTIVE_HOTEL_STORAGE_KEY);
  } catch {}
}

export function setActiveHotelId(hotelId: string, allowedHotelIds?: string[]) {
  if (!hotelId) throw new Error('HOTEL_ID_REQUIRED');
  if (allowedHotelIds && !allowedHotelIds.includes(hotelId)) {
    throw new Error('HOTEL_TENANT_NOT_ALLOWED');
  }

  activeHotelId = hotelId;
  try {
    localStorage.setItem(ACTIVE_HOTEL_STORAGE_KEY, hotelId);
  } catch {}
}

export async function loadTenantHotelsForUser(userId: string): Promise<TenantHotel[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: memberships, error: membershipError } = await supabase
    .from('hotel_memberships')
    .select('hotel_id,organization_id,role,active')
    .eq('user_id', userId)
    .eq('active', true);

  if (membershipError) throw membershipError;

  const hotelIds = [...new Set((memberships || []).map((row: any) => String(row.hotel_id)))];
  if (hotelIds.length === 0) return [];

  const { data: hotels, error: hotelError } = await supabase
    .from('hoteis')
    .select('id,organization_id,name,product_plan,status')
    .in('id', hotelIds)
    .eq('status', 'ACTIVE')
    .order('name');

  if (hotelError) throw hotelError;

  const membershipByHotel = new Map(
    (memberships || []).map((row: any) => [String(row.hotel_id), row]),
  );

  return (hotels || []).map((row: any) => {
    const membership: any = membershipByHotel.get(String(row.id));
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      name: String(row.name),
      productPlan: row.product_plan === 'BOOKING_LITE' ? 'BOOKING_LITE' : 'HOTEL_FULL',
      status: row.status,
      role: String(membership?.role || ''),
    } as TenantHotel;
  });
}

export async function initializeTenantSession(userId: string): Promise<{
  hotels: TenantHotel[];
  activeHotel: TenantHotel;
}> {
  const hotels = await loadTenantHotelsForUser(userId);
  if (hotels.length === 0) throw new Error('Usuário sem hotel ativo vinculado.');

  let preferredId: string | null = null;
  try {
    preferredId = localStorage.getItem(ACTIVE_HOTEL_STORAGE_KEY);
  } catch {}

  const activeHotel =
    hotels.find((hotel) => hotel.id === preferredId) ||
    hotels[0];

  setActiveHotelId(activeHotel.id, hotels.map((hotel) => hotel.id));
  return { hotels, activeHotel };
}
