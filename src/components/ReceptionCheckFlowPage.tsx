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

  const confirmCheckInSubmit = (event: React.FormEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    const confirmed = window.confirm(
      'Confirma o check-in agora?\n\n' +
      'Esta ação irá ocupar o quarto, alterar a reserva para CheckIn, registrar o pagamento informado e criar a tarefa de Governança.\n\n' +
      'Confira os dados do formulário antes de continuar.'
    );

    if (!confirmed) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (flow === 'checkin') {
    return (
      <div onSubmitCapture={confirmCheckInSubmit}>
        <ReceptionCheckInFlow />
      </div>
    );
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
