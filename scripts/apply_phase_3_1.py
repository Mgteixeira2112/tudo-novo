from pathlib import Path
import re

p = Path('src/services/pagesData.ts')
s = p.read_text()
marker = 'export async function loadMenuItemsFromSupabase(): Promise<MenuItem[]> {'
addition = '''export async function createReservationAtomicInSupabase(data: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  document?: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  paymentMethod: Reservation['paymentMethod'];
  notes?: string;
}): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: row, error } = await supabase.rpc('create_reservation_atomic', {
    p_guest_name: data.guestName,
    p_guest_email: data.guestEmail,
    p_guest_phone: data.guestPhone,
    p_room_type_id: data.roomTypeId,
    p_check_in_date: data.checkInDate,
    p_check_out_date: data.checkOutDate,
    p_adults: data.adults,
    p_children: data.children,
    p_payment_method: data.paymentMethod,
    p_notes: data.notes || null
  });

  if (error) {
    const message = String(error.message || 'Erro ao criar reserva.');
    if (message.includes('Não há quarto disponível')) {
      throw new Error('Não há quarto disponível para este tipo e período.');
    }
    throw error;
  }

  const r: any = row;
  return {
    id: r.id,
    code: r.code,
    guestId: r.guest_id || '',
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone || '',
    roomId: r.room_id || '',
    roomNumber: r.room_number || '',
    roomTypeName: r.room_type_name,
    checkInDate: r.check_in_date,
    checkOutDate: r.check_out_date,
    nights: Number(r.nights || 0),
    adults: Number(r.adults || 0),
    children: Number(r.children || 0),
    pricePerNight: Number(r.price_per_night || 0),
    totalNightsAmount: Number(r.total_nights_amount || 0),
    status: r.status,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    notes: r.notes || undefined,
    createdAt: r.created_at,
    checkedInAt: r.checked_in_at || undefined,
    checkedOutAt: r.checked_out_at || undefined
  } as Reservation;
}

'''
if 'createReservationAtomicInSupabase' not in s:
    s = s.replace(marker, addition + marker)
p.write_text(s)

p = Path('src/services/api.ts')
s = p.read_text()
s = s.replace(
  "import { createKanbanTaskInSupabase, createKitchenOrderInSupabase, deleteKanbanTaskInSupabase, loadKanbanTasksFromSupabase, loadKitchenOrdersFromSupabase, loadMenuItemsFromSupabase, updateKanbanTaskInSupabase, updateKitchenOrderStatusInSupabase } from './pagesData.ts';",
  "import { createKanbanTaskInSupabase, createKitchenOrderInSupabase, createReservationAtomicInSupabase, deleteKanbanTaskInSupabase, loadKanbanTasksFromSupabase, loadKitchenOrdersFromSupabase, loadMenuItemsFromSupabase, updateKanbanTaskInSupabase, updateKitchenOrderStatusInSupabase } from './pagesData.ts';"
)
if 'function isGitHubPagesRuntime()' not in s:
    s = s.replace("const BASE_URL = '/api';", "const BASE_URL = '/api';\n\nfunction isGitHubPagesRuntime() {\n  return typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');\n}")
pattern = re.compile(r"  createReservation: \(data: \{.*?\n  updateReservation:", re.S)
replacement = '''  createReservation: (data: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    document?: string;
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    paymentMethod: Reservation['paymentMethod'];
    notes?: string;
  }) => {
    if (isGitHubPagesRuntime()) return createReservationAtomicInSupabase(data);
    return fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<Reservation>(r));
  },
  updateReservation:'''
s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('createReservation block not found exactly once')
p.write_text(s2)

d = Path('docs/FASE-03-01-RESERVAS-ATOMICAS.md')
d.write_text('''# FASE 3.1 — Reservas atômicas e proteção contra overbooking

## Implementado
- Constraint PostgreSQL `reservations_no_overbooking` com `daterange` `[check-in, check-out)`.
- Reservas `Pendente`, `Confirmada` e `CheckIn` não podem se sobrepor no mesmo quarto.
- RPC `create_reservation_atomic` seleciona e reserva o quarto em uma única transação.
- Advisory lock por tipo de quarto serializa a seleção concorrente.
- A RPC valida período, hóspedes, forma de pagamento, capacidade e indisponibilidade operacional.
- GitHub Pages usa a RPC diretamente; um backend hospedado continua usando `/api/reservations` e também é protegido pela constraint do banco.

## Teste de integridade executado
Foi usado um tipo com apenas um quarto. A primeira reserva de teste foi aceita, a segunda tentativa para o mesmo período foi bloqueada e a reserva de teste foi removida. Zero resíduos permaneceram no banco.
''')
