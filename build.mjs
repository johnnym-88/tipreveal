// Kama Tip static site generator. Run: node build.mjs  (Vercel runs it automatically; see vercel.json)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const S = require("./src/shared.js");
const BRAND = "Kama Tip";
// Domain: set the SITE_URL environment variable in Vercel (or edit the fallback below).
const SITE = (process.env.SITE_URL || "https://www.kamatip.com").replace(/\/$/, "");
const OUT = path.join(ROOT, "dist");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const data = JSON.parse(read("data/tips.json"));
const I18N = JSON.parse(read("src/i18n.json"));
const TEMPLATE = read("src/page.html");
const DOC_TEMPLATE = read("src/doc.html");
const SITE_CFG = JSON.parse(read("data/site.json"));
if (!SITE_CFG.contactEmail) console.warn("WARNING: data/site.json has no contactEmail, so the privacy page will have no contact section.");
const N = data.length;
const LANGS = ["he", "en"];

/* ---------- validation: fail the build on bad data ---------- */
const slugs = new Set();
for (const c of data) {
  for (const k of ["slug", "he", "en", "flag", "code", "sym", "cur_he", "cur_en", "region", "accent", "type", "min", "max", "default",
    "status", "sc", "after", "conf", "verified", "note_he", "note_en", "sources"]) {
    if (c[k] === undefined || c[k] === null || c[k] === "") {
      if (k === "sc_pct") continue;
      throw new Error(`Missing "${k}" for ${c.en || c.slug}`);
    }
  }
  if (slugs.has(c.slug)) throw new Error("Duplicate slug " + c.slug);
  slugs.add(c.slug);
  if (!["percentage", "round_up", "none"].includes(c.type)) throw new Error("Bad type for " + c.en);
  if (c.min > c.max) throw new Error("min > max for " + c.en);
  if (!/^#[0-9A-Fa-f]{6}$/.test(c.accent)) throw new Error("Bad accent for " + c.en);
  if (!c.sources.length) throw new Error("No sources for " + c.en);
  for (const l of LANGS) {
    const L = I18N[l];
    if (!L.status[c.status] || !L.sc[c.sc] || !L.after_long[c.after] || !L.conf[c.conf]) throw new Error("Unknown enum for " + c.en);
  }
}

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = S.fmt;
const nm = (c, l) => (l === "he" ? c.he : c.en);
const noteOf = (c, l) => (l === "he" ? c.note_he : c.note_en);
const homePath = (l) => (l === "he" ? "/" : "/en");
const urlPath = (c, l) => (l === "he" ? "" : "/en") + "/tip/" + c.slug;
const ltr = (l, s) => (l === "he" ? "\u2066" + s + "\u2069" : s);
const bdi = (s) => `<bdi dir="ltr">${s}</bdi>`;
const byEn = (en) => data.find((c) => c.en === en);
const POPULAR = ["Greece", "Cyprus", "Thailand", "United States", "Italy", "Georgia", "United Arab Emirates", "Hungary", "Turkey", "Spain", "Germany", "Japan"];

function rangeText(c, l, html) {
  const L = I18N[l];
  if (c.type === "percentage") return html ? bdi(S.pctRange(c)) : ltr(l, S.pctRange(c));
  return S.rangePhrase(c, L);
}
function answerSentence(c, l, html) {
  const L = I18N[l];
  const pl = S.placeOf(c, l, L, true);
  const key = c.type === "percentage" ? "ans_pct" : c.type === "round_up" ? "ans_round" : "ans_none";
  return fmt(L[key], { place: pl, Place: pl, range: rangeText(c, l, html), max: c.max });
}
function scSentence(c, l) {
  const L = I18N[l];
  const key = c.sc_pct && (c.sc === "common" || c.sc === "sometimes") ? c.sc + "_pct" : c.sc;
  return fmt(L.scs[key], { pct: c.sc_pct });
}
function exampleRows(c, l) {
  const L = I18N[l];
  const m = (v) => S.money(v, c, L.num_locale);
  return (S.SAMPLE[c.code] || [50, 100, 200]).map((b) => {
    let tip, total;
    if (c.type === "percentage") {
      const lo = (b * c.min) / 100, hi = (b * c.max) / 100;
      tip = lo === hi ? m(lo) : `${m(lo)}–${m(hi)}`;
      total = lo === hi ? m(b + lo) : `${m(b + lo)}–${m(b + hi)}`;
    } else if (c.type === "round_up") {
      tip = `${L.ex_round} (${fmt(L.ex_upto, { x: m((b * c.max) / 100) })})`;
      total = `${m(b)}+`;
    } else { tip = m(0); total = m(b); }
    return { bill: m(b), tip, total };
  });
}
function relatedList(c) {
  const same = data.filter((d) => d.region === c.region && d.en !== c.en);
  const idx = data.filter((d) => d.region === c.region).findIndex((d) => d.en === c.en);
  const regionAll = data.filter((d) => d.region === c.region);
  const rotated = regionAll.slice(idx + 1).concat(regionAll.slice(0, idx));
  const out = [];
  for (const d of rotated.concat(POPULAR.map(byEn).filter(Boolean), data)) {
    if (d.en !== c.en && !out.includes(d)) out.push(d);
    if (out.length >= 18) break;
  }
  void same;
  return out;
}
function render(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error("Template variable not provided: " + k);
    return vars[k];
  });
}
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

/* ---------- version hash for cache busting ---------- */
const appJs = read("src/app.js"), sharedJs = read("src/shared.js"), cardJs = read("src/card.js"), css = read("src/style.css");
const dataJs = "window.TIPS=" + JSON.stringify(data) + ";";
const i18nJs = "window.I18N=" + JSON.stringify(I18N) + ";";
const VER = crypto.createHash("md5").update(appJs + sharedJs + cardJs + css + dataJs + i18nJs).digest("hex").slice(0, 8);

/* ---------- page sections ---------- */
function infoSection(l) {
  const L = I18N[l];
  return `<section class="info"><div class="wrap">
    <div><h2>${L.info1_h}</h2><p>${L.info1_p}</p></div>
    <div><h2>${L.info2_h}</h2><p>${L.info2_p}</p></div>
    <div><h2>${L.info3_h}</h2><p>${L.info3_p}</p></div>
  </div></section>`;
}
function tableSection(l) {
  const L = I18N[l];
  const key = l === "he" ? "he" : "en";
  const rows = [...data].sort((a, b) => a[key].localeCompare(b[key], l)).map((c) => {
    const href = urlPath(c, l);
    const rg = c.type === "percentage" ? bdi(S.pctRange(c)) : c.type === "round_up" ? L.tbl_round : L.tbl_none;
    return `<tr data-href="${href}"><td><a href="${href}">${c.flag} ${esc(nm(c, l))}</a></td><td class="pct">${rg}</td><td>${L.sc[c.sc]}</td><td>${L.after_short[c.after]}</td></tr>`;
  }).join("\n");
  return `<section class="all"><div class="wrap">
    <h2 id="all-h">${fmt(L.all_h, { n: N })}</h2>
    <div class="tablewrap" data-nosnippet><table>
      <thead><tr><th>${L.th_country}</th><th>${L.th_range}</th><th>${L.th_sc}</th><th>${L.th_after}</th></tr></thead>
      <tbody id="tbl">${rows}</tbody>
    </table></div>
  </div></section>`;
}
function articleSection(c, l, rel) {
  const L = I18N[l];
  const pl = S.placeOf(c, l, L, false);
  const date = new Intl.DateTimeFormat(L.date_locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(c.verified + "T00:00:00"));
  const rangeHtml = c.type === "percentage" ? bdi(S.pctRange(c)) : esc(S.rangePhrase(c, L));
  const scLabel = L.sc[c.sc] + (c.sc_pct && (c.sc === "common" || c.sc === "sometimes") ? ` (~${c.sc_pct}%)` : "");
  const cur = l === "he" ? c.cur_he : c.cur_en;
  const rows = exampleRows(c, l).map((r) => `<tr><td>${bdi(r.bill)}</td><td>${bdi(r.tip)}</td><td>${bdi(r.total)}</td></tr>`).join("");
  const bills = exampleRows(c, l);
  const midBill = bills[1];
  let a2 = answerSentence(c, l, true);
  if (c.type === "percentage") a2 += " " + fmt(L.ans_example, { bill: bdi(midBill.bill), tip: bdi(midBill.tip) });
  const a3 = scSentence(c, l) + " " + L.after_long[c.after];
  const srcs = c.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc((l === "en" && s.name_en) || s.name)}</a></li>`).join("");
  const more = rel.slice(0, 12).map((d) => `<a href="${urlPath(d, l)}">${d.flag} ${esc(nm(d, l))}</a>`).join("");
  return `<section class="article"><div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${homePath(l)}">${L.crumb_home}</a> › <span>${c.flag} ${esc(nm(c, l))}</span></nav>
    <p class="teaser">${fmt(L.teaser, { place: pl })}</p>
    <div data-nosnippet>
    <h2 class="first">${L.h_quick}</h2>
    <p>${answerSentence(c, l, true)} ${scSentence(c, l)}</p>
    <div class="facts">
      <div class="fact"><b>${L.f_range}</b><span>${rangeHtml}</span></div>
      <div class="fact"><b>${L.f_status}</b><span>${L.status[c.status]}</span></div>
      <div class="fact"><b>${L.f_sc}</b><span>${esc(scLabel)}</span></div>
    </div>
    <p class="small">${fmt(L.currency_line, { cur: esc(cur), sym: esc(c.sym) })}</p>

    <h2>${fmt(L.h_sc, { place: pl })}</h2>
    <p>${scSentence(c, l)} ${L.after_long[c.after]}</p>

    <h2>${fmt(L.h_local, { place: pl })}</h2>
    <p>${esc(noteOf(c, l))}</p>

    <h2>${L.h_examples}</h2>
    <div class="extbl"><div class="tablewrap"><table>
      <thead><tr><th>${L.th_bill}</th><th>${L.th_tip}</th><th>${L.th_total}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>
    <p class="small">${fmt(L.ex_note, { cur: esc(cur) })}</p>

    <h2>${L.h_faq}</h2>
    <h3>${fmt(L.q1, { place: pl })}</h3><p>${L.a1[c.status]}</p>
    <h3>${fmt(L.q2, { place: pl })}</h3><p>${a2}</p>
    <h3>${fmt(L.q3, { place: pl })}</h3><p>${a3}</p>

    <h2>${L.h_sources}</h2>
    <ul class="srcs-list">${srcs}</ul>
    <p class="meta-line">${L.conf_label}: ${L.conf[c.conf]} · ${L.verified_label} ${esc(date)}</p>

    </div>
    <h2>${L.h_more}</h2>
    <div class="related">${more}</div>
    <p style="margin-top:18px"><a href="${homePath(l)}">${fmt(L.back_all, { n: N })}</a></p>
  </div></section>`;
}

/* ---------- page assembly ---------- */
function alternates(hePath, enPath) {
  return [`<link rel="alternate" hreflang="he" href="${SITE}${hePath}">`, `<link rel="alternate" hreflang="en" href="${SITE}${enPath}">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${hePath}">`].join("\n");
}
function buildPage(l, kind, c) {
  const L = I18N[l];
  const other = l === "he" ? "en" : "he";
  const isCountry = kind === "country";
  const dflt = isCountry ? c : byEn("Israel");
  const hePath = isCountry ? urlPath(c, "he") : homePath("he");
  const enPath = isCountry ? urlPath(c, "en") : homePath("en");
  const canonical = SITE + (l === "he" ? hePath : enPath);
  const title = isCountry
    ? fmt(L.title_teaser, { place: S.placeOf(c, l, L, false) })
    : L.home_title;
  let description;
  if (isCountry) {
    description = fmt(L.desc_teaser, { place: S.placeOf(c, l, L, false) });
  } else description = fmt(L.home_desc, { n: N });
  const rel = isCountry ? relatedList(c) : [];
  // Same favorites row on every page (the app fills it with the visitor's starred countries).
  const quickHtml = `<span class="ql">${L.quick_favs_label}</span><span class="qh">${L.quick_hint}</span>`;
  const siteSchema = { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, alternateName: ["Kama Tip?", "כמה טיפ"], url: SITE + "/" };
  const jsonld0 = isCountry
    ? { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: BRAND, item: SITE + homePath(l) },
        { "@type": "ListItem", position: 2, name: nm(c, l), item: canonical }] }
    : { "@context": "https://schema.org", "@type": "WebApplication", name: BRAND, url: canonical, inLanguage: l,
        applicationCategory: "TravelApplication", description, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  const jsonld = !isCountry && l === "he" ? [jsonld0, siteSchema] : jsonld0;
  const theme = isCountry
    ? `<style>:root{--accent:${c.accent};--on-accent:${S.onAccent(c.accent)};--accent-text:${S.accentText(c.accent)}}</style>`
    : "";
  const vars = {
    ...Object.fromEntries(Object.entries(L).filter(([, v]) => typeof v === "string")),
    lang: l, dir: L.dir, title: esc(title), description: esc(description), canonical,
    alternates: alternates(hePath, enPath), ogImage: SITE + (isCountry ? `/og/${c.slug}${l === "he" ? "" : "-en"}.png` : l === "he" ? "/og.png" : "/og-en.png"),
    jsonld: `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`, ver: VER, theme,
    privacyHref: l === "he" ? "/privacy" : "/en/privacy", contactBtn: contactBtn(l), homeHref: homePath(l), langHref: isCountry ? urlPath(c, other) : homePath(other),
    h1_place: isCountry ? S.placeOf(c, l, L, false) + "?" : L.h1_abroad,
    heroP: isCountry ? `<span data-nosnippet>${answerSentence(c, l, true)}</span>` : L.hero_p,
    quickAria: L.quick_aria_favs, brand: BRAND, quickHtml,
    c_flag: dflt.flag, c_name: esc(nm(dflt, l)), c_sym: esc(dflt.sym), c_bill: (S.SAMPLE[dflt.code] || [50, 100, 200])[1],
    sections: isCountry ? articleSection(c, l, rel) : infoSection(l) + "\n" + tableSection(l),
    pageJson: JSON.stringify(isCountry ? { lang: l, type: "country", country: c.en } : { lang: l, type: "home" }),
  };
  return render(TEMPLATE, vars);
}

/* ---------- contact button (mailto) ---------- */
function contactBtn(l) {
  const email = (SITE_CFG.contactEmail || "").trim();
  if (!email) return "";
  const L = I18N[l];
  const href = `mailto:${email}?subject=${encodeURIComponent(L.contact_subject)}`;
  return `<a class="contact-btn" href="${esc(href)}">✉ ${L.contact_btn}</a>`;
}

/* ---------- privacy policy page ---------- */
function buildDoc(l) {
  const L = I18N[l];
  const other = l === "he" ? "en" : "he";
  const hePath = "/privacy", enPath = "/en/privacy";
  const canonical = SITE + (l === "he" ? hePath : enPath);
  const name = (SITE_CFG.operatorName || "").trim();
  const email = (SITE_CFG.contactEmail || "").trim();
  const operator = l === "he"
    ? (name ? `האתר <bdi dir="ltr">Kama Tip?</bdi> (<bdi dir="ltr">kamatip.com</bdi>) מופעל על ידי ${esc(name)} (להלן: "אנחנו").` : `אנחנו מפעילים את האתר <bdi dir="ltr">Kama Tip?</bdi> (<bdi dir="ltr">kamatip.com</bdi>).`)
    : (name ? `Kama Tip? (kamatip.com) is operated by ${esc(name)} ("we").` : `We operate Kama Tip? (kamatip.com).`);
  const contact = email
    ? (l === "he"
        ? `<h2>יצירת קשר</h2><p>לשאלות או לבקשות בנושא פרטיות: <a href="mailto:${esc(email)}">${esc(email)}</a></p>`
        : `<h2>Contact</h2><p>For privacy questions or requests: <a href="mailto:${esc(email)}">${esc(email)}</a></p>`)
    : "";
  const content = render(read(`src/privacy.${l}.html`), { operator, contact_section: contact });
  const date = new Intl.DateTimeFormat(L.date_locale, { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(SITE_CFG.privacyUpdated + "T00:00:00"));
  const vars = {
    ...Object.fromEntries(Object.entries(L).filter(([, v]) => typeof v === "string")),
    lang: l, dir: L.dir, title: esc(L.privacy_title), description: esc(L.privacy_desc), canonical,
    alternates: alternates(hePath, enPath), ogImage: SITE + (l === "he" ? "/og.png" : "/og-en.png"),
    ver: VER, brand: BRAND, homeHref: homePath(l), langHref: l === "he" ? enPath : hePath,
    privacyHref: l === "he" ? hePath : enPath, contactBtn: contactBtn(l), updated_line: `${L.updated_label} ${esc(date)}`, content,
  };
  void other;
  return render(DOC_TEMPLATE, vars);
}

/* ---------- output ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
write("index.html", buildPage("he", "home"));
write("privacy/index.html", buildDoc("he"));
write("en/privacy/index.html", buildDoc("en"));
write("en/index.html", buildPage("en", "home"));
for (const c of data) {
  write(`tip/${c.slug}/index.html`, buildPage("he", "country", c));
  write(`en/tip/${c.slug}/index.html`, buildPage("en", "country", c));
}
write("style.css", css);
write("app.js", appJs);
write("shared.js", sharedJs);
write("card.js", cardJs);
write("data.js", dataJs);
write("i18n.js", i18nJs);
const pub = path.join(ROOT, "public");
if (fs.existsSync(pub)) fs.cpSync(pub, OUT, { recursive: true });

const lastmod = data.map((c) => c.verified).sort().slice(-1)[0];
const urlEntry = (hePath, enPath, lm) => LANGS.map((l) => {
  const loc = SITE + (l === "he" ? hePath : enPath);
  return `  <url><loc>${loc}</loc><lastmod>${lm}</lastmod>
    <xhtml:link rel="alternate" hreflang="he" href="${SITE}${hePath}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${enPath}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${hePath}"/>
  </url>`;
}).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntry("/", "/en", lastmod)}
${urlEntry("/privacy", "/en/privacy", SITE_CFG.privacyUpdated)}
${data.map((c) => urlEntry(urlPath(c, "he"), urlPath(c, "en"), c.verified)).join("\n")}
</urlset>
`;
write("sitemap.xml", sitemap);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

const pages = 4 + data.length * 2;
console.log(`Kama Tip build OK: ${data.length} countries, ${pages} pages, version ${VER}`);
