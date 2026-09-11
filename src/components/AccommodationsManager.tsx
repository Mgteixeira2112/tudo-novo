import React, { useEffect, useMemo, useState } from 'react';
import { BedDouble, Building2, Image as ImageIcon, Save } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { RoomTypeConfig } from '../types.ts';
import { RoomsRegistryManager } from './RoomsRegistryManager.tsx';

export const AccommodationsManager: React.FC = () => {
  const { rooms, settings, updateSettings, refreshData, hasPermission } = useHotel();
  const canManageCategories = hasPermission('manage_room_rates');
  const canManageRooms = hasPermission('manage_room_registry');
  const [activeTab, setActiveTab] = useState<'categories' | 'rooms'>(canManageCategories ? 'categories' : 'rooms');
  const [roomTypes, setRoomTypes] = useState<RoomTypeConfig[]>(settings?.roomTypes || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRoomTypes(settings?.roomTypes || []);
  }, [settings?.roomTypes]);

  const roomCountByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of rooms) counts.set(room.typeId, (counts.get(room.typeId) || 0) + 1);
    return counts;
  }, [rooms]);

  const saveRates = async () => {
    try {
      setSaving(true);
      await updateSettings({ roomTypes });
      await refreshData();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error: any) {
      alert(error?.message || 'Erro ao salvar tarifas das acomodações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#588157]" />
              <h2 className="text-xl font-black text-[#2C3327]">Acomodações</h2>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">Categorias comerciais e quartos físicos em um único módulo.</p>
          </div>
          <div className="inline-flex rounded-xl border border-[#E6E3D8] bg-[#F4F1EA] p-1">
            {canManageCategories && (
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${activeTab === 'categories' ? 'bg-[#2C3327] text-white shadow-sm' : 'text-[#6B705C] hover:bg-white'}`}
              >
                Categorias
              </button>
            )}
            {canManageRooms && (
              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${activeTab === 'rooms' ? 'bg-[#2C3327] text-white shadow-sm' : 'text-[#6B705C] hover:bg-white'}`}
              >
                Quartos
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'categories' && canManageCategories && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] px-4 py-3 text-xs text-[#6B705C]">
            Esta é a base comercial usada pelo motor de reservas. Nesta primeira etapa, as tarifas existentes foram trazidas para o novo módulo sem alterar o modelo de dados.
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roomTypes.map(roomType => (
              <article key={roomType.id} className="overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)]">
                  <div className="h-40 bg-[#F4F1EA] sm:h-full">
                    {roomType.imageUrl ? (
                      <img src={roomType.imageUrl} alt={roomType.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-full min-h-40 items-center justify-center text-[#8E9280]"><ImageIcon className="h-8 w-8" /></div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-[#2C3327]">{roomType.name}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-[#6B705C]">{roomType.description}</p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-[#F4F1EA] px-2 py-1 text-[10px] font-bold text-[#6B705C]">
                          {roomCountByType.get(roomType.id) || 0} quartos
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(roomType.amenities || []).slice(0, 6).map(item => (
                        <span key={item} className="rounded-md border border-[#E6E3D8] bg-[#FDFBF7] px-2 py-0.5 text-[10px] text-[#6B705C]">{item}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F4F1EA] p-3">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Capacidade atual</span>
                        <span className="mt-1 block text-xs font-black text-[#2C3327]">{roomType.capacityAdults} adultos + {roomType.capacityChildren} crianças</span>
                      </div>
                      <label className="text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">
                        Diária base
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs font-black text-[#2C3327]">{settings?.currency || 'R$'}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={roomType.basePrice}
                            onChange={event => setRoomTypes(current => current.map(item => item.id === roomType.id ? { ...item, basePrice: Number(event.target.value) } : item))}
                            className="w-full rounded-lg border border-[#DDD8C9] bg-white px-2 py-1.5 text-xs font-bold text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]"
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 rounded-2xl border border-[#E6E3D8] bg-white p-4">
            {saved && <span className="text-xs font-bold text-[#588157]">Tarifas salvas.</span>}
            <button
              type="button"
              onClick={saveRates}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#3A4135] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar tarifas'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && canManageRooms && (
        <div className="rounded-2xl border border-[#E6E3D8] bg-white">
          <div className="flex items-center gap-2 border-b border-[#E6E3D8] px-4 py-3">
            <BedDouble className="h-4 w-4 text-[#588157]" />
            <p className="text-xs font-bold text-[#6B705C]">Unidades físicas vinculadas às categorias comerciais</p>
          </div>
          <RoomsRegistryManager />
        </div>
      )}
    </div>
  );
};
