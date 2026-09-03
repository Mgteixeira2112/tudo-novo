create table if not exists public.hotel_settings (
  id text primary key default 'hotel_1',
  hotel_name text not null,
  tagline text,
  description text,
  logo_icon text,
  primary_color text,
  currency text not null default 'R$',
  tax_rate_percent numeric not null default 0,
  check_in_time text,
  check_out_time text,
  address text,
  city_state text,
  phone text,
  email text,
  booking_policies text,
  wifi_password text,
  room_types jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.guests (
  id text primary key,
  full_name text not null,
  document text,
  document_type text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  birth_date date,
  preferences text,
  allergies_notes text,
  status text not null default 'Ativo',
  total_stays integer not null default 0,
  total_spent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id text primary key,
  number text not null unique,
  type_id text not null,
  type_name text not null,
  floor integer not null default 1,
  status text not null default 'Disponivel',
  price_per_night numeric not null,
  capacity integer not null default 2,
  current_reservation_id text,
  current_guest_name text,
  amenities text[] not null default '{}',
  notes text
);

create table if not exists public.reservations (
  id text primary key,
  code text not null unique,
  guest_id text references public.guests(id) on delete set null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  room_id text references public.rooms(id) on delete set null,
  room_number text,
  room_type_name text not null,
  check_in_date date not null,
  check_out_date date not null,
  nights integer not null,
  adults integer not null default 1,
  children integer not null default 0,
  price_per_night numeric not null,
  total_nights_amount numeric not null,
  status text not null default 'Pendente',
  payment_status text not null default 'Pendente',
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  constraint reservation_dates_valid check (check_out_date > check_in_date),
  constraint reservation_guest_counts_valid check (adults >= 1 and children >= 0)
);

create table if not exists public.minibar_items (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null,
  stock_qty integer not null default 0,
  unit text not null default 'un'
);

create table if not exists public.room_consumptions (
  id text primary key,
  room_id text references public.rooms(id) on delete restrict,
  room_number text not null,
  reservation_id text references public.reservations(id) on delete set null,
  guest_name text,
  item_id text references public.minibar_items(id) on delete restrict,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null,
  total_price numeric not null,
  registered_by text,
  registered_at timestamptz not null default now(),
  status text not null default 'Lançado'
);

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null,
  description text,
  prep_time_minutes integer not null default 20,
  available boolean not null default true
);

create table if not exists public.kitchen_orders (
  id text primary key,
  order_number text not null unique,
  room_id text references public.rooms(id) on delete restrict,
  room_number text not null,
  reservation_id text references public.reservations(id) on delete set null,
  guest_name text,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null,
  delivery_fee numeric not null default 0,
  destination text not null default 'Quarto',
  delivery_sector text not null default 'Room Service',
  status text not null default 'Recebido',
  special_instructions text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.kanban_tasks (
  id text primary key,
  title text not null,
  description text,
  sector text not null,
  status text not null default 'A_Fazer',
  priority text not null default 'Media',
  room_number text,
  guest_name text,
  assigned_to text,
  related_type text,
  related_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id text primary key,
  type text not null,
  category text not null,
  description text not null,
  amount numeric not null,
  payment_method text,
  status text not null default 'Pago',
  reservation_id text references public.reservations(id) on delete set null,
  room_number text,
  guest_name text,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id text primary key,
  sku text not null unique,
  name text not null,
  sector text not null,
  category text not null,
  current_stock numeric not null default 0,
  min_stock numeric not null default 0,
  max_stock numeric,
  unit text not null,
  cost_price numeric not null default 0,
  selling_price numeric,
  supplier text,
  location_barcode text,
  linked_minibar_item_id text references public.minibar_items(id) on delete set null,
  linked_menu_item_id text references public.menu_items(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id text primary key,
  timestamp timestamptz not null default now(),
  item_id text references public.inventory_items(id) on delete restrict,
  item_name text not null,
  sector text not null,
  type text not null,
  quantity numeric not null,
  previous_stock numeric not null,
  new_stock numeric not null,
  unit_cost numeric not null default 0,
  total_cost numeric not null default 0,
  origin_location text,
  destination_location text,
  related_room_number text,
  related_reservation_id text references public.reservations(id) on delete set null,
  related_order_id text references public.kitchen_orders(id) on delete set null,
  operator text,
  document_number text,
  notes text
);

create index if not exists idx_reservations_dates on public.reservations(check_in_date, check_out_date);
create index if not exists idx_reservations_status on public.reservations(status);
create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_guests_email on public.guests(email);
create index if not exists idx_kanban_sector_status on public.kanban_tasks(sector, status);
create index if not exists idx_financial_date on public.financial_transactions(date);
create index if not exists idx_inventory_sector on public.inventory_items(sector);
create index if not exists idx_stock_movements_item_time on public.stock_movements(item_id, timestamp desc);

alter table public.hotel_settings enable row level security;
alter table public.guests enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.minibar_items enable row level security;
alter table public.room_consumptions enable row level security;
alter table public.menu_items enable row level security;
alter table public.kitchen_orders enable row level security;
alter table public.kanban_tasks enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
