import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2, X } from 'lucide-react';
import {
  PublicSiteGalleryCategory,
  PublicSiteGalleryItem
} from '../services/publicSite.ts';
import { uploadPublicSiteGalleryImage } from '../services/publicSiteMedia.ts';

type Props = {
  hotelId: string;
  value: PublicSiteGalleryItem[];
  onChange: (items: PublicSiteGalleryItem[]) => void;
  onClose: () => void;
};

const CATEGORY_OPTIONS: Array<{ value: PublicSiteGalleryCategory; label: string }> = [
  { value: 'rooms', label: 'Quartos' },
  { value: 'common', label: 'Áreas comuns' },
  { value: 'breakfast', label: 'Café da manhã' },
  { value: 'facade', label: 'Fachada' }
];

const MAX_GALLERY_IMAGES = 24;

export const PublicSiteGalleryManager: React.FC<Props> = ({ hotelId, value, onChange, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = value
    .slice(0, MAX_GALLERY_IMAGES)
    .map((item, index) => ({ ...item, order: index }));

  const updateItems = (items: PublicSiteGalleryItem[]) => {
    onChange(items.map((item, index) => ({ ...item, order: index })).slice(0, MAX_GALLERY_IMAGES));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_GALLERY_IMAGES - normalized.length;
    if (remaining <= 0) {
      setError('A galeria já atingiu o limite de 24 imagens.');
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);
    try {
      const uploaded: PublicSiteGalleryItem[] = [];
      for (const file of selected) {
        const url = await uploadPublicSiteGalleryImage(file, hotelId);
        uploaded.push({
          id: `gallery-${Date.now()}-${uploaded.length}`,
          url,
          category: 'rooms',
          caption: '',
          featured: normalized.length === 0 && uploaded.length === 0,
          order: normalized.length + uploaded.length
        });
      }
      updateItems([...normalized, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar as imagens.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const patchItem = (id: string, patch: Partial<PublicSiteGalleryItem>) => {
    updateItems(normalized.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const setFeatured = (id: string) => {
    updateItems(normalized.map(item => ({ ...item, featured: item.id === id })));
  };

  const removeItem = (id: string) => {
    const next = normalized.filter(item => item.id !== id);
    if (next.length && !next.some(item => item.featured)) next[0] = { ...next[0], featured: true };
    updateItems(next);
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    const next = [...normalized];
    const from = next.findIndex(item => item.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    updateItems(next);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Gerenciar galeria">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#FDFBF7] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E3D8] bg-white px-5 py-4">
          <div>
            <h3 className="text-xl font-black text-[#2C3327]">Gerenciar galeria</h3>
            <p className="mt-1 text-sm text-[#6B705C]">Organize até 24 imagens. As alterações entram no rascunho do Site Público.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E6E3D8] p-2 text-[#6B705C] hover:bg-[#F4F1EA]" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E3D8] px-5 py-4">
          <div className="text-sm font-bold text-[#565B4B]">{normalized.length} de {MAX_GALLERY_IMAGES} imagens</div>
          <div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            <button type="button" disabled={uploading || normalized.length >= MAX_GALLERY_IMAGES} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? 'Enviando...' : 'Adicionar fotos'}
            </button>
          </div>
        </div>

        {error && <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="overflow-y-auto p-5">
          {normalized.length === 0 ? (
            <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9D4C5] bg-white text-center">
              <ImagePlus className="h-10 w-10 text-[#588157]" />
              <span className="mt-3 font-black text-[#2C3327]">Adicionar as primeiras fotos</span>
              <span className="mt-1 text-xs text-[#6B705C]">JPG, PNG ou WebP, até 5 MB por imagem.</span>
            </button>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {normalized.map((item, index) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-[#E6E3D8] bg-white shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#EEEADF]">
                    <img src={item.url} alt={item.caption || `Foto ${index + 1}`} className="h-full w-full object-cover" />
                    {item.featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#2C3327] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white"><Star className="h-3 w-3 fill-current" /> Destaque</span>}
                  </div>
                  <div className="space-y-3 p-4">
                    <label className="block"><span className="text-[11px] font-black uppercase tracking-wide text-[#6B705C]">Categoria</span><select value={item.category} onChange={e => patchItem(item.id, { category: e.target.value as PublicSiteGalleryCategory })} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2 text-sm">{CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="block"><span className="text-[11px] font-black uppercase tracking-wide text-[#6B705C]">Legenda opcional</span><input value={item.caption || ''} onChange={e => patchItem(item.id, { caption: e.target.value })} maxLength={120} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2 text-sm" placeholder="Ex.: Suíte Deluxe" /></label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setFeatured(item.id)} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-bold ${item.featured ? 'border-[#2C3327] bg-[#2C3327] text-white' : 'border-[#DDD8C9] text-[#565B4B]'}`}><Star className="h-3.5 w-3.5" /> Destaque</button>
                      <button type="button" onClick={() => moveItem(item.id, -1)} disabled={index === 0} className="rounded-lg border border-[#DDD8C9] p-2 text-[#565B4B] disabled:opacity-30" aria-label="Mover foto para cima"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => moveItem(item.id, 1)} disabled={index === normalized.length - 1} className="rounded-lg border border-[#DDD8C9] p-2 text-[#565B4B] disabled:opacity-30" aria-label="Mover foto para baixo"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => removeItem(item.id)} className="ml-auto rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" aria-label="Remover foto"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#E6E3D8] bg-white px-5 py-4">
          <p className="text-xs text-[#6B705C]">Use “Salvar rascunho” ou “Publicar” no Site Público depois de fechar esta janela.</p>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#588157] px-4 py-2.5 text-sm font-black text-white">Concluir</button>
        </div>
      </div>
    </div>
  );
};
