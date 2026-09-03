from pathlib import Path

p=Path('src/services/pagesData.ts')
s=p.read_text()
s=s.replace("import { KanbanTask, KitchenOrder, MenuItem, Reservation, Room } from '../types.ts';", "import { HotelSettings, KanbanTask, KitchenOrder, MenuItem, Reservation, Room } from '../types.ts';")
insert="""
export async function loadPublicSettingsFromSupabase(): Promise<HotelSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: row, error } = await supabase
    .from('hotel_settings')
    .select('hotel_name,tagline,description,logo_icon,primary_color,currency,tax_rate_percent,check_in_time,check_out_time,address,city_state,phone,email,booking_policies,room_types')
    .eq('id', 'hotel_1')
    .single();
  if (error) throw error;

  return {
    hotelName: row.hotel_name,
    tagline: row.tagline || '',
    description: row.description || '',
    logoIcon: row.logo_icon || 'hotel',
    primaryColor: row.primary_color || 'emerald',
    currency: row.currency || 'R$',
    taxRatePercent: Number(row.tax_rate_percent || 0),
    checkInTime: row.check_in_time || '14:00',
    checkOutTime: row.check_out_time || '11:00',
    address: row.city_state ? `${row.address || ''} • ${row.city_state}` : (row.address || ''),
    phone: row.phone || '',
    email: row.email || '',
    bookingPolicies: row.booking_policies || '',
    roomTypes: Array.isArray(row.room_types) ? row.room_types : []
  } as HotelSettings;
}

"""
marker="export async function loadRoomsFromSupabase(): Promise<Room[]> {"
if 'loadPublicSettingsFromSupabase' not in s:
    s=s.replace(marker, insert+marker)
p.write_text(s)

p=Path('src/services/api.ts')
s=p.read_text()
s=s.replace("createKanbanTaskInSupabase, createKitchenOrderInSupabase, createReservationAtomicInSupabase, deleteKanbanTaskInSupabase, loadKanbanTasksFromSupabase, loadKitchenOrdersFromSupabase, loadMenuItemsFromSupabase, updateKanbanTaskInSupabase, updateKitchenOrderStatusInSupabase", "createKanbanTaskInSupabase, createKitchenOrderInSupabase, createReservationAtomicInSupabase, deleteKanbanTaskInSupabase, loadKanbanTasksFromSupabase, loadKitchenOrdersFromSupabase, loadMenuItemsFromSupabase, loadPublicSettingsFromSupabase, updateKanbanTaskInSupabase, updateKitchenOrderStatusInSupabase")
s=s.replace("getPublicSettings: () => fetch(`${BASE_URL}/public/settings`).then(r => handleResponse<HotelSettings>(r)),", "getPublicSettings: () => isGitHubPagesRuntime() ? loadPublicSettingsFromSupabase() : fetch(`${BASE_URL}/public/settings`).then(r => handleResponse<HotelSettings>(r)),")
p.write_text(s)

# trigger
