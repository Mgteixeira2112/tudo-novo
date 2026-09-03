import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  BellRing,
  Utensils,
  CheckCircle,
  X,
  ArrowRight,
  Volume2,
  VolumeX,
  Sparkles,
  Database,
  Clock,
  MapPin
} from 'lucide-react';
import { KitchenOrder } from '../types.ts';

export interface ToastItem {
  id: string;
  order: KitchenOrder;
  source: 'supabase_realtime' | 'backend_sync' | 'simulated';
  receivedAt: Date;
  expiresAt: number;
}

interface RoomServiceNotificationToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onNavigateToOrder: (order: KitchenOrder) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onTestSimulation?: () => void;
  supabaseConnected?: boolean;
}

export const RoomServiceNotificationToast: React.FC<RoomServiceNotificationToastProps> = ({
  toasts,
  onDismiss,
  onNavigateToOrder,
  isMuted,
  onToggleMute,
  onTestSimulation,
  supabaseConnected
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notificações de pedidos de Room Service em tempo real"
      className="fixed top-20 right-4 z-50 flex flex-col space-y-3 max-w-md w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const isHovered = hoveredId === toast.id;
        const totalItemsCount = toast.order.items.reduce((acc, i) => acc + (i.quantity || 1), 0);

        return (
          <div
            key={toast.id}
            id={`toast-room-service-${toast.order.id}`}
            onMouseEnter={() => setHoveredId(toast.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="pointer-events-auto bg-white rounded-2xl border-2 border-[#588157]/40 shadow-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 hover:border-[#588157] text-[#2C3327] overflow-hidden relative"
            style={{
              boxShadow: '0 20px 35px -10px rgba(44, 51, 39, 0.25), 0 0 15px rgba(88, 129, 87, 0.15)'
            }}
          >
            {/* Top accent bar with Supabase badge indicator */}
            <div className="flex items-center justify-between border-b border-[#E6E3D8] pb-2.5 mb-3">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#588157] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3A5A40]"></span>
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <BellRing className="w-4 h-4 text-[#588157] animate-bounce" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-[#2C3327]">
                    Novo Pedido Room Service
                  </span>
                </div>

                {toast.source === 'supabase_realtime' ? (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3ECF8E]/15 text-[#15803D] border border-[#3ECF8E]/30">
                    <Database className="w-2.5 h-2.5" />
                    <span>Supabase Realtime</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#588157]/10 text-[#3A5A40] border border-[#588157]/20">
                    <Database className="w-2.5 h-2.5" />
                    <span>Banco SQL Supabase</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  id={`btn-mute-toast-${toast.id}`}
                  onClick={onToggleMute}
                  title={isMuted ? 'Ativar avisos sonoros' : 'Silenciar aviso'}
                  className="p-1 text-[#6B705C] hover:text-[#2C3327] rounded-lg hover:bg-[#F4F1EA] transition"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#588157]" />}
                </button>
                <button
                  type="button"
                  id={`btn-close-toast-${toast.id}`}
                  onClick={() => onDismiss(toast.id)}
                  title="Fechar notificação"
                  className="p-1 text-[#6B705C] hover:text-[#2C3327] rounded-lg hover:bg-[#F4F1EA] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content info: Room, Guest & Order number */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#2C3327] text-[#FDFBF7] font-black text-sm tracking-wide shadow-xs">
                      Quarto {toast.order.roomNumber}
                    </span>
                    <span className="font-bold text-sm text-[#2C3327]">
                      {toast.order.guestName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-[#6B705C] mt-1">
                    <span className="font-mono font-bold text-[#3A5A40]">
                      #{toast.order.orderNumber}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-0.5 text-[#588157]" />
                      Destino: {toast.order.destination}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-0.5 text-[#588157]" />
                      Agora mesmo
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-[#6B705C] font-medium">Total do Pedido</div>
                  <div className="text-base font-black text-[#2C3327]">
                    R$ {(toast.order.totalAmount + (toast.order.deliveryFee || 0)).toFixed(2)}
                  </div>
                  {toast.order.deliveryFee > 0 && (
                    <div className="text-[9px] text-[#588157] font-semibold">
                      Taxa Quarto R$ {toast.order.deliveryFee.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Items List Preview */}
              <div className="bg-[#FDFBF7] rounded-xl p-2.5 border border-[#E6E3D8] text-xs">
                <div className="flex items-center justify-between text-[#6B705C] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <span className="flex items-center space-x-1">
                    <Utensils className="w-3 h-3 text-[#588157]" />
                    <span>Itens Selecionados ({totalItemsCount})</span>
                  </span>
                  <span className="text-[#3A5A40]">Setor: Room Service</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {toast.order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                      <span className="font-medium text-[#2C3327] truncate">
                        <strong className="text-[#588157] font-bold mr-1">{item.quantity}x</strong>
                        {item.name}
                      </span>
                      <span className="text-[#6B705C] font-mono text-[11px] ml-2 shrink-0">
                        R$ {(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {toast.order.specialInstructions && (
                  <div className="mt-2 pt-1.5 border-t border-[#E6E3D8] text-[11px] text-[#6B705C]">
                    <strong className="text-[#2C3327]">Observações:</strong> {toast.order.specialInstructions}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center space-x-2">
              <button
                type="button"
                id={`btn-view-order-${toast.id}`}
                onClick={() => onNavigateToOrder(toast.order)}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                <span>Atender Pedido no A&B</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id={`btn-dismiss-${toast.id}`}
                onClick={() => onDismiss(toast.id)}
                className="px-3 py-2 bg-[#F4F1EA] hover:bg-[#EBE7DD] text-[#6B705C] hover:text-[#2C3327] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Dispensar
              </button>
            </div>

            {/* Progress bar countdown */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#E6E3D8] overflow-hidden">
              <div
                className={`h-full bg-[#588157] ${isHovered ? '' : 'transition-all ease-linear'}`}
                style={{
                  width: '100%',
                  animation: isHovered ? 'none' : 'toastCountdown 10s linear forwards'
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes toastCountdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </aside>
  );
};
