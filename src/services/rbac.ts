import { UserRole, UserSector, PermissionKey, StaffUser, AdminTab } from '../types.ts';

export interface RoleDefinition {
  role: UserRole;
  label: string;
  description: string;
  badgeColor: string;
  defaultPermissions: PermissionKey[];
  defaultSector: UserSector;
}

export interface SectorDefinition {
  sector: UserSector;
  label: string;
  description: string;
  defaultTab: AdminTab;
  accentColor: string;
}

type PermissionDefinition = {
  label: string;
  description: string;
  module: string;
  legacy?: boolean;
};

const p = (key: string) => key as PermissionKey;

export const GRANULAR_PERMISSION_KEYS = {
  manageRoomStatus: p('manage_room_status'),
  manageRoomRegistry: p('manage_room_registry'),
  viewMinibar: p('view_minibar'),
  manageMinibar: p('manage_minibar'),
  viewRoomService: p('view_room_service'),
  manageRoomService: p('manage_room_service'),
  viewKitchen: p('view_kitchen'),
  manageKitchen: p('manage_kitchen'),
  manageMenu: p('manage_menu'),
  manageHotelSettings: p('manage_hotel_settings'),
  manageRoomRates: p('manage_room_rates'),
  manageSystemSettings: p('manage_system_settings')
} as const;

export const LEGACY_PERMISSION_KEYS = new Set<PermissionKey>([
  'manage_rooms',
  'view_fnb',
  'manage_fnb',
  'manage_settings'
]);

const LEGACY_EXPANSIONS: Partial<Record<PermissionKey, PermissionKey[]>> = {
  manage_rooms: [GRANULAR_PERMISSION_KEYS.manageRoomStatus, GRANULAR_PERMISSION_KEYS.manageRoomRegistry],
  view_fnb: [GRANULAR_PERMISSION_KEYS.viewMinibar, GRANULAR_PERMISSION_KEYS.viewRoomService, GRANULAR_PERMISSION_KEYS.viewKitchen],
  manage_fnb: [
    GRANULAR_PERMISSION_KEYS.manageMinibar,
    GRANULAR_PERMISSION_KEYS.manageRoomService,
    GRANULAR_PERMISSION_KEYS.manageKitchen,
    GRANULAR_PERMISSION_KEYS.manageMenu
  ],
  manage_settings: [
    GRANULAR_PERMISSION_KEYS.manageHotelSettings,
    GRANULAR_PERMISSION_KEYS.manageRoomRates,
    GRANULAR_PERMISSION_KEYS.manageSystemSettings
  ]
};

const GRANULAR_TO_LEGACY = new Map<PermissionKey, PermissionKey>();
Object.entries(LEGACY_EXPANSIONS).forEach(([legacy, granular]) => {
  (granular || []).forEach(key => GRANULAR_TO_LEGACY.set(key, legacy as PermissionKey));
});

export function expandLegacyPermissions(permissions: PermissionKey[]): PermissionKey[] {
  const expanded = new Set<PermissionKey>(permissions);
  permissions.forEach(permission => {
    (LEGACY_EXPANSIONS[permission] || []).forEach(key => expanded.add(key));
  });
  return [...expanded];
}

export const SECTOR_DEFINITIONS: Record<UserSector, SectorDefinition> = {
  Geral: { sector: 'Geral', label: 'Diretoria & Gerência Geral', description: 'Gestão estratégica, governança executiva, relatórios e supervisão de todos os setores.', defaultTab: 'overview', accentColor: 'emerald' },
  Recepcao: { sector: 'Recepcao', label: 'Recepção & Front Desk', description: 'Acolhimento, reservas, check-in, check-out, cadastro de hóspedes e conciergerie.', defaultTab: 'checkinout', accentColor: 'amber' },
  Governanca: { sector: 'Governanca', label: 'Governança & Andares', description: 'Limpeza, arrumação de quartos, inspeções de enxoval, frigobar e kanban de camareiras.', defaultTab: 'rooms_inventory', accentColor: 'violet' },
  Cozinha: { sector: 'Cozinha', label: 'Cozinha & Alimentos', description: 'Preparo de pratos, controle de pedidos de A&B e gestão do subestoque de insumos culinários.', defaultTab: 'fnb', accentColor: 'rose' },
  RoomService: { sector: 'RoomService', label: 'Room Service & Bar', description: 'Atendimento e entrega de refeições, bebidas e amenidades diretamente nos quartos.', defaultTab: 'fnb', accentColor: 'amber' },
  Manutencao: { sector: 'Manutencao', label: 'Manutenção Predial', description: 'Ordens de serviço, reparos técnicos, ar-condicionado, hidráulica e bloqueio de unidades.', defaultTab: 'kanbans', accentColor: 'blue' },
  Financeiro: { sector: 'Financeiro', label: 'Controladoria & Financeiro', description: 'Contas a receber, fechamento de caixas, conciliação de pagamentos e faturamento geral.', defaultTab: 'overview', accentColor: 'emerald' }
};

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    role: 'admin', label: 'Administrador Geral / TI', description: 'Acesso irrestrito a todos os módulos, configurações globais, banco Supabase e gestão de equipe.', badgeColor: 'bg-[#2C3327] text-[#FDFBF7] border-[#2C3327]', defaultSector: 'Geral',
    defaultPermissions: [
      'view_overview','view_financial','manage_financial','view_rooms','manage_rooms',GRANULAR_PERMISSION_KEYS.manageRoomStatus,GRANULAR_PERMISSION_KEYS.manageRoomRegistry,
      'view_inventory','manage_inventory','view_kanbans','manage_all_kanbans','view_checkinout','manage_checkinout','view_guests','manage_guests','view_fnb','manage_fnb',
      GRANULAR_PERMISSION_KEYS.viewMinibar,GRANULAR_PERMISSION_KEYS.manageMinibar,GRANULAR_PERMISSION_KEYS.viewRoomService,GRANULAR_PERMISSION_KEYS.manageRoomService,
      GRANULAR_PERMISSION_KEYS.viewKitchen,GRANULAR_PERMISSION_KEYS.manageKitchen,GRANULAR_PERMISSION_KEYS.manageMenu,'manage_users','manage_settings',
      GRANULAR_PERMISSION_KEYS.manageHotelSettings,GRANULAR_PERMISSION_KEYS.manageRoomRates,GRANULAR_PERMISSION_KEYS.manageSystemSettings
    ]
  },
  gerente: {
    role: 'gerente', label: 'Gerente Operacional', description: 'Supervisão de todos os setores hoteleiros, liberação de quartos e auditoria operacional.', badgeColor: 'bg-[#3A5A40] text-white border-[#3A5A40]', defaultSector: 'Geral',
    defaultPermissions: [
      'view_overview','view_financial','view_rooms','manage_rooms',GRANULAR_PERMISSION_KEYS.manageRoomStatus,GRANULAR_PERMISSION_KEYS.manageRoomRegistry,
      'view_inventory','manage_inventory','view_kanbans','manage_all_kanbans','view_checkinout','manage_checkinout','view_guests','manage_guests','view_fnb','manage_fnb',
      GRANULAR_PERMISSION_KEYS.viewMinibar,GRANULAR_PERMISSION_KEYS.manageMinibar,GRANULAR_PERMISSION_KEYS.viewRoomService,GRANULAR_PERMISSION_KEYS.manageRoomService,
      GRANULAR_PERMISSION_KEYS.viewKitchen,GRANULAR_PERMISSION_KEYS.manageKitchen,GRANULAR_PERMISSION_KEYS.manageMenu,'manage_users'
    ]
  },
  recepcionista: {
    role: 'recepcionista', label: 'Recepcionista / Atendente', description: 'Operação de Check-in, Check-out, cadastro de hóspedes e visualização de quartos.', badgeColor: 'bg-[#D4A373] text-[#2C3327] border-[#B08968]', defaultSector: 'Recepcao',
    defaultPermissions: ['view_rooms','view_checkinout','manage_checkinout','view_guests','manage_guests','view_kanbans','view_fnb','manage_fnb',GRANULAR_PERMISSION_KEYS.viewRoomService,GRANULAR_PERMISSION_KEYS.manageRoomService]
  },
  governanca: {
    role: 'governanca', label: 'Governança / Camareira', description: 'Atualização de status de limpeza de quartos, lançamento de frigobar e kanban de governança.', badgeColor: 'bg-[#6B705C] text-white border-[#588157]', defaultSector: 'Governanca',
    defaultPermissions: ['view_rooms','manage_rooms',GRANULAR_PERMISSION_KEYS.manageRoomStatus,'view_kanbans','view_fnb','manage_fnb',GRANULAR_PERMISSION_KEYS.viewMinibar,GRANULAR_PERMISSION_KEYS.manageMinibar,'view_inventory']
  },
  cozinha_roomservice: {
    role: 'cozinha_roomservice', label: 'Cozinha & Room Service', description: 'Gestão de pedidos de alimentos, cardápio, status de preparo e subestoque culinário.', badgeColor: 'bg-[#BC6C25] text-white border-[#99582A]', defaultSector: 'Cozinha',
    defaultPermissions: ['view_fnb','manage_fnb',GRANULAR_PERMISSION_KEYS.viewRoomService,GRANULAR_PERMISSION_KEYS.manageRoomService,GRANULAR_PERMISSION_KEYS.viewKitchen,GRANULAR_PERMISSION_KEYS.manageKitchen,GRANULAR_PERMISSION_KEYS.manageMenu,'view_kanbans','view_inventory','manage_inventory']
  },
  manutencao: {
    role: 'manutencao', label: 'Técnico de Manutenção', description: 'Acompanhamento de chamados preventivos/corretivos, bloqueio técnico de quartos e peças.', badgeColor: 'bg-[#4A5759] text-white border-[#3D4035]', defaultSector: 'Manutencao',
    defaultPermissions: ['view_rooms','manage_rooms',GRANULAR_PERMISSION_KEYS.manageRoomStatus,'view_kanbans','view_inventory','manage_inventory']
  },
  financeiro: {
    role: 'financeiro', label: 'Analista Financeiro / Auditor', description: 'Acesso completo ao faturamento, fluxo de receitas, conciliação e relatórios de ocupação.', badgeColor: 'bg-[#588157] text-white border-[#3A5A40]', defaultSector: 'Financeiro',
    defaultPermissions: ['view_overview','view_financial','manage_financial','view_rooms','view_inventory','view_checkinout','view_guests']
  }
};

export const PERMISSION_DEFINITIONS: Record<string, PermissionDefinition> = {
  view_overview: { label: 'Visualizar Visão Geral & Métricas', description: 'Acesso aos gráficos executivos de ocupação, faturamento mensal e indicadores gerais.', module: 'Gestão' },
  view_financial: { label: 'Consultar Relatórios Financeiros', description: 'Visualização da DRE hoteleira, extrato de transações e formas de pagamento.', module: 'Gestão / Financeiro' },
  manage_financial: { label: 'Lançar e Editar Transações Financeiras', description: 'Criar novas despesas operacionais, estornos e conciliações de pagamento.', module: 'Gestão / Financeiro' },
  view_rooms: { label: 'Visualizar Operação dos Quartos', description: 'Consultar mapa de quartos e status operacionais em tempo real.', module: 'Operação de Quartos' },
  manage_room_status: { label: 'Alterar Status Operacional dos Quartos', description: 'Mudar status de limpeza, manutenção, disponibilidade e bloqueio conforme o fluxo operacional.', module: 'Operação de Quartos' },
  manage_room_registry: { label: 'Gerenciar Cadastro de Quartos', description: 'Criar, editar e excluir os dados cadastrais dos quartos.', module: 'Cadastros / Quartos' },
  manage_rooms: { label: 'Quartos — permissão antiga', description: 'Compatibilidade com perfis existentes; equivale a status operacional + cadastro de quartos.', module: 'Legado', legacy: true },
  view_inventory: { label: 'Consultar Estoque Integrado & Kardex', description: 'Visualizar níveis de estoque, valorização e histórico de movimentações.', module: 'Estoque' },
  manage_inventory: { label: 'Movimentar Estoque & Compras', description: 'Registrar entradas, perdas, transferências e reposições.', module: 'Estoque' },
  view_kanbans: { label: 'Visualizar Tarefas Operacionais', description: 'Acessar os quadros de tarefas operacionais permitidos ao colaborador.', module: 'Operações' },
  manage_all_kanbans: { label: 'Gerenciar Tarefas de Todos os Setores', description: 'Criar tarefas para qualquer setor, alterar prioridades e reatribuir responsáveis.', module: 'Operações' },
  view_checkinout: { label: 'Visualizar Recepção / Check-in e Check-out', description: 'Consultar hóspedes presentes, chegadas e partidas.', module: 'Recepção' },
  manage_checkinout: { label: 'Efetuar Check-in e Check-out', description: 'Registrar entrada, saída e fechamento da hospedagem.', module: 'Recepção' },
  view_guests: { label: 'Consultar Hóspedes', description: 'Acessar cadastro e informações permitidas dos hóspedes.', module: 'Recepção' },
  manage_guests: { label: 'Cadastrar e Editar Hóspedes', description: 'Criar e atualizar fichas de hóspedes.', module: 'Recepção' },
  view_minibar: { label: 'Visualizar Frigobar', description: 'Consultar itens, consumo e contexto operacional do frigobar.', module: 'A&B / Frigobar' },
  manage_minibar: { label: 'Lançar Consumo de Frigobar', description: 'Registrar consumos de frigobar vinculados aos quartos.', module: 'A&B / Frigobar' },
  view_room_service: { label: 'Visualizar Room Service', description: 'Consultar pedidos destinados ao Room Service.', module: 'A&B / Room Service' },
  manage_room_service: { label: 'Operar Room Service', description: 'Criar e atualizar pedidos destinados ao Room Service.', module: 'A&B / Room Service' },
  view_kitchen: { label: 'Visualizar Cozinha', description: 'Consultar fila de pedidos destinada à Cozinha.', module: 'A&B / Cozinha' },
  manage_kitchen: { label: 'Operar Cozinha', description: 'Criar e atualizar pedidos da Cozinha e seus status de preparo.', module: 'A&B / Cozinha' },
  manage_menu: { label: 'Gerenciar Cardápio', description: 'Cadastrar e alterar itens do cardápio.', module: 'Cadastros / Cardápio' },
  view_fnb: { label: 'A&B — visualização antiga', description: 'Compatibilidade com perfis existentes de Frigobar, Room Service e Cozinha.', module: 'Legado', legacy: true },
  manage_fnb: { label: 'A&B — gestão antiga', description: 'Compatibilidade com perfis existentes de Frigobar, Room Service, Cozinha e Cardápio.', module: 'Legado', legacy: true },
  manage_users: { label: 'Gerenciar Equipe & Permissões', description: 'Criar colaboradores, alterar setores, papéis e permissões.', module: 'Administração' },
  manage_hotel_settings: { label: 'Gerenciar Configurações do Hotel', description: 'Alterar identidade, contatos, horários, moeda, Wi-Fi e políticas.', module: 'Administração / Configurações' },
  manage_room_rates: { label: 'Gerenciar Tarifas & Acomodações', description: 'Alterar categorias e tarifas base das acomodações.', module: 'Cadastros / Tarifas' },
  manage_system_settings: { label: 'Gerenciar Sistema / Supabase', description: 'Acessar utilitários e informações técnicas de persistência.', module: 'Administração / Sistema' },
  manage_settings: { label: 'Configurações — permissão antiga', description: 'Compatibilidade com perfis existentes de configurações, tarifas e sistema.', module: 'Legado', legacy: true }
};

function isActiveStaffUser(user: StaffUser | null): boolean {
  if (!user) return false;
  const status = (user as any).status;
  if (status !== undefined && status !== null) return status === 'Ativo';
  const active = (user as any).active;
  if (typeof active === 'boolean') return active;
  return false;
}

export function hasPermission(user: StaffUser | null, permission: PermissionKey): boolean {
  if (!user || !isActiveStaffUser(user)) return false;
  if (user.role === 'admin') return true;
  if (user.permissions.includes(permission)) return true;
  const legacy = GRANULAR_TO_LEGACY.get(permission);
  return Boolean(legacy && user.permissions.includes(legacy));
}

export function canAccessTab(user: StaffUser | null, tab: AdminTab): boolean {
  if (!user || !isActiveStaffUser(user)) return false;
  if (user.role === 'admin') return true;

  switch (tab) {
    case 'overview': return hasPermission(user, 'view_overview') || hasPermission(user, 'view_financial');
    case 'rooms_inventory': return hasPermission(user, 'view_rooms') || hasPermission(user, 'view_inventory') || hasPermission(user, GRANULAR_PERMISSION_KEYS.manageRoomRegistry);
    case 'kanbans': return hasPermission(user, 'view_kanbans');
    case 'checkinout': return hasPermission(user, 'view_checkinout');
    case 'guests': return hasPermission(user, 'view_guests');
    case 'fnb': return hasPermission(user, 'view_fnb') || hasPermission(user, GRANULAR_PERMISSION_KEYS.viewMinibar) || hasPermission(user, GRANULAR_PERMISSION_KEYS.viewRoomService) || hasPermission(user, GRANULAR_PERMISSION_KEYS.viewKitchen);
    case 'users': return hasPermission(user, 'manage_users');
    case 'settings': return hasPermission(user, 'manage_settings') || hasPermission(user, GRANULAR_PERMISSION_KEYS.manageHotelSettings) || hasPermission(user, GRANULAR_PERMISSION_KEYS.manageRoomRates) || hasPermission(user, GRANULAR_PERMISSION_KEYS.manageSystemSettings);
    default: return true;
  }
}

export function getDefaultTabForUser(user: StaffUser | null): AdminTab {
  if (!user) return 'overview';
  const sectorDef = SECTOR_DEFINITIONS[user.sector];
  if (sectorDef && canAccessTab(user, sectorDef.defaultTab)) return sectorDef.defaultTab;
  const allTabs: AdminTab[] = ['overview','checkinout','rooms_inventory','kanbans','guests','fnb','users','settings'];
  return allTabs.find(tab => canAccessTab(user, tab)) || 'overview';
}
