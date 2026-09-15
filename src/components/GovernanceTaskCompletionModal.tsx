import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PackageCheck, Sparkles, X } from 'lucide-react';
import { InventoryItem, KanbanTask } from '../types.ts';
import { api } from '../services/api.ts';
import { completeGovernanceTaskAtomic } from '../services/governanceTaskCompletion.ts';
import {
  GovernanceAmenitySuggestion,
  loadGovernanceAmenitySuggestion
} from '../services/governancePreparationSuggestion.ts';

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
  const [suggestion, setSuggestion] = useState<GovernanceAmenitySuggestion | null>(null);
  const [loadedMaterials, setLoadedMaterials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (choice !== 'yes' || loadedMaterials) return;
    let active = true;
    setLoading(true);
    Promise.all([
      api.getInventoryItems('Governanca_Enxoval'),
      task.roomNumber ? loadGovernanceAmenitySuggestion(task.roomNumber) : Promise.resolve(null)
    ])
      .then(([result, loadedSuggestion]) => {
        if (!active) return;
        const consumables = result
          .filter(item => item.currentStock > 0 && item.category !== 'Enxoval & Rouparia')
          .sort((a, b) => {
            const amenityOrder = Number(b.category === 'Amenities de Quarto') - Number(a.category === 'Amenities de Quarto');
            return amenityOrder || a.name.localeCompare(b.name, 'pt-BR');
          });
        setItems(consumables);
        setSuggestion(loadedSuggestion);
        if (loadedSuggestion) {
          const suggested: Record<string, number> = {};
          loadedSuggestion.items.forEach(item => {
            if (item.suggestedQuantity && item.suggestedQuantity > 0) {
              suggested[item.inventoryItemId] = item.suggestedQuantity;
            }
          });
          setQuantities(suggested);
        }
        setLoadedMaterials(true);
      })
      .catch(err => {
        if (active) setError(err?.message || 'Não foi possível carregar os materiais da Governança.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [choice, loadedMaterials, task.roomNumber]);

  const selectedMaterials = useMemo(() => {
    return items
      .map(item => ({ inventoryItemId: item.id, quantity: Number(quantities[item.id] || 0) }))
      .filter(item => item.quantity > 0);
  }, [items, quantities]);

  const suggestedByItem = useMemo(() => {
    return new Map((suggestion?.items || []).map(item => [item.inventoryItemId, item]));
  }, [suggestion]);

  const shortages = useMemo(() => {
    return items.filter(item => Number(quantities[item.id] || 0) > Number(item.currentStock || 0));
  }, [items, quantities]);

  const confirmCompletion = async () => {
    if (choice === null) return;
    if (choice === 'yes' && selectedMaterials.length === 0) {
      setError('Informe pelo menos um material utilizado ou selecione “Não”.');
      return;
    }
    if (choice === 'yes' && shortages.length > 0) {
      setError(`Estoque insuficiente para: ${shortages.map(item => item.name).join(', ')}.`);
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
              <div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-[#588157]" />
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#6B705C]">Amenities e materiais consumíveis</p>
                </div>
                <p className="mt-1 text-[11px] text-[#8E9280]">O padrão do quarto é sugerido automaticamente quando existe informação suficiente. Você continua podendo ajustar os materiais realmente utilizados antes de concluir.</p>
              </div>

              {!loading && suggestion && suggestion.items.length > 0 && (
                <div className="rounded-xl border border-[#DADFD1] bg-[#F2F5E8] px-4 py-3 text-[11px] leading-5 text-[#4F5B43]">
                  <div className="flex items-center gap-2 font-black text-[#2C3327]"><Sparkles className="h-3.5 w-3.5 text-[#588157]" /> Padrão de preparação identificado</div>
                  {suggestion.reservationId ? (
                    <p className="mt-1">Próxima hospedagem: <strong>{suggestion.guestName}</strong>{suggestion.reservationCode ? ` • ${suggestion.reservationCode}` : ''} • {suggestion.guestCount} hóspede(s) ({suggestion.adults} adulto(s) + {suggestion.children} criança(s)).</p>
                  ) : suggestion.hasPerGuestItemsWithoutReservation ? (
                    <p className="mt-1">Ainda não existe próxima reserva vinculada a este quarto. Itens “por hóspede” não foram preenchidos automaticamente; itens fixos por quarto continuam disponíveis.</p>
                  ) : (
                    <p className="mt-1">Padrão fixo do quarto carregado.</p>
                  )}
                </div>
              )}

              {loading ? (
                <p className="py-4 text-center text-xs text-[#8E9280]">Carregando estoque e padrão do quarto...</p>
              ) : items.length === 0 ? (
                <p className="py-4 text-center text-xs text-[#8E9280]">Nenhum amenity ou material consumível com saldo disponível foi encontrado.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {items.map(item => {
                    const recommended = suggestedByItem.get(item.id);
                    const entered = Number(quantities[item.id] || 0);
                    const shortage = entered > Number(item.currentStock || 0);
                    return (
                      <div key={item.id} className={`grid grid-cols-[1fr_110px] items-center gap-3 rounded-lg border bg-white p-3 ${shortage ? 'border-red-300' : 'border-[#E6E3D8]'}`}>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#2C3327]">{item.name}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#588157]">{item.category}</p>
                          <p className="mt-0.5 text-[11px] text-[#6B705C]">Disponível: {item.currentStock} {item.unit}</p>
                          {recommended && (
                            <p className="mt-1 text-[10px] font-bold text-[#7A6A3A]">
                              Padrão: {recommended.baseQuantity} {recommended.quantityBasis === 'per_guest' ? 'por hóspede' : 'fixo por quarto'}
                              {recommended.suggestedQuantity != null ? ` → sugerido ${recommended.suggestedQuantity}` : ''}
                            </p>
                          )}
                          {shortage && <p className="mt-1 text-[10px] font-bold text-red-600">Quantidade maior que o saldo disponível.</p>}
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={quantities[item.id] || ''}
                          onChange={e => setQuantities(current => ({ ...current, [item.id]: Number(e.target.value || 0) }))}
                          placeholder="Qtd."
                          className="w-full rounded-lg border border-[#E6E3D8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#588157]"
                        />
                      </div>
                    );
                  })}
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
