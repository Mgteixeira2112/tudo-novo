from pathlib import Path
import re

# Frigobar: trocar fluxo multi-step pela RPC atômica
p=Path('src/services/financeInventoryPages.ts')
s=p.read_text()
pat=r"export async function registerConsumptionCloud\(input:\{roomId:string;itemId:string;quantity:number;registeredBy:string\}\)\{.*?\nexport async function loadTransactionsCloud"
rep="""export async function registerConsumptionCloud(input:{roomId:string;itemId:string;quantity:number;registeredBy:string}){
  const s=client();
  const qty=Math.max(1,Math.floor(num(input.quantity)));
  const {data,error}=await s.rpc('register_minibar_consumption_atomic',{
    p_room_id:input.roomId,
    p_item_id:input.itemId,
    p_quantity:qty,
    p_registered_by:input.registeredBy||'Sistema'
  });
  if(error)throw error;
  return mapCons(data);
}
export async function loadTransactionsCloud"""
s2,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'registerConsumptionCloud replace count={n}')
p.write_text(s2)

# Room Service: trocar create multi-step pela RPC atômica
p=Path('src/services/pagesData.ts')
s=p.read_text()
pat=r"export async function createKitchenOrderInSupabase\(input:\{roomId:string;items:\{menuItemId:string;quantity:number;notes\?:string\}\[\];destination:'Quarto'\|'Restaurante'\|'Piscina';deliverySector:'Cozinha'\|'Room Service';specialInstructions\?:string\}\):Promise<KitchenOrder>\{.*?\nexport async function updateKitchenOrderStatusInSupabase"
rep="""export async function createKitchenOrderInSupabase(input:{roomId:string;items:{menuItemId:string;quantity:number;notes?:string}[];destination:'Quarto'|'Restaurante'|'Piscina';deliverySector:'Cozinha'|'Room Service';specialInstructions?:string}):Promise<KitchenOrder>{
  const supabase=getSupabaseClient(); if(!supabase) throw new Error('Supabase não configurado.');
  const {data,error}=await supabase.rpc('create_kitchen_order_atomic',{
    p_room_id:input.roomId,
    p_items:input.items,
    p_destination:input.destination,
    p_delivery_sector:input.deliverySector,
    p_special_instructions:input.specialInstructions||null
  });
  if(error)throw error;
  return mapKitchenOrderRow(data);
}
export async function updateKitchenOrderStatusInSupabase"""
s2,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'createKitchenOrder replace count={n}')
p.write_text(s2)

# Backend Express: Room Service autenticado usa a mesma RPC atômica
p=Path('server.ts')
s=p.read_text()
pat=r"app\.post\('/api/kitchen/orders', publicRoomServiceLimiter, async \(req: Request, res: Response\) => \{.*?\n\}\);\n\napp\.patch\('/api/kitchen/orders/:id/status'"
rep="""app.post('/api/kitchen/orders', publicRoomServiceLimiter, requireSupabaseAuth, requirePermission('manage_fnb'), async (req: Request, res: Response) => {
  try {
    const payload = sanitizePublicOrder(req.body);
    const authorization = req.header('authorization') || '';
    const token = authorization.split(' ')[1];
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key || !token) return res.status(503).json({ error: 'Supabase autenticado indisponível.' });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: order, error } = await client.rpc('create_kitchen_order_atomic', {
      p_room_id: payload.roomId,
      p_items: payload.items,
      p_destination: payload.destination,
      p_delivery_sector: payload.deliverySector,
      p_special_instructions: payload.specialInstructions || null
    });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/kitchen/orders/:id/status'"""
s2,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'server kitchen route replace count={n}')
p.write_text(s2)

# trigger
