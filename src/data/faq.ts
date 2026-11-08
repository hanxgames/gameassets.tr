import { assets, bundles, minPrice, totalModels } from './site';

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Can I use HanX Assets in commercial games?',
    a: 'Yes. Every pack comes with a royalty-free license for unlimited personal and commercial projects — games, apps, videos, client work and game jams. No attribution is required. The only thing you can’t do is resell or redistribute the raw asset files themselves.',
  },
  {
    q: 'Which game engines are supported?',
    a: 'All packs work in Unity, Godot 4, Unreal Engine 5, Blender, three.js / WebGL and any engine that reads glTF (GLB), FBX or OBJ. A native Blender .blend file is included with every model already marked as an Asset for the Asset Browser.',
  },
  {
    q: 'Are the assets optimized for mobile and web games?',
    a: 'Absolutely. The models are low poly (typically a few hundred to ~2,000 triangles) and every pack shares one material and one small palette texture, so whole scenes can be batched into a single draw call. That makes them ideal for mobile, WebGL, VR and Nintendo Switch–class hardware.',
  },
  {
    q: 'Can I mix models from different packs?',
    a: 'Yes — that’s the whole idea. All HanX Assets packs share the same palette, scale (real-world meters) and 8 m grid, so the City, Traffic, Village, School, SWAT and seasonal Halloween/Christmas packs snap together into one consistent world.',
  },
  {
    q: 'How do I buy and download the packs?',
    a: 'Click any “Buy” button on GameAssets.tr and the secure itch.io checkout opens instantly. Pay with card or PayPal, and the download link is available immediately and stays in your itch.io library forever — including all future updates of the pack.',
  },
  {
    q: 'Is there a bundle discount?',
    a: `Yes. We currently offer ${bundles.length} bundles that include multiple packs for a fraction of the individual price — check the Bundles page for the latest deals and countdowns.`,
  },
  {
    q: 'How much do the asset packs cost?',
    a: `Packs start at just $${minPrice.toFixed(2)}. Our catalog has ${assets.length} packs with more than ${Math.floor(totalModels / 100) * 100} game-ready models in total.`,
  },
  {
    q: 'Was generative AI used to make these assets?',
    a: 'No. Every model is hand-made by HanX Games — the packs are tagged “No generative AI was used” on itch.io.',
  },
  {
    q: 'Do you take requests or custom work?',
    a: 'We love requests! Leave a comment on any pack’s itch.io page or reach us on X (@Hanxgames_) and tell us what you need for your game — popular requests become new packs.',
  },
];

export function faqJsonLd(items = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
