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
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Database,
  DoorOpen,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
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

type Group = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Item[];
};

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ onHome, onNavigate, onNavigatePage }) => {
  const { currentUser, mode, canAccessTab } = useHotel();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string>('Recepção');
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);

  const permissions = useMemo(() => {
    return new Set<PermissionKey>(expandLegacyPermissions(currentUser?.permissions || []));
  }, [currentUser?.permissions]);

  const has = (permission: PermissionKey) => currentUser?.role === 'admin' || permissions.has(permission);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (flyoutGroup) setFlyoutGroup(null);
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, flyoutGroup]);

  if (!currentUser || mode !== 'admin') return null;

  const groups: Group[] = [
    {
      title: 'Recepção',
      icon: CalendarDays,
      items: [
        { label: 'Mapa de Quartos', icon: BedDouble, page: 'roomMap', allowed: has('view_rooms') },
        { label: 'Reservas & Calendário', icon: CalendarDays, page: 'reservations', allowed: canAccessTab('checkinout') },
        { label: 'Check-in', icon: LogIn, page: 'checkin', allowed: canAccessTab('checkinout') },
        { label: 'Check-out', icon: LogOut, page: 'checkout', allowed: canAccessTab('checkinout') },
        { label: 'Novo Check-in / Balcão', icon: DoorOpen, page: 'walkin', allowed: has('manage_checkinout') },
        { label: 'Hóspedes', icon: Users, tab: 'guests', allowed: canAccessTab('guests') }
      ]
    },
    {
      title: 'Operação',
      icon: ClipboardList,
      items: [
        { label: 'Tarefas', icon: ClipboardList, page: 'tasks', allowed: has('view_kanbans') },
        { label: 'Governança', icon: Sparkles, page: 'housekeeping', allowed: has('view_kanbans') },
        { label: 'Manutenção', icon: Wrench, page: 'maintenance', allowed: has('view_kanbans') },
        { label: 'Lavanderia', icon: WashingMachine, page: 'laundry', allowed: has('view_inventory') }
      ]
    },
    {
      title: 'Alimentos e Bebidas',
      icon: ChefHat,
      items: [
        { label: 'Frigobar', icon: Wine, page: 'minibar', allowed: has(GRANULAR_PERMISSION_KEYS.viewMinibar) },
        { label: 'Room Service', icon: BellRing, page: 'roomService', allowed: has(GRANULAR_PERMISSION_KEYS.viewRoomService) },
        { label: 'Cozinha', icon: ChefHat, page: 'kitchen', allowed: has(GRANULAR_PERMISSION_KEYS.viewKitchen) },
        { label: 'Cardápio', icon: BookOpen, page: 'menu', allowed: has(GRANULAR_PERMISSION_KEYS.manageMenu) }
      ]
    },
    {
      title: 'Estoque & Suprimentos',
      icon: Boxes,
      items: [
        { label: 'Estoque', icon: Boxes, page: 'inventory', allowed: has('view_inventory') },
        { label: 'Kardex', icon: ClipboardList, page: 'kardex', allowed: has('view_inventory') },
        { label: 'Reposição', icon: ShoppingCart, page: 'replenishment', allowed: has('view_inventory') },
        { label: 'Enxoval', icon: Shirt, page: 'linen', allowed: has('view_inventory') },
        { label: 'Perdas & Avarias', icon: AlertTriangle, page: 'lossDamage', allowed: has('view_inventory') },
        { label: 'Compras', icon: ShoppingCart, page: 'purchases', allowed: has('view_inventory') }
      ]
    },
    {
      title: 'Gestão',
      icon: LayoutDashboard,
      items: [
        { label: 'Visão Geral & Financeiro', icon: LayoutDashboard, tab: 'overview', allowed: canAccessTab('overview') }
      ]
    },
    {
      title: 'Cadastros',
      icon: BedDouble,
      items: [
        { label: 'Quartos', icon: BedDouble, page: 'rooms', allowed: has(GRANULAR_PERMISSION_KEYS.manageRoomRegistry) },
        { label: 'Tarifas & Acomodações', icon: ClipboardList, tab: 'settings', targetId: 'settings-entry-rooms', allowed: has(GRANULAR_PERMISSION_KEYS.manageRoomRates) }
      ]
    },
    {
      title: 'Administração',
      icon: Settings,
      items: [
        { label: 'Equipe & Permissões', icon: ShieldCheck, tab: 'users', allowed: canAccessTab('users') },
        { label: 'Configurações do Hotel', icon: Settings, tab: 'settings', targetId: 'settings-entry-visual', allowed: has(GRANULAR_PERMISSION_KEYS.manageHotelSettings) },
        { label: 'Telas KDS', icon: Monitor, tab: 'settings', targetId: 'kds-displays-manager', allowed: has(GRANULAR_PERMISSION_KEYS.manageSystemSettings) },
        { label: 'Sistema / Supabase', icon: Database, tab: 'settings', targetId: 'settings-entry-supabase', allowed: has(GRANULAR_PERMISSION_KEYS.manageSystemSettings) }
      ]
    },
    {
      title: 'Alertas',
      icon: Bell,
      items: [
        { label: 'Central de Alertas', icon: Bell, allowed: true, action: 'alerts' }
      ]
    }
  ];

  const visibleGroups = groups
    .map(group => ({ ...group, items: group.items.filter(item => item.allowed) }))
    .filter(group => group.items.length > 0);

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

  const activeFlyout = visibleGroups.find(group => group.title === flyoutGroup) || null;

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
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
          />

          <div className="absolute inset-y-3 left-3 flex items-start" onMouseLeave={() => collapsed && setFlyoutGroup(null)}>
            <aside
              className={`relative z-10 flex h-[calc(100vh-24px)] flex-col overflow-visible rounded-2xl border border-[#DADFD1] bg-[#1F2638] text-white shadow-2xl transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-[320px] max-w-[88vw]'}`}
            >
              <div className={`flex items-center border-b border-white/10 ${collapsed ? 'justify-center px-2 py-4' : 'justify-between px-4 py-4'}`}>
                {!collapsed && (
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#A3B18A]">NovoHotel</span>
                    <h2 className="mt-0.5 text-base font-black">Navegação</h2>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsed(value => !value);
                      setFlyoutGroup(null);
                    }}
                    className="rounded-xl p-2 text-[#DDE3D3] transition hover:bg-white/10"
                    aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                    title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                  >
                    {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                  </button>
                  {!collapsed && (
                    <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-[#DDE3D3] hover:bg-white/10" aria-label="Fechar menu">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
                <button
                  type="button"
                  onClick={() => { onHome(); setOpen(false); }}
                  className={`mb-3 flex w-full items-center rounded-xl bg-white/10 font-black text-white transition hover:bg-white/15 ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 text-left text-xs'}`}
                  title="Meu Painel"
                >
                  <Home className="h-4 w-4 text-[#CCD5AE]" />
                  {!collapsed && 'Meu Painel'}
                </button>

                <div className={collapsed ? 'space-y-1.5' : 'space-y-2'}>
                  {visibleGroups.map(group => {
                    const GroupIcon = group.icon;
                    const expanded = expandedGroup === group.title;

                    if (collapsed) {
                      return (
                        <button
                          key={group.title}
                          type="button"
                          onMouseEnter={() => setFlyoutGroup(group.title)}
                          onClick={() => setFlyoutGroup(current => current === group.title ? null : group.title)}
                          className={`flex w-full items-center justify-center rounded-xl p-3 transition ${flyoutGroup === group.title ? 'bg-[#F4F1EA] text-[#2C3327]' : 'text-[#DDE3D3] hover:bg-white/10'}`}
                          title={group.title}
                          aria-label={group.title}
                        >
                          <GroupIcon className="h-5 w-5" />
                        </button>
                      );
                    }

                    return (
                      <section key={group.title}>
                        <button
                          type="button"
                          onClick={() => setExpandedGroup(expanded ? '' : group.title)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-black transition ${expanded ? 'bg-[#F4F1EA] text-[#2C3327]' : 'text-[#E8EBE3] hover:bg-white/10'}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <GroupIcon className={`h-4 w-4 ${expanded ? 'text-[#588157]' : 'text-[#A3B18A]'}`} />
                            {group.title}
                          </span>
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        {expanded && (
                          <div className="mt-1 space-y-0.5 pl-3">
                            {group.items.map(item => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={`${group.title}-${item.label}`}
                                  type="button"
                                  onClick={() => choose(item)}
                                  className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-[#DDE3D3] transition hover:bg-white/10 hover:text-white"
                                >
                                  <span className="flex items-center gap-2.5">
                                    <Icon className="h-4 w-4 text-[#A3B18A]" />
                                    {item.label}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-white/35 transition group-hover:translate-x-0.5" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>

              {!collapsed && (
                <div className="border-t border-white/10 px-4 py-3 text-[10px] text-[#BFC5B6]">
                  {currentUser.fullName} • {currentUser.sector}
                </div>
              )}
            </aside>

            {collapsed && activeFlyout && (
              <div className="relative z-20 ml-2 mt-20 w-[260px] rounded-2xl border border-[#DADFD1] bg-[#1F2638] p-3 text-white shadow-2xl">
                <div className="mb-2 flex items-center justify-between px-2 py-1">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#A3B18A]">NovoHotel</p>
                    <h3 className="text-sm font-black">{activeFlyout.title}</h3>
                  </div>
                  <button type="button" onClick={() => setFlyoutGroup(null)} className="rounded-lg p-1.5 text-[#DDE3D3] hover:bg-white/10" aria-label="Fechar submenu">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {activeFlyout.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={`${activeFlyout.title}-${item.label}`}
                        type="button"
                        onClick={() => choose(item)}
                        className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[#DDE3D3] transition hover:bg-white/10 hover:text-white"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-[#A3B18A]" />
                          {item.label}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-white/35 transition group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
