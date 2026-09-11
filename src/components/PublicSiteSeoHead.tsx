import React, { useEffect } from 'react';
import { useHotel } from '../context/HotelContext.tsx';
import { loadPublicSiteSettings } from '../services/publicSite.ts';

type Snapshot = {
  element: Element;
  attribute: string;
  previous: string | null;
  created?: boolean;
};

const ensureMeta = (selector: string, attributes: Record<string, string>, snapshots: Snapshot[]) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  let created = false;
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
    created = true;
  }
  for (const [attribute, value] of Object.entries(attributes)) {
    snapshots.push({ element, attribute, previous: element.getAttribute(attribute), created });
    element.setAttribute(attribute, value);
  }
};

const ensureLink = (selector: string, attributes: Record<string, string>, snapshots: Snapshot[]) => {
  let element = document.head.querySelector(selector) as HTMLLinkElement | null;
  let created = false;
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
    created = true;
  }
  for (const [attribute, value] of Object.entries(attributes)) {
    snapshots.push({ element, attribute, previous: element.getAttribute(attribute), created });
    element.setAttribute(attribute, value);
  }
};

export const PublicSiteSeoHead: React.FC = () => {
  const { settings } = useHotel();

  useEffect(() => {
    let cancelled = false;
    const snapshots: Snapshot[] = [];
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    let structuredData: HTMLScriptElement | null = null;

    loadPublicSiteSettings('hotel_1')
      .then(siteSettings => {
        if (cancelled || !siteSettings) return;

        const content = siteSettings.sectionContent || {};
        const hotelName = settings?.hotelName || siteSettings.heroTitle || 'Hotel';
        const title = content.seoTitle || `${hotelName} | Reservas Diretas`;
        const socialTitle = content.seoSocialTitle || title;
        const description = content.seoDescription || content.aboutBody || settings?.description || siteSettings.heroSubtitle || `Reserve diretamente com ${hotelName}.`;
        const shareImage = content.seoShareImageUrl || siteSettings.heroMediaUrl || content.aboutImageUrl || content.galleryItems?.[0]?.url;
        const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
        const phone = content.contactPhone || settings?.phone || undefined;
        const email = content.contactEmail || settings?.email || undefined;
        const address = content.locationAddress || [settings?.address, settings?.cityState].filter(Boolean).join(', ') || undefined;

        document.title = title;
        document.documentElement.lang = 'pt-BR';

        ensureMeta('meta[name="description"]', { name: 'description', content: description }, snapshots);
        ensureMeta('meta[property="og:title"]', { property: 'og:title', content: socialTitle }, snapshots);
        ensureMeta('meta[property="og:description"]', { property: 'og:description', content: description }, snapshots);
        ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' }, snapshots);
        ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl }, snapshots);
        ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: shareImage ? 'summary_large_image' : 'summary' }, snapshots);
        ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: socialTitle }, snapshots);
        ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description }, snapshots);
        if (shareImage) {
          ensureMeta('meta[property="og:image"]', { property: 'og:image', content: shareImage }, snapshots);
          ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: shareImage }, snapshots);
        }
        ensureLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl }, snapshots);
        if (content.seoFaviconUrl) {
          ensureLink('link[rel="icon"]', { rel: 'icon', href: content.seoFaviconUrl }, snapshots);
        }

        structuredData = document.createElement('script');
        structuredData.type = 'application/ld+json';
        structuredData.setAttribute('data-public-site-seo', 'hotel');
        structuredData.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Hotel',
          name: hotelName,
          description,
          url: canonicalUrl,
          ...(shareImage ? { image: shareImage } : {}),
          ...(phone ? { telephone: phone } : {}),
          ...(email ? { email } : {}),
          ...(address ? { address } : {})
        });
        document.head.appendChild(structuredData);
      })
      .catch(error => console.warn('[PublicSiteSeoHead] Não foi possível aplicar SEO publicado.', error));

    return () => {
      cancelled = true;
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      structuredData?.remove();
      const createdElements = new Set<Element>();
      for (const snapshot of snapshots.reverse()) {
        if (snapshot.created) {
          createdElements.add(snapshot.element);
          continue;
        }
        if (snapshot.previous === null) snapshot.element.removeAttribute(snapshot.attribute);
        else snapshot.element.setAttribute(snapshot.attribute, snapshot.previous);
      }
      createdElements.forEach(element => element.remove());
    };
  }, [settings]);

  return null;
};
