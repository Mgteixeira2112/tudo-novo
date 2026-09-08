import React, { useMemo, useState } from 'react';
import { BellRing, BookOpen, ChefHat, Wine } from 'lucide-react';
import { MinibarOperationalModule, OrdersOperationalModule } from './FnbOperationalModules.tsx';
import { MenuManagementModule } from './MenuManagementModule.tsx';
import { useHotel } from '../context/HotelContext.tsx';

type FnbModule = 'minibar' | 'room_service' | 'kitchen' | 'menu';

export const MinibarAndKitchen: React.FC = () => {
  const { hasPermission } = useHotel();

  const canViewMinibar = hasPermission('view_minibar');
  const canManageMinibar = hasPermission('manage_minibar');
  const canViewRoomService = hasPermission('view_room_service');
  const canManageRoomService = hasPermission('manage_room_service');
  const canViewKitchen = hasPermission('view_kitchen');
  const canManageKitchen = hasPermission('manage_kitchen');
  const canManageMenu = hasPermission('manage_menu');

  const firstAllowed = useMemo<FnbModule>(() => {
    if (canViewMinibar) return 'minibar';
    if (canViewRoomService) return 'room_service';
    if (canViewKitchen) return 'kitchen';
    return 'menu';
  }, [canViewMinibar, canViewRoomService, canViewKitchen]);

  const [module, setModule] = useState<FnbModule>(firstAllowed);
  const safeModule =
    module === 'minibar' && canViewMinibar ? 'minibar' :
    module === 'room_service' && canViewRoomService ? 'room_service' :
    module === 'kitchen' && canViewKitchen ? 'kitchen' :
    module === 'menu' && canManageMenu ? 'menu' :
    firstAllowed;

  if (!canViewMinibar && !canViewRoomService && !canViewKitchen && !canManageMenu) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">Seu perfil não possui permissão para acessar os módulos de Alimentos e Bebidas.</div></div>;
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white px-4 py-3 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#2C3327]">Alimentos e Bebidas</h2>
            <div className="inline-flex flex-wrap bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
              {canViewMinibar && <button id="fnb-module-minibar" type="button" onClick={() => setModule('minibar')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'minibar' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><Wine className="w-4 h-4 text-[#A3B18A]" /> Frigobar</button>}
              {canViewRoomService && <button id="fnb-module-room-service" type="button" onClick={() => setModule('room_service')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'room_service' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><BellRing className="w-4 h-4 text-[#D4A373]" /> Room Service</button>}
              {canViewKitchen && <button id="fnb-module-kitchen" type="button" onClick={() => setModule('kitchen')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'kitchen' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><ChefHat className="w-4 h-4 text-[#D4A373]" /> Cozinha</button>}
              {canManageMenu && <button id="fnb-module-menu" type="button" onClick={() => setModule('menu')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${safeModule === 'menu' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}><BookOpen className="w-4 h-4 text-[#CCD5AE]" /> Cardápio</button>}
            </div>
          </div>
        </div>
      </div>

      {safeModule === 'minibar' && canViewMinibar && <MinibarOperationalModule canManage={canManageMinibar} />}
      {safeModule === 'room_service' && canViewRoomService && <OrdersOperationalModule mode="room_service" canManage={canManageRoomService} />}
      {safeModule === 'kitchen' && canViewKitchen && <OrdersOperationalModule mode="kitchen" canManage={canManageKitchen} />}
      {safeModule === 'menu' && canManageMenu && <MenuManagementModule />}
    </div>
  );
};
