/* Draws the shareable "receipt" card on a <canvas>. No external libraries. */
(function (root) {
  "use strict";
  var W = 1080, PX = 70, PW = 940, PAD = 64;
  var DISPLAY = '"Karantina","Arial Narrow","Heebo",system-ui,sans-serif';
  var BODY = '"IBM Plex Sans Hebrew","Assistant","Segoe UI",Arial,sans-serif';

  /* true when the device draws flag emoji as colour pictures (Windows draws two letters instead) */
  function flagsSupported() {
    try {
      var c = document.createElement("canvas"); c.width = c.height = 64;
      var x = c.getContext("2d"); x.font = "40px sans-serif"; x.fillStyle = "#000"; x.textBaseline = "top";
      x.fillText("🇮🇱", 0, 8);
      var d = x.getImageData(0, 0, 64, 64).data;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 200 && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) return true;
      }
    } catch (e) {}
    return false;
  }

  function fit(ctx, text, font, size, maxW, min) {
    while (size > min) { ctx.font = font(size); if (ctx.measureText(text).width <= maxW) break; size -= 2; }
    ctx.font = font(size); return size;
  }
  function dashed(ctx, y, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(PX + PAD, y); ctx.lineTo(PX + PW - PAD, y); ctx.stroke(); ctx.restore();
  }
  function globe(ctx, cx, cy, r, ink, accent) {
    ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = r * 0.13; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.36); ctx.lineTo(cx + r, cy - r * 0.36);
    ctx.moveTo(cx - r, cy + r * 0.36); ctx.lineTo(cx + r, cy + r * 0.36); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accent; ctx.font = "800 " + Math.round(r * 0.95) + "px Arial,Helvetica,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.direction = "ltr";
    ctx.fillText("$", cx, cy + r * 0.33); ctx.restore();
  }
  function roundTop(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h); ctx.closePath();
  }

  /*
   o = { rtl, accent, onAccent, accentText, flag, name, sub,
         mode: "amount" | "range" | "text", big, tipLabel, billLine,
         rows: [[label, value], ...], cta, site, ink, muted, line }
  */
  function draw(o) {
    var rtl = !!o.rtl, ink = o.ink || "#1A1936", muted = o.muted || "#62657F", line = o.line || "#E3E5EF";
    var hasFlag = flagsSupported();
    var rows = o.rows || [];
    var top = 250, rowsH = rows.length ? 40 + rows.length * 76 : 0;
    var textMode = o.mode === "text", contentH = 150 + 70 + 70 + (textMode ? 200 : 310) + (o.billLine ? 80 : 40) + rowsH + 40;
    var paperTop = top, paperBottom = paperTop + contentH;
    var H = paperBottom + 330;
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var side = rtl ? "right" : "left", xs = rtl ? PX + PW - PAD : PX + PAD, xo = rtl ? PX + PAD : PX + PW - PAD;
    var dir = rtl ? "rtl" : "ltr", sgn = rtl ? -1 : 1;

    /* background + faint globe lines */
    ctx.fillStyle = o.accent; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = o.onAccent; ctx.globalAlpha = 0.07; ctx.lineWidth = 5;
    for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(W - 40, H - 60, 380 + k * 150, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(W - 40, H - 60, 190, 530, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

    /* brand */
    ctx.font = "700 92px " + DISPLAY; ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    var wm = ctx.measureText("Kama Tip?").width, gw = 104, gap = 22, bx = (W - (gw + gap + wm)) / 2;
    globe(ctx, bx + gw / 2, 138, 50, o.onAccent, o.accent);
    ctx.fillStyle = o.onAccent; ctx.fillText("Kama Tip?", bx + gw + gap, 170);

    /* paper */
    ctx.save(); ctx.shadowColor = "rgba(10,10,40,.35)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 28;
    ctx.fillStyle = "#fff"; roundTop(ctx, PX, paperTop, PW, contentH, 36); ctx.fill(); ctx.restore();
    ctx.fillStyle = o.accent;
    for (var sx = PX + 10; sx < PX + PW; sx += 20) { ctx.beginPath(); ctx.arc(sx, paperBottom, 10, 0, Math.PI * 2); ctx.fill(); }

    /* country */
    var y = paperTop + 130, nameX = xs, avail = PW - PAD * 2;
    if (hasFlag) {
      ctx.font = "92px " + BODY; ctx.direction = "ltr"; ctx.textAlign = side; ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
      ctx.fillText(o.flag, xs, y); var fw = ctx.measureText(o.flag).width; nameX = xs + sgn * (fw + 24); avail -= fw + 24;
    }
    ctx.direction = dir; ctx.textAlign = side; ctx.fillStyle = ink;
    fit(ctx, o.name, function (s) { return "700 " + s + "px " + BODY; }, 76, avail, 34);
    ctx.fillText(o.name, nameX, y - 6);

    /* status + range */
    y += 70; ctx.font = "500 34px " + BODY; ctx.fillStyle = muted; ctx.direction = dir; ctx.textAlign = side;
    var sub = o.sub || "";
    if (sub) { fit(ctx, sub, function (s) { return "500 " + s + "px " + BODY; }, 34, PW - PAD * 2, 22); ctx.fillText(sub, xs, y); }
    y += 50; dashed(ctx, y, line);

    /* label */
    y += 78; ctx.font = "600 36px " + BODY; ctx.fillStyle = muted; ctx.direction = dir; ctx.textAlign = side; ctx.fillText(o.tipLabel, xs, y);

    /* big number */
    y += textMode ? 150 : 280; ctx.fillStyle = o.accentText; ctx.textAlign = side;
    ctx.direction = o.mode === "text" ? dir : "ltr";
    if (o.mode === "text") fit(ctx, o.big, function (s) { return "700 " + s + "px " + BODY; }, 110, PW - PAD * 2, 50);
    else fit(ctx, o.big, function (s) { return "700 " + s + "px " + DISPLAY; }, 330, PW - PAD * 2, 90);
    ctx.fillText(o.big, xs, y);

    /* "out of a bill of ..." */
    if (o.billLine) {
      y += 62; ctx.font = "500 36px " + BODY; ctx.fillStyle = muted; ctx.direction = dir; ctx.textAlign = side; ctx.fillText(o.billLine, xs, y);
    }

    /* rows */
    if (rows.length) {
      y += 60; dashed(ctx, y, line);
      rows.forEach(function (r, i) {
        y += 76;
        ctx.font = "500 40px " + BODY; ctx.fillStyle = muted; ctx.direction = dir; ctx.textAlign = side; ctx.fillText(r[0], xs, y);
        ctx.font = "700 46px " + BODY; ctx.fillStyle = ink; ctx.direction = "ltr"; ctx.textAlign = rtl ? "left" : "right"; ctx.fillText(r[1], xo, y);
        void i;
      });
    }

    /* call to action */
    ctx.textAlign = "center"; ctx.fillStyle = o.onAccent; ctx.direction = dir;
    fit(ctx, o.cta, function (s) { return "700 " + s + "px " + BODY; }, 46, W - 140, 28);
    ctx.fillText(o.cta, W / 2, paperBottom + 130);
    ctx.font = "700 100px " + DISPLAY; ctx.direction = "ltr"; ctx.fillText(o.site, W / 2, paperBottom + 250);
    return cv;
  }

  function ready() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var t = new Promise(function (r) { setTimeout(r, 1500); });
    return Promise.race([Promise.all([
      document.fonts.load('700 100px "Karantina"'), document.fonts.load('700 40px "IBM Plex Sans Hebrew"'), document.fonts.load('500 40px "IBM Plex Sans Hebrew"')
    ]), t]).catch(function () {});
  }

  root.KamaCard = { draw: draw, ready: ready };
})(window);
