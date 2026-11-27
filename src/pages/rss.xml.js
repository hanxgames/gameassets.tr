import rss from '@astrojs/rss';
import { SITE } from '../data/site';
import { newest, creatorByHandle } from '../data/market';

export function GET(context) {
  return rss({
    title: 'Game Assets — New game asset packs',
    description: SITE.description,
    site: context.site,
    items: newest.slice(0, 100).map((a) => ({
      title: `${a.title} — ${a.priceValue ? a.price : 'Free'}`,
      link: `/assets/${a.slug}/`,
      pubDate: a.published ? new Date(a.published) : new Date(),
      description: `${a.shortDescription} By ${creatorByHandle(a.creator)?.name ?? a.creator}.`,
      categories: a.tags,
      enclosure: { url: new URL(a.cover.src, SITE.url).toString(), type: a.cover.src.endsWith('.webp') ? 'image/webp' : 'image/png', length: 0 },
    })),
    customData: '<language>en-us</language>',
  });
}
