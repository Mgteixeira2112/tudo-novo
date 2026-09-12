import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Edit2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { Guest, Reservation } from '../types.ts';
import { createGuestCloud, deleteGuestCloud, loadGuestsCloud, updateGuestCloud } from '../services/adminPages.ts';
import { useHotel } from '../context/HotelContext.tsx';

const GUEST_NAVIGATION_KEY = 'novohotel:guest-navigation';

const emptyForm = {
  fullName: '', document: '', documentType: 'CPF' as Guest['documentType'], email: '', phone: '',
  address: '', city: '', state: '', birthDate: '', preferences: '', allergiesNotes: '', status: 'Ativo' as Guest['status']
};

function normalizeText(value?: string | null) {
  return (value || '').trim().toLocaleLowerCase('pt-BR');
}

function normalizePhone(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function formatDate(value?: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function journeyForReservation(reservation: Reservation) {
  if (reservation.status === 'Pendente') {
    return {
      label: 'Reserva pendente',
      detail: 'Aguardando confirmação no Motor de Reservas.',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: Clock3
    };
  }
  if (reservation.status === 'Confirmada') {
    return {
      label: 'Pré-check-in pendente',
      detail: 'Reserva confirmada e pronta para iniciar a preparação dos dados do hóspede.',
      className: 'border-[#CCD5AE] bg-[#F2F5E8] text-[#3A5A40]',
      icon: CalendarCheck2
    };
  }
  if (reservation.status === 'CheckIn') {
    return {
      label: 'Hospedado',
      detail: 'Check-in realizado e estadia em andamento.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      icon: LogIn
    };
  }
  if (reservation.status === 'CheckOut') {
    return {
      label: 'Checkout concluído',
      detail: 'Estadia encerrada e mantida no histórico do hóspede.',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: LogOut
    };
  }
  return {
    label: 'Reserva cancelada',
    detail: 'Reserva cancelada.',
    className: 'border-red-200 bg-red-50 text-red-700',
    icon: X
  };
}

function isReservationLinkedSafely(reservation: Reservation, guests: Guest[]) {
  if (!reservation.guestId) return false;
  const linked = guests.find(guest => guest.id === reservation.guestId);
  if (!linked) return false;

  const sameName = normalizeText(linked.fullName) === normalizeText(reservation.guestName);
  const sameEmail = Boolean(linked.email && reservation.guestEmail) && normalizeText(linked.email) === normalizeText(reservation.guestEmail);
  const linkedPhone = normalizePhone(linked.phone);
  const reservationPhone = normalizePhone(reservation.guestPhone);
  const samePhone = Boolean(linkedPhone && reservationPhone) && linkedPhone === reservationPhone;

  return sameName || sameEmail || samePhone;
}

export const GuestsManager: React.FC = () => {
  const { reservations } = useHotel();
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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(GUEST_NAVIGATION_KEY);
      if (!raw) return;
      sessionStorage.removeItem(GUEST_NAVIGATION_KEY);
      const parsed = JSON.parse(raw) as { query?: string };
      if (!parsed?.query) return;
      setStatus('Todos');
      setSearch(parsed.query);
    } catch {}
  }, []);

  const filtered = useMemo(() => guests.filter(g => {
    const q = search.trim().toLowerCase();
    const matches = !q || [g.fullName, g.document, g.email, g.phone].some(v => (v || '').toLowerCase().includes(q));
    return matches && (status === 'Todos' || g.status === status);
  }), [guests, search, status]);

  const journeyReservations = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    const priority: Record<Reservation['status'], number> = {
      Confirmada: 0,
      Pendente: 1,
      CheckIn: 2,
      CheckOut: 3,
      Cancelada: 4
    };

    return reservations
      .filter(reservation => reservation.status !== 'Cancelada')
      .filter(reservation => !q || [
        reservation.guestName,
        reservation.guestEmail,
        reservation.guestPhone,
        reservation.code,
        reservation.roomNumber
      ].some(value => normalizeText(value).includes(q)))
      .sort((a, b) => {
        const byStatus = priority[a.status] - priority[b.status];
        if (byStatus !== 0) return byStatus;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [reservations, search]);

  const journeyStats = useMemo(() => ({
    confirmed: reservations.filter(reservation => reservation.status === 'Confirmada').length,
    pending: reservations.filter(reservation => reservation.status === 'Pendente').length,
    staying: reservations.filter(reservation => reservation.status === 'CheckIn').length,
    linkIssues: reservations.filter(reservation =>
      ['Confirmada', 'CheckIn', 'CheckOut'].includes(reservation.status) &&
      reservation.guestId &&
      !isReservationLinkedSafely(reservation, guests)
    ).length
  }), [reservations, guests]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider"><Users className="w-4 h-4" /> Hóspedes</div>
          <h2 className="mt-1 text-2xl font-black text-[#2C3327]">Jornada do Hóspede</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B705C]">Acompanhe a reserva confirmada, a preparação para o pré-check-in, a estadia e o histórico sem misturar o cadastro operacional com CRM.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold shadow-sm hover:bg-[#3A4135]">
          <UserPlus className="w-4 h-4" /> Novo Hóspede
        </button>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <JourneyCounter icon={CalendarCheck2} label="Pré-check-in" value={journeyStats.confirmed} detail="reservas confirmadas" />
        <JourneyCounter icon={Clock3} label="A confirmar" value={journeyStats.pending} detail="no motor de reservas" />
        <JourneyCounter icon={LogIn} label="Hospedados" value={journeyStats.staying} detail="check-in realizado" />
        <JourneyCounter icon={AlertTriangle} label="Vínculos a revisar" value={journeyStats.linkIssues} detail="sem atribuir pessoa errada" attention={journeyStats.linkIssues > 0} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-[#2C3327]">Fluxo atual</h3>
            <p className="mt-1 text-xs text-[#8E9280]">A confirmação continua no Motor de Reservas. Hóspedes assume a jornada a partir da reserva confirmada.</p>
          </div>
          <span className="text-[11px] font-semibold text-[#8E9280]">{journeyReservations.length} reserva(s) na jornada</span>
        </div>

        {journeyReservations.length === 0 ? (
          <div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#8E9280]">Nenhuma reserva encontrada para os filtros atuais.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {journeyReservations.map(reservation => {
              const journey = journeyForReservation(reservation);
              const JourneyIcon = journey.icon;
              const hasGuestId = Boolean(reservation.guestId);
              const safeLink = isReservationLinkedSafely(reservation, guests);
              const linkIsInconsistent = hasGuestId && !safeLink;

              return (
                <article key={reservation.id} className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-black text-[#2C3327]">{reservation.guestName}</h4>
                        <span className="rounded-md bg-[#F4F1EA] px-2 py-1 text-[10px] font-bold text-[#6B705C]">{reservation.code}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B705C]">{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)} · {reservation.roomTypeName}{reservation.roomNumber ? ` · Qto ${reservation.roomNumber}` : ''}</p>
                    </div>
                    <div className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${journey.className}`}>
                      <JourneyIcon className="h-3.5 w-3.5" /> {journey.label}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-[#EEEAE1] bg-[#FAF9F5] px-3 py-2.5">
                    <p className="text-[11px] leading-relaxed text-[#6B705C]">{journey.detail}</p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#EEEAE1] px-3 py-2.5 text-[11px] text-[#6B705C]">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-[#8E9280]">Contato da reserva</span>
                      <span className="mt-1 block truncate">{reservation.guestEmail || 'E-mail não informado'}</span>
                      <span className="block">{reservation.guestPhone || 'Telefone não informado'}</span>
                    </div>
                    <div className={`rounded-xl border px-3 py-2.5 text-[11px] ${linkIsInconsistent ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#EEEAE1] text-[#6B705C]'}`}>
                      <span className="block text-[9px] font-bold uppercase tracking-wider opacity-70">Cadastro do hóspede</span>
                      {safeLink ? (
                        <span className="mt-1 flex items-center gap-1.5 font-semibold text-[#3A5A40]"><UserCheck className="h-3.5 w-3.5" /> Perfil vinculado</span>
                      ) : linkIsInconsistent ? (
                        <span className="mt-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Vínculo inconsistente — revisar</span>
                      ) : (
                        <span className="mt-1 block">Perfil ainda não vinculado. Será resolvido na preparação/check-in.</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-[#E6E3D8] pt-6">
        <div>
          <h3 className="text-sm font-black text-[#2C3327]">Cadastros de hóspedes</h3>
          <p className="mt-1 text-xs text-[#8E9280]">Perfil permanente: identificação, contato, preferências e histórico. Os dados de cada viagem serão tratados separadamente no pré-check-in.</p>
        </div>

        <div className="bg-white border border-[#E6E3D8] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9280]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por hóspede, reserva, documento, e-mail ou telefone" className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E6E3D8] text-sm outline-none focus:ring-2 focus:ring-[#CCD5AE]" />
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
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-start sm:items-center justify-center overflow-hidden">
          <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] bg-white rounded-3xl shadow-2xl border border-[#E6E3D8] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#E6E3D8] flex items-center justify-between shrink-0">
              <h3 className="font-black text-[#2C3327]">{editing ? 'Editar Hóspede' : 'Novo Hóspede'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-[#F4F1EA]" aria-label="Fechar formulário"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
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
              <div className="sm:col-span-2 sticky bottom-0 -mx-5 -mb-5 mt-1 flex justify-end gap-2 border-t border-[#E6E3D8] bg-white px-5 py-4">
                <button type="button" onClick={()=>setModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#F4F1EA] text-xs font-bold">Cancelar</button>
                <button disabled={saving} type="submit" className="px-4 py-2 rounded-xl bg-[#2C3327] text-white text-xs font-bold disabled:opacity-50">{saving?'Salvando...':'Salvar Hóspede'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`.input{width:100%;padding:.65rem .75rem;border:1px solid #E6E3D8;border-radius:.75rem;outline:none;color:#3D4035;background:white}.input:focus{box-shadow:0 0 0 2px #CCD5AE}`}</style>
    </div>
  );
};

const JourneyCounter: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  detail: string;
  attention?: boolean;
}> = ({ icon: Icon, label, value, detail, attention = false }) => (
  <div className={`rounded-2xl border bg-white p-4 ${attention ? 'border-amber-300' : 'border-[#E6E3D8]'}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9280]">{label}</span>
      <Icon className={`h-4 w-4 ${attention ? 'text-amber-600' : 'text-[#588157]'}`} />
    </div>
    <strong className="mt-2 block text-2xl font-black text-[#2C3327]">{value}</strong>
    <span className="mt-1 block text-[10px] text-[#8E9280]">{detail}</span>
  </div>
);

const Field: React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => <label className="block"><span className="block text-xs font-semibold text-[#6B705C] mb-1.5">{label}</span>{children}</label>;
