import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, CreditCard, FileCheck2, KeyRound, LogIn, QrCode, UserCheck } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { PaymentMethod, Reservation } from '../types.ts';
import { processCheckInAtomicCloud } from '../services/checkInOutPages.ts';
import {
  loadReservationPreCheckInCloud,
  loadReservationPreCheckInStatusesCloud,
  PreCheckInStatus,
  ReservationPreCheckInData
} from '../services/preCheckin.ts';

type ImmediatePaymentMethod = Exclude<PaymentMethod, 'Faturado'>;

const paymentOptions: Array<{ value: ImmediatePaymentMethod; label: string; icon: React.ReactNode }> = [
  { value: 'PIX', label: 'PIX', icon: <QrCode className="h-4 w-4" /> },
  { value: 'Cartao_Credito', label: 'Crédito', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'Cartao_Debito', label: 'Débito', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'Dinheiro', label: 'Dinheiro', icon: <Banknote className="h-4 w-4" /> }
];

function hotelDateIso() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function immediatePaymentMethod(value: Reservation['paymentMethod']): ImmediatePaymentMethod | '' {
  return value === 'PIX' || value === 'Cartao_Credito' || value === 'Cartao_Debito' || value === 'Dinheiro'
    ? value
    : '';
}

function paymentMethodLabel(value: ImmediatePaymentMethod | '') {
  return paymentOptions.find(option => option.value === value)?.label || '';
}

function preCheckInLabel(status?: PreCheckInStatus) {
  if (status === 'Concluido') return 'Pré-check-in concluído';
  if (status === 'EmAndamento') return 'Pré-check-in em andamento';
  return 'Pré-check-in não iniciado';
}

function preCheckInBadgeClass(status?: PreCheckInStatus) {
  if (status === 'Concluido') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'EmAndamento') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#E6E3D8] bg-[#F8F7F2] text-[#777A6A]';
}

export const ReceptionCheckInFlow: React.FC = () => {
  const { rooms, reservations, guests, settings, refreshData } = useHotel();
  const [selectedResId, setSelectedResId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [keyCardNumber, setKeyCardNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<ImmediatePaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [preCheckInStatuses, setPreCheckInStatuses] = useState<Record<string, PreCheckInStatus>>({});
  const [selectedPreCheckIn, setSelectedPreCheckIn] = useState<ReservationPreCheckInData | null>(null);
  const [loadingPreCheckIn, setLoadingPreCheckIn] = useState(false);
  const today = hotelDateIso();
  const currency = settings?.currency || 'R$';

  const checkinReservations = useMemo(
    () => reservations.filter(reservation =>
      (reservation.status === 'Confirmada' || reservation.status === 'Pendente') &&
      reservation.checkInDate <= today &&
      today < reservation.checkOutDate
    ),
    [reservations, today]
  );

  const selectedReservation = checkinReservations.find(reservation => reservation.id === selectedResId);
  const selectedGuest = selectedReservation?.guestId
    ? guests.find(guest => guest.id === selectedReservation.guestId)
    : undefined;
  const availableCleanRooms = rooms.filter(room =>
    room.status === 'Disponivel' &&
    (!selectedReservation || room.typeName === selectedReservation.roomTypeName)
  );

  useEffect(() => {
    let active = true;
    loadReservationPreCheckInStatusesCloud()
      .then(statuses => { if (active) setPreCheckInStatuses(statuses); })
      .catch(error => console.warn('[ReceptionCheckInFlow] Falha ao carregar status de pré-check-in.', error));
    return () => { active = false; };
  }, [reservations]);

  useEffect(() => {
    if (selectedResId && !selectedReservation) {
      setSelectedResId('');
      setSelectedRoomId('');
      setDepositAmount(0);
      setPaymentMethod('');
      setSelectedPreCheckIn(null);
    }
  }, [selectedResId, selectedReservation]);

  const selectReservation = async (reservation: Reservation) => {
    setSelectedResId(reservation.id);
    const assignedRoom = rooms.find(room =>
      room.id === reservation.roomId &&
      room.status === 'Disponivel' &&
      room.typeName === reservation.roomTypeName
    );
    setSelectedRoomId(assignedRoom?.id || '');
    setDepositAmount(reservation.paymentStatus === 'Pago' ? 0 : Number(reservation.totalNightsAmount || 0));
    setPaymentMethod(immediatePaymentMethod(reservation.paymentMethod));
    setSelectedPreCheckIn(null);
    setLoadingPreCheckIn(true);
    try {
      const data = await loadReservationPreCheckInCloud(reservation.id);
      setSelectedPreCheckIn(data);
      setPreCheckInStatuses(current => ({ ...current, [reservation.id]: data.preCheckinStatus }));
    } catch (error) {
      console.warn('[ReceptionCheckInFlow] Falha ao carregar conferência do pré-check-in.', error);
    } finally {
      setLoadingPreCheckIn(false);
    }
  };

  const executeCheckIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReservation || !selectedRoomId) {
      alert('Selecione uma reserva válida e um quarto disponível para o check-in.');
      return;
    }
    if (depositAmount > 0 && !paymentMethod) {
      alert('Selecione a forma de pagamento realmente utilizada no check-in.');
      return;
    }

    try {
      setProcessing(true);
      await processCheckInAtomicCloud({
        reservationId: selectedReservation.id,
        roomId: selectedRoomId,
        depositAmount: Number(depositAmount) || 0,
        paymentMethod: paymentMethod || undefined,
        keyCardNumber,
        notes
      });

      setSelectedResId('');
      setSelectedRoomId('');
      setKeyCardNumber('');
      setDepositAmount(0);
      setPaymentMethod('');
      setNotes('');
      setSelectedPreCheckIn(null);
      await refreshData();
      alert('Check-in realizado com sucesso. Quarto ocupado, financeiro registrado com a forma escolhida e Governança acionada.');
    } catch (error: any) {
      alert(error?.message || 'Erro ao realizar check-in.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#2C3327] sm:text-2xl">
          <LogIn className="h-5 w-5 text-[#588157]" /> Check-in
        </h2>
        <p className="mt-1 text-xs text-[#6B705C]">
          Exibe somente reservas cujo período permite entrada hoje, considerando o horário do hotel (America/Sao_Paulo).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2C3327]">
              Reservas disponíveis para entrada ({checkinReservations.length})
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#DADFD1] bg-[#F8FAF2] px-2.5 py-1 text-[10px] font-bold text-[#5F6655]">
              <CalendarDays className="h-3.5 w-3.5" /> {today.split('-').reverse().join('/')}
            </span>
          </div>

          {checkinReservations.length === 0 ? (
            <div className="rounded-2xl border border-[#E6E3D8] bg-white p-10 text-center text-sm text-[#8E9280]">
              Nenhuma reserva está elegível para check-in hoje.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {checkinReservations.map(reservation => {
                const selected = reservation.id === selectedResId;
                const preCheckInStatus = preCheckInStatuses[reservation.id];
                return (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => void selectReservation(reservation)}
                    className={`rounded-2xl border bg-white p-4 text-left transition ${selected ? 'border-[#588157] ring-2 ring-[#588157]/20 shadow-md' : 'border-[#E6E3D8] hover:border-[#CCD5AE]'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded border border-[#CCD5AE] bg-[#F2F5E8] px-2 py-0.5 text-xs font-extrabold text-[#2C3327]">{reservation.code}</span>
                      <span className="text-[10px] font-bold text-[#6B705C]">{reservation.status}</span>
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-[#2C3327]">{reservation.guestName}</h4>
                    <p className="mt-1 text-xs text-[#6B705C]">Entrada: {reservation.checkInDate.split('-').reverse().join('/')} • Saída: {reservation.checkOutDate.split('-').reverse().join('/')}</p>
                    <p className="mt-1 text-xs text-[#6B705C]">{reservation.roomTypeName} • Quarto {reservation.roomNumber || 'a definir'}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${preCheckInBadgeClass(preCheckInStatus)}`}>
                        <FileCheck2 className="h-3 w-3" /> {preCheckInLabel(preCheckInStatus)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#E6E3D8] pt-2 text-xs">
                      <span className="font-semibold text-[#6B705C]">{reservation.paymentStatus} via {reservation.paymentMethod || 'não definida'}</span>
                      <strong className="text-[#2C3327]">{currency} {Number(reservation.totalNightsAmount || 0).toLocaleString('pt-BR')}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
          <div className="border-b border-[#E6E3D8] pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#2C3327]"><KeyRound className="h-4 w-4 text-[#588157]" /> Confirmar entrada</h3>
            <p className="mt-1 text-xs text-[#6B705C]">Confira presença/documento e finalize a entrada. O método financeiro será gravado exatamente como selecionado.</p>
          </div>

          {selectedReservation ? (
            <form onSubmit={executeCheckIn} className="space-y-4">
              <div className={`rounded-xl border p-3 ${preCheckInBadgeClass(selectedPreCheckIn?.preCheckinStatus || preCheckInStatuses[selectedReservation.id])}`}>
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <UserCheck className="h-4 w-4" />
                  {loadingPreCheckIn ? 'Carregando conferência...' : preCheckInLabel(selectedPreCheckIn?.preCheckinStatus || preCheckInStatuses[selectedReservation.id])}
                </div>
                {!loadingPreCheckIn && selectedPreCheckIn?.preCheckinStatus === 'Concluido' && (
                  <div className="mt-3 space-y-2 text-[11px] leading-5 text-[#4F5647]">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <span><strong>Hóspede:</strong> {selectedGuest?.fullName || selectedReservation.guestName}</span>
                      <span><strong>Documento:</strong> {selectedGuest?.document || 'conferir presencialmente'}</span>
                      <span><strong>Telefone:</strong> {selectedGuest?.phone || selectedReservation.guestPhone || '—'}</span>
                      <span><strong>E-mail:</strong> {selectedGuest?.email || selectedReservation.guestEmail || '—'}</span>
                    </div>
                    <div className="border-t border-current/10 pt-2">
                      <strong>Viagem:</strong> {selectedPreCheckIn.travelReason || '—'}
                      {selectedPreCheckIn.travelOrigin ? ` • Origem: ${selectedPreCheckIn.travelOrigin}` : ''}
                      {selectedPreCheckIn.nextDestination ? ` • Destino: ${selectedPreCheckIn.nextDestination}` : ''}
                      {selectedPreCheckIn.transportMode ? ` • Transporte: ${selectedPreCheckIn.transportMode}` : ''}
                      {selectedPreCheckIn.vehiclePlate ? ` • Placa: ${selectedPreCheckIn.vehiclePlate}` : ''}
                    </div>
                    <p className="border-t border-current/10 pt-2 font-semibold">Pré-check-in recebido. Confirme presencialmente identidade/documento antes de efetuar o check-in.</p>
                  </div>
                )}
                {!loadingPreCheckIn && selectedPreCheckIn?.preCheckinStatus !== 'Concluido' && (
                  <p className="mt-2 text-[11px] leading-4">O pré-check-in não é obrigatório para concluir a entrada. Colete e confira presencialmente os dados/documentos necessários antes do check-in.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6B705C]">Quarto a entregar *</label>
                <select value={selectedRoomId} onChange={event => setSelectedRoomId(event.target.value)} required className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm text-[#3D4035] outline-none focus:ring-2 focus:ring-[#588157]">
                  <option value="">Selecione um quarto disponível...</option>
                  {availableCleanRooms.map(room => <option key={room.id} value={room.id}>Quarto {room.number} - {room.typeName} (Andar {room.floor})</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6B705C]">Número do cartão / chaveiro magnético</label>
                <input value={keyCardNumber} onChange={event => setKeyCardNumber(event.target.value)} placeholder="Ex: CARD-101 ou TAG-982" className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm text-[#3D4035] outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6B705C]">Depósito / pagamento no Check-in ({currency})</label>
                <input type="number" min="0" step="0.01" value={depositAmount} onChange={event => setDepositAmount(Number(event.target.value))} className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm text-[#3D4035] outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#6B705C]">Forma de pagamento {depositAmount > 0 ? '*' : ''}</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentMethod(option.value)}
                      disabled={depositAmount <= 0}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${paymentMethod === option.value ? 'border-[#588157] bg-[#F2F5E8] text-[#2C3327]' : 'border-[#E6E3D8] bg-white text-[#5F6655] hover:bg-[#F8F7F2]'}`}
                    >
                      {option.icon} {option.label}
                    </button>
                  ))}
                </div>
                {depositAmount <= 0 && <p className="mt-2 text-[10px] text-[#8E9280]">Sem valor recebido no check-in, nenhum lançamento financeiro será criado.</p>}
                {depositAmount > 0 && paymentMethod && (
                  <p className="mt-2 rounded-lg border border-[#CCD5AE] bg-[#F2F5E8] px-3 py-2 text-[10px] font-bold text-[#3A5A40]">
                    Será registrado: {currency} {Number(depositAmount).toLocaleString('pt-BR')} via {paymentMethodLabel(paymentMethod)}.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6B705C]">Observações de entrada</label>
                <textarea rows={2} value={notes} onChange={event => setNotes(event.target.value)} className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm text-[#3D4035] outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>

              <button type="submit" disabled={processing || (depositAmount > 0 && !paymentMethod)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C3327] py-2.5 text-xs font-bold text-[#FDFBF7] transition hover:bg-[#3A4135] disabled:cursor-not-allowed disabled:opacity-50">
                <LogIn className="h-4 w-4" /> {processing ? 'Processando...' : 'Efetuar Check-in Agora'}
              </button>
            </form>
          ) : (
            <div className="py-10 text-center text-xs italic text-[#8E9280]">Selecione uma reserva elegível para abrir o formulário.</div>
          )}
        </div>
      </div>
    </div>
  );
};
