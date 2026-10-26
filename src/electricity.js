/* Power plug finder: pick a country, see plug types, voltage, and whether an Israeli plug fits. */
(function () {
  "use strict";
  var he = document.documentElement.lang === "he";
  var ELEC = window.ELEC, CFG = window.ELEC_CFG || {}, TIPS = window.TIPS;
  var $ = function (s) { return document.querySelector(s); };
  var T = he ? {
    pick: "בחרו מדינה…", type: "סוג", fits_h: "התקע הישראלי בדרך כלל מתאים",
    fits_p: "בשקעים של {place} אפשר להכניס תקע עם שני פינים עגולים (סוג C), כמו של רוב המטענים לטלפון, בלי מתאם. תקע שטוח עם שלוש יציאות (סוג H) לא ייכנס, ולמכשירים כאלה תצטרכו מתאם.",
    need_h: "צריך מתאם", need_p: "השקעים ב{place} שונים מהישראליים. כדי לחבר מטען או מכשיר מישראל תצטרכו מתאם לסוג {t}.",
    volt: "מתח", same_v: "כמו בישראל, אין בעיה לחבר מכשירים ישראליים.",
    low_v: "המתח נמוך מהישראלי. טלפונים, מחשבים ומצלמות עובדים בדרך כלל על 100–240 וולט ואין בעיה, אבל מכשירים שמיועדים ל-230 וולט בלבד, כמו מייבש שיער או מחליק שיער, לא יעבדו כראוי ועלולים להינזק. בדקו את הכיתוב על המטען.",
    high_v: "המתח גבוה מהישראלי, בערך 240 וולט. רוב המכשירים מתאימים, ובכל זאת כדאי לבדוק על המטען שכתוב 230 וולט או טווח 100–240 וולט.",
    varies: "המתח משתנה לפי אזור או מבנה.", hz: "תדר", buy: "קנו מתאם", buy_for: "מתאם לסוג {t}", universal: "מתאם אוניברסלי לנסיעות",
    q_type: "מתאם שקע סוג {t}", q_uni: "מתאם אוניברסלי לנסיעות", ali_q_type: "travel adapter plug type {t}", ali_q_uni: "universal travel adapter",
    ali: "AliExpress", ksp: "KSP", disc: "הקישורים הם קישורי שותפים, ואנחנו עשויים לקבל עמלה על רכישה, בלי תוספת עלות עבורכם.",
    mhz: "הערה", note: "מתאם משנה רק את צורת התקע. הוא לא ממיר מתח.", place: function (c) { return "ב" + c.he; }
  } : {
    pick: "Choose a country…", type: "Type", fits_h: "Your Israeli plug usually fits",
    fits_p: "Sockets in {place} take a two-round-pin plug (type C), like most phone chargers, with no adapter. A flat three-pin plug (type H) won't fit, so devices with one need an adapter.",
    need_h: "You need an adapter", need_p: "Sockets in {place} differ from Israeli ones. To plug in a charger or device from Israel you'll need a type {t} adapter.",
    volt: "Voltage", same_v: "Same as Israel, so Israeli devices work fine.",
    low_v: "Voltage is lower than in Israel. Phones, laptops and cameras usually accept 100–240 V and are fine, but devices rated for 230 V only, such as hair dryers and straighteners, won't work properly and could be damaged. Check the label on your charger.",
    high_v: "Voltage is slightly higher than in Israel, around 240 V. Most devices are fine, but check the label says 230 V or 100–240 V.",
    varies: "Voltage varies by region or building.", hz: "Frequency", buy: "Buy an adapter", buy_for: "Type {t} adapter", universal: "Universal travel adapter",
    q_type: "travel adapter plug type {t}", q_uni: "universal travel adapter", ali_q_type: "travel adapter plug type {t}", ali_q_uni: "universal travel adapter",
    ali: "AliExpress", ksp: "KSP", disc: "These are affiliate links: we may earn a commission on purchases, at no extra cost to you.",
    mhz: "Note", note: "An adapter only changes the plug shape. It does not convert voltage.", place: function (c) { return "in " + c.en; }
  };
  var FITS = "CEFHJKLN";

  /* simple front-view drawings of each plug type, 100x100 */
  var P = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; };
  var R = function (x, y, w, h, rot) { return '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1.5"' + (rot ? ' transform="rotate(' + rot + " " + x + " " + y + ')"' : "") + "/>"; };
  var DRAW = {
    A: R(37, 50, 6, 24) + R(63, 50, 6, 24),
    B: R(37, 40, 6, 22) + R(63, 40, 6, 22) + P(50, 68, 4.5),
    C: P(34, 50, 4.5) + P(66, 50, 4.5),
    D: P(50, 32, 6) + P(33, 62, 6) + P(67, 62, 6),
    E: P(34, 58, 4.5) + P(66, 58, 4.5) + '<circle cx="50" cy="30" r="4.5" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    F: P(34, 50, 4.5) + P(66, 50, 4.5) + R(19, 50, 3, 16) + R(81, 50, 3, 16),
    G: R(50, 30, 8, 14) + R(36, 62, 14, 6) + R(64, 62, 14, 6),
    H: R(36, 38, 5, 22, 28) + R(64, 38, 5, 22, -28) + R(50, 66, 5, 20),
    I: R(37, 38, 5, 22, -28) + R(63, 38, 5, 22, 28) + R(50, 66, 5, 20),
    J: P(34, 40, 4.5) + P(66, 40, 4.5) + P(46, 66, 4.5),
    K: P(34, 40, 4.5) + P(66, 40, 4.5) + R(50, 66, 5, 10),
    L: P(28, 50, 4) + P(50, 50, 4) + P(72, 50, 4),
    M: P(50, 28, 7.5) + P(31, 64, 7.5) + P(69, 64, 7.5),
    N: P(34, 40, 4.5) + P(66, 40, 4.5) + P(50, 66, 4.5),
    O: P(34, 42, 4) + P(66, 42, 4) + P(50, 66, 4)
  };
  var SQUARE = "ABGHI";
  function svg(t) {
    return '<svg viewBox="0 0 100 100" width="96" height="96" role="img" aria-label="' + T.type + " " + t + '"><rect x="3" y="3" width="94" height="94" rx="22" fill="#E4E7F4"/>' + (SQUARE.indexOf(t) >= 0 ? '<rect x="14" y="14" width="72" height="72" rx="18"' : '<circle cx="50" cy="50" r="37"') + ' fill="#fff" stroke="#BFC5DE" stroke-width="2.5"/><g fill="#1A1936" color="#1A1936">' + DRAW[t] + "</g></svg>";
  }
  function url(tpl, q) { return tpl.replace("{q}", encodeURIComponent(q)); }
  function link(kind, q) {
    var tpl = CFG.links && CFG.links[kind]; if (!tpl) return "";
    return '<a class="btn-buy" rel="sponsored noopener" target="_blank" href="' + url(tpl, q) + '">' + (kind === "ksp" ? T.ksp : T.ali) + "</a>";
  }
  function num(v) { var m = String(v).match(/\d+/g); return m ? m.map(Number) : []; }

  function show(slug) {
    var c = TIPS.find(function (x) { return x.slug === slug; }), e = ELEC[slug], box = $("#elec-result");
    if (!c || !e) { box.innerHTML = ""; return; }
    history.replaceState(null, "", "#" + slug);
    var place = T.place(c), fits = e.types.some(function (t) { return FITS.indexOf(t) >= 0; });
    var main = e.types[0], vs = num(e.v), v0 = vs[0], vmax = vs[vs.length - 1], msg;
    if (vs.length > 1) msg = T.varies;
    else if (Math.abs(v0 - 230) <= 12) msg = T.same_v;
    else if (v0 < 200) msg = T.low_v; else msg = T.high_v;
    var warn = vs.length > 1 || v0 < 200 || v0 > 242;
    var q1 = he ? T.q_type.replace("{t}", main) : T.q_type.replace("{t}", main), q2 = he ? T.q_uni : T.q_uni;
    var aq1 = T.ali_q_type.replace("{t}", main), aq2 = T.ali_q_uni;
    var buy = "";
    var mk = function (label, hq, aq) {
      var l = link("ksp", hq) + link("aliexpress", aq);
      return l ? '<div class="buy-row"><span>' + label + "</span>" + l + "</div>" : "";
    };
    buy = fits ? mk(T.universal, q2, aq2) : mk(T.buy_for.replace("{t}", main), q1, aq1) + mk(T.universal, q2, aq2);
    box.innerHTML =
      '<div class="e-card"><h2 class="e-title"><span aria-hidden="true">' + c.flag + "</span> " + (he ? c.he : c.en) + "</h2>" +
      '<div class="plugs">' + e.types.map(function (t) { return '<figure class="plug">' + svg(t) + "<figcaption>" + T.type + " <b>" + t + "</b></figcaption></figure>"; }).join("") + "</div>" +
      '<div class="verdict ' + (fits ? "ok" : "need") + '"><b>' + (fits ? T.fits_h : T.need_h) + "</b><p>" +
      (fits ? T.fits_p : T.need_p).replace("{place}", place).replace("{t}", main) + "</p></div>" +
      '<dl class="e-rows"><dt>' + T.volt + "</dt><dd dir=\"ltr\">" + e.v + " V</dd><dt>" + T.hz + "</dt><dd dir=\"ltr\">" + e.hz + " Hz</dd></dl>" +
      '<p class="vnote' + (warn ? " warn" : "") + '">' + msg + "</p>" +
      (buy ? '<div class="buy"><h3>' + T.buy + "</h3>" + buy + (CFG.disclosure ? '<p class="disc">' + T.disc + "</p>" : "") + "</div>" : "") +
      '<p class="vnote">' + T.mhz + ": " + T.note + "</p></div>";
  }

  /* ---------- country combobox (type to search, or open the list) ---------- */
  var S = window.Shared, L = window.I18N[he ? "he" : "en"], cur = null, active = 0, filtered = [];
  var nm = function (c) { return he ? c.he : c.en; };
  var LIST = TIPS.filter(function (c) { return ELEC[c.slug]; }).sort(function (a, b) { return nm(a).localeCompare(nm(b), he ? "he" : "en"); });
  function theme(c) {
    var a = c ? c.accent : "#2563EB", st = document.documentElement.style;
    st.setProperty("--accent", a); st.setProperty("--on-accent", S.onAccent(a)); st.setProperty("--accent-text", S.accentText(a));
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = a;
  }
  function choose(c) {
    cur = c; theme(c);
    $("#c-flag").textContent = c.flag; $("#c-name").textContent = nm(c);
    $("#h-place").textContent = S.placeOf(c, he ? "he" : "en", L, false) + "?";
    document.title = (he ? "איזה שקע חשמל יש " : "Which power plug ") + S.placeOf(c, he ? "he" : "en", L, false) + "? | Kama Tip";
    show(c.slug);
  }
  function openCombo(o) {
    $("#combo").classList.toggle("open", o); $("#combo-btn").setAttribute("aria-expanded", o);
    if (o) { $("#combo-q").value = ""; renderList(""); setTimeout(function () { $("#combo-q").focus(); }, 0); }
  }
  function renderList(q) {
    q = q.trim().toLowerCase();
    filtered = LIST.filter(function (c) { return !q || c.he.indexOf(q) >= 0 || c.en.toLowerCase().indexOf(q) >= 0; }); active = 0;
    var ul = $("#combo-list");
    ul.innerHTML = filtered.map(function (c, i) {
      return '<li role="option" id="opt' + i + '" aria-selected="' + (i === active) + '" data-i="' + i + '"><span>' + c.flag + "</span>" + nm(c) + '<span class="en">' + (he ? c.en : c.he) + "</span></li>";
    }).join("") || '<li aria-disabled="true">' + (he ? "לא נמצאה מדינה" : "No country found") + "</li>";
    ul.querySelectorAll("li[data-i]").forEach(function (li) {
      li.onclick = function () { choose(filtered[+li.dataset.i]); openCombo(false); $("#combo-btn").focus(); };
    });
  }
  function move(d) {
    if (!filtered.length) return;
    active = (active + d + filtered.length) % filtered.length;
    $("#combo-list").querySelectorAll('li[role="option"]').forEach(function (li, i) { li.setAttribute("aria-selected", i === active); });
    var o = $("#opt" + active); if (o) o.scrollIntoView({ block: "nearest" });
  }
  $("#combo-btn").onclick = function () { openCombo(!$("#combo").classList.contains("open")); };
  $("#combo-q").oninput = function (e) { renderList(e.target.value); };
  $("#combo-q").onkeydown = function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) { choose(filtered[active]); openCombo(false); $("#combo-btn").focus(); } }
    else if (e.key === "Escape") { openCombo(false); $("#combo-btn").focus(); }
  };
  document.addEventListener("click", function (e) { if (!$("#combo").contains(e.target)) openCombo(false); });
  var rd = $("#r-date"); if (rd) rd.textContent = new Intl.DateTimeFormat(L.date_locale, { day: "numeric", month: "numeric", year: "numeric" }).format(new Date());
  var h = location.hash.replace("#", "");
  var first = h && TIPS.find(function (c) { return c.slug === h && ELEC[c.slug]; });
  if (first) choose(first);
})();
