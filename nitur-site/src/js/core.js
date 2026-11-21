'use strict';
/* ==========================================================================
   ליבה: מצב, עזרים, קריאות לשרת, ניווט, חלונות
   ========================================================================== */
var D = null;          // הנתונים מהשרת
var X = null;          // מה שמחושב מהם
var ST = {
  view: 'home', p: {},
  sort: {},
  list: { q: '', ra: '', pl: '', sh: '', st: '', when: '', ob: '', limit: 50 },
  mash: { q: '', ra: '', who: '', st: '', limit: 60 },
  tab: { rep: 'nat', care: 'alerts', adm: 'users' },
  rep: { dim: 'ra', resp: 'mn', role: '' },
  reco: { who: '' },
  log: null, users: null
};
var ACT = {}, VIEWS = {}, CH = {}, INP = {};

function $(s, el) { return (el || document).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function norm(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[׳״‘’“”"'`]/g, '').replace(/\s+/g, ' ').trim();
}
function same(a, b) { var x = norm(a); return x !== '' && x === norm(b); }
function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (x && !s[x]) { s[x] = 1; o.push(x); } }); return o; }
function heSort(a) { return a.slice().sort(function (x, y) { return String(x).localeCompare(String(y), 'he'); }); }

/* ---------- תאריכים ---------- */
var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
function toD(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function isoOf(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function fmtD(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function fmtS(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2] + '/' + p[1]; }
function daysAgo(iso) { if (!iso) return null; return Math.round((toD(D.today) - toD(iso)) / 86400000); }
function ago(iso) {
  var n = daysAgo(iso);
  if (n === null) return '';
  if (n === 0) return 'היום';
  if (n === 1) return 'אתמול';
  if (n < 0) return 'בעוד ' + (-n) + ' ימים';
  return 'לפני ' + n + ' ימים';
}
function monthLabel(key) { var p = key.split('-'); return MONTHS[+p[1] - 1] + ' ' + p[0]; }
function monthShort(key) { var p = key.split('-'); return p[1] + '/' + p[0].slice(2); }
function f1(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : String(Math.round(x * 10) / 10); }
function f2(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : (Math.round(x * 100) / 100).toFixed(2); }
function sg(x) { return (x === null || x === undefined) ? '—' : '<span dir="ltr">' + (x > 0 ? '+' : '') + x + '</span>'; }
function pct(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : Math.round(x * 100) + '%'; }

/* ---------- אייקונים ---------- */
var IC = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M21 19c-.3-2-1.300-3.5-3-4.300"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  care: '<path d="M12 3.5 21 19H3z"/><path d="M12 10v4M12 16.500v.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>',
  more: '<circle cx="5" cy="12" r="1.300"/><circle cx="12" cy="12" r="1.300"/><circle cx="19" cy="12" r="1.300"/>',
  back: '<path d="M9 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.300 6.300"/><path d="M20 5v6h-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  print: '<path d="M7 8V4h10v4"/><rect x="4" y="8" width="16" height="8" rx="1.500"/><path d="M7 14h10v6H7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.500 6.500l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.500 7l1 13h9l1-13"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  dl: '<path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 20h14"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  ext: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v5H5V6h5"/>'
};
function ic(n) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';
}

/* ---------- קריאה לשרת ---------- */
var _pending = 0;
function busy(n) {
  _pending = Math.max(0, _pending + n);
  var b = $('#busy');
  if (b) b.className = 'busy' + (_pending ? ' on' : '');
}
function cleanErr(e) {
  var m = (e && e.message) ? e.message : String(e || '');
  m = m.replace(/^(Exception|Error|ScriptError):\s*/i, '').replace(/^(Exception|Error):\s*/i, '');
  if (/NetworkError|Failed to fetch|התחברות|network/i.test(m)) m = 'אין חיבור לשרת. בדוק את החיבור לרשת ונסה שוב.';
  if (/Authorization|PERMISSION_DENIED/i.test(m)) m = 'ההרשאה פגה. רענן את הדף והיכנס מחדש.';
  return m || 'שגיאה לא צפויה.';
}
function call(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  busy(1);
  return new Promise(function (res, rej) {
    try {
      var r = google.script.run
        .withSuccessHandler(function (v) { busy(-1); res(v); })
        .withFailureHandler(function (e) { busy(-1); rej(new Error(cleanErr(e))); });
      r[fn].apply(r, args);
    } catch (e) { busy(-1); rej(new Error(cleanErr(e))); }
  });
}

/* ---------- הודעות ---------- */
function toast(msg, kind) {
  var box = $('#toasts');
  var t = document.createElement('div');
  t.className = 'toast' + (kind === 'err' ? ' err' : '');
  t.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, kind === 'err' ? 7000 : 3200);
}
function fail(e) { toast(cleanErr(e), 'err'); }

/* ---------- חלונות ---------- */
var _dlg = null;
function closeDlg(val) {
  if (!_dlg) return;
  var d = _dlg; _dlg = null;
  if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
  if (d.prev && d.prev.focus) { try { d.prev.focus(); } catch (e) {} }
  if (d.done) d.done(val === undefined ? null : val);
}
function openDlg(o) {
  if (_dlg) closeDlg(null);
  var ov = document.createElement('div');
  ov.className = 'ov';
  ov.innerHTML = '<div class="dlg" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
    '<div class="dh"><h2>' + esc(o.title) + '</h2><button type="button" data-act="dlgClose" aria-label="סגור">' + ic('x') + '</button></div>' +
    (o.html || '') + '</div>';
  ov.addEventListener('mousedown', function (ev) { if (ev.target === ov) closeDlg(null); });
  document.body.appendChild(ov);
  _dlg = { el: ov, done: o.done, prev: document.activeElement, onAct: o.onAct };
  var f = $('[data-focus]', ov) || $('input,select,textarea,button.btn', ov);
  if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 30);
  return ov;
}
ACT.dlgClose = function () { closeDlg(null); };
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && _dlg) closeDlg(null); });

function confirmBox(o) {
  return new Promise(function (res) {
    openDlg({
      title: o.title,
      html: '<div class="db"><p class="txt">' + esc(o.text) + '</p></div>' +
        '<div class="df"><button type="button" class="btn ' + (o.danger ? 'danger' : 'pri') + '" data-act="dlgOk" data-focus>' + esc(o.ok || 'אישור') + '</button>' +
        '<button type="button" class="btn" data-act="dlgClose">' + esc(o.cancel || 'ביטול') + '</button></div>',
      done: function (v) { res(v === true); }
    });
  });
}
ACT.dlgOk = function () { closeDlg(true); };

/* בוחר עם חיפוש. items: [{v, t, s, g}] — ערך, כותרת, משנה, קבוצה */
function pick(o) {
  return new Promise(function (res) {
    var ov = openDlg({
      title: o.title,
      html: '<div class="search"><input class="in" type="search" data-focus placeholder="' + esc(o.ph || 'חיפוש') + '" autocomplete="off"></div><div class="opts"></div>',
      done: res
    });
    var input = $('input', ov), box = $('.opts', ov);
    function draw() {
      var q = norm(input.value).toLowerCase();
      var h = '', n = 0, grp = null, exact = false;
      o.items.forEach(function (it, i) {
        var hay = norm(it.t + ' ' + (it.s || '')).toLowerCase();
        if (q && hay.indexOf(q) === -1) return;
        if (norm(it.t).toLowerCase() === q) exact = true;
        if (n >= 250) return;
        if (it.g && it.g !== grp) { grp = it.g; h += '<div class="grp">' + esc(grp) + '</div>'; }
        h += '<button type="button" class="opt' + (it.v === o.cur ? ' cur' : '') + '" data-i="' + i + '"><b>' + esc(it.t) + '</b>' +
          (it.s ? '<span>' + esc(it.s) + '</span>' : '') + '</button>';
        n++;
      });
      if (o.custom && q && !exact) {
        h += '<button type="button" class="opt add" data-custom="1"><b>' + esc(o.customLabel || 'השתמש ב') + ' "' + esc(input.value.trim()) + '"</b>' +
          '<span>לא ברשימה</span></button>';
      }
      if (!h) h = '<div class="empty">לא נמצא דבר' + (o.custom ? '' : '. נסה חיפוש אחר') + '</div>';
      if (o.clear && !q) h = '<button type="button" class="opt" data-clear="1"><span>' + esc(o.clear) + '</span></button>' + h;
      box.innerHTML = h;
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { var first = $('.opt', box); if (first) first.click(); ev.preventDefault(); }
    });
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('.opt');
      if (!b) return;
      if (b.dataset.clear) closeDlg('');
      else if (b.dataset.custom) closeDlg(input.value.trim());
      else closeDlg(o.items[+b.dataset.i].v);
    });
    draw();
  });
}

/* ---------- טבלה עם מיון ---------- */
/* cols: [{k, t, n(מספרי), f(פורמט -> html), v(ערך למיון), c(מחלקה)}] */
function table(id, cols, rows, o) {
  o = o || {};
  var s = ST.sort[id] || o.sort || null;
  var data = rows.slice();
  if (s) {
    var col = cols.filter(function (c) { return c.k === s.k; })[0];
    if (col) {
      var val = col.v || function (r) { return r[col.k]; };
      data.sort(function (a, b) {
        var x = val(a), y = val(b);
        var ex = (x === null || x === undefined || x === ''), ey = (y === null || y === undefined || y === '');
        if (ex && ey) return 0; if (ex) return 1; if (ey) return -1;
        var r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'he');
        return s.d === 'd' ? -r : r;
      });
    }
  }
  var lim = o.limit || data.length;
  var h = '<div class="tw"><table class="t"><thead><tr>';
  cols.forEach(function (c) {
    var on = s && s.k === c.k;
    h += '<th class="s' + (c.n ? ' n' : '') + '" data-act="sort" data-id="' + esc(id) + '" data-k="' + esc(c.k) + '" data-num="' + (c.n ? 1 : 0) + '"' +
      (on ? ' aria-sort="' + (s.d === 'd' ? 'descending' : 'ascending') + '"' : '') + ' tabindex="0">' + esc(c.t) +
      (on ? '<span class="ar">' + (s.d === 'd' ? '▼' : '▲') + '</span>' : '') + '</th>';
  });
  h += '</tr></thead><tbody>';
  data.slice(0, lim).forEach(function (r) {
    var attr = o.row ? o.row(r) : '';
    h += '<tr' + (attr ? ' class="tap" ' + attr : '') + '>';
    cols.forEach(function (c) {
      var v = c.f ? c.f(r) : esc(r[c.k] === null || r[c.k] === undefined ? '—' : r[c.k]);
      h += '<td class="' + (c.n ? 'n ' : '') + (c.c || '') + '">' + v + '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody>' + (o.foot ? '<tfoot>' + o.foot + '</tfoot>' : '') + '</table></div>';
  if (!data.length) h = '<div class="empty">' + (o.empty || 'אין נתונים להצגה') + '</div>';
  else if (data.length > lim) h += '<div class="more"><button type="button" class="btn sm" data-act="' + esc(o.moreAct || 'more') + '">הצג עוד ' + Math.min(data.length - lim, 60) + ' מתוך ' + (data.length - lim) + '</button></div>';
  return h;
}
ACT.sort = function (el) {
  var id = el.dataset.id, k = el.dataset.k, cur = ST.sort[id];
  var first = el.dataset.num === '1' ? 'd' : 'a';
  ST.sort[id] = (cur && cur.k === k) ? { k: k, d: cur.d === 'd' ? 'a' : 'd' } : { k: k, d: first };
  render();
};

/* ---------- ציון ---------- */
function scHtml(v, o) {
  if (v === null || v === undefined || v === '') return '<span class="sc none' + (o && o.big ? ' big' : '') + '">' + ((o && o.miss) ? 'חסר' : '—') + '</span>';
  var c = v < D.cfg.low ? ' low' : (v >= 85 ? ' high' : '');
  return '<span class="sc' + c + (o && o.big ? ' big' : '') + '"' + (v < D.cfg.low ? ' title="מתחת לסף ' + D.cfg.low + '"' : '') + '>' + f1(v) + '</span>';
}
function dots(v) {
  if (v === '-') return '<span class="muted">לא נצפה</span>';
  if (typeof v !== 'number') return '<span class="muted">—</span>';
  var h = '<span class="dots" role="img" aria-label="' + v + ' מתוך 5">';
  for (var i = 1; i <= 5; i++) h += '<i' + (i <= v ? ' class="r' + Math.round(v) + '"' : '') + '></i>';
  return h + '</span>';
}
function crCell(v) {
  if (v === null || v === undefined) return '—';
  var r = Math.max(1, Math.min(5, Math.round(v)));
  var bg = ['', 'var(--red-wash)', 'var(--orange-wash)', 'var(--yellow-wash)', '#EEF7E6', 'var(--green-wash)'][r];
  return '<span class="cr" style="background:' + bg + '">' + (Math.round(v * 10) / 10) + '</span>';
}

/* ---------- ניווט ---------- */
function go(view, p, o) {
  if (_dlg) closeDlg(null);
  if (ST.view === 'form' && view !== 'form' && typeof formLeave === 'function') formLeave();
  ST.view = view; ST.p = p || {};
  render();
  window.scrollTo(0, 0);
  if (!(o && o.silent)) {
    try { google.script.history.push({ v: view, p: ST.p }); } catch (e) {}
  }
}
ACT.go = function (el) {
  var p = {};
  Object.keys(el.dataset).forEach(function (k) { if (k !== 'act' && k !== 'v') p[k] = el.dataset[k]; });
  go(el.dataset.v, p);
};

function render() {
  var m = $('#main');
  var top = { home: 'home', form: 'form', list: 'list', obs: 'list', mash: 'mash', card: 'mash', rep: 'rep', care: 'care', adm: 'adm' }[ST.view] || 'home';
  $$('[data-nav]').forEach(function (b) { b.classList.toggle('on', b.dataset.nav === top); });
  var f = VIEWS[ST.view] || VIEWS.home;
  try { m.innerHTML = f(); }
  catch (e) {
    m.innerHTML = '<div class="sheet"><div class="empty"><b>המסך לא נטען</b>' + esc(e.message) + '</div></div>';
    if (window.console) console.error(e);
  }
  if (typeof afterRender === 'function') afterRender();
}

/* ---------- אירועים ---------- */
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]');
  if (!el) return;
  var f = ACT[el.dataset.act];
  if (f) f(el, ev);
});
document.addEventListener('keydown', function (ev) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  var el = ev.target;
  if (el.matches && el.matches('th[data-act],tr[data-act]')) { ev.preventDefault(); el.click(); }
});
document.addEventListener('change', function (ev) {
  var el = ev.target;
  if (el.dataset && el.dataset.ch && CH[el.dataset.ch]) CH[el.dataset.ch](el, ev);
});
var _inpT = null;
document.addEventListener('input', function (ev) {
  var el = ev.target;
  if (!(el.dataset && el.dataset.inp && INP[el.dataset.inp])) return;
  if (el.dataset.now) { INP[el.dataset.inp](el, ev); return; }
  clearTimeout(_inpT);
  _inpT = setTimeout(function () { INP[el.dataset.inp](el, ev); }, 220);
});

/* ---------- רמז לתרשים ---------- */
(function () {
  var tip = null;
  function show(el) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    var parts = String(el.getAttribute('data-tip')).split('|');
    tip.textContent = '';
    var b = document.createElement('b'); b.textContent = parts[0]; tip.appendChild(b);
    for (var i = 1; i < parts.length; i++) { var s = document.createElement('span'); s.textContent = parts[i]; tip.appendChild(s); }
    tip.style.display = 'block';
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    var y = r.top - h - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hide() { if (tip) tip.style.display = 'none'; }
  document.addEventListener('mouseover', function (ev) { var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) show(el); else hide(); });
  document.addEventListener('focusin', function (ev) { var el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, true);
})();

/* ---------- אחסון מקומי ---------- */
function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

/* ---------- הורדת CSV ---------- */
function downloadCsv(name, rows) {
  var txt = rows.map(function (r) {
    return r.map(function (c) {
      var s = String(c === null || c === undefined ? '' : c);
      if (/^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s;      // לא נוסחה באקסל
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n');
  try {
    var blob = new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 500);
    toast('הקובץ ירד: ' + name);
  } catch (e) { toast('ההורדה נכשלה בדפדפן הזה.', 'err'); }
}
