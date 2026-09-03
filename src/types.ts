export type SectorType = 'Recepcao' | 'Governanca' | 'Cozinha' | 'RoomService' | 'Manutencao';

export type TaskStatus = 'A_Fazer' | 'Em_Andamento' | 'Concluido';

export type TaskPriority = 'Baixa' | 'Media' | 'Alta' | 'Urgente';

export type RoomStatus = 'Disponivel' | 'Ocupado' | 'Limpeza' | 'Manutencao' | 'Bloqueado';

export type ReservationStatus = 'Pendente' | 'Confirmada' | 'CheckIn' | 'CheckOut' | 'Cancelada';

export type PaymentStatus = 'Pendente' | 'Parcial' | 'Pago';

export type PaymentMethod = 'PIX' | 'Cartao_Credito' | 'Cartao_Debito' | 'Dinheiro' | 'Faturado';

export interface RoomTypeConfig {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  amenities: string[];
  imageUrl?: string;
}

export interface HotelSettings {
  id: string;
  hotelName: string;
  tagline: string;
  description: string;
  logoIcon: string;
  primaryColor: string; // 'emerald' | 'blue' | 'amber' | 'violet' | 'rose' | 'slate'
  currency: string;
  taxRatePercent: number;
  checkInTime: string; // e.g. "14:00"
  checkOutTime: string; // e.g. "11:00"
  address: string;
  cityState: string;
  phone: string;
  email: string;
  bookingPolicies: string;
  wifiPassword?: string;
  roomTypes: RoomTypeConfig[];
}

export interface Guest {
  id: string;
  fullName: string;
  document: string;
  documentType: 'CPF' | 'Passaporte' | 'RG';
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  birthDate?: string;
  preferences: string;
  allergiesNotes: string;
  status: 'Ativo' | 'VIP' | 'Restricao';
  totalStays: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  number: string;
  typeId: string;
  typeName: string;
  floor: number;
  status: RoomStatus;
  pricePerNight: number;
  capacity: number;
  currentReservationId?: string;
  currentGuestName?: string;
  amenities: string[];
  notes?: string;
}

export interface Reservation {
  id: string;
  code: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  pricePerNight: number;
  totalNightsAmount: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export interface MinibarItem {
  id: string;
  name: string;
  category: 'Bebidas' | 'Snacks' | 'Doces' | 'Vinhos';
  price: number;
  stockQty: number;
  unit: string;
}

export interface RoomMinibarConsumption {
  id: string;
  roomId: string;
  roomNumber: string;
  reservationId: string;
  guestName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  registeredBy: string;
  registeredAt: string;
  status: 'Lançado' | 'Faturado';
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Café da Manhã' | 'Bebidas' | 'Lanches' | 'Pratos Principais' | 'Sobremesas';
  price: number;
  description: string;
  prepTimeMinutes: number;
  available: boolean;
}

export interface KitchenOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface KitchenOrder {
  id: string;
  orderNumber: string;
  roomId: string;
  roomNumber: string;
  reservationId: string;
  guestName: string;
  items: KitchenOrderItem[];
  totalAmount: number;
  deliveryFee: number;
  destination: 'Quarto' | 'Restaurante' | 'Piscina';
  deliverySector: 'Cozinha' | 'Room Service';
  status: 'Recebido' | 'Em Preparo' | 'Pronto' | 'Entregue' | 'Cancelado';
  specialInstructions?: string;
  createdAt: string;
  completedAt?: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  sector: SectorType;
  status: TaskStatus;
  priority: TaskPriority;
  roomNumber?: string;
  guestName?: string;
  assignedTo?: string;
  relatedType?: 'Reserva' | 'CheckIn' | 'CheckOut' | 'Frigobar' | 'Cozinha' | 'Manutencao' | 'Geral';
  relatedId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'Receita' | 'Despesa';
  category: 'Diarias' | 'Frigobar' | 'Cozinha' | 'RoomService' | 'Taxas' | 'Manutencao' | 'Operacional';
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: 'Pago' | 'Pendente';
  reservationId?: string;
  roomNumber?: string;
  guestName?: string;
  date: string;
  createdAt: string;
}

export interface FinancialStats {
  totalRevenueMonth: number;
  totalRevenueToday: number;
  totalPendingFolios: number;
  totalExpensesMonth: number;
  netIncomeMonth: number;
  byCategory: {
    category: string;
    amount: number;
    count: number;
  }[];
  byPaymentMethod: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  dailyRevenueLast7Days: {
    date: string;
    label: string;
    amount: number;
  }[];
}

export interface SupabaseConfigStatus {
  connected: boolean;
  urlConfigured: boolean;
  mode: 'supabase_cloud' | 'local_sql_engine';
  message: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  tableCounts?: {
    settings: number;
    guests: number;
    rooms: number;
    reservations: number;
    kanban_tasks: number;
    orders: number;
    financial_transactions: number;
  };
}

// -------------------------------------------------------------
// Integrated Real-Time Inventory & Kardex Types
// -------------------------------------------------------------
export type InventorySector =
  | 'Almoxarifado'
  | 'Frigobar'
  | 'Alimentos_Bebidas'
  | 'Governanca_Enxoval'
  | 'Manutencao';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  sector: InventorySector;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  costPrice: number;
  sellingPrice?: number;
  supplier?: string;
  locationBarcode?: string;
  linkedMinibarItemId?: string;
  linkedMenuItemId?: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'Entrada_Compra'
  | 'Saida_Consumo_Quarto'
  | 'Saida_Venda_A_B'
  | 'Saida_Uso_Interno'
  | 'Transferencia'
  | 'Perda_Avaria'
  | 'Ajuste_Inventario';

export interface StockMovement {
  id: string;
  timestamp: string;
  itemId: string;
  itemName: string;
  sector: InventorySector;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  totalCost: number;
  originLocation?: string;
  destinationLocation?: string;
  relatedRoomNumber?: string;
  relatedReservationId?: string;
  relatedOrderId?: string;
  operator: string;
  documentNumber?: string;
  notes?: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValuation: number;
  criticalStockCount: number;
  replenishmentSuggestedCount: number;
  movementsToday: number;
  bySector: {
    sector: InventorySector;
    count: number;
    valuation: number;
  }[];
}

// -------------------------------------------------------------
// Supabase Auth & Sector-Based User Management Types (RBAC)
// -------------------------------------------------------------
export type UserRole =
  | 'admin'
  | 'gerente'
  | 'recepcionista'
  | 'governanca'
  | 'cozinha_roomservice'
  | 'manutencao'
  | 'financeiro';

export type UserSector =
  | 'Geral'
  | 'Recepcao'
  | 'Governanca'
  | 'Cozinha'
  | 'RoomService'
  | 'Manutencao'
  | 'Financeiro';

export type UserStatus = 'Ativo' | 'Inativo' | 'Bloqueado';

export type PermissionKey =
  | 'view_overview'
  | 'view_financial'
  | 'manage_financial'
  | 'view_rooms'
  | 'manage_rooms'
  | 'view_inventory'
  | 'manage_inventory'
  | 'view_kanbans'
  | 'manage_all_kanbans'
  | 'view_checkinout'
  | 'manage_checkinout'
  | 'view_guests'
  | 'manage_guests'
  | 'view_fnb'
  | 'manage_fnb'
  | 'manage_users'
  | 'manage_settings';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  sector: UserSector;
  status: UserStatus;
  phone?: string;
  avatarUrl?: string;
  permissions: PermissionKey[];
  supabaseAuthId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminTab =
  | 'overview'
  | 'rooms_inventory'
  | 'kanbans'
  | 'checkinout'
  | 'guests'
  | 'fnb'
  | 'users'
  | 'settings';

