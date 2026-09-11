import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadPublicSiteAboutImage } from '../services/publicSiteMedia.ts';

type Props = {
  hotelId: string;
  value?: string;
  onChange: (url?: string) => void;
};

export const PublicSiteAboutImageField: React.FC<Props> = ({ hotelId, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPublicSiteAboutImage(file, hotelId);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3">
      <span className="text-xs font-bold text-[#565B4B]">Imagem da seção Sobre</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={event => handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#DDD8C9] bg-white">
          <div className="aspect-[16/9] bg-[#EEEADF]">
            <img src={value} alt="Prévia da seção Sobre" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD8C9] px-3 py-2 text-xs font-bold text-[#565B4B] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Trocar imagem
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D9D4C5] bg-white px-4 py-6 text-sm font-black text-[#2C3327] disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-[#588157]" />}
          {uploading ? 'Enviando...' : 'Adicionar imagem'}
        </button>
      )}

      <p className="mt-2 text-xs text-[#7A806B]">JPG, PNG ou WebP, até 5 MB. Só aparece no site após publicar.</p>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};
