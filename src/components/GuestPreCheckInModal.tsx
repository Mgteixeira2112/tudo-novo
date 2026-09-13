import React, { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Link2, Save, X } from 'lucide-react';
import { Reservation } from '../types.ts';
import {
  buildPublicPreCheckInUrl,
  issueReservationPreCheckInLinkCloud,
  loadReservationPreCheckInCloud,
  ReservationPreCheckInData,
  saveReservationPreCheckInStaffCloud
} from '../services/preCheckin.ts';

const emptyData: ReservationPreCheckInData = {
  travelReason: '',
  travelOrigin: '',
  nextDestination: '',
  transportMode: '',
  vehiclePlate: '',
  minorsCount: 0,
  legallyIncapableCount: 0,
  responsibilityNotes: '',
  preCheckinStatus: 'NaoIniciado'
};

export const GuestPreCheckInModal: React.FC<{
  reservation: Reservation;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}> = ({ reservation, canManage, onClose, onSaved }) => {
  const [form, setForm] = useState<ReservationPreCheckInData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCompleted = form.preCheckinStatus === 'Concluido';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setForm(emptyData);
    loadReservationPreCheckInCloud(reservation.id)
      .then(data => { if (active) setForm(data); })
      .catch((e: any) => { if (active) setError(e?.message || 'Não foi possível carregar o pré-check-in.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reservation.id]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || reservation.status !== 'Confirmada' || isCompleted) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await saveReservationPreCheckInStaffCloud({
        reservationId: reservation.id,
        travelReason: form.travelReason,
        travelOrigin: form.travelOrigin,
        nextDestination: form.nextDestination,
        transportMode: form.transportMode,
        vehiclePlate: form.vehiclePlate,
        minorsCount: Number(form.minorsCount || 0),
        legallyIncapableCount: Number(form.legallyIncapableCount || 0),
        responsibilityNotes: form.responsibilityNotes
      });
      setForm(updated);
      await onSaved();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar o pré-check-in.');
    } finally {
      setSaving(false);
    }
  };

  const generateLink = async () => {
    if (!canManage || reservation.status !== 'Confirmada' || isCompleted) return;
    try {
      setGeneratingLink(true);
      setError(null);
      const issued = await issueReservationPreCheckInLinkCloud(reservation.id);
      const url = buildPublicPreCheckInUrl(issued.token);
      try {
        await navigator.clipboard.writeText(url);
        window.alert(`Link da reserva ${reservation.code} copiado para a área de transferência.`);
      } catch {
        window.prompt(`Copie o link da reserva ${reservation.code}:`, url);
      }
    } catch (e: any) {
      setError(e?.message || 'Não foi possível gerar o link de pré-check-in.');
    } finally {
      setGeneratingLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Pré-check-in da reserva ${reservation.code}`}>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#E6E3D8] bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E6E3D8] px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#588157]"><ClipboardCheck className="h-4 w-4" /> Pré-check-in</div>
            <h3 className="mt-1 text-lg font-black text-[#2C3327]">{reservation.guestName}</h3>
            <p className="mt-0.5 text-xs text-[#8E9280]">Reserva {reservation.code} · {reservation.roomNumber ? `Quarto ${reservation.roomNumber}` : reservation.roomTypeName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[#F4F1EA]" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </header>

        <form onSubmit={save} className="overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#6B705C]">Carregando dados do pré-check-in...</div>
          ) : (
            <div className="space-y-5">
              {error && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

              <div className="rounded-xl border border-[#E6E3D8] bg-[#FAF9F5] px-4 py-3 text-xs text-[#6B705C]">
                <strong className="text-[#2C3327]">Etapa administrativa:</strong> estes dados preparam a chegada. O aceite da declaração e a conclusão do pré-check-in serão feitos pelo próprio hóspede no link público.
              </div>

              {isCompleted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                  Este pré-check-in já foi concluído pelo hóspede. A preparação administrativa e a geração de novos links estão bloqueadas para esta reserva.
                </div>
              )}

              <section>
                <h4 className="mb-3 text-sm font-black text-[#2C3327]">Dados desta viagem</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Motivo da viagem"><input disabled={isCompleted} value={form.travelReason} onChange={e => setForm({ ...form, travelReason: e.target.value })} className="precheck-input" placeholder="Ex.: lazer, negócios" /></Field>
                  <Field label="Origem imediata"><input disabled={isCompleted} value={form.travelOrigin} onChange={e => setForm({ ...form, travelOrigin: e.target.value })} className="precheck-input" placeholder="Cidade / UF ou país" /></Field>
                  <Field label="Próximo destino"><input disabled={isCompleted} value={form.nextDestination} onChange={e => setForm({ ...form, nextDestination: e.target.value })} className="precheck-input" placeholder="Quando houver" /></Field>
                  <Field label="Meio de transporte"><input disabled={isCompleted} value={form.transportMode} onChange={e => setForm({ ...form, transportMode: e.target.value })} className="precheck-input" placeholder="Ex.: automóvel, avião" /></Field>
                  <Field label="Placa do veículo"><input disabled={isCompleted} value={form.vehiclePlate} onChange={e => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })} className="precheck-input uppercase" placeholder="Quando houver" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Menores vinculados"><input disabled={isCompleted} type="number" min="0" max={Math.max(0, reservation.children)} value={form.minorsCount} onChange={e => setForm({ ...form, minorsCount: Number(e.target.value) })} className="precheck-input" /></Field>
                    <Field label="Incapazes vinculados"><input disabled={isCompleted} type="number" min="0" value={form.legallyIncapableCount} onChange={e => setForm({ ...form, legallyIncapableCount: Number(e.target.value) })} className="precheck-input" /></Field>
                  </div>
                  <div className="sm:col-span-2"><Field label="Acompanhamento / autorizações"><textarea disabled={isCompleted} rows={3} value={form.responsibilityNotes} onChange={e => setForm({ ...form, responsibilityNotes: e.target.value })} className="precheck-input" placeholder="Registre apenas informações necessárias para acompanhamento e autorização aplicável." /></Field></div>
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6E3D8] px-4 py-3 text-xs">
                <span className="text-[#6B705C]">Status atual: <strong className="text-[#2C3327]">{form.preCheckinStatus === 'NaoIniciado' ? 'Não iniciado' : form.preCheckinStatus === 'EmAndamento' ? 'Em andamento' : 'Concluído'}</strong></span>
                {form.preCheckinUpdatedAt && <span className="text-[10px] text-[#8E9280]">Atualizado em {new Date(form.preCheckinUpdatedAt).toLocaleString('pt-BR')}</span>}
              </div>
            </div>
          )}

          <footer className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E6E3D8] bg-white px-5 py-4">
            <button type="button" onClick={onClose} className="rounded-xl bg-[#F4F1EA] px-4 py-2.5 text-xs font-bold text-[#3D4035]">Fechar</button>
            {canManage && reservation.status === 'Confirmada' && !isCompleted && <button type="button" onClick={generateLink} disabled={loading || generatingLink} className="inline-flex items-center gap-2 rounded-xl border border-[#CCD5AE] bg-[#F2F5E8] px-4 py-2.5 text-xs font-bold text-[#3A5A40] disabled:opacity-50"><Link2 className="h-4 w-4" />{generatingLink ? 'Gerando...' : 'Gerar link'}</button>}
            {canManage && reservation.status === 'Confirmada' && !isCompleted && <button type="submit" disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar preparação'}</button>}
          </footer>
        </form>
      </div>
      <style>{`.precheck-input{width:100%;padding:.65rem .75rem;border:1px solid #E6E3D8;border-radius:.75rem;outline:none;color:#3D4035;background:white}.precheck-input:focus{box-shadow:0 0 0 2px #CCD5AE}.precheck-input:disabled{background:#F4F1EA;color:#8E9280;cursor:not-allowed}`}</style>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#6B705C]">{label}</span>{children}</label>
);
