import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';

export const OperationalAlertsNavPortal: React.FC = () => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    const resolveTarget = () => {
      const overview = document.getElementById('subnav-overview');
      const anySubnav = document.querySelector('button[id^="subnav-"]');
      const nav = (overview?.parentElement || anySubnav?.parentElement || null) as HTMLElement | null;
      setTarget(nav);
      setImpersonating(Boolean(document.getElementById('btn-exit-impersonation')));
    };

    const handleState = (event: Event) => {
      setActive(Boolean((event as CustomEvent).detail?.active));
    };

    resolveTarget();
    const timer = window.setInterval(resolveTarget, 1000);
    window.addEventListener('hotel:alerts_center_state', handleState as EventListener);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('hotel:alerts_center_state', handleState as EventListener);
    };
  }, []);

  if (!target || impersonating) return null;

  return createPortal(
    <button
      id="subnav-alerts-center"
      onClick={() => window.dispatchEvent(new CustomEvent('hotel:open_operational_alerts'))}
      className={`flex items-center space-x-2 px-2.5 sm:px-3 py-2 rounded-xl whitespace-nowrap shrink-0 transition ${
        active
          ? 'bg-white text-[#2C3327] shadow-xs border border-[#E6E3D8] font-bold'
          : 'text-[#6B705C] hover:text-[#2C3327] hover:bg-white/50'
      }`}
    >
      <Bell className="w-4 h-4 text-[#588157]" />
      <span>Central de Alertas</span>
    </button>,
    target
  );
};
