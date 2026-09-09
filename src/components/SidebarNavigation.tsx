import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  BedDouble,
  BookOpen,
  Boxes,
  CalendarDays,
  ChefHat,
  ChevronRight,
  ClipboardList,
  Database,
  DoorOpen,
  Home,
  KeyRound,
  LayoutDashboard,
  Menu,
  Monitor,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Sparkles,
  Users,
  WashingMachine,
  Wine,
  Wrench,
  X
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { expandLegacyPermissions, GRANULAR_PERMISSION_KEYS } from '../services/rbac.ts';
import { AdminTab, PermissionKey } from '../types.ts';
import type { StandaloneModule } from './StandaloneModulePage.tsx';

interface SidebarNavigationProps {
  onHome: () => void;
  onNavigate: (tab: AdminTab, targetId?: string) => void;
  onNavigatePage: (page: StandaloneModule) => void;
}

type Item = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab?: AdminTab;
  targetId?: string;
  page?: StandaloneModule;
  allowed: boolean;
  action?: 'alerts';
};

type Group = { title: string; items: Item[] };

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ onHome, onNavigate, onNavigatePage }) => {
  const { currentUser, mode, canAccessTab } = useHotel();
  const [open, setOpen] = useState(false);

  const permissions = useMemo(() => {
    return new Set<PermissionKey>(expandLegacyPermissions(currentUser?.permissions || []));
  }, [currentUser?.permissions]);

  const has = (permission: PermissionKey) => currentUser?.role === 'admin' || permissions.has(permission);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!currentUser || mode !== 'admin') return null;

  const groups: Group[] = [
    {
      title: 'Recepção',
      items: [
        { label: 'Mapa de Quartos', icon: BedDouble, tab: 'kanbans', targetId: 'tab-operations-rooms', allowed: has('view_rooms') },
        { label: 'Reservas & Calendário', icon: CalendarDays, page: 'reservations', allowed: canAccessTab('checkinout') },
        { label: 'Check-in / Check-out', icon: KeyRound, page: 'checkinout', allowed: canAccessTab('checkinout') },
        { label: 'Novo Check-in / Balcão', icon: DoorOpen, page: 'walkin', allowed: has('manage_checkinout') },
        { label: 'Hóspedes', icon: Users, tab: 'guests', allowed: canAccessTab('guests') }
      ]
    },
    {
      title: 'Operação',
      items: [
        { label: 'Governança', icon: Sparkles, tab: 'kanbans', targetId: 'tab-operations-housekeeping', allowed: has('view_kanbans') },
        { label: 'Manutenção', icon: Wrench, tab: 'kanbans', targetId: 'tab-operations-maintenance', allowed: has('view_kanbans') },
        { label: 'Lavanderia', icon: WashingMachine, page: 'laundry', allowed: has('view_inventory') }
      ]
    },
    {
      title: 'Alimentos e Bebidas',
      items: [
        { label: 'Frigobar', icon: Wine, page: 'minibar', allowed: has(GRANULAR_PERMISSION_KEYS.viewMinibar) },
        { label: 'Room Service', icon: BellRing, page: 'roomService', allowed: has(GRANULAR_PERMISSION_KEYS.viewRoomService) },
        { label: 'Cozinha', icon: ChefHat, page: 'kitchen', allowed: has(GRANULAR_PERMISSION_KEYS.viewKitchen) },
        { label: 'Cardápio', icon: BookOpen, page: 'menu', allowed: has(GRANULAR_PERMISSION_KEYS.manageMenu) }
      ]
    },
    {
      title: 'Estoque & Suprimentos',
      items: [
        { label: 'Estoque', icon: Boxes, page: 'inventory', allowed: has('view_inventory') },
        { label: 'Enxoval', icon: Shirt, page: 'linen', allowed: has('view_inventory') },
        { label: 'Perdas & Avarias', icon: AlertTriangle, page: 'lossDamage', allowed: has('view_inventory') },
        { label: 'Compras', icon: ShoppingCart, page: 'purchases', allowed: has('view_inventory') }
      ]
    },
    {
      title: 'Gestão',
      items: [
        { label: 'Visão Geral & Financeiro', icon: LayoutDashboard, tab: 'overview', allowed: canAccessTab('overview') }
      ]
    },
    {
      title: 'Cadastros',
      items: [
        { label: 'Quartos', icon: BedDouble, page: 'rooms', allowed: has(GRANULAR_PERMISSION_KEYS.manageRoomRegistry) },
        { label: 'Tarifas & Acomodações', icon: ClipboardList, tab: 'settings', targetId: 'settings-entry-rooms', allowed: has(GRANULAR_PERMISSION_KEYS.manageRoomRates) }
      ]
    },
    {
      title: 'Administração',
      items: [
        { label: 'Equipe & Permissões', icon: ShieldCheck, tab: 'users', allowed: canAccessTab('users') },
        { label: 'Configurações do Hotel', icon: Settings, tab: 'settings', targetId: 'settings-entry-visual', allowed: has(GRANULAR_PERMISSION_KEYS.manageHotelSettings) },
        { label: 'Telas KDS', icon: Monitor, tab: 'settings', targetId: 'kds-displays-manager', allowed: has(GRANULAR_PERMISSION_KEYS.manageSystemSettings) },
        { label: 'Sistema / Supabase', icon: Database, tab: 'settings', targetId: 'settings-entry-supabase', allowed: has(GRANULAR_PERMISSION_KEYS.manageSystemSettings) }
      ]
    },
    {
      title: 'Alertas',
      items: [
        { label: 'Central de Alertas', icon: Bell, allowed: true, action: 'alerts' }
      ]
    }
  ];

  const choose = (item: Item) => {
    if (item.action === 'alerts') {
      window.dispatchEvent(new CustomEvent('hotel:open_operational_alerts'));
      setOpen(false);
      return;
    }
    if (item.page) {
      onNavigatePage(item.page);
      setOpen(false);
      return;
    }
    if (!item.tab) return;
    onNavigate(item.tab, item.targetId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-[76px] z-40 flex items-center gap-2 rounded-r-xl rounded-l-md border border-[#DADFD1] bg-[#2C3327] px-3 py-2 text-xs font-black text-white shadow-lg transition hover:bg-[#3A4135]"
        aria-label="Abrir menu principal"
      >
        <Menu className="h-4 w-4 text-[#CCD5AE]" />
        <span className="hidden sm:inline">Menu</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
          <aside className="absolute inset-y-0 left-0 flex w-[320px] max-w-[88vw] flex-col border-r border-[#DADFD1] bg-[#FDFBF7] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E6E3D8] px-4 py-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#588157]">NovoHotel</span>
                <h2 className="mt-0.5 text-base font-black text-[#2C3327]">Navegação</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <button
                type="button"
                onClick={() => { onHome(); setOpen(false); }}
                className="mb-3 flex w-full items-center gap-3 rounded-xl bg-[#2C3327] px-3 py-2.5 text-left text-xs font-black text-white"
              >
                <Home className="h-4 w-4 text-[#CCD5AE]" /> Meu Painel
              </button>

              <div className="space-y-4">
                {groups.map(group => {
                  const items = group.items.filter(item => item.allowed);
                  if (items.length === 0) return null;
                  return (
                    <section key={group.title}>
                      <h3 className="mb-1 px-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#8A8F7D]">{group.title}</h3>
                      <div className="space-y-0.5">
                        {items.map(item => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={`${group.title}-${item.label}`}
                              type="button"
                              onClick={() => choose(item)}
                              className="group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[#3D4035] transition hover:bg-[#F4F1EA] hover:text-[#2C3327]"
                            >
                              <span className="flex items-center gap-2.5">
                                <Icon className="h-4 w-4 text-[#588157]" />
                                {item.label}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-[#B3B7A8] transition group-hover:translate-x-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#E6E3D8] px-4 py-3 text-[10px] text-[#8A8F7D]">
              {currentUser.fullName} • {currentUser.sector}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
