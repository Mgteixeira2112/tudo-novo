import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, CheckCheck, CircleAlert, Volume2, X } from 'lucide-react';
import {
  OperationalAlertInboxItem,
  loadOperationalAlertsInbox,
  markAllOperationalAlertsRead,
  markOperationalAlertRead,
  subscribeToOperationalAlertsInbox
} from '../services/operationalAlertsInbox.ts';
import {
  loadOperationalAlertsMuted,
  setOperationalAlertsMuted
} from '../services/operationalAlertPreferences.ts';

interface OperationalAlertsBellProps {
  userId: string;
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function resolveOriginButtonId(item: OperationalAlertInboxItem): string | null {
  const source = (item.sourceType || '').toLowerCase();
  if (['kitchen_order', 'room_service', 'minibar', 'fnb'].includes(source)) return 'subnav-fnb';
  if (['kanban_task', 'task', 'maintenance_task', 'governance_task'].includes(source)) return 'subnav-kanbans';
  if (['room', 'room_status'].includes(source)) return 'subnav-rooms-inventory';
  if (['reservation', 'checkin', 'checkout', 'check_in', 'check_out'].includes(source)) return 'subnav-checkinout';
  if (['guest'].includes(source)) return 'subnav-guests';
  return null;
}

export const OperationalAlertsBell: React.FC<OperationalAlertsBellProps> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OperationalAlertInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [savingMute, setSavingMute] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => items.filter(item => !item.readAt).length, [items]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await loadOperationalAlertsInbox(20));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os alertas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    refresh();
    loadOperationalAlertsMuted(userId)
      .then(value => {
        if (active) setMuted(value);
      })
      .catch(() => {
        if (active) setMuted(false);
      });

    const unsubscribe = subscribeToOperationalAlertsInbox(userId, refresh);
    const fallback = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
      window.clearInterval(fallback);
    };
  }, [userId]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleMarkRead = async (item: OperationalAlertInboxItem) => {
    if (item.readAt) return;
    await markOperationalAlertRead(item.deliveryId);
    setItems(prev => prev.map(current => current.deliveryId === item.deliveryId
      ? { ...current, readAt: new Date().toISOString() }
      : current));
  };

  const handleOpenItem = async (item: OperationalAlertInboxItem) => {
    await handleMarkRead(item);
    const buttonId = resolveOriginButtonId(item);
    if (!buttonId) return;
    setOpen(false);
    window.setTimeout(() => document.getElementById(buttonId)?.click(), 0);
  };

  const handleMarkAllRead = async () => {
    await markAllOperationalAlertsRead();
    const now = new Date().toISOString();
    setItems(prev => prev.map(item => ({ ...item, readAt: item.readAt || now })));
  };

  const handleToggleMute = async () => {
    if (savingMute) return;
    const next = !muted;
    try {
      setSavingMute(true);
      setError(null);
      await setOperationalAlertsMuted(userId, next);
      setMuted(next);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível alterar a preferência de alertas.');
    } finally {
      setSavingMute(false);
    }
  };

  return (
    <div className="relative flex items-center gap-1" ref={rootRef}>
      <button
        id="btn-toggle-operational-alerts-mute"
        onClick={handleToggleMute}
        disabled={savingMute}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${muted ? 'border-[#D9D6CC] bg-[#EFECE4] text-[#8E9280]' : 'border-transparent bg-transparent text-[#6B705C] hover:border-[#E6E3D8] hover:bg-[#F4F1EA]'} disabled:opacity-60`}
        title={muted ? 'Reativar alertas' : 'Silenciar alertas'}
        aria-label={muted ? 'Reativar alertas' : 'Silenciar alertas'}
      >
        {muted ? <BellOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <button
        id="btn-operational-alerts"
        onClick={() => setOpen(value => !value)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition ${muted ? 'border-[#D9D6CC] bg-[#EFECE4] text-[#8E9280]' : 'border-[#E6E3D8] bg-[#F4F1EA] text-[#3D4035] hover:bg-[#EFECE4]'}`}
        title={muted ? 'Central de Alertas — silenciada' : 'Central de Alertas'}
        aria-label={`Central de Alertas${muted ? ', silenciada' : ''}${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
      >
        {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4 text-[#3A5A40]" />}
        {!muted && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#BC6C25] px-1.5 py-0.5 text-center text-[9px] font-bold leading-none text-white shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#E6E3D8] bg-[#FDFBF7] px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-[#2C3327]">Central de Alertas</h3>
              <p className="text-[10px] text-[#6B705C]">
                {muted ? 'Silenciada • alertas continuam sendo recebidos' : `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-[#3A5A40] hover:bg-[#F2F5E8]"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Todas lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar alertas">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b border-[#F0EEE7] bg-[#FCFBF8] px-4 py-2">
            <button
              onClick={handleToggleMute}
              disabled={savingMute}
              className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs text-[#3D4035] hover:bg-[#F4F1EA] disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {muted ? <BellOff className="h-4 w-4 text-[#8E9280]" /> : <Volume2 className="h-4 w-4 text-[#588157]" />}
                <span className="font-semibold">{muted ? 'Alertas silenciados' : 'Alertas ativos'}</span>
              </span>
              <span className="text-[10px] font-semibold text-[#588157]">{muted ? 'Reativar' : 'Silenciar'}</span>
            </button>
          </div>

          <div className="max-h-[430px] overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="p-6 text-center text-xs text-[#6B705C]">Carregando alertas...</div>
            )}
            {error && (
              <div className="m-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="p-7 text-center">
                <Bell className="mx-auto mb-2 h-5 w-5 text-[#A3A795]" />
                <p className="text-xs font-semibold text-[#3D4035]">Nenhum alerta por enquanto</p>
                <p className="mt-1 text-[10px] text-[#8E9280]">Os eventos destinados a você aparecerão aqui.</p>
              </div>
            )}

            {items.map(item => (
              <button
                key={item.deliveryId}
                onClick={() => handleOpenItem(item)}
                className={`w-full border-b border-[#F0EEE7] px-4 py-3 text-left transition hover:bg-[#FDFBF7] ${!item.readAt ? 'bg-[#F7FAF2]' : 'bg-white'}`}
                title={resolveOriginButtonId(item) ? 'Abrir origem do alerta' : 'Marcar alerta como lido'}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.priority === 'critical' ? 'bg-red-50 text-red-600' : item.priority === 'attention' ? 'bg-amber-50 text-amber-700' : 'bg-[#F2F5E8] text-[#588157]'}`}>
                    <CircleAlert className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`truncate text-xs ${!item.readAt ? 'font-bold text-[#2C3327]' : 'font-semibold text-[#3D4035]'}`}>{item.title}</p>
                      <span className="shrink-0 text-[9px] text-[#8E9280]">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[#6B705C]">{item.message}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] text-[#8E9280]">
                      {item.sector && <span>Setor: {item.sector}</span>}
                      {!item.readAt && <span className="font-semibold text-[#588157]">• Não lida</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
