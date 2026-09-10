import React from 'react';
import { Building2, CheckCircle2, Images, MapPin } from 'lucide-react';
import { PublicSiteSettings } from '../services/publicSite.ts';

type Props = {
  settings: PublicSiteSettings;
  institutionalOrder: string[];
};

const TEMPLATE_LABELS: Record<string, string> = {
  classic: 'Clássico',
  beach: 'Praia',
  boutique: 'Boutique',
  urban: 'Urbano',
  nature: 'Natureza'
};

export const PublicSiteTemplatePreview: React.FC<Props> = ({ settings, institutionalOrder }) => {
  const key = settings.templateKey || 'classic';
  const isBeach = key === 'beach';
  const isBoutique = key === 'boutique';
  const isUrban = key === 'urban';
  const isNature = key === 'nature';
  const primary = settings.primaryColor;
  const secondary = settings.secondaryColor;
  const accent = settings.accentColor;
  const background = settings.backgroundColor;
  const text = settings.textColor;
  const radius = isUrban ? '0px' : isNature ? '30px' : isBeach ? '24px' : isBoutique ? '8px' : settings.borderRadius;

  const heroClass = isBoutique
    ? 'min-h-[370px] flex items-end px-8 py-12 sm:px-12'
    : isBeach
      ? 'min-h-[330px] flex items-center px-8 py-12 sm:px-12'
      : isUrban
        ? 'min-h-[280px] flex items-center px-8 py-10 sm:px-12'
        : isNature
          ? 'min-h-[340px] flex items-center px-8 py-12 sm:px-12'
          : 'min-h-[275px] flex items-center justify-center px-8 py-10';

  const heroTextClass = isBeach || isUrban || isBoutique ? 'max-w-2xl text-left' : 'mx-auto max-w-2xl text-center';
  const titleClass = isBoutique
    ? 'mt-3 text-5xl font-black leading-none sm:text-6xl'
    : isUrban
      ? 'mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl'
      : isBeach
        ? 'mt-3 text-4xl font-black sm:text-5xl'
        : isNature
          ? 'mt-3 text-4xl font-black sm:text-5xl'
          : 'mt-3 text-4xl font-black';

  const shellStyle: React.CSSProperties = {
    backgroundColor: background,
    color: text,
    fontFamily: settings.bodyFont,
    borderRadius: radius
  };

  const heroStyle: React.CSSProperties = {
    backgroundColor: primary,
    color: background,
    borderRadius: isNature ? `0 0 ${radius} ${radius}` : isBoutique ? '0px' : radius
  };

  const sectionClass = isUrban
    ? 'grid gap-4 border-t border-b px-6 py-7 sm:grid-cols-[0.8fr_1.2fr]'
    : isBoutique
      ? 'grid gap-6 px-7 py-10 sm:grid-cols-[0.7fr_1.3fr]'
      : isBeach
        ? 'grid gap-5 px-7 py-8 sm:grid-cols-[1fr_1.2fr]'
        : isNature
          ? 'grid gap-5 px-7 py-8 sm:grid-cols-[0.9fr_1.1fr]'
          : 'grid gap-5 px-7 py-8 sm:grid-cols-[0.9fr_1.1fr]';

  return (
    <div className="overflow-hidden border border-[#D8D3C4] shadow-sm" style={shellStyle}>
      <div className={heroClass} style={heroStyle}>
        <div className={heroTextClass}>
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Template {TEMPLATE_LABELS[key] || key}</p>
          <h3 className={titleClass} style={{ fontFamily: settings.headingFont }}>{settings.heroTitle || 'Nome do hotel'}</h3>
          <p className={`mt-3 text-sm opacity-85 ${isBoutique ? 'max-w-lg text-base' : ''}`}>{settings.heroSubtitle || 'Subtítulo do hotel'}</p>
          {settings.showBookingBar && (
            <span
              className={`mt-6 inline-block px-5 py-3 text-xs font-black ${isUrban ? 'uppercase tracking-wider' : ''}`}
              style={{ backgroundColor: accent, color: primary, borderRadius: isUrban ? '0px' : isBeach ? '999px' : radius }}
            >
              {settings.primaryCtaLabel}
            </span>
          )}
        </div>
      </div>

      <div className={sectionClass} style={{ borderColor: `${secondary}33` }}>
        <div
          className="flex min-h-36 items-center justify-center p-5"
          style={{ backgroundColor: isUrban ? `${primary}0D` : primary, color: isUrban ? primary : background, borderRadius: isUrban ? '0px' : radius }}
        >
          <div className="text-center">
            {isNature ? <MapPin className="mx-auto h-7 w-7" style={{ color: accent }} /> : isBeach ? <Images className="mx-auto h-7 w-7" style={{ color: accent }} /> : <Building2 className="mx-auto h-7 w-7" style={{ color: accent }} />}
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] opacity-70">Sobre o hotel</p>
          </div>
        </div>
        <div className={isBoutique ? 'sm:pt-6' : ''}>
          <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: secondary }}>Conteúdo institucional</p>
          <h4 className={`${isBoutique ? 'mt-3 text-3xl' : 'mt-2 text-2xl'} font-black`} style={{ fontFamily: settings.headingFont }}>{settings.sectionContent.aboutTitle || 'Uma estadia pensada para receber bem'}</h4>
          <p className="mt-3 text-sm leading-6 opacity-75">{settings.sectionContent.aboutBody || 'O texto padrão continua sendo usado enquanto este campo estiver vazio.'}</p>
        </div>
      </div>

      <div className={`grid gap-3 px-6 pb-7 ${isUrban ? 'sm:grid-cols-5' : isBoutique ? 'sm:grid-cols-3' : 'sm:grid-cols-5'}`}>
        {institutionalOrder.map((item, index) => (
          <div
            key={item}
            className={`flex min-h-16 items-center gap-2 border px-3 py-3 text-xs font-bold ${isBoutique && index === 0 ? 'sm:col-span-2' : ''}`}
            style={{ borderColor: `${secondary}44`, borderRadius: isUrban ? '0px' : radius, backgroundColor: isNature ? `${secondary}0D` : '#fff' }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: secondary }} />
            <span>{item === 'about' ? 'Sobre' : item === 'services' ? 'Serviços' : item === 'gallery' ? 'Galeria' : item === 'location' ? 'Localização' : 'Contato'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};