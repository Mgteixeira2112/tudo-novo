import React, { useEffect } from 'react';
import { IntegratedInventoryManager } from './IntegratedInventoryManager.tsx';

export type InventoryStandaloneView = 'items' | 'kardex' | 'replenishment';

const VIEW_TAB_ID: Record<InventoryStandaloneView, string> = {
  items: 'tab-view-items',
  kardex: 'tab-view-kardex',
  replenishment: 'tab-view-replenishment'
};

export const InventoryStandalonePage: React.FC<{ view: InventoryStandaloneView }> = ({ view }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById(VIEW_TAB_ID[view])?.click();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [view]);

  return (
    <div className="inventory-standalone-page">
      <style>{`
        .inventory-standalone-page #tab-view-items,
        .inventory-standalone-page #tab-view-kardex,
        .inventory-standalone-page #tab-view-replenishment {
          display: none !important;
        }
      `}</style>
      <IntegratedInventoryManager />
    </div>
  );
};
