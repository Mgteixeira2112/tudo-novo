import React, { useEffect } from 'react';
import { CheckInCheckOutModal } from './CheckInCheckOutModal.tsx';
import { ReceptionCheckInFlow } from './ReceptionCheckInFlow.tsx';

export type ReceptionCheckFlow = 'checkin' | 'checkout';

export const ReceptionCheckFlowPage: React.FC<{ flow: ReceptionCheckFlow }> = ({ flow }) => {
  useEffect(() => {
    if (flow !== 'checkout') return;
    const timer = window.setTimeout(() => {
      document.getElementById('tab-sub-checkout')?.click();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [flow]);

  if (flow === 'checkin') {
    return <ReceptionCheckInFlow />;
  }

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
