import { getSupabaseClient } from './supabase.ts';

export type AmenityQuantityBasis = 'per_guest' | 'fixed_per_room';

export interface GovernanceAmenitySuggestionItem {
  inventoryItemId: string;
  inventoryName: string;
  baseQuantity: number;
  quantityBasis: AmenityQuantityBasis;
  suggestedQuantity: number | null;
}

export interface GovernanceAmenitySuggestion {
  roomNumber: string;
  roomTypeId: string;
  roomTypeName?: string;
  reservationId?: string;
  reservationCode?: string;
  guestName?: string;
  adults?: number;
  children?: number;
  guestCount?: number;
  items: GovernanceAmenitySuggestionItem[];
  hasPerGuestItemsWithoutReservation: boolean;
}

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export async function loadGovernanceAmenitySuggestion(roomNumber: string): Promise<GovernanceAmenitySuggestion | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !roomNumber) return null;

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id,number,type_id,type_name')
    .eq('number', roomNumber)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!room?.type_id) return null;

  const { data: kit, error: kitError } = await supabase
    .from('room_amenity_kits')
    .select('id,room_type_id,room_amenity_kit_items(inventory_item_id,quantity,quantity_basis,inventory_items(name))')
    .eq('room_type_id', room.type_id)
    .eq('name', 'Padrão de Preparação')
    .eq('active', true)
    .maybeSingle();
  if (kitError) throw kitError;
  if (!kit) return {
    roomNumber: room.number,
    roomTypeId: room.type_id,
    roomTypeName: room.type_name || undefined,
    items: [],
    hasPerGuestItemsWithoutReservation: false
  };

  const { data: reservations, error: reservationError } = await supabase
    .from('reservations')
    .select('id,code,guest_name,adults,children,check_in_date,check_out_date,status')
    .or(`room_id.eq.${room.id},room_number.eq.${room.number}`)
    .in('status', ['Pendente', 'Confirmada', 'CheckIn'])
    .gte('check_out_date', todayIso())
    .order('check_in_date', { ascending: true })
    .limit(1);
  if (reservationError) throw reservationError;

  const reservation = reservations?.[0] || null;
  const adults = Number(reservation?.adults || 0);
  const children = Number(reservation?.children || 0);
  const guestCount = reservation ? Math.max(0, adults + children) : undefined;

  const items: GovernanceAmenitySuggestionItem[] = (kit.room_amenity_kit_items || []).map((row: any) => {
    const baseQuantity = Number(row.quantity || 0);
    const quantityBasis: AmenityQuantityBasis = row.quantity_basis === 'per_guest' ? 'per_guest' : 'fixed_per_room';
    const suggestedQuantity = quantityBasis === 'fixed_per_room'
      ? baseQuantity
      : reservation
        ? baseQuantity * Number(guestCount || 0)
        : null;
    return {
      inventoryItemId: row.inventory_item_id,
      inventoryName: row.inventory_items?.name || row.inventory_item_id,
      baseQuantity,
      quantityBasis,
      suggestedQuantity
    };
  });

  return {
    roomNumber: room.number,
    roomTypeId: room.type_id,
    roomTypeName: room.type_name || undefined,
    reservationId: reservation?.id || undefined,
    reservationCode: reservation?.code || undefined,
    guestName: reservation?.guest_name || undefined,
    adults: reservation ? adults : undefined,
    children: reservation ? children : undefined,
    guestCount,
    items,
    hasPerGuestItemsWithoutReservation: !reservation && items.some(item => item.quantityBasis === 'per_guest')
  };
}
