/* ==========================================================================
   מסך הדוחות
   ========================================================================== */
function tabs(group, items) {
  return '<div class="tabs no-print" role="tablist">' + items.map(function (t) {
    return '<button type="button" role="tab" aria-selected="' + (ST.tab[group] === t[0]) + '" class="' + (ST.tab[group] === t[0] ? 'on' : '') + '" data-act="tab" data-g="' + group + '" data-t="' + t[0] + '">' + esc(t[1]) +
      (t[2] ? '<span class="n">' + t[2] + '</span>' : '') + '</button>';
  }).join('') + '</div>';
}
ACT.tab = function (el) { ST.tab[el.dataset.g] = el.dataset.t; render(); };
function critCols() {
  return D.cfg.criteria.map(function (c, i) {
    return { k: 'ca' + i, t: c.label, n: 1, v: function (r) { return r.ca[i]; }, f: function (r) { return crCell(r.ca[i]); } };
  });
}
function seg(ch, cur, items) {
  return '<div class="seg sm" role="group" style="display:inline-flex">' + items.map(function (x) {
    return '<button type="button" class="' + (cur === x[0] ? 'on' : '') + '" data-act="' + ch + '" data-val="' + esc(x[0]) + '" aria-pressed="' + (cur === x[0]) + '">' + esc(x[1]) + '</button>';
  }).join('') + '</div>';
}

VIEWS.rep = function () {
  var hasMad = X.valid.some(isMadmach);
  var T = [['nat', 'תמונת מצב'], ['dim', 'פילוחים']];
  if (X.universe.length) T.push(['resp', 'אחריות']);
  T.push(['obsv', 'מתצפתים'], ['month', 'חודש אחר חודש']);
  if (hasMad) T.push(['mad', 'מדמ"ח']);
  if (!T.some(function (t) { return t[0] === ST.tab.rep; })) ST.tab.rep = 'nat';
  var h = ph('דוחות', D.user.seesAll ? '' : 'הדוחות מחושבים מהתצפיות שבתחום ההרשאה שלך.',
    '<button type="button" class="btn no-print" data-act="print">' + ic('print') + 'הדפסה</button>') + tabs('rep', T);
  if (!X.valid.length) return h + '<div class="sheet"><div class="empty"><b>אין עדיין נתונים לדוחות</b>הדוחות יתמלאו כשיוזנו תצפיות.</div></div>';
  return h + REP[ST.tab.rep]();
};
var REP = {};

REP.nat = function () {
  var cfg = D.cfg, nat = X.nat, mon = monthly(X.valid), h = '';
  var cells = [];
  cells.push('<div class="cell"><div class="k">תצפיות</div><div class="v">' + nat.n + '</div><div class="f">' + esc(X.sem) + ': ' + X.valid.filter(function (o) { return semOf(o.d) === X.sem; }).length + '</div></div>');
  cells.push('<div class="cell"><div class="k">מש"קיות שנצפו</div><div class="v">' + (X.universe.length ? X.seenUni + '<small> מתוך ' + X.universe.length + '</small>' : nat.mash) + '</div><div class="f">' + (X.universe.length ? 'כיסוי ' + Math.round(X.seenUni / X.universe.length * 100) + '%' : '&nbsp;') + '</div></div>');
  cells.push('<div class="cell"><div class="k">ממוצע ציונים</div><div class="v">' + f1(nat.avg) + '</div><div class="f">' + nat.cnt + ' תצפיות עם ציון</div></div>');
  cells.push('<div class="cell"><div class="k">ציונים מתחת ל-' + cfg.low + '</div><div class="v">' + nat.low + '</div><div class="f">' + (nat.cnt ? Math.round(nat.low / nat.cnt * 100) + '% מהתצפיות' : '&nbsp;') + '</div></div>');
  h += '<div class="ledger" style="--n:4">' + cells.join('') + '</div>';

  var total = 0, full = true;
  var rows = cfg.criteria.map(function (c, i) {
    var a = nat.ca[i], share = a === null ? null : a / 5 * c.weight * 100;
    if (share === null) full = false; else total += share;
    return { label: c.label, n: nat.critN[i], avg: a, pc: a === null ? null : a / 5, w: c.weight, share: share };
  });
  h += '<div class="sheet"><div class="hd"><h2>ממוצע לפי קריטריון</h2><span class="note">"תרומה לציון" = הממוצע חלקי 5, כפול המשקל. כך רואים איזה קריטריון מושך את הציון למטה.</span></div>' +
    table('natCrit', [
      { k: 'label', t: 'קריטריון', f: function (r) { return '<b>' + esc(r.label) + '</b>'; } },
      { k: 'n', t: 'מדידות', n: 1 },
      { k: 'avg', t: 'ממוצע (1–5)', n: 1, f: function (r) { return crCell(r.avg); } },
      { k: 'pc', t: '% מהמקסימום', n: 1, f: function (r) { return pct(r.pc); } },
      { k: 'w', t: 'משקל', n: 1, f: function (r) { return pct(r.w); } },
      { k: 'share', t: 'תרומה לציון', n: 1, f: function (r) { return f1(r.share); } }
    ], rows, { foot: '<tr><td>סך הכל</td><td class="n"></td><td class="n"></td><td class="n"></td><td class="n">100%</td><td class="n">' + (full ? f1(total) : '—') + '</td></tr>' }) + '</div>';

  h += '<div class="cols c2"><div class="sheet"><div class="hd"><h2>התפלגות הציונים</h2></div><div class="bd">' + histogram(X.valid) + '</div></div>' +
    '<div class="sheet"><div class="hd"><h2>ממוצע הציונים לפי חודש</h2></div><div class="bd">' +
    lineChart(mon.map(function (m) { return { x: monthShort(m.key), y: m.avg, tip: f1(m.avg) + '|' + monthLabel(m.key) + '|' + m.n + ' תצפיות' }; }), { thr: cfg.low, area: true, label: 'ממוצע הציונים לפי חודש', w: isWide() ? 500 : 350, h: 190 }) + '</div></div></div>';
  return h;
};

var DIMS = [['ra', 'רשות'], ['sc', 'בית ספר'], ['sh', 'שיפט'], ['mz', 'מחוז'], ['pl', 'פלוגה'], ['mc', 'מחזור'], ['m', 'מש"קית']];
REP.dim = function () {
  var dim = ST.rep.dim, label = DIMS.filter(function (d) { return d[0] === dim; })[0][1];
  var rows = pivot(X.valid, function (o) {
    if (dim === 'sc') return o.sc ? { id: o.ra + '|' + norm(o.sc), t: o.sc, s: o.ra } : null;
    return o[dim];
  });
  var cols = [{ k: 'key', t: label, f: function (r) { return '<b>' + esc(r.key) + '</b>'; } }];
  if (dim === 'sc') cols.push({ k: 'sub', t: 'רשות' });
  cols.push({ k: 'n', t: 'תצפיות', n: 1 }, { k: 'share', t: '% מהתצפיות', n: 1, f: function (r) { return pct(r.share); } });
  if (dim !== 'm') cols.push({ k: 'mash', t: 'מש"קיות', n: 1 });
  cols.push({ k: 'avg', t: 'ממוצע', n: 1, f: function (r) { return scHtml(r.avg); } }, { k: 'low', t: 'ציונים נמוכים', n: 1, f: function (r) { return r.low || '—'; } });
  cols = cols.concat(critCols());
  cols.push({ k: 'last', t: 'תצפית אחרונה', f: function (r) { return '<span class="num">' + fmtD(r.last) + '</span>'; } });
  var tap = { ra: 1, sh: 1, pl: 1, m: 1 }[dim];
  return '<div class="bar no-print"><select class="in" data-ch="repDim" aria-label="פילוח לפי">' + DIMS.map(function (d) { return '<option value="' + d[0] + '"' + (d[0] === dim ? ' selected' : '') + '>לפי ' + esc(d[1]) + '</option>'; }).join('') + '</select>' +
    '<span class="cnt">' + rows.length + ' שורות' + (tap ? ' · לחיצה על שורה פותחת את התצפיות שלה' : '') + '</span></div>' +
    '<div class="sheet">' + table('dim_' + dim, cols, rows, { sort: { k: 'n', d: 'd' },
      row: tap ? function (r) { return 'data-act="dimRow" data-dim="' + dim + '" data-key="' + esc(r.key) + '" tabindex="0"'; } : null }) + '</div>';
};
CH.repDim = function (el) { ST.rep.dim = el.value; render(); };
ACT.dimRow = function (el) {
  var dim = el.dataset.dim, key = el.dataset.key;
  if (dim === 'm') return go('card', { n: key });
  ST.list = { q: '', ra: '', pl: '', sh: '', st: '', when: '', ob: '', limit: 50 };
  ST.list[dim] = key;
  go('list');
};

REP.resp = function () {
  var field = ST.rep.resp, rows = responsibility(field), title = field === 'mn' ? 'מנה"ד' : 'מפקדת';
  return '<div class="bar no-print">' + seg('respSet', field, [['mn', 'לפי מנה"ד'], ['mf', 'לפי מפקדת']]) +
    '<span class="cnt">לפי מה שבאחריות כל אחד בטבלת השיוך, לא לפי תצפיות שביצע</span></div>' +
    '<div class="sheet">' + table('resp_' + field, [
      { k: 'who', t: title, f: function (r) { return '<b>' + esc(r.who) + '</b>'; } },
      { k: 'total', t: 'מש"קיות באחריות', n: 1 }, { k: 'seen', t: 'נצפו', n: 1 },
      { k: 'none', t: 'ללא תצפית', n: 1, f: function (r) { return r.none ? '<b>' + r.none + '</b>' : '—'; } },
      { k: 'cov', t: '% כיסוי', n: 1, f: function (r) { return pct(r.cov); } },
      { k: 'n', t: 'תצפיות', n: 1 },
      { k: 'avg', t: 'ממוצע המש"קיות', n: 1, f: function (r) { return scHtml(r.avg); } },
      { k: 'ravg', t: 'ממוצע ברשויות', n: 1, f: function (r) { return scHtml(r.ravg); } }
    ].concat(critCols()).concat([
      { k: 'last', t: 'תצפית אחרונה', f: function (r) { return '<span class="num">' + fmtD(r.last) + '</span>'; } },
      { k: 'rash', t: 'רשויות', c: 'w', f: function (r) { return esc(r.rash.join(', ')); }, v: function (r) { return r.rash.join(' '); } }
    ]), rows, { sort: { k: 'none', d: 'd' }, row: function (r) { return 'data-act="mashFilter" data-who="' + esc(r.who) + '" tabindex="0"'; } }) + '</div>';
};
ACT.respSet = function (el) { ST.rep.resp = el.dataset.val; render(); };

REP.obsv = function () {
  var cfg = D.cfg, role = ST.rep.role, rows = observers(role);
  var roles = heSort(uniq(X.valid.map(function (o) { return o.ro; })));
  var curWeek = Math.max(schoolWeek(D.today), 1), show = Math.min(curWeek, 10);
  var anyGoal = rows.some(function (r) { return r.goal !== null; });
  var cols = [
    { k: 'who', t: 'מתצפת', f: function (r) { return '<b>' + esc(r.who) + '</b>'; } },
    { k: 'role', t: 'תפקיד' },
    { k: 'n', t: 'תצפיות', n: 1 },
    { k: 'thisWeek', t: 'השבוע', n: 1 }
  ];
  if (anyGoal) cols.push(
    { k: 'goal', t: 'יעד מצטבר', n: 1, f: function (r) { return r.goal === null ? '—' : r.goal; } },
    { k: 'gap', t: 'פער', n: 1, f: function (r) { return r.gap === null ? '—' : (r.gap ? '<b>' + r.gap + '</b>' : '0'); } });
  cols.push(
    { k: 'weeks', t: show + ' השבועות האחרונים', v: function (r) { return r.done; }, f: function (r) {
      return '<span class="wk" role="img" aria-label="תצפיות לפי שבוע: ' + r.weeks.slice(-show).join(', ') + '">' + r.weeks.slice(-show).map(function (n, i) {
        var wn = curWeek - show + i + 1;
        return '<i class="' + (n >= cfg.weeklyTarget ? 'f' : (n > 0 ? 'p' : '')) + '" title="שבוע ' + wn + ' (מ-' + fmtS(weekStart(wn)) + '): ' + n + '">' + n + '</i>';
      }).join('') + '</span>';
    } },
    { k: 'avg', t: 'ממוצע שנותן', n: 1, f: function (r) { return scHtml(r.avg); } },
    { k: 'diff', t: 'סטייה מהממוצע', n: 1, f: function (r) { return sg(r.diff); } },
    { k: 'sd', t: 'פיזור', n: 1, f: function (r) { return r.sd === null ? '—' : r.sd; } },
    { k: 'status', t: 'כיול', f: function (r) { return '<span class="chip ' + r.cls + '" title="' + esc(r.note) + '">' + esc(r.status) + '</span>'; } },
    { k: 'last', t: 'תצפית אחרונה', f: function (r) { return '<span class="num">' + fmtD(r.last) + '</span>'; } });
  var talk = rows.filter(function (r) { return r.cls === 'orange' || r.cls === 'yellow'; });
  return '<div class="bar no-print">' + sel('obsRole', role, 'כל התפקידים', roles) +
    '<span class="cnt">שבוע ' + curWeek + ' לשנת הלימודים' + (anyGoal ? '. יעד: ' + cfg.weeklyTarget + ' תצפיות בשבוע למנה"ד ולמפקדת' : '') + '</span></div>' +
    '<div class="sheet">' + table('obsv', cols, rows, { sort: { k: 'n', d: 'd' }, row: function (r) { return 'data-act="obsvRow" data-who="' + esc(r.who) + '" tabindex="0"'; } }) + '</div>' +
    (talk.length ? '<div class="sheet"><div class="hd"><h2>שווה שיחת כיול</h2><span class="note">מתצפתים שהדירוג שלהם חורג מהשאר</span></div><div class="bd flush"><div class="list">' +
      talk.map(function (r) { return '<div class="li"><span class="t">' + esc(r.who) + '</span><span class="e"><span class="chip ' + r.cls + '">' + esc(r.status) + '</span></span><span class="m">' + esc(r.note) + '</span></div>'; }).join('') + '</div></div></div>' : '') +
    '<p class="sub" style="max-width:75ch">"מקל" או "מחמיר" = הממוצע שהמתצפת נותן רחוק ב-5 נקודות ומעלה מהממוצע הכללי. "דירוג אחיד" = אותו ציון ברוב הקריטריונים. כשמתצפת אחד מקל ואחר מחמיר, ההשוואה בין המש"קיות שלהם אינה הוגנת.</p>';
};
CH.obsRole = function (el) { ST.rep.role = el.value; render(); };
ACT.obsvRow = function (el) {
  ST.list = { q: '', ra: '', pl: '', sh: '', st: '', when: '', ob: el.dataset.who, limit: 50 };
  go('list');
};

REP.month = function () {
  var asc = monthly(X.valid), rows = asc.slice().reverse(), cfg = D.cfg;
  var minis = '';
  if (asc.length >= 2) {
    minis = '<div class="sheet"><div class="hd"><h2>מגמת כל קריטריון</h2><span class="note">ממוצע חודשי, סולם 1 עד 5. האם אנחנו משתפרים, ובאיזה ממד.</span></div><div class="bd"><div class="minis">' +
      cfg.criteria.map(function (c, i) {
        var pts = asc.map(function (m) { return { x: monthShort(m.key), y: m.ca[i] === null ? null : Math.round(m.ca[i] * 100) / 100, tip: f2(m.ca[i]) + '|' + c.label + '|' + monthLabel(m.key) }; });
        var first = null, last = null;
        pts.forEach(function (p) { if (p.y !== null) { if (first === null) first = p.y; last = p.y; } });
        var d = (first !== null && last !== null) ? Math.round((last - first) * 100) / 100 : null;
        return '<div><h3>' + esc(c.label) + '</h3><div class="muted">' + (d === null ? '&nbsp;' : 'מתחילת התקופה: ' + sg(d)) + '</div>' +
          lineChart(pts, { min: 1, max: 5, w: 330, h: 150, label: 'מגמת ' + c.label }) + '</div>';
      }).join('') + '</div></div></div>';
  }
  return minis + '<div class="sheet">' + table('month', [
    { k: 'key', t: 'חודש', f: function (r) { return '<b>' + esc(monthLabel(r.key)) + '</b>'; } },
    { k: 'n', t: 'תצפיות', n: 1 }, { k: 'mash', t: 'מש"קיות שנצפו', n: 1 },
    { k: 'cov', t: '% כיסוי', n: 1, f: function (r) { return pct(r.cov); } },
    { k: 'avg', t: 'ממוצע', n: 1, f: function (r) { return scHtml(r.avg); } },
    { k: 'delta', t: 'שינוי מהחודש הקודם', n: 1, f: function (r) { return sg(r.delta); } },
    { k: 'low', t: 'ציונים נמוכים', n: 1, f: function (r) { return r.low || '—'; } }
  ].concat(critCols()), rows) + '</div>' +
    '<p class="sub">"% כיסוי" הוא חלקן של המש"קיות שנצפו באותו חודש מתוך כלל המש"קיות. הכול מחושב מתאריכי התצפיות, ולכן תיקון של תאריך ישן מתקן גם את העבר.</p>';
};

REP.mad = function () {
  var cfg = D.cfg, list = X.valid.filter(isMadmach), a = agg(list), nat = X.nat, h = '';
  var cells = [];
  cells.push('<div class="cell"><div class="k">תצפיות מדמ"ח</div><div class="v">' + a.n + '</div><div class="f">' + (nat.n ? Math.round(a.n / nat.n * 100) + '% מכלל התצפיות' : '') + '</div></div>');
  cells.push('<div class="cell"><div class="k">מש"קיות שנצפו</div><div class="v">' + a.mash + '</div><div class="f">&nbsp;</div></div>');
  var d = (a.avg !== null && nat.avg !== null) ? r1(a.avg - nat.avg) : null;
  cells.push('<div class="cell"><div class="k">ממוצע מדמ"ח</div><div class="v">' + f1(a.avg) + '</div><div class="f' + (d === null ? '' : (d < 0 ? ' bad' : ' good')) + '">ממוצע כללי ' + f1(nat.avg) + (d === null ? '' : ' (' + sg(d) + ')') + '</div></div>');
  cells.push('<div class="cell"><div class="k">ציונים מתחת ל-' + cfg.low + '</div><div class="v">' + a.low + '</div><div class="f">&nbsp;</div></div>');
  h += '<div class="ledger" style="--n:4">' + cells.join('') + '</div>';
  h += '<div class="cols c2"><div class="sheet"><div class="hd"><h2>ממוצע לפי קריטריון</h2></div><div class="bd">' +
    hbars(cfg.criteria.map(function (c, i) { return { l: c.label, v: a.ca[i], ref: nat.ca[i], tip: f2(a.ca[i]) + '|' + c.label + '|ממוצע כללי ' + f2(nat.ca[i]) }; }), 5) +
    '<div class="legend"><span><i></i>מדמ"ח</span><span><i class="rf"></i>ממוצע כללי</span></div></div></div>' +
    '<div class="sheet"><div class="hd"><h2>לפי שיפט</h2></div>' + table('madSh', [
      { k: 'key', t: 'שיפט', f: function (r) { return '<b>' + esc(r.key) + '</b>'; } }, { k: 'n', t: 'תצפיות', n: 1 }, { k: 'mash', t: 'מש"קיות', n: 1 },
      { k: 'avg', t: 'ממוצע', n: 1, f: function (r) { return scHtml(r.avg); } }, { k: 'low', t: 'נמוכים', n: 1, f: function (r) { return r.low || '—'; } }
    ], pivot(list, function (o) { return o.sh; })) + '</div></div>';
  h += '<div class="sheet"><div class="hd"><h2>לפי רשות</h2></div>' + table('madRa', [
    { k: 'key', t: 'רשות', f: function (r) { return '<b>' + esc(r.key) + '</b>'; } }, { k: 'n', t: 'תצפיות', n: 1 }, { k: 'mash', t: 'מש"קיות', n: 1 },
    { k: 'avg', t: 'ממוצע', n: 1, f: function (r) { return scHtml(r.avg); } }, { k: 'low', t: 'נמוכים', n: 1, f: function (r) { return r.low || '—'; } }
  ].concat(critCols()), pivot(list, function (o) { return o.ra; }), { sort: { k: 'n', d: 'd' } }) + '</div>';
  h += '<p class="sub"><button type="button" class="btn sm" data-act="listFilter" data-st="madmach">פתח את תצפיות המדמ"ח ברשימה</button></p>';
  return h;
};
