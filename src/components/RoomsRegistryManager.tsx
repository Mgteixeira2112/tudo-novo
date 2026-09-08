import React, { useMemo, useState } from 'react';
import { BedDouble, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { api } from '../services/api.ts';
import { Room } from '../types.ts';

interface RoomFormState {
  number: string;
  floor: number;
  typeId: string;
  typeName: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  notes: string;
}

export const RoomsRegistryManager: React.FC = () => {
  const { rooms, settings, refreshData } = useHotel();
  const [search, setSearch] = useState('');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');

  const defaultType = settings?.roomTypes?.[0];
  const emptyForm = (): RoomFormState => ({
    number: '',
    floor: 1,
    typeId: defaultType?.id || 'rt_standard',
    typeName: defaultType?.name || 'Suíte Standard',
    pricePerNight: defaultType?.basePrice || 0,
    capacity: defaultType?.capacityAdults || 2,
    amenities: defaultType?.amenities ? [...defaultType.amenities] : [],
    notes: ''
  });

  const [form, setForm] = useState<RoomFormState>(emptyForm);

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter(room =>
      room.number.toLowerCase().includes(term) ||
      room.typeName.toLowerCase().includes(term) ||
      String(room.floor).includes(term)
    );
  }, [rooms, search]);

  const openCreate = () => {
    setEditingRoom(null);
    setForm(emptyForm());
    setAmenityInput('');
    setShowModal(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({
      number: room.number,
      floor: room.floor,
      typeId: room.typeId,
      typeName: room.typeName,
      pricePerNight: room.pricePerNight,
      capacity: room.capacity,
      amenities: [...room.amenities],
      notes: room.notes || ''
    });
    setAmenityInput('');
    setShowModal(true);
  };

  const handleTypeChange = (typeId: string) => {
    const type = settings?.roomTypes?.find(item => item.id === typeId);
    if (!type) return;
    setForm(prev => ({
      ...prev,
      typeId: type.id,
      typeName: type.name,
      pricePerNight: type.basePrice,
      capacity: type.capacityAdults,
      amenities: type.amenities ? [...type.amenities] : prev.amenities
    }));
  };

  const addAmenity = () => {
    const value = amenityInput.trim();
    if (!value || form.amenities.includes(value)) return;
    setForm(prev => ({ ...prev, amenities: [...prev.amenities, value] }));
    setAmenityInput('');
  };

  const saveRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.number.trim()) return;
    try {
      setSubmitting(true);
      const payload = {
        number: form.number.trim(),
        floor: Number(form.floor),
        typeId: form.typeId,
        typeName: form.typeName,
        pricePerNight: Number(form.pricePerNight),
        capacity: Number(form.capacity),
        amenities: form.amenities,
        notes: form.notes
      };

      if (editingRoom) {
        await api.updateRoom(editingRoom.id, payload);
      } else {
        await api.createRoom({ ...payload, status: 'Disponivel' });
      }

      await refreshData();
      setShowModal(false);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar quarto.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRoom = async (room: Room) => {
    if (room.status === 'Ocupado') {
      alert('Não é possível excluir um quarto ocupado.');
      return;
    }
    if (!window.confirm(`Excluir o Quarto ${room.number}?`)) return;
    try {
      await api.deleteRoom(room.id);
      await refreshData();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir quarto.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-[#588157]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C3327]">Cadastro de Quartos</h2>
          </div>
        </div>
        <button
          id="btn-create-room-registry"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C3327] text-white text-xs font-bold hover:bg-[#3A4135] transition"
        >
          <Plus className="w-4 h-4" /> Novo Quarto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E6E3D8] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E6E3D8] flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9280]" />
            <input
              id="input-room-registry-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar número, tipo ou andar..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]"
            />
          </div>
          <span className="text-xs font-semibold text-[#6B705C]">{filteredRooms.length} quartos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F1EA] text-[#6B705C] border-b border-[#E6E3D8]">
              <tr>
                <th className="p-3">Quarto</th>
                <th className="p-3">Andar</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Capacidade</th>
                <th className="p-3">Diária</th>
                <th className="p-3">Status atual</th>
                <th className="p-3 text-right">Ações cadastrais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E3D8]">
              {filteredRooms.map(room => (
                <tr key={room.id} className="hover:bg-[#FDFBF7]">
                  <td className="p-3 font-bold text-[#2C3327]">{room.number}</td>
                  <td className="p-3">{room.floor}</td>
                  <td className="p-3">{room.typeName}</td>
                  <td className="p-3">{room.capacity} pessoas</td>
                  <td className="p-3 font-semibold">{settings?.currency || 'R$'} {room.pricePerNight.toFixed(2)}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-lg bg-[#F4F1EA] border border-[#E6E3D8] font-semibold">{room.status}</span></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(room)} className="p-2 rounded-lg hover:bg-[#F4F1EA]" title="Editar cadastro"><Edit3 className="w-4 h-4 text-[#588157]" /></button>
                      <button onClick={() => deleteRoom(room)} className="p-2 rounded-lg hover:bg-red-50" title="Excluir quarto"><Trash2 className="w-4 h-4 text-red-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={saveRoom} className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E6E3D8] p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#E6E3D8] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#2C3327]">{editingRoom ? `Editar Quarto ${editingRoom.number}` : 'Cadastrar Novo Quarto'}</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 text-[#8E9280] hover:text-[#2C3327]"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold text-[#6B705C]">Número do quarto
                <input required value={form.number} onChange={e => setForm(prev => ({ ...prev, number: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </label>
              <label className="text-xs font-semibold text-[#6B705C]">Andar
                <input required type="number" value={form.floor} onChange={e => setForm(prev => ({ ...prev, floor: Number(e.target.value) }))} className="mt-1 w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </label>
              <label className="text-xs font-semibold text-[#6B705C]">Tipo de quarto
                <select value={form.typeId} onChange={e => handleTypeChange(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]">
                  {(settings?.roomTypes || []).map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-[#6B705C]">Diária
                <input required min="0" type="number" step="0.01" value={form.pricePerNight} onChange={e => setForm(prev => ({ ...prev, pricePerNight: Number(e.target.value) }))} className="mt-1 w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </label>
              <label className="text-xs font-semibold text-[#6B705C]">Capacidade
                <input required min="1" type="number" value={form.capacity} onChange={e => setForm(prev => ({ ...prev, capacity: Number(e.target.value) }))} className="mt-1 w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </label>
              <label className="text-xs font-semibold text-[#6B705C]">Observações
                <input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#6B705C]">Comodidades</span>
              <div className="flex flex-wrap gap-2">
                {form.amenities.map(item => (
                  <button key={item} type="button" onClick={() => setForm(prev => ({ ...prev, amenities: prev.amenities.filter(value => value !== item) }))} className="px-2.5 py-1 rounded-lg bg-[#F4F1EA] border border-[#E6E3D8] text-xs">{item} ×</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={amenityInput} onChange={e => setAmenityInput(e.target.value)} placeholder="Nova comodidade" className="flex-1 px-3 py-2 text-sm border border-[#E6E3D8] rounded-xl outline-none focus:ring-2 focus:ring-[#588157]" />
                <button type="button" onClick={addAmenity} className="px-3 py-2 rounded-xl border border-[#E6E3D8] text-xs font-bold hover:bg-[#F4F1EA]">Adicionar</button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E3D8]">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-[#E6E3D8] text-xs font-semibold">Cancelar</button>
              <button disabled={submitting} type="submit" className="px-5 py-2 rounded-xl bg-[#2C3327] text-white text-xs font-bold disabled:opacity-50">{submitting ? 'Salvando...' : 'Salvar cadastro'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};