import React, { useMemo, useState } from 'react';
import { BedDouble, Boxes, LayoutDashboard } from 'lucide-react';
import { RoomsAndInventoryManager } from './RoomsAndInventoryManager.tsx';
import { RoomsRegistryManager } from './RoomsRegistryManager.tsx';
import { IntegratedInventoryManager } from './IntegratedInventoryManager.tsx';
import { useHotel } from '../context/HotelContext.tsx';

export const RoomsTransitionWorkspace: React.FC = () => {
  const { hasPermission } = useHotel();
  const canOperateRooms = hasPermission('view_rooms');
  const canManageRegistry = hasPermission('manage_room_registry');
  const canViewInventory = hasPermission('view_inventory');

  const initialView = useMemo<'operation' | 'registry' | 'inventory'>(() => {
    if (canOperateRooms) return 'operation';
    if (canManageRegistry) return 'registry';
    return 'inventory';
  }, [canOperateRooms, canManageRegistry]);

  const [view, setView] = useState<'operation' | 'registry' | 'inventory'>(initialView);

  const safeView =
    view === 'operation' && canOperateRooms ? 'operation' :
    view === 'registry' && canManageRegistry ? 'registry' :
    view === 'inventory' && canViewInventory ? 'inventory' :
    initialView;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E6E3D8] bg-white p-3 shadow-xs">
          <div>
            <p className="text-xs font-bold text-[#2C3327]">Quartos — reorganização modular</p>
            <p className="text-[11px] text-[#6B705C] mt-0.5">Cada função aparece conforme as permissões do colaborador.</p>
          </div>
          <div className="inline-flex max-w-full overflow-x-auto bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
            {canOperateRooms && (
              <button id="rooms-transition-operation" type="button" onClick={() => setView('operation')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'operation' ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <LayoutDashboard className="w-4 h-4 text-[#588157]" /> Operação atual
              </button>
            )}
            {canManageRegistry && (
              <button id="rooms-transition-registry" type="button" onClick={() => setView('registry')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'registry' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <BedDouble className="w-4 h-4 text-[#A3B18A]" /> Cadastro de Quartos
              </button>
            )}
            {canViewInventory && (
              <button id="rooms-transition-inventory" type="button" onClick={() => setView('inventory')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'inventory' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <Boxes className="w-4 h-4 text-[#A3B18A]" /> Estoque Integrado
              </button>
            )}
          </div>
        </div>
      </div>

      {safeView === 'operation' && canOperateRooms && <RoomsAndInventoryManager />}
      {safeView === 'registry' && canManageRegistry && <RoomsRegistryManager />}
      {safeView === 'inventory' && canViewInventory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><IntegratedInventoryManager /></div>
      )}
    </div>
  );
};
