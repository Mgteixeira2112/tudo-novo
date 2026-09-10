import { getSupabaseClient } from './supabase.ts';

export type PublicSiteStatus = 'draft' | 'published';
export type PublicSiteMediaType = 'image' | 'video' | 'none';

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
  customDomain?: string;
  subdomainSlug?: string;
  updatedAt?: string;
}

export async function loadPublicSiteSettings(hotelId = 'hotel_1'): Promise<PublicSiteSettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_public_site_settings', {
    p_hotel_id: hotelId
  });

  if (error) throw error;
  if (!data) return null;

  return {
    hotelId: String(data.hotel_id || hotelId),
    status: data.status === 'draft' ? 'draft' : 'published',
    templateKey: String(data.template_key || 'classic'),
    primaryColor: String(data.primary_color || '#2C3327'),
    secondaryColor: String(data.secondary_color || '#588157'),
    accentColor: String(data.accent_color || '#D4A373'),
    backgroundColor: String(data.background_color || '#FDFBF7'),
    textColor: String(data.text_color || '#3D4035'),
    headingFont: String(data.heading_font || 'Playfair Display'),
    bodyFont: String(data.body_font || 'Plus Jakarta Sans'),
    borderRadius: String(data.border_radius || '16px'),
    heroTitle: String(data.hero_title || ''),
    heroSubtitle: String(data.hero_subtitle || ''),
    heroMediaUrl: data.hero_media_url || undefined,
    heroMediaType: ['image', 'video', 'none'].includes(data.hero_media_type) ? data.hero_media_type : 'image',
    primaryCtaLabel: String(data.primary_cta_label || 'Reservar agora'),
    primaryCtaTarget: String(data.primary_cta_target || 'booking'),
    showBookingBar: data.show_booking_bar !== false,
    showAccommodations: data.show_accommodations !== false,
    showServices: data.show_services !== false,
    showGallery: data.show_gallery !== false,
    showAbout: data.show_about !== false,
    showLocation: data.show_location !== false,
    showContact: data.show_contact !== false,
    sectionOrder: Array.isArray(data.section_order) ? data.section_order.map(String) : [],
    customDomain: data.custom_domain || undefined,
    subdomainSlug: data.subdomain_slug || undefined,
    updatedAt: data.updated_at || undefined
  };
}

export async function savePublicSiteSettings(settings: PublicSiteSettings): Promise<PublicSiteSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const payload = {
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
    showContact: settings.showContact
  };

  const { error } = await supabase.rpc('save_public_site_settings', {
    p_hotel_id: settings.hotelId,
    p_payload: payload
  });

  if (error) throw error;

  const refreshed = await loadPublicSiteSettings(settings.hotelId);
  if (!refreshed) throw new Error('Configuração pública não encontrada após salvar.');
  return refreshed;
}
