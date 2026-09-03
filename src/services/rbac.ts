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

export const SECTOR_DEFINITIONS: Record<UserSector, SectorDefinition> = {
  Geral: {
    sector: 'Geral',
    label: 'Diretoria & Gerência Geral',
    description: 'Gestão estratégica, governança executiva, relatórios e supervisão de todos os setores.',
    defaultTab: 'overview',
    accentColor: 'emerald'
  },
  Recepcao: {
    sector: 'Recepcao',
    label: 'Recepção & Front Desk',
    description: 'Acolhimento, reservas, check-in, check-out, cadastro de hóspedes e conciergerie.',
    defaultTab: 'checkinout',
    accentColor: 'amber'
  },
  Governanca: {
    sector: 'Governanca',
    label: 'Governança & Andares',
    description: 'Limpeza, arrumação de quartos, inspeções de enxoval, frigobar e kanban de camareiras.',
    defaultTab: 'rooms_inventory',
    accentColor: 'violet'
  },
  Cozinha: {
    sector: 'Cozinha',
    label: 'Cozinha & Alimentos',
    description: 'Preparo de pratos, controle de pedidos de A&B e gestão do subestoque de insumos culinários.',
    defaultTab: 'fnb',
    accentColor: 'rose'
  },
  RoomService: {
    sector: 'RoomService',
    label: 'Room Service & Bar',
    description: 'Atendimento e entrega de refeições, bebidas e amenidades diretamente nos quartos.',
    defaultTab: 'fnb',
    accentColor: 'amber'
  },
  Manutencao: {
    sector: 'Manutencao',
    label: 'Manutenção Predial',
    description: 'Ordens de serviço, reparos técnicos, ar-condicionado, hidráulica e bloqueio de unidades.',
    defaultTab: 'kanbans',
    accentColor: 'blue'
  },
  Financeiro: {
    sector: 'Financeiro',
    label: 'Controladoria & Financeiro',
    description: 'Contas a receber, fechamento de caixas, conciliação de pagamentos e faturamento geral.',
    defaultTab: 'overview',
    accentColor: 'emerald'
  }
};

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    role: 'admin',
    label: 'Administrador Geral / TI',
    description: 'Acesso irrestrito a todos os módulos, configurações globais, banco Supabase e gestão de equipe.',
    badgeColor: 'bg-[#2C3327] text-[#FDFBF7] border-[#2C3327]',
    defaultSector: 'Geral',
    defaultPermissions: [
      'view_overview',
      'view_financial',
      'manage_financial',
      'view_rooms',
      'manage_rooms',
      'view_inventory',
      'manage_inventory',
      'view_kanbans',
      'manage_all_kanbans',
      'view_checkinout',
      'manage_checkinout',
      'view_guests',
      'manage_guests',
      'view_fnb',
      'manage_fnb',
      'manage_users',
      'manage_settings'
    ]
  },
  gerente: {
    role: 'gerente',
    label: 'Gerente Operacional',
    description: 'Supervisão de todos os setores hoteleiros, liberação de quartos e auditoria operacional.',
    badgeColor: 'bg-[#3A5A40] text-white border-[#3A5A40]',
    defaultSector: 'Geral',
    defaultPermissions: [
      'view_overview',
      'view_financial',
      'view_rooms',
      'manage_rooms',
      'view_inventory',
      'manage_inventory',
      'view_kanbans',
      'manage_all_kanbans',
      'view_checkinout',
      'manage_checkinout',
      'view_guests',
      'manage_guests',
      'view_fnb',
      'manage_fnb',
      'manage_users'
    ]
  },
  recepcionista: {
    role: 'recepcionista',
    label: 'Recepcionista / Atendente',
    description: 'Operação de Check-in, Check-out, cadastro de hóspedes e visualização de quartos.',
    badgeColor: 'bg-[#D4A373] text-[#2C3327] border-[#B08968]',
    defaultSector: 'Recepcao',
    defaultPermissions: [
      'view_rooms',
      'view_checkinout',
      'manage_checkinout',
      'view_guests',
      'manage_guests',
      'view_kanbans',
      'view_fnb',
      'manage_fnb'
    ]
  },
  governanca: {
    role: 'governanca',
    label: 'Governança / Camareira',
    description: 'Atualização de status de limpeza de quartos, lançamento de frigobar e kanban de governança.',
    badgeColor: 'bg-[#6B705C] text-white border-[#588157]',
    defaultSector: 'Governanca',
    defaultPermissions: [
      'view_rooms',
      'manage_rooms',
      'view_kanbans',
      'view_fnb',
      'manage_fnb',
      'view_inventory'
    ]
  },
  cozinha_roomservice: {
    role: 'cozinha_roomservice',
    label: 'Cozinha & Room Service',
    description: 'Gestão de pedidos de alimentos, cardápio, status de preparo e subestoque culinário.',
    badgeColor: 'bg-[#BC6C25] text-white border-[#99582A]',
    defaultSector: 'Cozinha',
    defaultPermissions: [
      'view_fnb',
      'manage_fnb',
      'view_kanbans',
      'view_inventory',
      'manage_inventory'
    ]
  },
  manutencao: {
    role: 'manutencao',
    label: 'Técnico de Manutenção',
    description: 'Acompanhamento de chamados preventivos/corretivos, bloqueio técnico de quartos e peças.',
    badgeColor: 'bg-[#4A5759] text-white border-[#3D4035]',
    defaultSector: 'Manutencao',
    defaultPermissions: [
      'view_rooms',
      'manage_rooms',
      'view_kanbans',
      'view_inventory',
      'manage_inventory'
    ]
  },
  financeiro: {
    role: 'financeiro',
    label: 'Analista Financeiro / Auditor',
    description: 'Acesso completo ao faturamento, fluxo de receitas, conciliação e relatórios de ocupação.',
    badgeColor: 'bg-[#588157] text-white border-[#3A5A40]',
    defaultSector: 'Financeiro',
    defaultPermissions: [
      'view_overview',
      'view_financial',
      'manage_financial',
      'view_rooms',
      'view_inventory',
      'view_checkinout',
      'view_guests'
    ]
  }
};

export const PERMISSION_DEFINITIONS: Record<
  PermissionKey,
  { label: string; description: string; module: string }
> = {
  view_overview: {
    label: 'Visualizar Visão Geral & Métricas',
    description: 'Acesso aos gráficos executivos de ocupação, faturamento mensal e indicadores gerais.',
    module: 'Visão Geral & Faturamento'
  },
  view_financial: {
    label: 'Consultar Relatórios Financeiros',
    description: 'Visualização da DRE hoteleira, extrato de transações e formas de pagamento.',
    module: 'Visão Geral & Faturamento'
  },
  manage_financial: {
    label: 'Lançar e Editar Transações Financeiras',
    description: 'Criar novas despesas operacionais, estornos e conciliações de pagamento.',
    module: 'Visão Geral & Faturamento'
  },
  view_rooms: {
    label: 'Visualizar Quartos e Ocupação',
    description: 'Consultar o mapa de quartos, status em tempo real e lista de comodidades.',
    module: 'Quartos & Inventário'
  },
  manage_rooms: {
    label: 'Alterar Status e Dados dos Quartos',
    description: 'Mudar status (Limpeza, Manutenção, Bloqueio) e editar dados cadastrais de quartos.',
    module: 'Quartos & Inventário'
  },
  view_inventory: {
    label: 'Consultar Estoque Integrado & Kardex',
    description: 'Visualizar níveis de estoque, valorização e histórico de movimentações.',
    module: 'Quartos & Inventário'
  },
  manage_inventory: {
    label: 'Movimentar Estoque & Compras',
    description: 'Registrar entradas por nota, perdas, transferências e disparar reposição de estoque.',
    module: 'Quartos & Inventário'
  },
  view_kanbans: {
    label: 'Visualizar Quadros Kanban de Tarefas',
    description: 'Acessar o kanban de atividades operacionais do hotel.',
    module: 'Kanbans por Setor'
  },
  manage_all_kanbans: {
    label: 'Mover e Gerenciar Tarefas de Todos os Setores',
    description: 'Criar tarefas para qualquer setor, alterar prioridades e reatribuir responsáveis.',
    module: 'Kanbans por Setor'
  },
  view_checkinout: {
    label: 'Visualizar Painel de Check-in e Check-out',
    description: 'Consultar hóspedes presentes, chegadas do dia e partidas previstas.',
    module: 'Check-in & Check-out'
  },
  manage_checkinout: {
    label: 'Efetuar Check-in, Check-out e Fechamento',
    description: 'Registrar entrada de hóspedes, processar pagamento final e liberar quartos.',
    module: 'Check-in & Check-out'
  },
  view_guests: {
    label: 'Consultar Cadastro de Hóspedes',
    description: 'Acessar histórico de reservas, preferências e dados de contato dos hóspedes.',
    module: 'Hóspedes'
  },
  manage_guests: {
    label: 'Cadastrar e Editar Fichas de Hóspedes',
    description: 'Criar novos cadastros de hóspedes, atualizar documentos e restrições.',
    module: 'Hóspedes'
  },
  view_fnb: {
    label: 'Visualizar Cardápio e Frigobar',
    description: 'Consultar catálogo de alimentos, bebidas, preços e estoque de frigobar.',
    module: 'Frigobar & Cozinha'
  },
  manage_fnb: {
    label: 'Lançar Consumo de Frigobar e Pedidos A&B',
    description: 'Registrar consumo de frigobar nos quartos e registrar/despachar pedidos de Room Service.',
    module: 'Frigobar & Cozinha'
  },
  manage_users: {
    label: 'Gerenciar Usuários, Senhas e Setorização',
    description: 'Criar colaboradores, redefinir senhas, alterar setores e customizar permissões RBAC.',
    module: 'Gestão de Usuários'
  },
  manage_settings: {
    label: 'Configurações Gerais & Banco Supabase',
    description: 'Alterar parâmetros globais do hotel, regras de reserva e executar scripts SQL no Supabase.',
    module: 'Configurações Globais'
  }
};

/**
 * Normalizes legacy JSON staff status and Supabase staff active flag.
 * Supabase profiles use `active`; legacy profiles use `status`.
 */
function isActiveStaffUser(user: StaffUser | null): boolean {
  if (!user) return false;
  const status = (user as any).status;
  if (status !== undefined && status !== null) return status === 'Ativo';
  const active = (user as any).active;
  if (typeof active === 'boolean') return active;
  return false;
}

/**
 * Checks whether a user possesses a specific permission
 */
export function hasPermission(user: StaffUser | null, permission: PermissionKey): boolean {
  if (!user) return false;
  if (!isActiveStaffUser(user)) return false;
  if (user.role === 'admin') return true; // Super admin possesses all permissions
  return user.permissions.includes(permission);
}

/**
 * Checks whether a user can access a specific administrative navigation tab
 */
export function canAccessTab(user: StaffUser | null, tab: AdminTab): boolean {
  if (!user) return false;
  if (!isActiveStaffUser(user)) return false;
  if (user.role === 'admin') return true;

  switch (tab) {
    case 'overview':
      return hasPermission(user, 'view_overview') || hasPermission(user, 'view_financial');
    case 'rooms_inventory':
      return hasPermission(user, 'view_rooms') || hasPermission(user, 'view_inventory');
    case 'kanbans':
      return hasPermission(user, 'view_kanbans');
    case 'checkinout':
      return hasPermission(user, 'view_checkinout');
    case 'guests':
      return hasPermission(user, 'view_guests');
    case 'fnb':
      return hasPermission(user, 'view_fnb');
    case 'users':
      return hasPermission(user, 'manage_users');
    case 'settings':
      return hasPermission(user, 'manage_settings');
    default:
      return true;
  }
}

/**
 * Returns the default initial tab for a user based on their primary sector
 */
export function getDefaultTabForUser(user: StaffUser | null): AdminTab {
  if (!user) return 'overview';
  const sectorDef = SECTOR_DEFINITIONS[user.sector];
  if (sectorDef && canAccessTab(user, sectorDef.defaultTab)) {
    return sectorDef.defaultTab;
  }
  // Fallback to first permitted tab
  const allTabs: AdminTab[] = [
    'overview',
    'checkinout',
    'rooms_inventory',
    'kanbans',
    'guests',
    'fnb',
    'users',
    'settings'
  ];
  const firstAllowed = allTabs.find(t => canAccessTab(user, t));
  return firstAllowed || 'overview';
}
