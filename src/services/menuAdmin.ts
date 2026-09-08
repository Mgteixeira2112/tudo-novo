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

export type InlineInventoryPayload = {
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
  newInventoryItem?: InlineInventoryPayload;
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

function mapInventory(row: any): InventoryItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    sector: row.sector,
    category: row.category,
    currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
    minStock: Number(row.min_stock ?? row.minStock ?? 0),
    maxStock: row.max_stock == null && row.maxStock == null ? undefined : Number(row.max_stock ?? row.maxStock),
    unit: row.unit,
    costPrice: Number(row.cost_price ?? row.costPrice ?? 0),
    sellingPrice: row.selling_price == null && row.sellingPrice == null ? undefined : Number(row.selling_price ?? row.sellingPrice),
    supplier: row.supplier || undefined,
    locationBarcode: row.location_barcode || row.locationBarcode || undefined,
    linkedMinibarItemId: row.linked_minibar_item_id || row.linkedMinibarItemId || undefined,
    linkedMenuItemId: row.linked_menu_item_id || row.linkedMenuItemId || undefined,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  } as InventoryItem;
}

export async function loadInventoryForMenu(): Promise<InventoryItem[]> {
  const { data, error } = await client()
    .from('inventory_items')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapInventory);
}

export async function createInventoryItemFromMenu(payload: InlineInventoryPayload): Promise<InventoryItem> {
  const { data, error } = await client().rpc('create_inventory_item_from_menu', { p_payload: payload });
  if (error) throw error;
  return mapInventory(data);
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
