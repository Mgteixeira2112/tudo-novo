import React, { useMemo, useState } from 'react';
import { BedDouble, CalendarDays, CreditCard, DoorOpen, KeyRound, UserRound } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Reservation } from '../types.ts';
import { processWalkInAtomicCloud } from '../services/walkInPages.ts';

function localDateISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const WalkInCheckIn: React.FC = () => {
  const { rooms, settings, refreshData } = useHotel();
  const currency = settings?.currency || 'R$';
  const availableRooms = rooms.filter(room => room.status === 'Disponivel');

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [document, setDocument] = useState('');
  const [documentType, setDocumentType] = useState<'CPF' | 'RG' | 'Passaporte'>('CPF');
  const [roomId, setRoomId] = useState('');
  const [checkOutDate, setCheckOutDate] = useState(localDateISO(1));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<Reservation['paymentMethod']>('Cartao_Credito');
  const [depositAmount, setDepositAmount] = useState(0);
  const [keyCardNumber, setKeyCardNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ code: string; room: string; guest: string } | null>(null);

  const selectedRoom = rooms.find(room => room.id === roomId);
  const nights = useMemo(() => {
    if (!checkOutDate) return 0;
    const start = new Date(`${localDateISO()}T12:00:00`);
    const end = new Date(`${checkOutDate}T12:00:00`);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  }, [checkOutDate]);
  const estimatedTotal = selectedRoom ? selectedRoom.pricePerNight * nights : 0;

  const reset = () => {
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setDocument('');
    setDocumentType('CPF');
    setRoomId('');
    setCheckOutDate(localDateISO(1));
    setAdults(1);
    setChildren(0);
    setPaymentMethod('Cartao_Credito');
    setDepositAmount(0);
    setKeyCardNumber('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return alert('Selecione um quarto disponível.');
    if (nights < 1) return alert('A data de saída deve ser posterior à data de hoje.');
    if (selectedRoom && adults + children > selectedRoom.capacity) {
      return alert(`O quarto selecionado comporta no máximo ${selectedRoom.capacity} hóspedes.`);
    }

    try {
      setProcessing(true);
      setLastResult(null);
      const result = await processWalkInAtomicCloud({
        guestName,
        guestEmail,
        guestPhone,
        document,
        documentType,
        roomId,
        checkOutDate,
        adults,
        children,
        paymentMethod,
        depositAmount,
        keyCardNumber,
        notes
      });
      setLastResult({
        code: result.reservation?.code || '',
        room: result.room?.number || selectedRoom?.number || '',
        guest: result.reservation?.guest_name || guestName
      });
      reset();
      await refreshData();
    } catch (err: any) {
      alert(err?.message || 'Erro ao realizar check-in direto.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#588157] text-xs font-extrabold uppercase tracking-wider">
            <DoorOpen className="w-4 h-4" />
            <span>Walk-in / Balcão</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] mt-1">Novo Check-in Direto</h2>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            Para hóspedes que chegam sem reserva. O sistema cria a hospedagem e efetua o check-in em uma única operação.
          </p>
        </div>
        <div className="px-3 py-2 rounded-xl bg-[#F2F5E8] border border-[#CCD5AE] text-xs text-[#3A5A40] font-bold">
          {availableRooms.length} quartos disponíveis agora
        </div>
      </div>

      {lastResult && (
        <div className="rounded-2xl border border-[#CCD5AE] bg-[#F2F5E8] p-4 text-sm text-[#3A5A40]">
          <strong>Check-in concluído:</strong> {lastResult.guest} • Quarto {lastResult.room} • Reserva {lastResult.code}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E6E3D8]">
              <UserRound className="w-4 h-4 text-[#588157]" />
              <h3 className="text-sm font-bold text-[#2C3327]">Dados do Hóspede</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Nome completo *</label>
                <input required value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">E-mail *</label>
                <input required type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Telefone / WhatsApp *</label>
                <input required value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">Documento</label>
                  <select value={documentType} onChange={e => setDocumentType(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none">
                    <option value="CPF">CPF</option><option value="RG">RG</option><option value="Passaporte">Passaporte</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">Número</label>
                  <input value={document} onChange={e => setDocument(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E6E3D8]">
              <BedDouble className="w-4 h-4 text-[#BC6C25]" />
              <h3 className="text-sm font-bold text-[#2C3327]">Hospedagem</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Quarto disponível *</label>
                <select required value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]">
                  <option value="">Selecione...</option>
                  {availableRooms.map(room => <option key={room.id} value={room.id}>Quarto {room.number} — {room.typeName} — {currency} {room.pricePerNight.toLocaleString('pt-BR')}/noite — capacidade {room.capacity}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Entrada</label>
                <input readOnly value={localDateISO()} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl bg-[#F4F1EA] text-[#6B705C]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Saída *</label>
                <input required type="date" min={localDateISO(1)} value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Adultos</label>
                <input type="number" min="1" max="10" value={adults} onChange={e => setAdults(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">Crianças</label>
                <input type="number" min="0" max="10" value={children} onChange={e => setChildren(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none" />
              </div>
            </div>
          </section>
        </div>

        <aside className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-4 h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E6E3D8]">
            <CreditCard className="w-4 h-4 text-[#588157]" />
            <h3 className="text-sm font-bold text-[#2C3327]">Fechamento do Check-in</h3>
          </div>

          <div className="rounded-xl bg-[#F4F1EA] border border-[#E6E3D8] p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-[#6B705C]">Diárias</span><strong>{nights}</strong></div>
            <div className="flex justify-between"><span className="text-[#6B705C]">Valor da diária</span><strong>{selectedRoom ? `${currency} ${selectedRoom.pricePerNight.toLocaleString('pt-BR')}` : '—'}</strong></div>
            <div className="flex justify-between pt-2 border-t border-[#E6E3D8] text-sm"><span>Total previsto</span><strong>{currency} {estimatedTotal.toLocaleString('pt-BR')}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B705C] mb-1">Forma de pagamento *</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as Reservation['paymentMethod'])} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none">
              <option value="Cartao_Credito">Cartão de Crédito</option><option value="Cartao_Debito">Cartão de Débito</option><option value="PIX">PIX</option><option value="Dinheiro">Dinheiro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] mb-1">Pagamento / depósito agora ({currency})</label>
            <input type="number" min="0" step="0.01" value={depositAmount} onChange={e => setDepositAmount(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] mb-1">Cartão / chave</label>
            <div className="relative"><KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#8E9280]" /><input value={keyCardNumber} onChange={e => setKeyCardNumber(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none" placeholder="CARD-101" /></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] mb-1">Observações</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none" />
          </div>

          <button type="submit" disabled={processing || availableRooms.length === 0} className="w-full py-3 bg-[#2C3327] hover:bg-[#3A4135] disabled:opacity-50 text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-2">
            <DoorOpen className="w-4 h-4" />
            <span>{processing ? 'Processando...' : 'Criar hospedagem e fazer check-in'}</span>
          </button>
          <p className="text-[11px] text-[#8E9280] leading-relaxed flex gap-1.5"><CalendarDays className="w-3.5 h-3.5 shrink-0 mt-0.5" /> A reserva, o quarto, o pagamento e a tarefa operacional são gravados juntos. Se uma etapa falhar, nenhuma delas é confirmada.</p>
        </aside>
      </form>
    </div>
  );
};
