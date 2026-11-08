export function GET() {
  return new Response(
    `User-agent: *
Allow: /
Disallow: /404/

Sitemap: https://gameassets.tr/sitemap-index.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
