import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BellRing, Database, Volume2, VolumeX, X } from 'lucide-react';
import { OperationalAlertInboxItem } from '../services/operationalAlertsInbox.ts';
import { playOldHotelBell } from '../services/alertBell.ts';

interface OperationalAlertNotificationToastProps {
  items: OperationalAlertInboxItem[];
  onDismiss: (deliveryId: string) => void;
  onOpen: (item: OperationalAlertInboxItem) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const OperationalAlertNotificationToast: React.FC<OperationalAlertNotificationToastProps> = ({
  items,
  onDismiss,
  onOpen,
  isMuted,
  onToggleMute
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const soundedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isMuted) return;
    const unseen = items.filter(item => !soundedIdsRef.current.has(item.deliveryId));
    if (unseen.length === 0) return;
    unseen.forEach(item => soundedIdsRef.current.add(item.deliveryId));
    playOldHotelBell();
  }, [items, isMuted]);

  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Notificações operacionais em tempo real"
      className="fixed top-20 right-4 z-50 flex flex-col space-y-3 max-w-md w-[calc(100vw-2rem)] pointer-events-none"
    >
      {items.map(item => {
        const isHovered = hoveredId === item.deliveryId;
        return (
          <div
            key={item.deliveryId}
            id={`toast-operational-alert-${item.deliveryId}`}
            onMouseEnter={() => setHoveredId(item.deliveryId)}
            onMouseLeave={() => setHoveredId(null)}
            className="pointer-events-auto bg-white rounded-2xl border-2 border-[#588157]/40 shadow-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 hover:border-[#588157] text-[#2C3327] overflow-hidden relative"
            style={{ boxShadow: '0 20px 35px -10px rgba(44, 51, 39, 0.25), 0 0 15px rgba(88, 129, 87, 0.15)' }}
          >
            <div className="flex items-center justify-between border-b border-[#E6E3D8] pb-2.5 mb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="relative shrink-0">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#588157] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3A5A40]"></span>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 min-w-0">
                  <BellRing className="w-4 h-4 text-[#588157] animate-bounce shrink-0" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-[#2C3327] truncate">
                    {item.title}
                  </span>
                </div>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3ECF8E]/15 text-[#15803D] border border-[#3ECF8E]/30 shrink-0">
                  <Database className="w-2.5 h-2.5" />
                  <span>Supabase Realtime</span>
                </span>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  title={isMuted ? 'Reativar alertas' : 'Silenciar alertas'}
                  className="p-1 text-[#6B705C] hover:text-[#2C3327] rounded-lg hover:bg-[#F4F1EA] transition"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#588157]" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(item.deliveryId)}
                  title="Fechar notificação"
                  className="p-1 text-[#6B705C] hover:text-[#2C3327] rounded-lg hover:bg-[#F4F1EA] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {item.sector && (
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-[#2C3327] text-[#FDFBF7] font-black text-xs tracking-wide shadow-xs mb-2">
                      Setor {item.sector}
                    </span>
                  )}
                  <p className="text-sm font-semibold leading-relaxed text-[#2C3327]">{item.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#6B705C] font-medium">Prioridade</div>
                  <div className="text-xs font-black text-[#2C3327] uppercase">
                    {item.priority === 'critical' ? 'Crítica' : item.priority === 'attention' ? 'Atenção' : 'Info'}
                  </div>
                </div>
              </div>

              <div className="bg-[#FDFBF7] rounded-xl p-2.5 border border-[#E6E3D8] text-[11px] text-[#6B705C]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#2C3327]">Origem: {item.sourceType || 'Central de Alertas'}</span>
                  <span>Agora mesmo</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                <span>Abrir origem</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDismiss(item.deliveryId)}
                className="px-3 py-2 bg-[#F4F1EA] hover:bg-[#EBE7DD] text-[#6B705C] hover:text-[#2C3327] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Dispensar
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#E6E3D8] overflow-hidden">
              <div
                className={`h-full bg-[#588157] ${isHovered ? '' : 'transition-all ease-linear'}`}
                style={{ width: '100%', animation: isHovered ? 'none' : 'operationalToastCountdown 10s linear forwards' }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes operationalToastCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </aside>
  );
};
