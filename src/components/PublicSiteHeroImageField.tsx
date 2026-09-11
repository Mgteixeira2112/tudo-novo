import React, { useRef, useState } from 'react';
import { ImageUp, Loader2, Trash2 } from 'lucide-react';
import { removePublicSiteHeroImage, uploadPublicSiteHeroImage } from '../services/publicSiteMedia.ts';

type Props = {
  hotelId: string;
  value?: string;
  onChange: (url?: string) => void;
};

export const PublicSiteHeroImageField: React.FC<Props> = ({ hotelId, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadPublicSiteHeroImage(file, hotelId, value);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      await removePublicSiteHeroImage(value);
      onChange(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover a imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="text-xs font-bold text-[#565B4B]">Imagem do Hero</span>
      <div className="mt-1 rounded-xl border border-[#DDD8C9] bg-[#FBFAF6] p-3">
        {value ? (
          <div className="overflow-hidden rounded-lg border border-[#E6E3D8] bg-white">
            <img src={value} alt="Imagem atual do Hero" className="h-36 w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-[#D8D3C4] bg-white text-center text-xs font-semibold text-[#6B705C]">
            Nenhuma imagem personalizada. O template usará a imagem padrão.
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={event => handleFile(event.target.files?.[0])}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
            {value ? 'Trocar imagem' : 'Selecionar imagem'}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Remover imagem
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-[#777B6C]">JPG, PNG ou WebP. Máximo de 5 MB. A imagem enviada substitui a imagem padrão do template após publicar.</p>
        {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
      </div>
    </div>
  );
};
