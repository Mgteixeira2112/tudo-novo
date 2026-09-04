import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit2, Mail, MapPin, Phone, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { Guest } from '../types.ts';
import { createGuestCloud, deleteGuestCloud, loadGuestsCloud, updateGuestCloud } from '../services/adminPages.ts';

const emptyForm = {
  fullName: '', document: '', documentType: 'CPF' as Guest['documentType'], email: '', phone: '',
  address: '', city: '', state: '', birthDate: '', preferences: '', allergiesNotes: '', status: 'Ativo' as Guest['status']
};

export const GuestsManager: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'Todos' | Guest['status']>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setGuests(await loadGuestsCloud());
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os hóspedes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => guests.filter(g => {
    const q = search.trim().toLowerCase();
    const matches = !q || [g.fullName, g.document, g.email, g.phone].some(v => (v || '').toLowerCase().includes(q));
    return matches && (status === 'Todos' || g.status === status);
  }), [guests, search, status]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (g: Guest) => {
    setEditing(g);
    setForm({
      fullName: g.fullName, document: g.document, documentType: g.documentType, email: g.email, phone: g.phone,
      address: g.address || '', city: g.city || '', state: g.state || '', birthDate: g.birthDate || '',
      preferences: g.preferences || '', allergiesNotes: g.allergiesNotes || '', status: g.status
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      if (editing) await updateGuestCloud(editing.id, form);
      else await createGuestCloud(form);
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar hóspede.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Guest) => {
    if (!confirm(`Excluir o cadastro de ${g.fullName}?`)) return;
    try {
      await deleteGuestCloud(g.id);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Erro ao excluir hóspede.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider"><Users className="w-4 h-4" /> Hóspedes & CRM</div>
          <h2 className="mt-1 text-2xl font-black text-[#2C3327]">Cadastro de Hóspedes</h2>
          <p className="mt-1 text-sm text-[#6B705C]">Cadastros reais armazenados no Supabase e usados pelas reservas do hotel.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold shadow-sm hover:bg-[#3A4135]">
          <UserPlus className="w-4 h-4" /> Novo Hóspede
        </button>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}

      <div className="bg-white border border-[#E6E3D8] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, documento, e-mail ou telefone" className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E6E3D8] text-sm outline-none focus:ring-2 focus:ring-[#CCD5AE]" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(['Todos','Ativo','VIP','Restricao'] as const).map(s => <button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${status===s?'bg-[#2C3327] text-white':'bg-[#F4F1EA] text-[#6B705C]'}`}>{s==='Restricao'?'Restrição':s}</button>)}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-10 text-center text-sm text-[#6B705C]">Carregando hóspedes...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-10 text-center">
          <Users className="w-8 h-8 mx-auto text-[#A3B18A]" />
          <p className="mt-3 font-bold text-[#2C3327]">Nenhum hóspede encontrado</p>
          <p className="mt-1 text-xs text-[#8E9280]">Os cadastros existentes aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(g => (
            <article key={g.id} className="bg-white border border-[#E6E3D8] rounded-2xl p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-[#2C3327]">{g.fullName}</h3>
                  <p className="text-xs text-[#8E9280] mt-1">{g.documentType}: {g.document || 'não informado'}</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-[#F2F5E8] text-[#3A5A40] text-[10px] font-bold border border-[#CCD5AE]">{g.status}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-[#EEEAE1] space-y-2 text-xs text-[#6B705C]">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> <span className="truncate">{g.email || 'Sem e-mail'}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {g.phone || 'Sem telefone'}</div>
                {(g.city || g.state) && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {[g.city,g.state].filter(Boolean).join(' / ')}</div>}
              </div>
              {(g.preferences || g.allergiesNotes) && <div className="mt-4 space-y-2 text-[11px]">
                {g.preferences && <div className="rounded-lg bg-[#F7F8F2] p-2 text-[#5D6355]"><strong>Preferências:</strong> {g.preferences}</div>}
                {g.allergiesNotes && <div className="rounded-lg bg-amber-50 p-2 text-amber-800"><strong>Alergias/Restrições:</strong> {g.allergiesNotes}</div>}
              </div>}
              <div className="mt-4 pt-4 border-t border-[#EEEAE1] flex items-center justify-between">
                <span className="text-[11px] text-[#8E9280]">{g.totalStays} estadia(s)</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(g)} className="p-2 rounded-lg hover:bg-[#F4F1EA]" title="Editar"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(g)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E6E3D8] my-6">
          <div className="p-5 border-b border-[#E6E3D8] flex items-center justify-between">
            <div><h3 className="font-black text-[#2C3327]">{editing?'Editar Hóspede':'Novo Hóspede'}</h3><p className="text-xs text-[#8E9280] mt-1">Os dados serão salvos diretamente no cadastro central do hotel.</p></div>
            <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-[#F4F1EA]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={save} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome Completo *"><input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} className="input" /></Field>
            <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Guest['status']})} className="input"><option>Ativo</option><option>VIP</option><option value="Restricao">Restrição</option></select></Field>
            <Field label="Tipo de Documento"><select value={form.documentType} onChange={e=>setForm({...form,documentType:e.target.value as Guest['documentType']})} className="input"><option>CPF</option><option>RG</option><option>Passaporte</option></select></Field>
            <Field label="Documento"><input value={form.document} onChange={e=>setForm({...form,document:e.target.value})} className="input" /></Field>
            <Field label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input" /></Field>
            <Field label="Telefone / WhatsApp"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input" /></Field>
            <Field label="Cidade"><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="input" /></Field>
            <Field label="Estado"><input value={form.state} onChange={e=>setForm({...form,state:e.target.value})} className="input" /></Field>
            <Field label="Data de Nascimento"><input type="date" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})} className="input" /></Field>
            <Field label="Endereço"><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="input" /></Field>
            <div className="sm:col-span-2"><Field label="Preferências"><textarea rows={2} value={form.preferences} onChange={e=>setForm({...form,preferences:e.target.value})} className="input" /></Field></div>
            <div className="sm:col-span-2"><Field label="Restrições Médicas / Alergias"><textarea rows={2} value={form.allergiesNotes} onChange={e=>setForm({...form,allergiesNotes:e.target.value})} className="input" /></Field></div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#F4F1EA] text-xs font-bold">Cancelar</button><button disabled={saving} className="px-4 py-2 rounded-xl bg-[#2C3327] text-white text-xs font-bold disabled:opacity-50">{saving?'Salvando...':'Salvar Hóspede'}</button></div>
          </form>
        </div>
      </div>}
      <style>{`.input{width:100%;padding:.65rem .75rem;border:1px solid #E6E3D8;border-radius:.75rem;outline:none;color:#3D4035;background:white}.input:focus{box-shadow:0 0 0 2px #CCD5AE}`}</style>
    </div>
  );
};

const Field: React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => <label className="block"><span className="block text-xs font-semibold text-[#6B705C] mb-1.5">{label}</span>{children}</label>;
