from pathlib import Path

# api.ts
p=Path('src/services/api.ts')
s=p.read_text()
import_line="import { createInventoryItemCloud, createMinibarItemCloud, createTransactionCloud, deleteInventoryItemCloud, deleteMinibarItemCloud, loadConsumptionsCloud, loadFinancialStatsCloud, loadInventoryItemCloud, loadInventoryItemsCloud, loadInventoryStatsCloud, loadMinibarItemsCloud, loadStockMovementsCloud, loadTransactionsCloud, registerConsumptionCloud, registerStockMovementCloud, restockMinibarItemCloud, updateInventoryItemCloud, updateMinibarItemCloud } from './financeInventoryPages.ts';"
if "./checkInOutPages.ts" not in s:
    s=s.replace(import_line, import_line+"\nimport { processCheckInAtomicCloud, processCheckOutAtomicCloud } from './checkInOutPages.ts';")
old="""  processCheckIn: (data: {
    reservationId: string;
    roomId: string;
    depositAmount?: number;
    paymentMethod?: Reservation['paymentMethod'];
    keyCardNumber?: string;
    notes?: string;
  }) =>
    fetch(`${BASE_URL}/checkin`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ reservation: Reservation; room: Room; task: KanbanTask }>(r)),

  processCheckOut: (data: {
    reservationId: string;
    paymentMethod: Reservation['paymentMethod'];
    amountPaid: number;
    discount?: number;
    inspectorName?: string;
    notes?: string;
  }) =>
    fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r =>
      handleResponse<{
        reservation: Reservation;
        room: Room;
        folio: {
          nightsTotal: number;
          minibarTotal: number;
          kitchenTotal: number;
          totalCharges: number;
          amountPaid: number;
          balance: number;
        };
        task: KanbanTask;
      }>(r)
    ),
"""
new="""  processCheckIn: (data: {
    reservationId: string;
    roomId: string;
    depositAmount?: number;
    paymentMethod?: Reservation['paymentMethod'];
    keyCardNumber?: string;
    notes?: string;
  }) => {
    if (isGitHubPagesRuntime()) return processCheckInAtomicCloud(data);
    return fetch(`${BASE_URL}/checkin`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ reservation: Reservation; room: Room; task: KanbanTask }>(r));
  },

  processCheckOut: (data: {
    reservationId: string;
    paymentMethod: Reservation['paymentMethod'];
    amountPaid: number;
    discount?: number;
    inspectorName?: string;
    notes?: string;
  }) => {
    if (isGitHubPagesRuntime()) return processCheckOutAtomicCloud(data);
    return fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r =>
      handleResponse<{
        reservation: Reservation;
        room: Room;
        folio: {
          nightsTotal: number;
          minibarTotal: number;
          kitchenTotal: number;
          totalCharges: number;
          priorPaid?: number;
          amountPaid: number;
          balance: number;
        };
        task: KanbanTask;
      }>(r)
    );
  },
"""
if old not in s: raise SystemExit('api checkin/out block not found')
s=s.replace(old,new,1)
p.write_text(s)

# CheckInCheckOutModal.tsx
p=Path('src/components/CheckInCheckOutModal.tsx')
s=p.read_text()
s=s.replace("const { rooms, reservations, settings, refreshData } = useHotel();","const { rooms, reservations, settings, transactions, refreshData } = useHotel();",1)
s=s.replace("const availableCleanRooms = rooms.filter(r => r.status === 'Disponivel');","const selectedReservation = reservations.find(r => r.id === selectedResId);\n  const availableCleanRooms = rooms.filter(r => r.status === 'Disponivel' && (!selectedReservation || r.typeName === selectedReservation.roomTypeName));",1)
old_tot="""  const nightsTotal = activeReservation ? activeReservation.totalNightsAmount : 0;
  const minibarTotal = roomConsumptions.reduce((acc, c) => acc + c.totalPrice, 0);
  const kitchenTotal = roomOrders.reduce((acc, o) => acc + o.totalAmount + (o.deliveryFee || 0), 0);
  const totalBill = Math.max(0, nightsTotal + minibarTotal + kitchenTotal - (checkoutDiscount || 0));
"""
new_tot="""  const nightsTotal = activeReservation ? activeReservation.totalNightsAmount : 0;
  const minibarTotal = roomConsumptions.filter(c => !activeReservation || c.reservationId === activeReservation.id).reduce((acc, c) => acc + c.totalPrice, 0);
  const kitchenTotal = roomOrders.filter(o => !activeReservation || o.reservationId === activeReservation.id).reduce((acc, o) => acc + o.totalAmount + (o.deliveryFee || 0), 0);
  const priorPaid = activeReservation
    ? transactions.filter(tx => tx.reservationId === activeReservation.id && tx.type === 'Receita' && tx.status === 'Pago').reduce((acc, tx) => acc + tx.amount, 0)
    : 0;
  const totalBill = Math.max(0, nightsTotal + minibarTotal + kitchenTotal - (checkoutDiscount || 0) - priorPaid);
"""
if old_tot not in s: raise SystemExit('checkout total block not found')
s=s.replace(old_tot,new_tot,1)
# add prior payment row before discount section
needle="""                  {/* Desconto */}
                  <div className=\"flex items-center justify-between p-2\">
"""
insert="""                  {priorPaid > 0 && (
                    <div className=\"flex items-center justify-between p-2 text-[#588157]\">
                      <span>Pagamentos já realizados:</span>
                      <span className=\"font-bold\">- {currency} {priorPaid.toLocaleString('pt-BR')}</span>
                    </div>
                  )}

                  {/* Desconto */}
                  <div className=\"flex items-center justify-between p-2\">
"""
if needle not in s: raise SystemExit('discount block not found')
s=s.replace(needle,insert,1)
p.write_text(s)

# server.ts: migrate protected endpoints from local dbManager to user-scoped Supabase RPC
p=Path('server.ts')
s=p.read_text()
old_checkin="""app.post('/api/checkin', requireSupabaseAuth, requirePermission('manage_checkinout'), (req: Request, res: Response) => {
  try {
    const result = dbManager.processCheckIn(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/checkout', requireSupabaseAuth, requirePermission('manage_checkinout'), (req: Request, res: Response) => {
  try {
    const result = dbManager.processCheckOut(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
"""
new_checkin="""app.post('/api/checkin', requireSupabaseAuth, requirePermission('manage_checkinout'), async (req: Request, res: Response) => {
  try {
    const authorization = req.header('authorization') || '';
    const token = authorization.split(' ')[1];
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key || !token) return res.status(503).json({ error: 'Supabase autenticado indisponível.' });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: result, error } = await client.rpc('process_checkin_atomic', {
      p_reservation_id: req.body.reservationId,
      p_room_id: req.body.roomId,
      p_deposit_amount: Number(req.body.depositAmount || 0),
      p_payment_method: req.body.paymentMethod || 'Cartao_Credito',
      p_key_card_number: req.body.keyCardNumber || null,
      p_notes: req.body.notes || null
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/checkout', requireSupabaseAuth, requirePermission('manage_checkinout'), async (req: Request, res: Response) => {
  try {
    const authorization = req.header('authorization') || '';
    const token = authorization.split(' ')[1];
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key || !token) return res.status(503).json({ error: 'Supabase autenticado indisponível.' });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: result, error } = await client.rpc('process_checkout_atomic', {
      p_reservation_id: req.body.reservationId,
      p_payment_method: req.body.paymentMethod,
      p_amount_paid: Number(req.body.amountPaid || 0),
      p_discount: Number(req.body.discount || 0),
      p_inspector_name: req.body.inspectorName || null,
      p_notes: req.body.notes || null
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
"""
if old_checkin not in s: raise SystemExit('server checkin/out block not found')
s=s.replace(old_checkin,new_checkin,1)
p.write_text(s)
