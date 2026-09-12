import React from 'react';
import { ReservationsManager } from './ReservationsManager.tsx';

/**
 * Compatibilidade para rotas antigas que ainda apontam para o AdminTab `checkinout`.
 * A operação atual usa páginas independentes para Reservas, Check-in, Check-out e Check-in Direto.
 * Este fallback nunca deve reabrir o seletor combinado legado.
 */
export const ReceptionManager: React.FC = () => <ReservationsManager />;
