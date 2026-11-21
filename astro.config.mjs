// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// itch.io'dan kalkan paketlerin eski adresleri (Search Console 404) → yerine geçen paket; her dil öneki için yönlendirme sayfası
// Katalogda hâlâ duran paket için yönlendirme üretilmez (sayfasıyla çakışmasın): itch'ten kalkan paket retired.json'a önceden
// eklenebilir, günlük eşitleme onu katalogdan düşürünce yönlendirme kendiliğinden devreye girer.
const RETIRED = JSON.parse(readFileSync(new URL('./src/data/retired.json', import.meta.url), 'utf8')).assets;
const CATALOG = new Set(JSON.parse(readFileSync(new URL('./src/data/catalog.json', import.meta.url), 'utf8')).assets.map((a) => a.slug));
const PREFIXES = ['', '/tr', '/de', '/fr', '/es', '/it', '/pt', '/pl', '/ru', '/ja', '/ko', '/zh', '/id', '/vi'];
const redirects = Object.fromEntries(
  Object.entries(RETIRED).filter(([from, to]) => !CATALOG.has(from) && CATALOG.has(to)).flatMap(([from, to]) =>
    PREFIXES.map((p) => [`${p}/assets/${from}/`, { status: 301, destination: `${p}/assets/${to}/` }]),
  ),
);

export default defineConfig({
  site: 'https://gameassets.tr',
  trailingSlash: 'always',
  redirects,
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', tr: 'tr', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt-BR', pl: 'pl', ru: 'ru', ja: 'ja', ko: 'ko', zh: 'zh-Hans', id: 'id', vi: 'vi' },
      },
      serialize(item) {
        if (item.url === 'https://gameassets.tr/') item.priority = 1.0;
        else if (item.url.includes('/assets/') || item.url.includes('/bundles/')) item.priority = 0.9;
        else item.priority = 0.7;
        item.lastmod = new Date().toISOString();
        return item;
      },
    }),
  ],
});
