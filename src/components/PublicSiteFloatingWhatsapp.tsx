import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { loadPublicSiteSettings } from '../services/publicSite.ts';

export const PublicSiteFloatingWhatsapp: React.FC = () => {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPublicSiteSettings('hotel_1')
      .then(settings => {
        if (cancelled) return;
        const digits = (settings?.sectionContent?.contactWhatsapp || '').replace(/\D/g, '');
        setHref(digits ? `https://wa.me/${digits}` : null);
      })
      .catch(() => {
        if (!cancelled) setHref(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar pelo WhatsApp"
      title="Falar pelo WhatsApp"
      className="group fixed bottom-4 right-4 z-[75] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition hover:scale-105 hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:bottom-5 sm:right-5 sm:h-16 sm:w-16"
    >
      <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.2} />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-[#1f2937] px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">
        Falar pelo WhatsApp
      </span>
    </a>
  );
};
