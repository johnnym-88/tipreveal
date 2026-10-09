/* Accessibility toolbar: text size, contrast, links, font, motion. Stored per browser. */
(function () {
  "use strict";
  var he = document.documentElement.lang === "he";
  var T = he ? {
    open: "תפריט נגישות", title: "נגישות", close: "סגירה", size: "גודל טקסט", plus: "הגדלה", minus: "הקטנה",
    contrast: "ניגודיות גבוהה", gray: "גווני אפור", links: "הדגשת קישורים", font: "גופן קריא", motion: "עצירת אנימציות",
    reset: "איפוס", statement: "הצהרת נגישות", href: "/accessibility", level: ["רגיל", "גדול", "גדול מאוד", "הכי גדול"]
  } : {
    open: "Accessibility menu", title: "Accessibility", close: "Close", size: "Text size", plus: "Increase", minus: "Decrease",
    contrast: "High contrast", gray: "Grayscale", links: "Highlight links", font: "Readable font", motion: "Stop animations",
    reset: "Reset", statement: "Accessibility statement", href: "/en/accessibility", level: ["Normal", "Large", "Larger", "Largest"]
  };
  var KEY = "kamatip-a11y", st = { size: 0, contrast: 0, gray: 0, links: 0, font: 0, motion: 0 };
  try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) for (var k in st) if (typeof s[k] === "number") st[k] = s[k]; } catch (e) {}
  st.size = Math.max(0, Math.min(3, st.size | 0));
  var root = document.documentElement;

  function apply() {
    root.classList.toggle("a11y-t1", st.size === 1); root.classList.toggle("a11y-t2", st.size === 2); root.classList.toggle("a11y-t3", st.size === 3);
    ["contrast", "gray", "links", "font", "motion"].forEach(function (k) { root.classList.toggle("a11y-" + k, !!st[k]); });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    if (!panel) return;
    ["contrast", "gray", "links", "font", "motion"].forEach(function (k) { panel.querySelector('[data-k="' + k + '"]').setAttribute("aria-pressed", !!st[k]); });
    panel.querySelector(".lvl").textContent = T.level[st.size];
    panel.querySelector('[data-a="minus"]').disabled = st.size === 0;
    panel.querySelector('[data-a="plus"]').disabled = st.size === 3;
  }

  var wrap = document.createElement("div"); wrap.id = "a11y-root";
  var icon = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><circle cx="12" cy="4.2" r="2.2" fill="currentColor"/><path d="M4 8.2l8 1.3 8-1.3M12 9.5V15m0 0l-3.4 6M12 15l3.4 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  wrap.innerHTML = '<button type="button" class="a11y-fab" aria-haspopup="dialog" aria-expanded="false" aria-controls="a11y-panel" aria-label="' + T.open + '">' + icon + "</button>" +
    '<div class="a11y-panel" id="a11y-panel" role="dialog" aria-label="' + T.title + '" hidden>' +
    '<div class="a11y-head"><b>' + T.title + '</b><button type="button" class="a11y-x" aria-label="' + T.close + '">×</button></div>' +
    '<div class="a11y-size"><span>' + T.size + '</span><div><button type="button" data-a="minus" aria-label="' + T.minus + '">A−</button><output class="lvl" aria-live="polite"></output><button type="button" data-a="plus" aria-label="' + T.plus + '">A+</button></div></div>' +
    '<div class="a11y-grid">' +
    ["contrast", "gray", "links", "font", "motion"].map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="false">' + T[k] + "</button>"; }).join("") +
    '</div><div class="a11y-foot"><button type="button" data-a="reset">' + T.reset + '</button><a href="' + T.href + '">' + T.statement + "</a></div></div>";
  document.body.appendChild(wrap);
  var fab = wrap.querySelector(".a11y-fab"), panel = wrap.querySelector(".a11y-panel");

  function toggle(o) {
    panel.hidden = !o; fab.setAttribute("aria-expanded", o);
    if (o) panel.querySelector(".a11y-x").focus(); else fab.focus();
  }
  fab.onclick = function () { toggle(panel.hidden); };
  panel.querySelector(".a11y-x").onclick = function () { toggle(false); };
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.k) st[b.dataset.k] = st[b.dataset.k] ? 0 : 1;
    else if (b.dataset.a === "plus") st.size = Math.min(3, st.size + 1);
    else if (b.dataset.a === "minus") st.size = Math.max(0, st.size - 1);
    else if (b.dataset.a === "reset") for (var k in st) st[k] = 0;
    else return;
    apply();
  });
  apply();
})();
