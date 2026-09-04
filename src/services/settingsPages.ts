import { HotelSettings } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

function mapSettingsRow(row: any): HotelSettings {
  return {
    id: row.id,
    hotelName: row.hotel_name,
    tagline: row.tagline || '',
    description: row.description || '',
    logoIcon: row.logo_icon || 'hotel',
    primaryColor: row.primary_color || 'emerald',
    currency: row.currency || 'R$',
    taxRatePercent: Number(row.tax_rate_percent || 0),
    checkInTime: row.check_in_time || '14:00',
    checkOutTime: row.check_out_time || '11:00',
    address: row.address || '',
    cityState: row.city_state || '',
    phone: row.phone || '',
    email: row.email || '',
    bookingPolicies: row.booking_policies || '',
    wifiPassword: row.wifi_password || '',
    roomTypes: Array.isArray(row.room_types) ? row.room_types : []
  };
}

export async function loadSettingsCloud(): Promise<HotelSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('get_hotel_settings_admin');
  if (error) throw error;
  if (!data) throw new Error('Configurações do hotel não encontradas.');
  return mapSettingsRow(data);
}

export async function updateSettingsCloud(
  updates: Partial<HotelSettings>
): Promise<HotelSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('update_hotel_settings_safe', {
    p_updates: {
      ...(updates.hotelName !== undefined ? { hotel_name: updates.hotelName } : {}),
      ...(updates.tagline !== undefined ? { tagline: updates.tagline } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.logoIcon !== undefined ? { logo_icon: updates.logoIcon } : {}),
      ...(updates.primaryColor !== undefined ? { primary_color: updates.primaryColor } : {}),
      ...(updates.currency !== undefined ? { currency: updates.currency } : {}),
      ...(updates.taxRatePercent !== undefined ? { tax_rate_percent: updates.taxRatePercent } : {}),
      ...(updates.checkInTime !== undefined ? { check_in_time: updates.checkInTime } : {}),
      ...(updates.checkOutTime !== undefined ? { check_out_time: updates.checkOutTime } : {}),
      ...(updates.address !== undefined ? { address: updates.address } : {}),
      ...(updates.cityState !== undefined ? { city_state: updates.cityState } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
      ...(updates.email !== undefined ? { email: updates.email } : {}),
      ...(updates.bookingPolicies !== undefined ? { booking_policies: updates.bookingPolicies } : {}),
      ...(updates.wifiPassword !== undefined ? { wifi_password: updates.wifiPassword } : {}),
      ...(updates.roomTypes !== undefined ? { room_types: updates.roomTypes } : {})
    }
  });

  if (error) throw error;
  if (!data) throw new Error('Configurações não retornadas após a atualização.');
  return mapSettingsRow(data);
}
