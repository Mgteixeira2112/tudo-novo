import React, { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  CalendarCheck2,
  CalendarClock,
  ChefHat,
  Clock3,
  DoorOpen,
  Loader2,
  Monitor,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  Wrench
} from 'lucide-react';
import {
  getPublicKdsOperationsOverview,
  heartbeatKdsDisplay,
  PublicKdsDisplay,
  PublicKdsOperationsOverview,
  validateKdsDisplayToken
} from '../services/kdsDisplays.ts';

const EMPTY: PublicKdsOperationsOverview = {
  server_date: '',
  room_status: { total: 0, available: 0, occupied: 0, cleaning: 0, maintenance: 0, blocked: 0 },
  arrivals: [],
  departures: [],
  kitchen_orders: [],
  housekeeping_rooms: [],
  maintenance_rooms: []
};

function elapsedMinutes(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

export const KdsOperationsDisplay: React.FC<{ token: string; display: PublicKdsDisplay }> = ({ token, display }) => {
  const [overview, setOverview] = useState<PublicKdsOperationsOverview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(true);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | null = null;
    let validityTimer: number | null = null;
    let heartbeatTimer: number | null = null;

    const load = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const data = await getPublicKdsOperationsOverview(token);
        if (!active) return;
        setOverview(data);
        setConnected(true);
      } catch {
        if (!active) return;
        setConnected(false);
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    const validate = async () => {
      const ok = await validateKdsDisplayToken(token);
      if (!active) return;
      setValid(ok);
      if (!ok) setConnected(false);
    };

    const heartbeat = async () => {
      const ok = await heartbeatKdsDisplay(token);
      if (!active) return;
      setConnected(ok);
      if (!ok) setValid(false);
    };

    load(true);
    refreshTimer = window.setInterval(() => load(false), 5000);
    validityTimer = window.setInterval(validate, 5000);
    heartbeatTimer = window.setInterval(heartbeat, 45000);

    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
      if (validityTimer) window.clearInterval(validityTimer);
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    };
  }, [token]);

  const kitchenByStatus = useMemo(() => ({
    received: overview.kitchen_orders.filter(order => order.status === 'Recebido').length,
    preparing: overview.kitchen_orders.filter(order => order.status === 'Em Preparo').length,
    ready: overview.kitchen_orders.filter(order => order.status === 'Pronto').length
  }), [overview.kitchen_orders]);

  if (!valid) {
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

  return (
    <div className="min-h-screen bg-[#11130F] text-white flex flex-col">
      <header className="border-b border-white/10 bg-black/20 px-6 py-4 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2.5"><Monitor className="h-6 w-6 text-[#CCD5AE]" /></div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{display.name}</h1>
              <p className="text-xs font-semibold text-white/50">Preset: Operação geral</p>
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

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#CCD5AE]">
              <Monitor className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Visão transversal</span>
            </div>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">Operação do hotel</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white/45">
            <Clock3 className="h-4 w-4" /> Atualização automática a cada 5s
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-[#CCD5AE]" /></div>
        ) : (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ['Total', overview.room_status.total, BedDouble],
                ['Disponível', overview.room_status.available, DoorOpen],
                ['Ocupado', overview.room_status.occupied, BedDouble],
                ['Limpeza', overview.room_status.cleaning, Sparkles],
                ['Manutenção', overview.room_status.maintenance, Wrench],
                ['Bloqueado', overview.room_status.blocked, ShieldCheck]
              ].map(([label, value, Icon]) => (
                <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-white/45"><Icon className="h-4 w-4" /><span className="text-[11px] font-black uppercase tracking-wider">{label}</span></div>
                  <div className="mt-2 text-3xl font-black">{value as number}</div>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><CalendarCheck2 className="h-5 w-5 text-[#CCD5AE]" /><h3 className="font-black">Chegadas de hoje</h3></div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.arrivals.length}</span>
                </div>
                <div className="space-y-2">
                  {overview.arrivals.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/30">Nenhuma chegada pendente.</div> : overview.arrivals.map(item => (
                    <div key={item.id} className="rounded-2xl bg-black/20 px-4 py-3">
                      <div className="font-black">Quarto {item.room_number || '—'}</div><div className="text-sm text-white/55">{item.guest_name}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#D4A373]" /><h3 className="font-black">Saídas de hoje</h3></div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.departures.length}</span>
                </div>
                <div className="space-y-2">
                  {overview.departures.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-white/30">Nenhuma saída pendente.</div> : overview.departures.map(item => (
                    <div key={item.id} className="rounded-2xl bg-black/20 px-4 py-3">
                      <div className="font-black">Quarto {item.room_number || '—'}</div><div className="text-sm text-white/55">{item.guest_name}</div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-[#D4A373]" /><h3 className="font-black">Cozinha ativa</h3></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.kitchen_orders.length}</span></div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs font-black">
                  <div className="rounded-xl bg-white/5 p-2">Recebido<br/><span className="text-lg">{kitchenByStatus.received}</span></div>
                  <div className="rounded-xl bg-white/5 p-2">Preparo<br/><span className="text-lg">{kitchenByStatus.preparing}</span></div>
                  <div className="rounded-xl bg-white/5 p-2">Pronto<br/><span className="text-lg">{kitchenByStatus.ready}</span></div>
                </div>
                <div className="space-y-2">
                  {overview.kitchen_orders.slice(0, 6).map(order => <div key={order.id} className="rounded-xl bg-black/20 px-3 py-2 text-sm"><strong>{order.order_number}</strong> · Qto {order.room_number || '—'} · {order.status} <span className="text-white/35">· {elapsedMinutes(order.created_at)} min</span></div>)}
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#CCD5AE]" /><h3 className="font-black">Governança</h3></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.housekeeping_rooms.length}</span></div>
                <div className="space-y-2">
                  {overview.housekeeping_rooms.length === 0 ? <div className="text-sm text-white/30">Nenhum quarto em Limpeza.</div> : overview.housekeeping_rooms.map(room => <div key={room.id} className="rounded-xl bg-black/20 px-3 py-2 text-sm font-bold">Quarto {room.number} · {room.floor}º andar</div>)}
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[#D4A373]" /><h3 className="font-black">Manutenção</h3></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.maintenance_rooms.length}</span></div>
                <div className="space-y-2">
                  {overview.maintenance_rooms.length === 0 ? <div className="text-sm text-white/30">Nenhum quarto em Manutenção.</div> : overview.maintenance_rooms.map(room => <div key={room.id} className="rounded-xl bg-black/20 px-3 py-2 text-sm font-bold">Quarto {room.number} · {room.floor}º andar</div>)}
                </div>
              </article>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
