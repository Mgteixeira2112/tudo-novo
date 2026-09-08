import React from 'react';
import { Building2, Database, BedDouble } from 'lucide-react';
import { PermissionKey } from '../types.ts';
import { useHotel } from '../context/HotelContext.tsx';
import { KdsDisplaysManager } from './KdsDisplaysManager.tsx';

export type SettingsEntryTab = 'visual' | 'rooms' | 'supabase';

interface SettingsTransitionWorkspaceProps {
  onOpen: (tab: SettingsEntryTab) => void;
}

const entries: Array<{
  tab: SettingsEntryTab;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  permission: PermissionKey;
}> = [
  { tab: 'visual', title: 'Configurações do Hotel', description: 'Identidade, contatos, horários e políticas.', icon: Building2, eyebrow: 'Administração', permission: 'manage_hotel_settings' },
  { tab: 'rooms', title: 'Tarifas & Acomodações', description: 'Categorias de quartos e tarifas base.', icon: BedDouble, eyebrow: 'Cadastros', permission: 'manage_room_rates' },
  { tab: 'supabase', title: 'Sistema / Supabase', description: 'Persistência, diagnóstico e utilitários técnicos.', icon: Database, eyebrow: 'Sistema', permission: 'manage_system_settings' }
];

export const SettingsTransitionWorkspace: React.FC<SettingsTransitionWorkspaceProps> = ({ onOpen }) => {
  const { hasPermission } = useHotel();
  const visibleEntries = entries.filter(entry => hasPermission(entry.permission));
  const canManageSystem = hasPermission('manage_system_settings');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div>
        <h2 className="text-2xl font-black text-[#2C3327]">Configurações & Cadastros do Hotel</h2>
      </div>

      {visibleEntries.length === 0 && !canManageSystem ? (
        <div className="rounded-2xl border border-[#E6E3D8] bg-white p-8 text-center text-sm text-[#6B705C]">Seu perfil não possui permissão para alterar configurações administrativas.</div>
      ) : (
        <>
          {visibleEntries.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {visibleEntries.map(entry => {
                const Icon = entry.icon;
                return (
                  <button id={`settings-entry-${entry.tab}`} key={entry.tab} type="button" onClick={() => onOpen(entry.tab)} className="group rounded-2xl border border-[#E6E3D8] bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#CCD5AE] hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-xl border border-[#E6E3D8] bg-[#F7F8F2] p-3 text-[#588157]"><Icon className="h-5 w-5" /></div>
                      <span className="rounded-full bg-[#F4F1EA] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#6B705C]">{entry.eyebrow}</span>
                    </div>
                    <h3 className="mt-4 text-base font-black text-[#2C3327]">{entry.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#6B705C]">{entry.description}</p>
                    <span className="mt-4 inline-flex text-xs font-bold text-[#3A5A40] group-hover:underline">Abrir módulo</span>
                  </button>
                );
              })}
            </div>
          )}

          {canManageSystem && <KdsDisplaysManager />}
        </>
      )}
    </div>
  );
};
