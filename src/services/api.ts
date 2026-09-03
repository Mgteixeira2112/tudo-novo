import {
  HotelSettings,
  Guest,
  Room,
  Reservation,
  MinibarItem,
  RoomMinibarConsumption,
  MenuItem,
  KitchenOrder,
  KanbanTask,
  FinancialTransaction,
  FinancialStats,
  SupabaseConfigStatus,
  InventoryItem,
  StockMovement,
  InventoryStats,
  StockMovementType,
  StaffUser
} from '../types.ts';

const BASE_URL = '/api';

let apiAccessToken: string | null = null;

export function setApiAccessToken(token?: string | null) {
  apiAccessToken = token || null;
}

function protectedHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(apiAccessToken ? { Authorization: `Bearer ${apiAccessToken}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Erro ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) errorMsg = body.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Settings
  getSettings: () => fetch(`${BASE_URL}/settings`).then(r => handleResponse<HotelSettings>(r)),
  updateSettings: (settings: Partial<HotelSettings>) =>
    fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(settings),
    }).then(r => handleResponse<HotelSettings>(r)),

  // Supabase Status & SQL
  getSupabaseStatus: () => fetch(`${BASE_URL}/supabase/status`).then(r => handleResponse<SupabaseConfigStatus>(r)),
  getSupabaseSQL: () => fetch(`${BASE_URL}/supabase/schema-sql`, { headers: protectedHeaders() }).then(r => r.text()),
  reconnectSupabase: () =>
    fetch(`${BASE_URL}/supabase/reconnect`, { method: 'POST', headers: protectedHeaders() }).then(r => handleResponse<SupabaseConfigStatus>(r)),

  // Guests
  getGuests: () => fetch(`${BASE_URL}/guests`).then(r => handleResponse<Guest[]>(r)),
  createGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'totalStays' | 'totalSpent'>) =>
    fetch(`${BASE_URL}/guests`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(guest),
    }).then(r => handleResponse<Guest>(r)),
  updateGuest: (id: string, guest: Partial<Guest>) =>
    fetch(`${BASE_URL}/guests/${id}`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(guest),
    }).then(r => handleResponse<Guest>(r)),
  deleteGuest: (id: string) =>
    fetch(`${BASE_URL}/guests/${id}`, { method: 'DELETE', headers: protectedHeaders() }).then(r => handleResponse<{ success: boolean }>(r)),

  // Rooms
  getRooms: () => fetch(`${BASE_URL}/rooms`).then(r => handleResponse<Room[]>(r)),
  createRoom: (room: Omit<Room, 'id'>) =>
    fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(room),
    }).then(r => handleResponse<Room>(r)),
  updateRoom: (id: string, room: Partial<Room>) =>
    fetch(`${BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(room),
    }).then(r => handleResponse<Room>(r)),
  updateRoomStatus: (id: string, status: Room['status'], notes?: string) =>
    fetch(`${BASE_URL}/rooms/${id}/status`, {
      method: 'PATCH',
      headers: protectedHeaders(),
      body: JSON.stringify({ status, notes }),
    }).then(r => handleResponse<Room>(r)),
  deleteRoom: (id: string) =>
    fetch(`${BASE_URL}/rooms/${id}`, { method: 'DELETE', headers: protectedHeaders() }).then(r => handleResponse<{ success: boolean }>(r)),

  // Reservations
  getReservations: () => fetch(`${BASE_URL}/reservations`).then(r => handleResponse<Reservation[]>(r)),
  createReservation: (data: {
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
  }) =>
    fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<Reservation>(r)),
  updateReservation: (id: string, updates: Partial<Reservation>) =>
    fetch(`${BASE_URL}/reservations/${id}`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(updates),
    }).then(r => handleResponse<Reservation>(r)),

  // Check-In & Check-Out
  processCheckIn: (data: {
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

  // Minibar
  getMinibarItems: () => fetch(`${BASE_URL}/minibar/items`).then(r => handleResponse<MinibarItem[]>(r)),
  createMinibarItem: (item: Omit<MinibarItem, 'id'>) =>
    fetch(`${BASE_URL}/minibar/items`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(item),
    }).then(r => handleResponse<MinibarItem>(r)),
  updateMinibarItem: (id: string, updates: Partial<MinibarItem>) =>
    fetch(`${BASE_URL}/minibar/items/${id}`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(updates),
    }).then(r => handleResponse<MinibarItem>(r)),
  restockMinibarItem: (id: string, quantityToAdd: number) =>
    fetch(`${BASE_URL}/minibar/items/${id}/restock`, {
      method: 'PATCH',
      headers: protectedHeaders(),
      body: JSON.stringify({ quantityToAdd }),
    }).then(r => handleResponse<MinibarItem>(r)),
  deleteMinibarItem: (id: string) =>
    fetch(`${BASE_URL}/minibar/items/${id}`, { method: 'DELETE', headers: protectedHeaders() }).then(r => handleResponse<{ success: boolean }>(r)),
  getRoomConsumptions: (roomId?: string) => {
    const url = roomId ? `${BASE_URL}/minibar/consumptions?roomId=${roomId}` : `${BASE_URL}/minibar/consumptions`;
    return fetch(url).then(r => handleResponse<RoomMinibarConsumption[]>(r));
  },
  registerMinibarConsumption: (data: {
    roomId: string;
    itemId: string;
    quantity: number;
    registeredBy: string;
  }) =>
    fetch(`${BASE_URL}/minibar/consumptions`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<RoomMinibarConsumption>(r)),

  // Kitchen & Room Service
  getMenuItems: () => fetch(`${BASE_URL}/kitchen/menu`).then(r => handleResponse<MenuItem[]>(r)),
  getOrders: () => fetch(`${BASE_URL}/kitchen/orders`).then(r => handleResponse<KitchenOrder[]>(r)),
  createOrder: (data: {
    roomId: string;
    items: { menuItemId: string; quantity: number; notes?: string }[];
    destination: 'Quarto' | 'Restaurante' | 'Piscina';
    deliverySector: 'Cozinha' | 'Room Service';
    specialInstructions?: string;
  }) =>
    fetch(`${BASE_URL}/kitchen/orders`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    })
      .then(r => handleResponse<KitchenOrder>(r))
      .then(order => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('hotel:new_room_service_order', {
              detail: order
            })
          );
        }
        return order;
      }),
  updateOrderStatus: (id: string, status: KitchenOrder['status']) =>
    fetch(`${BASE_URL}/kitchen/orders/${id}/status`, {
      method: 'PATCH',
      headers: protectedHeaders(),
      body: JSON.stringify({ status }),
    }).then(r => handleResponse<KitchenOrder>(r)),

  // Kanban Tasks
  getTasks: (sector?: string) => {
    const url = sector ? `${BASE_URL}/tasks?sector=${sector}` : `${BASE_URL}/tasks`;
    return fetch(url).then(r => handleResponse<KanbanTask[]>(r));
  },
  createTask: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(task),
    }).then(r => handleResponse<KanbanTask>(r)),
  updateTask: (id: string, updates: Partial<KanbanTask>) =>
    fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PATCH',
      headers: protectedHeaders(),
      body: JSON.stringify(updates),
    }).then(r => handleResponse<KanbanTask>(r)),
  deleteTask: (id: string) =>
    fetch(`${BASE_URL}/tasks/${id}`, { method: 'DELETE', headers: protectedHeaders() }).then(r => handleResponse<{ success: boolean }>(r)),

  // Financial Control
  getTransactions: () => fetch(`${BASE_URL}/financial/transactions`).then(r => handleResponse<FinancialTransaction[]>(r)),
  createTransaction: (tx: Omit<FinancialTransaction, 'id' | 'createdAt'>) =>
    fetch(`${BASE_URL}/financial/transactions`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(tx),
    }).then(r => handleResponse<FinancialTransaction>(r)),
  getFinancialStats: () => fetch(`${BASE_URL}/financial/stats`).then(r => handleResponse<FinancialStats>(r)),

  // Integrated Real-Time Inventory & Kardex
  getInventoryItems: (sector?: string, lowStock?: boolean) => {
    const params = new URLSearchParams();
    if (sector && sector !== 'ALL') params.append('sector', sector);
    if (lowStock) params.append('lowStock', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/inventory/items${query}`, { headers: protectedHeaders() }).then(r => handleResponse<InventoryItem[]>(r));
  },
  getInventoryItem: (id: string) => fetch(`${BASE_URL}/inventory/items/${id}`, { headers: protectedHeaders() }).then(r => handleResponse<InventoryItem>(r)),
  createInventoryItem: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) =>
    fetch(`${BASE_URL}/inventory/items`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(item),
    }).then(r => handleResponse<InventoryItem>(r)),
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) =>
    fetch(`${BASE_URL}/inventory/items/${id}`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(updates),
    }).then(r => handleResponse<InventoryItem>(r)),
  deleteInventoryItem: (id: string) =>
    fetch(`${BASE_URL}/inventory/items/${id}`, { method: 'DELETE', headers: protectedHeaders() }).then(r => handleResponse<{ success: boolean }>(r)),
  registerStockMovement: (data: {
    itemId: string;
    type: StockMovementType;
    quantity: number;
    unitCost?: number;
    originLocation?: string;
    destinationLocation?: string;
    relatedRoomNumber?: string;
    relatedReservationId?: string;
    operator?: string;
    documentNumber?: string;
    notes?: string;
  }) =>
    fetch(`${BASE_URL}/inventory/movements`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ item: InventoryItem; movement: StockMovement }>(r)),
  getStockMovements: (filters?: { itemId?: string; sector?: string; type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.itemId) params.append('itemId', filters.itemId);
    if (filters?.sector && filters.sector !== 'ALL') params.append('sector', filters.sector);
    if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/inventory/movements${query}`, { headers: protectedHeaders() }).then(r => handleResponse<StockMovement[]>(r));
  },
  getInventoryStats: () => fetch(`${BASE_URL}/inventory/stats`, { headers: protectedHeaders() }).then(r => handleResponse<InventoryStats>(r)),
  triggerReplenishmentOrder: (itemIds?: string[]) =>
    fetch(`${BASE_URL}/inventory/replenish-order`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify({ itemIds }),
    }).then(r => handleResponse<{ tasksCreated: number; estimatedCost: number }>(r)),

  // Staff Users & Auth (RBAC)
  me: () =>
    fetch(`${BASE_URL}/auth/me`, { headers: protectedHeaders() }).then(r => handleResponse<StaffUser>(r)),
  getUsers: () =>
    fetch(`${BASE_URL}/users`, { headers: protectedHeaders() }).then(r => handleResponse<StaffUser[]>(r)),
  createUser: (user: Omit<StaffUser, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(user),
    }).then(r => handleResponse<StaffUser>(r)),
  updateUser: (id: string, updates: Partial<StaffUser>) =>
    fetch(`${BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: protectedHeaders(),
      body: JSON.stringify(updates),
    }).then(r => handleResponse<StaffUser>(r)),
  deleteUser: (id: string) =>
    fetch(`${BASE_URL}/users/${id}`, { method: 'DELETE', headers: protectedHeaders() }).then(r => handleResponse<{ success: boolean }>(r)),
  login: (data: { email: string; password?: string; supabaseAuthId?: string }) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ user: StaffUser; token: string }>(r)),
  register: (data: {
    email: string;
    fullName: string;
    role?: string;
    sector?: string;
    phone?: string;
    permissions?: string[];
    supabaseAuthId?: string;
  }) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: protectedHeaders(),
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ user: StaffUser; token: string }>(r)),
};
