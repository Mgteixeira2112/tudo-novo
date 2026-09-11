import { getSupabaseClient } from './supabase.ts';

export const PUBLIC_SITE_MEDIA_BUCKET = 'public-site-media';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'hero-image';

const managedPathFromUrl = (url?: string) => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PUBLIC_SITE_MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
};

export async function uploadPublicSiteHeroImage(file: File, hotelId: string, previousUrl?: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const safeName = sanitizeFileName(file.name);
  const path = `${hotelId}/hero-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(PUBLIC_SITE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PUBLIC_SITE_MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const previousPath = managedPathFromUrl(previousUrl);
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(PUBLIC_SITE_MEDIA_BUCKET).remove([previousPath]);
  }

  return publicUrl;
}

export async function removePublicSiteHeroImage(url?: string) {
  const path = managedPathFromUrl(url);
  if (!path) return;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.storage.from(PUBLIC_SITE_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}
