import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  BedDouble,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { OnlineBookingEngine } from './OnlineBookingEngine.tsx';
import { loadPublicSiteSettings, PublicSiteSettings } from '../services/publicSite.ts';

export const PublicBookingExperience: React.FC = () => {
  const { settings } = useHotel();
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettings | null>(null);
  const [loadingSite, setLoadingSite] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadPublicSiteSettings('hotel_1')
      .then(config => {
        if (!cancelled) setSiteSettings(config);
      })
      .catch(err => {
        console.warn('[PublicBookingExperience] Falha ao carregar personalização pública; usando visual legado.', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingSite(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const primary = siteSettings?.primaryColor || '#2C3327';
  const secondary = siteSettings?.secondaryColor || '#588157';
  const accent = siteSettings?.accentColor || '#D4A373';
  const background = siteSettings?.backgroundColor || '#FDFBF7';
  const text = siteSettings?.textColor || '#3D4035';
  const radius = siteSettings?.borderRadius || '16px';
  const headingFont = siteSettings?.headingFont || 'inherit';
  const bodyFont = siteSettings?.bodyFont || 'inherit';
  const heroTitle = siteSettings?.heroTitle || settings?.hotelName || 'Hotel';
  const heroSubtitle = siteSettings?.heroSubtitle || settings?.tagline || '';

  const amenities = useMemo(() => {
    const unique = new Set<string>();
    for (const roomType of settings?.roomTypes || []) {
      for (const amenity of roomType.amenities || []) {
        const value = amenity?.trim();
        if (value) unique.add(value);
      }
    }
    return Array.from(unique).slice(0, 8);
  }, [settings?.roomTypes]);

  const handlePrimaryCta = () => {
    document.getElementById('btn-search-availability')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const modularSections = useMemo(() => {
    const sections: Array<{ key: 'about' | 'services'; node: React.ReactNode }> = [];

    if (siteSettings?.showAbout !== false) {
      sections.push({
        key: 'about',
        node: (
          <section id="public-about" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div
                className="flex min-h-64 items-center justify-center p-8"
                style={{ backgroundColor: primary, borderRadius: radius }}
              >
                <div className="text-center" style={{ color: background }}>
                  <Building2 className="mx-auto h-10 w-10" style={{ color: accent }} />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] opacity-70">Conheça o hotel</p>
                  <p className="mt-2 text-2xl font-bold" style={{ fontFamily: headingFont }}>
                    {settings?.hotelName || heroTitle}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>
                  Sobre nós
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: primary, fontFamily: headingFont }}>
                  Uma estadia pensada para receber bem
                </h2>
                <p className="mt-4 text-sm leading-7 opacity-80 sm:text-base">
                  {settings?.description || settings?.tagline || 'Hospitalidade, conforto e uma experiência simples do primeiro contato até o check-out.'}
                </p>
                {settings?.cityState && (
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: secondary }}>
                    <MapPin className="h-4 w-4" />
                    <span>{settings.cityState}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )
      });
    }

    if (siteSettings?.showServices !== false) {
      sections.push({
        key: 'services',
        node: (
          <section id="public-services" className="px-4 py-12 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}>
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>
                  Serviços e comodidades
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: primary, fontFamily: headingFont }}>
                  Tudo o que faz parte da sua experiência
                </h2>
                <p className="mt-3 text-sm leading-6 opacity-75">
                  Comodidades cadastradas nas acomodações do estabelecimento e apresentadas automaticamente no site público.
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(amenities.length ? amenities : ['Reserva direta', 'Atendimento do hotel', 'Acomodações selecionadas', 'Política de reserva']).map((amenity, index) => (
                  <div
                    key={`${amenity}-${index}`}
                    className="flex items-start gap-3 border bg-white p-4 shadow-sm"
                    style={{ borderColor: `${secondary}33`, borderRadius: radius }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${secondary}18`, color: secondary }}
                    >
                      {index % 2 === 0 ? <CheckCircle2 className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
                    </div>
                    <span className="pt-2 text-sm font-semibold" style={{ color: primary }}>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      });
    }

    const order = siteSettings?.sectionOrder || [];
    return sections.sort((a, b) => {
      const aIndex = order.indexOf(a.key);
      const bIndex = order.indexOf(b.key);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }, [amenities, background, headingFont, heroTitle, primary, radius, secondary, settings, siteSettings]);

  return (
    <div
      data-public-booking-shell
      data-hide-booking={siteSettings?.showBookingBar === false ? 'true' : 'false'}
      data-hide-accommodations={siteSettings?.showAccommodations === false ? 'true' : 'false'}
      style={{
        backgroundColor: background,
        color: text,
        fontFamily: bodyFont,
        ['--site-primary' as string]: primary,
        ['--site-secondary' as string]: secondary,
        ['--site-accent' as string]: accent,
        ['--site-radius' as string]: radius
      }}
    >
      <style>{`
        [data-public-booking-engine] > div > section:first-child { display: none !important; }
        [data-public-booking-engine] > div > div:nth-child(2) { margin-top: 0 !important; padding-top: 1.5rem; }
        [data-public-booking-shell][data-hide-booking="true"] [data-public-booking-engine] > div > div:nth-child(2) { display: none !important; }
        [data-public-booking-shell][data-hide-accommodations="true"] [data-public-booking-engine] #available-room-types { display: none !important; }
        [data-public-booking-engine] > div > section:nth-of-type(3) { display: none !important; }
        [data-public-booking-engine] #btn-search-availability,
        [data-public-booking-engine] button[id^="btn-reserve-"] {
          background-color: var(--site-primary) !important;
          border-radius: var(--site-radius) !important;
        }
        [data-public-booking-engine] #btn-search-availability:hover,
        [data-public-booking-engine] button[id^="btn-reserve-"]:hover {
          filter: brightness(1.08);
        }
      `}</style>

      <section
        id="public-hero"
        className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
        style={{ backgroundColor: primary, color: background }}
      >
        {siteSettings?.heroMediaUrl && siteSettings.heroMediaType === 'image' && (
          <>
            <img
              src={siteSettings.heroMediaUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div
            className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ borderColor: accent, color: accent, backgroundColor: 'rgba(0,0,0,0.12)' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Reserva direta</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: headingFont }}>
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-base opacity-90 sm:text-lg">
              {heroSubtitle}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs opacity-80">
            {settings?.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{settings.address}</span>}
            {settings?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{settings.phone}</span>}
            {settings?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{settings.email}</span>}
          </div>

          {siteSettings?.showBookingBar !== false && (
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="mt-7 inline-flex items-center gap-2 px-5 py-3 text-sm font-bold shadow-lg transition hover:brightness-105"
              style={{ backgroundColor: accent, color: primary, borderRadius: radius }}
            >
              <span>{siteSettings?.primaryCtaLabel || 'Reservar agora'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {loadingSite && (
            <span className="ml-3 inline-flex align-middle opacity-50" title="Carregando personalização do site">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          )}
        </div>
      </section>

      <div data-public-booking-engine>
        <OnlineBookingEngine />
      </div>

      {modularSections.map(section => (
        <React.Fragment key={section.key}>{section.node}</React.Fragment>
      ))}
    </div>
  );
};
