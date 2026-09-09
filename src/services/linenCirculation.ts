import { getSupabaseClient } from './supabase.ts';

export type LinenLocation = 'Rouparia' | 'Quarto' | 'Lavanderia';

export interface LinenPosition {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  physicalTotal: number;
  locationType: LinenLocation;
  roomNumber?: string;
  quantity: number;
}

export interface LinenMovement {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  fromLocation: LinenLocation;
  toLocation: LinenLocation;
  fromRoomNumber?: string;
  toRoomNumber?: string;
  operator: string;
  movedAt: string;
  notes?: string;
}

export async function loadLinenCirculation(): Promise<{ positions: LinenPosition[]; movements: LinenMovement[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const [{ data: inventory, error: inventoryError }, { data: positions, error: positionsError }, { data: movements, error: movementsError }] = await Promise.all([
    supabase.from('inventory_items').select('id,name,unit,current_stock').eq('category', 'Enxoval & Rouparia').order('name'),
    supabase.from('linen_positions').select('*').order('location_type').order('room_number'),
    supabase.from('linen_movements').select('*').order('moved_at', { ascending: false }).limit(100)
  ]);

  if (inventoryError) throw inventoryError;
  if (positionsError) throw positionsError;
  if (movementsError) throw movementsError;

  const itemMap = new Map((inventory || []).map((item: any) => [item.id, item]));
  const mappedPositions: LinenPosition[] = (positions || [])
    .filter((row: any) => itemMap.has(row.item_id))
    .map((row: any) => {
      const item: any = itemMap.get(row.item_id);
      return {
        id: row.id,
        itemId: row.item_id,
        itemName: item.name,
        unit: item.unit,
        physicalTotal: Number(item.current_stock || 0),
        locationType: row.location_type,
        roomNumber: row.room_number || undefined,
        quantity: Number(row.quantity || 0)
      };
    });

  const mappedMovements: LinenMovement[] = (movements || []).map((row: any) => ({
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    quantity: Number(row.quantity || 0),
    fromLocation: row.from_location,
    toLocation: row.to_location,
    fromRoomNumber: row.from_room_number || undefined,
    toRoomNumber: row.to_room_number || undefined,
    operator: row.operator,
    movedAt: row.moved_at,
    notes: row.notes || undefined
  }));

  return { positions: mappedPositions, movements: mappedMovements };
}

export async function moveLinenAtomic(input: {
  itemId: string;
  fromLocation: LinenLocation;
  toLocation: LinenLocation;
  quantity: number;
  fromRoom?: string;
  toRoom?: string;
  notes?: string;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('move_linen_atomic', {
    p_item_id: input.itemId,
    p_from_location: input.fromLocation,
    p_to_location: input.toLocation,
    p_quantity: Number(input.quantity),
    p_from_room: input.fromRoom || null,
    p_to_room: input.toRoom || null,
    p_notes: input.notes || null
  });

  if (error) throw error;
  return data;
}
