import React from 'react';
import { PublicSiteSectionContent } from '../services/publicSite.ts';

type Props = {
  value: PublicSiteSectionContent;
  onChange: (value: PublicSiteSectionContent) => void;
};

const inputClass = 'mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]';
const labelClass = 'text-xs font-bold text-[#565B4B]';

export const PublicSiteSectionContentFields: React.FC<Props> = ({ value, onChange }) => {
  const update = (key: keyof PublicSiteSectionContent, next: string | string[]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
      <h4 className="text-lg font-black text-[#2C3327]">Conteúdo das seções</h4>
      <p className="mt-1 text-sm text-[#6B705C]">Campos vazios continuam usando automaticamente os dados já cadastrados no hotel e nas acomodações.</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
          <h5 className="font-black text-[#2C3327]">Sobre o hotel</h5>
          <label className="mt-3 block"><span className={labelClass}>Título</span><input className={inputClass} value={value.aboutTitle || ''} onChange={e => update('aboutTitle', e.target.value)} placeholder="Uma estadia pensada para receber bem" /></label>
          <label className="mt-3 block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={4} value={value.aboutBody || ''} onChange={e => update('aboutBody', e.target.value)} placeholder="Apresentação do estabelecimento" /></label>
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
          <label className="mt-3 block"><span className={labelClass}>URLs de imagens — uma por linha, até 6</span><textarea className={inputClass} rows={6} value={(value.galleryImageUrls || []).join('\n')} onChange={e => update('galleryImageUrls', e.target.value.split('\n').map(item => item.trim()).filter(Boolean).slice(0, 6))} placeholder={'https://.../foto1.jpg\nhttps://.../foto2.jpg'} /></label>
          <p className="mt-2 text-xs text-[#7A806B]">Se ficar vazio, o site usa as imagens das acomodações.</p>
        </div>

        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4">
          <h5 className="font-black text-[#2C3327]">Localização</h5>
          <label className="mt-3 block"><span className={labelClass}>Título</span><input className={inputClass} value={value.locationTitle || ''} onChange={e => update('locationTitle', e.target.value)} placeholder="Fácil de encontrar, simples de chegar" /></label>
          <label className="mt-3 block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={3} value={value.locationBody || ''} onChange={e => update('locationBody', e.target.value)} /></label>
          <label className="mt-3 block"><span className={labelClass}>Busca do mapa</span><input className={inputClass} value={value.locationMapQuery || ''} onChange={e => update('locationMapQuery', e.target.value)} placeholder="Endereço ou ponto de referência" /></label>
        </div>

        <div className="rounded-xl border border-[#EEEADF] bg-[#FBFAF6] p-4 lg:col-span-2">
          <h5 className="font-black text-[#2C3327]">Contato</h5>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label className="block"><span className={labelClass}>Título</span><input className={inputClass} value={value.contactTitle || ''} onChange={e => update('contactTitle', e.target.value)} placeholder="Pronto para planejar sua estadia?" /></label>
            <label className="block"><span className={labelClass}>Telefone público</span><input className={inputClass} value={value.contactPhone || ''} onChange={e => update('contactPhone', e.target.value)} placeholder="Usa o telefone do hotel se vazio" /></label>
            <label className="block"><span className={labelClass}>Texto</span><textarea className={inputClass} rows={3} value={value.contactBody || ''} onChange={e => update('contactBody', e.target.value)} /></label>
            <label className="block"><span className={labelClass}>E-mail público</span><input type="email" className={inputClass} value={value.contactEmail || ''} onChange={e => update('contactEmail', e.target.value)} placeholder="Usa o e-mail do hotel se vazio" /></label>
          </div>
        </div>
      </div>
    </section>
  );
};
