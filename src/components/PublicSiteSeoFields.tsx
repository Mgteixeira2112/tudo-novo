import React, { useRef, useState } from 'react';
import { ImagePlus, Search, Upload, X } from 'lucide-react';
import { PublicSiteSectionContent } from '../services/publicSite.ts';
import { uploadPublicSiteFaviconImage, uploadPublicSiteSeoShareImage } from '../services/publicSiteMedia.ts';

type Props = {
  hotelId: string;
  value: PublicSiteSectionContent;
  onChange: (value: PublicSiteSectionContent) => void;
};

const inputClass = 'mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]';
const labelClass = 'text-xs font-bold text-[#565B4B]';

export const PublicSiteSeoFields: React.FC<Props> = ({ hotelId, value, onChange }) => {
  const shareInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [uploadingShare, setUploadingShare] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof PublicSiteSectionContent, next: string | undefined) => {
    onChange({ ...value, [key]: next });
    setError(null);
  };

  const handleUpload = async (file: File | undefined, kind: 'share' | 'favicon') => {
    if (!file) return;
    setError(null);
    const setUploading = kind === 'share' ? setUploadingShare : setUploadingFavicon;
    setUploading(true);
    try {
      const url = kind === 'share'
        ? await uploadPublicSiteSeoShareImage(file, hotelId)
        : await uploadPublicSiteFaviconImage(file, hotelId);
      update(kind === 'share' ? 'seoShareImageUrl' : 'seoFaviconUrl', url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#DDE5D7] bg-[#F7FAF5] p-4 lg:col-span-2">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E9EDC9] text-[#3A5A40]"><Search className="h-5 w-5" /></div>
        <div>
          <h5 className="font-black text-[#2C3327]">SEO e compartilhamento</h5>
          <p className="mt-1 text-xs leading-5 text-[#6B705C]">Define como o hotel aparece no navegador, mecanismos de busca e compartilhamentos. As alterações seguem o mesmo fluxo de rascunho e publicação.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Título SEO</span>
          <input className={inputClass} maxLength={70} value={value.seoTitle || ''} onChange={e => update('seoTitle', e.target.value)} placeholder="Hotel Centenário Itajubá | Reservas Diretas" />
          <span className="mt-1 block text-[11px] text-[#7A806B]">Recomendado: até 60–70 caracteres.</span>
        </label>
        <label className="block">
          <span className={labelClass}>Nome para compartilhamento</span>
          <input className={inputClass} maxLength={70} value={value.seoSocialTitle || ''} onChange={e => update('seoSocialTitle', e.target.value)} placeholder="Usa o título SEO se vazio" />
        </label>
        <label className="block lg:col-span-2">
          <span className={labelClass}>Meta descrição</span>
          <textarea className={inputClass} rows={3} maxLength={180} value={value.seoDescription || ''} onChange={e => update('seoDescription', e.target.value)} placeholder="Hospede-se no centro de Itajubá com reserva direta, conforto e atendimento do hotel." />
          <span className="mt-1 block text-[11px] text-[#7A806B]">Recomendado: aproximadamente 120–160 caracteres.</span>
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#DDD8C9] bg-white p-4">
          <p className={labelClass}>Imagem de compartilhamento</p>
          <p className="mt-1 text-xs text-[#7A806B]">Usada em Open Graph/Twitter Card. Prefira uma imagem horizontal.</p>
          {value.seoShareImageUrl && <img src={value.seoShareImageUrl} alt="Prévia da imagem de compartilhamento" className="mt-3 h-32 w-full rounded-xl object-cover" />}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={uploadingShare} onClick={() => shareInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-3 py-2 text-xs font-black text-white disabled:opacity-60"><Upload className="h-4 w-4" />{uploadingShare ? 'Enviando...' : value.seoShareImageUrl ? 'Trocar imagem' : 'Enviar imagem'}</button>
            {value.seoShareImageUrl && <button type="button" onClick={() => update('seoShareImageUrl', undefined)} className="inline-flex items-center gap-2 rounded-xl border border-[#D8D3C4] px-3 py-2 text-xs font-black text-[#565B4B]"><X className="h-4 w-4" />Remover</button>}
          </div>
          <input ref={shareInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { void handleUpload(e.target.files?.[0], 'share'); e.currentTarget.value = ''; }} />
        </div>

        <div className="rounded-xl border border-[#DDD8C9] bg-white p-4">
          <p className={labelClass}>Favicon</p>
          <p className="mt-1 text-xs text-[#7A806B]">Ícone exibido na aba do navegador. PNG, JPG ou WebP de até 5 MB.</p>
          <div className="mt-3 flex min-h-32 items-center justify-center rounded-xl bg-[#FBFAF6]">
            {value.seoFaviconUrl ? <img src={value.seoFaviconUrl} alt="Prévia do favicon" className="h-20 w-20 rounded-2xl object-cover" /> : <ImagePlus className="h-9 w-9 text-[#A0A58F]" />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={uploadingFavicon} onClick={() => faviconInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-3 py-2 text-xs font-black text-white disabled:opacity-60"><Upload className="h-4 w-4" />{uploadingFavicon ? 'Enviando...' : value.seoFaviconUrl ? 'Trocar ícone' : 'Enviar ícone'}</button>
            {value.seoFaviconUrl && <button type="button" onClick={() => update('seoFaviconUrl', undefined)} className="inline-flex items-center gap-2 rounded-xl border border-[#D8D3C4] px-3 py-2 text-xs font-black text-[#565B4B]"><X className="h-4 w-4" />Remover</button>}
          </div>
          <input ref={faviconInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { void handleUpload(e.target.files?.[0], 'favicon'); e.currentTarget.value = ''; }} />
        </div>
      </div>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
      <p className="mt-3 text-[11px] leading-5 text-[#7A806B]">Nesta versão em GitHub Pages/SPA, os metadados são aplicados no navegador após o carregamento. A futura etapa de domínio/SSR poderá entregar esses dados já no HTML inicial para crawlers sociais mais restritivos.</p>
    </div>
  );
};
