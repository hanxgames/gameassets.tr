import { assets, bundles, SITE, SERIES, bundleName } from '../data/site';

// llms.txt — a concise, machine-readable map of the site for AI assistants & answer engines.
export function GET() {
  const lines = [
    `# ${SITE.name} — ${SITE.brand} by ${SITE.studio}`,
    '',
    `> ${SITE.description}`,
    '',
    'All packs are purchased and downloaded via itch.io (secure checkout, instant download). Formats: GLB, FBX, OBJ, Blender .blend. Engines: Unity, Godot 4, Unreal Engine 5, Blender, three.js. License: royalty-free commercial use, no attribution required, no resale of raw files.',
    '',
    '## Collections',
    ...Object.values(SERIES).map((s) => `- [${s.title}](${SITE.url}/collections/${s.slug}/): ${s.blurb}`),
    '',
    '## Asset packs',
    ...assets.map((a) => `- [${a.title}](${SITE.url}/assets/${a.slug}/) — ${a.price}${a.originalPrice ? ` (was ${a.originalPrice})` : ''}: ${a.shortDescription} Buy: ${a.buyUrl}`),
    '',
    '## Bundles',
    ...bundles.map((b) => `- [${bundleName(b)}](${SITE.url}/bundles/${b.slug}/) — ${b.members.length} packs for ${b.bundlePrice} (regularly ${b.regularPrice}). Buy: ${b.url}`),
    '',
    '## Info',
    `- [FAQ](${SITE.url}/faq/)`,
    `- [License](${SITE.url}/license/)`,
    `- [itch.io store](${SITE.itch})`,
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
