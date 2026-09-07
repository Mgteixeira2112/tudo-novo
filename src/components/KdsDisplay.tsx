import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Monitor, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { getPublicKdsDisplay, heartbeatKdsDisplay, PublicKdsDisplay } from '../services/kdsDisplays.ts';

const PRESET_LABELS: Record<string, string> = {
  operations: 'Operação geral',
  kitchen: 'Cozinha / Room Service',
  housekeeping: 'Governança / Limpeza',
  maintenance: 'Manutenção',
  frontdesk: 'Recepção'
};

export const KdsDisplay: React.FC<{ token: string }> = ({ token }) => {
  const [display, setDisplay] = useState<PublicKdsDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(true);
  const [connected, setConnected] = useState(true);

  const presetLabel = useMemo(() => display ? (PRESET_LABELS[display.preset] || display.preset) : '', [display]);

  useEffect(() => {
    let active = true;
    let heartbeatTimer: number | null = null;

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
        setValid(false);
        setConnected(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    const heartbeat = async () => {
      const ok = await heartbeatKdsDisplay(token);
      if (!active) return;
      setConnected(ok);
      if (!ok) setValid(false);
    };

    load();
    heartbeatTimer = window.setInterval(heartbeat, 45000);

    return () => {
      active = false;
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    };
  }, [token]);

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

      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
            <Monitor className="h-10 w-10 text-[#CCD5AE]" />
          </div>
          <h2 className="mt-6 text-3xl font-black">KDS conectado</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/55">
            A tela, o link revogável e o heartbeat já estão ativos. O conteúdo operacional do preset <strong className="text-white/80">{presetLabel}</strong> será ligado na próxima etapa do KDS.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Atualização</span>
              <strong className="mt-1 block text-lg">Heartbeat 45s</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Acesso</span>
              <strong className="mt-1 block text-lg">Sem login / PIN</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">Segurança</span>
              <strong className="mt-1 block text-lg">Link revogável</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
