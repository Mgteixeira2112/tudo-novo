import React from 'react';
import { useHotel } from '../context/HotelContext.tsx';
import { AdminTab } from '../types.ts';
import { SectorDashboard } from './SectorDashboard.tsx';
import { HomeDashboard as GeneralHomeDashboard } from './GeneralHomeDashboard.tsx';

interface HomeDashboardProps {
  onNavigate: (tab: AdminTab) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useHotel();

  if (!currentUser) return null;

  if (currentUser.sector === 'Geral') {
    return <GeneralHomeDashboard onNavigate={onNavigate} />;
  }

  return <SectorDashboard onNavigate={onNavigate} />;
};
