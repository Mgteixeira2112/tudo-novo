import React from 'react';
import { useHotel } from '../context/HotelContext.tsx';
import { ReservationsManager } from './ReservationsManager.tsx';

/**
 * Compatibilidade para rotas antigas que ainda apontam para o AdminTab `checkinout`.
 * A operação atual usa páginas independentes para Reservas, Check-in, Check-out e Check-in Direto.
 * Este fallback nunca deve reabrir o seletor combinado legado.
 */
export const ReceptionManager: React.FC = () => {
  const { reservations } = useHotel();

  const openSelectedReservationFlow = () => {
    const drawer = document.querySelector('div[class~="z-[110]"][class~="inset-0"] > aside');
    const reservationCode = drawer?.querySelector('header h3')?.textContent?.trim();
    const selectedReservation = reservationCode
      ? reservations.find(item => item.code === reservationCode)
      : undefined;

    const module = selectedReservation?.status === 'CheckIn' ? 'checkout' : 'checkin';
    window.dispatchEvent(new CustomEvent('hotel:navigate-standalone-module', { detail: { module } }));
  };

  return <ReservationsManager onOpenCheckInOut={openSelectedReservationFlow} />;
};