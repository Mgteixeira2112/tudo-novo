import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Hotel, Loader2 } from 'lucide-react';
import {
  CompletePublicPreCheckInInput,
  completePublicPreCheckInCloud,
  loadPublicPreCheckInCloud,
  PublicPreCheckInData
} from '../services/preCheckin.ts';

const requiredClass = 'w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#CCD5AE]';

function formatDate(value?: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export const PublicPreCheckInPage: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<PublicPreCheckInData | null>(null);
  const [form, setForm] = useState<CompletePublicPreCheckInInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadPublicPreCheckInCloud(token)
      .then(result => {
        if (!active) return;
        setData(result);
        setDone(result.preCheckinStatus === 'Concluido');
        setForm({
          guestName: result.guestName,
          socialName: result.socialName,
          birthDate: result.birthDate,
          nationality: result.nationality,
          sex: result.sex,
          documentType: result.documentType || 'CPF',
          document: result.document,
          email: result.email,
          phone: result.phone,
          country: result.country || 'Brasil',
          state: result.state,
          city: result.city,
          address: result.address,
          addressComplement: result.addressComplement,
          district: result.district,
          postalCode: result.postalCode,
          travelReason: result.travelReason,
          travelOrigin: result.travelOrigin,
          nextDestination: result.nextDestination,
          transportMode: result.transportMode,
          vehiclePlate: result.vehiclePlate,
          minorsCount: result.minorsCount,
          legallyIncapableCount: result.legallyIncapableCount,
          responsibilityNotes: result.responsibilityNotes,
          declarationAccepted: false
        });
      })
      .catch((e: any) => active && setError(e?.message || 'Não foi possível abrir este pré-check-in.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const update = <K extends keyof CompletePublicPreCheckInInput>(key: K, value: CompletePublicPreCheckInInput[K]) => {
    setForm(current => current ? { ...current, [key]: value } : current);
  };

  const canSubmit = useMemo(() => {
    if (!form) return false;
    return Boolean(
      form.guestName.trim() && form.birthDate && form.nationality.trim() && form.sex.trim() &&
      form.documentType.trim() && form.document.trim() && form.email.trim() && form.phone.trim() &&
      form.country.trim() && form.city.trim() && form.address.trim() && form.postalCode.trim() &&
      form.declarationAccepted
    );
  }, [form]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !canSubmit) return;
    try {
      setSaving(true);
      setError(null);
      await completePublicPreCheckInCloud(token, form);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível concluir o pré-check-in.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-[#FDFBF7]"><div className="text-center text-[#6B705C]"><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-[#588157]" /><p className="text-sm font-semibold">Carregando pré-check-in...</p></div></div>;
  }

  if (error && !data) {
    return <div className="min-h-screen grid place-items-center bg-[#FDFBF7] p-4"><div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-red-500" /><h1 className="mt-3 text-lg font-black text-[#2C3327]">Link indisponível</h1><p className="mt-2 text-sm text-[#6B705C]">{error}</p></div></div>;
  }

  if (done && data) {
    return <div className="min-h-screen grid place-items-center bg-[#FDFBF7] p-4"><div className="w-full max-w-lg rounded-3xl border border-[#E6E3D8] bg-white p-7 text-center shadow-xl"><CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" /><h1 className="mt-4 text-2xl font-black text-[#2C3327]">Pré-check-in concluído</h1><p className="mt-2 text-sm text-[#6B705C]">Reserva <strong>{data.reservationCode}</strong>. Seus dados foram enviados para conferência da recepção.</p><p className="mt-3 text-xs text-[#8E9280]">O check-in será confirmado presencialmente pelo hotel após a conferência dos documentos.</p></div></div>;
  }

  if (!data || !form) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] px-4 py-6 text-[#3D4035] sm:py-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-3xl border border-[#E6E3D8] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#588157]"><Hotel className="h-4 w-4" /> Pré-check-in</div>
          <h1 className="mt-2 text-2xl font-black text-[#2C3327]">Complete seus dados antes da chegada</h1>
          <p className="mt-2 text-sm text-[#6B705C]">Reserva <strong>{data.reservationCode}</strong> · {formatDate(data.checkInDate)} → {formatDate(data.checkOutDate)}{data.roomNumber ? ` · Quarto ${data.roomNumber}` : ''}</p>
        </header>

        {error && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

        <form onSubmit={submit} className="space-y-5">
          <Section title="Identificação">
            <Field label="Nome completo *"><input className={requiredClass} required value={form.guestName} onChange={e => update('guestName', e.target.value)} /></Field>
            <Field label="Nome social"><input className={requiredClass} value={form.socialName} onChange={e => update('socialName', e.target.value)} /></Field>
            <Field label="Data de nascimento *"><input type="date" className={requiredClass} required value={form.birthDate} onChange={e => update('birthDate', e.target.value)} /></Field>
            <Field label="Nacionalidade *"><input className={requiredClass} required value={form.nationality} onChange={e => update('nationality', e.target.value)} /></Field>
            <Field label="Sexo *"><select className={requiredClass} required value={form.sex} onChange={e => update('sex', e.target.value)}><option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option><option value="NaoInformado">Prefiro não informar</option></select></Field>
            <Field label="Tipo de documento *"><select className={requiredClass} required value={form.documentType} onChange={e => update('documentType', e.target.value)}><option>CPF</option><option>RG</option><option>Passaporte</option><option>Outro</option></select></Field>
            <Field label="Documento *"><input className={requiredClass} required value={form.document} onChange={e => update('document', e.target.value)} /></Field>
          </Section>

          <Section title="Contato e endereço">
            <Field label="E-mail *"><input type="email" className={requiredClass} required value={form.email} onChange={e => update('email', e.target.value)} /></Field>
            <Field label="Telefone / WhatsApp *"><input className={requiredClass} required value={form.phone} onChange={e => update('phone', e.target.value)} /></Field>
            <Field label="País *"><input className={requiredClass} required value={form.country} onChange={e => update('country', e.target.value)} /></Field>
            <Field label="Estado / Província"><input className={requiredClass} value={form.state} onChange={e => update('state', e.target.value)} /></Field>
            <Field label="Cidade *"><input className={requiredClass} required value={form.city} onChange={e => update('city', e.target.value)} /></Field>
            <Field label="CEP / Código postal *"><input className={requiredClass} required value={form.postalCode} onChange={e => update('postalCode', e.target.value)} /></Field>
            <Field label="Endereço *"><input className={requiredClass} required value={form.address} onChange={e => update('address', e.target.value)} /></Field>
            <Field label="Bairro / Distrito"><input className={requiredClass} value={form.district} onChange={e => update('district', e.target.value)} /></Field>
            <Field label="Complemento"><input className={requiredClass} value={form.addressComplement} onChange={e => update('addressComplement', e.target.value)} /></Field>
          </Section>

          <Section title="Dados desta viagem">
            <Field label="Motivo da viagem"><input className={requiredClass} value={form.travelReason} onChange={e => update('travelReason', e.target.value)} /></Field>
            <Field label="Origem imediata"><input className={requiredClass} value={form.travelOrigin} onChange={e => update('travelOrigin', e.target.value)} /></Field>
            <Field label="Próximo destino"><input className={requiredClass} value={form.nextDestination} onChange={e => update('nextDestination', e.target.value)} /></Field>
            <Field label="Meio de transporte"><input className={requiredClass} value={form.transportMode} onChange={e => update('transportMode', e.target.value)} /></Field>
            <Field label="Placa do veículo"><input className={requiredClass} value={form.vehiclePlate} onChange={e => update('vehiclePlate', e.target.value)} /></Field>
            <Field label="Menores vinculados"><input type="number" min={0} className={requiredClass} value={form.minorsCount} onChange={e => update('minorsCount', Math.max(0, Number(e.target.value) || 0))} /></Field>
            <Field label="Incapazes vinculados"><input type="number" min={0} className={requiredClass} value={form.legallyIncapableCount} onChange={e => update('legallyIncapableCount', Math.max(0, Number(e.target.value) || 0))} /></Field>
            <div className="sm:col-span-2"><Field label="Observações de acompanhamento/autorização"><textarea rows={3} className={requiredClass} value={form.responsibilityNotes} onChange={e => update('responsibilityNotes', e.target.value)} /></Field></div>
          </Section>

          <div className="rounded-2xl border border-[#CCD5AE] bg-[#F7F9F1] p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#4F5647]"><input type="checkbox" className="mt-1 h-4 w-4" checked={form.declarationAccepted} onChange={e => update('declarationAccepted', e.target.checked)} /><span>Confirmo que os dados informados são verdadeiros e estou ciente de que serão tratados para fins de hospedagem, obrigações legais e preparação da FNRH. O envio deste formulário não substitui a conferência presencial dos documentos nem conclui o check-in.</span></label>
          </div>

          <div className="flex justify-end pb-8"><button type="submit" disabled={!canSubmit || saving} className="inline-flex min-w-48 items-center justify-center rounded-xl bg-[#2C3327] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Concluir pré-check-in'}</button></div>
        </form>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section className="rounded-3xl border border-[#E6E3D8] bg-white p-5 shadow-sm"><h2 className="mb-4 text-base font-black text-[#2C3327]">{title}</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div></section>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#6B705C]">{label}</span>{children}</label>;
