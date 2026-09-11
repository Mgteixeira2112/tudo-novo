import { getSupabaseClient } from './supabase.ts';

export type PublicSiteStatus = 'draft' | 'published';
export type PublicSiteMediaType = 'image' | 'video' | 'none';
export type PublicSiteGalleryCategory = 'rooms' | 'common' | 'breakfast' | 'facade';

export interface PublicSiteGalleryItem {
  id: string;
  url: string;
  category: PublicSiteGalleryCategory;
  caption?: string;
  featured?: boolean;
  order: number;
}

export interface PublicSiteSectionContent {
  aboutTitle?: string;
  aboutBody?: string;
  aboutImageUrl?: string;
  servicesTitle?: string;
  servicesBody?: string;
  servicesItems?: string[];
  galleryTitle?: string;
  galleryImageUrls?: string[];
  galleryItems?: PublicSiteGalleryItem[];
  locationTitle?: string;
  locationBody?: string;
  locationAddress?: string;
  locationMapQuery?: string;
  contactTitle?: string;
  contactBody?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  seoTitle?: string;
  seoSocialTitle?: string;
  seoDescription?: string;
  seoShareImageUrl?: string;
  seoFaviconUrl?: string;
}

export interface PublicSiteSettings {
  hotelId: string;
  status: PublicSiteStatus;
  templateKey: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  heroTitle: string;
  heroSubtitle: string;
  heroMediaUrl?: string;
  heroMediaType: PublicSiteMediaType;
  primaryCtaLabel: string;
  primaryCtaTarget: string;
  showBookingBar: boolean;
  showAccommodations: boolean;
  showServices: boolean;
  showGallery: boolean;
  showAbout: boolean;
  showLocation: boolean;
  showContact: boolean;
  sectionOrder: string[];
  sectionContent: PublicSiteSectionContent;
  customDomain?: string;
  subdomainSlug?: string;
  updatedAt?: string;
}

export interface PublicSiteAdminState {
  published: PublicSiteSettings;
  draft: PublicSiteSettings;
  hasDraft: boolean;
  draftUpdatedAt?: string;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean) : [];
}

function normalizeGalleryItems(value: unknown): PublicSiteGalleryItem[] {
  if (!Array.isArray(value)) return [];
  const validCategories = new Set<PublicSiteGalleryCategory>(['rooms', 'common', 'breakfast', 'facade']);
  const normalized = value
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((item: any, index) => ({
      id: String(item.id || `gallery-${index}`),
      url: String(item.url || '').trim(),
      category: validCategories.has(item.category) ? item.category : 'rooms',
      caption: item.caption ? String(item.caption).trim() : undefined,
      featured: Boolean(item.featured),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
    }))
    .filter(item => Boolean(item.url))
    .sort((a, b) => a.order - b.order)
    .slice(0, 24)
    .map((item, index) => ({ ...item, order: index }));

  let featuredFound = false;
  return normalized.map(item => {
    if (!item.featured) return item;
    if (featuredFound) return { ...item, featured: false };
    featuredFound = true;
    return item;
  });
}

function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function mapSectionContent(value: any): PublicSiteSectionContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return {
    aboutTitle: optionalString(value.aboutTitle),
    aboutBody: optionalString(value.aboutBody),
    aboutImageUrl: optionalString(value.aboutImageUrl),
    servicesTitle: optionalString(value.servicesTitle),
    servicesBody: optionalString(value.servicesBody),
    servicesItems: normalizeStringArray(value.servicesItems),
    galleryTitle: optionalString(value.galleryTitle),
    galleryImageUrls: normalizeStringArray(value.galleryImageUrls),
    galleryItems: normalizeGalleryItems(value.galleryItems),
    locationTitle: optionalString(value.locationTitle),
    locationBody: optionalString(value.locationBody),
    locationAddress: optionalString(value.locationAddress),
    locationMapQuery: optionalString(value.locationMapQuery),
    contactTitle: optionalString(value.contactTitle),
    contactBody: optionalString(value.contactBody),
    contactPhone: optionalString(value.contactPhone),
    contactWhatsapp: optionalString(value.contactWhatsapp),
    contactEmail: optionalString(value.contactEmail),
    seoTitle: optionalString(value.seoTitle),
    seoSocialTitle: optionalString(value.seoSocialTitle),
    seoDescription: optionalString(value.seoDescription),
    seoShareImageUrl: optionalString(value.seoShareImageUrl),
    seoFaviconUrl: optionalString(value.seoFaviconUrl)
  };
}

function mapPublicSiteSettings(data: any, hotelId = 'hotel_1'): PublicSiteSettings {
  return {
    hotelId: String(data?.hotel_id || data?.hotelId || hotelId),
    status: data?.status === 'draft' ? 'draft' : 'published',
    templateKey: String(data?.template_key || data?.templateKey || 'classic'),
    primaryColor: String(data?.primary_color || data?.primaryColor || '#2C3327'),
    secondaryColor: String(data?.secondary_color || data?.secondaryColor || '#588157'),
    accentColor: String(data?.accent_color || data?.accentColor || '#D4A373'),
    backgroundColor: String(data?.background_color || data?.backgroundColor || '#FDFBF7'),
    textColor: String(data?.text_color || data?.textColor || '#3D4035'),
    headingFont: String(data?.heading_font || data?.headingFont || 'Playfair Display'),
    bodyFont: String(data?.body_font || data?.bodyFont || 'Plus Jakarta Sans'),
    borderRadius: String(data?.border_radius || data?.borderRadius || '16px'),
    heroTitle: String(data?.hero_title ?? data?.heroTitle ?? ''),
    heroSubtitle: String(data?.hero_subtitle ?? data?.heroSubtitle ?? ''),
    heroMediaUrl: data?.hero_media_url || data?.heroMediaUrl || undefined,
    heroMediaType: ['image', 'video', 'none'].includes(data?.hero_media_type || data?.heroMediaType)
      ? (data?.hero_media_type || data?.heroMediaType)
      : 'image',
    primaryCtaLabel: String(data?.primary_cta_label || data?.primaryCtaLabel || 'Reservar agora'),
    primaryCtaTarget: String(data?.primary_cta_target || data?.primaryCtaTarget || 'booking'),
    showBookingBar: (data?.show_booking_bar ?? data?.showBookingBar) !== false,
    showAccommodations: (data?.show_accommodations ?? data?.showAccommodations) !== false,
    showServices: (data?.show_services ?? data?.showServices) !== false,
    showGallery: (data?.show_gallery ?? data?.showGallery) !== false,
    showAbout: (data?.show_about ?? data?.showAbout) !== false,
    showLocation: (data?.show_location ?? data?.showLocation) !== false,
    showContact: (data?.show_contact ?? data?.showContact) !== false,
    sectionOrder: Array.isArray(data?.section_order)
      ? data.section_order.map(String)
      : Array.isArray(data?.sectionOrder)
        ? data.sectionOrder.map(String)
        : [],
    sectionContent: mapSectionContent(data?.section_content ?? data?.sectionContent),
    customDomain: data?.custom_domain || data?.customDomain || undefined,
    subdomainSlug: data?.subdomain_slug || data?.subdomainSlug || undefined,
    updatedAt: data?.updated_at || data?.updatedAt || undefined
  };
}

function toEditablePayload(settings: PublicSiteSettings) {
  return {
    templateKey: settings.templateKey,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    headingFont: settings.headingFont,
    bodyFont: settings.bodyFont,
    borderRadius: settings.borderRadius,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    heroMediaUrl: settings.heroMediaUrl || null,
    heroMediaType: settings.heroMediaType,
    primaryCtaLabel: settings.primaryCtaLabel,
    primaryCtaTarget: settings.primaryCtaTarget,
    showBookingBar: settings.showBookingBar,
    showAccommodations: settings.showAccommodations,
    showServices: settings.showServices,
    showGallery: settings.showGallery,
    showAbout: settings.showAbout,
    showLocation: settings.showLocation,
    showContact: settings.showContact,
    sectionOrder: settings.sectionOrder,
    sectionContent: settings.sectionContent || {}
  };
}

export async function loadPublicSiteSettings(hotelId = 'hotel_1'): Promise<PublicSiteSettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_public_site_settings', { p_hotel_id: hotelId });
  if (error) throw error;
  if (!data) return null;
  return mapPublicSiteSettings(data, hotelId);
}

export async function loadPublicSiteAdminState(hotelId = 'hotel_1'): Promise<PublicSiteAdminState> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('get_public_site_admin_settings', { p_hotel_id: hotelId });
  if (error) throw error;
  if (!data?.published) throw new Error('Configuração pública não encontrada.');

  const published = mapPublicSiteSettings(data.published, hotelId);
  const draft = data.draft
    ? mapPublicSiteSettings({ ...toEditablePayload(published), ...data.draft, hotelId, status: 'draft' }, hotelId)
    : { ...published };

  return {
    published,
    draft,
    hasDraft: Boolean(data.has_draft),
    draftUpdatedAt: data.draft_updated_at || undefined
  };
}

export async function savePublicSiteDraft(settings: PublicSiteSettings): Promise<PublicSiteSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('save_public_site_draft', {
    p_hotel_id: settings.hotelId,
    p_payload: toEditablePayload(settings)
  });
  if (error) throw error;

  return mapPublicSiteSettings({ ...data, hotelId: settings.hotelId, status: 'draft' }, settings.hotelId);
}

export async function publishPublicSiteSettings(hotelId = 'hotel_1'): Promise<PublicSiteSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { error } = await supabase.rpc('publish_public_site_settings', { p_hotel_id: hotelId });
  if (error) throw error;

  const refreshed = await loadPublicSiteSettings(hotelId);
  if (!refreshed) throw new Error('Configuração pública não encontrada após publicar.');
  return refreshed;
}

export async function savePublicSiteSettings(settings: PublicSiteSettings): Promise<PublicSiteSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { error } = await supabase.rpc('save_public_site_settings', {
    p_hotel_id: settings.hotelId,
    p_payload: toEditablePayload(settings)
  });
  if (error) throw error;

  const refreshed = await loadPublicSiteSettings(settings.hotelId);
  if (!refreshed) throw new Error('Configuração pública não encontrada após salvar.');
  return refreshed;
}
