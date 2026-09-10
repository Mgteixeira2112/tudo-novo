import React from 'react';
import { useHotel } from '../context/HotelContext.tsx';
import { RoomsRegistryManager } from './RoomsRegistryManager.tsx';
import { IntegratedInventoryManager } from './IntegratedInventoryManager.tsx';
import { LinenCirculationPanel } from './LinenCirculationPanel.tsx';
import { LaundryKanban } from './LaundryKanban.tsx';
import { LossDamagePanel } from './LossDamagePanel.tsx';
import { PurchaseNeedPanel } from './PurchaseNeedPanel.tsx';
import { ReservationsManager } from './ReservationsManager.tsx';
import { CheckInCheckOutModal } from './CheckInCheckOutModal.tsx';
import { ReceptionCheckFlowPage } from './ReceptionCheckFlowPage.tsx';
import { WalkInCheckIn } from './WalkInCheckIn.tsx';
import { MinibarOperationalModule, OrdersOperationalModule } from './FnbOperationalModules.tsx';
import { MenuManagementModule } from './MenuManagementModule.tsx';
import { OperationalStandalonePage } from './OperationalStandalonePage.tsx';

export type StandaloneModule =
  | 'rooms'
  | 'inventory'
  | 'linen'
  | 'laundry'
  | 'lossDamage'
  | 'purchases'
  | 'reservations'
  | 'checkinout'
  | 'checkin'
  | 'checkout'
  | 'walkin'
  | 'minibar'
  | 'roomService'
  | 'kitchen'
  | 'menu'
  | 'roomMap'
  | 'tasks'
  | 'housekeeping'
  | 'maintenance';

const TITLES: Record<StandaloneModule, string> = {
  rooms: 'Quartos',
  inventory: 'Estoque',
  linen: 'Enxoval',
  laundry: 'Lavanderia',
  lossDamage: 'Perdas & Avarias',
  purchases: 'Compras',
  reservations: 'Reservas',
  checkinout: 'Check-in / Check-out',
  checkin: 'Check-in',
  checkout: 'Check-out',
  walkin: 'Check-in Direto',
  minibar: 'Frigobar',
  roomService: 'Room Service',
  kitchen: 'Cozinha',
  menu: 'Cardápio',
  roomMap: 'Mapa de Quartos',
  tasks: 'Tarefas',
  housekeeping: 'Governança',
  maintenance: 'Manutenção'
};

export const StandaloneModulePage: React.FC<{ module: StandaloneModule }> = ({ module }) => {
  const { hasPermission, canAccessTab } = useHotel();
  const canManageRooms = hasPermission('manage_room_registry');
  const canViewRooms = hasPermission('view_rooms');
  const canViewKanbans = hasPermission('view_kanbans');
  const canViewInventory = hasPermission('view_inventory');
  const canAccessReception = canAccessTab('checkinout');
  const canManageCheckInOut = hasPermission('manage_checkinout');
  const canViewMinibar = hasPermission('view_minibar');
  const canManageMinibar = hasPermission('manage_minibar');
  const canViewRoomService = hasPermission('view_room_service');
  const canManageRoomService = hasPermission('manage_room_service');
  const canViewKitchen = hasPermission('view_kitchen');
  const canManageKitchen = hasPermission('manage_kitchen');
  const canManageMenu = hasPermission('manage_menu');

  const allowed =
    module === 'rooms'
      ? canManageRooms
      : module === 'roomMap'
        ? canViewRooms
        : ['tasks', 'housekeeping', 'maintenance'].includes(module)
          ? canViewKanbans
          : ['inventory', 'linen', 'laundry', 'lossDamage', 'purchases'].includes(module)
            ? canViewInventory
            : module === 'walkin'
              ? canManageCheckInOut
              : ['reservations', 'checkinout', 'checkin', 'checkout'].includes(module)
                ? canAccessReception
                : module === 'minibar'
                  ? canViewMinibar
                  : module === 'roomService'
                    ? canViewRoomService
                    : module === 'kitchen'
                      ? canViewKitchen
                      : canManageMenu;

  if (!allowed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">
          Seu perfil não possui acesso a esta página.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white px-4 py-3 shadow-xs">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#2C3327]">{TITLES[module]}</h2>
        </div>
      </div>

      {module === 'rooms' && <RoomsRegistryManager />}
      {module === 'inventory' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><IntegratedInventoryManager /></div>
      )}
      {module === 'linen' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><LinenCirculationPanel /></div>
      )}
      {module === 'laundry' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><LaundryKanban /></div>
      )}
      {module === 'lossDamage' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><LossDamagePanel /></div>
      )}
      {module === 'purchases' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><PurchaseNeedPanel /></div>
      )}
      {module === 'reservations' && <ReservationsManager />}
      {module === 'checkinout' && <CheckInCheckOutModal />}
      {module === 'checkin' && <ReceptionCheckFlowPage flow="checkin" />}
      {module === 'checkout' && <ReceptionCheckFlowPage flow="checkout" />}
      {module === 'walkin' && <WalkInCheckIn />}
      {module === 'minibar' && <MinibarOperationalModule canManage={canManageMinibar} />}
      {module === 'roomService' && <OrdersOperationalModule mode="room_service" canManage={canManageRoomService} />}
      {module === 'kitchen' && <OrdersOperationalModule mode="kitchen" canManage={canManageKitchen} />}
      {module === 'menu' && <MenuManagementModule />}
      {module === 'roomMap' && <OperationalStandalonePage view="roomMap" />}
      {module === 'tasks' && <OperationalStandalonePage view="tasks" />}
      {module === 'housekeeping' && <OperationalStandalonePage view="housekeeping" />}
      {module === 'maintenance' && <OperationalStandalonePage view="maintenance" />}
    </div>
  );
};
