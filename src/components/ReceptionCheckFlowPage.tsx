import React, { useEffect } from 'react';
import { CheckInCheckOutModal } from './CheckInCheckOutModal.tsx';

export type ReceptionCheckFlow = 'checkin' | 'checkout';

export const ReceptionCheckFlowPage: React.FC<{ flow: ReceptionCheckFlow }> = ({ flow }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById(flow === 'checkin' ? 'tab-sub-checkin' : 'tab-sub-checkout')?.click();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [flow]);

  return (
    <div className="reception-check-flow-page">
      <style>{`
        .reception-check-flow-page #tab-sub-checkin,
        .reception-check-flow-page #tab-sub-checkout {
          display: none !important;
        }
      `}</style>
      <CheckInCheckOutModal />
    </div>
  );
};
