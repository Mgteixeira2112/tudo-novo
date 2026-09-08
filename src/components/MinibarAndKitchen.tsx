import React, { useMemo, useState } from 'react';
import { BellRing, ChefHat, Wine } from 'lucide-react';
import { MinibarOperationalModule, OrdersOperationalModule } from './FnbOperationalModules.tsx';
import { useHotel } from '../context/HotelContext.tsx';

type FnbModule = 'minibar' | 'room_service' | 'kitchen';

export const MinibarAndKitchen: React.FC = () => {
  const { hasPermission } = useHotel();
  const canMinibar = hasPermission('manage_minibar_consumption');
  const canRoomService = hasPermission('manage_room_service');
  const canKitchen = hasPermission('manage_kitchen');

  const firstAllowed = useMemo<FnbModule>(() => {
    if (canMinibar) return 'minibar';
    if (canRoomService) return 'room_service';
    return 'kitchen';
  }, [canMinibar, canRoomService]);

  const [module, setModule] = useState<FnbModule>(firstAllowed);
  const safeModule =
    module === 'minibar' && canMinibar ? 'minibar' :
    module === 'room_service' && canRoomService ? 'room_service' :
    module === 'kitchen' && canKitchen ? 'kitchen' :
    firstAllowed;

  if (!canMinibar && !canRoomService && !canKitchen) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">Seu perfil não possui permissão operacional para Frigobar, Room Service ou Cozinha.</div></div>;
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-3 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#2C3327]">A&B — operação separada por função</p>
              <p className="text-[11px] text-[#6B705C] mt-0.5">Cada módulo aparece conforme a permissão operacional do colaborador.</p>
            </div>
            <div className="inline-flex flex-wrap bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
              {canMinibar && <button id="fnb-module-minibar" type="button" onClick={() => setModule('minibar')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'minibar' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><Wine className="w-4 h-4 text-[#A3B18A]" /> Frigobar</button>}
              {canRoomService && <button id="fnb-module-room-service" type="button" onClick={() => setModule('room_service')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'room_service' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><BellRing className="w-4 h-4 text-[#D4A373]" /> Room Service</button>}
              {canKitchen && <button id="fnb-module-kitchen" type="button" onClick={() => setModule('kitchen')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'kitchen' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><ChefHat className="w-4 h-4 text-[#D4A373]" /> Cozinha</button>}
            </div>
          </div>
        </div>
      </div>

      {safeModule === 'minibar' && canMinibar && <MinibarOperationalModule />}
      {safeModule === 'room_service' && canRoomService && <OrdersOperationalModule mode="room_service" />}
      {safeModule === 'kitchen' && canKitchen && <OrdersOperationalModule mode="kitchen" />}
    </div>
  );
};
