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
import { WalkInCheckIn } from './WalkInCheckIn.tsx';

export type StandaloneModule =
  | 'rooms'
  | 'inventory'
  | 'linen'
  | 'laundry'
  | 'lossDamage'
  | 'purchases'
  | 'reservations'
  | 'checkinout'
  | 'walkin';

const TITLES: Record<StandaloneModule, string> = {
  rooms: 'Quartos',
  inventory: 'Estoque',
  linen: 'Enxoval',
  laundry: 'Lavanderia',
  lossDamage: 'Perdas & Avarias',
  purchases: 'Compras',
  reservations: 'Reservas',
  checkinout: 'Check-in / Check-out',
  walkin: 'Check-in Direto'
};

export const StandaloneModulePage: React.FC<{ module: StandaloneModule }> = ({ module }) => {
  const { hasPermission, canAccessTab } = useHotel();
  const canManageRooms = hasPermission('manage_room_registry');
  const canViewInventory = hasPermission('view_inventory');
  const canAccessReception = canAccessTab('checkinout');
  const canManageCheckInOut = hasPermission('manage_checkinout');

  const allowed =
    module === 'rooms'
      ? canManageRooms
      : ['inventory', 'linen', 'laundry', 'lossDamage', 'purchases'].includes(module)
        ? canViewInventory
        : module === 'walkin'
          ? canManageCheckInOut
          : canAccessReception;

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
      {module === 'walkin' && <WalkInCheckIn />}
    </div>
  );
};
