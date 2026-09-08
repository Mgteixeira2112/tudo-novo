import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Database, X } from 'lucide-react';
import {
  getPublicKdsOperationalAlerts,
  PublicKdsOperationalAlert
} from '../services/kdsOperationalAlerts.ts';

export const KdsOperationalAlertToast: React.FC<{ token: string }> = ({ token }) => {
  const [toasts, setToasts] = useState<PublicKdsOperationalAlert[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = (id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    let active = true;
    let pollTimer: number | null = null;

    knownIdsRef.current.clear();
    initializedRef.current = false;
    setToasts([]);

    const load = async () => {
      try {
        const items = await getPublicKdsOperationalAlerts(token);
        if (!active) return;

        if (!initializedRef.current) {
          items.forEach(item => knownIdsRef.current.add(item.id));
          initializedRef.current = true;
          return;
        }

        const fresh = items
          .filter(item => !knownIdsRef.current.has(item.id))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        fresh.forEach(item => {
          knownIdsRef.current.add(item.id);
          setToasts(prev => [item, ...prev.filter(current => current.id !== item.id)].slice(0, 3));
          const timer = window.setTimeout(() => dismiss(item.id), 12000);
          timersRef.current.set(item.id, timer);
        });
      } catch {
        // O feed de alertas não interfere no funcionamento principal do KDS.
      }
    };

    load();
    pollTimer = window.setInterval(load, 5000);

    return () => {
      active = false;
      if (pollTimer) window.clearInterval(pollTimer);
      timersRef.current.forEach(timer => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [token]);

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Alertas operacionais do KDS"
      className="fixed right-5 top-5 z-[100] flex w-[min(440px,calc(100vw-2.5rem))] flex-col gap-3 pointer-events-none"
    >
      {toasts.map(item => (
        <div
          key={item.id}
          className="pointer-events-auto overflow-hidden rounded-2xl border-2 border-[#CCD5AE]/40 bg-[#171A15] p-4 text-white shadow-2xl"
          style={{ boxShadow: '0 22px 45px -12px rgba(0,0,0,.55), 0 0 18px rgba(204,213,174,.12)' }}
        >
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#CCD5AE] opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#CCD5AE]" />
              </span>
              <BellRing className="h-4 w-4 shrink-0 text-[#CCD5AE]" />
              <span className="truncate text-xs font-extrabold uppercase tracking-wider">{item.title}</span>
              <span className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[#3ECF8E]/30 bg-[#3ECF8E]/10 px-2 py-0.5 text-[10px] font-bold text-[#7BE0AE]">
                <Database className="h-2.5 w-2.5" /> KDS Live
              </span>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="ml-2 rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar alerta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {item.sector ? (
                <span className="mb-2 inline-flex rounded-lg bg-[#2C3327] px-2.5 py-1 text-xs font-black text-[#FDFBF7]">
                  Setor {item.sector}
                </span>
              ) : null}
              <p className="text-sm font-semibold leading-relaxed text-white/90">{item.message}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-medium text-white/40">Prioridade</div>
              <div className="text-xs font-black uppercase text-[#CCD5AE]">
                {item.priority === 'critical' ? 'Crítica' : item.priority === 'attention' ? 'Atenção' : 'Info'}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/45">
            <span className="font-semibold text-white/65">Origem: {item.source_type}</span>
            <span>Agora mesmo</span>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              Dispensar
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
};
