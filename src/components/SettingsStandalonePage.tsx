import React, { useEffect, useState } from 'react';
import { HotelSettingsModal } from './HotelSettingsModal.tsx';
import { KdsDisplaysManager } from './KdsDisplaysManager.tsx';

export type SettingsStandaloneView = 'hotel' | 'rooms' | 'system' | 'kds';

export const SettingsStandalonePage: React.FC<{ view: SettingsStandaloneView }> = ({ view }) => {
  const [ready, setReady] = useState(view === 'hotel' || view === 'kds');

  useEffect(() => {
    if (view === 'kds') {
      setReady(true);
      return;
    }

    setReady(view === 'hotel');
    const timer = window.setTimeout(() => {
      if (view === 'rooms') {
        document.getElementById('tab-settings-rooms')?.click();
      } else if (view === 'system') {
        document.getElementById('tab-settings-supabase')?.click();
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [view]);

  if (view === 'kds') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <KdsDisplaysManager />
      </div>
    );
  }

  return (
    <div className={`settings-standalone-page transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <style>{`
        .settings-standalone-page > .fixed.inset-0 {
          position: static !important;
          inset: auto !important;
          display: block !important;
          overflow: visible !important;
          background: transparent !important;
          backdrop-filter: none !important;
          padding: 0 !important;
        }
        .settings-standalone-page > .fixed.inset-0 > div {
          width: 100% !important;
          max-width: none !important;
          max-height: none !important;
          overflow: visible !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .settings-standalone-page > .fixed.inset-0 > div > div:nth-child(1),
        .settings-standalone-page > .fixed.inset-0 > div > div:nth-child(2) {
          display: none !important;
        }
        .settings-standalone-page > .fixed.inset-0 > div > div:nth-child(3) {
          overflow: visible !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <HotelSettingsModal isOpen onClose={() => undefined} />
      </div>
    </div>
  );
};
