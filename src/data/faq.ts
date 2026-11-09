import { assets, bundles, minPrice, totalModels } from './site';
import type { T } from '../i18n';

/** The nine FAQ entries, localized, with live catalog numbers filled in. */
export function faqItems(t: T) {
  const vars = { bundles: bundles.length, min: `$${minPrice.toFixed(2)}`, packs: assets.length, models: Math.floor(totalModels / 100) * 100 };
  return Array.from({ length: 9 }, (_, i) => ({ q: t(`faq.${i + 1}.q`, vars), a: t(`faq.${i + 1}.a`, vars) }));
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
