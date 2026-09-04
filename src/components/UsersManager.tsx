import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit2, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { PermissionKey, StaffUser, UserRole, UserSector } from '../types.ts';
import { PERMISSION_DEFINITIONS, ROLE_DEFINITIONS, SECTOR_DEFINITIONS } from '../services/rbac.ts';
import { createStaffCloud, deactivateStaffCloud, loadStaffCloud, updateStaffCloud } from '../services/adminPages.ts';

const roleEntries = Object.entries(ROLE_DEFINITIONS) as [UserRole, (typeof ROLE_DEFINITIONS)[UserRole]][];
const sectorEntries = Object.entries(SECTOR_DEFINITIONS) as [UserSector, (typeof SECTOR_DEFINITIONS)[UserSector]][];
const permissionEntries = Object.entries(PERMISSION_DEFINITIONS) as [PermissionKey, (typeof PERMISSION_DEFINITIONS)[PermissionKey]][];

const emptyForm = {
  fullName: '', email: '', password: '', role: 'recepcionista' as UserRole,
  sector: 'Recepcao' as UserSector,
  permissions: [...ROLE_DEFINITIONS.recepcionista.defaultPermissions] as PermissionKey[]
};

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers(await loadStaffCloud());
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar a equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => !q || [u.fullName, u.email, u.role, u.sector].some(v => String(v || '').toLowerCase().includes(q)));
  }, [users, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setNotice(null);
    setModalOpen(true);
  };

  const openEdit = (user: StaffUser) => {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      sector: user.sector,
      permissions: [...user.permissions]
    });
    setNotice(null);
    setModalOpen(true);
  };

  const changeRole = (role: UserRole) => {
    const def = ROLE_DEFINITIONS[role];
    setForm(prev => ({ ...prev, role, sector: def.defaultSector, permissions: [...def.defaultPermissions] }));
  };

  const togglePermission = (key: PermissionKey) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key) ? prev.permissions.filter(p => p !== key) : [...prev.permissions, key]
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      if (editing) {
        await updateStaffCloud(editing.id, {
          fullName: form.fullName.trim(), role: form.role, sector: form.sector, permissions: form.permissions
        });
        setNotice('Colaborador atualizado com sucesso.');
      } else {
        const result = await createStaffCloud({
          fullName: form.fullName.trim(), email: form.email.trim(), password: form.password,
          role: form.role, sector: form.sector, permissions: form.permissions
        });
        setNotice(result.requiresEmailConfirmation
          ? 'Colaborador criado. O e-mail precisa ser confirmado antes do primeiro acesso.'
          : 'Colaborador criado e pronto para acesso.');
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user: StaffUser) => {
    if (!confirm(`Desativar o acesso de ${user.fullName}?`)) return;
    try {
      await deactivateStaffCloud(user.id);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Erro ao desativar colaborador.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider"><ShieldCheck className="w-4 h-4" /> Administração</div>
          <h2 className="mt-1 text-2xl font-black text-[#2C3327]">Equipe & Controle de Acesso</h2>
          <p className="mt-1 text-sm text-[#6B705C]">Colaboradores, setores, papéis e permissões usando o RBAC já existente.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold shadow-sm hover:bg-[#3A4135]">
          <UserPlus className="w-4 h-4" /> Novo Colaborador
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}
      {notice && <div className="rounded-xl border border-[#CCD5AE] bg-[#F2F5E8] px-4 py-3 text-xs text-[#3A5A40]">{notice}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Colaboradores" value={users.length} />
        <Metric label="Ativos" value={users.filter(u => u.status === 'Ativo').length} />
        <Metric label="Setores" value={new Set(users.map(u => u.sector)).size} />
        <Metric label="Papéis RBAC" value={roleEntries.length} />
      </div>

      <div className="bg-white border border-[#E6E3D8] rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9280]" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar colaborador, e-mail, papel ou setor" className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E6E3D8] text-sm outline-none focus:ring-2 focus:ring-[#CCD5AE]" />
        </div>
      </div>

      {loading ? <div className="bg-white border border-[#E6E3D8] rounded-2xl p-10 text-center text-sm text-[#6B705C]">Carregando equipe...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(user => (
            <article key={user.id} className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-[#2C3327]">{user.fullName}</h3>
                  <p className="text-xs text-[#8E9280] mt-1">{user.email}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${user.status==='Ativo'?'bg-[#F2F5E8] text-[#3A5A40] border-[#CCD5AE]':'bg-[#F4F1EA] text-[#7A756D] border-[#E6E3D8]'}`}>{user.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><span className="block text-[#8E9280]">Papel</span><strong className="text-[#2C3327]">{ROLE_DEFINITIONS[user.role]?.label || user.role}</strong></div>
                <div><span className="block text-[#8E9280]">Setor</span><strong className="text-[#2C3327]">{SECTOR_DEFINITIONS[user.sector]?.label || user.sector}</strong></div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#EEEAE1]">
                <span className="text-[10px] uppercase tracking-wider text-[#8E9280] font-bold">Permissões</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.permissions.slice(0,5).map(p => <span key={p} className="px-2 py-1 rounded-lg bg-[#F7F8F2] text-[#5D6355] text-[10px]">{PERMISSION_DEFINITIONS[p]?.label || p}</span>)}
                  {user.permissions.length > 5 && <span className="px-2 py-1 text-[10px] text-[#8E9280]">+{user.permissions.length-5}</span>}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=>openEdit(user)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F4F1EA] text-xs font-bold"><Edit2 className="w-3.5 h-3.5" /> Editar</button>
                {user.role !== 'admin' && <button onClick={()=>deactivate(user)} className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold">Desativar</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-5 flex items-start justify-center overflow-hidden">
          <div className="w-full max-w-3xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] bg-white rounded-2xl sm:rounded-3xl border border-[#E6E3D8] shadow-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 sm:p-5 border-b border-[#E6E3D8] flex items-center justify-between bg-white">
              <div className="min-w-0 pr-3">
                <h3 className="font-black text-[#2C3327]">{editing?'Editar Colaborador':'Novo Colaborador'}</h3>
                <p className="text-xs text-[#8E9280] mt-1">A conta usa Supabase Auth e as permissões RBAC já existentes.</p>
              </div>
              <button type="button" onClick={()=>setModalOpen(false)} className="shrink-0 p-2 rounded-lg hover:bg-[#F4F1EA]"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={save} className="min-h-0 flex flex-1 flex-col">
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nome Completo *"><input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} className="input" /></Field>
                  <Field label="E-mail *"><input required type="email" disabled={!!editing} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input disabled:opacity-60" /></Field>
                  {!editing && <Field label="Senha Inicial *"><input required minLength={6} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="input" /></Field>}
                  <Field label="Papel"><select value={form.role} onChange={e=>changeRole(e.target.value as UserRole)} className="input">{roleEntries.map(([key,def])=><option key={key} value={key}>{def.label}</option>)}</select></Field>
                  <Field label="Setor"><select value={form.sector} onChange={e=>setForm({...form,sector:e.target.value as UserSector})} className="input">{sectorEntries.map(([key,def])=><option key={key} value={key}>{def.label}</option>)}</select></Field>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div><h4 className="text-sm font-black text-[#2C3327]">Permissões</h4><p className="text-xs text-[#8E9280]">Marque apenas o que este colaborador precisa acessar.</p></div>
                    <button type="button" onClick={()=>setForm({...form,permissions:[...ROLE_DEFINITIONS[form.role].defaultPermissions]})} className="text-xs font-bold text-[#588157] self-start sm:self-auto">Restaurar padrão do papel</button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissionEntries.map(([key,def]) => <label key={key} className="flex items-start gap-3 rounded-xl border border-[#E6E3D8] p-3 cursor-pointer hover:bg-[#FAF9F5]"><input type="checkbox" checked={form.permissions.includes(key)} onChange={()=>togglePermission(key)} className="mt-0.5" /><span><strong className="block text-xs text-[#2C3327]">{def.label}</strong><span className="block mt-0.5 text-[11px] text-[#8E9280]">{def.description}</span></span></label>)}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-[#E6E3D8] bg-white p-4 sm:p-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={()=>setModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-[#F4F1EA] text-xs font-bold">Cancelar</button>
                <button disabled={saving} className="px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold disabled:opacity-50">{saving?'Salvando...':editing?'Salvar Alterações':'Criar Colaborador'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`.input{width:100%;padding:.65rem .75rem;border:1px solid #E6E3D8;border-radius:.75rem;outline:none;color:#3D4035;background:white}.input:focus{box-shadow:0 0 0 2px #CCD5AE}`}</style>
    </div>
  );
};

const Metric: React.FC<{label:string;value:number}> = ({label,value}) => <div className="bg-white border border-[#E6E3D8] rounded-2xl p-4"><span className="text-[10px] uppercase tracking-wider font-bold text-[#8E9280]">{label}</span><strong className="block mt-1 text-2xl text-[#2C3327]">{value}</strong></div>;
const Field: React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => <label className="block"><span className="block text-xs font-semibold text-[#6B705C] mb-1.5">{label}</span>{children}</label>;
