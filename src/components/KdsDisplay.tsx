import React, { useEffect, useMemo, useState } from 'react';
import { ChefHat, Clock3, Loader2, Monitor, ShieldCheck, UtensilsCrossed, Wifi, WifiOff } from 'lucide-react';
import {
  getPublicKdsDisplay,
  getPublicKdsKitchenOrders,
  heartbeatKdsDisplay,
  PublicKdsDisplay,
  PublicKdsKitchenOrder,
  validateKdsDisplayToken
} from '../services/kdsDisplays.ts';

const PRESET_LABELS: Record<string, string> = {
  operations: 'Operação geral',
  kitchen: 'Cozinha / Room Service',
  housekeeping: 'Governança / Limpeza',
  maintenance: 'Manutenção',
  frontdesk: 'Recepção'
};

const KITCHEN_STATUSES: PublicKdsKitchenOrder['status'][] = ['Recebido', 'Em Preparo', 'Pronto'];

function elapsedMinutes(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

export const KdsDisplay: React.FC<{ token: string }> = ({ token }) => {
  const [display, setDisplay] = useState<PublicKdsDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(true);
  const [connected, setConnected] = useState(true);
  const [kitchenOrders, setKitchenOrders] = useState<PublicKdsKitchenOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const presetLabel = useMemo(() => display ? (PRESET_LABELS[display.preset] || display.preset) : '', [display]);

  useEffect(() => {
    let active = true;
    let heartbeatTimer: number | null = null;
    let validityTimer: number | null = null;

    const invalidate = () => {
      setValid(false);
      setConnected(false);
    };

    const load = async () => {
      try {
        setLoading(true);
        const data = await getPublicKdsDisplay(token);
        if (!active) return;
        setDisplay(data);
        setValid(Boolean(data));
        setConnected(Boolean(data));
      } catch {
        if (!active) return;
        setDisplay(null);
        invalidate();
      } finally {
        if (active) setLoading(false);
      }
    };

    const heartbeat = async () => {
      const ok = await heartbeatKdsDisplay(token);
      if (!active) return;
      setConnected(ok);
      if (!ok) invalidate();
    };

    const validateToken = async () => {
      const ok = await validateKdsDisplayToken(token);
      if (!active) return;
      if (!ok) invalidate();
    };

    load();
    heartbeatTimer = window.setInterval(heartbeat, 45000);
    validityTimer = window.setInterval(validateToken, 5000);

    return () => {
      active = false;
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      if (validityTimer) window.clearInterval(validityTimer);
    };
  }, [token]);

  useEffect(() => {
    if (!display || display.preset !== 'kitchen' || !valid) {
      setKitchenOrders([]);
      return;
    }

    let active = true;
    let ordersTimer: number | null = null;

    const loadOrders = async (showLoading = false) => {
      try {
        if (showLoading) setOrdersLoading(true);
        const orders = await getPublicKdsKitchenOrders(token);
        if (!active) return;
        setKitchenOrders(orders);
      } catch {
        if (!active) return;
        setConnected(false);
      } finally {
        if (active && showLoading) setOrdersLoading(false);
      }
    };

    loadOrders(true);
    ordersTimer = window.setInterval(() => loadOrders(false), 5000);

    return () => {
      active = false;
      if (ordersTimer) window.clearInterval(ordersTimer);
    };
  }, [display, token, valid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11130F] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#CCD5AE]" />
          <p className="mt-4 text-sm font-bold tracking-wide">Conectando à tela KDS...</p>
        </div>
      </div>
    );
  }

  if (!valid || !display) {
    return (
      <div className="min-h-screen bg-[#11130F] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <WifiOff className="mx-auto h-12 w-12 text-[#D4A373]" />
          <h1 className="mt-5 text-2xl font-black">Tela KDS indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Este link foi revogado, regenerado ou não é mais válido. Gere um novo link em Configurações → Telas KDS.
          </p>
        </div>
      </div>
    );
  }

  const renderKitchen = () => (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#CCD5AE]">
            <ChefHat className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Fila operacional</span>
          </div>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">Cozinha & Room Service</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/45">
          <Clock3 className="h-4 w-4" /> Atualização automática a cada 5s
        </div>
      </div>

      {ordersLoading ? (
        <div className="flex min-h-[45vh] items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#CCD5AE]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {KITCHEN_STATUSES.map(status => {
            const orders = kitchenOrders.filter(order => order.status === status);
            return (
              <section key={status} className="min-h-[320px] rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-[#D4A373]" />
                    <h3 className="text-sm font-black uppercase tracking-wider">{status}</h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{orders.length}</span>
                </div>

                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                      Nenhum pedido nesta etapa.
                    </div>
                  ) : orders.map(order => (
                    <article key={order.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-black">{order.order_number}</div>
                          <div className="mt-0.5 text-sm font-bold text-[#CCD5AE]">
                            Quarto {order.room_number || '—'} · {order.guest_name || 'Hóspede'}
                          </div>
                        </div>
                        <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white/60">
                          {elapsedMinutes(order.created_at)} min
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {(order.items || []).map((item, index) => (
                          <div key={`${order.id}-${index}`} className="flex gap-2 text-sm">
                            <strong className="min-w-7 text-[#D4A373]">{item.quantity}×</strong>
                            <span className="font-semibold text-white/85">{item.name || 'Item'}</span>
                            {item.notes ? <span className="text-white/40">— {item.notes}</span> : null}
                          </div>
                        ))}
                      </div>

                      {order.special_instructions ? (
                        <div className="mt-3 rounded-xl border border-[#D4A373]/30 bg-[#D4A373]/10 px-3 py-2 text-xs font-semibold text-[#F2D6B1]">
                          Obs.: {order.special_instructions}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-white/45">
                        <span className="rounded-full bg-white/5 px-2 py-1">{order.destination}</span>
                        <span className="rounded-full bg-white/5 px-2 py-1">{order.delivery_sector}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );

  return (
    <div className="min-h-screen bg-[#11130F] text-white flex flex-col">
      <header className="border-b border-white/10 bg-black/20 px-6 py-4 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2.5">
              <Monitor className="h-6 w-6 text-[#CCD5AE]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{display.name}</h1>
              <p className="text-xs font-semibold text-white/50">Preset: {presetLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${connected ? 'bg-[#3A5A40]/40 text-[#DDE7CE]' : 'bg-red-500/20 text-red-200'}`}>
              <Wifi className="h-3.5 w-3.5" /> {connected ? 'Conectado' : 'Sem conexão'}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" /> Link exclusivo
            </span>
          </div>
        </div>
      </header>

      {display.preset === 'kitchen' ? renderKitchen() : (
        <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
              <Monitor className="h-10 w-10 text-[#CCD5AE]" />
            </div>
            <h2 className="mt-6 text-3xl font-black">KDS conectado</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/55">
              A tela, o link revogável e o heartbeat estão ativos. O conteúdo operacional do preset <strong className="text-white/80">{presetLabel}</strong> ainda será ligado em uma próxima etapa do KDS.
            </p>
          </div>
        </main>
      )}
    </div>
  );
};
