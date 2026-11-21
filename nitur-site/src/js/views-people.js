/* ==========================================================================
   מסכים: מש"קיות, כרטיס מש"קית
   ========================================================================== */
function mashNames() {
  return X.universe.length ? X.universe : heSort(Object.keys(X.byMash));
}
function mashRows() {
  var F = ST.mash, q = norm(F.q).toLowerCase();
  return mashNames().map(function (n) { return X.ms[n]; }).filter(function (st) {
    var p = person(st.n);
    if (q && norm(st.n + ' ' + p.ra.join(' ') + ' ' + p.mf.join(' ') + ' ' + p.mn.join(' ')).toLowerCase().indexOf(q) === -1) return false;
    if (F.ra && p.ra.indexOf(F.ra) === -1) return false;
    if (F.who && p.mn.indexOf(F.who) === -1 && p.mf.indexOf(F.who) === -1) return false;
    if (F.st && st.status !== F.st) return false;
    return true;
  });
}
VIEWS.mash = function () {
  var F = ST.mash, names = mashNames(), rows = mashRows(), cfg = D.cfg;
  var allP = names.map(person);
  var h = ph('מש"קיות', X.universe.length ? '' : 'מוצגות המש"קיות שצפית בהן.');
  var whoList = heSort(uniq([].concat.apply([], allP.map(function (p) { return p.mn.concat(p.mf); }))));
  h += '<div class="bar no-print"><input class="in grow" type="search" data-inp="mashQ" value="' + esc(F.q) + '" placeholder="חיפוש: שם, רשות, מפקדת" aria-label="חיפוש">' +
    sel('mashRa', F.ra, 'כל הרשויות', heSort(uniq([].concat.apply([], allP.map(function (p) { return p.ra; }))))) +
    (whoList.length > 1 ? sel('mashWho', F.who, 'כל המנה"דים והמפקדות', whoList) : '') +
    sel('mashSt', F.st, 'כל המצבים', [['never', 'טרם נצפו'], ['risk', 'בסיכון'], ['below', 'מתחת ליעד'], ['ok', 'תקין']]) +
    ((F.q || F.ra || F.who || F.st) ? '<button type="button" class="btn ghost sm" data-act="mashClear">נקה סינון</button>' : '') +
    '<span class="cnt">' + rows.length + (rows.length === names.length ? '' : ' מתוך ' + names.length) + '</span></div>';
  if (!names.length) return h + '<div class="sheet"><div class="empty"><b>עוד אין כאן מש"קיות</b>אחרי שתזין תצפית, המש"קית תופיע כאן עם ההיסטוריה שלה.</div></div>';
  if (!rows.length) return h + '<div class="sheet"><div class="empty"><b>אין מש"קיות שמתאימות לסינון</b><button type="button" class="btn" data-act="mashClear">נקה סינון</button></div></div>';

  if (isWide()) {
    h += '<div class="sheet">' + table('mash', [
      { k: 'n', t: 'מש"קית', f: function (s) { return '<b>' + esc(s.n) + '</b>'; } },
      { k: 'ra', t: 'רשות', f: function (s) { return esc(person(s.n).ra.join(' / ') || '—'); }, v: function (s) { return person(s.n).ra.join(' '); } },
      { k: 'mf', t: 'מפקדת', f: function (s) { return esc(person(s.n).mf.join(' / ') || '—'); }, v: function (s) { return person(s.n).mf.join(' '); } },
      { k: 'mn', t: 'מנה"ד', f: function (s) { return esc(person(s.n).mn.join(' / ') || '—'); }, v: function (s) { return person(s.n).mn.join(' '); } },
      { k: 'total', t: 'תצפיות', n: 1 },
      { k: 'semN', t: X.sem, n: 1, f: function (s) { return s.semN + ' מתוך ' + cfg.target; } },
      { k: 'avg', t: 'ממוצע', n: 1, f: function (s) { return scHtml(s.avg === null ? null : r1(s.avg)); } },
      { k: 'age', t: 'נצפתה לאחרונה', f: function (s) { return s.last ? '<span class="num">' + fmtD(s.last.d) + '</span> <span class="muted">' + ago(s.last.d) + '</span>' : '<span class="muted">—</span>'; } },
      { k: 'status', t: 'מצב', f: statusChip, v: function (s) { return { never: 0, risk: 1, below: 2, ok: 3 }[s.status]; } }
    ], rows, { limit: F.limit, row: function (s) { return 'data-act="go" data-v="card" data-n="' + esc(s.n) + '" tabindex="0"'; }, moreAct: 'mashMore' }) + '</div>';
  } else {
    h += '<div class="sheet"><div class="list">' + rows.slice(0, F.limit).map(function (s) {
      var p = person(s.n);
      return '<button type="button" class="li" data-act="go" data-v="card" data-n="' + esc(s.n) + '"><span class="t">' + esc(s.n) + '</span>' +
        '<span class="e">' + (s.total ? scHtml(s.avg === null ? null : r1(s.avg)) : '') + '</span>' +
        '<span class="m"><span>' + esc(p.ra.join(' / ') || '—') + '</span><span>' + s.total + ' תצפיות</span>' + statusChip(s) + '</span></button>';
    }).join('') + '</div>' + (rows.length > F.limit ? '<div class="more"><button type="button" class="btn sm" data-act="mashMore">הצג עוד</button></div>' : '') + '</div>';
  }
  return h;
};
INP.mashQ = function (el) { ST.mash.q = el.value; ST.mash.limit = 60; render(); var i = $('[data-inp=mashQ]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
CH.mashRa = function (el) { ST.mash.ra = el.value; render(); };
CH.mashWho = function (el) { ST.mash.who = el.value; render(); };
CH.mashSt = function (el) { ST.mash.st = el.value; render(); };
ACT.mashClear = function () { ST.mash = { q: '', ra: '', who: '', st: '', limit: 60 }; render(); };
ACT.mashMore = function () { ST.mash.limit += 60; render(); };

/* ---------- כרטיס מש"קית ---------- */
VIEWS.card = function () {
  var name = ST.p.n, cfg = D.cfg;
  var st = X.ms[name] || (X.people[name] ? mashStats(name) : null);
  var back = '<button type="button" class="back no-print" data-act="go" data-v="mash">' + ic('back') + 'לכל המש"קיות</button>';
  if (!st) return back + '<div class="sheet"><div class="empty"><b>לא נמצאה מש"קית בשם הזה</b>ייתכן שאינה בתחום ההרשאה שלך.</div></div>';
  var p = person(name), list = st.list;

  var h = back + '<div class="ph"><div><div class="name">' + esc(name) + '</div><div class="sub" style="margin-top:4px">' +
    esc(p.ra.join(' / ') || 'רשות לא ידועה') + (p.mc ? ' · מחזור ' + esc(p.mc) : '') + '</div></div>' +
    '<span style="align-self:center">' + statusChip(st) + '</span><span class="sp"></span>' +
    (D.user.canWrite ? '<button type="button" class="btn pri no-print" data-act="go" data-v="form" data-n="' + esc(name) + '">' + ic('plus') + 'תצפית חדשה עליה</button>' : '') + '</div>';

  if (p.unknown) h += '<div class="callout warn"><div class="x"><b>אינה מופיעה בקובץ השיוך</b><br>השם הזה קיים בתצפיות אבל לא בטבלת המש"קיות, ולכן אין לה מפקדת, מנה"ד ומחזור. בדרך כלל זו שגיאת כתיב בשם.</div></div>';

  var cells = [];
  cells.push('<div class="cell"><div class="k">תצפיות</div><div class="v">' + st.total + '</div><div class="f">&nbsp;</div></div>');
  cells.push('<div class="cell"><div class="k">ב' + esc(X.sem) + '</div><div class="v">' + st.semN + '<small> מתוך ' + cfg.target + '</small></div><div class="f' + (st.semN >= cfg.target ? ' good' : '') + '">' + (st.semN >= cfg.target ? 'עמדה ביעד' : 'חסרות ' + (cfg.target - st.semN)) + '</div></div>');
  cells.push('<div class="cell"><div class="k">ממוצע</div><div class="v">' + f1(st.avg) + '</div><div class="f">' + (X.nat.avg !== null && st.avg !== null ? 'ממוצע כללי ' + f1(X.nat.avg) : '&nbsp;') + '</div></div>');
  cells.push('<div class="cell"><div class="k">ציון אחרון</div><div class="v">' + f1(st.lastScore) + '</div><div class="f' + (st.lastScore !== null && st.lastScore < cfg.low ? ' bad' : '') + '">' + (st.last ? ago(st.last.d) : '&nbsp;') + '</div></div>');
  cells.push('<div class="cell"><div class="k">שינוי מהתצפית הראשונה</div><div class="v">' + sg(st.diff) + '</div><div class="f' + (st.diff !== null && st.diff < 0 ? ' bad' : (st.diff > 0 ? ' good' : '')) + '">' + (st.diff === null ? '&nbsp;' : (st.diff < 0 ? 'ירידה' : (st.diff > 0 ? 'עלייה' : 'ללא שינוי'))) + '</div></div>');
  h += '<div class="ledger" style="--n:5">' + cells.join('') + '</div>';

  if (st.risk && st.risk.level >= 3) {
    h += '<div class="callout ' + (st.risk.level >= 5 ? 'bad' : 'warn') + '"><div class="x"><b>סיכון ' + esc(st.risk.label) + '</b><ul class="reasons">' +
      st.risk.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div></div>';
  } else if (st.reco) {
    h += '<div class="callout"><div class="x"><b>כדאי לצפות בה</b><br>' + esc(st.reco.why) + '</div></div>';
  }

  var info = '<div class="sheet"><div class="hd"><h2>שיוך</h2></div><div class="bd"><dl class="kv">' +
    [['רשות', p.ra.join(' / ')], ['מפקדת', p.mf.join(' / ')], ['מנה"ד', p.mn.join(' / ')], ['פלוגה', p.pl.join(' / ')], ['מחוז', p.mz.join(' / ')], ['מחזור', p.mc], ['מספר אישי', p.pid], ['חסר בשיוך', p.x]]
      .filter(function (x) { return x[1]; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') +
    (p.rows.length ? '' : '<dt>שיוך</dt><dd class="muted">לא ידוע</dd>') + '</dl></div></div>';

  if (!list.length) {
    return h + '<div class="cols c21"><div class="sheet"><div class="empty"><b>עוד לא נצפתה</b>אין עליה אף תצפית.' +
      (D.user.canWrite ? '<br><button type="button" class="btn pri" data-act="go" data-v="form" data-n="' + esc(name) + '">הזן תצפית ראשונה</button>' : '') + '</div></div>' + info + '</div>';
  }

  var scored = list.filter(function (o) { return o.s !== null; });
  var trend = '<div class="sheet"><div class="hd"><h2>הציון לאורך זמן</h2></div><div class="bd">' +
    (scored.length >= 2 ? lineChart(scored.map(function (o) { return { x: fmtS(o.d), y: o.s, tip: f1(o.s) + '|' + fmtD(o.d) + '|' + (o.ob || '') }; }), { thr: cfg.low, label: 'הציון של ' + name + ' לאורך זמן' })
      : '<div class="muted">צריך לפחות שתי תצפיות עם ציון כדי לראות מגמה.</div>') + '</div></div>';
  var crit = '<div class="sheet"><div class="hd"><h2>ממוצע לפי קריטריון</h2></div><div class="bd">' +
    hbars(cfg.criteria.map(function (c, i) { return { l: c.label, v: st.ca[i], ref: X.nat.ca[i], tip: f2(st.ca[i]) + '|' + c.label + '|ממוצע כללי ' + f2(X.nat.ca[i]) }; }), 5) +
    '<div class="legend"><span><i></i>' + esc(name) + '</span><span><i class="rf"></i>ממוצע כללי</span></div></div></div>';
  h += '<div class="cols c21"><div>' + trend + crit + '</div><div>' + info + '</div></div>';

  var desc = list.slice().reverse();
  h += '<div class="sheet"><div class="hd"><h2>כל התצפיות</h2><span class="note">' + list.length + '</span></div>';
  if (isWide()) {
    h += table('card', [
      { k: 'd', t: 'תאריך', f: function (o) { return '<span class="num">' + fmtD(o.d) + '</span>'; } },
      { k: 'sc', t: 'בית ספר' }, { k: 'sh', t: 'שיפט' }, { k: 'ob', t: 'מתצפת' }
    ].concat(cfg.criteria.map(function (c, i) {
      return { k: 'c' + i, t: c.label, n: 1, v: function (o) { return typeof o.c[i] === 'number' ? o.c[i] : null; }, f: function (o) { return o.c[i] === '-' ? '<span class="muted">לא נצפה</span>' : crCell(typeof o.c[i] === 'number' ? o.c[i] : null); } };
    })).concat([
      { k: 's', t: 'ציון', n: 1, f: function (o) { return scHtml(o.s, { miss: o.sm }); } },
      { k: 'fb', t: 'משוב', f: function (o) { return esc(o.fb || '—'); } }
    ]), desc, { row: function (o) { return 'data-act="go" data-v="obs" data-r="' + o.r + '" tabindex="0"'; } });
  } else {
    h += '<div class="list">' + desc.map(function (o) { return obsLi(o, true); }).join('') + '</div>';
  }
  return h + '</div>';
};
