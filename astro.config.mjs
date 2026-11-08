// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gameassets.tr',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      i18n: { defaultLocale: 'en', locales: { en: 'en', tr: 'tr' } },
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
