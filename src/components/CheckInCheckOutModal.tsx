import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  LogOut,
  LogIn,
  BedDouble,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Wine,
  Utensils,
  Printer,
  ChevronRight
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Room, Reservation, RoomMinibarConsumption, KitchenOrder } from '../types.ts';
import { api } from '../services/api.ts';

export const CheckInCheckOutModal: React.FC = () => {
  const { rooms, reservations, settings, transactions, refreshData } = useHotel();

  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  // Check-in State
  const [selectedResId, setSelectedResId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [keyCardNumber, setKeyCardNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [processingCheckIn, setProcessingCheckIn] = useState(false);

  // Check-out State
  const [selectedOccupiedRoom, setSelectedOccupiedRoom] = useState<Room | null>(null);
  const [roomConsumptions, setRoomConsumptions] = useState<RoomMinibarConsumption[]>([]);
  const [roomOrders, setRoomOrders] = useState<KitchenOrder[]>([]);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<Reservation['paymentMethod']>('Cartao_Credito');
  const [checkoutDiscount, setCheckoutDiscount] = useState<number>(0);
  const [processingCheckOut, setProcessingCheckOut] = useState(false);
  const [completedFolio, setCompletedFolio] = useState<any | null>(null);

  // Filter pending confirmed reservations for check-in
  const checkinReservations = reservations.filter(r => r.status === 'Confirmada' || r.status === 'Pendente');
  // Available clean rooms
  const selectedReservation = reservations.find(r => r.id === selectedResId);
  const availableCleanRooms = rooms.filter(r => r.status === 'Disponivel' && (!selectedReservation || r.typeName === selectedReservation.roomTypeName));
  // Occupied rooms for check-out
  const occupiedRooms = rooms.filter(r => r.status === 'Ocupado');

  // When selecting a reservation for check-in, prefill room and deposit
  const handleSelectReservation = (resId: string) => {
    setSelectedResId(resId);
    const res = reservations.find(r => r.id === resId);
    if (res) {
      setSelectedRoomId(res.roomId || '');
      setDepositAmount(res.paymentStatus === 'Pago' ? 0 : res.totalNightsAmount);
    }
  };

  // Perform Check-in
  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId || !selectedRoomId) {
      alert('Por favor, selecione a reserva e o quarto para check-in.');
      return;
    }

    try {
      setProcessingCheckIn(true);
      await api.processCheckIn({
        reservationId: selectedResId,
        roomId: selectedRoomId,
        depositAmount: Number(depositAmount) || 0,
        paymentMethod: 'Cartao_Credito',
        keyCardNumber,
        notes: checkInNotes
      });

      setSelectedResId('');
      setSelectedRoomId('');
      setKeyCardNumber('');
      setDepositAmount(0);
      setCheckInNotes('');
      await refreshData();
      alert('Check-in realizado com sucesso! Quarto marcado como Ocupado e tarefa criada para a Governança.');
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar check-in');
    } finally {
      setProcessingCheckIn(false);
    }
  };

  // When selecting an occupied room for checkout, load consumption and kitchen bills
  const handleSelectOccupiedRoom = async (room: Room) => {
    setSelectedOccupiedRoom(room);
    setCompletedFolio(null);
    try {
      const [consumptions, allOrders] = await Promise.all([
        api.getRoomConsumptions(room.id),
        api.getOrders()
      ]);
      setRoomConsumptions(consumptions);
      setRoomOrders(allOrders.filter(o => o.roomId === room.id && o.status !== 'Cancelado'));
    } catch (err) {
      console.error('Error fetching room bills:', err);
    }
  };

  // Find active reservation for selected occupied room
  const activeReservation = selectedOccupiedRoom
    ? reservations.find(r => r.id === selectedOccupiedRoom.currentReservationId)
    : null;

  // Compute checkout totals
  const nightsTotal = activeReservation ? activeReservation.totalNightsAmount : 0;
  const minibarTotal = roomConsumptions.filter(c => !activeReservation || c.reservationId === activeReservation.id).reduce((acc, c) => acc + c.totalPrice, 0);
  const kitchenTotal = roomOrders.filter(o => !activeReservation || o.reservationId === activeReservation.id).reduce((acc, o) => acc + o.totalAmount + (o.deliveryFee || 0), 0);
  const priorPaid = activeReservation
    ? transactions.filter(tx => tx.reservationId === activeReservation.id && tx.type === 'Receita' && tx.status === 'Pago').reduce((acc, tx) => acc + tx.amount, 0)
    : 0;
  const totalBill = Math.max(0, nightsTotal + minibarTotal + kitchenTotal - (checkoutDiscount || 0) - priorPaid);

  const handleExecuteCheckOut = async () => {
    if (!activeReservation || !selectedOccupiedRoom) return;

    try {
      setProcessingCheckOut(true);
      const result = await api.processCheckOut({
        reservationId: activeReservation.id,
        paymentMethod: checkoutPaymentMethod,
        amountPaid: totalBill,
        discount: checkoutDiscount,
        notes: `Check-out finalizado. Quarto liberado para limpeza.`
      });

      setCompletedFolio({
        ...result.folio,
        guestName: activeReservation.guestName,
        roomNumber: selectedOccupiedRoom.number,
        reservationCode: activeReservation.code,
        paymentMethod: checkoutPaymentMethod,
        consumptions: roomConsumptions,
        orders: roomOrders
      });

      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar check-out');
    } finally {
      setProcessingCheckOut(false);
    }
  };

  const currency = settings?.currency || 'R$';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] tracking-tight">
            Central de Check-in & Check-out
          </h2>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            Recepção ágil: entrega de chaves, conferência de frigobar/cozinha e faturamento unificado.
          </p>
        </div>

        <div className="flex bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
          <button
            id="tab-sub-checkin"
            onClick={() => setActiveTab('checkin')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition ${
              activeTab === 'checkin'
                ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <LogIn className="w-4 h-4 text-[#588157]" />
            <span>Check-in ({checkinReservations.length})</span>
          </button>
          <button
            id="tab-sub-checkout"
            onClick={() => setActiveTab('checkout')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition ${
              activeTab === 'checkout'
                ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <LogOut className="w-4 h-4 text-[#BC6C25]" />
            <span>Check-out & Extrato ({occupiedRooms.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CHECK-IN VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Reservas para Check-in */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2C3327]">
              Reservas Aguardando Entrada ({checkinReservations.length})
            </h3>

            {checkinReservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E6E3D8] p-8 text-center text-[#8E9280] text-sm">
                Nenhuma reserva pendente para check-in neste momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {checkinReservations.map(res => {
                  const isSelected = selectedResId === res.id;
                  return (
                    <div
                      key={res.id}
                      onClick={() => handleSelectReservation(res.id)}
                      className={`cursor-pointer bg-white rounded-2xl p-4 border transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#588157] ring-2 ring-[#588157]/20 shadow-md'
                          : 'border-[#E6E3D8] hover:border-[#CCD5AE] shadow-xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#2C3327] bg-[#F2F5E8] px-2 py-0.5 rounded border border-[#CCD5AE]">
                            {res.code}
                          </span>
                          <span className="text-[11px] font-semibold text-[#6B705C]">
                            {res.nights} {res.nights === 1 ? 'noite' : 'noites'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-[#2C3327]">{res.guestName}</h4>
                          <p className="text-xs text-[#6B705C] truncate">{res.guestEmail}</p>
                        </div>

                        <div className="text-xs text-[#3D4035] pt-1 border-t border-[#E6E3D8] flex items-center justify-between">
                          <span>{res.roomTypeName} (Qto {res.roomNumber})</span>
                          <span className="font-bold text-[#2C3327]">
                            {currency} {res.totalNightsAmount.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#E6E3D8] flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          res.paymentStatus === 'Pago' ? 'bg-[#F2F5E8] text-[#3A5A40] border border-[#CCD5AE]' : 'bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]/30'
                        }`}>
                          {res.paymentStatus} via {res.paymentMethod}
                        </span>

                        <span className="text-[#588157] font-bold flex items-center text-xs">
                          Selecionar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Formulário de Confirmação de Check-in */}
          <div className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-[#E6E3D8]">
              <h3 className="text-sm font-bold text-[#2C3327] flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-[#588157]" />
                <span>Confirmar Entrada do Hóspede</span>
              </h3>
              <p className="text-xs text-[#6B705C] mt-0.5">
                Vincular chaveiro, acomodação limpa e entrada no sistema.
              </p>
            </div>

            {selectedResId ? (
              <form onSubmit={handleExecuteCheckIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Quarto a Entregar *
                  </label>
                  <select
                    id="select-checkin-room"
                    required
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="">Selecione um Quarto Limpo...</option>
                    {availableCleanRooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Quarto {r.number} - {r.typeName} (Andar {r.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Número do Cartão / Chaveiro Magnético
                  </label>
                  <input
                    id="input-keycard"
                    type="text"
                    placeholder="Ex: CARD-101 ou TAG-982"
                    value={keyCardNumber}
                    onChange={e => setKeyCardNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Depósito / Pagamento no Check-in ({currency})
                  </label>
                  <input
                    id="input-deposit-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositAmount}
                    onChange={e => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Observações de Entrada
                  </label>
                  <textarea
                    id="textarea-checkin-notes"
                    rows={2}
                    placeholder="Ex: Bagagem levada pelo mensageiro, entregue chave do cofre..."
                    value={checkInNotes}
                    onChange={e => setCheckInNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  ></textarea>
                </div>

                <button
                  id="btn-confirm-checkin"
                  type="submit"
                  disabled={processingCheckIn}
                  className="w-full py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition flex items-center justify-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{processingCheckIn ? 'Processando...' : 'Efetuar Check-in Agora'}</span>
                </button>
              </form>
            ) : (
              <div className="py-8 text-center text-[#8E9280] text-xs italic">
                Selecione uma reserva à esquerda para abrir o formulário de check-in.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CHECK-OUT & FOLIO VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Quartos Ocupados */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2C3327]">
              Quartos Ocupados ({occupiedRooms.length})
            </h3>

            {occupiedRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E6E3D8] p-8 text-center text-[#8E9280] text-sm">
                Nenhum quarto ocupado no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {occupiedRooms.map(room => {
                  const isSelected = selectedOccupiedRoom?.id === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => handleSelectOccupiedRoom(room)}
                      className={`cursor-pointer p-4 rounded-xl border transition ${
                        isSelected
                          ? 'border-[#BC6C25] bg-[#FAEDCD]/30 ring-2 ring-[#BC6C25]/20'
                          : 'border-[#E6E3D8] bg-white hover:border-[#CCD5AE]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#BC6C25] animate-pulse"></span>
                          <span className="font-extrabold text-sm text-[#2C3327]">
                            Quarto {room.number}
                          </span>
                          <span className="text-xs text-[#6B705C]">({room.typeName})</span>
                        </div>
                        <span className="text-xs text-[#BC6C25] font-bold">Checkout</span>
                      </div>
                      <p className="text-xs text-[#3D4035] mt-1 font-medium">
                        Hóspede: {room.currentGuestName || 'Não identificado'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2 & 3: Extrato ao Vivo & Fechamento da Conta */}
          <div className="lg:col-span-2 space-y-4">
            {selectedOccupiedRoom && activeReservation ? (
              <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E6E3D8]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#BC6C25]">
                      Folio / Extrato de Conta de Hospedagem
                    </span>
                    <h3 className="text-lg font-extrabold text-[#2C3327]">
                      Quarto {selectedOccupiedRoom.number} &bull; {activeReservation.guestName}
                    </h3>
                    <p className="text-xs text-[#6B705C]">
                      Reserva: {activeReservation.code} | Período: {activeReservation.checkInDate} a {activeReservation.checkOutDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#6B705C] block">Total a Pagar</span>
                    <span className="text-2xl font-black text-[#2C3327]">
                      {currency} {totalBill.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Folio Breakdown */}
                <div className="space-y-3 text-xs">
                  {/* Diárias */}
                  <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8] flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <BedDouble className="w-4 h-4 text-[#6B705C]" />
                      <div>
                        <span className="font-bold text-[#2C3327]">
                          Hospedagem ({activeReservation.nights} {activeReservation.nights === 1 ? 'diária' : 'diárias'})
                        </span>
                        <span className="text-[#6B705C] block text-[11px]">
                          {currency} {activeReservation.pricePerNight} por diária ({activeReservation.roomTypeName})
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#2C3327]">
                      {currency} {nightsTotal.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Frigobar */}
                  <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8] space-y-2">
                    <div className="flex justify-between items-center font-bold text-[#2C3327]">
                      <div className="flex items-center space-x-2">
                        <Wine className="w-4 h-4 text-[#588157]" />
                        <span>Consumo de Frigobar ({roomConsumptions.length} itens lançados)</span>
                      </div>
                      <span>{currency} {minibarTotal.toLocaleString('pt-BR')}</span>
                    </div>

                    {roomConsumptions.length > 0 && (
                      <div className="pl-6 space-y-1 text-[#6B705C] text-[11px] border-l-2 border-[#CCD5AE]">
                        {roomConsumptions.map(c => (
                          <div key={c.id} className="flex justify-between">
                            <span>{c.quantity}x {c.itemName}</span>
                            <span>{currency} {c.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cozinha & Room Service */}
                  <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E6E3D8] space-y-2">
                    <div className="flex justify-between items-center font-bold text-[#2C3327]">
                      <div className="flex items-center space-x-2">
                        <Utensils className="w-4 h-4 text-[#BC6C25]" />
                        <span>Pedidos de Cozinha & Room Service ({roomOrders.length} pedidos)</span>
                      </div>
                      <span>{currency} {kitchenTotal.toLocaleString('pt-BR')}</span>
                    </div>

                    {roomOrders.length > 0 && (
                      <div className="pl-6 space-y-1 text-[#6B705C] text-[11px] border-l-2 border-[#D4A373]/40">
                        {roomOrders.map(o => (
                          <div key={o.id} className="flex justify-between">
                            <span>{o.orderNumber}: {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</span>
                            <span>{currency} {(o.totalAmount + (o.deliveryFee || 0)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {priorPaid > 0 && (
                    <div className="flex items-center justify-between p-2 text-[#588157]">
                      <span>Pagamentos já realizados:</span>
                      <span className="font-bold">- {currency} {priorPaid.toLocaleString('pt-BR')}</span>
                    </div>
                  )}

                  {/* Desconto */}
                  <div className="flex items-center justify-between p-2">
                    <span className="text-[#6B705C]">Desconto ou Cortesia ({currency}):</span>
                    <input
                      type="number"
                      min="0"
                      value={checkoutDiscount}
                      onChange={e => setCheckoutDiscount(Number(e.target.value))}
                      className="w-28 px-2 py-1 text-xs border border-[#E6E3D8] rounded-lg text-right text-[#3D4035]"
                    />
                  </div>
                </div>

                {/* Formas de Pagamento & Conclusão */}
                <div className="pt-4 border-t border-[#E6E3D8] space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2C3327] mb-2">
                      Forma de Quitação do Folio
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setCheckoutPaymentMethod('Cartao_Credito')}
                        className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                          checkoutPaymentMethod === 'Cartao_Credito'
                            ? 'bg-[#FAEDCD] border-[#BC6C25] text-[#2C3327]'
                            : 'bg-white border-[#E6E3D8] text-[#3D4035] hover:bg-[#FDFBF7]'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-[#BC6C25]" />
                        Crédito
                      </button>

                      <button
                        type="button"
                        onClick={() => setCheckoutPaymentMethod('PIX')}
                        className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                          checkoutPaymentMethod === 'PIX'
                            ? 'bg-[#F2F5E8] border-[#588157] text-[#2C3327]'
                            : 'bg-white border-[#E6E3D8] text-[#3D4035] hover:bg-[#FDFBF7]'
                        }`}
                      >
                        <QrCode className="w-4 h-4 mx-auto mb-1 text-[#588157]" />
                        PIX
                      </button>

                      <button
                        type="button"
                        onClick={() => setCheckoutPaymentMethod('Cartao_Debito')}
                        className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                          checkoutPaymentMethod === 'Cartao_Debito'
                            ? 'bg-[#E9EDC9] border-[#A3B18A] text-[#2C3327]'
                            : 'bg-white border-[#E6E3D8] text-[#3D4035] hover:bg-[#FDFBF7]'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-[#3A5A40]" />
                        Débito
                      </button>

                      <button
                        type="button"
                        onClick={() => setCheckoutPaymentMethod('Dinheiro')}
                        className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                          checkoutPaymentMethod === 'Dinheiro'
                            ? 'bg-[#FAEDCD] border-[#D4A373] text-[#2C3327]'
                            : 'bg-white border-[#E6E3D8] text-[#3D4035] hover:bg-[#FDFBF7]'
                        }`}
                      >
                        <Banknote className="w-4 h-4 mx-auto mb-1 text-[#D4A373]" />
                        Dinheiro
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn-confirm-checkout"
                    onClick={handleExecuteCheckOut}
                    disabled={processingCheckOut}
                    className="w-full py-3 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-4 h-4 text-[#E9EDC9]" />
                    <span>
                      {processingCheckOut
                        ? 'Fechando Conta...'
                        : 'Confirmar Quitação, Check-out e Liberar para Governança'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E6E3D8] p-12 text-center text-[#8E9280] text-sm">
                Selecione um quarto ocupado na coluna à esquerda para carregar o extrato completo e finalizar o check-out.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Folio Receipt Modal */}
      {completedFolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E6E3D8] space-y-4">
            <div className="text-center pb-3 border-b border-[#E6E3D8]">
              <div className="w-12 h-12 bg-[#F2F5E8] text-[#588157] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#CCD5AE]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#2C3327]">
                Extrato Fiscal de Check-out Concluído
              </h3>
              <p className="text-xs text-[#6B705C]">
                {settings?.hotelName} &bull; CNPJ 00.000.000/0001-99
              </p>
            </div>

            <div className="space-y-2 text-xs text-[#3D4035] bg-[#FDFBF7] p-4 rounded-xl border border-[#E6E3D8]">
              <div className="flex justify-between">
                <span className="text-[#6B705C]">Hóspede:</span>
                <span className="font-bold text-[#2C3327]">{completedFolio.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B705C]">Quarto Liberado:</span>
                <span className="font-bold text-[#2C3327]">Quarto {completedFolio.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B705C]">Diárias:</span>
                <span>{currency} {completedFolio.nightsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B705C]">Consumo Frigobar:</span>
                <span>{currency} {completedFolio.minibarTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B705C]">Cozinha / Room Service:</span>
                <span>{currency} {completedFolio.kitchenTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E6E3D8] font-extrabold text-sm text-[#2C3327]">
                <span>Total Quitado:</span>
                <span>{currency} {completedFolio.totalCharges.toLocaleString('pt-BR')} ({completedFolio.paymentMethod})</span>
              </div>
            </div>

            <div className="p-3 bg-[#F2F5E8] border border-[#CCD5AE] rounded-xl text-xs text-[#2C3327]">
              🧹 O quarto foi marcado como <strong>"Limpeza"</strong> e uma tarefa urgente foi gerada no Kanban da Governança.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border border-[#E6E3D8] rounded-xl text-xs font-semibold text-[#3D4035] hover:bg-[#FDFBF7] flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => {
                  setCompletedFolio(null);
                  setSelectedOccupiedRoom(null);
                }}
                className="px-5 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
