import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Shirt,
  WashingMachine
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import {
  LaundryBatch,
  LaundryRoomPosition,
  advanceLaundryBatch,
  createLaundryBatch,
  loadLaundryKanban,
  returnLaundryBatch
} from '../services/laundryKanban.ts';
import { TaskStatus } from '../types.ts';

const COLUMNS: Array<{
  status: TaskStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { status: 'A_Fazer', label: 'Aguardando lavagem', description: 'Lotes recebidos da Governança', icon: Clock3 },
  { status: 'Em_Andamento', label: 'Em lavagem', description: 'Processamento em andamento', icon: WashingMachine },
  { status: 'Concluido', label: 'Pronto', description: 'Aguardando ou já retornado à Rouparia', icon: CheckCircle2 }
];

export const LaundryKanban: React.FC = () => {
  const { refreshData } = useHotel();
  const [batches, setBatches] = useState<LaundryBatch[]>([]);
  const [roomPositions, setRoomPositions] = useState<LaundryRoomPosition[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await loadLaundryKanban();
      setBatches(data.batches);
      setRoomPositions(data.roomPositions);
      const rooms = Array.from(new Set(data.roomPositions.map(position => position.roomNumber))).sort();
      setSelectedRoom(current => current && rooms.includes(current) ? current : (rooms[0] || ''));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao carregar o Kanban da Lavanderia.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rooms = useMemo(
    () => Array.from(new Set(roomPositions.map(position => position.roomNumber))).sort(),
    [roomPositions]
  );

  const availableItems = useMemo(
    () => roomPositions.filter(position => position.roomNumber === selectedRoom),
    [roomPositions, selectedRoom]
  );

  useEffect(() => {
    setQuantities({});
  }, [selectedRoom]);

  const selectedItems = useMemo(
    () => availableItems
      .map(item => ({ inventoryItemId: item.itemId, quantity: Number(quantities[item.itemId] || 0) }))
      .filter(item => item.quantity > 0),
    [availableItems, quantities]
  );

  const handleCreateBatch = async () => {
    if (!selectedRoom) {
      setMessage({ type: 'error', text: 'Nenhum quarto possui enxoval disponível para recolhimento.' });
      return;
    }
    if (selectedItems.length === 0) {
      setMessage({ type: 'error', text: 'Informe pelo menos um item e quantidade para o lote.' });
      return;
    }

    try {
      setCreating(true);
      setMessage(null);
      await createLaundryBatch({ roomNumber: selectedRoom, items: selectedItems, notes });
      setQuantities({});
      setNotes('');
      setMessage({ type: 'success', text: `Lote do Quarto ${selectedRoom} criado e enviado para Aguardando lavagem.` });
      await load();
      await refreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao criar lote de lavanderia.' });
    } finally {
      setCreating(false);
    }
  };

  const handleAdvance = async (batch: LaundryBatch) => {
    try {
      setBusyId(batch.id);
      setMessage(null);
      await advanceLaundryBatch(batch.id);
      await load();
      await refreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao avançar o lote.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReturn = async (batch: LaundryBatch) => {
    if (!confirm(`Retornar o lote do Quarto ${batch.roomNumber} à Rouparia?`)) return;
    try {
      setBusyId(batch.id);
      setMessage(null);
      await returnLaundryBatch(batch.id);
      setMessage({ type: 'success', text: 'Lote retornado à Rouparia sem alterar o total físico do enxoval.' });
      await load();
      await refreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao retornar lote à Rouparia.' });
    } finally {
      setBusyId(null);
    }
  };

  const renderBatch = (batch: LaundryBatch) => {
    const busy = busyId === batch.id;
    return (
      <article key={batch.id} className="rounded-xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-[#588157]" />
              <h4 className="text-sm font-black text-[#2C3327]">{batch.title}</h4>
            </div>
            <p className="mt-1 text-[10px] font-mono text-[#8E9280]">{batch.id}</p>
          </div>
          {batch.returnedAt && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Retornado</span>
          )}
        </div>

        <div className="mt-3 space-y-1 rounded-lg bg-[#F8F7F2] p-3">
          {batch.items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate text-[#3D4035]">{item.itemName}</span>
              <span className="shrink-0 font-bold text-[#2C3327]">{item.quantity} {item.unit}</span>
            </div>
          ))}
        </div>

        {batch.notes && <p className="mt-2 text-[10px] italic text-[#6B705C]">{batch.notes}</p>}

        <div className="mt-3 flex items-center justify-between border-t border-[#EFECE3] pt-3">
          <span className="text-[10px] text-[#8E9280]">
            {new Date(batch.createdAt).toLocaleString('pt-BR')}
          </span>

          {batch.status === 'A_Fazer' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAdvance(batch)}
              className="flex items-center gap-1 rounded-lg border border-[#CCD5AE] bg-[#F2F5E8] px-2.5 py-1.5 text-[10px] font-bold text-[#2C3327] disabled:opacity-50"
            >
              Iniciar lavagem <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {batch.status === 'Em_Andamento' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAdvance(batch)}
              className="flex items-center gap-1 rounded-lg bg-[#2C3327] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
            >
              Marcar pronto <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {batch.status === 'Concluido' && !batch.returnedAt && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleReturn(batch)}
              className="flex items-center gap-1 rounded-lg border border-[#D4A373]/50 bg-[#FAEDCD]/60 px-2.5 py-1.5 text-[10px] font-bold text-[#7A4B1F] disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" /> Retornar à Rouparia
            </button>
          )}

          {batch.status === 'Concluido' && batch.returnedAt && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <PackageCheck className="h-3.5 w-3.5" /> Ciclo concluído
            </span>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#DADFD1] bg-[#F8FAF2] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-[#588157]" />
              <h3 className="text-lg font-black text-[#2C3327]">Kanban da Lavanderia</h3>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">Cada card representa um lote de enxoval recolhido de um quarto.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#E6E3D8] bg-white px-3 py-2 text-xs font-bold text-[#2C3327]">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2">
          <Shirt className="h-5 w-5 text-[#588157]" />
          <div>
            <h4 className="font-black text-[#2C3327]">Novo lote informado pela Governança</h4>
            <p className="text-[10px] text-[#8E9280]">Somente peças que estão fisicamente no quarto podem entrar no lote.</p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DADFD1] bg-[#F8F7F2] p-6 text-center text-xs text-[#8E9280]">
            Nenhum quarto possui enxoval aguardando recolhimento.
          </div>
        ) : (
          <div className="space-y-4">
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="w-full rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm sm:w-64">
              {rooms.map(room => <option key={room} value={room}>Quarto {room}</option>)}
            </select>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {availableItems.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_100px] items-center gap-3 rounded-xl border border-[#E6E3D8] bg-[#F8F7F2] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#2C3327]">{item.itemName}</p>
                    <p className="mt-0.5 text-[10px] text-[#6B705C]">No quarto: {item.quantity} {item.unit}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    step="0.01"
                    value={quantities[item.itemId] || ''}
                    onChange={e => setQuantities(current => ({ ...current, [item.itemId]: Number(e.target.value || 0) }))}
                    placeholder="Qtd."
                    className="rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observação do lote (opcional)" className="rounded-xl border border-[#E6E3D8] px-3 py-2 text-sm" />
              <button type="button" disabled={creating || selectedItems.length === 0} onClick={handleCreateBatch} className="rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">
                {creating ? 'Criando lote...' : 'Criar lote de lavanderia'}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {COLUMNS.map(column => {
          const Icon = column.icon;
          const columnBatches = batches.filter(batch => batch.status === column.status);
          return (
            <section key={column.status} className="rounded-2xl border border-[#E6E3D8] bg-[#F8F7F2] p-3">
              <header className="mb-3 flex items-start justify-between gap-2 px-1 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#588157]" />
                    <h4 className="text-xs font-black uppercase tracking-wide text-[#2C3327]">{column.label}</h4>
                  </div>
                  <p className="mt-1 text-[10px] text-[#8A8F7D]">{column.description}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#3A5A40]">{columnBatches.length}</span>
              </header>
              <div className="space-y-3">
                {columnBatches.map(renderBatch)}
                {columnBatches.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#DADFD1] bg-white/60 px-3 py-8 text-center text-[10px] text-[#8E9280]">Nenhum lote nesta etapa</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
