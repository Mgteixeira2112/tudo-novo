import React, { useEffect, useState } from 'react';
import { Check, Loader2, Save, Sparkles } from 'lucide-react';
import { loadPublicSiteSettings, PublicSiteSettings, savePublicSiteSettings } from '../services/publicSite.ts';

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
  sectionOrder: ['hero', 'booking', 'accommodations', 'services', 'gallery', 'about', 'location', 'contact']
};

const SECTION_FIELDS: Array<{ key: keyof PublicSiteSettings; label: string; description: string }> = [
  { key: 'showBookingBar', label: 'Motor de reservas', description: 'Busca por datas e hóspedes.' },
  { key: 'showAccommodations', label: 'Acomodações', description: 'Exibe categorias disponíveis.' },
  { key: 'showAbout', label: 'Sobre o hotel', description: 'Apresentação institucional.' },
  { key: 'showServices', label: 'Serviços e comodidades', description: 'Itens cadastrados nas acomodações.' },
  { key: 'showGallery', label: 'Galeria', description: 'Imagens das acomodações.' },
  { key: 'showLocation', label: 'Localização', description: 'Endereço e acesso ao mapa.' },
  { key: 'showContact', label: 'Contato', description: 'Telefone, e-mail e CTA final.' }
];

export const PublicSiteSettingsEditor: React.FC = () => {
  const [form, setForm] = useState<PublicSiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPublicSiteSettings('hotel_1')
      .then(data => {
        if (!cancelled && data) setForm(data);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Não foi possível carregar as configurações.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = <K extends keyof PublicSiteSettings>(key: K, value: PublicSiteSettings[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePublicSiteSettings(form);
      setForm(saved);
      setMessage('Alterações salvas e publicadas no site.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-16 text-sm text-[#6B705C]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações do site...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#588157]">
              <Sparkles className="h-4 w-4" /> Site Público
            </div>
            <h3 className="mt-1 text-2xl font-black text-[#2C3327]">Aparência e conteúdo principal</h3>
            <p className="mt-1 text-sm text-[#6B705C]">Nesta fase, salvar aplica a alteração imediatamente no site publicado.</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2C3327] px-5 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {message && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <Check className="h-4 w-4" /> {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
          <h4 className="text-lg font-black text-[#2C3327]">Identidade visual</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([
              ['primaryColor', 'Cor principal'],
              ['secondaryColor', 'Cor secundária'],
              ['accentColor', 'Cor de destaque'],
              ['backgroundColor', 'Cor de fundo'],
              ['textColor', 'Cor do texto']
            ] as Array<[keyof PublicSiteSettings, string]>).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-bold text-[#565B4B]">{label}</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#DDD8C9] bg-[#FBFAF6] p-2">
                  <input
                    type="color"
                    value={String(form[key])}
                    onChange={event => update(key, event.target.value as never)}
                    className="h-9 w-11 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={String(form[key])}
                    onChange={event => update(key, event.target.value as never)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-mono outline-none"
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Fonte dos títulos</span>
              <input value={form.headingFont} onChange={event => update('headingFont', event.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Fonte dos textos</span>
              <input value={form.bodyFont} onChange={event => update('bodyFont', event.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Arredondamento</span>
              <select value={form.borderRadius} onChange={event => update('borderRadius', event.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]">
                <option value="0px">Reto</option>
                <option value="8px">Discreto</option>
                <option value="16px">Padrão</option>
                <option value="24px">Arredondado</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Template</span>
              <select value={form.templateKey} onChange={event => update('templateKey', event.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]">
                <option value="classic">Clássico</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
          <h4 className="text-lg font-black text-[#2C3327]">Hero</h4>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Título principal</span>
              <input value={form.heroTitle} onChange={event => update('heroTitle', event.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Subtítulo</span>
              <textarea value={form.heroSubtitle} onChange={event => update('heroSubtitle', event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">Texto do botão principal</span>
              <input value={form.primaryCtaLabel} onChange={event => update('primaryCtaLabel', event.target.value)} className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[#565B4B]">URL da imagem do Hero</span>
              <input value={form.heroMediaUrl || ''} onChange={event => update('heroMediaUrl', event.target.value || undefined)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-[#DDD8C9] px-3 py-2.5 text-sm outline-none focus:border-[#588157]" />
            </label>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#E6E3D8] bg-white p-5 shadow-sm">
        <h4 className="text-lg font-black text-[#2C3327]">Seções da página inicial</h4>
        <p className="mt-1 text-sm text-[#6B705C]">Escolha quais blocos ficam visíveis. A ordem será configurável na próxima etapa.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_FIELDS.map(item => {
            const checked = Boolean(form[item.key]);
            return (
              <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E6E3D8] bg-[#FBFAF6] p-4">
                <div>
                  <p className="text-sm font-black text-[#2C3327]">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#6B705C]">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={event => update(item.key, event.target.checked as never)}
                  className="mt-1 h-5 w-5 accent-[#588157]"
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
};
