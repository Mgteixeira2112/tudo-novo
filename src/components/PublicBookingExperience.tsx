import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, MapPin, Phone, Mail, Sparkles } from 'lucide-react';
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

  const handlePrimaryCta = () => {
    document.getElementById('btn-search-availability')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div
      data-public-booking-shell
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

          <button
            type="button"
            onClick={handlePrimaryCta}
            className="mt-7 inline-flex items-center gap-2 px-5 py-3 text-sm font-bold shadow-lg transition hover:brightness-105"
            style={{ backgroundColor: accent, color: primary, borderRadius: radius }}
          >
            <span>{siteSettings?.primaryCtaLabel || 'Reservar agora'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

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
    </div>
  );
};
