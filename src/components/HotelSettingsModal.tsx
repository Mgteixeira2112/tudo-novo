import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Database,
  Check,
  Copy,
  Save,
  BedDouble,
  ShieldCheck,
  ExternalLink,
  Wifi,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { HotelSettings, RoomTypeConfig } from '../types.ts';
import { api } from '../services/api.ts';

interface HotelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_COLORS: { id: HotelSettings['primaryColor']; label: string; bgClass: string }[] = [
  { id: 'emerald', label: 'Verde Esmeralda', bgClass: 'bg-emerald-600' },
  { id: 'blue', label: 'Azul Real', bgClass: 'bg-blue-600' },
  { id: 'amber', label: 'Âmbar Dourado', bgClass: 'bg-amber-600' },
  { id: 'violet', label: 'Violeta Imperial', bgClass: 'bg-violet-600' },
  { id: 'rose', label: 'Rose Gold / Luxo', bgClass: 'bg-rose-600' },
  { id: 'slate', label: 'Grafite / Ardósia', bgClass: 'bg-slate-700' },
];

export const HotelSettingsModal: React.FC<HotelSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, supabaseStatus, updateSettings, refreshData } = useHotel();

  const [activeTab, setActiveTab] = useState<'visual' | 'rooms' | 'supabase'>('visual');

  // Form states
  const [hotelName, setHotelName] = useState(settings?.hotelName || '');
  const [tagline, setTagline] = useState(settings?.tagline || '');
  const [description, setDescription] = useState(settings?.description || '');
  const [primaryColor, setPrimaryColor] = useState<HotelSettings['primaryColor']>(settings?.primaryColor || 'emerald');
  const [currency, setCurrency] = useState(settings?.currency || 'R$');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(settings?.taxRatePercent || 5.0);
  const [checkInTime, setCheckInTime] = useState(settings?.checkInTime || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(settings?.checkOutTime || '11:00');
  const [address, setAddress] = useState(settings?.address || '');
  const [cityState, setCityState] = useState(settings?.cityState || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [wifiPassword, setWifiPassword] = useState(settings?.wifiPassword || '');
  const [bookingPolicies, setBookingPolicies] = useState(settings?.bookingPolicies || '');

  // Room types config
  const [roomTypes, setRoomTypes] = useState<RoomTypeConfig[]>(settings?.roomTypes || []);

  const [copiedSql, setCopiedSql] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSettings({
        hotelName,
        tagline,
        description,
        primaryColor,
        currency,
        taxRatePercent: Number(taxRatePercent),
        checkInTime,
        checkOutTime,
        address,
        cityState,
        phone,
        email,
        wifiPassword,
        bookingPolicies,
        roomTypes
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleCopySql = () => {
    api.getSupabaseSQL().then(sql => {
      navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  const handleRoomPriceChange = (id: string, newPrice: number) => {
    setRoomTypes(prev => prev.map(rt => (rt.id === id ? { ...rt, basePrice: newPrice } : rt)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#E6E3D8] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E3D8]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-[#F4F1EA] rounded-xl text-[#2C3327]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2C3327]">
                Configurações do Hotel & Persistência SQL
              </h3>
              <p className="text-xs text-[#6B705C]">
                Front-end 100% configurável com persistência relacional sem localStorage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E9280] hover:text-[#2C3327] p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-[#E6E3D8] py-3 text-xs font-semibold">
          <button
            id="tab-settings-visual"
            onClick={() => setActiveTab('visual')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'visual'
                ? 'bg-[#2C3327] text-[#FDFBF7] font-bold'
                : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Identidade Visual & Marca</span>
          </button>

          <button
            id="tab-settings-rooms"
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'rooms'
                ? 'bg-[#2C3327] text-[#FDFBF7] font-bold'
                : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>Tarifas & Acomodações</span>
          </button>

          <button
            id="tab-settings-supabase"
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'supabase'
                ? 'bg-[#2C3327] text-[#FDFBF7] font-bold'
                : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-[#F4F1EA]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#588157]" />
            <span>Supabase & Banco SQL</span>
          </button>
        </div>

        {/* Tab 1: Visual Branding */}
        {activeTab === 'visual' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Nome do Hotel / Empreendimento *
                </label>
                <input
                  id="input-cfg-hotelname"
                  type="text"
                  required
                  value={hotelName}
                  onChange={e => setHotelName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Slogan / Subtítulo
                </label>
                <input
                  id="input-cfg-tagline"
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                Paleta de Cores do Tema Front-End
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {THEME_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPrimaryColor(c.id)}
                    className={`flex items-center space-x-2 p-2 rounded-xl border text-xs font-semibold transition ${
                      primaryColor === c.id
                        ? 'border-[#2C3327] bg-[#F4F1EA] text-[#2C3327] ring-2 ring-[#2C3327]/20'
                        : 'border-[#E6E3D8] text-[#6B705C] hover:bg-[#F4F1EA]'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bgClass}`}></span>
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Moeda
                </label>
                <select
                  id="select-cfg-currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                >
                  <option value="R$">R$ (Real Brasileiro)</option>
                  <option value="$">$ (Dólar USD)</option>
                  <option value="€">€ (Euro EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Taxa de Serviço (%)
                </label>
                <input
                  id="input-cfg-taxrate"
                  type="number"
                  step="0.5"
                  value={taxRatePercent}
                  onChange={e => setTaxRatePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Check-in Padrão
                </label>
                <input
                  id="input-cfg-checkintime"
                  type="text"
                  value={checkInTime}
                  onChange={e => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Check-out Padrão
                </label>
                <input
                  id="input-cfg-checkouttime"
                  type="text"
                  value={checkOutTime}
                  onChange={e => setCheckOutTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  id="input-cfg-phone"
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  E-mail de Reservas
                </label>
                <input
                  id="input-cfg-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                  Senha do Wi-Fi dos Hóspedes
                </label>
                <input
                  id="input-cfg-wifi"
                  type="text"
                  value={wifiPassword}
                  onChange={e => setWifiPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B705C] mb-1">
                Políticas de Reserva & Cancelamento
              </label>
              <textarea
                id="textarea-cfg-policies"
                rows={2}
                value={bookingPolicies}
                onChange={e => setBookingPolicies(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl focus:ring-2 focus:ring-[#588157] outline-none text-[#3D4035]"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E6E3D8]">
              {savedSuccess ? (
                <span className="text-xs font-bold text-[#588157] flex items-center">
                  <Check className="w-4 h-4 mr-1" /> Configurações salvas no servidor!
                </span>
              ) : (
                <span></span>
              )}

              <button
                id="btn-save-settings"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Room Types & Rates */}
        {activeTab === 'rooms' && (
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-[#2C3327]">
                  Categorias de Quartos & Tarifas Base
                </h4>
                <p className="text-xs text-[#6B705C]">
                  Defina os valores das diárias apresentados no Motor de Reservas Online.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {roomTypes.map(rt => (
                <div
                  key={rt.id}
                  className="p-4 bg-[#F4F1EA] rounded-2xl border border-[#E6E3D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-[#2C3327]">{rt.name}</h5>
                    <p className="text-xs text-[#6B705C] line-clamp-1">{rt.description}</p>
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {rt.amenities.map((a, i) => (
                        <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#E6E3D8] text-[#6B705C]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs text-[#6B705C]">Diária Base: {currency}</span>
                    <input
                      type="number"
                      min="50"
                      step="10"
                      value={rt.basePrice}
                      onChange={e => handleRoomPriceChange(rt.id, Number(e.target.value))}
                      className="w-24 px-2 py-1.5 text-xs font-bold text-[#2C3327] border border-[#E6E3D8] rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#588157]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E6E3D8]">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Tarifas</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Supabase & SQL Architecture */}
        {activeTab === 'supabase' && (
          <div className="space-y-5 pt-4">
            <div className="p-4 bg-[#F2F5E8] border border-[#CCD5AE] rounded-2xl">
              <div className="flex items-start space-x-3">
                <Database className="w-6 h-6 text-[#588157] mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#2C3327]">
                    Persistência SQL Supabase Ativa (Zero LocalStorage)
                  </h4>
                  <p className="text-xs text-[#3D4035] leading-relaxed">
                    O SaaS hoteleiro opera com arquitetura full-stack: todas as transações, reservas, quartos, frigobar e kanbans são geridos via API de servidor com persistência em banco relacional SQL.
                  </p>
                </div>
              </div>
            </div>

            {/* Counts in SQL tables */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#6B705C] mb-2">
                Tabelas Relacionais Sincronizadas
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                  <span className="text-[#6B705C] block">Quartos</span>
                  <span className="font-extrabold text-[#2C3327] text-sm">{supabaseStatus?.tableCounts?.rooms || 0}</span>
                </div>
                <div className="p-2.5 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                  <span className="text-[#6B705C] block">Reservas</span>
                  <span className="font-extrabold text-[#2C3327] text-sm">{supabaseStatus?.tableCounts?.reservations || 0}</span>
                </div>
                <div className="p-2.5 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                  <span className="text-[#6B705C] block">Tarefas Kanban</span>
                  <span className="font-extrabold text-[#2C3327] text-sm">{supabaseStatus?.tableCounts?.kanban_tasks || 0}</span>
                </div>
                <div className="p-2.5 bg-[#F4F1EA] rounded-xl border border-[#E6E3D8]">
                  <span className="text-[#6B705C] block">Lançamentos Financeiros</span>
                  <span className="font-extrabold text-[#2C3327] text-sm">{supabaseStatus?.tableCounts?.financial_transactions || 0}</span>
                </div>
              </div>
            </div>

            {/* Supabase SQL DDL copy snippet */}
            <div className="p-4 bg-[#2C3327] text-[#FDFBF7] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E9EDC9]" />
                  <span>Script DDL Completo das 10 Tabelas Supabase</span>
                </span>

                <button
                  id="btn-copy-full-schema"
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-[#588157] hover:bg-[#3A5A40] text-[#FDFBF7] rounded-lg text-xs font-bold transition"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#A3B18A]">
                Basta colar este script no SQL Editor do seu projeto Supabase para criar ou sincronizar as tabelas relacionais de Quartos, Hóspedes, Reservas, Kanbans por Setor, Frigobar e Financeiro.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
