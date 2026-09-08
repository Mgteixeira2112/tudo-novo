import React, { useMemo, useState } from 'react';
import { BedDouble, Boxes } from 'lucide-react';
import { RoomsRegistryManager } from './RoomsRegistryManager.tsx';
import { IntegratedInventoryManager } from './IntegratedInventoryManager.tsx';
import { useHotel } from '../context/HotelContext.tsx';

export const RoomsTransitionWorkspace: React.FC = () => {
  const { hasPermission } = useHotel();
  const canManageRegistry = hasPermission('manage_room_registry');
  const canViewInventory = hasPermission('view_inventory');

  const initialView = useMemo<'registry' | 'inventory'>(() => {
    if (canManageRegistry) return 'registry';
    return 'inventory';
  }, [canManageRegistry]);

  const [view, setView] = useState<'registry' | 'inventory'>(initialView);

  const safeView =
    view === 'registry' && canManageRegistry ? 'registry' :
    view === 'inventory' && canViewInventory ? 'inventory' :
    initialView;

  if (!canManageRegistry && !canViewInventory) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">
          Seu perfil não possui acesso aos módulos de Cadastro de Quartos ou Estoque Integrado.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E6E3D8] bg-white p-3 shadow-xs">
          <div>
            <p className="text-xs font-bold text-[#2C3327]">Cadastros & Estoque</p>
            <p className="text-[11px] text-[#6B705C] mt-0.5">O Mapa de Quartos operacional agora fica exclusivamente em Recepção → Mapa de Quartos.</p>
          </div>
          <div className="inline-flex max-w-full overflow-x-auto bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
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

      {safeView === 'registry' && canManageRegistry && <RoomsRegistryManager />}
      {safeView === 'inventory' && canViewInventory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><IntegratedInventoryManager /></div>
      )}
    </div>
  );
};
