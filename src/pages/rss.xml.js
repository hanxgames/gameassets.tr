import rss from '@astrojs/rss';
import { assets, SITE } from '../data/site';

export function GET(context) {
  const items = [...assets].sort((a, b) => +new Date(b.published ?? 0) - +new Date(a.published ?? 0));
  return rss({
    title: 'HanX Assets — New game asset packs',
    description: SITE.description,
    site: context.site,
    items: items.map((a) => ({
      title: `${a.title} — ${a.price}`,
      link: `/assets/${a.slug}/`,
      pubDate: a.published ? new Date(a.published) : new Date(),
      description: a.shortDescription,
      categories: a.tags,
      enclosure: { url: new URL(a.cover.src, SITE.url).toString(), type: 'image/webp', length: 0 },
    })),
    customData: '<language>en-us</language>',
  });
}
