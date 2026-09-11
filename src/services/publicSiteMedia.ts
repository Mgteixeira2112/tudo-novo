import { getSupabaseClient } from './supabase.ts';

export const PUBLIC_SITE_MEDIA_BUCKET = 'public-site-media';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'site-image';

function validateImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }
}

async function uploadPublicSiteImage(file: File, hotelId: string, prefix: 'hero' | 'gallery' | 'about') {
  validateImage(file);

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const safeName = sanitizeFileName(file.name);
  const path = `${hotelId}/${prefix}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(PUBLIC_SITE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PUBLIC_SITE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPublicSiteHeroImage(file: File, hotelId: string) {
  return uploadPublicSiteImage(file, hotelId, 'hero');
}

export async function uploadPublicSiteGalleryImage(file: File, hotelId: string) {
  return uploadPublicSiteImage(file, hotelId, 'gallery');
}

export async function uploadPublicSiteAboutImage(file: File, hotelId: string) {
  return uploadPublicSiteImage(file, hotelId, 'about');
}
