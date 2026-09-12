import React, { useMemo, useState } from 'react';
import { Archive, CalendarDays, DoorOpen, Search, X } from 'lucide-react';
import { KitchenOrder } from '../types.ts';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function productionLabel(value?: string) {
  if (value === 'Nao_Iniciado') return 'Não iniciado';
  if (value === 'Parcialmente_Preparado') return 'Parcialmente preparado';
  if (value === 'Totalmente_Preparado') return 'Totalmente preparado';
  return value || 'Não informado';
}

function treatmentLabel(value?: string) {
  if (value === 'Retorno_Total') return 'Retorno total ao estoque';
  if (value === 'Perda_Total') return 'Perda total';
  if (value === 'Retorno_Parcial') return 'Retorno parcial / perda parcial';
  return value || 'Não informado';
}

type Props = {
  orders: KitchenOrder[];
  currency: string;
  onClose: () => void;
};

export const KitchenOrderHistoryModal: React.FC<Props> = ({ orders, currency, onClose }) => {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Entregue' | 'Cancelado'>('all');

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cutoff = period === 'all'
      ? null
      : Date.now() - Number(period) * 24 * 60 * 60 * 1000;

    return orders.filter(order => {
      const audit = order as any;
      const eventAt = audit.cancelledAt || order.completedAt;
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (cutoff && eventAt && new Date(eventAt).getTime() < cutoff) return false;
      if (!term) return true;

      return [
        order.orderNumber,
        order.roomNumber,
        order.guestName,
        order.deliverySector,
        order.destination,
        order.specialInstructions,
        audit.cancellationReason,
        audit.cancelledByName,
        ...order.items.map(item => item.name)
      ].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [orders, search, period, statusFilter]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] p-5">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-[#588157]" />
              <h3 className="text-lg font-black text-[#2C3327]">Histórico de Pedidos</h3>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">
              Pedidos entregues e cancelados permanecem registrados para consulta e auditoria.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#8E9280] transition hover:bg-[#F4F1EA] hover:text-[#2C3327]"
            aria-label="Fechar histórico"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-[#EFECE3] bg-[#F8F7F2] p-4 md:grid-cols-[1fr_170px_170px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E9280]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar pedido, quarto, hóspede, item ou motivo"
              className="w-full rounded-xl border border-[#E6E3D8] bg-white py-2.5 pl-9 pr-3 text-xs text-[#3D4035] outline-none focus:border-[#A3B18A]"
            />
          </label>

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'all' | 'Entregue' | 'Cancelado')}
            className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A]"
          >
            <option value="all">Entregues + Cancelados</option>
            <option value="Entregue">Somente entregues</option>
            <option value="Cancelado">Somente cancelados</option>
          </select>

          <select
            value={period}
            onChange={event => setPeriod(event.target.value as '7' | '30' | '90' | 'all')}
            className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A]"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todo o histórico</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {visibleOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DADFD1] bg-[#F8FAF2] px-4 py-12 text-center text-sm text-[#8E9280]">
              Nenhum pedido encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map(order => {
                const audit = order as any;
                const isCancelled = order.status === 'Cancelado';
                const stockDetails = Array.isArray(audit.cancellationStockDetails) ? audit.cancellationStockDetails : [];
                const totalReturned = stockDetails.reduce((sum: number, item: any) => sum + Number(item.returnedQuantity || 0), 0);
                const totalLost = stockDetails.reduce((sum: number, item: any) => sum + Number(item.lostQuantity || 0), 0);
                const eventAt = audit.cancelledAt || order.completedAt;

                return (
                  <article key={order.id} className="rounded-xl border border-[#E6E3D8] bg-white p-4 shadow-xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#6B705C]">
                          <span>{order.orderNumber}</span>
                          <span>•</span>
                          <span>{order.deliverySector}</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E3D8] bg-[#F8F7F2] px-2 py-1 normal-case tracking-normal text-[#3D4035]">
                            <DoorOpen className="h-3 w-3" /> Qto {order.roomNumber}
                          </span>
                          <span className={`rounded-full border px-2 py-1 normal-case tracking-normal ${isCancelled ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#CCD5AE] bg-[#F2F5E8] text-[#3A5A40]'}`}>
                            {order.status}
                          </span>
                        </div>
                        <h4 className="mt-1 text-sm font-bold text-[#2C3327]">{order.guestName || 'Hóspede'}</h4>
                        <p className="mt-1 text-xs text-[#6B705C]">Destino: {order.destination}</p>
                        <div className="mt-2 rounded-xl bg-[#F8F7F2] p-2.5 text-xs text-[#3D4035]">
                          {order.items.map((item, index) => (
                            <div key={`${order.id}-${index}`} className="flex justify-between gap-3">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{currency} {(item.quantity * item.unitPrice).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        {order.specialInstructions && <p className="mt-2 text-[11px] italic text-[#6B705C]">Obs: {order.specialInstructions}</p>}

                        {isCancelled && (
                          <div className="mt-3 grid gap-2 rounded-xl border border-red-100 bg-red-50/50 p-3 text-[11px] text-[#5A443D] sm:grid-cols-2">
                            <div><span className="font-bold">Motivo:</span> {audit.cancellationReason || 'Não informado'}</div>
                            <div><span className="font-bold">Responsável:</span> {audit.cancelledByName || 'Sistema'}</div>
                            <div><span className="font-bold">Produção:</span> {productionLabel(audit.cancellationProductionState)}</div>
                            <div><span className="font-bold">Estoque:</span> {treatmentLabel(audit.cancellationStockTreatment)}</div>
                            <div><span className="font-bold">Status anterior:</span> {audit.statusBeforeCancel || '—'}</div>
                            <div><span className="font-bold">Reconciliação:</span> retorno {totalReturned.toFixed(3)} • perda {totalLost.toFixed(3)}</div>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right text-[11px] text-[#6B705C]">
                        {eventAt && (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <CalendarDays className={`h-3.5 w-3.5 ${isCancelled ? 'text-red-600' : 'text-[#588157]'}`} />
                            {formatDate(eventAt)}
                          </span>
                        )}
                        <div className={`mt-2 text-sm font-black ${isCancelled ? 'text-red-700 line-through' : 'text-[#588157]'}`}>
                          {currency} {(Number(order.totalAmount || 0) + Number(order.deliveryFee || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[#E6E3D8] bg-[#F8F7F2] px-5 py-3 text-[11px] text-[#6B705C]">
          {visibleOrders.length} pedido(s) exibido(s) de {orders.length} arquivado(s).
        </div>
      </div>
    </div>
  );
};
