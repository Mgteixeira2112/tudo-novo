import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, History, RefreshCw, ShieldAlert } from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import {
  LossDamageEvent,
  LossDamageInventoryItem,
  LossDamageOccurrence,
  LossDamagePosition,
  loadLossDamageData,
  registerLossDamage
} from '../services/lossDamage.ts';

const OCCURRENCES: LossDamageOccurrence[] = ['Perda', 'Rasgo', 'Dano', 'Extravio', 'Descarte'];

export const LossDamagePanel: React.FC = () => {
  const { refreshData } = useHotel();
  const [items, setItems] = useState<LossDamageInventoryItem[]>([]);
  const [positions, setPositions] = useState<LossDamagePosition[]>([]);
  const [events, setEvents] = useState<LossDamageEvent[]>([]);
  const [itemId, setItemId] = useState('');
  const [occurrenceType, setOccurrenceType] = useState<LossDamageOccurrence>('Perda');
  const [quantity, setQuantity] = useState(1);
  const [definitive, setDefinitive] = useState(true);
  const [sourceKey, setSourceKey] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await loadLossDamageData();
      setItems(data.items);
      setPositions(data.positions);
      setEvents(data.events);
      setItemId(current => current && data.items.some(item => item.id === current) ? current : (data.items[0]?.id || ''));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao carregar perdas e avarias.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectedItem = useMemo(() => items.find(item => item.id === itemId), [items, itemId]);
  const isLinen = selectedItem?.category === 'Enxoval & Rouparia';
  const itemPositions = useMemo(() => positions.filter(position => position.itemId === itemId), [positions, itemId]);

  useEffect(() => {
    if (!isLinen) {
      setSourceKey('');
      return;
    }
    setSourceKey(current => current && itemPositions.some(position => position.id === current) ? current : (itemPositions[0]?.id || ''));
  }, [itemId, isLinen, itemPositions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedItem) return;
    if (quantity <= 0) {
      setMessage({ type: 'error', text: 'A quantidade deve ser maior que zero.' });
      return;
    }

    const position = isLinen ? itemPositions.find(entry => entry.id === sourceKey) : undefined;
    if (definitive && isLinen && !position) {
      setMessage({ type: 'error', text: 'Informe a posição física do enxoval.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      await registerLossDamage({
        itemId: selectedItem.id,
        occurrenceType,
        quantity,
        definitive,
        sourceLocation: position?.locationType || selectedItem.sector,
        roomNumber: position?.locationType === 'Quarto' ? position.roomNumber : undefined,
        notes
      });
      setMessage({
        type: 'success',
        text: definitive
          ? `${occurrenceType} definitiva registrada e baixa Perda_Avaria gerada no Kardex.`
          : `${occurrenceType} registrada sem baixa definitiva de estoque.`
      });
      setQuantity(1);
      setNotes('');
      await load();
      await refreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao registrar perda ou avaria.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#9E2A2B]/10 p-2 text-[#9E2A2B]"><ShieldAlert className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-black text-[#2C3327]">Perdas e Avarias</h3>
              <p className="text-xs text-[#6B705C]">Perda, rasgo, dano, extravio e descarte com rastreabilidade no estoque.</p>
            </div>
          </div>
          <button type="button" onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#E6E3D8] px-3 py-2 text-xs font-bold text-[#2C3327]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {message && <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className="text-xs font-bold text-[#2C3327]">Item
            <select value={itemId} onChange={e => setItemId(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm font-normal">
              {items.map(item => <option key={item.id} value={item.id}>{item.name} — {item.currentStock} {item.unit}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-[#2C3327]">Tipo de ocorrência
            <select value={occurrenceType} onChange={e => setOccurrenceType(e.target.value as LossDamageOccurrence)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm font-normal">
              {OCCURRENCES.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className="text-xs font-bold text-[#2C3327]">Quantidade
            <input type="number" min="0.01" step="0.01" value={quantity} onChange={e => setQuantity(Number(e.target.value || 0))} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm font-normal" />
          </label>
          {isLinen && definitive && (
            <label className="text-xs font-bold text-[#2C3327]">Posição física do enxoval
              <select value={sourceKey} onChange={e => setSourceKey(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm font-normal">
                {itemPositions.map(position => (
                  <option key={position.id} value={position.id}>
                    {position.locationType}{position.locationType === 'Quarto' ? ` ${position.roomNumber}` : ''} — {position.quantity} {selectedItem?.unit}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-[#E6E3D8] bg-[#F8F7F2] p-3 text-xs text-[#3D4035]">
          <input type="checkbox" checked={definitive} onChange={e => setDefinitive(e.target.checked)} className="mt-0.5" />
          <span><strong>Perda definitiva</strong><br />Quando marcada, reduz o estoque físico e gera movimento <code>Perda_Avaria</code> no Kardex. Desmarque apenas para registrar uma ocorrência sem baixa definitiva.</span>
        </label>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observação da ocorrência" className="min-h-20 w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm" />

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !selectedItem} className="rounded-xl bg-[#9E2A2B] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">
            {submitting ? 'Registrando...' : 'Registrar perda / avaria'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2"><History className="h-4 w-4 text-[#588157]" /><h4 className="font-black text-[#2C3327]">Histórico recente</h4></div>
        <div className="space-y-2">
          {events.map(event => (
            <div key={event.id} className="grid grid-cols-1 gap-1 rounded-xl border border-[#EFECE3] p-3 text-xs md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-bold text-[#2C3327]">{event.occurrenceType} — {event.itemName}</p>
                <p className="text-[#6B705C]">{event.quantity} {event.unit} • {event.definitive ? 'Baixa definitiva' : 'Sem baixa'}{event.sourceLocation ? ` • ${event.sourceLocation}${event.roomNumber ? ` ${event.roomNumber}` : ''}` : ''}</p>
                {event.notes && <p className="mt-1 italic text-[#8E9280]">{event.notes}</p>}
              </div>
              <div className="text-[10px] text-[#8E9280] md:text-right">{new Date(event.createdAt).toLocaleString('pt-BR')}<br />{event.operator}</div>
            </div>
          ))}
          {!loading && events.length === 0 && <div className="rounded-xl border border-dashed border-[#DADFD1] p-6 text-center text-xs text-[#8E9280]">Nenhuma ocorrência registrada.</div>}
        </div>
      </section>
    </div>
  );
};
