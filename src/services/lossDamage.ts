import { getSupabaseClient } from './supabase.ts';

export type LossDamageOccurrence = 'Perda' | 'Rasgo' | 'Dano' | 'Extravio' | 'Descarte';

export interface LossDamageInventoryItem {
  id: string;
  name: string;
  sector: string;
  category: string;
  currentStock: number;
  unit: string;
}

export interface LossDamagePosition {
  id: string;
  itemId: string;
  locationType: 'Rouparia' | 'Quarto' | 'Lavanderia';
  roomNumber: string;
  quantity: number;
}

export interface LossDamageEvent {
  id: string;
  itemId: string;
  itemName: string;
  occurrenceType: LossDamageOccurrence;
  quantity: number;
  unit: string;
  definitive: boolean;
  sourceLocation?: string;
  roomNumber?: string;
  operator: string;
  notes?: string;
  stockMovementId?: string;
  createdAt: string;
}

const client = () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
};

const num = (value: any) => Number(value || 0);

export async function loadLossDamageData() {
  const supabase = client();
  const [itemsResult, positionsResult, eventsResult] = await Promise.all([
    supabase.from('inventory_items').select('id,name,sector,category,current_stock,unit').order('name'),
    supabase.from('linen_positions').select('id,item_id,location_type,room_number,quantity').gt('quantity', 0).order('location_type'),
    supabase.from('inventory_loss_damage_events').select('*').order('created_at', { ascending: false }).limit(100)
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (positionsResult.error) throw positionsResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const items: LossDamageInventoryItem[] = (itemsResult.data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    sector: row.sector,
    category: row.category,
    currentStock: num(row.current_stock),
    unit: row.unit || 'un'
  }));

  const positions: LossDamagePosition[] = (positionsResult.data || []).map((row: any) => ({
    id: row.id,
    itemId: row.item_id,
    locationType: row.location_type,
    roomNumber: row.room_number || '',
    quantity: num(row.quantity)
  }));

  const events: LossDamageEvent[] = (eventsResult.data || []).map((row: any) => ({
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    occurrenceType: row.occurrence_type,
    quantity: num(row.quantity),
    unit: row.unit,
    definitive: Boolean(row.definitive),
    sourceLocation: row.source_location || undefined,
    roomNumber: row.room_number || undefined,
    operator: row.operator,
    notes: row.notes || undefined,
    stockMovementId: row.stock_movement_id || undefined,
    createdAt: row.created_at
  }));

  return { items, positions, events };
}

export async function registerLossDamage(input: {
  itemId: string;
  occurrenceType: LossDamageOccurrence;
  quantity: number;
  definitive: boolean;
  sourceLocation?: string;
  roomNumber?: string;
  notes?: string;
}) {
  const { data, error } = await client().rpc('register_loss_damage_atomic', {
    p_item_id: input.itemId,
    p_occurrence_type: input.occurrenceType,
    p_quantity: input.quantity,
    p_definitive: input.definitive,
    p_source_location: input.sourceLocation || null,
    p_room_number: input.roomNumber || null,
    p_notes: input.notes || null
  });
  if (error) throw error;
  return data;
}
