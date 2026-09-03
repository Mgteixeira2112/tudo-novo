import React, { useState, useRef, useEffect } from 'react';
import {
  Hotel,
  CalendarCheck,
  LayoutDashboard,
  Kanban,
  KeyRound,
  Users,
  UtensilsCrossed,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  BedDouble,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  RotateCcw,
  Building2,
  Eye,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { ROLE_DEFINITIONS, SECTOR_DEFINITIONS } from '../services/rbac.ts';

interface NavbarProps {
  onOpenSettingsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettingsModal }) => {
  const {
    settings,
    mode,
    setMode,
    activeAdminTab,
    setActiveAdminTab,
    tasks,
    rooms,
    supabaseStatus,
    currentUser,
    allUsers,
    isImpersonating,
    switchUser,
    revertToAdminUser,
    canAccessTab,
    logout
  } = useHotel();

  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Count pending tasks
  const pendingTasksCount = tasks.filter(t => t.status !== 'Concluido').length;
  // Count occupied rooms
  const occupiedRoomsCount = rooms.filter(r => r.status === 'Ocupado').length;

  const handleCopySql = () => {
    fetch('/api/supabase/schema-sql')
      .then(res => res.text())
      .then(sql => {
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(err => console.error(err));
  };

  const getThemeBadgeClass = () => {
    switch (settings?.primaryColor) {
      case 'blue':
        return 'bg-blue-600 text-white';
      case 'amber':
        return 'bg-[#D4A373] text-[#2C3327]';
      case 'violet':
        return 'bg-[#6B705C] text-white';
      case 'rose':
        return 'bg-[#BC6C25] text-white';
      case 'slate':
        return 'bg-[#3D4035] text-white';
      default:
        return 'bg-[#2C3327] text-[#FDFBF7]';
    }
  };

  const currentRoleDef = currentUser ? ROLE_DEFINITIONS[currentUser.role] : null;
  const currentSectorDef = currentUser ? SECTOR_DEFINITIONS[currentUser.sector] : null;

  return (
    <>
      <header id="main-header" className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur border-b border-[#E6E3D8]">
        {/* Impersonation / RBAC Testing Alert Banner */}
        {isImpersonating && currentUser && (
          <div className="bg-[#588157] text-white px-4 py-2 text-xs border-b border-[#436342] shadow-inner">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 shrink-0 text-[#E9EDC9]" />
                <span>
                  <strong>Simulação de Controle de Exibição Ativa:</strong> Você está visualizando o sistema como{' '}
                  <span className="font-bold underline">{currentUser.fullName}</span> (
                  {currentRoleDef?.title} • Setor {currentSectorDef?.label}). As abas e ações estão restritas ao seu perfil.
                </span>
              </div>
              <button
                id="btn-exit-impersonation"
                onClick={revertToAdminUser}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white text-[#2C3327] hover:bg-[#F4F1EA] text-[11px] font-bold shadow-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Voltar para Administrador</span>
              </button>
            </div>
          </div>
        )}

        {/* Top bar with hotel branding, mode switcher, and staff profile */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Hotel Name */}
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl shadow-sm ${getThemeBadgeClass()}`}>
                <Hotel className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-bold text-[#2C3327] tracking-tight">
                    {settings?.hotelName || 'SaaS Hoteleiro'}
                  </h1>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]">
                    {settings?.cityState || 'PMS'}
                  </span>
                </div>
                <p className="text-xs text-[#6B705C] hidden sm:block truncate max-w-md">
                  {settings?.tagline || 'Gestão Hoteleira e Motor de Reservas'}
                </p>
              </div>
            </div>

            {/* Supabase Status Pill, Mode Toggle & Staff User Dropdown */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Supabase Database Status */}
              <button
                id="btn-supabase-status"
                onClick={() => setShowSqlDialog(true)}
                className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-xl border border-[#E6E3D8] bg-[#F4F1EA] hover:bg-[#EFECE4] text-[#3D4035] transition"
                title="Status de Persistência SQL Supabase"
              >
                <Database className="w-3.5 h-3.5 text-[#588157]" />
                <span className="font-medium">
                  {supabaseStatus?.connected ? 'Supabase SQL Conectado' : 'Banco SQL Backend Ativo'}
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#588157] animate-pulse"></span>
              </button>

              {/* Mode Switcher: Online Booking vs Admin PMS */}
              <div className="flex bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-medium">
                <button
                  id="tab-mode-booking"
                  onClick={() => setMode('booking')}
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                    mode === 'booking'
                      ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                      : 'text-[#6B705C] hover:text-[#2C3327]'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#588157]" />
                  <span className="hidden sm:inline">Motor de Reservas</span>
                  <span className="sm:hidden">Hóspede</span>
                </button>
                <button
                  id="tab-mode-admin"
                  onClick={() => setMode('admin')}
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                    mode === 'admin'
                      ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                      : 'text-[#6B705C] hover:text-[#2C3327]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#3A5A40]" />
                  <span className="hidden sm:inline">Painel Administrativo</span>
                  <span className="sm:hidden">Painel</span>
                </button>
              </div>

              {/* Staff User Profile & RBAC Dropdown */}
              {currentUser && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    id="btn-user-profile-menu"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1.5 sm:pr-2.5 rounded-xl border border-[#E6E3D8] bg-[#F4F1EA] hover:bg-[#EFECE4] transition"
                  >
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`}
                      alt={currentUser.fullName}
                      className="w-7 h-7 rounded-lg object-cover bg-white border border-[#E6E3D8]"
                    />
                    <div className="text-left hidden md:block leading-tight">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-[#2C3327] max-w-[110px] truncate block">
                          {currentUser.fullName.split(' ')[0]}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-semibold border ${
                            currentRoleDef?.badgeColor || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {currentUser.role === 'admin' ? 'Admin' : currentRoleDef?.title.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6B705C] block">
                        Setor: {currentSectorDef?.label || currentUser.sector}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6B705C]" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E6E3D8] shadow-xl p-3 z-50 animate-fade-in">
                      {/* User Header */}
                      <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8] mb-3">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={
                              currentUser.avatarUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`
                            }
                            alt={currentUser.fullName}
                            className="w-10 h-10 rounded-xl object-cover bg-white border border-[#E6E3D8]"
                          />
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-[#2C3327] truncate">{currentUser.fullName}</h4>
                            <p className="text-[11px] text-[#6B705C] truncate">{currentUser.email}</p>
                            <div className="flex items-center space-x-1 mt-1">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                                  currentRoleDef?.badgeColor
                                }`}
                              >
                                {currentRoleDef?.title}
                              </span>
                              <span className="text-[10px] text-[#6B705C]">
                                • {currentSectorDef?.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick RBAC Simulator - Test each role & sector */}
                      <div className="mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B705C] block px-1 mb-1.5">
                          Testar Setorização & Políticas (Simulador)
                        </span>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                          {allUsers.map(u => {
                            const uRole = ROLE_DEFINITIONS[u.role];
                            const isSelected = u.id === currentUser.id;

                            return (
                              <button
                                key={u.id}
                                onClick={() => {
                                  switchUser(u);
                                  setShowUserMenu(false);
                                }}
                                className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left text-xs transition ${
                                  isSelected
                                    ? 'bg-[#E9EDC9] text-[#2C3327] font-bold border border-[#CCD5AE]'
                                    : 'hover:bg-[#F4F1EA] text-[#2C3327]'
                                }`}
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#588157]"></span>
                                  <span className="truncate">{u.fullName}</span>
                                </div>
                                <span className="text-[10px] text-[#6B705C] shrink-0 ml-2">
                                  {uRole?.title.split(' ')[0]} ({u.sector})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="pt-2 border-t border-[#E6E3D8] space-y-1">
                        {canAccessTab('users') && (
                          <button
                            onClick={() => {
                              setActiveAdminTab('users');
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#2C3327] hover:bg-[#F4F1EA] transition"
                          >
                            <ShieldCheck className="w-4 h-4 text-[#588157]" />
                            <span>Gerenciar Usuários & Permissões</span>
                          </button>
                        )}

                        {isImpersonating && (
                          <button
                            onClick={() => {
                              revertToAdminUser();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#588157] hover:bg-[#E9EDC9]/50 transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Voltar ao Perfil de Administrador</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Desconectar Sessão</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Settings Button */}
              {canAccessTab('settings') && (
                <button
                  id="btn-open-settings"
                  onClick={onOpenSettingsModal}
                  className="p-2 rounded-xl text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] border border-transparent hover:border-[#E6E3D8] transition"
                  title="Configurações do Hotel & Cores"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Admin Navigation Sub-bar (Role-Protected with canAccessTab) */}
        {mode === 'admin' && (
          <div className="border-t border-[#E6E3D8] bg-[#F4F1EA]/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 text-xs sm:text-sm font-medium scrollbar-none">
                {canAccessTab('overview') && (
                  <button
                    id="subnav-overview"
                    onClick={() => setActiveAdminTab('overview')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'overview'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#588157]" />
                    <span>Visão Geral & Faturamento</span>
                  </button>
                )}

                {canAccessTab('rooms_inventory') && (
                  <button
                    id="subnav-rooms-inventory"
                    onClick={() => setActiveAdminTab('rooms_inventory')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'rooms_inventory'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <BedDouble className="w-4 h-4 text-[#588157]" />
                    <span>Quartos & Inventário</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F1EA] text-[#2C3327] border border-[#E6E3D8]">
                      {rooms.length}
                    </span>
                  </button>
                )}

                {canAccessTab('kanbans') && (
                  <button
                    id="subnav-kanbans"
                    onClick={() => setActiveAdminTab('kanbans')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'kanbans'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <Kanban className="w-4 h-4 text-[#3A5A40]" />
                    <span>Kanbans por Setor</span>
                    {pendingTasksCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E9EDC9] text-[#2C3327]">
                        {pendingTasksCount}
                      </span>
                    )}
                  </button>
                )}

                {canAccessTab('checkinout') && (
                  <button
                    id="subnav-checkinout"
                    onClick={() => setActiveAdminTab('checkinout')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'checkinout'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <KeyRound className="w-4 h-4 text-[#D4A373]" />
                    <span>Check-in / Check-out</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]">
                      {occupiedRoomsCount} quartos
                    </span>
                  </button>
                )}

                {canAccessTab('guests') && (
                  <button
                    id="subnav-guests"
                    onClick={() => setActiveAdminTab('guests')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'guests'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-[#588157]" />
                    <span>Cadastro de Hóspedes</span>
                  </button>
                )}

                {canAccessTab('fnb') && (
                  <button
                    id="subnav-fnb"
                    onClick={() => setActiveAdminTab('fnb')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'fnb'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4 text-[#BC6C25]" />
                    <span>Frigobar & Cozinha</span>
                  </button>
                )}

                {canAccessTab('users') && (
                  <button
                    id="subnav-users"
                    onClick={() => setActiveAdminTab('users')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'users'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-[#588157]" />
                    <span>Equipe & Controle de Acesso</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F1EA] text-[#2C3327] border border-[#E6E3D8]">
                      {allUsers.length}
                    </span>
                  </button>
                )}

                {canAccessTab('settings') && (
                  <button
                    id="subnav-settings"
                    onClick={() => setActiveAdminTab('settings')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                      activeAdminTab === 'settings'
                        ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
                        : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
                    }`}
                  >
                    <Database className="w-4 h-4 text-[#A3B18A]" />
                    <span>Configuração & SQL Supabase</span>
                  </button>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* SQL & Supabase Architecture Modal */}
      {showSqlDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#E6E3D8] shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E3D8]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-[#E9EDC9] text-[#2C3327]">
                  <Database className="w-6 h-6 text-[#588157]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2C3327]">
                    Persistência Supabase SQL & Autenticação
                  </h3>
                  <p className="text-xs text-[#6B705C]">
                    Integração PostgreSQL e Supabase Auth com RBAC
                  </p>
                </div>
              </div>
              <button
                id="btn-close-sql-modal"
                onClick={() => setShowSqlDialog(false)}
                className="p-2 rounded-xl text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#3D4035]">
              <div className="p-4 rounded-2xl bg-white border border-[#E6E3D8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2C3327]">Status Atual:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      supabaseStatus?.connected
                        ? 'bg-[#E9EDC9] text-[#2C3327]'
                        : 'bg-[#CCD5AE]/40 text-[#2C3327]'
                    }`}
                  >
                    {supabaseStatus?.connected ? '✓ Supabase Cloud Conectado' : '● Backend SQL Dedicado'}
                  </span>
                </div>
                <p className="text-[#6B705C] leading-relaxed">
                  {supabaseStatus?.message}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E6E3D8] space-y-2">
                <span className="font-bold text-[#2C3327] block">Tabelas no Banco SQL:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                    <span className="font-bold text-sm text-[#2C3327]">{allUsers.length}</span>
                    <span className="block text-[10px] text-[#6B705C]">staff_users</span>
                  </div>
                  <div className="p-2 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                    <span className="font-bold text-sm text-[#2C3327]">{rooms.length}</span>
                    <span className="block text-[10px] text-[#6B705C]">rooms</span>
                  </div>
                  <div className="p-2 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                    <span className="font-bold text-sm text-[#2C3327]">{tasks.length}</span>
                    <span className="block text-[10px] text-[#6B705C]">kanban_tasks</span>
                  </div>
                  <div className="p-2 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                    <span className="font-bold text-sm text-[#2C3327]">{occupiedRoomsCount}</span>
                    <span className="block text-[10px] text-[#6B705C]">reservations</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E6E3D8] flex items-center justify-between">
              <button
                id="btn-copy-sql-schema"
                onClick={handleCopySql}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#2C3327] hover:bg-[#3D4035] text-white text-xs font-semibold transition"
              >
                {copied ? <Check className="w-4 h-4 text-[#CCD5AE]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'SQL Copiado com Sucesso!' : 'Copiar DDL SQL Completo'}</span>
              </button>

              <button
                onClick={() => setShowSqlDialog(false)}
                className="px-4 py-2 text-xs font-medium text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
