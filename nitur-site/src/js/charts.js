/* ==========================================================================
   תרשימים — SVG בלבד, בלי ספריות.
   סדרה אחת = צבע אחד. ציר אחד לתרשים. לכל סימן יש רמז בריחוף ובמיקוד,
   ולכל תרשים יש טבלה לצדו עם אותם מספרים.
   ========================================================================== */
function niceTicks(lo, hi, n) {
  var span = hi - lo || 1, step = Math.pow(10, Math.floor(Math.log(span / n) / Math.LN10));
  var err = span / n / step;
  if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
  var out = [], v = Math.ceil(lo / step) * step;
  for (; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

/* pts: [{x: תווית, y: מספר|null, tip: 'ערך|שורה|שורה'}] */
function lineChart(pts, o) {
  o = o || {};
  var W = o.w || (isWide() ? 640 : 350), H = o.h || (isWide() ? 210 : 190), L = 30, R = 40, T = 14, B = 26;
  var ys = pts.map(function (p) { return p.y; }).filter(function (y) { return y !== null && y !== undefined; });
  if (!ys.length) return '<div class="empty">אין עדיין ציונים להצגה</div>';
  var lo = o.min !== undefined ? o.min : Math.floor((Math.min.apply(null, ys.concat(o.thr !== undefined ? [o.thr] : [])) - 3) / 10) * 10;
  var hi = o.max !== undefined ? o.max : Math.min(100, Math.ceil((Math.max.apply(null, ys) + 1) / 10) * 10);
  if (hi <= lo) hi = lo + 10;
  var n = pts.length, iw = (W - L - R), ih = (H - T - B);
  var X_ = function (i) { return L + (n === 1 ? iw / 2 : iw * i / (n - 1)); };
  var Y_ = function (v) { return T + ih - (v - lo) / (hi - lo) * ih; };
  var s = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" style="direction:ltr" role="img" aria-label="' + esc(o.label || 'תרשים') + '">';
  niceTicks(lo, hi, 4).forEach(function (t) {
    s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y_(t) + '" y2="' + Y_(t) + '"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y_(t) + 4) + '" text-anchor="end">' + t + '</text>';
  });
  if (o.thr !== undefined && o.thr >= lo && o.thr <= hi) {
    s += '<line class="thr" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y_(o.thr) + '" y2="' + Y_(o.thr) + '"/>' +
      '<text class="thr-t" x="' + (W - R + 5) + '" y="' + (Y_(o.thr) + 4) + '">סף ' + o.thr + '</text>';
  }
  var d = '', pen = false, lastI = -1;
  pts.forEach(function (p, i) {
    if (p.y === null || p.y === undefined) { return; }
    d += (pen ? 'L' : 'M') + X_(i).toFixed(1) + ' ' + Y_(p.y).toFixed(1) + ' ';
    pen = true; lastI = i;
  });
  if (o.area && lastI >= 0) {
    var firstI = 0; while (pts[firstI].y === null || pts[firstI].y === undefined) firstI++;
    s += '<path class="area" d="' + d + 'L' + X_(lastI).toFixed(1) + ' ' + (T + ih) + ' L' + X_(firstI).toFixed(1) + ' ' + (T + ih) + ' Z"/>';
  }
  s += '<path class="ln" d="' + d + '"/>';
  var cap = Math.max(3, Math.floor((W - L - R) / 62));
  var every = n > cap ? Math.ceil(n / cap) : 1;
  var bw = n === 1 ? iw : iw / (n - 1);
  pts.forEach(function (p, i) {
    if (i % every === 0 || i === n - 1) {
      s += '<text class="lab" x="' + X_(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(p.x) + '</text>';
    }
    if (p.y === null || p.y === undefined) return;
    s += '<rect class="hit" x="' + (X_(i) - Math.max(bw / 2, 12)) + '" y="' + T + '" width="' + Math.max(bw, 24) + '" height="' + ih + '" tabindex="0" data-tip="' + esc(p.tip || (p.y + '|' + p.x)) + '"/>' +
      '<circle class="pt mk" cx="' + X_(i) + '" cy="' + Y_(p.y) + '" r="4"/>';
  });
  if (lastI >= 0 && !(o.thr !== undefined && Math.abs(Y_(pts[lastI].y) - Y_(o.thr)) < 12 && lastI === n - 1)) {
    s += '<text class="val" x="' + (X_(lastI) + 8) + '" y="' + (Y_(pts[lastI].y) + 4) + '">' + f1(pts[lastI].y) + '</text>';
  }
  return s + '</svg></div>';
}

/* עמודות דקות. pts: [{x, y, tip}] */
function colChart(pts, o) {
  o = o || {};
  var W = o.w || (isWide() ? 640 : 350), H = o.h || 170, L = 30, R = 10, T = 18, B = 26;
  var max = Math.max.apply(null, pts.map(function (p) { return p.y || 0; }).concat([1]));
  var ticks = niceTicks(0, max, 3), hi = Math.max(ticks[ticks.length - 1], max);
  if (hi < max) hi = max;
  var n = pts.length, iw = W - L - R, ih = H - T - B, slot = iw / n, bw = Math.min(24, slot - 2);
  var Y_ = function (v) { return T + ih - v / hi * ih; };
  var s = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" style="direction:ltr" role="img" aria-label="' + esc(o.label || 'תרשים') + '">';
  ticks.forEach(function (t) {
    s += '<line class="' + (t === 0 ? 'axis' : 'grid') + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y_(t) + '" y2="' + Y_(t) + '"/>' +
      '<text x="' + (L - 6) + '" y="' + (Y_(t) + 4) + '" text-anchor="end">' + t + '</text>';
  });
  var every = n > (isWide() ? 12 : 6) ? Math.ceil(n / (isWide() ? 10 : 5)) : 1, maxI = 0;
  pts.forEach(function (p, i) { if ((p.y || 0) > (pts[maxI].y || 0)) maxI = i; });
  pts.forEach(function (p, i) {
    var cx = L + slot * i + slot / 2, x = cx - bw / 2, y = Y_(p.y || 0), h = T + ih - y, r = Math.min(4, h, bw / 2);
    if (i % every === 0 || i === n - 1) s += '<text class="lab" x="' + cx + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(p.x) + '</text>';
    s += '<rect class="hit" x="' + (L + slot * i) + '" y="' + T + '" width="' + slot + '" height="' + ih + '" tabindex="0" data-tip="' + esc(p.tip || ((p.y || 0) + '|' + p.x)) + '"/>';
    if (h > 0) {
      s += '<path class="col mk" d="M' + x + ' ' + (T + ih) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
        ' H' + (x + bw - r) + ' Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + r) + ' V' + (T + ih) + ' Z"/>';
    }
    if ((i === maxI || i === n - 1) && (p.y || 0) > 0) s += '<text class="val" x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle">' + p.y + '</text>';
  });
  return s + '</svg></div>';
}

/* פסים אופקיים. items: [{l, v, ref, tip}] ; max: קצה הסקאלה */
function hbars(items, max, o) {
  o = o || {};
  var h = '<div class="hb">';
  items.forEach(function (it) {
    var w = (it.v === null || it.v === undefined) ? 0 : Math.max(0, Math.min(100, it.v / max * 100));
    h += '<div class="l">' + esc(it.l) + '</div>' +
      '<div class="tr" tabindex="0" data-tip="' + esc(it.tip || ((it.v === null || it.v === undefined ? 'אין נתון' : (o.fmt ? o.fmt(it.v) : f2(it.v))) + '|' + it.l)) + '">' +
      '<div class="fl" style="width:' + w.toFixed(1) + '%"></div>' +
      ((it.ref !== null && it.ref !== undefined) ? '<div class="rf" style="inset-inline-start:calc(' + Math.min(100, it.ref / max * 100).toFixed(1) + '% - 1px)"></div>' : '') +
      '</div><div class="v">' + ((it.v === null || it.v === undefined) ? '—' : (o.fmt ? o.fmt(it.v) : f2(it.v))) + '</div>';
  });
  return h + '</div>';
}

/* התפלגות ציונים */
function histogram(list) {
  var bins = [['עד 49', 0, 50], ['50–59', 50, 60], ['60–69', 60, 70], ['70–79', 70, 80], ['80–89', 80, 90], ['90–100', 90, 101]];
  var scored = list.filter(function (o) { return o.s !== null; });
  if (!scored.length) return '<div class="empty">אין עדיין ציונים להצגה</div>';
  return colChart(bins.map(function (b) {
    var n = scored.filter(function (o) { return o.s >= b[1] && o.s < b[2]; }).length;
    return { x: b[0], y: n, tip: n + ' תצפיות|ציון ' + b[0] + '|' + Math.round(n / scored.length * 100) + '% מהתצפיות' };
  }), { label: 'התפלגות הציונים', h: 190, w: isWide() ? 500 : 350 });
}
