import { getSupabaseClient } from './supabase.ts';

export interface PurchaseNeedItem {
  itemId: string;
  itemName: string;
  sector: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  consumptionToday: number;
  consumption7d: number;
  dailyAverage: number;
  menuForecastDemand: number;
  forecastDemand: number;
  safetyStock: number;
  suggestedQuantity: number;
  estimatedCost: number;
  reason: string;
}

export interface MenuDemandForecastSetup {
  menuItemId: string;
  menuItemName: string;
  ingredientCount: number;
  forecastQuantity: number;
}

const num = (value: unknown) => Number(value || 0);

export async function loadPurchaseNeedDashboard(): Promise<PurchaseNeedItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('get_purchase_need_dashboard');
  if (error) throw error;

  return (data || []).map((row: any) => ({
    itemId: row.item_id,
    itemName: row.item_name,
    sector: row.sector,
    unit: row.unit,
    currentStock: num(row.current_stock),
    minStock: num(row.min_stock),
    maxStock: num(row.max_stock),
    consumptionToday: num(row.consumption_today),
    consumption7d: num(row.consumption_7d),
    dailyAverage: num(row.daily_average),
    menuForecastDemand: num(row.menu_forecast_demand),
    forecastDemand: num(row.forecast_demand),
    safetyStock: num(row.safety_stock),
    suggestedQuantity: num(row.suggested_quantity),
    estimatedCost: num(row.estimated_cost),
    reason: row.reason || ''
  }));
}

export async function loadMenuDemandForecastSetup(forecastDate: string): Promise<MenuDemandForecastSetup[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('get_menu_demand_forecast_setup', {
    p_forecast_date: forecastDate
  });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name,
    ingredientCount: num(row.ingredient_count),
    forecastQuantity: num(row.forecast_quantity)
  }));
}

export async function setMenuDemandForecast(menuItemId: string, forecastDate: string, quantity: number): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { error } = await supabase.rpc('set_menu_item_demand_forecast', {
    p_menu_item_id: menuItemId,
    p_forecast_date: forecastDate,
    p_quantity: quantity
  });
  if (error) throw error;
}
