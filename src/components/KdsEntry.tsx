import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { KdsDisplay } from './KdsDisplay.tsx';
import { KdsOperationsDisplay } from './KdsOperationsDisplay.tsx';
import { getPublicKdsDisplay, PublicKdsDisplay } from '../services/kdsDisplays.ts';

export const KdsEntry: React.FC<{ token: string }> = ({ token }) => {
  const [display, setDisplay] = useState<PublicKdsDisplay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getPublicKdsDisplay(token)
      .then(data => {
        if (active) setDisplay(data);
      })
      .catch(() => {
        if (active) setDisplay(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11130F] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#CCD5AE]" />
          <p className="mt-4 text-sm font-bold tracking-wide">Conectando à tela KDS...</p>
        </div>
      </div>
    );
  }

  if (display?.preset === 'operations') {
    return <KdsOperationsDisplay token={token} display={display} />;
  }

  return <KdsDisplay token={token} />;
};
