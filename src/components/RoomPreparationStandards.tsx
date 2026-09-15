import React, { useEffect, useMemo, useState } from 'react';
import { PackageCheck, Save, ShieldCheck } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import {
  loadRoomAmenityInventoryItems,
  loadRoomPreparationKits,
  RoomAmenityInventoryItem,
  RoomAmenityQuantityBasis,
  RoomPreparationKit,
  saveRoomPreparationKit
} from '../services/roomPreparationStandards.ts';

export const RoomPreparationStandards: React.FC = () => {
  const { settings, hasPermission } = useHotel();
  const roomTypes = settings?.roomTypes || [];
  const canEdit = hasPermission('manage_inventory');
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(roomTypes[0]?.id || '');
  const [kits, setKits] = useState<RoomPreparationKit[]>([]);
  const [items, setItems] = useState<RoomAmenityInventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantityBases, setQuantityBases] = useState<Record<string, RoomAmenityQuantityBasis>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const [loadedKits, loadedItems] = await Promise.all([
        loadRoomPreparationKits(),
        loadRoomAmenityInventoryItems()
      ]);
      setKits(loadedKits);
      setItems(loadedItems);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Não foi possível carregar o padrão dos quartos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selectedRoomTypeId && roomTypes[0]?.id) setSelectedRoomTypeId(roomTypes[0].id);
  }, [roomTypes, selectedRoomTypeId]);

  const selectedRoomType = roomTypes.find(roomType => roomType.id === selectedRoomTypeId);
  const selectedKit = kits.find(kit => kit.roomTypeId === selectedRoomTypeId);

  useEffect(() => {
    const nextQuantities: Record<string, number> = {};
    const nextBases: Record<string, RoomAmenityQuantityBasis> = {};
    selectedKit?.items.forEach(item => {
      nextQuantities[item.inventoryItemId] = item.quantity;
      nextBases[item.inventoryItemId] = item.quantityBasis;
    });
    setQuantities(nextQuantities);
    setQuantityBases(nextBases);
    setNotes(selectedKit?.notes || '');
    setMessage(null);
  }, [selectedKit?.id, selectedRoomTypeId]);

  const selectedItems = useMemo(
    () => items
      .map(item => ({
        inventoryItemId: item.id,
        quantity: Number(quantities[item.id] || 0),
        quantityBasis: quantityBases[item.id] || 'per_guest' as RoomAmenityQuantityBasis
      }))
      .filter(item => item.quantity > 0),
    [items, quantities, quantityBases]
  );

  const save = async () => {
    if (!selectedRoomTypeId || !canEdit) return;
    try {
      setSaving(true);
      setMessage(null);
      await saveRoomPreparationKit({ roomTypeId: selectedRoomTypeId, notes, items: selectedItems });
      await load();
      setMessage({ type: 'success', text: `Padrão de ${selectedRoomType?.name || 'quarto'} salvo. Nenhuma baixa de estoque foi realizada.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Erro ao salvar o padrão de preparação.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#DADFD1] bg-[#F8FAF2] p-5">
        <div className="flex items-start gap-3">
          <PackageCheck className="mt-0.5 h-5 w-5 text-[#588157]" />
          <div>
            <h3 className="text-base font-black text-[#2C3327]">Padrão de Preparação do Quarto</h3>
            <p className="mt-1 text-xs leading-5 text-[#6B705C]">
              Defina os amenities consumíveis esperados em cada categoria e escolha se a quantidade é por hóspede ou fixa por quarto. Esta tela configura o padrão; a baixa real continua acontecendo somente na conclusão da tarefa de Governança.
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-[#8E9280]">Categoria de quarto</p>
          <div className="space-y-2">
            {roomTypes.map(roomType => {
              const configured = kits.some(kit => kit.roomTypeId === roomType.id && kit.items.length > 0);
              const selected = roomType.id === selectedRoomTypeId;
              return (
                <button
                  key={roomType.id}
                  type="button"
                  onClick={() => setSelectedRoomTypeId(roomType.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected ? 'border-[#588157] bg-[#F2F5E8]' : 'border-[#E6E3D8] bg-white hover:bg-[#F8F7F2]'}`}
                >
                  <span className="block text-xs font-black text-[#2C3327]">{roomType.name}</span>
                  <span className={`mt-1 block text-[10px] font-semibold ${configured ? 'text-emerald-700' : 'text-[#8E9280]'}`}>
                    {configured ? 'Padrão configurado' : 'Ainda sem padrão'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-3 border-b border-[#EFECE3] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-base font-black text-[#2C3327]">{selectedRoomType?.name || 'Selecione uma categoria'}</h4>
              <p className="mt-1 text-xs text-[#6B705C]">Informe a quantidade-base e como ela deve ser calculada para cada amenity.</p>
            </div>
            {!canEdit && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E3D8] bg-[#F8F7F2] px-2.5 py-1 text-[10px] font-bold text-[#6B705C]">
                <ShieldCheck className="h-3.5 w-3.5" /> Somente leitura
              </span>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-[#8E9280]">Carregando padrões e estoque...</p>
          ) : items.length === 0 ? (
            <div className="my-5 rounded-xl border border-dashed border-[#DADFD1] bg-[#F8F7F2] p-6 text-center text-xs text-[#6B705C]">
              Nenhum item classificado como “Amenities de Quarto” foi encontrado no estoque da Governança.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {items.map(item => {
                const basis = quantityBases[item.id] || 'per_guest';
                return (
                  <div key={item.id} className="grid gap-3 rounded-xl border border-[#E6E3D8] bg-[#FDFBF7] p-4 lg:grid-cols-[1fr_130px_180px] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#2C3327]">{item.name}</p>
                      <p className="mt-1 text-[10px] text-[#6B705C]">SKU {item.sku} • Estoque atual: {item.currentStock} {item.unit}</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Quantidade</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!canEdit}
                        value={quantities[item.id] || ''}
                        onChange={event => setQuantities(current => ({ ...current, [item.id]: Number(event.target.value || 0) }))}
                        placeholder="0"
                        className="w-full rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#588157] disabled:bg-[#F4F1EA]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#8E9280]">Cálculo</label>
                      <select
                        disabled={!canEdit}
                        value={basis}
                        onChange={event => setQuantityBases(current => ({ ...current, [item.id]: event.target.value as RoomAmenityQuantityBasis }))}
                        className="w-full rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#588157] disabled:bg-[#F4F1EA]"
                      >
                        <option value="per_guest">Por hóspede</option>
                        <option value="fixed_per_room">Fixo por quarto</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-[#DADFD1] bg-[#F8FAF2] px-4 py-3 text-[11px] leading-5 text-[#56604E]">
            Exemplo: quantidade 1 “Por hóspede” significa 1 unidade para cada pessoa da reserva. Quantidade 1 “Fixo por quarto” significa 1 unidade para a preparação inteira, independentemente da ocupação.
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-xs font-semibold text-[#6B705C]">Observações do padrão</label>
            <textarea
              rows={3}
              disabled={!canEdit}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Ex.: conferir apresentação das cortesias antes de liberar o quarto."
              className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#588157] disabled:bg-[#F4F1EA]"
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#FAEDCD] bg-[#FFF8E8] px-4 py-3 text-[11px] leading-5 text-[#7A5A25]">
            Toalhas, tapetes de banheiro, lençóis, fronhas e demais peças reutilizáveis não entram aqui. Eles permanecem no fluxo de Enxoval/Lavanderia e não são baixados como consumo.
          </div>

          {canEdit && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !selectedRoomTypeId}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : `Salvar padrão (${selectedItems.length} itens)`}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
