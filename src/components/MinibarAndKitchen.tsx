import React, { useState } from 'react';
import { BellRing, ChefHat, UtensilsCrossed, Wine } from 'lucide-react';
import { MinibarOperationalModule, OrdersOperationalModule } from './FnbOperationalModules.tsx';

export const MinibarAndKitchen: React.FC = () => {
  const [module, setModule] = useState<'minibar' | 'room_service' | 'kitchen'>('minibar');

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-3 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#2C3327]">A&B — operação separada por função</p>
              <p className="text-[11px] text-[#6B705C] mt-0.5">Frigobar, Room Service e Cozinha agora possuem contextos operacionais independentes, usando as mesmas regras e APIs existentes.</p>
            </div>
            <div className="inline-flex flex-wrap bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
              <button id="fnb-module-minibar" type="button" onClick={() => setModule('minibar')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${module === 'minibar' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <Wine className="w-4 h-4 text-[#A3B18A]" /> Frigobar
              </button>
              <button id="fnb-module-room-service" type="button" onClick={() => setModule('room_service')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${module === 'room_service' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <BellRing className="w-4 h-4 text-[#D4A373]" /> Room Service
              </button>
              <button id="fnb-module-kitchen" type="button" onClick={() => setModule('kitchen')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${module === 'kitchen' ? 'bg-[#2C3327] text-white shadow-xs font-bold' : 'text-[#6B705C] hover:text-[#2C3327]'}`}>
                <ChefHat className="w-4 h-4 text-[#D4A373]" /> Cozinha
              </button>
            </div>
          </div>
        </div>
      </div>

      {module === 'minibar' && <MinibarOperationalModule />}
      {module === 'room_service' && <OrdersOperationalModule mode="room_service" />}
      {module === 'kitchen' && <OrdersOperationalModule mode="kitchen" />}
    </div>
  );
};
