import React, { useEffect, useState } from 'react';
import { KanbanWorkspace } from './KanbanWorkspace.tsx';

export type OperationalStandaloneView = 'roomMap' | 'tasks' | 'housekeeping' | 'maintenance';

const NAVIGATION_KEY = 'novohotel:kanban-navigation';

export const OperationalStandalonePage: React.FC<{ view: OperationalStandaloneView }> = ({ view }) => {
  const [ready, setReady] = useState(false);

  useState(() => {
    try {
      const expectedView = view === 'tasks' ? 'tasks' : 'rooms';
      const existing = sessionStorage.getItem(NAVIGATION_KEY);
      if (existing) {
        const parsed = JSON.parse(existing) as { view?: string };
        if (parsed?.view === expectedView) return 0;
      }
      sessionStorage.setItem(
        NAVIGATION_KEY,
        JSON.stringify({ view: expectedView })
      );
    } catch {}
    return 0;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (view === 'housekeeping') {
        document.getElementById('tab-operations-housekeeping')?.click();
      } else if (view === 'maintenance') {
        document.getElementById('tab-operations-maintenance')?.click();
      } else if (view === 'roomMap') {
        document.getElementById('tab-operations-rooms')?.click();
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [view]);

  return (
    <>
      <style>{`.standalone-operation-workspace > div > div:first-child { display: none; }`}</style>
      <div className={`standalone-operation-workspace transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <KanbanWorkspace />
      </div>
    </>
  );
};
