import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { OperationalAlertsCenter } from './OperationalAlertsCenter.tsx';
import { AdminTab } from '../types.ts';

const tabButtonIds: Partial<Record<AdminTab, string>> = {
  overview: 'subnav-overview',
  rooms_inventory: 'subnav-rooms-inventory',
  kanbans: 'subnav-kanbans',
  checkinout: 'subnav-checkinout',
  guests: 'subnav-guests',
  fnb: 'subnav-fnb',
  users: 'subnav-users',
  settings: 'subnav-settings'
};

export const OperationalAlertsCenterPortal: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('hotel:open_operational_alerts', handleOpen);
    return () => window.removeEventListener('hotel:open_operational_alerts', handleOpen);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hotel:alerts_center_state', { detail: { active: open } }));
  }, [open]);

  const navigate = (tab: AdminTab) => {
    setOpen(false);
    window.setTimeout(() => {
      const buttonId = tabButtonIds[tab];
      if (buttonId) document.getElementById(buttonId)?.click();
    }, 0);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#FDFBF7]">
      <div className="sticky top-0 z-10 border-b border-[#E6E3D8] bg-[#FDFBF7]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-end">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-[#E6E3D8] bg-white px-3 py-2 text-xs font-semibold text-[#3D4035] hover:bg-[#F4F1EA]"
          >
            <X className="h-4 w-4" /> Fechar Central
          </button>
        </div>
      </div>
      <OperationalAlertsCenter onNavigate={navigate} />
    </div>,
    document.body
  );
};
