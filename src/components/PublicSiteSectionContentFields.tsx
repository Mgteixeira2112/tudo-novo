import React, { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { PublicSiteSectionContent } from '../services/publicSite.ts';
import { PublicSiteGalleryManager } from './PublicSiteGalleryManager.tsx';
import { PublicSiteAboutImageField } from './PublicSiteAboutImageField.tsx';
import { PublicSiteSeoFields } from './PublicSiteSeoFields.tsx';
import { PublicSiteLogoField } from './PublicSiteLogoField.tsx';

type Props = {
  hotelId?: string;
  value: PublicSiteSectionContent;
  onChange: (value: PublicSiteSectionContent) => void;
};

const inputClass = 'mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]';
const labelClass = 'text-xs font-bold text-[#565B4B]';

export const PublicSiteSectionContentFields: React.FC<Props> = ({ hotelId = 'hotel_1', value, onChange }) => {
  const [galleryOpen, setGalleryOpen] = useState(false);

  const update = (key: keyof PublicSiteSectionContent, next: string | string[] | undefined) => {
    onChange({ ...value, [key]: next });
  };

  const galleryItems = useMemo(() => {
    if (value.galleryItems?.length) return value.galleryItems;
    return (value.galleryImageUrls || []).slice(0, 24).map((url, index) => ({
      id: `legacy-${index}`,
      url,
      category: 'rooms' as const,
      caption: '',
      featured: index === 0,
      order: index
    }));
  }, [value.galleryItems, value.galleryImageUrls]);

  const updateGallery = (items: typeof galleryItems) => {
    onChange({
      ...value,
      galleryItems: items,
      galleryImageUrls: value.galleryImageUrls || []
    });
  };

  return (
    <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
      <h4 className="text-lg font-black text-[#2C3327]">Conteúdo das seções</h4>
      <p className="mt-1 text-sm text-[#6B705C]">Campos vazios continuam usando automaticamente os dados já cadastrados no hotel e nas acomodações.</p>

      <div className="mt-5 rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
        <h5 className="font-black text-[#2C3327]">Hero — identidade da marca</h5>
        <p className="mt-1 text-xs leading-5 text-[#6B705C]">O logotipo substitui o selo “Reserva direta” acima do título principal. Se estiver vazio, o selo padrão continua sendo exibido.</p>
        <PublicSiteLogoField hotelId={hotelId} value={value.heroLogoUrl} onChange={url => update('heroLogoUrl', url)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
          <h5 className="font-black text-[#2C3327]">Sobre o hotel</h5>
          <label className="mt-3 block"><span className={labelClass}>Título</span><input className={inputClass} value={value.aboutTitle || ''} onChange={e => update('aboutTitle', e.target.value)} placeholder="Uma estadia pensada para receber bem" /></label>
          <label className="mt-3 block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={4} value={value.aboutBody || ''} onChange={e => update('aboutBody', e.target.value)} placeholder="Apresentação do estabelecimento" /></label>
          <PublicSiteAboutImageField hotelId={hotelId} value={value.aboutImageUrl} onChange={url => update('aboutImageUrl', url)} />
        </div>

        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
          <h5 className="font-black text-[#2C3327]">Serviços e comodidades</h5>
          <label className="mt-3 block"><span className={labelClass}>Título</span><input className={inputClass} value={value.servicesTitle || ''} onChange={e => update('servicesTitle', e.target.value)} placeholder="Tudo o que faz parte da sua experiência" /></label>
          <label className="mt-3 block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={3} value={value.servicesBody || ''} onChange={e => update('servicesBody', e.target.value)} /></label>
          <label className="mt-3 block"><span className={labelClass}>Itens personalizados — um por linha</span><textarea className={inputClass} rows={5} value={(value.servicesItems || []).join('\n')} onChange={e => update('servicesItems', e.target.value.split('\n').map(item => item.trim()).filter(Boolean))} placeholder={'Café da manhã\nWi-Fi\nEstacionamento'} /></label>
        </div>

        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
          <h5 className="font-black text-[#2C3327]">Galeria</h5>
          <label className="mt-3 block"><span className={labelClass}>Título</span><input className={inputClass} value={value.galleryTitle || ''} onChange={e => update('galleryTitle', e.target.value)} placeholder="Veja um pouco da sua próxima estadia" /></label>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#DDD8C9] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E9EDC9] text-[#3A5A40]"><Images className="h-5 w-5" /></div>
              <div><p className="text-sm font-black text-[#2C3327]">Galeria de fotos</p><p className="text-xs text-[#6B705C]">{galleryItems.length} de 24 imagens cadastradas</p></div>
            </div>
            <button type="button" onClick={() => setGalleryOpen(true)} className="rounded-xl bg-[#2C3327] px-4 py-2.5 text-sm font-black text-white hover:brightness-110">Gerenciar galeria</button>
          </div>
          <p className="mt-2 text-xs text-[#7A806B]">Uploads, categoria, destaque, legenda e ordem ficam concentrados no gerenciador.</p>
        </div>

        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
          <h5 className="font-black text-[#2C3327]">Localização</h5>
          <label className="mt-3 block"><span className={labelClass}>Título</span><input className={inputClass} value={value.locationTitle || ''} onChange={e => update('locationTitle', e.target.value)} placeholder="Fácil de encontrar, simples de chegar" /></label>
          <label className="mt-3 block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={3} value={value.locationBody || ''} onChange={e => update('locationBody', e.target.value)} /></label>
          <label className="mt-3 block"><span className={labelClass}>Endereço público</span><input className={inputClass} value={value.locationAddress || ''} onChange={e => update('locationAddress', e.target.value)} placeholder="Usa o endereço do hotel se vazio" /></label>
          <label className="mt-3 block"><span className={labelClass}>Busca do mapa</span><input className={inputClass} value={value.locationMapQuery || ''} onChange={e => update('locationMapQuery', e.target.value)} placeholder="Usa o endereço público se vazio" /></label>
        </div>

        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4 lg:col-span-2">
          <h5 className="font-black text-[#2C3327]">Contato</h5>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label className="block"><span className={labelClass}>Título</span><input className={inputClass} value={value.contactTitle || ''} onChange={e => update('contactTitle', e.target.value)} placeholder="Pronto para planejar sua estadia?" /></label>
            <label className="block"><span className={labelClass}>Telefone público</span><input className={inputClass} value={value.contactPhone || ''} onChange={e => update('contactPhone', e.target.value)} placeholder="Usa o telefone do hotel se vazio" /></label>
            <label className="block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={3} value={value.contactBody || ''} onChange={e => update('contactBody', e.target.value)} /></label>
            <div className="grid gap-3">
              <label className="block"><span className={labelClass}>WhatsApp público</span><input className={inputClass} value={value.contactWhatsapp || ''} onChange={e => update('contactWhatsapp', e.target.value)} placeholder="Ex.: +55 35 99999-9999" /></label>
              <label className="block"><span className={labelClass}>E-mail público</span><input type="email" className={inputClass} value={value.contactEmail || ''} onChange={e => update('contactEmail', e.target.value)} placeholder="Usa o e-mail do hotel se vazio" /></label>
            </div>
          </div>
        </div>

        <PublicSiteSeoFields hotelId={hotelId} value={value} onChange={onChange} />
      </div>

      {galleryOpen && <PublicSiteGalleryManager hotelId={hotelId} value={galleryItems} onChange={updateGallery} onClose={() => setGalleryOpen(false)} />}
    </section>
  );
};
