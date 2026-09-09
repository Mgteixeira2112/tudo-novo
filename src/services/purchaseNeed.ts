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
  forecastDemand: number;
  safetyStock: number;
  suggestedQuantity: number;
  estimatedCost: number;
  reason: string;
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
    forecastDemand: num(row.forecast_demand),
    safetyStock: num(row.safety_stock),
    suggestedQuantity: num(row.suggested_quantity),
    estimatedCost: num(row.estimated_cost),
    reason: row.reason || ''
  }));
}
