import React, { useMemo, useState } from 'react';
import { Archive, CalendarDays, DoorOpen, Search, X } from 'lucide-react';
import { KitchenOrder } from '../types.ts';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

type Props = {
  orders: KitchenOrder[];
  currency: string;
  onClose: () => void;
};

export const KitchenOrderHistoryModal: React.FC<Props> = ({ orders, currency, onClose }) => {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cutoff = period === 'all'
      ? null
      : Date.now() - Number(period) * 24 * 60 * 60 * 1000;

    return orders.filter(order => {
      if (cutoff && order.completedAt && new Date(order.completedAt).getTime() < cutoff) return false;
      if (!term) return true;

      return [
        order.orderNumber,
        order.roomNumber,
        order.guestName,
        order.deliverySector,
        order.destination,
        order.specialInstructions,
        ...order.items.map(item => item.name)
      ].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [orders, search, period]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] p-5">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-[#588157]" />
              <h3 className="text-lg font-black text-[#2C3327]">Histórico de Pedidos Entregues</h3>
            </div>
            <p className="mt-1 text-xs text-[#6B705C]">
              Pedidos entregues saem da operação após 5 minutos, mas permanecem registrados aqui.
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

        <div className="grid gap-3 border-b border-[#EFECE3] bg-[#F8F7F2] p-4 md:grid-cols-[1fr_180px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E9280]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar pedido, quarto, hóspede, item ou destino"
              className="w-full rounded-xl border border-[#E6E3D8] bg-white py-2.5 pl-9 pr-3 text-xs text-[#3D4035] outline-none focus:border-[#A3B18A]"
            />
          </label>

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
              Nenhum pedido entregue encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleOrders.map(order => (
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
                    </div>

                    <div className="shrink-0 text-right text-[11px] text-[#6B705C]">
                      {order.completedAt && (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <CalendarDays className="h-3.5 w-3.5 text-[#588157]" />
                          {formatDate(order.completedAt)}
                        </span>
                      )}
                      <div className="mt-2 text-sm font-black text-[#588157]">{currency} {Number(order.totalAmount || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#E6E3D8] bg-[#F8F7F2] px-5 py-3 text-[11px] text-[#6B705C]">
          {visibleOrders.length} pedido(s) exibido(s) de {orders.length} entregue(s) arquivado(s).
        </div>
      </div>
    </div>
  );
};
