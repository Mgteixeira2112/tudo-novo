import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarClock, Loader2 } from 'lucide-react';
import {
  getPublicKdsFrontdeskOverview,
  PublicKdsFrontdeskOverview,
  PublicKdsFrontdeskRoom
} from '../services/kdsDisplays.ts';

const EMPTY_OVERVIEW: PublicKdsFrontdeskOverview = {
  server_date: '',
  rooms: [],
  arrivals: [],
  departures: []
};

const STATUS_ORDER = ['Disponivel', 'Ocupado', 'Limpeza', 'Manutencao', 'Bloqueado'];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    Disponivel: 'Disponível',
    Ocupado: 'Ocupado',
    Limpeza: 'Limpeza',
    Manutencao: 'Manutenção',
    Bloqueado: 'Bloqueado'
  };
  return labels[status] || status;
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    Disponivel: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    Ocupado: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
    Limpeza: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    Manutencao: 'border-orange-400/30 bg-orange-400/10 text-orange-100',
    Bloqueado: 'border-red-400/30 bg-red-400/10 text-red-100'
  };
  return classes[status] || 'border-white/15 bg-white/5 text-white/80';
}

function groupByFloor(rooms: PublicKdsFrontdeskRoom[]) {
  return rooms.reduce<Record<string, PublicKdsFrontdeskRoom[]>>((groups, room) => {
    const key = String(room.floor ?? 0);
    groups[key] = groups[key] || [];
    groups[key].push(room);
    return groups;
  }, {});
}

export const KdsFrontdeskView: React.FC<{ token: string; onConnectionError?: () => void }> = ({ token, onConnectionError }) => {
  const [overview, setOverview] = useState<PublicKdsFrontdeskOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const load = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const data = await getPublicKdsFrontdeskOverview(token);
        if (!active) return;
        setOverview(data);
      } catch {
        if (!active) return;
        onConnectionError?.();
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    load(true);
    timer = window.setInterval(() => load(false), 5000);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [token, onConnectionError]);

  const floors = useMemo(() => groupByFloor(overview.rooms), [overview.rooms]);
  const orderedFloors = useMemo(() => Object.keys(floors).sort((a, b) => Number(a) - Number(b)), [floors]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin text-[#CCD5AE]" />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-5">
        <h2 className="text-2xl font-black sm:text-3xl">Recepção · mapa do hotel</h2>
        {overview.server_date ? <p className="mt-1 text-xs font-semibold text-white/40">Data operacional: {overview.server_date}</p> : null}
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_ORDER.map(status => {
            const count = overview.rooms.filter(room => room.status === status).length;
            return (
              <span key={status} className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusClass(status)}`}>
                {statusLabel(status)} · {count}
              </span>
            );
          })}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-white/60">
            Total · {overview.rooms.length}
          </span>
        </div>

        <div className="space-y-5">
          {orderedFloors.map(floor => (
            <div key={floor}>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">{floor}º andar</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                {floors[floor].map(room => (
                  <article key={room.id} className={`rounded-2xl border p-3 ${statusClass(room.status)}`}>
                    <div className="text-2xl font-black leading-none">{room.number}</div>
                    <div className="mt-2 text-[11px] font-black uppercase tracking-wide">{statusLabel(room.status)}</div>
                    <div className="mt-1 truncate text-[10px] font-semibold opacity-70">{room.type_name}</div>
                    {room.current_guest_name ? <div className="mt-2 truncate text-xs font-bold">{room.current_guest_name}</div> : null}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-[#CCD5AE]" />
              <h3 className="text-sm font-black uppercase tracking-wider">Chegadas de hoje</h3>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.arrivals.length}</span>
          </div>
          <div className="space-y-3">
            {overview.arrivals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">Nenhuma chegada pendente hoje.</div>
            ) : overview.arrivals.map(item => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black">{item.guest_name}</div>
                    <div className="mt-1 text-sm font-bold text-[#CCD5AE]">Quarto {item.room_number || 'a definir'}</div>
                    <div className="mt-1 text-xs text-white/45">{item.room_type_name || 'Tipo não informado'}{item.code ? ` · ${item.code}` : ''}</div>
                  </div>
                  <span className="rounded-full bg-[#CCD5AE]/10 px-2.5 py-1 text-[11px] font-black text-[#DDE7CE]">Pendente</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#D4A373]" />
              <h3 className="text-sm font-black uppercase tracking-wider">Saídas de hoje</h3>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{overview.departures.length}</span>
          </div>
          <div className="space-y-3">
            {overview.departures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">Nenhum checkout pendente hoje.</div>
            ) : overview.departures.map(item => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black">Quarto {item.room_number || '—'}</div>
                    <div className="mt-1 text-sm font-bold text-[#D4A373]">{item.guest_name}</div>
                    <div className="mt-1 text-xs text-white/45">{item.room_type_name || 'Tipo não informado'}{item.code ? ` · ${item.code}` : ''}</div>
                  </div>
                  <span className="rounded-full bg-[#D4A373]/10 px-2.5 py-1 text-[11px] font-black text-[#F2D6B1]">Hospedado</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};
