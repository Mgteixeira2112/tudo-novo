from pathlib import Path
p=Path('src/services/pagesData.ts')
s=p.read_text()
old="""  const { data: row, error } = await supabase
    .from('hotel_settings')
    .select('hotel_name,tagline,description,logo_icon,primary_color,currency,tax_rate_percent,check_in_time,check_out_time,address,city_state,phone,email,booking_policies,room_types')
    .eq('id', 'hotel_1')
    .single();
  if (error) throw error;
"""
new="""  const { data: row, error } = await supabase.rpc('get_public_hotel_settings');
  if (error) throw error;
  if (!row) throw new Error('Configurações públicas do hotel não encontradas.');
"""
if old not in s:
    raise SystemExit('Trecho esperado não encontrado em pagesData.ts')
s=s.replace(old,new,1)
p.write_text(s)
