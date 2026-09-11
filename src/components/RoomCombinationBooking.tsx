import React, { useMemo, useState } from 'react';
import { ArrowRight, BedDouble, CheckCircle2, CreditCard, QrCode, Users, X } from 'lucide-react';
import { Reservation, RoomTypeConfig } from '../types.ts';
import { generateRoomCombinations, RoomCombination } from '../services/roomCombinations.ts';
import { createReservationGroupAtomicInSupabase, GroupedReservation } from '../services/reservationGroups.ts';

interface RoomCombinationBookingProps {
  roomTypes: RoomTypeConfig[];
  availability: Record<string, number> | null;
  adults: number;
  children: number;
  nights: number;
  currency: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  visibleIndividualCount: number;
  refreshData: () => Promise<void>;
}

const guestLabel = (adults: number, children: number) => {
  const parts = [`${adults} adulto${adults === 1 ? '' : 's'}`];
  if (children > 0) parts.push(`${children} criança${children === 1 ? '' : 's'}`);
  return parts.join(' + ');
};

export const RoomCombinationBooking: React.FC<RoomCombinationBookingProps> = ({
  roomTypes,
  availability,
  adults,
  children,
  nights,
  currency,
  checkInDate,
  checkOutDate,
  checkInTime,
  checkOutTime,
  visibleIndividualCount,
  refreshData
}) => {
  const combinations = useMemo(
    () => availability && visibleIndividualCount === 0
      ? generateRoomCombinations(roomTypes, availability, adults, children, 3, 6)
      : [],
    [roomTypes, availability, adults, children, visibleIndividualCount]
  );

  const [selected, setSelected] = useState<RoomCombination | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Reservation['paymentMethod']>('PIX');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<GroupedReservation[] | null>(null);

  if (!availability || visibleIndividualCount > 0) return null;

  const openCombination = (combination: RoomCombination) => {
    setSelected(combination);
    setConfirmed(null);
    setErrorMessage(null);
  };

  const closeModal = () => {
    if (submitting) return;
    setSelected(null);
    setConfirmed(null);
    setErrorMessage(null);
  };

  const submitGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setErrorMessage('Preencha nome, e-mail e telefone do hóspede principal.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const reservations = await createReservationGroupAtomicInSupabase({
        guestName,
        guestEmail,
        guestPhone,
        checkInDate,
        checkOutDate,
        adults,
        children,
        paymentMethod,
        notes,
        allocations: selected.allocations.map(item => ({
          roomTypeId: item.roomType.id,
          adults: item.adults,
          children: item.children
        }))
      });
      if (!reservations.length) throw new Error('A reserva agrupada não retornou acomodações.');
      setConfirmed(reservations);
      await refreshData();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível concluir a reserva combinada.');
    } finally {
      setSubmitting(false);
    }
  };

  const groupCode = confirmed?.[0]?.groupCode || confirmed?.[0]?.code;
  const groupTotal = confirmed?.reduce((sum, reservation) => sum + reservation.totalNightsAmount, 0) || 0;

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-4">
        <div className="rounded-2xl border border-[#CCD5AE] bg-[#F2F5E8] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2 text-[#588157] shadow-sm"><BedDouble className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-black text-[#2C3327]">Combinações para o seu grupo</h3>
              <p className="mt-1 text-sm text-[#6B705C]">Nenhum quarto individual atende todos os hóspedes. O Govermix encontrou soluções com até 3 quartos disponíveis nas mesmas datas.</p>
            </div>
          </div>
        </div>

        {combinations.length === 0 ? (
          <div className="rounded-2xl border border-[#E6E3D8] bg-white p-6 text-center">
            <p className="font-bold text-[#2C3327]">Não encontramos uma combinação válida de até 3 quartos.</p>
            <p className="mt-1 text-sm text-[#6B705C]">Tente outras datas ou entre em contato com o hotel para uma composição manual.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {combinations.map((combination, index) => (
              <article key={combination.id} className="overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-[#E6E3D8] bg-[#FDFBF7] px-5 py-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#588157]">Opção {index + 1}</span>
                    <h4 className="font-black text-[#2C3327]">{combination.roomCount} quartos para {adults + children} hóspedes</h4>
                  </div>
                  <div className="rounded-xl bg-[#2C3327] px-3 py-2 text-right text-white">
                    <span className="block text-[9px] uppercase opacity-70">Total / {nights} {nights === 1 ? 'noite' : 'noites'}</span>
                    <span className="text-sm font-black">{currency} {(combination.nightlyTotal * nights).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {combination.allocations.map((allocation, allocationIndex) => (
                    <div key={`${combination.id}-${allocationIndex}`} className="rounded-xl border border-[#E6E3D8] bg-[#FDFBF7] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-[#2C3327]">Quarto {allocationIndex + 1} — {allocation.roomType.name}</p>
                          <p className="mt-1 text-[11px] font-semibold text-[#588157]">{guestLabel(allocation.adults, allocation.children)}</p>
                        </div>
                        <span className="text-xs font-black text-[#2C3327]">{currency} {Number(allocation.roomType.basePrice || 0).toLocaleString('pt-BR')}/noite</span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[#6B705C]">{allocation.bedSummary}</p>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#588157]"><CheckCircle2 className="h-4 w-4" />Distribuição compatível com as capacidades cadastradas.</div>
                </div>

                <div className="border-t border-[#E6E3D8] bg-[#FDFBF7] p-4">
                  <button type="button" onClick={() => openCombination(combination)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-4 py-3 text-xs font-black text-white transition hover:bg-[#3A4135]">
                    Reservar esta combinação <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-6 w-full max-w-2xl rounded-3xl border border-[#E6E3D8] bg-white p-6 shadow-2xl sm:p-8">
            {!confirmed ? (
              <form onSubmit={submitGroup} className="space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#588157]">Reserva combinada</span>
                    <h3 className="text-xl font-black text-[#2C3327]">{selected.roomCount} quartos em uma única compra</h3>
                  </div>
                  <button type="button" onClick={closeModal} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar"><X className="h-5 w-5" /></button>
                </div>

                {errorMessage && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{errorMessage}</div>}

                <div className="grid grid-cols-1 gap-3 rounded-2xl bg-[#F4F1EA] p-4 text-xs sm:grid-cols-2">
                  <div><span className="text-[#6B705C]">Período</span><strong className="block text-[#2C3327]">{checkInDate.split('-').reverse().join('/')} a {checkOutDate.split('-').reverse().join('/')}</strong></div>
                  <div><span className="text-[#6B705C]">Horários</span><strong className="block text-[#2C3327]">Entrada {checkInTime || '14:00'} · Saída {checkOutTime || '11:00'}</strong></div>
                  <div><span className="text-[#6B705C]">Grupo</span><strong className="block text-[#2C3327]">{guestLabel(adults, children)}</strong></div>
                  <div><span className="text-[#6B705C]">Total</span><strong className="block text-sm text-[#2C3327]">{currency} {(selected.nightlyTotal * nights).toLocaleString('pt-BR')}</strong></div>
                </div>

                <div className="space-y-2">
                  {selected.allocations.map((allocation, index) => (
                    <div key={`${selected.id}-modal-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-[#E6E3D8] p-3 text-xs">
                      <div><strong className="text-[#2C3327]">Quarto {index + 1} — {allocation.roomType.name}</strong><span className="mt-1 block text-[#6B705C]">{guestLabel(allocation.adults, allocation.children)} · {allocation.bedSummary}</span></div>
                      <span className="shrink-0 font-black text-[#2C3327]">{currency} {Number(allocation.roomType.basePrice).toLocaleString('pt-BR')}/noite</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#6B705C]"><Users className="h-4 w-4" />Hóspede principal</div>
                  <input required value={guestName} onChange={event => setGuestName(event.target.value)} placeholder="Nome completo" className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#588157]" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input required type="email" value={guestEmail} onChange={event => setGuestEmail(event.target.value)} placeholder="E-mail" className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#588157]" />
                    <input required value={guestPhone} onChange={event => setGuestPhone(event.target.value)} placeholder="Telefone / WhatsApp" className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#588157]" />
                  </div>
                  <textarea rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Preferências ou solicitações especiais" className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#588157]" />
                </div>

                <div className="space-y-2 border-t border-[#E6E3D8] pt-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#6B705C]">Forma de pagamento</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPaymentMethod('PIX')} className={`rounded-xl border p-3 text-left text-xs ${paymentMethod === 'PIX' ? 'border-[#588157] bg-[#F2F5E8]' : 'border-[#E6E3D8]'}`}><QrCode className="mb-1 h-4 w-4 text-[#588157]" /><strong>PIX</strong></button>
                    <button type="button" onClick={() => setPaymentMethod('Cartao_Credito')} className={`rounded-xl border p-3 text-left text-xs ${paymentMethod === 'Cartao_Credito' ? 'border-[#588157] bg-[#F2F5E8]' : 'border-[#E6E3D8]'}`}><CreditCard className="mb-1 h-4 w-4 text-[#588157]" /><strong>Cartão de crédito</strong></button>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#E6E3D8] pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeModal} disabled={submitting} className="rounded-xl border border-[#E6E3D8] px-5 py-2.5 text-xs font-bold text-[#6B705C]">Cancelar</button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{submitting ? 'Reservando quartos...' : 'Confirmar reserva combinada'}</button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#CCD5AE] bg-[#F2F5E8] text-[#588157]"><CheckCircle2 className="h-8 w-8" /></div>
                <div><span className="text-xs font-black uppercase tracking-widest text-[#588157]">Reserva agrupada confirmada</span><h3 className="mt-1 text-2xl font-black text-[#2C3327]">Código do grupo: {groupCode}</h3><p className="mt-1 text-xs text-[#6B705C]">Os {confirmed.length} quartos foram reservados na mesma operação.</p></div>
                <div className="space-y-2 rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] p-4 text-left">
                  {confirmed.map((reservation, index) => <div key={reservation.id} className="flex items-center justify-between gap-3 border-b border-[#E6E3D8] py-2 text-xs last:border-0"><span><strong className="text-[#2C3327]">Quarto {reservation.roomNumber}</strong><span className="block text-[#6B705C]">{reservation.roomTypeName} · {guestLabel(reservation.adults, reservation.children)}</span></span><strong className="text-[#2C3327]">{reservation.code}</strong></div>)}
                </div>
                <div className="rounded-xl bg-[#F4F1EA] px-4 py-3 text-sm"><span className="text-[#6B705C]">Total consolidado: </span><strong className="text-[#2C3327]">{currency} {groupTotal.toLocaleString('pt-BR')}</strong></div>
                <button type="button" onClick={closeModal} className="w-full rounded-xl bg-[#2C3327] px-5 py-3 text-xs font-black text-white">Concluir</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
