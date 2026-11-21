/* ==========================================================================
   מסכים: בית, רשימת תצפיות, תצפית בודדת
   ========================================================================== */
var DETAIL = {};
function isWide() { return window.innerWidth >= 820; }
function fpOf(o) { return (o.m || '') + '|' + (o.d || ''); }

function ph(title, lead, actions) {
  return '<div class="ph"><div class="ph-t"><h1>' + esc(title) + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div>' +
    (actions ? '<div class="row-btns">' + actions + '</div>' : '') + '</div>';
}
function obsChips(o) {
  var h = '';
  if (!o.d) h += '<span class="chip red">חסר תאריך</span>';
  if (!o.dn) h += '<span class="chip yellow">לא הסתיימה</span>';
  else if (o.fb !== 'כן' && o.age !== undefined && o.age > D.cfg.feedbackDays) h += '<span class="chip ' + (o.age > 21 ? 'red' : 'orange') + '">משוב לא הועבר</span>';
  if (o.sm) h += '<span class="chip plain">חסר ציון</span>';
  return h;
}
function obsLi(o, hideName) {
  return '<button type="button" class="li" data-act="go" data-v="obs" data-r="' + o.r + '">' +
    '<span class="t">' + esc(hideName ? (fmtD(o.d) + (o.sc ? ' · ' + o.sc : '')) : (o.m || '(בלי שם)')) + '</span>' +
    '<span class="e">' + scHtml(o.s, { miss: o.sm }) + '</span>' +
    '<span class="m">' + (hideName ? '' : '<span>' + fmtD(o.d) + '</span>') +
    (o.sc && !hideName ? '<span>' + esc(o.sc) + (o.ra ? ', ' + esc(o.ra) : '') + '</span>' : '') +
    (o.ob ? '<span>' + esc(o.ob) + '</span>' : '') + obsChips(o) + '</span></button>';
}
function scopeLine() {
  var u = D.user;
  if (u.role === 'מנהל') return 'כל התצפיות בתוכנית.';
  if (u.role === 'צופה') return 'כל התצפיות בתוכנית, לצפייה בלבד.';
  if (u.role === 'מתצפת') return 'מוצגות התצפיות שהזנת.';
  if (!X.universe.length) return 'התפקיד שלך הוא ' + esc(u.role) + ', אבל לא נמצאו מש"קיות תחת השם "' + esc(u.name || u.scope) + '" בטבלת השיוך. פנה למנהל המערכת.';
  return X.universe.length + ' מש"קיות באחריותך. מוצגות התצפיות עליהן ואלה שביצעת בעצמך.';
}

/* ---------- בית ---------- */
VIEWS.home = function () {
  var cfg = D.cfg, nat = X.nat, h = '';
  var first = (D.user.name || D.user.email.split('@')[0]).split(' ')[0];
  h += ph('שלום, ' + first, scopeLine());

  if (!D.obs.length) {
    return h + '<div class="sheet"><div class="empty"><b>עוד אין כאן תצפיות</b>' +
      (D.user.canWrite ? 'התצפית הראשונה שתזין תופיע כאן, עם הציון והמגמה.<br><button type="button" class="btn pri" data-act="newObs">הזן תצפית ראשונה</button>'
        : 'כשיוזנו תצפיות הן יופיעו כאן.') + '</div></div>';
  }

  var mon = monthly(X.valid), curM = mon.length ? mon[mon.length - 1] : null, prevM = mon.length > 1 ? mon[mon.length - 2] : null;
  var crit = X.alerts.filter(function (a) { return a.sev === 1; }).length;
  var cells = [];
  cells.push('<div class="cell"><div class="k">תצפיות</div><div class="v">' + X.valid.length + '</div><div class="f">' + (curM ? curM.n : 0) + ' החודש</div></div>');
  var dlt = (curM && prevM && curM.avg !== null && prevM.avg !== null) ? r1(curM.avg - prevM.avg) : null;
  cells.push('<div class="cell"><div class="k">ממוצע ציונים</div><div class="v">' + f1(nat.avg) + '</div><div class="f' + (dlt === null ? '' : (dlt < 0 ? ' bad' : (dlt > 0 ? ' good' : ''))) + '">' +
    (dlt === null ? 'מתוך 100' : (sg(dlt) + ' לעומת החודש הקודם')) + '</div></div>');
  if (X.universe.length) {
    cells.push('<button type="button" class="cell" data-act="mashFilter" data-st="never"><div class="k">כיסוי מש"קיות</div><div class="v">' + Math.round(X.seenUni / X.universe.length * 100) + '<small>%</small></div><div class="f">' + X.seenUni + ' מתוך ' + X.universe.length + ' נצפו</div></button>');
  } else {
    cells.push('<div class="cell"><div class="k">מש"קיות שנצפו</div><div class="v">' + nat.mash + '</div><div class="f">&nbsp;</div></div>');
  }
  cells.push('<button type="button" class="cell" data-act="listFilter" data-st="low"><div class="k">ציונים מתחת ל-' + cfg.low + '</div><div class="v">' + nat.low + '</div><div class="f">' + (nat.cnt ? Math.round(nat.low / nat.cnt * 100) + '% מהתצפיות' : '&nbsp;') + '</div></button>');
  cells.push('<button type="button" class="cell" data-act="go" data-v="care"><div class="k">דורש טיפול</div><div class="v">' + X.alerts.length + '</div><div class="f' + (crit ? ' bad' : '') + '">' + (crit ? crit + ' קריטיות' : 'אין קריטיות') + '</div></button>');
  h += '<div class="ledger" style="--n:' + cells.length + '">' + cells.join('') + '</div>';

  if (X.drafts.length) {
    h += '<div class="callout warn"><div class="x"><b>' + (X.drafts.length === 1 ? 'תצפית אחת שלך לא הסתיימה' : X.drafts.length + ' תצפיות שלך לא הסתיימו') + '</b><br>' +
      'עד שתצפית מסומנת כהסתיימה, דוח המשוב שלה לא מופק.<div class="row-btns">' +
      X.drafts.slice(0, 4).map(function (o) { return '<button type="button" class="btn sm" data-act="editObs" data-r="' + o.r + '">' + esc(o.m) + ' · ' + fmtS(o.d) + '</button>'; }).join('') +
      '</div></div></div>';
  }

  var pts = mon.map(function (m) { return { x: monthShort(m.key), y: m.avg, tip: f1(m.avg) + '|' + monthLabel(m.key) + '|' + m.n + ' תצפיות' }; });
  var cnt = mon.map(function (m) { return { x: monthShort(m.key), y: m.n, tip: m.n + ' תצפיות|' + monthLabel(m.key) + '|' + m.mash + ' מש"קיות' }; });
  var left = '<div class="sheet"><div class="hd"><h2>ממוצע הציונים לפי חודש</h2></div><div class="bd">' + lineChart(pts, { thr: cfg.low, area: true, label: 'ממוצע הציונים לפי חודש' }) + '</div>' +
    '<div class="hd"><h2>תצפיות בכל חודש</h2></div><div class="bd">' + colChart(cnt, { label: 'מספר התצפיות בכל חודש', h: 150 }) + '</div></div>' +
    '<div class="sheet"><div class="hd"><h2>ממוצע לפי קריטריון</h2><span class="note">סולם 1 עד 5</span></div><div class="bd">' +
    hbars(cfg.criteria.map(function (c, i) { return { l: c.label, v: nat.ca[i], tip: f2(nat.ca[i]) + '|' + c.label + '|משקל ' + Math.round(c.weight * 100) + '%' }; }), 5) + '</div></div>';

  var right = '<div class="sheet"><div class="hd"><h2>דורש טיפול</h2><span class="sp"></span>' + (X.alerts.length ? '<button type="button" class="btn ghost sm" data-act="go" data-v="care">כל ה-' + X.alerts.length + '</button>' : '') + '</div>';
  if (X.alerts.length) {
    right += '<div class="bd flush"><div class="list">' + X.alerts.slice(0, 4).map(alertLi).join('') + '</div></div>';
  } else right += '<div class="empty">אין כרגע התראות פתוחות.</div>';
  right += '</div>';
  if (X.reco.length) {
    right += '<div class="sheet"><div class="hd"><h2>את מי לצפות עכשיו</h2><span class="sp"></span><button type="button" class="btn ghost sm" data-act="careTab" data-t="reco">כל ה-' + X.reco.length + '</button></div>' +
      '<div class="bd flush"><div class="list">' + X.reco.slice(0, 4).map(recoLi).join('') + '</div></div></div>';
  }
  right += '<div class="sheet"><div class="hd"><h2>תצפיות אחרונות</h2><span class="sp"></span><button type="button" class="btn ghost sm" data-act="go" data-v="list">לכל התצפיות</button></div>' +
    '<div class="bd flush"><div class="list">' + X.valid.slice(0, 4).map(function (o) { return obsLi(o); }).join('') + '</div></div></div>';
  h += '<div class="cols c21"><div>' + left + '</div><div>' + right + '</div></div>';
  return h;
};
function alertLi(a) {
  return '<button type="button" class="li" data-act="go" data-v="obs" data-r="' + a.o.r + '">' +
    '<span class="t">' + esc(a.m) + '</span><span class="e"><span class="chip ' + (a.sev === 1 ? 'red' : 'orange') + '">' + (a.sev === 1 ? 'קריטי' : 'לטיפול') + '</span></span>' +
    '<span class="m"><span>' + esc(a.title) + '</span>' + (a.info ? '<span>' + esc(a.info) + '</span>' : '') + '</span></button>';
}
function recoLi(st) {
  var p = person(st.n);
  return '<button type="button" class="li" data-act="go" data-v="card" data-n="' + esc(st.n) + '">' +
    '<span class="t">' + esc(st.n) + '</span><span class="e"><span class="chip ' + st.reco.cls + '">' + st.reco.label + '</span></span>' +
    '<span class="m"><span>' + esc(p.ra.join(' / ') || '—') + '</span><span>' + (st.last ? 'נצפתה ' + ago(st.last.d) : 'טרם נצפתה') + '</span></span></button>';
}
ACT.newObs = function () { go('form', {}); };
ACT.editObs = function (el) { go('form', { r: el.dataset.r }); };
ACT.listFilter = function (el) {
  ST.list = { q: '', ra: '', pl: '', sh: '', st: el.dataset.st || '', when: '', ob: '', limit: 50 };
  go('list');
};
ACT.mashFilter = function (el) {
  ST.mash = { q: '', ra: '', who: el.dataset.who || '', st: el.dataset.st || '', limit: 60 };
  go('mash');
};
ACT.careTab = function (el) { ST.tab.care = el.dataset.t; go('care'); };

/* ---------- רשימת תצפיות ---------- */
function listRows() {
  var F = ST.list, q = norm(F.q).toLowerCase(), cfg = D.cfg;
  var monthStart = D.today.slice(0, 8) + '01';
  var rows = X.valid.concat(X.broken);
  return rows.filter(function (o) {
    if (q && norm([o.m, o.sc, o.ra, o.ob, o.mf, o.mn, o.le].join(' ')).toLowerCase().indexOf(q) === -1) return false;
    if (F.ra && o.ra !== F.ra) return false;
    if (F.pl && o.pl !== F.pl) return false;
    if (F.sh && o.sh !== F.sh) return false;
    if (F.ob && o.ob !== F.ob) return false;
    if (F.st === 'draft' && o.dn) return false;
    if (F.st === 'low' && !(o.s !== null && o.s < cfg.low)) return false;
    if (F.st === 'nofb' && (o.fb === 'כן')) return false;
    if (F.st === 'madmach' && !isMadmach(o)) return false;
    if (F.st === 'mine' && !isMine(o)) return false;
    if (F.st === 'noscore' && o.s !== null) return false;
    if (F.when === 'm' && !(o.d && o.d >= monthStart)) return false;
    if (F.when === '30' && !(o.d && daysAgo(o.d) <= 30)) return false;
    if (F.when === 'sem' && semOf(o.d) !== X.sem) return false;
    return true;
  });
}
function sel(ch, cur, first, opts) {
  return '<select class="in" data-ch="' + ch + '" aria-label="' + esc(first) + '"><option value="">' + esc(first) + '</option>' +
    opts.map(function (x) { var v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>';
}
VIEWS.list = function () {
  var F = ST.list, rows = listRows();
  var all = X.valid.concat(X.broken);
  var h = ph('תצפיות', '', '<button type="button" class="btn no-print" data-act="csv">' + ic('dl') + 'ייצוא לאקסל</button>');
  h += '<div class="bar no-print"><input class="in grow" type="search" data-inp="listQ" value="' + esc(F.q) + '" placeholder="חיפוש: מש&quot;קית, בית ספר, רשות, מתצפת" aria-label="חיפוש">' +
    sel('listRa', F.ra, 'כל הרשויות', heSort(uniq(all.map(function (o) { return o.ra; })))) +
    sel('listSh', F.sh, 'כל השיפטים', heSort(uniq(all.map(function (o) { return o.sh; })))) +
    sel('listSt', F.st, 'כל המצבים', [['draft', 'לא הסתיימו'], ['low', 'ציון נמוך'], ['nofb', 'משוב לא הועבר'], ['noscore', 'בלי ציון'], ['madmach', 'מדמ"ח'], ['mine', 'שאני ביצעתי']]) +
    sel('listWhen', F.when, 'כל התקופה', [['m', 'החודש'], ['30', '30 הימים האחרונים'], ['sem', X.sem]]) +
    ((F.q || F.ra || F.pl || F.sh || F.st || F.when || F.ob) ? '<button type="button" class="btn ghost sm" data-act="listClear">נקה סינון</button>' : '') +
    '<span class="cnt">' + rows.length + (rows.length === all.length ? '' : ' מתוך ' + all.length) + '</span></div>';

  if (!rows.length) {
    return h + '<div class="sheet"><div class="empty"><b>אין תצפיות שמתאימות לסינון</b>נסה להרחיב את החיפוש.' +
      '<br><button type="button" class="btn" data-act="listClear">נקה סינון</button></div></div>';
  }
  if (isWide()) {
    h += '<div class="sheet">' + table('list', [
      { k: 'd', t: 'תאריך', f: function (o) { return '<span class="num">' + fmtD(o.d) + '</span>'; } },
      { k: 'm', t: 'מש"קית', f: function (o) { return '<b>' + esc(o.m || '(בלי שם)') + '</b>'; } },
      { k: 'ra', t: 'רשות' }, { k: 'sc', t: 'בית ספר' }, { k: 'sh', t: 'שיפט' }, { k: 'ob', t: 'מתצפת' },
      { k: 's', t: 'ציון', n: 1, f: function (o) { return scHtml(o.s, { miss: o.sm }); } },
      { k: 'fb', t: 'מצב', f: function (o) { return obsChips(o) || (o.fb === 'כן' ? '<span class="chip green">משוב הועבר</span>' : ''); }, v: function (o) { return (o.dn ? '1' : '0') + (o.fb || ''); } }
    ], rows, { limit: F.limit, row: function (o) { return 'data-act="go" data-v="obs" data-r="' + o.r + '" tabindex="0"'; }, moreAct: 'listMore' }) + '</div>';
  } else {
    h += '<div class="sheet"><div class="list">' + rows.slice(0, F.limit).map(function (o) { return obsLi(o); }).join('') + '</div>' +
      (rows.length > F.limit ? '<div class="more"><button type="button" class="btn sm" data-act="listMore">הצג עוד</button></div>' : '') + '</div>';
  }
  return h;
};
INP.listQ = function (el) { ST.list.q = el.value; ST.list.limit = 50; render(); var i = $('[data-inp=listQ]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
CH.listRa = function (el) { ST.list.ra = el.value; ST.list.limit = 50; render(); };
CH.listSh = function (el) { ST.list.sh = el.value; ST.list.limit = 50; render(); };
CH.listSt = function (el) { ST.list.st = el.value; ST.list.limit = 50; render(); };
CH.listWhen = function (el) { ST.list.when = el.value; ST.list.limit = 50; render(); };
ACT.listClear = function () { ST.list = { q: '', ra: '', pl: '', sh: '', st: '', when: '', ob: '', limit: 50 }; render(); };
ACT.listMore = function () { ST.list.limit += 60; render(); };
ACT.csv = function () {
  var cr = D.cfg.criteria, rows = listRows();
  var head = ['תאריך', 'מש"קית', 'רשות', 'בית ספר', 'כיתה', 'שיפט', 'שיעור', 'מתצפת', 'תפקיד', 'מנה"ד', 'מפקדת', 'פלוגה', 'מחוז', 'מחזור', 'מתגברת']
    .concat(cr.map(function (c) { return c.label; })).concat(['ציון', 'משוב הועבר', 'הסתיימה']);
  var out = [head].concat(rows.map(function (o) {
    return [fmtD(o.d), o.m, o.ra, o.sc, o.k, o.sh, o.le, o.ob, o.ro, o.mn, o.mf, o.pl, o.mz, o.mc, o.bo]
      .concat(cr.map(function (c, i) { return o.c[i] === null ? '' : o.c[i]; }))
      .concat([o.s === null ? (o.sm ? 'חסר ציון' : '') : o.s, o.fb, o.dn ? 'כן' : 'לא']);
  }));
  downloadCsv('תצפיות_' + D.today + '.csv', out);
};

/* ---------- תצפית בודדת ---------- */
function loadDetail(r) {
  var o = X.byRow[r];
  if (!o || DETAIL[r] || DETAIL['_' + r]) return;
  DETAIL['_' + r] = true;
  call('apiObservation', Number(r), fpOf(o)).then(function (full) {
    delete DETAIL['_' + r];
    DETAIL[r] = full.x;
    if (ST.view === 'obs' && String(ST.p.r) === String(r)) render();
  }).catch(function (e) {
    delete DETAIL['_' + r];
    DETAIL[r] = { err: cleanErr(e), details: [] };
    if (ST.view === 'obs' && String(ST.p.r) === String(r)) render();
  });
}
VIEWS.obs = function () {
  var o = X.byRow[ST.p.r], cfg = D.cfg;
  if (!o) return '<button type="button" class="back no-print" data-act="go" data-v="list">' + ic('back') + 'לכל התצפיות</button>' +
    '<div class="sheet"><div class="empty"><b>התצפית לא נמצאה</b>ייתכן שנמחקה, או שאינה בתחום ההרשאה שלך.</div></div>';
  var x = DETAIL[o.r];
  if (!x) loadDetail(o.r);

  var h = '<button type="button" class="back no-print" data-act="go" data-v="list">' + ic('back') + 'לכל התצפיות</button>';
  h += '<div class="print-only" style="font-size:12px;margin-bottom:6px">ניטור תצפיות · משוב תצפית · הופק ' + fmtD(D.today) + '</div>';
  h += '<div class="ph"><div><button type="button" class="name" style="border:0;background:none;padding:0;text-align:start" data-act="go" data-v="card" data-n="' + esc(o.m) + '">' + esc(o.m || '(בלי שם)') + '</button>' +
    '<div class="sub" style="margin-top:4px">' + fmtD(o.d) + (o.d ? ' · ' + ago(o.d) : '') + (o.sc ? ' · ' + esc(o.sc) : '') + (o.ra ? ', ' + esc(o.ra) : '') + '</div></div><span class="sp"></span>' +
    '<div class="row-btns no-print">' +
    (o.e ? '<button type="button" class="btn pri" data-act="editObs" data-r="' + o.r + '">' + ic('edit') + (o.dn ? 'עריכה' : 'המשך מילוי') + '</button>' : '') +
    (o.doc ? '<a class="btn" href="' + esc(o.doc) + '" target="_blank" rel="noopener">' + ic('doc') + 'דוח משוב</a>' : '') +
    '<button type="button" class="btn" data-act="print">' + ic('print') + 'הדפסה</button>' +
    (D.user.isAdmin ? '<button type="button" class="btn danger" data-act="delObs" data-r="' + o.r + '">' + ic('trash') + 'מחיקה</button>' : '') +
    '</div></div>';

  if (!o.dn) {
    h += '<div class="callout warn no-print"><div class="x"><b>התצפית לא הסתיימה</b><br>דוח המשוב יופק רק אחרי שהיא תסומן כהסתיימה.' +
      (o.e ? '<div class="row-btns"><button type="button" class="btn sm" data-act="editObs" data-r="' + o.r + '">המשך מילוי</button></div>' : '') + '</div></div>';
  } else if (o.fb !== 'כן') {
    var late = o.age !== undefined && o.age > cfg.feedbackDays;
    var can = o.e || (D.user.canWrite && !D.user.seesAll);
    h += '<div class="callout ' + (late ? (o.age > 21 ? 'bad' : 'warn') : '') + ' no-print"><div class="x"><b>' + (late ? 'המשוב לא הועבר כבר ' + o.age + ' ימים' : 'המשוב עוד לא סומן כהועבר') + '</b>' +
      (o.fb ? '<br>מצב נוכחי: ' + esc(o.fb) : '') +
      (can ? '<div class="row-btns"><button type="button" class="btn sm pri" data-act="fbSet" data-r="' + o.r + '" data-val="כן">' + ic('check') + 'המשוב הועבר</button>' +
        (o.fb !== 'בהמשך' ? '<button type="button" class="btn sm" data-act="fbSet" data-r="' + o.r + '" data-val="בהמשך">יועבר בהמשך</button>' : '') + '</div>' : '') + '</div></div>';
  }

  var scoreBox = '<div class="sheet"><div class="hd"><h2>ציון</h2><span class="sp"></span>' + scHtml(o.s, { big: 1, miss: o.sm }) + '</div><div class="bd">';
  cfg.criteria.forEach(function (c, i) {
    var v = o.c[i], tx = x && x.details ? x.details[i] : '';
    scoreBox += '<div class="crit-row"><div class="top"><b>' + esc(c.label) + '</b>' + dots(v) + '<span class="val num">' + (typeof v === 'number' ? v : '') + '</span></div>' +
      (tx && tx !== '-' ? '<div class="tx">' + esc(tx) + '</div>' : '') + '</div>';
  });
  scoreBox += '</div></div>';

  var kv = [['רשות', o.ra], ['בית ספר', o.sc], ['כיתה', o.k], ['שיפט', o.sh], ['שיעור', o.le],
    ['מתצפת', o.ob + (o.ro ? ' (' + o.ro + ')' : '')], ['מנה"ד', o.mn], ['מפקדת', o.mf], ['פלוגה', o.pl], ['מחוז', o.mz], ['מחזור', o.mc],
    ['מתגברת', o.bo && o.bo !== cfg.noBoost ? o.bo + (o.bf ? ' — ' + o.bf : '') : 'אין']];
  if (D.user.isAdmin && o.by) kv.push(['הוזן באתר על ידי', o.by]);
  if (D.user.isAdmin) kv.push(['שורה בגיליון', o.r]);
  var meta = '<div class="sheet"><div class="hd"><h2>פרטי השיעור</h2></div><div class="bd"><dl class="kv">' +
    kv.filter(function (p) { return p[1]; }).map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl></div></div>';

  var texts = '<div class="sheet"><div class="hd"><h2>משוב מילולי</h2></div><div class="bd">';
  if (!x) texts += '<div class="spin">טוען…</div>';
  else if (x.err) texts += '<div class="empty">' + esc(x.err) + '</div>';
  else {
    var parts = [['נקודות לשימור', x.keep], ['נקודות לשיפור', x.improve], ['התייחסות אישית', x.personal], ['הערות על המתגברת', x.boostNote]]
      .filter(function (p) { return p[1] && p[1] !== '-'; });
    texts += parts.length ? parts.map(function (p) { return '<div class="txt-b"><h3>' + esc(p[0]) + '</h3><div class="txt">' + esc(p[1]) + '</div></div>'; }).join('')
      : '<div class="muted">לא נכתב משוב מילולי.</div>';
  }
  texts += '</div></div>';

  h += '<div class="cols c21"><div>' + scoreBox + texts + '</div><div>' + meta + '</div></div>';
  return h;
};
ACT.print = function () { try { window.print(); } catch (e) { toast('ההדפסה לא נתמכת בדפדפן הזה.', 'err'); } };
ACT.fbSet = function (el) {
  var o = X.byRow[el.dataset.r]; if (!o) return;
  el.disabled = true;
  call('apiSetFeedback', o.r, fpOf(o), el.dataset.val).then(function (res) {
    o.fb = res.fb; recompute(); render(); toast('עודכן: ' + res.fb);
  }).catch(function (e) { el.disabled = false; fail(e); });
};
ACT.delObs = function (el) {
  var o = X.byRow[el.dataset.r]; if (!o) return;
  confirmBox({ title: 'מחיקת תצפית', text: 'למחוק את התצפית על ' + o.m + ' מתאריך ' + fmtD(o.d) + '?\nאי אפשר לשחזר אותה אחרי המחיקה.', ok: 'מחק תצפית', danger: true })
    .then(function (yes) {
      if (!yes) return;
      call('apiDelete', o.r, fpOf(o)).then(function () {
        D.obs = D.obs.filter(function (x) { return x.r !== o.r; });
        delete DETAIL[o.r];
        recompute(); go('list'); toast('התצפית נמחקה');
      }).catch(fail);
    });
};
