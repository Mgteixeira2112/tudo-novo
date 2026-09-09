import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, BedDouble, RefreshCw, Shirt, WashingMachine } from 'lucide-react';
import { LinenLocation, LinenMovement, LinenPosition, loadLinenCirculation, moveLinenAtomic } from '../services/linenCirculation.ts';

type FormState = {
  itemId: string;
  fromLocation: LinenLocation;
  toLocation: LinenLocation;
  quantity: number;
  fromRoom: string;
  toRoom: string;
  notes: string;
};

const initialForm: FormState = {
  itemId: '',
  fromLocation: 'Rouparia',
  toLocation: 'Quarto',
  quantity: 1,
  fromRoom: '',
  toRoom: '',
  notes: ''
};

const nextDestination = (from: LinenLocation): LinenLocation =>
  from === 'Rouparia' ? 'Quarto' : from === 'Quarto' ? 'Lavanderia' : 'Rouparia';

export const LinenCirculationPanel: React.FC = () => {
  const [positions, setPositions] = useState<LinenPosition[]>([]);
  const [movements, setMovements] = useState<LinenMovement[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await loadLinenCirculation();
      setPositions(data.positions);
      setMovements(data.movements);
      if (!form.itemId && data.positions[0]?.itemId) setForm(current => ({ ...current, itemId: data.positions[0].itemId }));
    } catch (err: any) {
      setMessage({ text: err?.message || 'Erro ao carregar circulação do enxoval.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { itemId: string; itemName: string; unit: string; physicalTotal: number; rouparia: number; quartos: number; lavanderia: number; integrity: number }>();
    positions.forEach(pos => {
      const current = map.get(pos.itemId) || { itemId: pos.itemId, itemName: pos.itemName, unit: pos.unit, physicalTotal: pos.physicalTotal, rouparia: 0, quartos: 0, lavanderia: 0, integrity: 0 };
      current.integrity += pos.quantity;
      if (pos.locationType === 'Rouparia') current.rouparia += pos.quantity;
      if (pos.locationType === 'Quarto') current.quartos += pos.quantity;
      if (pos.locationType === 'Lavanderia') current.lavanderia += pos.quantity;
      map.set(pos.itemId, current);
    });
    return Array.from(map.values());
  }, [positions]);

  const roomPositions = useMemo(() => positions.filter(p => p.locationType === 'Quarto' && p.quantity > 0), [positions]);

  const submit = async () => {
    if (!form.itemId || form.quantity <= 0) return;
    if (form.fromLocation === 'Quarto' && !form.fromRoom) {
      setMessage({ text: 'Informe o quarto de origem.', type: 'error' }); return;
    }
    if (form.toLocation === 'Quarto' && !form.toRoom) {
      setMessage({ text: 'Informe o quarto de destino.', type: 'error' }); return;
    }
    try {
      setSubmitting(true);
      setMessage(null);
      await moveLinenAtomic(form);
      setMessage({ text: 'Enxoval movimentado sem alterar o total físico.', type: 'success' });
      setForm(current => ({ ...current, quantity: 1, notes: '' }));
      await load();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Erro ao movimentar enxoval.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2"><Shirt className="h-5 w-5 text-[#588157]" /><h3 className="font-serif text-lg font-bold text-[#2C3327]">Circulação de Enxoval</h3></div>
            <p className="mt-1 text-xs text-[#6B705C]">Fluxo físico: Rouparia → Quarto → Lavanderia → Rouparia. Transferências não consomem estoque.</p>
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#E6E3D8] px-3 py-2 text-xs font-semibold text-[#2C3327]"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>
        </div>
      </div>

      {message && <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {grouped.map(item => (
          <div key={item.itemId} className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-bold text-[#2C3327]">{item.itemName}</p><p className="mt-1 text-xs text-[#6B705C]">Total físico: <b>{item.physicalTotal} {item.unit}</b></p></div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.integrity === item.physicalTotal ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{item.integrity === item.physicalTotal ? 'Íntegro' : 'Divergência'}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#F4F1EA] p-3"><Shirt className="mx-auto h-4 w-4 text-[#588157]" /><p className="mt-1 text-[10px] uppercase text-[#6B705C]">Rouparia</p><p className="font-bold text-[#2C3327]">{item.rouparia}</p></div>
              <div className="rounded-xl bg-[#F4F1EA] p-3"><BedDouble className="mx-auto h-4 w-4 text-[#588157]" /><p className="mt-1 text-[10px] uppercase text-[#6B705C]">Quartos</p><p className="font-bold text-[#2C3327]">{item.quartos}</p></div>
              <div className="rounded-xl bg-[#F4F1EA] p-3"><WashingMachine className="mx-auto h-4 w-4 text-[#588157]" /><p className="mt-1 text-[10px] uppercase text-[#6B705C]">Lavanderia</p><p className="font-bold text-[#2C3327]">{item.lavanderia}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-[#588157]" /><h4 className="font-bold text-[#2C3327]">Registrar transferência</h4></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })} className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm">
            {grouped.map(item => <option key={item.itemId} value={item.itemId}>{item.itemName}</option>)}
          </select>
          <select value={form.fromLocation} onChange={e => { const from = e.target.value as LinenLocation; setForm({ ...form, fromLocation: from, toLocation: nextDestination(from), fromRoom: '', toRoom: '' }); }} className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm">
            <option value="Rouparia">Rouparia</option><option value="Quarto">Quarto</option><option value="Lavanderia">Lavanderia</option>
          </select>
          <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm" placeholder="Quantidade" />
          {form.fromLocation === 'Quarto' && <select value={form.fromRoom} onChange={e => setForm({ ...form, fromRoom: e.target.value })} className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm"><option value="">Quarto de origem</option>{roomPositions.filter(p => p.itemId === form.itemId).map(p => <option key={p.id} value={p.roomNumber}>{p.roomNumber} — {p.quantity} {p.unit}</option>)}</select>}
          {form.toLocation === 'Quarto' && <input value={form.toRoom} onChange={e => setForm({ ...form, toRoom: e.target.value })} className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm" placeholder="Quarto de destino" />}
          <div className="rounded-xl border border-[#E6E3D8] bg-[#F4F1EA] px-3 py-2 text-sm text-[#2C3327]">Destino: <b>{form.toLocation}</b></div>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm md:col-span-2" placeholder="Observação opcional" />
          <button onClick={submit} disabled={submitting || loading} className="rounded-xl bg-[#2C3327] px-4 py-2 text-sm font-bold text-[#F4F1EA] disabled:opacity-50">{submitting ? 'Movimentando...' : 'Confirmar transferência'}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6E3D8] bg-white shadow-xs">
        <div className="border-b border-[#E6E3D8] p-4"><h4 className="font-bold text-[#2C3327]">Histórico de circulação</h4></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#F4F1EA]"><tr><th className="p-3">Data/Hora</th><th className="p-3">Item</th><th className="p-3">Qtd.</th><th className="p-3">Origem</th><th className="p-3">Destino</th><th className="p-3">Operador</th></tr></thead><tbody className="divide-y divide-[#E6E3D8]">{movements.map(m => <tr key={m.id}><td className="p-3">{new Date(m.movedAt).toLocaleString('pt-BR')}</td><td className="p-3 font-semibold">{m.itemName}</td><td className="p-3">{m.quantity}</td><td className="p-3">{m.fromLocation}{m.fromRoomNumber ? ` ${m.fromRoomNumber}` : ''}</td><td className="p-3">{m.toLocation}{m.toRoomNumber ? ` ${m.toRoomNumber}` : ''}</td><td className="p-3">{m.operator}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
};
