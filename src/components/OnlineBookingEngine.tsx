import React, { useState } from 'react';
import {
  Calendar,
  Users,
  CheckCircle,
  Wifi,
  Coffee,
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowRight,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Check,
  Search
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { RoomTypeConfig, Reservation } from '../types.ts';
import { api } from '../services/api.ts';

export const OnlineBookingEngine: React.FC = () => {
  const { settings, refreshData } = useHotel();

  // Booking search criteria
  const today = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 2);
  const defaultCheckout = tomorrowDate.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckout);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Selected room type for checkout modal
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeConfig | null>(null);

  // Guest details form
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [document, setDocument] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Reservation['paymentMethod']>('PIX');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate nights
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffTime = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const nights = isNaN(diffTime) || diffTime <= 0 ? 1 : diffTime;

  const handleOpenBooking = (roomType: RoomTypeConfig) => {
    setSelectedRoomType(roomType);
    setConfirmedReservation(null);
    setErrorMessage(null);
  };

  const handleSearchAvailability = () => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setErrorMessage('Selecione uma data de saída posterior à data de entrada.');
      return;
    }
    setErrorMessage(null);
    document.getElementById('available-room-types')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomType) return;

    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const reservation = await api.createReservation({
        guestName,
        guestEmail,
        guestPhone,
        document,
        roomTypeId: selectedRoomType.id,
        checkInDate,
        checkOutDate,
        adults,
        children,
        paymentMethod,
        notes
      });

      setConfirmedReservation(reservation);
      await refreshData();
    } catch (err: any) {
      console.error('Reservation error:', err);
      setErrorMessage(err.message || 'Erro ao processar reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  const currency = settings?.currency || 'R$';

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12">
      {/* Hero Header Section */}
      <section className="relative bg-[#2C3327] text-[#FDFBF7] pt-8 sm:pt-10 pb-14 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#CCD5AE_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#A3B18A]/20 border border-[#A3B18A]/40 text-[#E9EDC9] text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
            <span>Reserva Direta Garantida &bull; Melhor Tarifa Online</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-[#FDFBF7]">
            {settings?.hotelName || 'Grand Horizon Resort'}
          </h2>

          <p className="text-base sm:text-lg text-[#E9EDC9]/85 max-w-2xl mx-auto font-light leading-relaxed">
            {settings?.tagline || 'Viva momentos inesquecíveis com hospitalidade de excelência e conforto supremo.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#CCD5AE]/80 pt-2">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>{settings?.address || 'Florianópolis, SC'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>{settings?.phone || '+55 (48) 3344-9800'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>{settings?.email || 'reservas@hotel.com'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Search / Filter Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 sm:-mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E6E3D8] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
          {/* Check-in */}
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] uppercase tracking-wider mb-1">
              Data de Entrada
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#8E9280] absolute left-3 top-3 pointer-events-none" />
              <input
                id="input-checkin-date"
                type="date"
                value={checkInDate}
                min={today}
                onChange={e => setCheckInDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] focus:border-[#588157] outline-none text-[#3D4035]"
              />
            </div>
          </div>

          {/* Check-out */}
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] uppercase tracking-wider mb-1">
              Data de Saída
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#8E9280] absolute left-3 top-3 pointer-events-none" />
              <input
                id="input-checkout-date"
                type="date"
                value={checkOutDate}
                min={checkInDate}
                onChange={e => setCheckOutDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] focus:border-[#588157] outline-none text-[#3D4035]"
              />
            </div>
          </div>

          {/* Guests Count */}
          <div>
            <label className="block text-xs font-semibold text-[#6B705C] uppercase tracking-wider mb-1">
              Hóspedes
            </label>
            <div className="relative flex space-x-2">
              <div className="relative flex-1">
                <Users className="w-4 h-4 text-[#8E9280] absolute left-3 top-3 pointer-events-none" />
                <select
                  id="select-adults-count"
                  value={adults}
                  onChange={e => setAdults(Number(e.target.value))}
                  className="w-full pl-9 pr-2 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                >
                  <option value={1}>1 Adulto</option>
                  <option value={2}>2 Adultos</option>
                  <option value={3}>3 Adultos</option>
                  <option value={4}>4 Adultos</option>
                </select>
              </div>
              <div className="w-24">
                <select
                  id="select-children-count"
                  value={children}
                  onChange={e => setChildren(Number(e.target.value))}
                  className="w-full px-2 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#6B705C]"
                >
                  <option value={0}>0 Crianças</option>
                  <option value={1}>1 Criança</option>
                  <option value={2}>2 Crianças</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary / Calculation Info */}
          <div className="bg-[#F2F5E8] border border-[#CCD5AE] rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[#6B705C] block">Estadia calculada:</span>
              <span className="font-bold text-[#2C3327] text-sm">
                {nights} {nights === 1 ? 'noite' : 'noites'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#6B705C] block">Check-in:</span>
              <span className="font-semibold text-[#2C3327]">{settings?.checkInTime || '14:00'}</span>
            </div>
          </div>

          <button
            id="btn-search-availability"
            type="button"
            onClick={handleSearchAvailability}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-sm font-bold shadow-sm transition"
          >
            <Search className="w-4 h-4" />
            <span>Buscar disponibilidade</span>
          </button>
        </div>
      </div>

      {/* Room Selection Grid */}
      <section id="available-room-types" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-7 sm:mt-8 space-y-4 scroll-mt-6">
        <div>
          <h3 className="text-2xl font-bold text-[#2C3327] tracking-tight">
            Acomodações Disponíveis
          </h3>
          <p className="text-sm text-[#6B705C] mt-1">
            Selecione a categoria ideal para sua estadia com café da manhã incluso e cancelamento flexível.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {settings?.roomTypes.map(roomType => {
            const totalForNights = roomType.basePrice * nights;

            return (
              <div
                key={roomType.id}
                className="bg-white rounded-2xl border border-[#E6E3D8] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-0"
              >
                <div>
                  {/* Room Image */}
                  <div className="h-36 sm:h-40 lg:h-44 w-full relative bg-[#F4F1EA] overflow-hidden">
                    <img
                      src={roomType.imageUrl || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'}
                      alt={roomType.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3 bg-[#2C3327]/85 backdrop-blur-sm text-[#FDFBF7] px-2.5 py-1 rounded-full text-xs font-semibold">
                      Até {roomType.capacityAdults} adultos
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="p-4 space-y-2.5">
                    <h4 className="text-lg font-bold text-[#2C3327]">
                      {roomType.name}
                    </h4>

                    <p className="text-xs text-[#6B705C] leading-relaxed">
                      {roomType.description}
                    </p>

                    {/* Amenities list */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {roomType.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F4F1EA] text-[#6B705C] border border-[#E6E3D8]"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price & Action Footer */}
                <div className="p-4 pt-3 border-t border-[#E6E3D8] bg-[#FDFBF7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#6B705C] block">
                      {currency} {roomType.basePrice} / noite
                    </span>
                    <span className="text-lg font-extrabold text-[#2C3327]">
                      {currency} {totalForNights.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[11px] text-[#588157] ml-1 font-medium">
                      ({nights} {nights === 1 ? 'diária' : 'diárias'})
                    </span>
                  </div>

                  <button
                    id={`btn-reserve-${roomType.id}`}
                    onClick={() => handleOpenBooking(roomType)}
                    className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-sm transition shrink-0"
                  >
                    <span>Reservar Agora</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Hotel Policies & Features Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-2xl border border-[#E6E3D8] p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-[#F2F5E8] rounded-xl text-[#588157] border border-[#CCD5AE]/50">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-[#2C3327]">Café da Manhã Incluso</h5>
              <p className="text-xs text-[#6B705C] mt-0.5">
                Buffet colonial completo com pães artesanais, frutas selecionadas e opções sem glúten.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-[#F4F1EA] rounded-xl text-[#3A5A40] border border-[#E6E3D8]">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-[#2C3327]">Wi-Fi de Alta Velocidade</h5>
              <p className="text-xs text-[#6B705C] mt-0.5">
                Internet fibra de 500Mbps disponível em todas as suítes e áreas comuns do resort.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-[#FAEDCD] rounded-xl text-[#BC6C25] border border-[#D4A373]/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-[#2C3327]">Cancelamento Flexível</h5>
              <p className="text-xs text-[#6B705C] mt-0.5">
                {settings?.bookingPolicies || 'Cancelamento gratuito até 48h antes da data de check-in.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Checkout Modal */}
      {selectedRoomType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E6E3D8] my-8">
            {!confirmedReservation ? (
              <form onSubmit={handleConfirmReservation} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E3D8]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#588157]">
                      Finalizar Reserva Online
                    </span>
                    <h3 className="text-lg font-extrabold text-[#2C3327]">
                      {selectedRoomType.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomType(null)}
                    className="text-[#8E9280] hover:text-[#2C3327] p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* Reservation Period Summary */}
                <div className="bg-[#F4F1EA] rounded-xl p-3 text-xs border border-[#E6E3D8] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#6B705C]">Check-in:</span>
                    <span className="block font-bold text-[#2C3327]">
                      {new Date(checkInDate + 'T12:00:00').toLocaleDateString('pt-BR')} (a partir de {settings?.checkInTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B705C]">Check-out:</span>
                    <span className="block font-bold text-[#2C3327]">
                      {new Date(checkOutDate + 'T12:00:00').toLocaleDateString('pt-BR')} (até {settings?.checkOutTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B705C]">Hóspedes:</span>
                    <span className="block font-semibold text-[#3D4035]">
                      {adults} adultos {children > 0 ? `, ${children} crianças` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B705C]">Total da Estadia:</span>
                    <span className="block font-extrabold text-[#2C3327] text-sm">
                      {currency} {(selectedRoomType.basePrice * nights).toLocaleString('pt-BR')} ({nights} {nights === 1 ? 'diária' : 'diárias'})
                    </span>
                  </div>
                </div>

                {/* Guest Inputs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B705C]">
                    Dados do Hóspede Principal
                  </h4>

                  <div>
                    <label className="block text-xs font-medium text-[#3D4035] mb-1">
                      Nome Completo *
                    </label>
                    <input
                      id="input-guest-fullname"
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#3D4035] mb-1">
                        E-mail de Confirmação *
                      </label>
                      <input
                        id="input-guest-email"
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#3D4035] mb-1">
                        Telefone / WhatsApp *
                      </label>
                      <input
                        id="input-guest-phone"
                        type="tel"
                        required
                        placeholder="+55 (11) 98765-4321"
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D4035] mb-1">
                      Documento (CPF ou Passaporte)
                    </label>
                    <input
                      id="input-guest-doc"
                      type="text"
                      placeholder="000.000.000-00 ou Número do Passaporte"
                      value={document}
                      onChange={e => setDocument(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D4035] mb-1">
                      Preferências ou Solicitações Especiais
                    </label>
                    <textarea
                      id="input-guest-notes"
                      rows={2}
                      placeholder="Ex: Andar alto, berço para bebê, horário estimado de chegada..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                    ></textarea>
                  </div>
                </div>

                {/* Payment Option */}
                <div className="space-y-2 pt-2 border-t border-[#E6E3D8]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B705C]">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-2 transition ${
                        paymentMethod === 'PIX'
                          ? 'border-[#588157] bg-[#F2F5E8] text-[#2C3327] font-semibold'
                          : 'border-[#E6E3D8] text-[#3D4035] hover:bg-[#FDFBF7]'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-[#588157]" />
                      <div className="text-xs">
                        <span className="block font-bold text-[#2C3327]">PIX Instantâneo</span>
                        <span className="text-[10px] text-[#6B705C]">Confirmação Imediata</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cartao_Credito')}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-2 transition ${
                        paymentMethod === 'Cartao_Credito'
                          ? 'border-[#588157] bg-[#F2F5E8] text-[#2C3327] font-semibold'
                          : 'border-[#E6E3D8] text-[#3D4035] hover:bg-[#FDFBF7]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-[#588157]" />
                      <div className="text-xs">
                        <span className="block font-bold text-[#2C3327]">Cartão de Crédito</span>
                        <span className="text-[10px] text-[#6B705C]">Pague no Check-in</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRoomType(null)}
                    className="px-4 py-2 text-xs font-medium text-[#6B705C] hover:text-[#2C3327]"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-reservation"
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span>Processando no Servidor...</span>
                    ) : (
                      <>
                        <span>Confirmar Reserva</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Voucher Screen */
              <div className="text-center space-y-5 py-2 animate-fade-in">
                <div className="w-14 h-14 bg-[#F2F5E8] text-[#588157] border border-[#CCD5AE] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-bold text-[#588157] uppercase tracking-widest">
                    Reserva Confirmada com Sucesso!
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#2C3327] mt-1">
                    Código: {confirmedReservation.code}
                  </h3>
                  <p className="text-xs text-[#6B705C] mt-1">
                    Enviamos os detalhes da sua confirmação para <strong className="text-[#3D4035]">{confirmedReservation.guestEmail}</strong>
                  </p>
                </div>

                <div className="bg-[#F4F1EA] rounded-2xl p-4 text-xs text-left border border-[#E6E3D8] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#6B705C]">Hóspede:</span>
                    <span className="font-bold text-[#2C3327]">{confirmedReservation.guestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B705C]">Acomodação:</span>
                    <span className="font-bold text-[#2C3327]">Quarto {confirmedReservation.roomNumber} ({confirmedReservation.roomTypeName})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B705C]">Período:</span>
                    <span className="font-semibold text-[#3D4035]">
                      {confirmedReservation.checkInDate} até {confirmedReservation.checkOutDate} ({confirmedReservation.nights} noites)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B705C]">Total:</span>
                    <span className="font-extrabold text-[#2C3327] text-sm">
                      {currency} {confirmedReservation.totalNightsAmount.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B705C]">Status do Pagamento:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E9EDC9] text-[#2C3327]">
                      {confirmedReservation.paymentStatus} via {confirmedReservation.paymentMethod}
                    </span>
                  </div>
                </div>

                {confirmedReservation.paymentMethod === 'PIX' && (
                  <div className="p-3 bg-[#F2F5E8] border border-[#CCD5AE] rounded-xl text-xs text-[#2C3327] flex items-center space-x-2">
                    <QrCode className="w-5 h-5 text-[#588157] shrink-0" />
                    <span>Pagamento PIX registrado e conciliado automaticamente pelo sistema.</span>
                  </div>
                )}

                <div className="pt-3">
                  <button
                    onClick={() => {
                      setSelectedRoomType(null);
                      setConfirmedReservation(null);
                    }}
                    className="w-full py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] text-xs font-bold rounded-xl shadow transition"
                  >
                    Concluir e Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
