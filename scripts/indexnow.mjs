#!/usr/bin/env node
/** Pings IndexNow (Bing, Yandex, Seznam, Naver…) with every URL in the built sitemap. Runs after each deploy. */
const HOST = 'gameassets.tr';
const KEY = '42b9f18113dad2682faf85ba5f72574b';
const xml = await fetch(`https://${HOST}/sitemap-0.xml`).then((r) => r.text());
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
