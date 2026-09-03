import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  Key,
  Database,
  Lock,
  Unlock,
  Check,
  Info,
  RefreshCw,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { StaffUser, UserRole, UserSector, PermissionKey, AdminTab } from '../types.ts';
import {
  ROLE_DEFINITIONS,
  SECTOR_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  hasPermission,
  canAccessTab
} from '../services/rbac.ts';

export const UsersManager: React.FC = () => {
  const {
    allUsers,
    currentUser,
    switchUser,
    createUser,
    updateUser,
    deleteUser,
    supabaseStatus,
    refreshData
  } = useHotel();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
    sector: UserSector;
    status: 'Ativo' | 'Inativo' | 'Bloqueado';
    permissions: PermissionKey[];
    password?: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    role: 'recepcionista',
    sector: 'Recepcao',
    status: 'Ativo',
    permissions: [...ROLE_DEFINITIONS.recepcionista.defaultPermissions],
    password: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter users
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm));
      const matchesSector = selectedSectorFilter === 'ALL' || u.sector === selectedSectorFilter;
      const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
      return matchesSearch && matchesSector && matchesRole;
    });
  }, [allUsers, searchTerm, selectedSectorFilter, selectedRoleFilter]);

  // Handle open modal for new user
  const handleOpenNewUserModal = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'recepcionista',
      sector: 'Recepcao',
      status: 'Ativo',
      permissions: [...ROLE_DEFINITIONS.recepcionista.defaultPermissions],
      password: ''
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEditModal = (user: StaffUser) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      sector: user.sector,
      status: user.status,
      permissions: [...user.permissions],
      password: ''
    });
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  // Auto-apply preset permissions when role changes
  const handleRoleChange = (newRole: UserRole) => {
    const roleDef = ROLE_DEFINITIONS[newRole];
    let recommendedSector: UserSector = 'Geral';
    if (newRole === 'recepcionista') recommendedSector = 'Recepcao';
    else if (newRole === 'governanca') recommendedSector = 'Governanca';
    else if (newRole === 'cozinha_roomservice') recommendedSector = 'Cozinha';
    else if (newRole === 'manutencao') recommendedSector = 'Manutencao';
    else if (newRole === 'financeiro') recommendedSector = 'Financeiro';

    setFormData(prev => ({
      ...prev,
      role: newRole,
      sector: prev.sector === 'Geral' || prev.sector === 'Recepcao' ? recommendedSector : prev.sector,
      permissions: [...roleDef.defaultPermissions]
    }));
  };

  // Toggle individual permission
  const handleTogglePermission = (key: PermissionKey) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(key);
      const nextPermissions = exists
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: nextPermissions };
    });
  };

  // Select/Deselect all permissions in a group
  const handleTogglePermissionGroup = (keys: PermissionKey[]) => {
    setFormData(prev => {
      const allSelected = keys.every(k => prev.permissions.includes(k));
      let nextPermissions: PermissionKey[];
      if (allSelected) {
        nextPermissions = prev.permissions.filter(p => !keys.includes(p));
      } else {
        const toAdd = keys.filter(k => !prev.permissions.includes(k));
        nextPermissions = [...prev.permissions, ...toAdd];
      }
      return { ...prev, permissions: nextPermissions };
    });
  };

  // Reset to default role permissions
  const handleResetToRoleDefaults = () => {
    const roleDef = ROLE_DEFINITIONS[formData.role];
    setFormData(prev => ({
      ...prev,
      permissions: [...roleDef.defaultPermissions]
    }));
  };

  // Save user
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.fullName.trim()) {
      setFormError('Informe o nome completo do colaborador.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Informe um e-mail válido.');
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        await updateUser(editingUser.id, {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          sector: formData.sector,
          status: formData.status,
          permissions: formData.permissions
        });
        setFormSuccess('Colaborador atualizado com sucesso!');
      } else {
        await createUser({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          sector: formData.sector,
          status: formData.status,
          permissions: formData.permissions
        });
        setFormSuccess('Novo colaborador cadastrado com sucesso!');
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setSaving(false);
      }, 800);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar colaborador.');
      setSaving(false);
    }
  };

  // Quick toggle user status
  const handleToggleUserStatus = async (user: StaffUser) => {
    try {
      const nextStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
      await updateUser(user.id, { status: nextStatus });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Group permissions by category
  const permissionCategories = useMemo(() => {
    const groups: Record<string, { label: string; permissions: typeof PERMISSION_DEFINITIONS }> = {
      geral: { label: 'Visão Geral & Indicadores', permissions: [] },
      quartos: { label: 'Quartos & Inventário', permissions: [] },
      checkin: { label: 'Recepção, Reservas & Check-in', permissions: [] },
      hospedes: { label: 'Hóspedes & CRM', permissions: [] },
      kanban: { label: 'Kanbans Operacionais por Setor', permissions: [] },
      fnb: { label: 'Frigobar, Cozinha & Room Service', permissions: [] },
      financeiro: { label: 'Financeiro & Lançamentos', permissions: [] },
      usuarios: { label: 'Gestão de Usuários & Políticas', permissions: [] },
      config: { label: 'Configurações do Hotel & Banco', permissions: [] }
    };

    PERMISSION_DEFINITIONS.forEach(p => {
      if (groups[p.category]) {
        groups[p.category].permissions.push(p);
      }
    });

    return groups;
  }, []);

  const allTabsList: { id: AdminTab; label: string; sector: string }[] = [
    { id: 'overview', label: 'Visão Geral & Faturamento', sector: 'Geral / Gestão' },
    { id: 'rooms_inventory', label: 'Quartos & Inventário', sector: 'Governanca & Estoque' },
    { id: 'kanbans', label: 'Kanbans Operacionais', sector: 'Todos os Setores' },
    { id: 'checkinout', label: 'Check-in / Check-out', sector: 'Recepção' },
    { id: 'guests', label: 'Cadastro de Hóspedes', sector: 'Recepção' },
    { id: 'fnb', label: 'Frigobar & Cozinha (Room Service)', sector: 'Cozinha & Governança' },
    { id: 'users', label: 'Equipe & Controle de Acesso', sector: 'Administração' },
    { id: 'settings', label: 'Configurações & SQL Supabase', sector: 'Administração' }
  ];

  return (
    <div id="users-manager-view" className="space-y-6">
      {/* Top Banner: Overview & Action */}
      <div className="bg-white rounded-2xl p-6 border border-[#E6E3D8] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-[#E9EDC9] rounded-xl text-[#2C3327]">
                <ShieldCheck className="w-6 h-6 text-[#588157]" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#2C3327] tracking-tight">
                  Gestão de Equipe & Controle de Acesso (RBAC)
                </h2>
                <p className="text-xs text-[#6B705C]">
                  Controle de visibilidade de abas, setorização operacional e autenticação sincronizada com Supabase Auth
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="flex bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-medium">
              <button
                id="btn-tab-users"
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'users'
                    ? 'bg-white text-[#2C3327] font-bold shadow-xs border border-[#E6E3D8]'
                    : 'text-[#6B705C] hover:text-[#2C3327]'
                }`}
              >
                Colaboradores ({allUsers.length})
              </button>
              <button
                id="btn-tab-matrix"
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'matrix'
                    ? 'bg-white text-[#2C3327] font-bold shadow-xs border border-[#E6E3D8]'
                    : 'text-[#6B705C] hover:text-[#2C3327]'
                }`}
              >
                Matriz de Setorização
              </button>
            </div>

            <button
              id="btn-add-user"
              onClick={handleOpenNewUserModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#2C3327] hover:bg-[#3D4035] text-white text-xs font-semibold shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Colaborador</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#E6E3D8]">
          <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
            <span className="text-[11px] font-medium text-[#6B705C] block">Total de Colaboradores</span>
            <span className="text-xl font-bold text-[#2C3327] mt-0.5 block">{allUsers.length}</span>
            <span className="text-[10px] text-[#588157]">
              {allUsers.filter(u => u.status === 'Ativo').length} ativos no sistema
            </span>
          </div>

          <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
            <span className="text-[11px] font-medium text-[#6B705C] block">Setores Ativos</span>
            <span className="text-xl font-bold text-[#2C3327] mt-0.5 block">
              {new Set(allUsers.map(u => u.sector)).size}
            </span>
            <span className="text-[10px] text-[#6B705C]">Recepção, Governança, F&B...</span>
          </div>

          <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
            <span className="text-[11px] font-medium text-[#6B705C] block">Papéis Configurados</span>
            <span className="text-xl font-bold text-[#2C3327] mt-0.5 block">
              {Object.keys(ROLE_DEFINITIONS).length}
            </span>
            <span className="text-[10px] text-[#6B705C]">Políticas RBAC pré-definidas</span>
          </div>

          <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8]">
            <span className="text-[11px] font-medium text-[#6B705C] block">Supabase Auth Realtime</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseStatus?.connected ? 'bg-[#588157] animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <span className="text-xs font-semibold text-[#2C3327]">
                {supabaseStatus?.connected ? 'Sincronizado' : 'Backend SQL'}
              </span>
            </div>
            <span className="text-[10px] text-[#6B705C]">Tabela staff_users</span>
          </div>
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E6E3D8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B705C]" />
              <input
                id="input-search-users"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-medium text-[#6B705C] whitespace-nowrap">Setor:</span>
                <select
                  id="select-filter-sector"
                  value={selectedSectorFilter}
                  onChange={e => setSelectedSectorFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden"
                >
                  <option value="ALL">Todos os Setores</option>
                  {Object.entries(SECTOR_DEFINITIONS).map(([key, def]) => (
                    <option key={key} value={key}>
                      {def.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-medium text-[#6B705C] whitespace-nowrap">Cargo:</span>
                <select
                  id="select-filter-role"
                  value={selectedRoleFilter}
                  onChange={e => setSelectedRoleFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden"
                >
                  <option value="ALL">Todos os Cargos</option>
                  {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                    <option key={key} value={key}>
                      {def.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Users List Table */}
          <div className="bg-white rounded-2xl border border-[#E6E3D8] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#2C3327]">
                <thead className="bg-[#F4F1EA] text-[#6B705C] font-semibold uppercase text-[10px] tracking-wider border-b border-[#E6E3D8]">
                  <tr>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Cargo & Papel</th>
                    <th className="px-4 py-3">Setor Operacional</th>
                    <th className="px-4 py-3">Permissões</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações & Simulação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E3D8]">
                  {filteredUsers.map(user => {
                    const roleDef = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.recepcionista;
                    const sectorDef = SECTOR_DEFINITIONS[user.sector] || SECTOR_DEFINITIONS.Geral;
                    const isCurrent = currentUser?.id === user.id;

                    return (
                      <tr
                        key={user.id}
                        id={`user-row-${user.id}`}
                        className={`hover:bg-[#FDFBF7] transition ${
                          isCurrent ? 'bg-[#E9EDC9]/30 font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <img
                                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                                alt={user.fullName}
                                className="w-9 h-9 rounded-xl object-cover border border-[#E6E3D8] bg-[#F4F1EA]"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                  user.status === 'Ativo'
                                    ? 'bg-[#588157]'
                                    : user.status === 'Inativo'
                                    ? 'bg-amber-400'
                                    : 'bg-red-500'
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-[#2C3327]">{user.fullName}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#588157] text-white">
                                    Você
                                  </span>
                                )}
                              </div>
                              <span className="text-[#6B705C] block text-[11px]">{user.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleDef.badgeColor}`}
                          >
                            {roleDef.title}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center space-x-1 text-[#2C3327]">
                            <Building2 className="w-3.5 h-3.5 text-[#6B705C]" />
                            <span>{sectorDef.label}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-[#2C3327]">
                              {user.role === 'admin' ? 'Acesso Total' : `${user.permissions.length} ativas`}
                            </span>
                            <span className="text-[10px] text-[#6B705C]">
                              ({Math.round((user.permissions.length / PERMISSION_DEFINITIONS.length) * 100)}%)
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                              user.status === 'Ativo'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Clique para alternar status do usuário"
                          >
                            {user.status === 'Ativo' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>{user.status}</span>
                          </button>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Quick RBAC Simulator Button */}
                            <button
                              id={`btn-simulate-${user.id}`}
                              onClick={() => switchUser(user)}
                              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium transition border ${
                                isCurrent
                                  ? 'bg-[#588157] text-white border-transparent'
                                  : 'bg-[#F4F1EA] hover:bg-[#EFECE4] text-[#2C3327] border-[#E6E3D8]'
                              }`}
                              title="Testar a visualização e restrições de abas deste usuário"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isCurrent ? 'Ativo' : 'Testar Perfil'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              id={`btn-edit-${user.id}`}
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 rounded-lg text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] transition"
                              title="Editar Colaborador & Permissões"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            {deleteConfirmId === user.id ? (
                              <div className="flex items-center space-x-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white"
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 rounded text-[10px] text-gray-600"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                id={`btn-delete-${user.id}`}
                                onClick={() => setDeleteConfirmId(user.id)}
                                disabled={user.role === 'admin' && allUsers.filter(u => u.role === 'admin').length <= 1}
                                className="p-1.5 rounded-lg text-[#6B705C] hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30"
                                title="Excluir Colaborador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#6B705C]">
                        Nenhum colaborador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* RBAC Sectorization Matrix */
        <div className="bg-white rounded-2xl border border-[#E6E3D8] shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#2C3327]">
              Matriz de Controle de Exibição de Funcionalidades por Setor
            </h3>
            <p className="text-xs text-[#6B705C] mt-0.5">
              Visualização de quais abas e módulos do SaaS Hoteleiro são expostos a cada perfil de colaborador
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F1EA] text-[#6B705C] font-semibold text-[11px] border-b border-[#E6E3D8]">
                <tr>
                  <th className="px-4 py-3">Módulo / Aba do Sistema</th>
                  <th className="px-4 py-3">Setor Responsável</th>
                  {Object.entries(ROLE_DEFINITIONS).map(([roleKey, roleDef]) => (
                    <th key={roleKey} className="px-3 py-3 text-center">
                      <span className="block font-bold text-[#2C3327]">{roleDef.title.split(' ')[0]}</span>
                      <span className="text-[9px] text-[#6B705C] font-normal">{roleKey}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E3D8]">
                {allTabsList.map(tab => {
                  return (
                    <tr key={tab.id} className="hover:bg-[#FDFBF7]">
                      <td className="px-4 py-3 font-semibold text-[#2C3327]">{tab.label}</td>
                      <td className="px-4 py-3 text-[#6B705C]">{tab.sector}</td>
                      {Object.keys(ROLE_DEFINITIONS).map(roleKey => {
                        const mockUser: StaffUser = {
                          id: 'mock',
                          fullName: 'Mock',
                          email: 'mock@hotel.com',
                          role: roleKey as UserRole,
                          sector: 'Geral',
                          status: 'Ativo',
                          permissions: ROLE_DEFINITIONS[roleKey as UserRole].defaultPermissions,
                          createdAt: '',
                          updatedAt: ''
                        };
                        const hasAccess = canAccessTab(mockUser, tab.id);

                        return (
                          <td key={roleKey} className="px-3 py-3 text-center">
                            {hasAccess ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400">
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Novo / Editar Colaborador com Matriz de Permissões */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E6E3D8] shadow-xl w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E6E3D8] bg-[#F4F1EA] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-white rounded-xl shadow-xs text-[#2C3327]">
                  <Shield className="w-5 h-5 text-[#588157]" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2C3327]">
                    {editingUser ? 'Editar Colaborador & Permissões' : 'Cadastrar Novo Colaborador'}
                  </h3>
                  <p className="text-xs text-[#6B705C]">
                    Defina os dados, setor operacional e o escopo exato de permissões no sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#6B705C] hover:text-[#2C3327] hover:bg-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-5 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ex: Ana Silva"
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@hotel.com"
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    Cargo / Papel (RBAC) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
                  >
                    {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                      <option key={key} value={key}>
                        {def.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    Setor Operacional *
                  </label>
                  <select
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value as UserSector })}
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
                  >
                    {Object.entries(SECTOR_DEFINITIONS).map(([key, def]) => (
                      <option key={key} value={key}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    Telefone / Ramal
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 98888-0000"
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C3327] mb-1">
                    Status da Conta
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] border border-[#E6E3D8] rounded-xl text-[#2C3327] focus:outline-hidden focus:border-[#588157]"
                  >
                    <option value="Ativo">Ativo (Acesso Liberado)</option>
                    <option value="Inativo">Inativo (Pausado temporariamente)</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div className="pt-4 border-t border-[#E6E3D8]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#2C3327]">
                      Permissões Granulares ({formData.permissions.length} selecionadas)
                    </h4>
                    <p className="text-[11px] text-[#6B705C]">
                      Marque as ações permitidas. Administradores possuem acesso total irrestrito.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToRoleDefaults}
                    className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#F4F1EA] hover:bg-[#EFECE4] text-[#2C3327] border border-[#E6E3D8] transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Redefinir para Padrão do Cargo</span>
                  </button>
                </div>

                {formData.role === 'admin' ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Acesso Total Administrador:</strong> Usuários com perfil Administrador têm acesso a todas as áreas, relatórios financeiros e configurações do sistema automaticamente.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(permissionCategories).map(([catKey, cat]) => {
                      if (cat.permissions.length === 0) return null;
                      const catKeys = cat.permissions.map(p => p.key);
                      const allSelected = catKeys.every(k => formData.permissions.includes(k));

                      return (
                        <div key={catKey} className="p-3 rounded-xl border border-[#E6E3D8] bg-[#FDFBF7]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#2C3327]">{cat.label}</span>
                            <button
                              type="button"
                              onClick={() => handleTogglePermissionGroup(catKeys)}
                              className="text-[10px] text-[#588157] font-semibold hover:underline"
                            >
                              {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cat.permissions.map(p => {
                              const checked = formData.permissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition text-xs ${
                                    checked
                                      ? 'bg-white border-[#588157]/40 shadow-2xs'
                                      : 'bg-[#F4F1EA]/50 border-transparent hover:bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleTogglePermission(p.key)}
                                    className="mt-0.5 rounded text-[#588157] focus:ring-[#588157]"
                                  />
                                  <div>
                                    <span className="font-semibold text-[#2C3327] block">{p.label}</span>
                                    <span className="text-[10px] text-[#6B705C] leading-tight block">
                                      {p.description}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#E6E3D8] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#2C3327] hover:bg-[#3D4035] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
