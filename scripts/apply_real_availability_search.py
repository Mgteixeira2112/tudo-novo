from pathlib import Path
p=Path('src/components/OnlineBookingEngine.tsx')
s=p.read_text()
s=s.replace("import { api } from '../services/api.ts';", "import { api } from '../services/api.ts';\nimport { getSupabaseClient } from '../services/supabase.ts';")
s=s.replace("  const [errorMessage, setErrorMessage] = useState<string | null>(null);", "  const [errorMessage, setErrorMessage] = useState<string | null>(null);\n  const [availability, setAvailability] = useState<Record<string, number> | null>(null);\n  const [searchingAvailability, setSearchingAvailability] = useState(false);\n  const [availabilityError, setAvailabilityError] = useState<string | null>(null);")
old="""  const handleSearchAvailability = () => {\n    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {\n      setErrorMessage('Selecione uma data de saída posterior à data de entrada.');\n      return;\n    }\n    setErrorMessage(null);\n    document.getElementById('available-room-types')?.scrollIntoView({ behavior: 'smooth', block: 'start' });\n  };\n"""
new="""  const handleSearchAvailability = async () => {\n    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {\n      setAvailabilityError('Selecione uma data de saída posterior à data de entrada.');\n      return;\n    }\n\n    try {\n      setSearchingAvailability(true);\n      setAvailabilityError(null);\n      const supabase = getSupabaseClient();\n      if (!supabase) throw new Error('Supabase não configurado.');\n\n      const { data, error } = await supabase.rpc('get_available_room_types', {\n        p_check_in: checkInDate,\n        p_check_out: checkOutDate,\n        p_adults: adults,\n        p_children: children\n      });\n      if (error) throw error;\n\n      const nextAvailability: Record<string, number> = {};\n      for (const row of data || []) {\n        if (row?.type_id) nextAvailability[String(row.type_id)] = Number(row.available_count || 0);\n      }\n      setAvailability(nextAvailability);\n      requestAnimationFrame(() => {\n        document.getElementById('available-room-types')?.scrollIntoView({ behavior: 'smooth', block: 'start' });\n      });\n    } catch (err: any) {\n      console.error('Availability search error:', err);\n      setAvailability(null);\n      setAvailabilityError(err?.message || 'Não foi possível consultar a disponibilidade.');\n    } finally {\n      setSearchingAvailability(false);\n    }\n  };\n"""
if old not in s: raise SystemExit('old availability handler not found')
s=s.replace(old,new,1)
# invalidate prior results whenever search criteria changes
s=s.replace("onChange={e => setCheckInDate(e.target.value)}", "onChange={e => { setCheckInDate(e.target.value); setAvailability(null); setAvailabilityError(null); }}",1)
s=s.replace("onChange={e => setCheckOutDate(e.target.value)}", "onChange={e => { setCheckOutDate(e.target.value); setAvailability(null); setAvailabilityError(null); }}",1)
s=s.replace("onChange={e => setAdults(Number(e.target.value))}", "onChange={e => { setAdults(Number(e.target.value)); setAvailability(null); setAvailabilityError(null); }}",1)
s=s.replace("onChange={e => setChildren(Number(e.target.value))}", "onChange={e => { setChildren(Number(e.target.value)); setAvailability(null); setAvailabilityError(null); }}",1)
# search button loading state
s=s.replace("onClick={handleSearchAvailability}\n            className=", "onClick={handleSearchAvailability}\n            disabled={searchingAvailability}\n            className=",1)
s=s.replace("<Search className=\"w-4 h-4\" />\n            <span>Buscar disponibilidade</span>", "<Search className={`w-4 h-4 ${searchingAvailability ? 'animate-pulse' : ''}`} />\n            <span>{searchingAvailability ? 'Buscando...' : 'Buscar disponibilidade'}</span>",1)
# add search feedback after heading text
needle="""          <p className=\"text-sm text-[#6B705C] mt-1\">\n            Selecione a categoria ideal para sua estadia com café da manhã incluso e cancelamento flexível.\n          </p>\n"""
replacement=needle+"""          {availabilityError && (\n            <p className=\"mt-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3\">\n              {availabilityError}\n            </p>\n          )}\n          {availability && (\n            <p className=\"mt-2 text-sm font-medium text-[#588157]\">\n              Resultado atualizado para {checkInDate.split('-').reverse().join('/')} a {checkOutDate.split('-').reverse().join('/')} · {adults} adulto{adults > 1 ? 's' : ''}{children ? ` · ${children} criança${children > 1 ? 's' : ''}` : ''}\n            </p>\n          )}\n"""
if needle not in s: raise SystemExit('room heading needle not found')
s=s.replace(needle,replacement,1)
# filter cards
oldmap="{settings?.roomTypes.map(roomType => {"
newmap="{(settings?.roomTypes || []).filter(roomType => availability === null || (availability[roomType.id] || 0) > 0).map(roomType => {"
if oldmap not in s: raise SystemExit('room map not found')
s=s.replace(oldmap,newmap,1)
# add availability badge on card near capacity badge
badge="""                    <div className=\"absolute top-3 right-3 bg-[#2C3327]/85 backdrop-blur-sm text-[#FDFBF7] px-2.5 py-1 rounded-full text-xs font-semibold\">\n                      Até {roomType.capacityAdults} adultos\n                    </div>\n"""
newbadge=badge+"""                    {availability && (\n                      <div className=\"absolute top-3 left-3 bg-[#FDFBF7]/95 text-[#2C3327] px-2.5 py-1 rounded-full text-xs font-bold shadow-sm\">\n                        {availability[roomType.id]} {availability[roomType.id] === 1 ? 'disponível' : 'disponíveis'}\n                      </div>\n                    )}\n"""
if badge not in s: raise SystemExit('capacity badge not found')
s=s.replace(badge,newbadge,1)
# no result state before grid close, by replacing grid opener with wrapper? easiest add message before grid
marker="""        <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5\">\n"""
message="""        {availability && Object.values(availability).every(count => count <= 0) && (\n          <div className=\"bg-white border border-[#E6E3D8] rounded-2xl p-6 text-center\">\n            <p className=\"font-bold text-[#2C3327]\">Nenhuma acomodação disponível para estes filtros.</p>\n            <p className=\"text-sm text-[#6B705C] mt-1\">Altere as datas ou a quantidade de hóspedes e faça uma nova busca.</p>\n          </div>\n        )}\n\n"""+marker
if marker not in s: raise SystemExit('grid marker not found')
s=s.replace(marker,message,1)
p.write_text(s)
