(function () {
  "use strict";
  var P = window.PAGE, L = window.I18N[P.lang], DATA = window.TIPS, CFG = window.TIPREVEAL_CONFIG || {}, S = window.Shared;
  var lang = P.lang, isHe = lang === "he";
  var $ = function (s) { return document.querySelector(s); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var fmt = S.fmt;
  var nm = function (c) { return isHe ? c.he : c.en; };
  var noteOf = function (c) { return isHe ? c.note_he : c.note_en; };
  var place = function (c) { return S.placeOf(c, lang, L, true); };
  var money = function (v, c) { return S.money(v, c, L.num_locale); };
  var urlOf = function (c) { return (isHe ? "" : "/en") + "/tip/" + c.slug; };
  var QUICK = ["Greece", "Cyprus", "Thailand", "Czech Republic", "Hungary", "United States", "Israel", "United Kingdom", "Japan"];

  var h1Dynamic = false, cur = null, pct = 12, people = 1, userPct = false, billTouched = false, favs = [], noteTimer = null, active = 0, filtered = [];

  function billVal() {
    var v = parseFloat(($("#bill").value || "").replace(/[^\d.]/g, ""));
    return isFinite(v) ? v : 0;
  }
  function roundUpTarget(v) {
    if (v <= 0) return 0;
    var step = v < 20 ? 1 : v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 50 : 1000;
    return Math.ceil((v + 0.0001) / step) * step;
  }
  function sampleMid(c) { return (S.SAMPLE[c.code] || [50, 100, 200])[1]; }

  /* ---------- country ---------- */
  function setCountry(c, fromUser) {
    cur = c;
    if (fromUser) store.set("tipreveal-country", c.en);
    if (favs.indexOf(c.en) >= 0) store.set("tipreveal-lastfav", c.en);
    var a = c.accent || "#7C3AED", st = document.documentElement.style;
    st.setProperty("--accent", a); st.setProperty("--on-accent", S.onAccent(a)); st.setProperty("--accent-text", S.accentText(a));
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = a;
    $("#c-flag").textContent = c.flag; $("#c-name").textContent = nm(c); $("#sym").textContent = c.sym;
    syncFavBtn();
    if (P.type === "home" && (fromUser || h1Dynamic)) { h1Dynamic = true; $("#h-place").textContent = S.placeOf(c, lang, L, false) + "?"; }
    document.querySelectorAll("#quick button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.en === c.en); });

    var rg = c.type === "percentage" ? '<bdi dir="ltr">' + S.pctRange(c) + "</bdi>" : S.rangePhrase(c, L);
    var tpl = c.type === "percentage" ? L.norm_pct : c.type === "round_up" ? L.norm_round : L.norm_none;
    $("#norm").innerHTML = fmt(tpl, { flag: c.flag, place: place(c), range: rg }) +
      (c.type === "none" ? "" : ' <span class="chip">' + L.status[c.status] + "</span>");

    buildChips(c); userPct = false; pct = c.default; $("#sc").checked = false;
    var band = $("#band"), pos = function (x) { return x / 30 * 100; };
    band.style.left = pos(c.min) + "%"; band.style.width = Math.max(pos(c.max) - pos(c.min), 1.2) + "%";
    band.style.display = c.type === "none" ? "none" : "block";

    $("#note").textContent = noteOf(c);
    $("#conf").textContent = L.conf[c.conf]; $("#conf").className = "conf " + c.conf;
    $("#srcs").innerHTML = c.sources.map(function (s) {
      return '<li><a href="' + s.url + '" target="_blank" rel="noopener">' + ((!isHe && s.name_en) || s.name) + "</a></li>";
    }).join("");
    var d = new Date(c.verified + "T00:00:00");
    $("#verified").textContent = L.verified_label + " " + new Intl.DateTimeFormat(L.date_locale, { month: "long", year: "numeric" }).format(d);
    if (!billTouched) $("#bill").value = sampleMid(c);
    update(true);
  }
  function buildChips(c) {
    var vals = c.type === "none" ? [0] : c.type === "round_up" ? [0, 5, 10] :
      Array.from(new Set([c.min, Math.round((c.min + c.max) / 2), c.max]));
    $("#pcts").innerHTML = vals.map(function (v) {
      return '<button type="button" data-v="' + v + '">' + (v === 0 && c.type !== "none" ? L.round_chip : v + "%") + "</button>";
    }).join("");
    $("#pcts").querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { pct = +b.dataset.v; userPct = true; update(true); };
    });
  }
  function update(animate) {
    var c = cur, b = billVal(), sc = $("#sc").checked, adv = $("#advice");
    if (sc) {
      adv.textContent = L.after_long[c.after] + (c.sc_pct ? fmt(L.sc_typical, { pct: c.sc_pct }) : "");
      adv.classList.add("show");
      if (!userPct) pct = c.after === "add_tip_anyway" ? c.default : 0;
    } else { adv.classList.remove("show"); if (!userPct) pct = c.default; }
    $("#pct").value = pct;
    $("#pcts").querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", +x.dataset.v === pct); });
    var tip = b * pct / 100, label = L.lbl_leave;
    var roundMode = pct === 0 && c.type === "round_up" && !sc;
    if (roundMode) { var t = roundUpTarget(b); tip = t - b; label = fmt(L.round_to, { amount: money(t, c) }); }
    var total = b + tip;
    $(".result .lbl").textContent = b > 0 ? label + (roundMode ? "" : " (" + pct + "%)") : L.enter_bill;
    var el = $("#tip"); el.textContent = money(tip, c);
    if (animate) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
    $("#total").textContent = money(total, c); $("#ppl").textContent = people;
    $("#per").textContent = money(total / people, c) + (people > 1 ? L.per_person : "");
  }

  /* ---------- favorites ---------- */
  function loadFavs() {
    try {
      var a = JSON.parse(store.get("tipreveal-favs") || "[]");
      return Array.isArray(a) ? a.filter(function (x) { return DATA.some(function (d) { return d.en === x; }); }) : [];
    } catch (e) { return []; }
  }
  function syncFavBtn() {
    var b = $("#fav-btn"); if (!b || !cur) return;
    var on = favs.indexOf(cur.en) >= 0;
    b.setAttribute("aria-pressed", on); $("#fav-ico").textContent = on ? "★" : "☆";
    b.setAttribute("aria-label", fmt(on ? L.fav_remove_aria : L.fav_add_aria, { name: nm(cur) }));
  }
  function say(msg) {
    var n = $("#fav-note"); n.textContent = msg; clearTimeout(noteTimer);
    if (msg) noteTimer = setTimeout(function () { n.textContent = ""; }, 5000);
  }
  function toggleFav(en) {
    var c = DATA.find(function (d) { return d.en === en; }); if (!c) return;
    var i = favs.indexOf(en), adding = i < 0;
    if (adding) favs.push(en); else favs.splice(i, 1);
    var json = JSON.stringify(favs); store.set("tipreveal-favs", json);
    var saved = store.get("tipreveal-favs") === json;
    if (adding && (!store.get("tipreveal-lastfav") || (cur && cur.en === en))) store.set("tipreveal-lastfav", en);
    syncFavBtn(); if (P.type === "home") renderQuick();
    if ($("#combo").classList.contains("open")) renderList($("#combo-q").value, true);
    if (!saved) say(L.fav_blocked);
    else if (adding) say(fmt(favs.length === 1 ? L.fav_saved_first : L.fav_saved_more, { name: nm(c) }));
    else say(fmt(L.fav_removed, { name: nm(c) }));
  }
  function renderQuick() {
    var list = favs.length ? favs : QUICK;
    $("#quick").setAttribute("aria-label", favs.length ? L.quick_aria_favs : L.quick_aria_pop);
    $("#quick").innerHTML = '<span class="ql">' + (favs.length ? L.quick_favs_label : L.quick_examples_label) + "</span>" +
      list.map(function (en) {
        var c = DATA.find(function (d) { return d.en === en; });
        return c ? '<button type="button" data-en="' + en + '" aria-pressed="' + (!!cur && cur.en === en) + '">' + c.flag + " " + nm(c) + "</button>" : "";
      }).join("");
    $("#quick").querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { setCountry(DATA.find(function (d) { return d.en === b.dataset.en; }), true); };
    });
  }

  /* ---------- combobox ---------- */
  function choose(c) { if (P.type === "country") { location.href = urlOf(c); } else { setCountry(c, true); } }
  function openCombo(o) {
    $("#combo").classList.toggle("open", o); $("#combo-btn").setAttribute("aria-expanded", o);
    if (o) { $("#combo-q").value = ""; renderList(""); setTimeout(function () { $("#combo-q").focus(); }, 0); }
  }
  function renderList(q, keep) {
    q = q.trim().toLowerCase();
    var m = DATA.filter(function (c) { return !q || c.he.indexOf(q) >= 0 || c.en.toLowerCase().indexOf(q) >= 0; });
    var fv = favs.map(function (e) { return m.find(function (c) { return c.en === e; }); }).filter(Boolean);
    var rest = m.filter(function (c) { return favs.indexOf(c.en) < 0; })
      .sort(function (a, b) { return nm(a).localeCompare(nm(b), lang); });
    var prev = keep && filtered[active] ? filtered[active].en : null;
    filtered = fv.concat(rest); active = 0;
    if (prev) { var k = filtered.findIndex(function (c) { return c.en === prev; }); if (k >= 0) active = k; }
    var item = function (c, i) {
      var f = favs.indexOf(c.en) >= 0;
      return '<li role="option" id="opt' + i + '" aria-selected="' + (i === active) + '" data-i="' + i + '"><span>' + c.flag + "</span>" + nm(c) +
        '<span class="en">' + (isHe ? c.en : c.he) + '</span><button type="button" class="star" data-en="' + c.en + '" aria-pressed="' + f +
        '" aria-label="' + fmt(f ? L.fav_remove_aria : L.fav_add_aria, { name: nm(c) }) + '">' + (f ? "★" : "☆") + "</button></li>";
    };
    var html = "";
    if (fv.length) html += '<li class="grp" role="presentation">' + L.grp_favs + "</li>" + fv.map(function (c, i) { return item(c, i); }).join("");
    if (fv.length && rest.length) html += '<li class="grp" role="presentation">' + L.grp_all + "</li>";
    html += rest.map(function (c, i) { return item(c, fv.length + i); }).join("");
    var list = $("#combo-list"), sc = list.scrollTop;
    list.innerHTML = html || '<li aria-disabled="true">' + L.no_country + "</li>";
    if (keep) list.scrollTop = sc;
    list.querySelectorAll("li[data-i]").forEach(function (li) {
      li.onclick = function () { choose(filtered[+li.dataset.i]); openCombo(false); $("#combo-btn").focus(); };
    });
    list.querySelectorAll(".star").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); toggleFav(b.dataset.en); };
    });
  }
  function moveActive(d) {
    if (!filtered.length) return;
    active = (active + d + filtered.length) % filtered.length;
    $("#combo-list").querySelectorAll('li[role="option"]').forEach(function (li, i) { li.setAttribute("aria-selected", i === active); });
    var o = $("#opt" + active); if (o) o.scrollIntoView({ block: "nearest" });
  }

  /* ---------- wiring ---------- */
  function wire() {
    $("#combo-btn").onclick = function () { openCombo(!$("#combo").classList.contains("open")); };
    $("#fav-btn").onclick = function () { if (cur) toggleFav(cur.en); };
    $("#combo-q").oninput = function (e) { renderList(e.target.value); };
    $("#combo-q").onkeydown = function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
      else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) { choose(filtered[active]); openCombo(false); $("#combo-btn").focus(); } }
      else if (e.key === "Escape") { openCombo(false); $("#combo-btn").focus(); }
    };
    document.addEventListener("click", function (e) { if (!$("#combo").contains(e.target)) openCombo(false); });
    $("#bill").oninput = function () { billTouched = true; update(false); };
    $("#pct").oninput = function (e) { pct = +e.target.value; userPct = true; update(false); };
    $("#sc").onchange = function () { userPct = false; update(true); };
    $("#minus").onclick = function () { people = Math.max(1, people - 1); update(false); };
    $("#plus").onclick = function () { people = Math.min(30, people + 1); update(false); };
    document.querySelectorAll("tr[data-href]").forEach(function (tr) {
      tr.onclick = function (e) { if (!e.target.closest("a")) location.href = tr.dataset.href; };
    });
    var lt = $("#lang-toggle"); if (lt) lt.addEventListener("click", function () { store.set("tipreveal-lang", L.other_lang); });
  }

  function init() {
    if (P.type === "home") {
      var pref = store.get("tipreveal-lang");
      if ((pref === "he" || pref === "en") && pref !== lang) { location.replace(pref === "en" ? "/en" : "/"); return; }
    }
    favs = loadFavs();
    $("#r-date").textContent = new Intl.DateTimeFormat(L.date_locale, { day: "numeric", month: "numeric", year: "numeric" }).format(new Date());
    wire();
    var start;
    if (P.type === "country") {
      start = DATA.find(function (d) { return d.en === P.country; });
    } else {
      renderQuick();
      var lastFav = store.get("tipreveal-lastfav"), saved = store.get("tipreveal-country"), pick;
      if (favs.length) pick = favs.indexOf(lastFav) >= 0 ? lastFav : favs[0];
      h1Dynamic = !!(pick || saved);  // returning visitors see their country in the headline; new visitors see the generic one
      start = DATA.find(function (d) { return d.en === pick; }) || DATA.find(function (d) { return d.en === saved; }) ||
        DATA.find(function (d) { return d.en === "Israel"; }) || DATA[0];
    }
    setCountry(start || DATA[0]);
    if (CFG.feedbackUrl) {
      var btn = $("#report"); btn.hidden = false;
      btn.onclick = function () {
        var msg = prompt(fmt(L.report_prompt, { name: nm(cur) })); if (!msg) return;
        fetch(CFG.feedbackUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ country: cur.en, country_he: cur.he, message: msg.slice(0, 1000), page: location.href, ts: new Date().toISOString() }) })
          .then(function () { alert(L.report_ok); }).catch(function () { alert(L.report_fail); });
      };
    }
  }
  init();
})();
