import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PackageCheck, X } from 'lucide-react';
import { InventoryItem, KanbanTask } from '../types.ts';
import { api } from '../services/api.ts';
import { completeGovernanceTaskAtomic } from '../services/governanceTaskCompletion.ts';

interface GovernanceTaskCompletionModalProps {
  task: KanbanTask;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

type ConsumptionChoice = 'yes' | 'no' | null;

export const GovernanceTaskCompletionModal: React.FC<GovernanceTaskCompletionModalProps> = ({
  task,
  onClose,
  onCompleted
}) => {
  const [choice, setChoice] = useState<ConsumptionChoice>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (choice !== 'yes' || items.length > 0 || loading) return;
    let active = true;
    setLoading(true);
    api.getInventoryItems('Governanca_Enxoval')
      .then(result => {
        if (active) setItems(result.filter(item => item.currentStock > 0));
      })
      .catch(err => {
        if (active) setError(err?.message || 'Não foi possível carregar os materiais da Governança.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [choice, items.length, loading]);

  const selectedMaterials = useMemo(() => {
    return items
      .map(item => ({ inventoryItemId: item.id, quantity: Number(quantities[item.id] || 0) }))
      .filter(item => item.quantity > 0);
  }, [items, quantities]);

  const confirmCompletion = async () => {
    if (choice === null) return;
    if (choice === 'yes' && selectedMaterials.length === 0) {
      setError('Informe pelo menos um material utilizado ou selecione “Não”.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await completeGovernanceTaskAtomic(task.id, choice === 'yes' ? selectedMaterials : []);
      await onCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao concluir a tarefa de Governança.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E6E3D8] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E6E3D8] p-5">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#588157]" />
              <h3 className="text-base font-bold text-[#2C3327]">Concluir tarefa de Governança</h3>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">
              {task.title}{task.roomNumber ? ` • Quarto ${task.roomNumber}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="p-1 text-[#8E9280] hover:text-[#2C3327] disabled:opacity-50" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="text-sm font-bold text-[#2C3327]">Houve utilização de produtos ou materiais?</p>
            <p className="mt-1 text-xs text-[#6B705C]">A tarefa só será concluída depois desta confirmação.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setChoice('no'); setError(''); }}
              className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${choice === 'no' ? 'border-[#588157] bg-[#F2F5E8] text-[#2C3327]' : 'border-[#E6E3D8] bg-white text-[#6B705C] hover:bg-[#FDFBF7]'}`}
            >
              Não, concluir sem consumo
            </button>
            <button
              type="button"
              onClick={() => { setChoice('yes'); setError(''); }}
              className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${choice === 'yes' ? 'border-[#588157] bg-[#F2F5E8] text-[#2C3327]' : 'border-[#E6E3D8] bg-white text-[#6B705C] hover:bg-[#FDFBF7]'}`}
            >
              Sim, registrar materiais
            </button>
          </div>

          {choice === 'yes' && (
            <div className="space-y-3 rounded-xl border border-[#E6E3D8] bg-[#FDFBF7] p-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-[#588157]" />
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#6B705C]">Materiais utilizados</p>
              </div>

              {loading ? (
                <p className="py-4 text-center text-xs text-[#8E9280]">Carregando estoque da Governança...</p>
              ) : items.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#8E9280]">Nenhum material com saldo disponível foi encontrado.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {items.map(item => (
                    <div key={item.id} className="grid grid-cols-[1fr_110px] items-center gap-3 rounded-lg border border-[#E6E3D8] bg-white p-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#2C3327]">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#6B705C]">Disponível: {item.currentStock} {item.unit}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={item.currentStock}
                        value={quantities[item.id] || ''}
                        onChange={e => setQuantities(current => ({ ...current, [item.id]: Number(e.target.value || 0) }))}
                        placeholder="Qtd."
                        className="w-full rounded-lg border border-[#E6E3D8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#588157]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#E6E3D8] p-5">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-xs font-semibold text-[#6B705C] hover:text-[#2C3327] disabled:opacity-50">Cancelar</button>
          <button
            type="button"
            onClick={confirmCompletion}
            disabled={submitting || choice === null || (choice === 'yes' && selectedMaterials.length === 0)}
            className="rounded-xl bg-[#2C3327] px-5 py-2.5 text-xs font-bold text-[#FDFBF7] shadow transition hover:bg-[#3A4135] disabled:opacity-40"
          >
            {submitting ? 'Concluindo...' : 'Confirmar conclusão'}
          </button>
        </div>
      </div>
    </div>
  );
};
