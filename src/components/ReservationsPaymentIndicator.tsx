import React, { useEffect } from 'react';
import { useHotel } from '../context/HotelContext.tsx';

const ACTIVE_RESERVATION_STATUSES = new Set(['Pendente', 'Confirmada', 'CheckIn']);

export const ReservationsPaymentIndicator: React.FC = () => {
  const { reservations } = useHotel();

  useEffect(() => {
    const byCardTitle = new Map(
      reservations.map(reservation => [
        `Abrir ${reservation.code} · ${reservation.guestName}`,
        reservation
      ])
    );

    const syncIndicators = () => {
      document
        .querySelectorAll<HTMLButtonElement>('button[title^="Abrir "]')
        .forEach(button => {
          const card = button.parentElement;
          if (!card?.classList.contains('z-10')) return;

          card.removeAttribute('data-payment-indicator');
          card.removeAttribute('data-reservation-status');

          const originalTitle = button.dataset.paymentBaseTitle || button.title;
          button.dataset.paymentBaseTitle = originalTitle;
          button.title = originalTitle;

          const reservation = byCardTitle.get(originalTitle);
          if (!reservation || !ACTIVE_RESERVATION_STATUSES.has(reservation.status)) return;
          if (reservation.paymentStatus === 'Pago') return;

          card.dataset.paymentIndicator = reservation.paymentStatus;
          card.dataset.reservationStatus = reservation.status;
          button.title = `${originalTitle} · Pagamento ${reservation.paymentStatus.toLowerCase()}`;
        });
    };

    const frame = window.requestAnimationFrame(syncIndicators);
    const observer = new MutationObserver(syncIndicators);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document
        .querySelectorAll<HTMLElement>('[data-payment-indicator]')
        .forEach(card => {
          card.removeAttribute('data-payment-indicator');
          card.removeAttribute('data-reservation-status');
        });
      document
        .querySelectorAll<HTMLButtonElement>('button[data-payment-base-title]')
        .forEach(button => {
          button.title = button.dataset.paymentBaseTitle || button.title;
          delete button.dataset.paymentBaseTitle;
        });
    };
  }, [reservations]);

  return (
    <style>{`
      div.z-10.mx-1.my-3.h-10.rounded-lg[data-payment-indicator] {
        position: relative;
      }

      div.z-10.mx-1.my-3.h-10.rounded-lg[data-payment-indicator]::after {
        content: '$';
        position: absolute;
        top: 3px;
        z-index: 30;
        width: 13px;
        height: 13px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        line-height: 1;
        font-weight: 900;
        pointer-events: none;
        box-shadow: 0 1px 3px rgba(44, 51, 39, 0.22);
      }

      div.z-10.mx-1.my-3.h-10.rounded-lg[data-reservation-status='Pendente']::after {
        right: 59px;
      }

      div.z-10.mx-1.my-3.h-10.rounded-lg[data-reservation-status='Confirmada']::after {
        right: 31px;
      }

      div.z-10.mx-1.my-3.h-10.rounded-lg[data-reservation-status='CheckIn']::after {
        right: 4px;
      }

      div.z-10.mx-1.my-3.h-10.rounded-lg[data-payment-indicator='Pendente']::after {
        background: #FFF4E6;
        border: 1px solid #C98221;
        color: #8A4D0F;
      }

      div.z-10.mx-1.my-3.h-10.rounded-lg[data-payment-indicator='Parcial']::after {
        background: #E8F1FF;
        border: 1px solid #5B7FAF;
        color: #315A88;
      }
    `}</style>
  );
};
