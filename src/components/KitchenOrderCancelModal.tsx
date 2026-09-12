import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, PackageX, RotateCcw, Trash2, X } from 'lucide-react';
import { KitchenOrder } from '../types.ts';
import {
  cancelKitchenOrderAtomicCloud,
  getKitchenOrderCancellationContextCloud,
  KitchenCancellationStockItem,
  KitchenProductionState,
  KitchenStockTreatment
} from '../services/kitchenOrderCancellation.ts';

type Props = {
  order: KitchenOrder;
  onClose: () => void;
  onCancelled: (order: KitchenOrder) => void | Promise<void>;
};

const reasonOptions = ['Cliente desistiu', 'Erro no pedido', 'Demora no atendimento', 'Cortesia operacional', 'Outro'];

function productionDefault(status: KitchenOrder['status']): KitchenProductionState {
  if (status === 'Recebido') return 'Nao_Iniciado';
  if (status === 'Em Preparo') return 'Parcialmente_Preparado';
  return 'Totalmente_Preparado';
}

function treatmentDefault(status: KitchenOrder['status']): KitchenStockTreatment {
  if (status === 'Recebido') return 'Retorno_Total';
  if (status === 'Em Preparo') return 'Retorno_Parcial';
  return 'Perda_Total';
}

const productionLabels: Record<KitchenProductionState, string> = {
  Nao_Iniciado: 'Não iniciado',
  Parcialmente_Preparado: 'Parcialmente preparado',
  Totalmente_Preparado: 'Totalmente preparado'
};

const treatmentLabels: Record<KitchenStockTreatment, string> = {
  Retorno_Total: 'Retornar tudo ao estoque',
  Perda_Total: 'Registrar perda total',
  Retorno_Parcial: 'Retorno parcial / perda parcial'
};

export const KitchenOrderCancelModal: React.FC<Props> = ({ order, onClose, onCancelled }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stockItems, setStockItems] = useState<KitchenCancellationStockItem[]>([]);
  const [reasonCategory, setReasonCategory] = useState(reasonOptions[0]);
  const [reasonDetails, setReasonDetails] = useState('');
  const [productionState, setProductionState] = useState<KitchenProductionState>(() => productionDefault(order.status));
  const [stockTreatment, setStockTreatment] = useState<KitchenStockTreatment>(() => treatmentDefault(order.status));
  const [returned, setReturned] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getKitchenOrderCancellationContextCloud(order.id)
      .then(context => {
        if (!active) return;
        setStockItems(context.stockItems);
        setReturned(Object.fromEntries(context.stockItems.map(item => [item.itemId, 0])));
      })
      .catch((err: any) => active && setError(err?.message || 'Não foi possível carregar o impacto no estoque.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [order.id]);

  useEffect(() => {
    if (productionState === 'Nao_Iniciado') setStockTreatment('Retorno_Total');
    if (productionState === 'Totalmente_Preparado' && stockTreatment === 'Retorno_Total') setStockTreatment('Perda_Total');
  }, [productionState]);

  const reason = useMemo(() => {
    const detail = reasonDetails.trim();
    return detail ? `${reasonCategory}: ${detail}` : reasonCategory;
  }, [reasonCategory, reasonDetails]);

  const totals = useMemo(() => stockItems.reduce((acc, item) => {
    const required = Number(item.requiredQuantity || 0);
    let back = 0;
    if (stockTreatment === 'Retorno_Total') back = required;
    if (stockTreatment === 'Retorno_Parcial') back = Math.min(required, Math.max(0, Number(returned[item.itemId] || 0)));
    return { required: acc.required + required, returned: acc.returned + back, lost: acc.lost + (required - back) };
  }, { required: 0, returned: 0, lost: 0 }), [stockItems, returned, stockTreatment]);

  const submit = async () => {
    if (reasonCategory === 'Outro' && !reasonDetails.trim()) {
      setError('Descreva o motivo do cancelamento.');
      return;
    }
    if (stockTreatment === 'Retorno_Parcial') {
      const invalid = stockItems.some(item => {
        const value = Number(returned[item.itemId] || 0);
        return value < 0 || value > item.requiredQuantity;
      });
      if (invalid) {
        setError('Há quantidade de retorno maior que a quantidade originalmente baixada.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');
      const cancelled = await cancelKitchenOrderAtomicCloud({
        orderId: order.id,
        reason,
        productionState,
        stockTreatment,
        returnedItems: stockTreatment === 'Retorno_Parcial'
          ? stockItems.map(item => ({ itemId: item.itemId, quantity: Number(returned[item.itemId] || 0) }))
          : []
      });
      await onCancelled(cancelled);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao cancelar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] p-5">
          <div>
            <div className="flex items-center gap-2">
              <PackageX className="h-5 w-5 text-[#BC6C25]" />
              <h3 className="text-lg font-black text-[#2C3327]">Cancelar pedido {order.orderNumber}</h3>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">O pedido não será apagado. Financeiro, estoque e auditoria serão reconciliados juntos.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#8E9280] hover:bg-[#F4F1EA]" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E6E3D8] bg-[#F8F7F2] p-3 text-xs">
              <p className="font-bold text-[#2C3327]">Quarto {order.roomNumber} • {order.guestName}</p>
              <p className="mt-1 text-[#6B705C]">Status atual: <strong>{order.status}</strong></p>
            </div>
            <div className="rounded-xl border border-[#E6E3D8] bg-[#F8F7F2] p-3 text-xs">
              <p className="font-bold text-[#2C3327]">Valor do pedido</p>
              <p className="mt-1 text-[#6B705C]">R$ {(Number(order.totalAmount || 0) + Number(order.deliveryFee || 0)).toFixed(2)}</p>
            </div>
          </div>

          <section className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">1. Motivo do cancelamento</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={reasonCategory} onChange={e => setReasonCategory(e.target.value)} className="rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm">
                {reasonOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <input value={reasonDetails} onChange={e => setReasonDetails(e.target.value)} placeholder={reasonCategory === 'Outro' ? 'Descreva o motivo *' : 'Detalhes opcionais'} className="rounded-xl border border-[#E6E3D8] px-3 py-2.5 text-sm" />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">2. Situação da produção</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(productionLabels) as KitchenProductionState[]).map(value => (
                <button key={value} type="button" onClick={() => setProductionState(value)} className={`rounded-xl border p-3 text-left text-xs font-bold transition ${productionState === value ? 'border-[#BC6C25] bg-[#FAEDCD]/60 text-[#2C3327]' : 'border-[#E6E3D8] bg-white text-[#6B705C]'}`}>
                  {productionLabels[value]}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6B705C]">3. Tratamento dos insumos</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(treatmentLabels) as KitchenStockTreatment[]).map(value => (
                <button key={value} type="button" onClick={() => setStockTreatment(value)} className={`rounded-xl border p-3 text-left text-xs font-bold transition ${stockTreatment === value ? 'border-[#588157] bg-[#F2F5E8] text-[#2C3327]' : 'border-[#E6E3D8] bg-white text-[#6B705C]'}`}>
                  {value === 'Retorno_Total' ? <RotateCcw className="mb-1 h-4 w-4" /> : <Trash2 className="mb-1 h-4 w-4" />}
                  {treatmentLabels[value]}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-[#DADFD1] p-5 text-center text-xs text-[#8E9280]">Carregando impacto do estoque...</div>
            ) : stockItems.length === 0 ? (
              <div className="rounded-xl border border-[#D4A373]/40 bg-[#FAEDCD]/40 p-3 text-xs text-[#7C4A1E]">
                Este pedido não possui movimentos de estoque vinculados. O cancelamento será auditado e a cobrança será cancelada, mas não haverá ajuste automático de estoque.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#E6E3D8]">
                <div className="grid grid-cols-[1fr_110px_110px] gap-2 bg-[#F8F7F2] px-3 py-2 text-[10px] font-bold uppercase text-[#6B705C]">
                  <span>Insumo</span><span>Baixado</span><span>Retorna</span>
                </div>
                {stockItems.map(item => {
                  const returnedQty = stockTreatment === 'Retorno_Total' ? item.requiredQuantity : stockTreatment === 'Perda_Total' ? 0 : Number(returned[item.itemId] || 0);
                  return (
                    <div key={item.itemId} className="grid grid-cols-[1fr_110px_110px] items-center gap-2 border-t border-[#EFECE3] px-3 py-2 text-xs">
                      <span className="font-semibold text-[#2C3327]">{item.itemName}</span>
                      <span className="text-[#6B705C]">{item.requiredQuantity} {item.unit}</span>
                      {stockTreatment === 'Retorno_Parcial' ? (
                        <input type="number" min="0" max={item.requiredQuantity} step="0.001" value={returned[item.itemId] ?? 0} onChange={e => setReturned(current => ({ ...current, [item.itemId]: Number(e.target.value) }))} className="w-full rounded-lg border border-[#E6E3D8] px-2 py-1.5 text-right" />
                      ) : <span className="font-bold text-[#588157]">{returnedQty} {item.unit}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {stockItems.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-[#F8F7F2] p-2"><span className="text-[#6B705C]">Baixado:</span> <strong>{totals.required.toFixed(3)}</strong></div>
                <div className="rounded-lg bg-[#F2F5E8] p-2"><span className="text-[#6B705C]">Retorno:</span> <strong>{totals.returned.toFixed(3)}</strong></div>
                <div className="rounded-lg bg-[#FAEDCD] p-2"><span className="text-[#6B705C]">Perda:</span> <strong>{totals.lost.toFixed(3)}</strong></div>
              </div>
            )}
          </section>

          <div className="flex gap-3 rounded-xl border border-[#D4A373]/50 bg-[#FAEDCD]/50 p-3 text-xs text-[#7C4A1E]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Ao confirmar, o pedido vai para o Histórico como Cancelado, a cobrança pendente sai do folio e o estoque será reconciliado conforme a opção escolhida. Esta operação fica auditada.</p>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E6E3D8] bg-[#F8F7F2] p-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-[#E6E3D8] bg-white px-4 py-2.5 text-xs font-bold text-[#3D4035]">Voltar</button>
          <button type="button" onClick={submit} disabled={loading || submitting} className="rounded-xl bg-[#8D3B2F] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
            {submitting ? 'Cancelando e reconciliando...' : 'Confirmar cancelamento auditado'}
          </button>
        </div>
      </div>
    </div>
  );
};
