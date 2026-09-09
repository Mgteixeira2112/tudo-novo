import React, { useMemo, useState } from 'react';
import { AlertTriangle, BedDouble, Boxes, Shirt, WashingMachine } from 'lucide-react';
import { RoomsRegistryManager } from './RoomsRegistryManager.tsx';
import { IntegratedInventoryManager } from './IntegratedInventoryManager.tsx';
import { LinenCirculationPanel } from './LinenCirculationPanel.tsx';
import { LaundryKanban } from './LaundryKanban.tsx';
import { LossDamagePanel } from './LossDamagePanel.tsx';
import { useHotel } from '../context/HotelContext.tsx';

export const RoomsTransitionWorkspace: React.FC = () => {
  const { hasPermission } = useHotel();
  const canManageRegistry = hasPermission('manage_room_registry');
  const canViewInventory = hasPermission('view_inventory');

  const initialView = useMemo<'registry' | 'inventory' | 'linen' | 'laundry' | 'lossDamage'>(() => {
    if (canManageRegistry) return 'registry';
    return 'inventory';
  }, [canManageRegistry]);

  const [view, setView] = useState<'registry' | 'inventory' | 'linen' | 'laundry' | 'lossDamage'>(initialView);

  const safeView =
    view === 'registry' && canManageRegistry ? 'registry' :
    view === 'inventory' && canViewInventory ? 'inventory' :
    view === 'linen' && canViewInventory ? 'linen' :
    view === 'laundry' && canViewInventory ? 'laundry' :
    view === 'lossDamage' && canViewInventory ? 'lossDamage' :
    initialView;

  if (!canManageRegistry && !canViewInventory) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">
          Seu perfil não possui acesso a Quartos ou Estoque.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E6E3D8] bg-white px-4 py-3 shadow-xs">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#2C3327]">Quartos & Estoque</h2>
          <div className="inline-flex max-w-full overflow-x-auto bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
            {canManageRegistry && (
              <button id="rooms-transition-registry" type="button" onClick={() => setView('registry')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'registry' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <BedDouble className="w-4 h-4 text-[#A3B18A]" /> Quartos
              </button>
            )}
            {canViewInventory && (
              <button id="rooms-transition-inventory" type="button" onClick={() => setView('inventory')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'inventory' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <Boxes className="w-4 h-4 text-[#A3B18A]" /> Estoque
              </button>
            )}
            {canViewInventory && (
              <button id="rooms-transition-linen" type="button" onClick={() => setView('linen')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'linen' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <Shirt className="w-4 h-4 text-[#A3B18A]" /> Enxoval
              </button>
            )}
            {canViewInventory && (
              <button id="rooms-transition-laundry" type="button" onClick={() => setView('laundry')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'laundry' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <WashingMachine className="w-4 h-4 text-[#A3B18A]" /> Lavanderia
              </button>
            )}
            {canViewInventory && (
              <button id="rooms-transition-loss-damage" type="button" onClick={() => setView('lossDamage')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${safeView === 'lossDamage' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <AlertTriangle className="w-4 h-4 text-[#A3B18A]" /> Perdas/Avarias
              </button>
            )}
          </div>
        </div>
      </div>

      {safeView === 'registry' && canManageRegistry && <RoomsRegistryManager />}
      {safeView === 'inventory' && canViewInventory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><IntegratedInventoryManager /></div>
      )}
      {safeView === 'linen' && canViewInventory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><LinenCirculationPanel /></div>
      )}
      {safeView === 'laundry' && canViewInventory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><LaundryKanban /></div>
      )}
      {safeView === 'lossDamage' && canViewInventory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><LossDamagePanel /></div>
      )}
    </div>
  );
};
