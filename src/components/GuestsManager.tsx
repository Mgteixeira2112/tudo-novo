import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Crown,
  CheckCircle,
  AlertOctagon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  HeartPulse,
  Sparkles,
  Edit2,
  Trash2,
  BedDouble
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { Guest } from '../types.ts';
import { api } from '../services/api.ts';

export const GuestsManager: React.FC = () => {
  const { guests, settings, refreshData } = useHotel();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'VIP' | 'Ativo' | 'Restricao'>('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [document, setDocument] = useState('');
  const [documentType, setDocumentType] = useState<'CPF' | 'Passaporte' | 'RG'>('CPF');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [preferences, setPreferences] = useState('');
  const [allergiesNotes, setAllergiesNotes] = useState('');
  const [status, setStatus] = useState<Guest['status']>('Ativo');
  const [submitting, setSubmitting] = useState(false);

  // Filter guests
  const filteredGuests = guests.filter(g => {
    const matchesSearch =
      g.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.document.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.phone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingGuest(null);
    setFullName('');
    setDocument('');
    setDocumentType('CPF');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('SC');
    setBirthDate('');
    setPreferences('');
    setAllergiesNotes('');
    setStatus('Ativo');
    setShowModal(true);
  };

  const handleOpenEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setFullName(guest.fullName);
    setDocument(guest.document);
    setDocumentType(guest.documentType);
    setEmail(guest.email);
    setPhone(guest.phone);
    setAddress(guest.address || '');
    setCity(guest.city || '');
    setState(guest.state || '');
    setBirthDate(guest.birthDate || '');
    setPreferences(guest.preferences || '');
    setAllergiesNotes(guest.allergiesNotes || '');
    setStatus(guest.status);
    setShowModal(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !document.trim() || !email.trim()) return;

    try {
      setSubmitting(true);
      if (editingGuest) {
        await api.updateGuest(editingGuest.id, {
          fullName,
          document,
          documentType,
          email,
          phone,
          address,
          city,
          state,
          birthDate,
          preferences,
          allergiesNotes,
          status
        });
      } else {
        await api.createGuest({
          fullName,
          document,
          documentType,
          email,
          phone,
          address,
          city,
          state,
          birthDate,
          preferences,
          allergiesNotes,
          status
        });
      }

      setShowModal(false);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar hóspede');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir o cadastro deste hóspede?')) return;
    try {
      await api.deleteGuest(id);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir hóspede');
    }
  };

  const getStatusBadge = (guestStatus: Guest['status']) => {
    switch (guestStatus) {
      case 'VIP':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAEDCD] text-[#BC6C25] border border-[#D4A373]">
            <Crown className="w-3.5 h-3.5 text-[#BC6C25]" />
            <span>VIP Exclusivo</span>
          </span>
        );
      case 'Restricao':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAEDCD] text-[#9C5A2B] border border-[#D4A373]/50">
            <AlertOctagon className="w-3.5 h-3.5 text-[#9C5A2B]" />
            <span>Restrição / Bloqueado</span>
          </span>
        );
      case 'Ativo':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F2F5E8] text-[#2C3327] border border-[#CCD5AE]">
            <CheckCircle className="w-3.5 h-3.5 text-[#588157]" />
            <span>Ativo</span>
          </span>
        );
    }
  };

  const currency = settings?.currency || 'R$';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & New Guest Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327] tracking-tight">
            Cadastro Completo de Hóspedes
          </h2>
          <p className="text-xs sm:text-sm text-[#6B705C] mt-1">
            CRM Hoteleiro com perfil completo, histórico de estadias, faturamento (LTV), preferências e restrições.
          </p>
        </div>

        <button
          id="btn-add-guest"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-sm transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Hóspede</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E6E3D8] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8E9280] absolute left-3 top-2.5 pointer-events-none" />
          <input
            id="input-search-guest"
            type="text"
            placeholder="Buscar por nome, CPF, e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto text-xs font-medium">
          {(['Todos', 'VIP', 'Ativo', 'Restricao'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                statusFilter === f
                  ? 'bg-[#2C3327] text-[#FDFBF7] font-semibold shadow-2xs'
                  : 'bg-[#F4F1EA] text-[#6B705C] hover:bg-[#E6E3D8]'
              }`}
            >
              {f === 'Restricao' ? 'Com Restrição' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Guests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuests.map(guest => (
          <div
            key={guest.id}
            className="bg-white rounded-2xl border border-[#E6E3D8] p-5 shadow-xs hover:border-[#CCD5AE] transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-[#E6E3D8]">
                <div>
                  <h3 className="text-sm font-bold text-[#2C3327] leading-tight">
                    {guest.fullName}
                  </h3>
                  <span className="text-xs text-[#6B705C]">
                    {guest.documentType}: {guest.document}
                  </span>
                </div>
                {getStatusBadge(guest.status)}
              </div>

              <div className="pt-3 space-y-2 text-xs text-[#6B705C]">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-[#8E9280] shrink-0" />
                  <span className="truncate">{guest.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-[#8E9280] shrink-0" />
                  <span>{guest.phone}</span>
                </div>
                {guest.city && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8E9280] shrink-0" />
                    <span>{guest.city}, {guest.state}</span>
                  </div>
                )}
              </div>

              {/* Preferences / Allergies Pills */}
              {(guest.preferences || guest.allergiesNotes) && (
                <div className="mt-3 pt-3 border-t border-[#E6E3D8] space-y-1.5 text-xs">
                  {guest.preferences && (
                    <div className="flex items-start space-x-1.5 text-[#2C3327] bg-[#F2F5E8] p-2 rounded-lg border border-[#CCD5AE]">
                      <Sparkles className="w-3.5 h-3.5 text-[#588157] shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{guest.preferences}</span>
                    </div>
                  )}
                  {guest.allergiesNotes && (
                    <div className="flex items-start space-x-1.5 text-[#BC6C25] bg-[#FAEDCD] p-2 rounded-lg border border-[#D4A373]/30">
                      <HeartPulse className="w-3.5 h-3.5 text-[#BC6C25] shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{guest.allergiesNotes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Lifetime Stats & Actions Footer */}
            <div className="pt-3 border-t border-[#E6E3D8] flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-[#6B705C] block">
                  {guest.totalStays} {guest.totalStays === 1 ? 'estadia' : 'estadias'}
                </span>
                <span className="font-bold text-[#2C3327]">
                  LTV: {currency} {guest.totalSpent.toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEditModal(guest)}
                  className="p-1.5 text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F2F5E8] rounded-lg transition"
                  title="Editar hóspede"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteGuest(guest.id)}
                  className="p-1.5 text-[#8E9280] hover:text-[#BC6C25] hover:bg-[#FAEDCD] rounded-lg transition"
                  title="Excluir hóspede"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Guest Modal: Create & Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E6E3D8] my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E3D8]">
              <h3 className="text-base font-bold text-[#2C3327]">
                {editingGuest ? 'Editar Cadastro do Hóspede' : 'Novo Cadastro de Hóspede'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#8E9280] hover:text-[#2C3327] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGuest} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Nome Completo *
                </label>
                <input
                  id="input-form-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Tipo de Doc
                  </label>
                  <select
                    id="select-form-doctype"
                    value={documentType}
                    onChange={e => setDocumentType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="CPF">CPF</option>
                    <option value="Passaporte">Passaporte</option>
                    <option value="RG">RG</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Número do Documento *
                  </label>
                  <input
                    id="input-form-document"
                    type="text"
                    required
                    value={document}
                    onChange={e => setDocument(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    E-mail Principal *
                  </label>
                  <input
                    id="input-form-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    id="input-form-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Cidade
                  </label>
                  <input
                    id="input-form-city"
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Estado (UF)
                  </label>
                  <input
                    id="input-form-state"
                    type="text"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Classificação / Status
                  </label>
                  <select
                    id="select-form-status"
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="VIP">VIP Exclusivo</option>
                    <option value="Restricao">Restrição</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    id="input-form-birthdate"
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Preferências de Quarto e Hospedagem
                </label>
                <textarea
                  id="textarea-form-preferences"
                  rows={2}
                  placeholder="Ex: Prefere travesseiros de plumas, andar silencioso, café descafeinado..."
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Restrições Médicas / Alergias
                </label>
                <textarea
                  id="textarea-form-allergies"
                  rows={2}
                  placeholder="Ex: Alergia a camarão e frutos do mar, intolerância a lactose..."
                  value={allergiesNotes}
                  onChange={e => setAllergiesNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E6E3D8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6B705C] hover:text-[#2C3327]"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-guest"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition"
                >
                  {submitting ? 'Salvando...' : 'Salvar Hóspede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
