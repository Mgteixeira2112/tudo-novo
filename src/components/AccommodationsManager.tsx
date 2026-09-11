import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  Building2,
  Image as ImageIcon,
  Images,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { RoomTypeConfig } from '../types.ts';
import { uploadPublicSiteGalleryImage } from '../services/publicSiteMedia.ts';
import { RoomsRegistryManager } from './RoomsRegistryManager.tsx';

type BedKind = 'single' | 'double' | 'queen' | 'king' | 'bunk' | 'sofa_bed' | 'extra_bed' | 'crib';

type BedConfig = {
  id: string;
  type: BedKind;
  quantity: number;
  adultsPerBed: number;
  childrenPerBed: number;
  optional?: boolean;
};

type EditableRoomType = RoomTypeConfig & {
  capacityInfants?: number;
  maxOccupancy?: number;
  beds?: BedConfig[];
  galleryImages?: string[];
};

const BED_LABELS: Record<BedKind, string> = {
  single: 'Solteiro',
  double: 'Casal',
  queen: 'Queen',
  king: 'King',
  bunk: 'Beliche',
  sofa_bed: 'Sofá-cama',
  extra_bed: 'Cama extra',
  crib: 'Berço'
};

const defaultBed = (): BedConfig => ({
  id: `bed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'queen',
  quantity: 1,
  adultsPerBed: 2,
  childrenPerBed: 2,
  optional: false
});

const normalizeRoomType = (roomType: RoomTypeConfig): EditableRoomType => {
  const current = roomType as EditableRoomType;
  const gallery = Array.isArray(current.galleryImages) ? [...current.galleryImages] : [];
  if (roomType.imageUrl && !gallery.includes(roomType.imageUrl)) gallery.unshift(roomType.imageUrl);
  return {
    ...roomType,
    capacityInfants: current.capacityInfants ?? 0,
    maxOccupancy: current.maxOccupancy ?? Math.max(1, roomType.capacityAdults + roomType.capacityChildren),
    beds: Array.isArray(current.beds) ? current.beds.map(bed => ({ ...bed })) : [],
    galleryImages: gallery
  };
};

export const AccommodationsManager: React.FC = () => {
  const { rooms, settings, updateSettings, refreshData, hasPermission } = useHotel();
  const canManageCategories = hasPermission('manage_room_rates');
  const canManageRooms = hasPermission('manage_room_registry');
  const [activeTab, setActiveTab] = useState<'categories' | 'rooms'>(canManageCategories ? 'categories' : 'rooms');
  const [roomTypes, setRoomTypes] = useState<EditableRoomType[]>((settings?.roomTypes || []).map(normalizeRoomType));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableRoomType | null>(null);
  const [amenitiesText, setAmenitiesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editingId) setRoomTypes((settings?.roomTypes || []).map(normalizeRoomType));
  }, [settings?.roomTypes, editingId]);

  const roomCountByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of rooms) counts.set(room.typeId, (counts.get(room.typeId) || 0) + 1);
    return counts;
  }, [rooms]);

  const openEditor = (roomType: EditableRoomType) => {
    const normalized = normalizeRoomType(roomType);
    setEditingId(roomType.id);
    setDraft(normalized);
    setAmenitiesText((normalized.amenities || []).join(', '));
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(null);
    setAmenitiesText('');
  };

  const saveAll = async (nextRoomTypes: EditableRoomType[] = roomTypes) => {
    try {
      setSaving(true);
      await updateSettings({ roomTypes: nextRoomTypes });
      await refreshData();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error: any) {
      alert(error?.message || 'Erro ao salvar acomodações.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      alert('Informe o nome da categoria.');
      return;
    }
    if (draft.capacityAdults < 0 || draft.capacityChildren < 0 || (draft.capacityInfants || 0) < 0) {
      alert('As capacidades não podem ser negativas.');
      return;
    }

    const amenities = amenitiesText
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);

    const totalPeople = draft.capacityAdults + draft.capacityChildren + (draft.capacityInfants || 0);
    const normalizedDraft: EditableRoomType = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      amenities,
      maxOccupancy: Math.max(1, draft.maxOccupancy || totalPeople || 1),
      imageUrl: draft.imageUrl || draft.galleryImages?.[0],
      galleryImages: draft.galleryImages || []
    };

    const nextRoomTypes = roomTypes.map(item => item.id === normalizedDraft.id ? normalizedDraft : item);
    setRoomTypes(nextRoomTypes);
    await saveAll(nextRoomTypes);
    closeEditor();
  };

  const updateBed = (bedId: string, updates: Partial<BedConfig>) => {
    setDraft(current => current ? {
      ...current,
      beds: (current.beds || []).map(bed => bed.id === bedId ? { ...bed, ...updates } : bed)
    } : current);
  };

  const addBed = () => {
    setDraft(current => current ? { ...current, beds: [...(current.beds || []), defaultBed()] } : current);
  };

  const removeBed = (bedId: string) => {
    setDraft(current => current ? { ...current, beds: (current.beds || []).filter(bed => bed.id !== bedId) } : current);
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length || !draft) return;
    const currentGallery = draft.galleryImages || [];
    if (currentGallery.length + files.length > 12) {
      alert('Cada acomodação pode ter no máximo 12 fotos.');
      return;
    }

    try {
      setUploading(true);
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadPublicSiteGalleryImage(file, settings?.id || 'hotel_1'));
      }
      setDraft(current => {
        if (!current) return current;
        const galleryImages = [...(current.galleryImages || []), ...uploaded];
        return {
          ...current,
          galleryImages,
          imageUrl: current.imageUrl || galleryImages[0]
        };
      });
    } catch (error: any) {
      alert(error?.message || 'Erro ao enviar imagem da acomodação.');
    } finally {
      setUploading(false);
    }
  };

  const setCover = (url: string) => {
    setDraft(current => current ? { ...current, imageUrl: url } : current);
  };

  const removeImage = (url: string) => {
    setDraft(current => {
      if (!current) return current;
      const galleryImages = (current.galleryImages || []).filter(item => item !== url);
      return {
        ...current,
        galleryImages,
        imageUrl: current.imageUrl === url ? galleryImages[0] : current.imageUrl
      };
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setDraft(current => {
      if (!current) return current;
      const galleryImages = [...(current.galleryImages || [])];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= galleryImages.length) return current;
      [galleryImages[index], galleryImages[nextIndex]] = [galleryImages[nextIndex], galleryImages[index]];
      return { ...current, galleryImages };
    });
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
              <button type="button" onClick={() => setActiveTab('categories')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${activeTab === 'categories' ? 'bg-[#2C3327] text-white shadow-sm' : 'text-[#6B705C] hover:bg-white'}`}>
                Categorias
              </button>
            )}
            {canManageRooms && (
              <button type="button" onClick={() => setActiveTab('rooms')} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${activeTab === 'rooms' ? 'bg-[#2C3327] text-white shadow-sm' : 'text-[#6B705C] hover:bg-white'}`}>
                Quartos
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'categories' && canManageCategories && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] px-4 py-3 text-xs text-[#6B705C]">
            As categorias são a base comercial do motor de reservas. Aqui ficam nome, descrição, tarifa, ocupação, configuração de camas e fotos. Os quartos físicos continuam vinculados pelo mesmo ID da categoria.
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roomTypes.map(roomType => (
              <article key={roomType.id} className="overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="h-44 bg-[#F4F1EA] sm:h-full">
                    {roomType.imageUrl ? (
                      <img src={roomType.imageUrl} alt={roomType.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center text-[#8E9280]"><ImageIcon className="h-8 w-8" /></div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-[#2C3327]">{roomType.name}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#6B705C] line-clamp-2">{roomType.description}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-[#F4F1EA] px-2 py-1 text-[10px] font-bold text-[#6B705C]">{roomCountByType.get(roomType.id) || 0} quartos</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(roomType.amenities || []).slice(0, 5).map(item => <span key={item} className="rounded-md border border-[#E6E3D8] bg-[#FDFBF7] px-2 py-0.5 text-[10px] text-[#6B705C]">{item}</span>)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F4F1EA] p-3 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Ocupação</span>
                        <span className="mt-1 block font-black text-[#2C3327]">{roomType.capacityAdults}A + {roomType.capacityChildren}C{(roomType.capacityInfants || 0) > 0 ? ` + ${roomType.capacityInfants}B` : ''}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Diária base</span>
                        <span className="mt-1 block font-black text-[#2C3327]">{settings?.currency || 'R$'} {Number(roomType.basePrice || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Camas</span>
                        <span className="mt-1 block font-black text-[#2C3327]">{(roomType.beds || []).reduce((sum, bed) => sum + Number(bed.quantity || 0), 0) || 'Não definido'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Fotos</span>
                        <span className="mt-1 block font-black text-[#2C3327]">{roomType.galleryImages?.length || (roomType.imageUrl ? 1 : 0)}</span>
                      </div>
                    </div>

                    <button type="button" onClick={() => openEditor(roomType)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8D4C7] px-4 py-2.5 text-xs font-bold text-[#2C3327] transition hover:bg-[#F4F1EA]">
                      <Pencil className="h-4 w-4" /> Editar categoria
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {saved && <div className="rounded-xl border border-[#CCD5AE] bg-[#F2F5E8] px-4 py-3 text-xs font-bold text-[#588157]">Acomodações salvas no Supabase.</div>}
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

      {draft && editingId && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto my-3 w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E6E3D8] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#E6E3D8] bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#588157]">Categoria comercial</p>
                <h3 className="text-lg font-black text-[#2C3327]">{draft.name || 'Acomodação'}</h3>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-xl p-2 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar editor"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-7 p-5 sm:p-6">
              <section className="space-y-4">
                <div>
                  <h4 className="font-black text-[#2C3327]">Informações comerciais</h4>
                  <p className="text-xs text-[#6B705C]">Esses dados aparecem no motor de reservas.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="text-xs font-bold text-[#6B705C]">Nome da categoria
                    <input value={draft.name} onChange={event => setDraft(current => current ? { ...current, name: event.target.value } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]" />
                  </label>
                  <label className="text-xs font-bold text-[#6B705C]">Diária base ({settings?.currency || 'R$'})
                    <input type="number" min="0" step="0.01" value={draft.basePrice} onChange={event => setDraft(current => current ? { ...current, basePrice: Number(event.target.value) } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]" />
                  </label>
                </div>
                <label className="block text-xs font-bold text-[#6B705C]">Descrição
                  <textarea rows={3} value={draft.description} onChange={event => setDraft(current => current ? { ...current, description: event.target.value } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]" />
                </label>
                <label className="block text-xs font-bold text-[#6B705C]">Comodidades
                  <textarea rows={2} value={amenitiesText} onChange={event => setAmenitiesText(event.target.value)} placeholder="Wi-Fi, Ar condicionado, Frigobar..." className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm text-[#2C3327] outline-none focus:ring-2 focus:ring-[#588157]" />
                  <span className="mt-1 block text-[10px] font-medium text-[#8E9280]">Separe as comodidades por vírgula.</span>
                </label>
              </section>

              <section className="space-y-4 border-t border-[#E6E3D8] pt-6">
                <div>
                  <h4 className="font-black text-[#2C3327]">Capacidade e ocupação</h4>
                  <p className="text-xs text-[#6B705C]">O motor usará esses limites antes de validar a configuração de camas.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <label className="text-xs font-bold text-[#6B705C]">Máx. adultos
                    <input type="number" min="0" value={draft.capacityAdults} onChange={event => setDraft(current => current ? { ...current, capacityAdults: Number(event.target.value) } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-[#6B705C]">Máx. crianças
                    <input type="number" min="0" value={draft.capacityChildren} onChange={event => setDraft(current => current ? { ...current, capacityChildren: Number(event.target.value) } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-[#6B705C]">Máx. bebês
                    <input type="number" min="0" value={draft.capacityInfants || 0} onChange={event => setDraft(current => current ? { ...current, capacityInfants: Number(event.target.value) } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-[#6B705C]">Ocupação máx. comercial
                    <input type="number" min="1" value={draft.maxOccupancy || 1} onChange={event => setDraft(current => current ? { ...current, maxOccupancy: Number(event.target.value) } : current)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm" />
                  </label>
                </div>
              </section>

              <section className="space-y-4 border-t border-[#E6E3D8] pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-black text-[#2C3327]">Configuração de camas</h4>
                    <p className="text-xs text-[#6B705C]">Defina como cada cama pode receber adultos e crianças.</p>
                  </div>
                  <button type="button" onClick={addBed} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8D4C7] px-3 py-2 text-xs font-bold hover:bg-[#F4F1EA]"><Plus className="h-4 w-4" />Adicionar cama</button>
                </div>

                {(draft.beds || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D8D4C7] bg-[#FDFBF7] p-5 text-center text-xs text-[#6B705C]">Nenhuma configuração de cama cadastrada ainda.</div>
                ) : (
                  <div className="space-y-3">
                    {(draft.beds || []).map(bed => (
                      <div key={bed.id} className="grid grid-cols-2 gap-3 rounded-2xl border border-[#E6E3D8] bg-[#FDFBF7] p-4 md:grid-cols-[1.4fr_.6fr_.7fr_.7fr_auto_auto] md:items-end">
                        <label className="text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Tipo
                          <select value={bed.type} onChange={event => updateBed(bed.id, { type: event.target.value as BedKind })} className="mt-1 w-full rounded-lg border border-[#E6E3D8] bg-white px-2 py-2 text-xs text-[#2C3327]">
                            {Object.entries(BED_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Qtd.
                          <input type="number" min="1" value={bed.quantity} onChange={event => updateBed(bed.id, { quantity: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[#E6E3D8] bg-white px-2 py-2 text-xs" />
                        </label>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Adultos/cama
                          <input type="number" min="0" value={bed.adultsPerBed} onChange={event => updateBed(bed.id, { adultsPerBed: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[#E6E3D8] bg-white px-2 py-2 text-xs" />
                        </label>
                        <label className="text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Crianças/cama
                          <input type="number" min="0" value={bed.childrenPerBed} onChange={event => updateBed(bed.id, { childrenPerBed: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-[#E6E3D8] bg-white px-2 py-2 text-xs" />
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-xs font-bold text-[#6B705C]">
                          <input type="checkbox" checked={Boolean(bed.optional)} onChange={event => updateBed(bed.id, { optional: event.target.checked })} /> Opcional
                        </label>
                        <button type="button" onClick={() => removeBed(bed.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Remover cama"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4 border-t border-[#E6E3D8] pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 font-black text-[#2C3327]"><Images className="h-4 w-4 text-[#588157]" />Galeria da acomodação</h4>
                    <p className="text-xs text-[#6B705C]">Até 12 fotos. A foto marcada como capa continua alimentando o card atual do motor de reservas.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3A4135]">
                    <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Adicionar fotos'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={event => { void uploadImages(event.target.files); event.currentTarget.value = ''; }} className="hidden" />
                  </label>
                </div>

                {(draft.galleryImages || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D8D4C7] bg-[#FDFBF7] p-6 text-center text-xs text-[#6B705C]">Nenhuma foto cadastrada para esta acomodação.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {(draft.galleryImages || []).map((url, index) => (
                      <div key={`${url}-${index}`} className={`overflow-hidden rounded-2xl border bg-white ${draft.imageUrl === url ? 'border-[#588157] ring-2 ring-[#588157]/20' : 'border-[#E6E3D8]'}`}>
                        <div className="relative h-32 bg-[#F4F1EA]">
                          <img src={url} alt={`${draft.name} ${index + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          {draft.imageUrl === url && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#2C3327]/90 px-2 py-1 text-[9px] font-black text-white"><Star className="h-3 w-3" />CAPA</span>}
                        </div>
                        <div className="grid grid-cols-4 gap-1 p-2">
                          <button type="button" onClick={() => setCover(url)} className="rounded-lg p-2 text-[#588157] hover:bg-[#F2F5E8]" title="Definir como capa"><Star className="mx-auto h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded-lg p-2 text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-30" title="Mover para esquerda"><ArrowUp className="mx-auto h-3.5 w-3.5 -rotate-90" /></button>
                          <button type="button" onClick={() => moveImage(index, 1)} disabled={index === (draft.galleryImages?.length || 0) - 1} className="rounded-lg p-2 text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-30" title="Mover para direita"><ArrowDown className="mx-auto h-3.5 w-3.5 -rotate-90" /></button>
                          <button type="button" onClick={() => removeImage(url)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Remover da galeria"><Trash2 className="mx-auto h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E6E3D8] bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={closeEditor} disabled={saving || uploading} className="rounded-xl border border-[#E6E3D8] px-5 py-2.5 text-xs font-bold text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void saveDraft()} disabled={saving || uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3A4135] disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar categoria'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
