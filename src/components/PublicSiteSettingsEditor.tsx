import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Globe2, Loader2, Save, Sparkles } from 'lucide-react';
import {
  loadPublicSiteAdminState,
  publishPublicSiteSettings,
  PublicSiteSettings,
  savePublicSiteDraft
} from '../services/publicSite.ts';
import { PublicSiteSectionContentFields } from './PublicSiteSectionContentFields.tsx';
import { PublicSiteHeroImageField } from './PublicSiteHeroImageField.tsx';

const DEFAULT_SETTINGS: PublicSiteSettings = {
  hotelId: 'hotel_1',
  status: 'published',
  templateKey: 'classic',
  primaryColor: '#2C3327',
  secondaryColor: '#588157',
  accentColor: '#D4A373',
  backgroundColor: '#FDFBF7',
  textColor: '#3D4035',
  headingFont: 'Playfair Display',
  bodyFont: 'Plus Jakarta Sans',
  borderRadius: '16px',
  heroTitle: '',
  heroSubtitle: '',
  heroMediaType: 'image',
  primaryCtaLabel: 'Reservar agora',
  primaryCtaTarget: 'booking',
  showBookingBar: true,
  showAccommodations: true,
  showServices: true,
  showGallery: true,
  showAbout: true,
  showLocation: true,
  showContact: true,
  sectionOrder: ['hero', 'booking', 'accommodations', 'about', 'services', 'gallery', 'location', 'contact'],
  sectionContent: {}
};

const SECTION_FIELDS: Array<{ key: keyof PublicSiteSettings; label: string; description: string }> = [
  { key: 'showBookingBar', label: 'Motor de reservas', description: 'Busca por datas e hóspedes.' },
  { key: 'showAccommodations', label: 'Acomodações', description: 'Exibe categorias disponíveis.' },
  { key: 'showAbout', label: 'Sobre o hotel', description: 'Apresentação institucional.' },
  { key: 'showServices', label: 'Serviços e comodidades', description: 'Itens do hotel ou personalizados.' },
  { key: 'showGallery', label: 'Galeria', description: 'Imagens das acomodações ou URLs personalizadas.' },
  { key: 'showLocation', label: 'Localização', description: 'Endereço e acesso ao mapa.' },
  { key: 'showContact', label: 'Contato', description: 'Telefone, e-mail e CTA final.' }
];

const ORDERABLE_SECTIONS = [
  { key: 'about', label: 'Sobre o hotel' },
  { key: 'services', label: 'Serviços e comodidades' },
  { key: 'gallery', label: 'Galeria' },
  { key: 'location', label: 'Localização' },
  { key: 'contact', label: 'Contato' }
] as const;

export const PublicSiteSettingsEditor: React.FC = () => {
  const [form, setForm] = useState<PublicSiteSettings>(DEFAULT_SETTINGS);
  const [published, setPublished] = useState<PublicSiteSettings>(DEFAULT_SETTINGS);
  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPublicSiteAdminState('hotel_1')
      .then(state => {
        if (cancelled) return;
        setPublished(state.published);
        setForm(state.draft);
        setHasDraft(state.hasDraft);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const update = <K extends keyof PublicSiteSettings>(key: K, value: PublicSiteSettings[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const institutionalOrder = useMemo(() => {
    const current = form.sectionOrder.filter(key => ORDERABLE_SECTIONS.some(section => section.key === key));
    const missing = ORDERABLE_SECTIONS.map(section => section.key).filter(key => !current.includes(key));
    return [...current, ...missing];
  }, [form.sectionOrder]);

  const moveSection = (key: string, direction: -1 | 1) => {
    const order = [...institutionalOrder];
    const from = order.indexOf(key);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    update('sectionOrder', ['hero', 'booking', 'accommodations', ...order]);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePublicSiteDraft(form);
      setForm({ ...form, ...saved, status: 'draft' });
      setHasDraft(true);
      setMessage('Rascunho salvo. O site público ainda não foi alterado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o rascunho.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      await savePublicSiteDraft(form);
      const result = await publishPublicSiteSettings(form.hotelId);
      setPublished(result);
      setForm(result);
      setHasDraft(false);
      setMessage('Alterações publicadas no site com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar as configurações.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-16 text-sm text-[#6B705C]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações do site...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#588157]"><Sparkles className="h-4 w-4" /> Site Público</div>
            <h3 className="mt-1 text-2xl font-black text-[#2C3327]">CMS do site público</h3>
            <p className="mt-1 text-sm text-[#6B705C]">Configure o conteúdo e a identidade visual aqui. A visualização é feita diretamente no site público após publicar.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Publicado</span>
              {hasDraft && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Rascunho pendente</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSaveDraft} disabled={saving || publishing} className="inline-flex items-center gap-2 rounded-xl bg-[#6B705C] px-4 py-2.5 text-sm font-black text-white hover:brightness-110 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar rascunho</button>
            <button type="button" onClick={handlePublish} disabled={saving || publishing} className="inline-flex items-center gap-2 rounded-xl bg-[#2C3327] px-4 py-2.5 text-sm font-black text-white hover:brightness-110 disabled:opacity-60">{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />} Publicar</button>
          </div>
        </div>
        {message && <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" /> {message}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
          <h4 className="text-lg font-black text-[#2C3327]">Identidade visual</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([['primaryColor','Cor principal'],['secondaryColor','Cor secundária'],['accentColor','Cor de destaque'],['backgroundColor','Cor de fundo'],['textColor','Cor do texto']] as Array<[keyof PublicSiteSettings,string]>).map(([key,label]) => (
              <label key={key} className="block"><span className="text-xs font-bold text-[#565B4B]">{label}</span><div className="mt-1 flex items-center gap-2 rounded-xl border border-[#DDD8C9] bg-[#FBFAF6] p-2"><input type="color" value={String(form[key])} onChange={e => update(key, e.target.value as never)} className="h-9 w-11 cursor-pointer rounded-lg border-0 bg-transparent p-0" /><input type="text" value={String(form[key])} onChange={e => update(key, e.target.value as never)} className="min-w-0 flex-1 bg-transparent text-sm font-mono outline-none" /></div></label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Fonte dos títulos</span><input value={form.headingFont} onChange={e => update('headingFont', e.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm" /></label>
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Fonte dos textos</span><input value={form.bodyFont} onChange={e => update('bodyFont', e.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm" /></label>
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Arredondamento</span><select value={form.borderRadius} onChange={e => update('borderRadius', e.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm"><option value="0px">Reto</option><option value="8px">Discreto</option><option value="16px">Padrão</option><option value="24px">Arredondado</option></select></label>
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Template</span><select value={form.templateKey} onChange={e => update('templateKey', e.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm"><option value="classic">Clássico</option><option value="beach">Praia</option><option value="boutique">Boutique</option><option value="urban">Urbano</option><option value="nature">Natureza</option></select></label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
          <h4 className="text-lg font-black text-[#2C3327]">Hero</h4>
          <div className="mt-4 space-y-4">
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Título principal</span><input value={form.heroTitle} onChange={e => update('heroTitle', e.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm" /></label>
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Subtítulo</span><textarea value={form.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm" /></label>
            <label className="block"><span className="text-xs font-bold text-[#565B4B]">Texto do botão principal</span><input value={form.primaryCtaLabel} onChange={e => update('primaryCtaLabel', e.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm" /></label>
            <PublicSiteHeroImageField hotelId={form.hotelId} value={form.heroMediaUrl} onChange={url => update('heroMediaUrl', url)} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
        <h4 className="text-lg font-black text-[#2C3327]">Seções da página inicial</h4>
        <p className="mt-1 text-sm text-[#6B705C]">Ative ou desative blocos. Hero, reservas e acomodações permanecem na estrutura principal.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_FIELDS.map(item => <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E6E3D8] bg-[#FBFAF6] p-4"><div><p className="text-sm font-black text-[#2C3327]">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#6B705C]">{item.description}</p></div><input type="checkbox" checked={Boolean(form[item.key])} onChange={e => update(item.key, e.target.checked as never)} className="mt-1 h-5 w-5 accent-[#588157]" /></label>)}
        </div>
      </section>

      <PublicSiteSectionContentFields value={form.sectionContent} onChange={value => update('sectionContent', value)} />

      <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
        <h4 className="text-lg font-black text-[#2C3327]">Ordem dos blocos institucionais</h4>
        <p className="mt-1 text-sm text-[#6B705C]">Use as setas para definir a ordem de Sobre, Serviços, Galeria, Localização e Contato.</p>
        <div className="mt-4 space-y-2">
          {institutionalOrder.map((key,index) => { const item = ORDERABLE_SECTIONS.find(section => section.key === key); return <div key={key} className="flex items-center justify-between rounded-xl border border-[#E6E3D8] bg-[#FBFAF6] px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E9E6DC] text-xs font-black text-[#2C3327]">{index+1}</span><span className="text-sm font-black text-[#2C3327]">{item?.label || key}</span></div><div className="flex gap-1"><button type="button" onClick={() => moveSection(key,-1)} disabled={index===0} className="rounded-lg border border-[#D8D3C4] bg-white p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" onClick={() => moveSection(key,1)} disabled={index===institutionalOrder.length-1} className="rounded-lg border border-[#D8D3C4] bg-white p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></div></div>; })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E6E3D8] bg-[#FBFAF6] p-4 text-xs text-[#6B705C]">Versão publicada atual: <strong>{published.heroTitle || 'Hotel'}</strong>. Para conferir alterações visuais, publique e abra o próprio site público.</section>
    </div>
  );
};