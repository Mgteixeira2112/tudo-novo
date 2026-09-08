import React from 'react';
import { Building2, Database, BedDouble } from 'lucide-react';
import { HotelSettingsTab } from './HotelSettingsModal.tsx';

interface SettingsTransitionWorkspaceProps {
  onOpen: (tab: HotelSettingsTab) => void;
}

const entries: Array<{
  tab: HotelSettingsTab;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
}> = [
  {
    tab: 'visual',
    title: 'Configurações do Hotel',
    description: 'Identidade, contatos, horários, moeda, taxa de serviço, Wi‑Fi e políticas de reserva.',
    icon: Building2,
    eyebrow: 'Administração'
  },
  {
    tab: 'rooms',
    title: 'Tarifas & Acomodações',
    description: 'Categorias de quartos e tarifas base utilizadas pelo motor de reservas online.',
    icon: BedDouble,
    eyebrow: 'Cadastros'
  },
  {
    tab: 'supabase',
    title: 'Sistema / Supabase',
    description: 'Status da persistência SQL, contagens técnicas e utilitários do banco de dados.',
    icon: Database,
    eyebrow: 'Sistema'
  }
];

export const SettingsTransitionWorkspace: React.FC<SettingsTransitionWorkspaceProps> = ({ onOpen }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
    <div>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#588157]">Administração</span>
      <h2 className="mt-1 text-2xl font-black text-[#2C3327]">Configurações & Cadastros do Hotel</h2>
      <p className="mt-1 max-w-2xl text-sm text-[#6B705C]">
        Funções administrativas separadas por responsabilidade. A persistência e as regras existentes permanecem as mesmas.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {entries.map(entry => {
        const Icon = entry.icon;
        return (
          <button
            key={entry.tab}
            type="button"
            onClick={() => onOpen(entry.tab)}
            className="group rounded-2xl border border-[#E6E3D8] bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#CCD5AE] hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-xl border border-[#E6E3D8] bg-[#F7F8F2] p-3 text-[#588157]">
                <Icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#F4F1EA] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#6B705C]">
                {entry.eyebrow}
              </span>
            </div>
            <h3 className="mt-4 text-base font-black text-[#2C3327]">{entry.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#6B705C]">{entry.description}</p>
            <span className="mt-4 inline-flex text-xs font-bold text-[#3A5A40] group-hover:underline">Abrir módulo</span>
          </button>
        );
      })}
    </div>
  </div>
);
