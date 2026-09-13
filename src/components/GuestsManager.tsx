import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  Clock3,
  Edit2,
  History,
  LogIn,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { Guest, Reservation } from '../types.ts';
import { createGuestCloud, deleteGuestCloud, loadGuestsCloud, updateGuestCloud } from '../services/adminPages.ts';
import { createGuestFromReservationCloud, unlinkInconsistentReservationGuestCloud } from '../services/guestLinkReview.ts';
import { loadReservationPreCheckInStatusesCloud, PreCheckInStatus } from '../services/preCheckin.ts';
import { useHotel } from '../context/HotelContext.tsx';
import { GuestPreCheckInModal } from './GuestPreCheckInModal.tsx';

const GUEST_NAVIGATION_KEY = 'novohotel:guest-navigation';
const CHECKOUT_ARCHIVE_AFTER_MS = 5 * 60 * 1000;

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

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function journeyForReservation(reservation: Reservation, preCheckInStatus?: PreCheckInStatus) {
  if (reservation.status === 'Pendente') {
    return { label: 'Reserva pendente', className: 'border-amber-200 bg-amber-50 text-amber-800' };
  }
  if (reservation.status === 'Confirmada') {
    if (preCheckInStatus === 'EmAndamento') {
      return { label: 'Pré-check-in em andamento', className: 'border-sky-200 bg-sky-50 text-sky-800' };
    }
    if (preCheckInStatus === 'Concluido') {
      return { label: 'Pré-check-in concluído', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
    }
    return { label: 'Pré-check-in pendente', className: 'border-[#CCD5AE] bg-[#F2F5E8] text-[#3A5A40]' };
  }
  if (reservation.status === 'CheckIn') {
    return { label: 'Hospedado', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
  }
  if (reservation.status === 'CheckOut') {
    return { label: 'Checkout concluído', className: 'border-slate-200 bg-slate-50 text-slate-700' };
  }
  return { label: 'Reserva cancelada', className: 'border-red-200 bg-red-50 text-red-700' };
}

function isReservationLinkedToGuestSafely(reservation: Reservation, guest: Guest) {
  if (!reservation.guestId || reservation.guestId !== guest.id) return false;

  const sameName = Boolean(guest.fullName && reservation.guestName) &&
    normalizeText(guest.fullName) === normalizeText(reservation.guestName);
  if (!sameName) return false;

  const comparableContacts: boolean[] = [];
  if (guest.email && reservation.guestEmail) {
    comparableContacts.push(normalizeText(guest.email) === normalizeText(reservation.guestEmail));
  }

  const guestPhone = normalizePhone(guest.phone);
  const reservationPhone = normalizePhone(reservation.guestPhone);
  if (guestPhone && reservationPhone) {
    comparableContacts.push(guestPhone === reservationPhone);
  }

  return comparableContacts.length === 0 || comparableContacts.some(Boolean);
}

function isReservationLinkedSafely(reservation: Reservation, guests: Guest[]) {
  if (!reservation.guestId) return false;
  const linked = guests.find(guest => guest.id === reservation.guestId);
  return linked ? isReservationLinkedToGuestSafely(reservation, linked) : false;
}

function preCheckInActionLabel(status: PreCheckInStatus | undefined, canManage: boolean) {
  if (!canManage || status === 'Concluido') return 'Visualizar';
  if (status === 'EmAndamento') return 'Continuar';
  return 'Preparar';
}

export const GuestsManager: React.FC = () => {
  const { reservations, hasPermission, refreshData } = useHotel();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'Todos' | Guest['status']>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [historyGuest, setHistoryGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [unlinkingReservationId, setUnlinkingReservationId] = useState<string | null>(null);
  const [creatingGuestReservationId, setCreatingGuestReservationId] = useState<string | null>(null);
  const [archiveClock, setArchiveClock] = useState(() => Date.now());
  const [preCheckInReservation, setPreCheckInReservation] = useState<Reservation | null>(null);
  const [preCheckInStatuses, setPreCheckInStatuses] = useState<Record<string, PreCheckInStatus>>({});
  const canManagePreCheckIn = hasPermission('manage_checkinout');
  const canManageGuestLinks = hasPermission('manage_guests');

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

  const refreshPreCheckInStatuses = async () => {
    try {
      setPreCheckInStatuses(await loadReservationPreCheckInStatusesCloud());
    } catch (e) {
      console.warn('[Hóspedes] Falha ao carregar status do pré-check-in:', e);
    }
  };

  useEffect(() => { refresh(); refreshPreCheckInStatuses(); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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

    const isArchivedCheckout = (reservation: Reservation) => {
      if (reservation.status !== 'CheckOut') return false;
      if (!reservation.checkedOutAt) return true;
      const checkedOutAt = new Date(reservation.checkedOutAt).getTime();
      return !Number.isFinite(checkedOutAt) || archiveClock - checkedOutAt >= CHECKOUT_ARCHIVE_AFTER_MS;
    };

    return reservations
      .filter(reservation => reservation.status !== 'Cancelada')
      .filter(reservation => !isArchivedCheckout(reservation))
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
  }, [reservations, search, archiveClock]);

  const journeyStats = useMemo(() => ({
    confirmed: reservations.filter(reservation => reservation.status === 'Confirmada').length,
    pending: reservations.filter(reservation => reservation.status === 'Pendente').length,
    staying: reservations.filter(reservation => reservation.status === 'CheckIn').length,
    linkIssues: reservations.filter(reservation =>
      reservation.status !== 'Cancelada' &&
      reservation.guestId &&
      !isReservationLinkedSafely(reservation, guests)
    ).length
  }), [reservations, guests]);

  const historyReservations = useMemo(() => {
    if (!historyGuest) return [];
    return reservations
      .filter(reservation => isReservationLinkedToGuestSafely(reservation, historyGuest))
      .sort((a, b) => {
        const aDate = a.checkedOutAt || a.checkedInAt || a.createdAt || '';
        const bDate = b.checkedOutAt || b.checkedInAt || b.createdAt || '';
        return bDate.localeCompare(aDate);
      });
  }, [reservations, historyGuest]);

  const unsafeHistoryReservations = useMemo(() => {
    if (!historyGuest) return [];
    return reservations
      .filter(reservation =>
        reservation.guestId === historyGuest.id &&
        !isReservationLinkedToGuestSafely(reservation, historyGuest)
      )
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [reservations, historyGuest]);

  const historyCountForGuest = (guest: Guest) => reservations.filter(reservation =>
    isReservationLinkedToGuestSafely(reservation, guest)
  ).length;

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

  const handlePreCheckInSaved = async () => {
    await Promise.all([refreshPreCheckInStatuses(), refreshData()]);
  };

  const handleUnlinkInconsistentReservation = async (reservation: Reservation) => {
    if (!historyGuest || !canManageGuestLinks || reservation.guestId !== historyGuest.id) return;
    const confirmed = confirm(
      `Desvincular a reserva ${reservation.code} do cadastro ${historyGuest.fullName}?\n\n` +
      'Os dados da reserva serão preservados e nenhum outro hóspede será atribuído automaticamente.'
    );
    if (!confirmed) return;

    try {
      setUnlinkingReservationId(reservation.id);
      setError(null);
      const result = await unlinkInconsistentReservationGuestCloud(reservation.id, historyGuest.id);
      setHistoryGuest(current => current ? { ...current, totalStays: result.totalStays } : current);
      await Promise.all([refresh(), refreshData()]);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível revisar o vínculo da reserva.');
    } finally {
      setUnlinkingReservationId(null);
    }
  };

  const handleCreateGuestFromReservation = async (reservation: Reservation) => {
    if (!canManageGuestLinks || reservation.guestId) return;
    const confirmed = confirm(
      `Criar um novo cadastro para ${reservation.guestName} usando os dados da reserva ${reservation.code}?\n\n` +
      'O cadastro será vinculado somente a esta reserva. Nenhum cadastro existente será escolhido automaticamente.'
    );
    if (!confirmed) return;

    try {
      setCreatingGuestReservationId(reservation.id);
      setError(null);
      await createGuestFromReservationCloud(reservation.id);
      await Promise.all([refresh(), refreshData()]);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível criar o cadastro a partir da reserva.');
    } finally {
      setCreatingGuestReservationId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider"><Users className="w-4 h-4" /> Hóspedes</div>
          <h2 className="mt-1 text-2xl font-black text-[#2C3327]">Jornada do Hóspede</h2>
          <p className="mt-1 max-w-2xl text-xs text-[#6B705C]">Reserva, pré-check-in e estadia em uma visão operacional compacta.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold shadow-sm hover:bg-[#3A4135]">
          <UserPlus className="w-4 h-4" /> Novo Hóspede
        </button>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#E6E3D8] bg-white px-3 py-2">
        <SummaryPill icon={CalendarCheck2} label="Pré-check-in" value={journeyStats.confirmed} />
        <SummaryPill icon={Clock3} label="A confirmar" value={journeyStats.pending} />
        <SummaryPill icon={LogIn} label="Hospedados" value={journeyStats.staying} />
        <SummaryPill icon={AlertTriangle} label="Vínculos a revisar" value={journeyStats.linkIssues} attention={journeyStats.linkIssues > 0} />
      </div>

      <section className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-[#2C3327]">Reservas em andamento</h3>
            <p className="text-[11px] text-[#8E9280]">Mostra somente reservas que ainda exigem ação ou acompanhamento. Checkouts concluídos saem desta visão após 5 minutos e permanecem disponíveis no histórico seguro do cadastro.</p>
          </div>
          <span className="text-[11px] font-semibold text-[#8E9280]">{journeyReservations.length} reserva(s) em andamento</span>
        </div>

        {journeyReservations.length === 0 ? (
          <div className="rounded-xl border border-[#E6E3D8] bg-white p-6 text-center text-sm text-[#8E9280]">Nenhuma reserva em andamento.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E6E3D8] bg-white">
            <table className="w-full min-w-[1040px] text-left text-xs">
              <thead className="bg-[#F4F1EA] text-[#6B705C]">
                <tr>
                  <th className="px-3 py-2.5">Hóspede</th>
                  <th className="px-3 py-2.5">Reserva</th>
                  <th className="px-3 py-2.5">Período</th>
                  <th className="px-3 py-2.5">Quarto</th>
                  <th className="px-3 py-2.5">Etapa</th>
                  <th className="px-3 py-2.5">Cadastro</th>
                  <th className="px-3 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAE1]">
                {journeyReservations.map(reservation => {
                  const preCheckInStatus = preCheckInStatuses[reservation.id];
                  const journey = journeyForReservation(reservation, preCheckInStatus);
                  const hasGuestId = Boolean(reservation.guestId);
                  const safeLink = isReservationLinkedSafely(reservation, guests);
                  const linkIsInconsistent = hasGuestId && !safeLink;
                  const creatingGuest = creatingGuestReservationId === reservation.id;
                  return (
                    <tr key={reservation.id} className="hover:bg-[#FAF9F5]">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-[#2C3327]">{reservation.guestName}</div>
                        <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-[#8E9280]">{reservation.guestEmail || reservation.guestPhone || 'Contato não informado'}</div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#6B705C]">{reservation.code}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#6B705C]">{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}</td>
                      <td className="px-3 py-2.5 text-[#6B705C]">{reservation.roomNumber ? `Qto ${reservation.roomNumber}` : reservation.roomTypeName}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${journey.className}`}>{journey.label}</span></td>
                      <td className="px-3 py-2.5">
                        {safeLink ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#3A5A40]"><UserCheck className="h-3.5 w-3.5" /> Vinculado</span>
                        ) : linkIsInconsistent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Revisar vínculo</span>
                        ) : canManageGuestLinks ? (
                          <button
                            type="button"
                            disabled={Boolean(creatingGuestReservationId)}
                            onClick={() => handleCreateGuestFromReservation(reservation)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#CCD5AE] bg-[#F2F5E8] px-2 py-1.5 text-[10px] font-bold text-[#3A5A40] hover:bg-[#E8EEDB] disabled:opacity-50"
                            title="Criar cadastro usando os dados desta reserva"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> {creatingGuest ? 'Criando...' : 'Criar cadastro'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#8E9280]">Ainda não vinculado</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {reservation.status === 'Confirmada' ? (
                          <button type="button" onClick={() => setPreCheckInReservation(reservation)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CCD5AE] bg-[#F2F5E8] px-2.5 py-1.5 text-[10px] font-bold text-[#3A5A40] hover:bg-[#E8EEDB]">
                            <CalendarCheck2 className="h-3.5 w-3.5" /> {preCheckInActionLabel(preCheckInStatus, canManagePreCheckIn)}
                          </button>
                        ) : <span className="text-[10px] text-[#B0B3A5]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-[#E6E3D8] pt-5">
        <div>
          <h3 className="text-sm font-black text-[#2C3327]">Cadastros de hóspedes</h3>
          <p className="mt-1 text-xs text-[#8E9280]">Cadastro permanente para consulta, edição e histórico seguro de reservas.</p>
        </div>

        <div className="bg-white border border-[#E6E3D8] rounded-xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9280]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, documento, e-mail, telefone ou reserva" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E6E3D8] text-sm outline-none focus:ring-2 focus:ring-[#CCD5AE]" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {(['Todos','Ativo','VIP','Restricao'] as const).map(s => <button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${status===s?'bg-[#2C3327] text-white':'bg-[#F4F1EA] text-[#6B705C]'}`}>{s==='Restricao'?'Restrição':s}</button>)}
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-[#E6E3D8] rounded-xl p-8 text-center text-sm text-[#6B705C]">Carregando hóspedes...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E6E3D8] rounded-xl p-8 text-center">
            <Users className="w-7 h-7 mx-auto text-[#A3B18A]" />
            <p className="mt-2 font-bold text-[#2C3327]">Nenhum hóspede encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E6E3D8] bg-white">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="bg-[#F4F1EA] text-[#6B705C]">
                <tr>
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="px-3 py-2.5">Documento</th>
                  <th className="px-3 py-2.5">Contato</th>
                  <th className="px-3 py-2.5">Localidade</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-center">Histórico</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAE1]">
                {filtered.map(g => {
                  const safeHistoryCount = historyCountForGuest(g);
                  const hasUnsafeLinks = reservations.some(reservation =>
                    reservation.guestId === g.id && !isReservationLinkedToGuestSafely(reservation, g)
                  );
                  return (
                    <tr key={g.id} className="hover:bg-[#FAF9F5]">
                      <td className="px-3 py-2.5 font-bold text-[#2C3327]">{g.fullName}</td>
                      <td className="px-3 py-2.5 text-[#6B705C]">{g.document ? `${g.documentType}: ${g.document}` : 'Não informado'}</td>
                      <td className="px-3 py-2.5 text-[#6B705C]"><div>{g.phone || 'Sem telefone'}</div><div className="max-w-[220px] truncate text-[10px] text-[#8E9280]">{g.email || 'Sem e-mail'}</div></td>
                      <td className="px-3 py-2.5 text-[#6B705C]">{[g.city, g.state].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="px-3 py-2.5"><span className="rounded-full border border-[#CCD5AE] bg-[#F2F5E8] px-2 py-1 text-[10px] font-bold text-[#3A5A40]">{g.status === 'Restricao' ? 'Restrição' : g.status}</span></td>
                      <td className="px-3 py-2.5 text-center">
                        <button type="button" onClick={() => setHistoryGuest(g)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E3D8] bg-[#FAF9F5] px-2.5 py-1.5 text-[10px] font-bold text-[#6B705C] hover:bg-[#F4F1EA]" title="Abrir histórico seguro">
                          <History className="h-3.5 w-3.5" /> {safeHistoryCount}
                          {hasUnsafeLinks && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5"><div className="flex justify-end gap-1"><button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-[#F4F1EA]" title="Editar"><Edit2 className="w-4 h-4" /></button><button onClick={() => remove(g)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Excluir"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {historyGuest && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-start sm:items-center justify-center overflow-hidden">
          <div className="w-full max-w-4xl max-h-[calc(100vh-2rem)] bg-white rounded-3xl shadow-2xl border border-[#E6E3D8] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#E6E3D8] flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-[#588157] text-xs font-bold uppercase tracking-wider"><History className="h-4 w-4" /> Histórico seguro</div>
                <h3 className="mt-1 font-black text-[#2C3327]">{historyGuest.fullName}</h3>
                <p className="mt-1 text-xs text-[#8E9280]">Somente reservas com vínculo de identidade consistente são atribuídas a este cadastro.</p>
              </div>
              <button type="button" onClick={() => setHistoryGuest(null)} className="p-2 rounded-lg hover:bg-[#F4F1EA]" aria-label="Fechar histórico"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {unsafeHistoryReservations.length > 0 && (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span><strong>{unsafeHistoryReservations.length}</strong> vínculo(s) legado(s) apontam para este cadastro, mas os dados de identidade não conferem. Revise cada reserva individualmente; nenhuma reatribuição é feita automaticamente.</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-amber-200">
                    <table className="w-full min-w-[860px] text-left text-xs">
                      <thead className="bg-amber-50 text-amber-900">
                        <tr>
                          <th className="px-3 py-2.5">Reserva</th>
                          <th className="px-3 py-2.5">Hóspede na reserva</th>
                          <th className="px-3 py-2.5">Contato</th>
                          <th className="px-3 py-2.5">Etapa</th>
                          <th className="px-3 py-2.5 text-right">Revisão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 bg-white">
                        {unsafeHistoryReservations.map(reservation => {
                          const journey = journeyForReservation(reservation, preCheckInStatuses[reservation.id]);
                          const unlinking = unlinkingReservationId === reservation.id;
                          return (
                            <tr key={reservation.id}>
                              <td className="px-3 py-2.5 font-bold text-[#2C3327]">{reservation.code}</td>
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-[#2C3327]">{reservation.guestName}</div>
                                <div className="text-[10px] text-amber-700">Difere do cadastro {historyGuest.fullName}</div>
                              </td>
                              <td className="px-3 py-2.5 text-[#6B705C]">
                                <div>{reservation.guestPhone || 'Sem telefone'}</div>
                                <div className="max-w-[220px] truncate text-[10px] text-[#8E9280]">{reservation.guestEmail || 'Sem e-mail'}</div>
                              </td>
                              <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${journey.className}`}>{journey.label}</span></td>
                              <td className="px-3 py-2.5 text-right">
                                {canManageGuestLinks ? (
                                  <button
                                    type="button"
                                    disabled={Boolean(unlinkingReservationId)}
                                    onClick={() => handleUnlinkInconsistentReservation(reservation)}
                                    className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    {unlinking ? 'Desvinculando...' : 'Desvincular incorreto'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-[#8E9280]">Somente leitura</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {historyReservations.length === 0 ? (
                <div className="rounded-xl border border-[#E6E3D8] bg-[#FAF9F5] p-8 text-center text-sm text-[#8E9280]">Nenhuma reserva com vínculo seguro encontrada para este cadastro.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E6E3D8]">
                  <table className="w-full min-w-[820px] text-left text-xs">
                    <thead className="bg-[#F4F1EA] text-[#6B705C]">
                      <tr>
                        <th className="px-3 py-2.5">Reserva</th>
                        <th className="px-3 py-2.5">Período</th>
                        <th className="px-3 py-2.5">Quarto</th>
                        <th className="px-3 py-2.5">Etapa</th>
                        <th className="px-3 py-2.5">Valor</th>
                        <th className="px-3 py-2.5">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEAE1]">
                      {historyReservations.map(reservation => {
                        const journey = journeyForReservation(reservation, preCheckInStatuses[reservation.id]);
                        return (
                          <tr key={reservation.id} className="hover:bg-[#FAF9F5]">
                            <td className="px-3 py-2.5 font-bold text-[#2C3327]">{reservation.code}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-[#6B705C]">{formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}</td>
                            <td className="px-3 py-2.5 text-[#6B705C]">{reservation.roomNumber ? `Qto ${reservation.roomNumber}` : reservation.roomTypeName}</td>
                            <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${journey.className}`}>{journey.label}</span></td>
                            <td className="px-3 py-2.5 font-semibold text-[#6B705C]">{formatCurrency(reservation.totalNightsAmount)}</td>
                            <td className="px-3 py-2.5 text-[#6B705C]"><div>{reservation.paymentStatus}</div><div className="text-[10px] text-[#8E9280]">{reservation.paymentMethod || '—'}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {preCheckInReservation && (
        <GuestPreCheckInModal
          reservation={preCheckInReservation}
          canManage={canManagePreCheckIn}
          onClose={() => setPreCheckInReservation(null)}
          onSaved={handlePreCheckInSaved}
        />
      )}

      <style>{`.input{width:100%;padding:.65rem .75rem;border:1px solid #E6E3D8;border-radius:.75rem;outline:none;color:#3D4035;background:white}.input:focus{box-shadow:0 0 0 2px #CCD5AE}`}</style>
    </div>
  );
};

const SummaryPill: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  attention?: boolean;
}> = ({ icon: Icon, label, value, attention }) => (
  <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${attention ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#EEEAE1] bg-[#FAF9F5] text-[#6B705C]'}`}>
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
    <strong className="text-[#2C3327]">{value}</strong>
  </div>
);

const Field: React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => <label className="block"><span className="block text-xs font-semibold text-[#6B705C] mb-1.5">{label}</span>{children}</label>;
