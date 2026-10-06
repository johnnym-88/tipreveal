/* Helpers shared by the browser (app.js) and the build script (build.mjs). */
(function (root) {
  var SAMPLE = {
    ILS:[150,300,600], USD:[50,100,200], CAD:[50,100,200], GBP:[40,80,160], EUR:[25,50,100], CHF:[50,100,200],
    CZK:[500,1000,2000], HUF:[10000,20000,40000], PLN:[100,200,400], RUB:[2000,4000,8000], UAH:[500,1000,2000],
    TRY:[1000,2000,4000], ALL:[3000,6000,12000], GEL:[60,120,240], AZN:[50,100,200], RON:[100,200,400],
    RSD:[3000,6000,12000], DKK:[300,600,1200], SEK:[300,600,1200], MDL:[400,800,1600], BYN:[50,100,200],
    BAM:[40,80,160], AMD:[10000,20000,40000], AED:[150,300,600], THB:[500,1000,2000], VND:[500000,1000000,2000000],
    JPY:[3000,6000,12000], KRW:[30000,60000,120000], SGD:[50,100,200], INR:[1000,2000,4000], CNY:[200,400,800],
    PHP:[1000,2000,4000], MAD:[200,400,800], HKD:[300,600,1200], EGP:[500,1000,2000], JOD:[20,40,80],
    MXN:[500,1000,2000], BRL:[100,200,400], ARS:[30000,60000,120000], PEN:[80,160,320], COP:[100000,200000,400000],
    DOP:[2000,4000,8000], AUD:[60,120,240], NZD:[60,120,240], IDR:[200000,400000,800000], LKR:[5000,10000,20000],
    MYR:[60,120,240], NPR:[2000,4000,8000], ZAR:[300,600,1200], NOK:[500,1000,2000], ISK:[6000,12000,24000],
    KZT:[10000,20000,40000], UZS:[150000,300000,600000], TWD:[500,1000,2000], LAK:[200000,400000,800000], CRC:[15000,30000,60000],
    CLP:[20000,40000,80000], BOB:[150,300,600], UYU:[1500,3000,6000], GTQ:[200,400,800], KES:[2000,4000,8000], TZS:[30000,60000,120000],
    ETB:[1500,3000,6000], MUR:[1000,2000,4000], SCR:[500,1000,2000], BHD:[10,20,40], MKD:[1000,2000,4000],
    QAR:[150,300,600], OMR:[10,20,40], MOP:[300,600,1200], MNT:[60000,120000,240000], BTN:[1000,2000,4000], KGS:[1500,3000,6000],
    NAD:[300,600,1200], BWP:[300,600,1200], RWF:[20000,40000,80000], UGX:[80000,160000,320000], ZMW:[300,600,1200], GHS:[200,400,800],
    CVE:[2000,4000,8000], MGA:[50000,100000,200000], CUP:[5000,10000,20000], JMD:[5000,10000,20000], BSD:[50,100,200], BBD:[100,200,400],
    BZD:[100,200,400], NIO:[800,1600,3200], HNL:[500,1000,2000], PYG:[150000,300000,600000], FJD:[60,120,240], XPF:[4000,8000,16000]
  };
  var SUFFIX = ["Ft","Kč","zł","kr","kr.","lei","DH","L","KM","Br","RSD","CHF","AED","₫","JD","SCR","BD","ден","soʻm","QR","OMR","Nu.","KGS","RWF","CVE","Ar","CUP","XPF"];
  function fmt(tpl, o) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }
  function digits(code) {
    try { return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits; }
    catch (e) { return 2; }
  }
  function money(v, c, locale) {
    var n = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: digits(c.code) }).format(v);
    return SUFFIX.indexOf(c.sym) >= 0 ? n + " " + c.sym : c.sym + n;
  }
  function placeOf(c, lang, L, cap) {
    if (lang === "he") return (L.loc && L.loc[c.en]) || ("ב" + c.he);
    var p = "in " + ((L.the || []).indexOf(c.en) >= 0 ? "the " : "") + c.en;
    return cap ? p.charAt(0).toUpperCase() + p.slice(1) : p;
  }
  function pctRange(c) {
    var f = function (x) { return String(+x); };
    return c.min === c.max ? f(c.min) + "%" : f(c.min) + "%–" + f(c.max) + "%";
  }
  function rangePhrase(c, L) {
    if (c.type === "none") return L.range_none;
    if (c.type === "round_up") return fmt(L.range_round, { max: c.max });
    return pctRange(c);
  }
  function lum(hex) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var f = function (x) { return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function onAccent(a) { return lum(a) > 0.45 ? "#1A1936" : "#FFFFFF"; }
  function accentText(a) { return lum(a) > 0.45 ? "color-mix(in srgb, " + a + " 45%, #1A1936)" : a; }
  var api = { SAMPLE: SAMPLE, fmt: fmt, money: money, placeOf: placeOf, pctRange: pctRange, rangePhrase: rangePhrase,
              onAccent: onAccent, accentText: accentText };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Shared = api;
})(typeof window !== "undefined" ? window : globalThis);
