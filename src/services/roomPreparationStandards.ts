import { getSupabaseClient } from './supabase.ts';

export type RoomAmenityQuantityBasis = 'per_guest' | 'fixed_per_room';

export interface RoomAmenityInventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
}

export interface RoomPreparationKitItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  quantityBasis: RoomAmenityQuantityBasis;
}

export interface RoomPreparationKit {
  id: string;
  name: string;
  roomTypeId: string;
  active: boolean;
  notes?: string;
  items: RoomPreparationKitItem[];
}

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export async function loadRoomPreparationKits(): Promise<RoomPreparationKit[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('room_amenity_kits')
    .select('id,name,room_type_id,active,notes,room_amenity_kit_items(id,inventory_item_id,quantity,quantity_basis)')
    .eq('active', true)
    .eq('name', 'Padrão de Preparação')
    .order('room_type_id');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    roomTypeId: row.room_type_id,
    active: Boolean(row.active),
    notes: row.notes || undefined,
    items: (row.room_amenity_kit_items || []).map((item: any) => ({
      id: item.id,
      inventoryItemId: item.inventory_item_id,
      quantity: Number(item.quantity || 0),
      quantityBasis: item.quantity_basis === 'per_guest' ? 'per_guest' : 'fixed_per_room'
    }))
  }));
}

export async function loadRoomAmenityInventoryItems(): Promise<RoomAmenityInventoryItem[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id,sku,name,category,current_stock,unit')
    .eq('sector', 'Governanca_Enxoval')
    .eq('category', 'Amenities de Quarto')
    .order('name');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    currentStock: Number(row.current_stock || 0),
    unit: row.unit || 'un'
  }));
}

export async function saveRoomPreparationKit(input: {
  roomTypeId: string;
  notes?: string;
  items: Array<{ inventoryItemId: string; quantity: number; quantityBasis: RoomAmenityQuantityBasis }>;
}) {
  const supabase = client();
  const { data, error } = await supabase.rpc('save_room_amenity_kit_atomic', {
    p_room_type_id: input.roomTypeId,
    p_items: input.items,
    p_notes: input.notes || null
  });
  if (error) throw error;
  return data;
}
