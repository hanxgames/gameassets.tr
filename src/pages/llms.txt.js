import { bundles, SITE, SERIES, bundleName } from '../data/site';
import { CATEGORIES, listings, activeCreators, creatorByHandle } from '../data/market';
import en from '../i18n/ui/en.json';

// llms.txt — a concise, machine-readable map of the site for AI assistants & answer engines.
export function GET() {
  const lines = [
    `# ${SITE.name} — ${SITE.brand}`,
    '',
    `> ${SITE.description}`,
    '',
    'GameAssets.tr is a free showcase of game assets from independent creators. Every pack is bought on the creator’s own store page; each creator sets the license for their packs.',
    '',
    '## Categories',
    ...CATEGORIES.map((c) => `- [${en[`catg.${c.key}.title`]}](${SITE.url}/category/${c.slug}/): ${en[`catg.${c.key}.lead`]}`),
    '',
    '## Creators',
    ...activeCreators.map((c) => `- [${c.name}](${SITE.url}/creators/${c.handle}/)`),
    '',
    '## Asset packs',
    ...listings.map((a) => `- [${a.title}](${SITE.url}/assets/${a.slug}/) by ${creatorByHandle(a.creator)?.name ?? a.creator} — ${a.priceValue ? a.price : 'Free'}: ${a.shortDescription}`),
    '',
    '## HanX Games collections',
    ...Object.values(SERIES).map((s) => `- [${s.title}](${SITE.url}/collections/${s.slug}/): ${s.blurb}`),
    ...bundles.map((b) => `- [${bundleName(b)}](${SITE.url}/bundles/${b.slug}/) — ${b.members.length} packs for ${b.bundlePrice} (regularly ${b.regularPrice}).`),
    '',
    '## Info',
    `- [FAQ](${SITE.url}/faq/)`,
    `- [Licenses](${SITE.url}/license/)`,
    `- [Sell your assets](${SITE.url}/sell/)`,
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
