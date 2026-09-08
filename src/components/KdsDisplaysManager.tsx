import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Monitor, Plus, Power, RefreshCw, RotateCcw, Wifi } from 'lucide-react';
import {
  buildKdsDisplayUrl,
  createKdsDisplay,
  KdsDisplayRecord,
  KdsPreset,
  listKdsDisplays,
  rotateKdsDisplayToken,
  updateKdsDisplay
} from '../services/kdsDisplays.ts';

const PRESETS: Array<{ value: KdsPreset; label: string }> = [
  { value: 'operations', label: 'Operação geral' },
  { value: 'kitchen', label: 'Cozinha / Room Service' },
  { value: 'housekeeping', label: 'Governança / Limpeza' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'frontdesk', label: 'Recepção' }
];

function presetLabel(value: KdsPreset) {
  return PRESETS.find(item => item.value === value)?.label || value;
}

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() <= 90000;
}

export const KdsDisplaysManager: React.FC = () => {
  const [items, setItems] = useState<KdsDisplayRecord[]>([]);
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<KdsPreset>('operations');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await listKdsDisplays());
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar as telas KDS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const onlineCount = useMemo(() => items.filter(item => item.active && isOnline(item.last_seen_at)).length, [items]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    try {
      setCreating(true);
      setError(null);
      const created = await createKdsDisplay(name.trim(), preset);
      setItems(prev => [created, ...prev]);
      setName('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar a tela KDS.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (item: KdsDisplayRecord) => {
    try {
      setBusyId(item.id);
      const updated = await updateKdsDisplay(item.id, item.name, item.preset, !item.active);
      setItems(prev => prev.map(current => current.id === item.id ? updated : current));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível alterar a tela KDS.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRotate = async (item: KdsDisplayRecord) => {
    if (!confirm(`Regenerar o link da tela “${item.name}”? O link anterior deixará de funcionar imediatamente.`)) return;
    try {
      setBusyId(item.id);
      const token = await rotateKdsDisplayToken(item.id);
      setItems(prev => prev.map(current => current.id === item.id
        ? { ...current, token, last_seen_at: null, updated_at: new Date().toISOString() }
        : current));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível regenerar o link KDS.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async (item: KdsDisplayRecord) => {
    await navigator.clipboard.writeText(buildKdsDisplayUrl(item.token));
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <section id="kds-displays-manager" className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-[#588157]" />
            <h3 className="text-base font-black text-[#2C3327]">Telas KDS</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B705C]">
            Crie links exclusivos e revogáveis para TVs ou monitores operacionais. A tela pública não exige login, PIN ou aplicativo.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="rounded-full bg-[#F2F5E8] px-2.5 py-1 text-[#3A5A40]">{items.length} cadastradas</span>
          <span className="rounded-full bg-[#F4F1EA] px-2.5 py-1 text-[#6B705C]">{onlineCount} online</span>
          <button onClick={refresh} className="rounded-lg border border-[#E6E3D8] p-1.5 text-[#6B705C] hover:bg-[#F4F1EA]" title="Atualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-[#DADFD1] bg-[#F8FAF2] p-4 sm:grid-cols-[1fr_240px_auto]">
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Ex.: TV Cozinha"
          className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A]"
        />
        <select
          value={preset}
          onChange={event => setPreset(event.target.value as KdsPreset)}
          className="rounded-xl border border-[#E6E3D8] bg-white px-3 py-2.5 text-xs font-semibold text-[#3D4035] outline-none focus:border-[#A3B18A]"
        >
          {PRESETS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button
          type="submit"
          disabled={creating || name.trim().length < 2}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {creating ? 'Criando...' : 'Criar tela'}
        </button>
      </form>

      {error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}

      <div className="mt-5 space-y-3">
        {loading && items.length === 0 && <div className="py-8 text-center text-xs text-[#8E9280]">Carregando telas KDS...</div>}
        {!loading && items.length === 0 && <div className="rounded-xl border border-dashed border-[#DADFD1] py-8 text-center text-xs text-[#8E9280]">Nenhuma tela KDS cadastrada.</div>}

        {items.map(item => {
          const online = item.active && isOnline(item.last_seen_at);
          const busy = busyId === item.id;
          return (
            <article key={item.id} className="rounded-xl border border-[#E6E3D8] bg-[#FDFBF7] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-[#2C3327]">{item.name}</h4>
                    <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-[#6B705C] border border-[#E6E3D8]">{presetLabel(item.preset)}</span>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${online ? 'bg-[#EEF4E5] text-[#3A5A40]' : 'bg-[#F4F1EA] text-[#8E9280]'}`}>
                      <Wifi className="h-3 w-3" /> {online ? 'Online' : item.active ? 'Offline' : 'Desativada'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-[#8E9280]">
                    {item.last_seen_at ? `Último contato: ${new Date(item.last_seen_at).toLocaleString('pt-BR')}` : 'Ainda não acessada'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopy(item)} className="flex items-center gap-1.5 rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-[10px] font-bold text-[#3D4035] hover:bg-[#F4F1EA]">
                    <Copy className="h-3.5 w-3.5" /> {copiedId === item.id ? 'Copiado' : 'Copiar link'}
                  </button>
                  <a href={buildKdsDisplayUrl(item.token)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-[10px] font-bold text-[#3D4035] hover:bg-[#F4F1EA]">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                  <button disabled={busy} onClick={() => handleRotate(item)} className="flex items-center gap-1.5 rounded-lg border border-[#E6E3D8] bg-white px-3 py-2 text-[10px] font-bold text-[#6B705C] hover:bg-[#F4F1EA] disabled:opacity-50">
                    <RotateCcw className="h-3.5 w-3.5" /> Regenerar link
                  </button>
                  <button disabled={busy} onClick={() => handleToggle(item)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold disabled:opacity-50 ${item.active ? 'bg-[#F4F1EA] text-[#6B705C]' : 'bg-[#2C3327] text-white'}`}>
                    <Power className="h-3.5 w-3.5" /> {item.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
