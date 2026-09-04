import React, { useState } from 'react';
import { CalendarDays, DoorOpen, KeyRound } from 'lucide-react';
import { ReservationsManager } from './ReservationsManager.tsx';
import { CheckInCheckOutModal } from './CheckInCheckOutModal.tsx';
import { WalkInCheckIn } from './WalkInCheckIn.tsx';

export const ReceptionManager: React.FC = () => {
  const [tab, setTab] = useState<'reservations' | 'checkinout' | 'walkin'>('reservations');

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="inline-flex max-w-full overflow-x-auto bg-[#F4F1EA] p-1 rounded-xl border border-[#E6E3D8] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('reservations')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              tab === 'reservations'
                ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-[#588157]" />
            <span>Reservas & Calendário</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('checkinout')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              tab === 'checkinout'
                ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <KeyRound className="w-4 h-4 text-[#BC6C25]" />
            <span>Check-in / Check-out</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('walkin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg whitespace-nowrap transition ${
              tab === 'walkin'
                ? 'bg-white text-[#2C3327] shadow-xs font-bold border border-[#E6E3D8]'
                : 'text-[#6B705C] hover:text-[#2C3327]'
            }`}
          >
            <DoorOpen className="w-4 h-4 text-[#588157]" />
            <span>Novo Check-in / Balcão</span>
          </button>
        </div>
      </div>

      {tab === 'reservations' && <ReservationsManager />}
      {tab === 'checkinout' && <CheckInCheckOutModal />}
      {tab === 'walkin' && <WalkInCheckIn />}
    </div>
  );
};
