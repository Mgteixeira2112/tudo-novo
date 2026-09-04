import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, CircleAlert, ExternalLink, RefreshCw } from 'lucide-react';
import {
  OperationalAlertInboxItem,
  loadOperationalAlertsInbox,
  markAllOperationalAlertsRead,
  markOperationalAlertRead,
  subscribeToOperationalAlertsInbox
} from '../services/operationalAlertsInbox.ts';
import { getSupabaseAuthUser } from '../services/supabase.ts';
import { AdminTab } from '../types.ts';

type Filter = 'all' | 'unread' | 'read';

interface OperationalAlertsCenterProps {
  onNavigate: (tab: AdminTab) => void;
}

function resolveOriginTab(item: OperationalAlertInboxItem): AdminTab | null {
  const source = (item.sourceType || '').toLowerCase();
  if (['kitchen_order', 'room_service', 'minibar', 'fnb'].includes(source)) return 'fnb';
  if (['kanban_task', 'task', 'maintenance_task', 'governance_task'].includes(source)) return 'kanbans';
  if (['room', 'room_status'].includes(source)) return 'rooms_inventory';
  if (['reservation', 'checkin', 'checkout', 'check_in', 'check_out'].includes(source)) return 'checkinout';
  if (['guest'].includes(source)) return 'guests';
  return null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const OperationalAlertsCenter: React.FC<OperationalAlertsCenterProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<OperationalAlertInboxItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await loadOperationalAlertsInbox(200));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a Central de Alertas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let fallback: number | null = null;
    let active = true;

    getSupabaseAuthUser().then(user => {
      if (!active) return;
      const id = user?.id || null;
      setUserId(id);
      refresh();
      if (id) unsubscribe = subscribeToOperationalAlertsInbox(id, refresh);
      fallback = window.setInterval(refresh, 30000);
    }).catch(() => refresh());

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
      if (fallback) window.clearInterval(fallback);
    };
  }, []);

  const unreadCount = useMemo(() => items.filter(item => !item.readAt).length, [items]);
  const readCount = items.length - unreadCount;
  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter(item => !item.readAt);
    if (filter === 'read') return items.filter(item => Boolean(item.readAt));
    return items;
  }, [filter, items]);

  const markRead = async (item: OperationalAlertInboxItem) => {
    if (item.readAt) return;
    await markOperationalAlertRead(item.deliveryId);
    const now = new Date().toISOString();
    setItems(prev => prev.map(current => current.deliveryId === item.deliveryId ? { ...current, readAt: now } : current));
  };

  const markAllRead = async () => {
    await markAllOperationalAlertsRead();
    const now = new Date().toISOString();
    setItems(prev => prev.map(item => ({ ...item, readAt: item.readAt || now })));
  };

  const openOrigin = async (item: OperationalAlertInboxItem) => {
    await markRead(item);
    const tab = resolveOriginTab(item);
    if (tab) onNavigate(tab);
  };

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: items.length },
    { key: 'unread', label: 'Não lidas', count: unreadCount },
    { key: 'read', label: 'Lidas', count: readCount }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F2F5E8] text-[#588157] border border-[#CCD5AE]/50">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2C3327]">Central de Alertas</h2>
            <p className="text-xs text-[#6B705C]">Histórico operacional destinado ao seu usuário.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-[#E6E3D8] bg-white px-3 py-2 text-xs font-semibold text-[#3D4035] hover:bg-[#F4F1EA]">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 rounded-xl bg-[#2C3327] px-3 py-2 text-xs font-bold text-white hover:bg-[#3A4135]">
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E6E3D8] pb-3">
        {filters.map(option => (
          <button
            key={option.key}
            onClick={() => setFilter(option.key)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${filter === option.key ? 'bg-[#2C3327] text-white' : 'bg-white text-[#6B705C] border border-[#E6E3D8] hover:bg-[#F4F1EA]'}`}
          >
            {option.label} <span className="ml-1 opacity-80">{option.count}</span>
          </button>
        ))}
      </div>

      {loading && items.length === 0 && <div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">Carregando alertas...</div>}
      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-10 text-center">
          <Bell className="mx-auto mb-3 h-6 w-6 text-[#A3A795]" />
          <p className="text-sm font-bold text-[#3D4035]">Nenhum alerta nesta visualização</p>
          <p className="mt-1 text-xs text-[#8E9280]">Os alertas recebidos continuarão preservados no histórico.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(item => {
          const originTab = resolveOriginTab(item);
          return (
            <div key={item.deliveryId} className={`rounded-2xl border p-4 shadow-sm ${item.readAt ? 'border-[#E6E3D8] bg-white' : 'border-[#CCD5AE] bg-[#F7FAF2]'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.priority === 'critical' ? 'bg-red-50 text-red-600' : item.priority === 'attention' ? 'bg-amber-50 text-amber-700' : 'bg-[#F2F5E8] text-[#588157]'}`}>
                  <CircleAlert className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className={`text-sm ${item.readAt ? 'font-semibold text-[#3D4035]' : 'font-bold text-[#2C3327]'}`}>{item.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#6B705C]">{item.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#8E9280]">{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#8E9280]">
                    {item.sector && <span className="rounded-lg bg-[#F4F1EA] px-2 py-1">Setor: {item.sector}</span>}
                    <span className="rounded-lg bg-[#F4F1EA] px-2 py-1">Origem: {item.sourceType}</span>
                    {!item.readAt && <span className="font-bold text-[#588157]">Não lida</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!item.readAt && (
                      <button onClick={() => markRead(item)} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[#3A5A40] hover:bg-[#EEF4E5]">Marcar como lida</button>
                    )}
                    {originTab && (
                      <button onClick={() => openOrigin(item)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[#2C3327] hover:bg-[#F4F1EA]">
                        <ExternalLink className="h-3 w-3" /> Abrir origem
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!userId && !loading && <p className="text-center text-[10px] text-[#8E9280]">Sessão Supabase não identificada.</p>}
    </div>
  );
};
