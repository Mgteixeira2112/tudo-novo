import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HotelProvider, useHotel } from './context/HotelContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { OnlineBookingEngine } from './components/OnlineBookingEngine.tsx';
import { KanbanBoard } from './components/KanbanBoard.tsx';
import { CheckInCheckOutModal } from './components/CheckInCheckOutModal.tsx';
import { GuestsManager } from './components/GuestsManager.tsx';
import { RoomsAndInventoryManager } from './components/RoomsAndInventoryManager.tsx';
import { MinibarAndKitchen } from './components/MinibarAndKitchen.tsx';
import { FinancialDashboard } from './components/FinancialDashboard.tsx';
import { UsersManager } from './components/UsersManager.tsx';
import { StaffLogin } from './components/StaffLogin.tsx';
import { HotelSettingsModal } from './components/HotelSettingsModal.tsx';
import {
  RoomServiceNotificationToast,
  ToastItem
} from './components/RoomServiceNotificationToast.tsx';
import {
  subscribeToKitchenOrdersRealtime,
  playRoomServiceChime
} from './services/supabase.ts';
import { api } from './services/api.ts';
import { KitchenOrder } from './types.ts';
import {
  Hotel,
  ShieldCheck,
  Database,
  CalendarCheck,
  LayoutDashboard,
  CheckCircle2,
  Phone,
  Mail,
  Loader2,
  BellRing,
  Lock
} from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    settings,
    loading,
    error,
    mode,
    setMode,
    activeAdminTab,
    setActiveAdminTab,
    supabaseStatus,
    refreshData,
    currentUser,
    canAccessTab
  } = useHotel();

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Auto-switch tab if current user does not have permission to view activeAdminTab
  useEffect(() => {
    if (mode === 'admin' && currentUser && !canAccessTab(activeAdminTab)) {
      const allTabs: Array<
        'kanbans' | 'rooms_inventory' | 'fnb' | 'checkinout' | 'guests' | 'overview' | 'users' | 'settings'
      > = [
        'kanbans',
        'rooms_inventory',
        'fnb',
        'checkinout',
        'guests',
        'overview',
        'users',
        'settings'
      ];
      const fallbackTab = allTabs.find(t => canAccessTab(t));
      if (fallbackTab) {
        setActiveAdminTab(fallbackTab);
      }
    }
  }, [mode, currentUser, activeAdminTab, canAccessTab, setActiveAdminTab]);

  // -------------------------------------------------------------
  // Real-time Room Service Toast Notification System
  // -------------------------------------------------------------
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hotel_toast_muted') === 'true';
    } catch {
      return false;
    }
  });

  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef<boolean>(false);

  // Trigger toast with sound chime and auto-dismiss
  const triggerRoomServiceToast = useCallback(
    (order: KitchenOrder, source: 'supabase_realtime' | 'backend_sync' | 'simulated') => {
      // Filter for Room Service delivery
      const isRoomService =
        order.destination === 'Quarto' ||
        order.deliverySector === 'Room Service' ||
        order.deliveryFee > 0;

      if (!isRoomService) return;

      // Prevent duplicate toasts for the same order
      if (seenOrderIdsRef.current.has(order.id)) return;
      seenOrderIdsRef.current.add(order.id);

      // Play elegant hotel bell chime
      if (!isMuted) {
        playRoomServiceChime();
      }

      const toastId = `toast_${order.id}_${Date.now()}`;
      const newToast: ToastItem = {
        id: toastId,
        order,
        source,
        receivedAt: new Date(),
        expiresAt: Date.now() + 10000
      };

      // Stack up to 3 active toasts
      setToasts(prev => [newToast, ...prev.slice(0, 2)]);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 10000);
    },
    [isMuted]
  );

  // 1. Initial load to populate existing order IDs (so we don't alert old historical orders)
  useEffect(() => {
    api
      .getOrders()
      .then(orders => {
        orders.forEach(o => seenOrderIdsRef.current.add(o.id));
        initialLoadedRef.current = true;
      })
      .catch(() => {
        initialLoadedRef.current = true;
      });
  }, []);

  // 2. Supabase Realtime channel subscription for kitchen_orders
  useEffect(() => {
    const unsubscribe = subscribeToKitchenOrdersRealtime(
      (order, source) => {
        console.log('[App] Supabase Realtime detectou novo pedido de room service:', order.orderNumber);
        triggerRoomServiceToast(order, source);
        refreshData();
      },
      {
        url: supabaseStatus?.supabaseUrl,
        anonKey: supabaseStatus?.supabaseAnonKey
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [supabaseStatus?.supabaseUrl, supabaseStatus?.supabaseAnonKey, triggerRoomServiceToast, refreshData]);

  // 3. Custom event listener from local UI actions
  useEffect(() => {
    const handleOrderCreatedEvent = (e: any) => {
      const order = e.detail;
      if (order && order.id) {
        triggerRoomServiceToast(order, 'backend_sync');
      }
    };

    window.addEventListener('hotel:new_room_service_order', handleOrderCreatedEvent);
    return () => {
      window.removeEventListener('hotel:new_room_service_order', handleOrderCreatedEvent);
    };
  }, [triggerRoomServiceToast]);

  // 4. Fallback polling check every 4 seconds to sync orders across multi-device sessions
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!initialLoadedRef.current) return;
      try {
        const currentOrders = await api.getOrders();
        currentOrders.forEach(ord => {
          if (!seenOrderIdsRef.current.has(ord.id)) {
            triggerRoomServiceToast(
              ord,
              supabaseStatus?.connected ? 'supabase_realtime' : 'backend_sync'
            );
          }
        });
      } catch {
        // Ignore background polling errors
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [triggerRoomServiceToast, supabaseStatus?.connected]);

  // Handle dismiss single toast
  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Handle click on "Atender Pedido"
  const handleNavigateToOrder = (order: KitchenOrder) => {
    setMode('admin');
    setActiveAdminTab('fnb');
    setToasts(prev => prev.filter(t => t.order.id !== order.id));
  };

  // Toggle audio mute
  const handleToggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('hotel_toast_muted', String(next));
      } catch {}
      return next;
    });
  };

  // Simulation helper for testing Room Service notifications
  const handleTestSimulation = () => {
    const simulatedOrder: KitchenOrder = {
      id: `test_${Date.now()}`,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      roomId: 'room_simulated',
      roomNumber: '204',
      reservationId: 'RES-SIMULATED',
      guestName: 'Fernanda Albuquerque',
      items: [
        { menuItemId: 'm1', name: 'Filé Mignon ao Molho Madeira', quantity: 1, unitPrice: 78.0 },
        { menuItemId: 'm2', name: 'Suco Natural de Laranja 500ml', quantity: 2, unitPrice: 14.0 }
      ],
      totalAmount: 106.0,
      deliveryFee: 15.0,
      destination: 'Quarto',
      deliverySector: 'Room Service',
      status: 'Recebido',
      specialInstructions: 'Ponto da carne: Ao ponto. Talheres e guardanapos extras, por favor.',
      createdAt: new Date().toISOString()
    };

    triggerRoomServiceToast(
      simulatedOrder,
      supabaseStatus?.connected ? 'supabase_realtime' : 'backend_sync'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-[#3D4035]">
        <Loader2 className="w-8 h-8 text-[#588157] animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wide">Carregando dados do SaaS Hoteleiro...</p>
        <span className="text-xs text-[#8E9280] mt-1">Conectando ao banco SQL e API</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3D4035] flex flex-col selection:bg-[#CCD5AE] selection:text-[#2C3327]">
      {/* Real-time Room Service Toast Notification Container */}
      <RoomServiceNotificationToast
        toasts={toasts}
        onDismiss={handleDismissToast}
        onNavigateToOrder={handleNavigateToOrder}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onTestSimulation={handleTestSimulation}
        supabaseConnected={supabaseStatus?.connected}
      />

      {/* Top Navigation */}
      <Navbar onOpenSettingsModal={() => setSettingsModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1">
        {mode === 'booking' ? (
          /* Public Online Booking Engine */
          <OnlineBookingEngine />
        ) : !currentUser ? (
          /* Protected staff portal */
          <StaffLogin />
        ) : (
          /* Hotel Admin PMS & Sector Operation */
          <div className="animate-fade-in">
            {activeAdminTab === 'overview' && <FinancialDashboard />}
            {activeAdminTab === 'rooms_inventory' && <RoomsAndInventoryManager />}
            {activeAdminTab === 'kanbans' && <KanbanBoard />}
            {activeAdminTab === 'checkinout' && <CheckInCheckOutModal />}
            {activeAdminTab === 'guests' && <GuestsManager />}
            {activeAdminTab === 'fnb' && <MinibarAndKitchen />}
            {activeAdminTab === 'settings' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-2xl border border-[#E6E3D8] p-8 text-center space-y-4 shadow-sm">
                  <div className="w-12 h-12 bg-[#F2F5E8] text-[#588157] rounded-full flex items-center justify-center mx-auto border border-[#CCD5AE]/40">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2C3327]">
                    Configuração do Hotel & Sincronização SQL Supabase
                  </h3>
                  <p className="text-xs text-[#6B705C] max-w-lg mx-auto">
                    Gerencie a identidade visual, taxas, comodidades e execute o script SQL com as 10 tabelas relacionais no seu Supabase com Realtime ativado.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setSettingsModalOpen(true)}
                      className="px-6 py-2.5 bg-[#2C3327] hover:bg-[#3A4135] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition cursor-pointer"
                    >
                      Abrir Painel de Configurações & SQL
                    </button>
                    <button
                      onClick={handleTestSimulation}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-[#F4F1EA] hover:bg-[#EBE7DD] text-[#3D4035] rounded-xl text-xs font-bold transition border border-[#E6E3D8] cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5 text-[#588157]" />
                      <span>Testar Notificação Toast Room Service</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Hotel Settings & SQL Supabase Modal */}
      <HotelSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-[#E6E3D8] py-6 text-xs text-[#6B705C] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Hotel className="w-4 h-4 text-[#588157]" />
            <span className="font-bold text-[#2C3327]">{settings?.hotelName || 'SaaS Hoteleiro'}</span>
            <span>&bull; Sistema de Gestão & Reservas Online</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <button
              onClick={handleTestSimulation}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F4F1EA] hover:bg-[#EBE7DD] text-[#3A5A40] font-semibold border border-[#CCD5AE]/40 transition cursor-pointer"
              title="Simular disparo de pedido de Room Service no banco"
            >
              <BellRing className="w-3.5 h-3.5 text-[#588157]" />
              <span>Testar Alerta Room Service</span>
            </button>
            <span className="text-[#E6E3D8]">|</span>
            <span className="flex items-center space-x-1 text-[#3A5A40] font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>Persistência SQL Backend (Sem LocalStorage)</span>
            </span>
            <span className="text-[#E6E3D8]">|</span>
            <span>Wi-Fi: <strong className="text-[#3D4035]">{settings?.wifiPassword || 'Horizonte@2025'}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <HotelProvider>
      <AppContent />
    </HotelProvider>
  );
}
