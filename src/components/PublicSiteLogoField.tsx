import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadPublicSiteLogoImage } from '../services/publicSiteMedia.ts';

type Props = {
  hotelId: string;
  value?: string;
  onChange: (url?: string) => void;
};

export const PublicSiteLogoField: React.FC<Props> = ({ hotelId, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPublicSiteLogoImage(file, hotelId);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o logotipo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-3">
      <span className="text-xs font-bold text-[#565B4B]">Logotipo do Hero</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={event => handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#DDD8C9] bg-white">
          <div className="flex min-h-32 items-center justify-center bg-[linear-gradient(45deg,#f2f2f2_25%,transparent_25%),linear-gradient(-45deg,#f2f2f2_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f2f2f2_75%),linear-gradient(-45deg,transparent_75%,#f2f2f2_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] p-5">
            <img src={value} alt="Prévia do logotipo" className="max-h-24 max-w-full object-contain" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDD8C9] px-3 py-2 text-xs font-bold text-[#565B4B] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Trocar logotipo
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
          {uploading ? 'Enviando...' : 'Adicionar logotipo'}
        </button>
      )}

      <p className="mt-2 text-xs text-[#7A806B]">PNG com fundo transparente é recomendado. JPG, PNG ou WebP, até 5 MB. Sem logo, o selo “Reserva direta” continua aparecendo.</p>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};
