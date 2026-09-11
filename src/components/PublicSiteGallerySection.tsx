import React, { useMemo, useState } from 'react';
import { Images, Star } from 'lucide-react';
import {
  PublicSiteGalleryCategory,
  PublicSiteGalleryItem
} from '../services/publicSite.ts';
import '../public-site-gallery.css';

type GalleryFilter = 'all' | PublicSiteGalleryCategory;

type Props = {
  items?: PublicSiteGalleryItem[];
  title?: string;
  primary: string;
  secondary: string;
  accent: string;
  radius: string;
  headingFont: string;
};

const CATEGORY_LABELS: Record<PublicSiteGalleryCategory, string> = {
  rooms: 'Quartos',
  common: 'Áreas comuns',
  breakfast: 'Café da manhã',
  facade: 'Fachada'
};

const CATEGORY_ORDER: PublicSiteGalleryCategory[] = ['rooms', 'common', 'breakfast', 'facade'];

export const PublicSiteGallerySection: React.FC<Props> = ({
  items = [],
  title,
  primary,
  secondary,
  accent,
  radius,
  headingFont
}) => {
  const [filter, setFilter] = useState<GalleryFilter>('all');

  const orderedItems = useMemo(() => {
    const normalized = [...items]
      .filter(item => Boolean(item?.url))
      .sort((a, b) => a.order - b.order)
      .slice(0, 24);

    const featuredIndex = normalized.findIndex(item => item.featured);
    if (featuredIndex > 0) {
      const [featured] = normalized.splice(featuredIndex, 1);
      normalized.unshift(featured);
    }

    return normalized;
  }, [items]);

  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter(category => orderedItems.some(item => item.category === category)),
    [orderedItems]
  );

  const visibleItems = useMemo(
    () => filter === 'all' ? orderedItems : orderedItems.filter(item => item.category === filter),
    [filter, orderedItems]
  );

  return (
    <section id="public-gallery" className="public-site-gallery px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="public-site-gallery__heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: secondary }}>Galeria</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: primary, fontFamily: headingFont }}>
              {title || 'Veja um pouco da sua próxima estadia'}
            </h2>
          </div>
          <Images className="h-8 w-8 opacity-30" style={{ color: secondary }} />
        </div>

        {orderedItems.length > 0 ? (
          <>
            {availableCategories.length > 1 && (
              <div className="public-site-gallery__filters mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar galeria por categoria">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="public-site-gallery__filter"
                  data-active={filter === 'all' ? 'true' : 'false'}
                  style={{ ['--gallery-filter-color' as string]: primary, ['--gallery-filter-accent' as string]: accent }}
                >
                  Todas
                </button>
                {availableCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFilter(category)}
                    className="public-site-gallery__filter"
                    data-active={filter === category ? 'true' : 'false'}
                    style={{ ['--gallery-filter-color' as string]: primary, ['--gallery-filter-accent' as string]: accent }}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            )}

            <div className="public-site-gallery__grid mt-7" data-filter={filter}>
              {visibleItems.map((item, index) => {
                const isPrimary = filter === 'all' ? Boolean(item.featured) || index === 0 : index === 0;
                const caption = item.caption?.trim();
                return (
                  <figure
                    key={item.id}
                    className="public-site-gallery__item group relative overflow-hidden"
                    data-primary={isPrimary ? 'true' : 'false'}
                    data-category={item.category}
                    style={{ borderRadius: radius }}
                  >
                    <img
                      src={item.url}
                      alt={caption || CATEGORY_LABELS[item.category]}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    {(caption || item.featured) && <div className="public-site-gallery__shade absolute inset-0" />}
                    {item.featured && filter === 'all' && (
                      <span className="public-site-gallery__featured absolute left-4 top-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                        <Star className="h-3 w-3 fill-current" /> Destaque
                      </span>
                    )}
                    {caption && (
                      <figcaption className="public-site-gallery__caption absolute bottom-0 left-0 right-0 p-5 text-sm font-bold text-white">
                        <span>{caption}</span>
                        <small>{CATEGORY_LABELS[item.category]}</small>
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-7 flex min-h-44 items-center justify-center border border-dashed p-8 text-center" style={{ borderColor: `${secondary}55`, borderRadius: radius }}>
            <div>
              <Images className="mx-auto h-8 w-8 opacity-40" style={{ color: secondary }} />
              <p className="mt-3 text-sm font-semibold">Adicione fotos em Administração → Site Público → Gerenciar galeria e publique as alterações.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
