# TipReveal

Restaurant tipping calculator for travelers: 71 destinations, Hebrew + English, one page per country.

## How it works
`node build.mjs` generates the whole site into `dist/`:
- `/` and `/en` – calculator home pages (Hebrew / English)
- `/tip/<country>` and `/en/tip/<country>` – one SEO page per country (142 pages)
- `sitemap.xml` (with hreflang) and `robots.txt`

Vercel runs the build automatically on every push (see `vercel.json`). No dashboard settings needed.

## Updating data
Edit `data/tips.json` (one object per country: numbers, notes in both languages, sources), commit, and Vercel redeploys all pages.
The build fails with a clear message if a field is missing or invalid.

## Files
- `data/tips.json` – the data (source of truth)
- `src/i18n.json` – all Hebrew/English UI text
- `src/page.html` – page template · `src/style.css` · `src/app.js` · `src/shared.js`
- `public/` – static files copied as-is (`og.png`, `og-en.png`, `config.js`)
- `public/config.js` – optional: paste the n8n feedback webhook URL to show the "Found a mistake?" button
