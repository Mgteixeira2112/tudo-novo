import React, { useEffect, useMemo, useState } from 'react';
import { BedDouble, CalendarDays, CreditCard, Loader2, Users, X } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { loadGuestsCloud } from '../services/adminPages.ts';
import { Guest, Reservation, Room, RoomTypeConfig } from '../types.ts';
import { createReservationForRoomAtomic } from '../services/reservationQuickCreate.ts';

const addDays = (value: string, amount: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
};

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const currency = (value: number, symbol: string) =>
  `${symbol} ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

interface ReservationQuickCreateModalProps {
  room: Room;
  roomType?: RoomTypeConfig;
  initialCheckInDate: string;
  minimumCheckInDate: string;
  currencySymbol: string;
  onClose: () => void;
  onCreated: (reservation: Reservation) => Promise<void> | void;
}

export const ReservationQuickCreateModal: React.FC<ReservationQuickCreateModalProps> = ({
  room,
  roomType,
  initialCheckInDate,
  minimumCheckInDate,
  currencySymbol,
  onClose,
  onCreated
}) => {
  const { guests } = useHotel();
  const [checkInDate, setCheckInDate] = useState(initialCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState(addDays(initialCheckInDate, 1));
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestDocument, setGuestDocument] = useState('');
  const [guestDirectory, setGuestDirectory] = useState<Guest[]>(guests);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<Reservation['paymentMethod']>('PIX');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const maxAdults = Math.max(1, Number(roomType?.capacityAdults || 10));
  const maxChildren = Math.max(0, Number(roomType?.capacityChildren || 10));
  const maxOccupancy = Math.max(1, Number(roomType?.maxOccupancy || maxAdults + maxChildren));

  const nights = useMemo(() => {
    const start = Date.parse(`${checkInDate}T00:00:00Z`);
    const end = Date.parse(`${checkOutDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.round((end - start) / 86400000);
  }, [checkInDate, checkOutDate]);

  const sortedGuests = useMemo(
    () => [...guestDirectory].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR')),
    [guestDirectory]
  );

  const totalAmount = nights * Number(room.pricePerNight || 0);

  useEffect(() => {
    if (checkOutDate <= checkInDate) {
      setCheckOutDate(addDays(checkInDate, 1));
    }
  }, [checkInDate, checkOutDate]);

  useEffect(() => {
    if (guests.length > 0) {
      setGuestDirectory(guests);
      return;
    }

    let active = true;
    loadGuestsCloud()
      .then(data => {
        if (active) setGuestDirectory(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [guests]);

  const selectExistingGuest = (guestId: string) => {
    setSelectedGuestId(guestId);
    if (!guestId) return;

    const guest = guestDirectory.find(item => item.id === guestId);
    if (!guest) return;

    setGuestName(guest.fullName || '');
    setGuestEmail(guest.email || '');
    setGuestPhone(guest.phone || '');
    setGuestDocument(guest.document || '');
  };

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');

    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setErrorMessage('Informe nome, e-mail e telefone do hóspede.');
      return;
    }
    if (!checkInDate || checkInDate < minimumCheckInDate) {
      setErrorMessage('A entrada não pode ser anterior à data operacional atual.');
      return;
    }
    if (!checkOutDate || checkOutDate <= checkInDate) {
      setErrorMessage('A saída deve ser posterior à entrada.');
      return;
    }
    if (adults < 1 || adults > maxAdults) {
      setErrorMessage(`Esta acomodação aceita no máximo ${maxAdults} adulto(s).`);
      return;
    }
    if (children < 0 || children > maxChildren) {
      setErrorMessage(`Esta acomodação aceita no máximo ${maxChildren} criança(s).`);
      return;
    }
    if (adults + children > maxOccupancy) {
      setErrorMessage(`A ocupação máxima desta acomodação é de ${maxOccupancy} hóspede(s).`);
      return;
    }

    try {
      setSaving(true);
      const reservation = await createReservationForRoomAtomic({
        roomId: room.id,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        guestDocument: guestDocument.trim() || undefined,
        checkInDate,
        checkOutDate,
        adults,
        children,
        paymentMethod,
        notes: notes.trim() || undefined
      });
      await onCreated(reservation);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível criar a reserva.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={close}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[#DADFD1] bg-[#FDFBF7] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E6E3D8] bg-[#FDFBF7]/95 backdrop-blur px-5 py-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.16em] font-black text-[#588157]">Reserva pela grade</span>
            <h3 className="mt-1 text-xl font-black text-[#2C3327]">Nova reserva · Quarto {room.number}</h3>
            <p className="mt-1 text-xs text-[#6B705C]">{room.typeName} · {room.floor}º andar</p>
          </div>
          <button type="button" onClick={close} disabled={saving} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 space-y-5">
          <section className="rounded-2xl border border-[#CCD5AE] bg-[#F2F5E8] p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-[#588157]" />
                <div><span className="block text-[#7B806E]">Quarto fixado</span><strong className="text-[#2C3327]">{room.number}</strong></div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#588157]" />
                <div><span className="block text-[#7B806E]">Entrada inicial</span><strong className="text-[#2C3327]">{formatDate(initialCheckInDate)}</strong></div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#588157]" />
                <div><span className="block text-[#7B806E]">Diária atual</span><strong className="text-[#2C3327]">{currency(room.pricePerNight, currencySymbol)}</strong></div>
              </div>
            </div>
          </section>

          {sortedGuests.length > 0 && (
            <section className="rounded-2xl border border-[#DADFD1] bg-white p-4">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 w-4 h-4 shrink-0 text-[#588157]" />
                <div className="min-w-0 flex-1">
                  <label className="block text-xs font-bold text-[#4F5548]">
                    Hóspede já cadastrado (opcional)
                    <select
                      value={selectedGuestId}
                      onChange={event => selectExistingGuest(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30"
                    >
                      <option value="">Preencher manualmente</option>
                      {sortedGuests.map(guest => (
                        <option key={guest.id} value={guest.id}>
                          {guest.fullName}{guest.email ? ` · ${guest.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#7B806E]">Selecionar um cadastro existente apenas preenche os dados abaixo. Você ainda pode revisar tudo antes de criar a reserva.</p>
                </div>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-[#4F5548]">
              Entrada
              <input type="date" value={checkInDate} min={minimumCheckInDate} onChange={event => setCheckInDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
            </label>
            <label className="text-xs font-bold text-[#4F5548]">
              Saída
              <input type="date" value={checkOutDate} min={addDays(checkInDate, 1)} onChange={event => setCheckOutDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
            </label>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="sm:col-span-2 text-xs font-bold text-[#4F5548]">
              Nome do hóspede *
              <input value={guestName} onChange={event => setGuestName(event.target.value)} maxLength={120} autoFocus className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
            </label>
            <label className="text-xs font-bold text-[#4F5548]">
              E-mail *
              <input type="email" value={guestEmail} onChange={event => setGuestEmail(event.target.value)} maxLength={254} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
            </label>
            <label className="text-xs font-bold text-[#4F5548]">
              Telefone *
              <input value={guestPhone} onChange={event => setGuestPhone(event.target.value)} maxLength={40} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
            </label>
            <label className="sm:col-span-2 text-xs font-bold text-[#4F5548]">
              Documento
              <input value={guestDocument} onChange={event => setGuestDocument(event.target.value)} maxLength={60} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
            </label>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs font-bold text-[#4F5548]">
              Adultos
              <select value={adults} onChange={event => setAdults(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none">
                {Array.from({ length: maxAdults }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#4F5548]">
              Crianças
              <select value={children} onChange={event => setChildren(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none">
                {Array.from({ length: maxChildren + 1 }, (_, value) => value).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#4F5548]">
              Forma de pagamento
              <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as Reservation['paymentMethod'])} className="mt-1 w-full rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none">
                <option value="PIX">PIX</option>
                <option value="Cartao_Credito">Cartão de crédito</option>
                <option value="Cartao_Debito">Cartão de débito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </label>
          </section>

          <label className="block text-xs font-bold text-[#4F5548]">
            Observações
            <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} maxLength={1000} className="mt-1 w-full resize-none rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#588157]/30" />
          </label>

          <section className="rounded-2xl border border-[#E6E3D8] bg-white p-4 text-xs">
            <div className="flex items-center justify-between gap-3"><span className="text-[#6B705C]">Estadia</span><strong className="text-[#2C3327]">{nights || 0} noite(s)</strong></div>
            <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[#6B705C]">Total previsto</span><strong className="text-base text-[#2C3327]">{currency(totalAmount, currencySymbol)}</strong></div>
            <p className="mt-3 border-t border-[#EEEAE1] pt-3 text-[10px] leading-relaxed text-[#7B806E]">A reserva será criada como <strong>Confirmada</strong> pela Recepção, com pagamento pendente. O Supabase revalida o quarto e todo o período antes de concluir.</p>
          </section>

          {errorMessage && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{errorMessage}</div>}
        </div>

        <footer className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-[#E6E3D8] bg-white px-5 py-4">
          <button type="button" onClick={close} disabled={saving} className="rounded-xl border border-[#DADFD1] px-4 py-2.5 text-xs font-bold text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={saving || nights < 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#3A4235] disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Criando reserva...' : 'Criar reserva confirmada'}
          </button>
        </footer>
      </form>
    </div>
  );
};
