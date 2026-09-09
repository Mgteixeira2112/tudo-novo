import { getSupabaseClient } from './supabase.ts';

export interface OperationalForecastSignals {
  totalRooms: number;
  expectedRooms: number;
  expectedGuests: number;
  occupancyPct: number;
  checkins: number;
  checkouts: number;
  historicalGuestNights28d: number;
  sameWeekdaySampleDays: number;
  seasonality: string;
  events: string;
}

export interface OperationalForecastRecipe {
  menuItemId: string;
  menuItemName: string;
  manualForecast: number;
  historicalUnits28d: number;
  ratePerGuest: number;
  weekdayFactor: number;
  suggestedUnits: number;
  confidence: 'Alta' | 'Média' | 'Baixa';
  reason: string;
}

export interface OperationalForecast {
  targetDate: string;
  signals: OperationalForecastSignals;
  recipes: OperationalForecastRecipe[];
  methodology: string;
}

const num = (value: unknown) => Number(value || 0);

export async function loadOperationalForecast(targetDate: string): Promise<OperationalForecast> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('get_operational_forecast', {
    p_target_date: targetDate
  });
  if (error) throw error;

  const raw: any = data || {};
  const signals = raw.signals || {};
  return {
    targetDate: raw.target_date || targetDate,
    methodology: raw.methodology || '',
    signals: {
      totalRooms: num(signals.total_rooms),
      expectedRooms: num(signals.expected_rooms),
      expectedGuests: num(signals.expected_guests),
      occupancyPct: num(signals.occupancy_pct),
      checkins: num(signals.checkins),
      checkouts: num(signals.checkouts),
      historicalGuestNights28d: num(signals.historical_guest_nights_28d),
      sameWeekdaySampleDays: num(signals.same_weekday_sample_days),
      seasonality: signals.seasonality || '',
      events: signals.events || ''
    },
    recipes: (raw.recipes || []).map((row: any) => ({
      menuItemId: row.menu_item_id,
      menuItemName: row.menu_item_name,
      manualForecast: num(row.manual_forecast),
      historicalUnits28d: num(row.historical_units_28d),
      ratePerGuest: num(row.rate_per_guest),
      weekdayFactor: num(row.weekday_factor),
      suggestedUnits: num(row.suggested_units),
      confidence: row.confidence || 'Baixa',
      reason: row.reason || ''
    }))
  };
}
