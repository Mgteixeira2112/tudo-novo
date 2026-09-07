import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KdsDisplaysManager } from './KdsDisplaysManager.tsx';

export const KdsSettingsPortal: React.FC = () => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const resolveTarget = () => {
      const button = Array.from(document.querySelectorAll('button')).find(node =>
        node.textContent?.includes('Abrir Painel de Configurações & SQL')
      );
      const container = button?.closest('.max-w-7xl') as HTMLElement | null;
      setTarget(container && document.body.contains(container) ? container : null);
    };

    resolveTarget();
    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="mt-5">
      <KdsDisplaysManager />
    </div>,
    target
  );
};
