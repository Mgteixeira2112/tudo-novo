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
  Building2,
  Navigation,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import { useHotel } from '../context/HotelContext.tsx';
import { OnlineBookingEngine } from './OnlineBookingEngine.tsx';
import { PublicSiteGallerySection } from './PublicSiteGallerySection.tsx';
import { loadPublicSiteSettings, PublicSiteSettings } from '../services/publicSite.ts';

const VALID_TEMPLATES = new Set(['classic', 'beach', 'boutique', 'urban', 'nature']);

export const PublicBookingExperience: React.FC = () => {
  const { settings } = useHotel();
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettings | null>(null);
  const [loadingSite, setLoadingSite] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPublicSiteSettings('hotel_1')
      .then(config => { if (!cancelled) setSiteSettings(config); })
      .catch(err => console.warn('[PublicBookingExperience] Falha ao carregar personalização pública; usando visual legado.', err))
      .finally(() => { if (!cancelled) setLoadingSite(false); });
    return () => { cancelled = true; };
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
  const content = siteSettings?.sectionContent || {};
  const templateKey = VALID_TEMPLATES.has(siteSettings?.templateKey || '') ? siteSettings!.templateKey : 'classic';

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

  const hotelLocationLabel = [settings?.address, settings?.cityState].filter(Boolean).join(', ');
  const publicAddress = content.locationAddress || hotelLocationLabel;
  const mapQuery = content.locationMapQuery || publicAddress;
  const mapsUrl = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : undefined;
  const contactPhone = content.contactPhone || settings?.phone || '';
  const contactWhatsapp = content.contactWhatsapp || '';
  const contactEmail = content.contactEmail || settings?.email || '';
  const phoneHref = contactPhone ? `tel:${contactPhone.replace(/[^+\d]/g, '')}` : undefined;
  const whatsappDigits = contactWhatsapp.replace(/\D/g, '');
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined;
  const emailHref = contactEmail ? `mailto:${contactEmail}` : undefined;

  const handlePrimaryCta = () => {
    document.getElementById('btn-search-availability')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  const navigationItems = useMemo(() => {
    const items = [
      { key: 'about', label: 'Sobre', target: 'public-about', visible: siteSettings?.showAbout !== false },
      { key: 'services', label: 'Serviços', target: 'public-services', visible: siteSettings?.showServices !== false },
      { key: 'gallery', label: 'Galeria', target: 'public-gallery', visible: siteSettings?.showGallery !== false },
      { key: 'location', label: 'Localização', target: 'public-location', visible: siteSettings?.showLocation !== false },
      { key: 'contact', label: 'Contato', target: 'public-contact', visible: siteSettings?.showContact !== false }
    ].filter(item => item.visible);

    const order = siteSettings?.sectionOrder || [];
    items.sort((a, b) => {
      const aIndex = order.indexOf(a.key);
      const bIndex = order.indexOf(b.key);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return [{ key: 'hero', label: 'Início', target: 'public-hero', visible: true }, ...items];
  }, [siteSettings]);

  const modularSections = useMemo(() => {
    const sections: Array<{ key: 'about' | 'services' | 'gallery' | 'location' | 'contact'; node: React.ReactNode }> = [];

    if (siteSettings?.showAbout !== false) {
      sections.push({
        key: 'about',
        node: (
          <section id="public-about" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="relative flex min-h-64 items-center justify-center overflow-hidden p-8" style={{ backgroundColor: primary, borderRadius: radius }}>
                {content.aboutImageUrl ? (
                  <>
                    <img src={content.aboutImageUrl} alt={content.aboutTitle || `Sobre ${settings?.hotelName || heroTitle}`} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/20" />
                  </>
                ) : (
                  <div className="text-center" style={{ color: background }}>
                    <Building2 className="mx-auto h-10 w-10" style={{ color: accent }} />
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] opacity-70">Conheça o hotel</p>
                    <p className="mt-2 text-2xl font-bold" style={{ fontFamily: headingFont }}>{settings?.hotelName || heroTitle}</p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>Sobre nós</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: primary, fontFamily: headingFont }}>
                  {content.aboutTitle || 'Uma estadia pensada para receber bem'}
                </h2>
                <p className="mt-4 text-sm leading-7 opacity-80 sm:text-base">
                  {content.aboutBody || settings?.description || settings?.tagline || 'Hospitalidade, conforto e uma experiência simples do primeiro contato até o check-out.'}
                </p>
                {settings?.cityState && <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: secondary }}><MapPin className="h-4 w-4" /><span>{settings.cityState}</span></div>}
              </div>
            </div>
          </section>
        )
      });
    }

    if (siteSettings?.showServices !== false) {
      const serviceItems = content.servicesItems?.length ? content.servicesItems : amenities;
      sections.push({
        key: 'services',
        node: (
          <section id="public-services" className="px-4 py-12 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}>
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>Serviços e comodidades</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: primary, fontFamily: headingFont }}>
                  {content.servicesTitle || 'Tudo o que faz parte da sua experiência'}
                </h2>
                <p className="mt-3 text-sm leading-6 opacity-75">
                  {content.servicesBody || 'Comodidades cadastradas nas acomodações do estabelecimento e apresentadas automaticamente no site público.'}
                </p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(serviceItems.length ? serviceItems : ['Reserva direta', 'Atendimento do hotel', 'Acomodações selecionadas', 'Política de reserva']).slice(0, 8).map((amenity, index) => (
                  <div key={`${amenity}-${index}`} className="flex items-start gap-3 border bg-white p-4 shadow-sm" style={{ borderColor: `${secondary}33`, borderRadius: radius }}>
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${secondary}18`, color: secondary }}>
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

    if (siteSettings?.showGallery !== false) {
      sections.push({
        key: 'gallery',
        node: (
          <PublicSiteGallerySection
            items={content.galleryItems}
            title={content.galleryTitle}
            primary={primary}
            secondary={secondary}
            accent={accent}
            radius={radius}
            headingFont={headingFont}
          />
        )
      });
    }

    if (siteSettings?.showLocation !== false) {
      sections.push({
        key: 'location',
        node: (
          <section id="public-location" className="px-4 py-12 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(255,255,255,0.62)' }}>
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="border bg-white p-7 shadow-sm" style={{ borderColor: `${secondary}33`, borderRadius: radius }}>
                <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>Localização</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight" style={{ color: primary, fontFamily: headingFont }}>
                  {content.locationTitle || 'Fácil de encontrar, simples de chegar'}
                </h2>
                <p className="mt-4 text-sm leading-6 opacity-80">
                  {content.locationBody || publicAddress || 'Cadastre o endereço do estabelecimento para exibi-lo aqui.'}
                </p>
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110" style={{ backgroundColor: secondary, borderRadius: radius }}><Navigation className="h-4 w-4" />Abrir no mapa</a>}
              </div>
              <div className="flex min-h-64 items-center justify-center p-8 text-center" style={{ backgroundColor: primary, color: background, borderRadius: radius }}>
                <div><MapPin className="mx-auto h-10 w-10" style={{ color: accent }} /><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] opacity-65">Destino</p><p className="mt-2 text-2xl font-bold" style={{ fontFamily: headingFont }}>{settings?.cityState || settings?.hotelName || heroTitle}</p>{publicAddress && <p className="mx-auto mt-3 max-w-sm text-sm opacity-75">{publicAddress}</p>}</div>
              </div>
            </div>
          </section>
        )
      });
    }

    if (siteSettings?.showContact !== false) {
      sections.push({
        key: 'contact',
        node: (
          <section id="public-contact" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl overflow-hidden" style={{ borderRadius: radius, backgroundColor: primary, color: background }}>
              <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>Contato</span>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: headingFont }}>
                    {content.contactTitle || 'Pronto para planejar sua estadia?'}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 opacity-75">
                    {content.contactBody || 'Reserve diretamente pelo site ou fale com o estabelecimento pelos canais oficiais.'}
                  </p>
                  {siteSettings?.showBookingBar !== false && <button type="button" onClick={handlePrimaryCta} className="mt-6 inline-flex items-center gap-2 px-5 py-3 text-sm font-bold shadow-lg transition hover:brightness-105" style={{ backgroundColor: accent, color: primary, borderRadius: radius }}>{siteSettings?.primaryCtaLabel || 'Reservar agora'}<ArrowRight className="h-4 w-4" /></button>}
                </div>
                <div className="grid gap-3">
                  {phoneHref && <a href={phoneHref} className="flex items-center gap-3 border border-white/15 bg-white/10 p-4 transition hover:bg-white/15" style={{ borderRadius: radius }}><Phone className="h-5 w-5" style={{ color: accent }} /><div><p className="text-xs opacity-60">Telefone</p><p className="text-sm font-bold">{contactPhone}</p></div></a>}
                  {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-white/15 bg-white/10 p-4 transition hover:bg-white/15" style={{ borderRadius: radius }}><MessageCircle className="h-5 w-5" style={{ color: accent }} /><div><p className="text-xs opacity-60">WhatsApp</p><p className="text-sm font-bold">{contactWhatsapp}</p></div></a>}
                  {emailHref && <a href={emailHref} className="flex items-center gap-3 border border-white/15 bg-white/10 p-4 transition hover:bg-white/15" style={{ borderRadius: radius }}><Mail className="h-5 w-5" style={{ color: accent }} /><div><p className="text-xs opacity-60">E-mail</p><p className="break-all text-sm font-bold">{contactEmail}</p></div></a>}
                  {!phoneHref && !whatsappHref && !emailHref && <div className="flex items-center gap-3 border border-white/15 bg-white/10 p-4" style={{ borderRadius: radius }}><MessageCircle className="h-5 w-5" style={{ color: accent }} /><p className="text-sm opacity-75">Cadastre telefone, WhatsApp ou e-mail para liberar os canais de contato.</p></div>}
                </div>
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
  }, [accent, amenities, background, contactEmail, contactPhone, contactWhatsapp, content, emailHref, headingFont, heroTitle, mapsUrl, phoneHref, primary, publicAddress, radius, secondary, settings, siteSettings, whatsappHref]);

  return (
    <div
      data-public-booking-shell
      data-public-template={templateKey}
      data-hide-booking={siteSettings?.showBookingBar === false ? 'true' : 'false'}
      data-hide-accommodations={siteSettings?.showAccommodations === false ? 'true' : 'false'}
      style={{ backgroundColor: background, color: text, fontFamily: bodyFont, ['--site-primary' as string]: primary, ['--site-secondary' as string]: secondary, ['--site-accent' as string]: accent, ['--site-radius' as string]: radius }}
    >
      <style>{`
        [data-public-booking-engine] > div > section:first-child { display: none !important; }
        [data-public-booking-engine] > div > div:nth-child(2) { margin-top: 0 !important; padding-top: 1.5rem; }
        [data-public-booking-shell][data-hide-booking="true"] [data-public-booking-engine] > div > div:nth-child(2) { display: none !important; }
        [data-public-booking-shell][data-hide-accommodations="true"] [data-public-booking-engine] #available-room-types { display: none !important; }
        [data-public-booking-engine] > div > section:nth-of-type(3) { display: none !important; }
        [data-public-booking-engine] #btn-search-availability,
        [data-public-booking-engine] button[id^="btn-reserve-"] { background-color: var(--site-primary) !important; border-radius: var(--site-radius) !important; }
        [data-public-booking-engine] #btn-search-availability:hover,
        [data-public-booking-engine] button[id^="btn-reserve-"]:hover { filter: brightness(1.08); }

        [data-public-template="beach"] { --site-radius: 24px !important; }
        [data-public-template="beach"] #public-hero { min-height: 68vh; display: flex; align-items: center; }
        [data-public-template="beach"] #public-hero > div { max-width: 72rem; text-align: left; }
        [data-public-template="beach"] #public-hero p[class*="max-w-2xl"] { margin-left: 0; }
        [data-public-template="beach"] #public-hero > div > div:last-of-type { justify-content: flex-start; }
        [data-public-template="beach"] #public-hero button { border-radius: 999px !important; }
        [data-public-template="beach"] #public-gallery figure { border-radius: 28px !important; }

        [data-public-template="boutique"] { --site-radius: 6px !important; }
        [data-public-template="boutique"] #public-hero { min-height: 78vh; display: flex; align-items: center; }
        [data-public-template="boutique"] #public-hero h1 { font-size: clamp(3rem, 8vw, 6.5rem); font-weight: 500; letter-spacing: -0.045em; }
        [data-public-template="boutique"] #public-hero > div { max-width: 58rem; }
        [data-public-template="boutique"] #public-about > div { grid-template-columns: 1.2fr 0.8fr; }
        [data-public-template="boutique"] #public-gallery figure:first-child { min-height: 430px !important; }
        [data-public-template="boutique"] section { padding-top: 4.5rem; padding-bottom: 4.5rem; }

        [data-public-template="urban"] { --site-radius: 0px !important; }
        [data-public-template="urban"] #public-hero > div { max-width: 72rem; text-align: left; }
        [data-public-template="urban"] #public-hero p[class*="max-w-2xl"] { margin-left: 0; }
        [data-public-template="urban"] #public-hero > div > div:last-of-type { justify-content: flex-start; }
        [data-public-template="urban"] #public-hero h1 { text-transform: uppercase; letter-spacing: -0.035em; }
        [data-public-template="urban"] #public-about,
        [data-public-template="urban"] #public-gallery,
        [data-public-template="urban"] #public-contact { border-top: 1px solid color-mix(in srgb, var(--site-secondary) 25%, transparent); }
        [data-public-template="urban"] #public-services > div > div:last-child { gap: 1px; }
        [data-public-template="urban"] #public-services > div > div:last-child > div { box-shadow: none !important; }

        [data-public-template="nature"] { --site-radius: 30px !important; }
        [data-public-template="nature"] #public-hero { min-height: 72vh; display: flex; align-items: center; border-bottom-left-radius: 52px; border-bottom-right-radius: 52px; }
        [data-public-template="nature"] #public-about > div > div:first-child,
        [data-public-template="nature"] #public-location > div > div:last-child { border-radius: 42px !important; }
        [data-public-template="nature"] #public-services > div > div:last-child > div { border-radius: 24px !important; box-shadow: none !important; }
        [data-public-template="nature"] #public-gallery figure { border-radius: 34px !important; }
        [data-public-template="nature"] #public-contact > div { border-radius: 42px !important; }
      `}</style>

      <header className="sticky top-0 z-50 border-b backdrop-blur-xl" style={{ backgroundColor: `${background}F2`, borderColor: `${secondary}26` }}>
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => scrollToSection('public-hero')} className="min-w-0 text-left" aria-label="Ir para o início">
            <span className="block truncate text-base font-bold sm:text-lg" style={{ color: primary, fontFamily: headingFont }}>{settings?.hotelName || heroTitle}</span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {navigationItems.map(item => (
              <button key={item.key} type="button" onClick={() => scrollToSection(item.target)} className="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-black/5" style={{ color: text }}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {siteSettings?.showBookingBar !== false && (
              <button type="button" onClick={handlePrimaryCta} className="hidden px-4 py-2.5 text-sm font-bold transition hover:brightness-105 sm:inline-flex" style={{ backgroundColor: primary, color: background, borderRadius: radius }}>
                {siteSettings?.primaryCtaLabel || 'Reservar agora'}
              </button>
            )}
            <button type="button" onClick={() => setMobileMenuOpen(open => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border md:hidden" style={{ borderColor: `${secondary}33`, color: primary }} aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileMenuOpen}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t px-4 py-3 md:hidden" style={{ borderColor: `${secondary}26`, backgroundColor: background }} aria-label="Navegação móvel">
            <div className="mx-auto grid max-w-7xl gap-1">
              {navigationItems.map(item => (
                <button key={item.key} type="button" onClick={() => scrollToSection(item.target)} className="rounded-lg px-3 py-3 text-left text-sm font-semibold transition hover:bg-black/5" style={{ color: text }}>
                  {item.label}
                </button>
              ))}
              {siteSettings?.showBookingBar !== false && (
                <button type="button" onClick={handlePrimaryCta} className="mt-2 px-4 py-3 text-left text-sm font-bold" style={{ backgroundColor: primary, color: background, borderRadius: radius }}>
                  {siteSettings?.primaryCtaLabel || 'Reservar agora'}
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      <section id="public-hero" className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8" style={{ backgroundColor: primary, color: background }}>
        {siteSettings?.heroMediaUrl && siteSettings.heroMediaType === 'image' && <><img src={siteSettings.heroMediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" /><div className="absolute inset-0 bg-black/50" /></>}
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: accent, color: accent, backgroundColor: 'rgba(0,0,0,0.12)' }}><Sparkles className="h-3.5 w-3.5" /><span>Reserva direta</span></div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: headingFont }}>{heroTitle}</h1>
          {heroSubtitle && <p className="mx-auto mt-4 max-w-2xl text-base opacity-90 sm:text-lg">{heroSubtitle}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs opacity-80">
            {publicAddress && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{publicAddress}</span>}
            {contactPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{contactPhone}</span>}
            {contactEmail && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{contactEmail}</span>}
          </div>
          {siteSettings?.showBookingBar !== false && <button type="button" onClick={handlePrimaryCta} className="mt-7 inline-flex items-center gap-2 px-5 py-3 text-sm font-bold shadow-lg transition hover:brightness-105" style={{ backgroundColor: accent, color: primary, borderRadius: radius }}><span>{siteSettings?.primaryCtaLabel || 'Reservar agora'}</span><ArrowRight className="h-4 w-4" /></button>}
          {loadingSite && <span className="ml-3 inline-flex align-middle opacity-50" title="Carregando personalização do site"><Loader2 className="h-4 w-4 animate-spin" /></span>}
        </div>
      </section>

      <div data-public-booking-engine><OnlineBookingEngine /></div>
      {modularSections.map(section => <React.Fragment key={section.key}>{section.node}</React.Fragment>)}
    </div>
  );
};
