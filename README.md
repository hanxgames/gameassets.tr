# gameassets.tr — HanX Assets vitrini

HanX Games'in [itch.io](https://hanx-games.itch.io/) mağazasındaki tüm asset paketlerini sergileyen, SEO odaklı statik site.
**Astro** ile üretilir, **GitHub Pages** üzerinde ücretsiz barınır, alan adı **gameassets.tr** (Bilhost DNS).

## Nasıl çalışır?

| Parça | Ne yapar |
| --- | --- |
| `scripts/sync-itch.mjs` | itch.io profilindeki tüm paketleri, fiyatları, indirimleri, açıklamaları, ekran görüntülerini ve bundle'ları çeker → `src/data/catalog.json` + `public/img/` (WebP) |
| `src/pages/` | Ana sayfa, katalog, her paket için detay sayfası, bundle'lar, koleksiyon & motor sayfaları, FAQ, lisans, Türkçe sayfa, RSS, robots, llms.txt |
| `.github/workflows/deploy.yml` | `main`'e her push'ta siteyi derleyip yayınlar. **Her gün** itch.io'yu otomatik senkronlar (yeni paket / fiyat değişikliği otomatik siteye düşer). |

## Yeni paket eklemek

Hiçbir şey yapma 🙂 — itch.io'ya paketi yükle, ertesi gün sitede olur.
Hemen görmek istersen: GitHub → **Actions → Build & deploy gameassets.tr → Run workflow**.

## Yerelde çalıştırma

```bash
npm install
npm run sync   # itch.io'dan katalogu çek (opsiyonel)
npm run dev    # http://localhost:4321
```

## Sık yapılan düzenlemeler

- Metinler / renkler: `src/styles/global.css`, `src/data/site.ts` (koleksiyon açıklamaları, SEO metinleri)
- SSS: `src/data/faq.ts`
- Öne çıkan paketler: `src/pages/index.astro` içindeki `featured` listesi
- Siteden gizlenecek itch sayfaları: `scripts/sync-itch.mjs` → `EXCLUDE`

## Arama motorları

- **Google Search Console:** `gameassets.tr` alan adı mülkü (DNS TXT ile doğrulanır), sitemap: `https://gameassets.tr/sitemap-index.xml`
- **IndexNow (Bing, Yandex, Seznam…):** içerik değiştiğinde deploy sonrası `scripts/indexnow.mjs` tüm URL'leri otomatik bildirir.
- Her paket sayfasında `Product` + `Offer` (fiyat, indirim bitişi), `BreadcrumbList`; ana sayfada `ItemList`, `FAQPage`, `WebSite` + arama kutusu şeması var.
- `llms.txt`: ChatGPT/Claude/Perplexity gibi AI asistanlarının siteyi doğru özetlemesi için makine-okunur katalog.

## Diller (14)

English (kök adres), Türkçe `/tr/`, Deutsch `/de/`, Français `/fr/`, Español `/es/`, Italiano `/it/`, Português (Brasil) `/pt/`, Polski `/pl/`, Русский `/ru/`, 日本語 `/ja/`, 한국어 `/ko/`, 简体中文 `/zh/`, Bahasa Indonesia `/id/`, Tiếng Việt `/vi/`.

- Arayüz metinleri: `src/i18n/ui/<dil>.json` (kaynak: `en.json`). Eksik anahtar olursa İngilizcesi gösterilir.
- Paket kısa açıklamaları: `src/i18n/packs/<dil>.json`. itch.io'ya yeni paket eklenirse çevirisi yoksa İngilizce kısa açıklama görünür; `src/i18n/packs-source.en.json` dosyasına bakıp ilgili dillere ekleyin.
- Uzun paket açıklamaları itch.io'daki gibi İngilizce kalır.
- Her sayfada `hreflang` etiketleri, site haritasında da dil bağlantıları otomatik üretilir. Dil listesi: `src/i18n/locales.ts`.
