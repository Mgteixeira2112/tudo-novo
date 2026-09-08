import { InventoryItem, MenuItem } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export type MenuAdminIngredient = {
  id?: string;
  inventoryItemId: string;
  name?: string;
  sku?: string;
  quantity: number;
  unit?: string;
  currentStock?: number;
  minStock?: number;
  costPrice?: number;
  proportionalCost?: number;
};

export type MenuAdminItem = MenuItem & {
  operationalType: 'simple' | 'recipe';
  simpleInventoryItemId?: string;
  simpleInventoryItem?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    sector: string;
    category: string;
  } | null;
  ingredients: MenuAdminIngredient[];
};

export type MenuItemPayload = {
  id?: string;
  name: string;
  category: string;
  price: number;
  description: string;
  prepTimeMinutes: number;
  available: boolean;
  operationalType: 'simple' | 'recipe';
  simpleInventoryItemId?: string;
  newInventoryItem?: {
    name: string;
    sku?: string;
    unit: string;
    sector: string;
    category: string;
    currentStock: number;
    minStock: number;
    maxStock?: number;
    costPrice: number;
    supplier?: string;
  };
  ingredients?: { inventoryItemId: string; quantity: number }[];
};

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export async function loadMenuAdminSnapshot(): Promise<MenuAdminItem[]> {
  const { data, error } = await client().rpc('menu_admin_snapshot');
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as MenuAdminItem[];
}

export async function loadInventoryForMenu(): Promise<InventoryItem[]> {
  const { data, error } = await client()
    .from('inventory_items')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    sector: row.sector,
    category: row.category,
    currentStock: Number(row.current_stock || 0),
    minStock: Number(row.min_stock || 0),
    maxStock: row.max_stock == null ? undefined : Number(row.max_stock),
    unit: row.unit,
    costPrice: Number(row.cost_price || 0),
    sellingPrice: row.selling_price == null ? undefined : Number(row.selling_price),
    supplier: row.supplier || undefined,
    locationBarcode: row.location_barcode || undefined,
    linkedMinibarItemId: row.linked_minibar_item_id || undefined,
    linkedMenuItemId: row.linked_menu_item_id || undefined,
    updatedAt: row.updated_at
  })) as InventoryItem[];
}

export async function saveMenuItemAtomic(payload: MenuItemPayload): Promise<MenuAdminItem> {
  const { data, error } = await client().rpc('save_menu_item_atomic', { p_payload: payload });
  if (error) throw error;
  return data as MenuAdminItem;
}

export async function setMenuItemAvailability(id: string, available: boolean): Promise<MenuAdminItem> {
  const { data, error } = await client().rpc('set_menu_item_availability', {
    p_menu_item_id: id,
    p_available: available
  });
  if (error) throw error;
  return data as MenuAdminItem;
}
