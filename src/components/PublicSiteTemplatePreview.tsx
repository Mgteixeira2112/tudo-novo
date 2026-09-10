import React, { useLayoutEffect } from 'react';
import { PublicSiteSettings, setPublicSitePreviewOverride } from '../services/publicSite.ts';
import { PublicBookingExperience } from './PublicBookingExperience.tsx';

type Props = {
  settings: PublicSiteSettings;
  institutionalOrder: string[];
};

export const PublicSiteTemplatePreview: React.FC<Props> = ({ settings }) => {
  useLayoutEffect(() => {
    setPublicSitePreviewOverride(settings);
    return () => setPublicSitePreviewOverride(null);
  }, [settings]);

  const previewKey = JSON.stringify(settings);

  return (
    <div data-public-site-preview className="overflow-hidden border border-[#D8D3C4] bg-white shadow-sm">
      <style>{`
        [data-public-site-preview] [data-public-booking-engine] { display: none !important; }
        [data-public-site-preview] a,
        [data-public-site-preview] button { pointer-events: none !important; }
        [data-public-site-preview] [data-public-booking-shell] { min-height: 0 !important; }
      `}</style>
      <div className="max-h-[760px] overflow-y-auto">
        <PublicBookingExperience key={previewKey} />
      </div>
    </div>
  );
};