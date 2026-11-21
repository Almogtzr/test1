/* ==========================================================================
   טופס התצפית
   ========================================================================== */
var FORM = null;
var DRAFT_KEY = 'obs_draft_v2';

function formBlank() {
  var n = D.cfg.criteria.length, sc = [], de = [];
  for (var i = 0; i < n; i++) { sc.push(null); de.push(''); }
  return { mashakit: '', rashut: '', school: '', klass: '', shift: '', lesson: '', boost: '', boostFn: '', boostNote: '',
    role: '', observer: '', date: D.today, scores: sc, details: de, keep: '', improve: '', personal: '', feedback: '' };
}
function guessRole() {
  var saved = lsGet('my_role'), roles = D.lists.roles || [];
  if (saved && roles.indexOf(saved) !== -1) return saved;
  var mine = X.valid.filter(isMine)[0];
  if (mine && mine.ro) return mine.ro;
  var want = { 'מנה"ד': 'מנהד אזורי', 'מפקדת': 'מפקדת', 'מנה"ד מחוזי': 'מנה"ד מחוזי' }[D.user.role];
  return (want && roles.indexOf(want) !== -1) ? want : '';
}
function guessName() {
  if (D.user.name) return D.user.name;
  var saved = lsGet('my_name'); if (saved) return saved;
  var mine = D.obs.filter(function (o) { return o.by === D.user.email && o.ob; })[0];
  return mine ? mine.ob : '';
}
function formInit() {
  var key = ST.p.r ? 'r' + ST.p.r : 'new' + (ST.p.n || '');
  if (FORM && FORM.key === key) return;
  FORM = { key: key, row: null, fp: null, f: formBlank(), open: {}, miss: {}, dirty: false, loading: false, wasDone: false, saving: false };
  if (ST.p.r) {
    var o = X.byRow[ST.p.r];
    if (!o) { FORM.gone = true; return; }
    FORM.row = o.r; FORM.fp = fpOf(o); FORM.wasDone = o.dn;
    var f = FORM.f;
    f.mashakit = o.m; f.rashut = o.ra; f.school = o.sc; f.klass = o.k; f.shift = o.sh; f.lesson = o.le;
    f.boost = o.bo; f.boostFn = o.bf; f.role = o.ro; f.observer = o.ob; f.date = o.d || D.today; f.feedback = o.fb;
    f.scores = o.c.slice();
    var fillTexts = function (x) {
      f.details = (x.details || []).map(function (t) { return t === '-' ? '' : t; });
      f.keep = x.keep || ''; f.improve = x.improve || '';
      f.personal = x.personal === '-' ? '' : (x.personal || ''); f.boostNote = x.boostNote || '';
      f.details.forEach(function (t, i) { if (t) FORM.open[i] = true; });
    };
    if (DETAIL[o.r] && !DETAIL[o.r].err) fillTexts(DETAIL[o.r]);
    else {
      FORM.loading = true;
      call('apiObservation', o.r, FORM.fp).then(function (full) {
        DETAIL[o.r] = full.x;
        if (FORM && FORM.key === key) { fillTexts(full.x); FORM.loading = false; if (ST.view === 'form') render(); }
      }).catch(function (e) { if (FORM && FORM.key === key) { FORM.loading = false; FORM.loadErr = cleanErr(e); if (ST.view === 'form') render(); } });
    }
  } else {
    FORM.f.role = guessRole();
    FORM.f.observer = guessName();
    if (ST.p.n) formSetMash(ST.p.n, true);
    var d = lsGet(DRAFT_KEY);
    if (d && d.f && !ST.p.n && (d.f.mashakit || d.f.keep || d.f.improve)) FORM.offer = d;
  }
}
function formSetMash(name, quiet) {
  var f = FORM.f;
  f.mashakit = name;
  var res = resolveLocal(name, '');
  if (res.rashuyot.length === 1) { if (f.rashut !== res.rashuyot[0]) { f.rashut = res.rashuyot[0]; f.school = ''; } }
  else if (res.rashuyot.length > 1 && res.rashuyot.indexOf(f.rashut) === -1) { f.rashut = ''; f.school = ''; }
  if (!quiet) formTouch();
}
var _draftT = null;
function formTouch() {
  if (!FORM) return;
  FORM.dirty = true;
  clearTimeout(_draftT);
  _draftT = setTimeout(function () {
    if (FORM && FORM.dirty) lsSet(DRAFT_KEY, { f: FORM.f, row: FORM.row, fp: FORM.fp, t: Date.now() });
  }, 500);
}
function formLeave() {
  if (FORM && FORM.dirty && !FORM.saved) {
    lsSet(DRAFT_KEY, { f: FORM.f, row: FORM.row, fp: FORM.fp, t: Date.now() });
    toast('מה שמילאת נשמר במכשיר הזה. אפשר להמשיך אחר כך.');
  }
  FORM = null;
}
function calcScore(sc) {
  var sum = 0, cr = D.cfg.criteria;
  if (sc.indexOf('-') !== -1) return { miss: true, v: null, n: sc.filter(function (x) { return x !== null; }).length };
  var n = 0;
  for (var i = 0; i < cr.length; i++) { if (typeof sc[i] === 'number') { sum += sc[i] / 5 * cr[i].weight; n++; } }
  return { v: n === cr.length ? Math.round(sum * 100) : null, n: n, miss: false };
}
function pickBtn(act, val, placeholder, cls) {
  return '<button type="button" class="in' + (cls || '') + '" data-act="' + act + '"><span class="v' + (val ? '' : ' ph-t') + '">' + esc(val || placeholder) + '</span>' + ic('down') + '</button>';
}
function scoreBar() {
  var s = calcScore(FORM.f.scores), n = D.cfg.criteria.length;
  if (s.miss) return '<b>חסר ציון</b><span>קריטריון שסומן "לא נצפה" מבטל את הציון המשוקלל</span>';
  if (s.v === null) return '<b>—</b><span>מולאו ' + s.n + ' מתוך ' + n + ' קריטריונים</span>';
  return '<b style="color:' + (s.v < D.cfg.low ? 'var(--red)' : 'inherit') + '">' + s.v + '</b><span>ציון משוקלל' + (s.v < D.cfg.low ? ' · מתחת לסף ' + D.cfg.low : '') + '</span>';
}

VIEWS.form = function () {
  formInit();
  if (!D.user.canWrite) return '<div class="sheet"><div class="empty"><b>אין הרשאת הזנה</b>התפקיד שלך מאפשר צפייה בלבד.</div></div>';
  if (FORM.gone) return '<div class="sheet"><div class="empty"><b>התצפית לא נמצאה</b><button type="button" class="btn" data-act="go" data-v="list">לכל התצפיות</button></div></div>';
  var f = FORM.f, cfg = D.cfg, L = D.lists, edit = !!FORM.row, M = FORM.miss;
  var h = '<div class="form">';
  h += '<button type="button" class="back" data-act="go" data-v="' + (edit ? 'obs' : 'home') + '"' + (edit ? ' data-r="' + FORM.row + '"' : '') + '>' + ic('back') + (edit ? 'חזרה לתצפית' : 'חזרה') + '</button>';
  h += ph(edit ? 'עריכת תצפית' : 'תצפית חדשה', edit ? esc(f.mashakit) + ' · ' + fmtD(f.date) : '');

  if (FORM.offer) {
    var d = FORM.offer;
    h += '<div class="callout"><div class="x"><b>יש טיוטה שלא נשמרה</b><br>' + esc(d.f.mashakit || 'בלי שם') + ' · נכתבה ' + esc(new Date(d.t).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) +
      '<div class="row-btns"><button type="button" class="btn sm pri" data-act="draftUse">המשך ממנה</button><button type="button" class="btn sm" data-act="draftDrop">מחק אותה</button></div></div></div>';
  }
  if (FORM.loading) h += '<div class="callout"><div class="x">טוען את המשוב המילולי של התצפית…</div></div>';
  if (FORM.loadErr) h += '<div class="callout bad"><div class="x"><b>המשוב המילולי לא נטען</b><br>' + esc(FORM.loadErr) + '<br>אם תשמור עכשיו, הטקסטים הקיימים יוחלפו בריקים.</div></div>';

  /* 1 — מי נצפתה */
  var res = resolveLocal(f.mashakit, f.rashut);
  h += '<div class="sheet"><span class="step" aria-hidden="true">1</span><div class="hd"><h2>מי נצפתה</h2></div><div class="bd">';
  h += '<div class="fld"><span class="lb">מש"קית</span>' + pickBtn('pkMash', f.mashakit, 'בחר מש"קית', M.mashakit ? ' err' : '') + '</div>';
  h += '<div class="g2"><div class="fld"><span class="lb">רשות</span>' + pickBtn('pkRashut', f.rashut, res.rashuyot.length > 1 ? 'היא משובצת בכמה רשויות — בחר' : 'בחר רשות', M.rashut ? ' err' : '') + '</div>' +
    '<div class="fld"><span class="lb">בית ספר</span>' + pickBtn('pkSchool', f.school, f.rashut ? 'בחר בית ספר' : 'בחר רשות קודם', M.school ? ' err' : '') + '</div></div>';
  if (f.mashakit) {
    if (!res.known) {
      h += '<div class="auto warn"><div class="h">לא נמצאה בקובץ השיוך</div>השם "' + esc(f.mashakit) + '" אינו מופיע בטבלת המש"קיות, ולכן המפקדת, המנה"ד והמחזור לא יושלמו. אפשר לשמור בכל זאת; מנהל המערכת יראה את זה בבקרת הנתונים.</div>';
    } else {
      var auto = [['מנה"ד', res.manhad], ['מפקדת', res.mefakedet], ['מחזור', res.machzor], ['פלוגה', res.plugah], ['מחוז', res.mahoz]].filter(function (p) { return p[1]; });
      if (auto.length) h += '<div class="auto"><div class="h">הושלם אוטומטית מקובץ השיוך</div><div class="g">' +
        auto.map(function (p) { return '<div><span>' + esc(p[0]) + ': </span><b>' + esc(p[1]) + '</b></div>'; }).join('') + '</div></div>';
    }
  }
  h += '</div></div>';

  /* 2 — השיעור */
  var hasBoost = f.boost && f.boost !== cfg.noBoost;
  h += '<div class="sheet"><span class="step" aria-hidden="true">2</span><div class="hd"><h2>השיעור</h2></div><div class="bd"><div class="g2">';
  h += '<div class="fld"><label for="fDate">תאריך</label><input id="fDate" class="in' + (M.date ? ' err' : '') + '" type="date" data-f="date" value="' + esc(f.date) + '" max="' + esc(D.today) + '"></div>';
  h += '<div class="fld"><label for="fKlass">כיתה</label><input id="fKlass" class="in' + (M.klass ? ' err' : '') + '" data-f="klass" value="' + esc(f.klass) + '" placeholder="לדוגמה ז\'2" autocomplete="off"></div>';
  h += '<div class="fld"><label for="fShift">שיפט</label><select id="fShift" class="in' + (M.shift ? ' err' : '') + '" data-ch="fShift"><option value="">בחר שיפט</option>' +
    uniq((L.shifts || []).concat(f.shift ? [f.shift] : [])).map(function (s) { return '<option' + (s === f.shift ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>';
  h += '<div class="fld"><span class="lb">שיעור</span>' + pickBtn('pkLesson', f.lesson, f.shift ? 'בחר שיעור' : 'בחר שיפט קודם', M.lesson ? ' err' : '') + '</div>';
  h += '</div><div class="fld"><span class="lb">מש"קית מתגברת <span class="opt">אם הייתה בשיעור</span></span>' + pickBtn('pkBoost', f.boost === cfg.noBoost ? 'אין מתגברת' : f.boost, 'אין מתגברת') + '</div>';
  if (hasBoost) {
    h += '<div class="fld"><span class="lb">תפקוד המתגברת</span><div class="seg" role="group">' +
      cfg.boostFn.filter(function (x) { return x !== cfg.noBoostFn; }).map(function (x) { return '<button type="button" class="' + (f.boostFn === x ? 'on' : '') + '" data-act="fSeg" data-k="boostFn" data-val="' + esc(x) + '" aria-pressed="' + (f.boostFn === x) + '">' + esc(x) + '</button>'; }).join('') + '</div></div>' +
      '<div class="fld"><label for="fBn">הערות על המתגברת <span class="opt">רשות</span></label><textarea id="fBn" class="in" data-f="boostNote">' + esc(f.boostNote) + '</textarea></div>';
  }
  h += '</div></div>';

  /* 3 — המתצפת */
  h += '<div class="sheet"><span class="step" aria-hidden="true">3</span><div class="hd"><h2>מי צפה</h2></div><div class="bd"><div class="g2">';
  h += '<div class="fld"><label for="fRole">התפקיד שלך</label><select id="fRole" class="in' + (M.role ? ' err' : '') + '" data-ch="fRole"><option value="">בחר תפקיד</option>' +
    uniq((L.roles || []).concat(f.role ? [f.role] : [])).map(function (s) { return '<option' + (s === f.role ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>';
  h += '<div class="fld"><span class="lb">השם שלך</span>' + pickBtn('pkObserver', f.observer, 'בחר שם', M.observer ? ' err' : '') + '</div>';
  h += '</div></div></div>';

  /* 4 — ציונים */
  h += '<div class="sheet"><span class="step" aria-hidden="true">4</span><div class="hd"><h2>ציונים</h2><span class="note">1 הנמוך, 5 הגבוה</span></div><div class="bd">';
  cfg.criteria.forEach(function (c, i) {
    var v = f.scores[i], open = FORM.open[i] || f.details[i];
    var t = c.title || c.label, par = t.indexOf('('), main = par > 0 ? t.slice(0, par).trim() : t, sub = par > 0 ? t.slice(par).replace(/^\(|\)$/g, '').trim() : '';
    h += '<div class="rub' + (M.scores && v === null ? ' miss' : '') + '" data-rub="' + i + '"><div class="q">' + esc(main) + '</div>' +
      '<div class="w">' + (sub ? esc(sub) + ' · ' : '') + 'משקל ' + Math.round(c.weight * 100) + '%</div>' +
      '<div class="rate" role="group" aria-label="' + esc(c.label) + '">';
    for (var k = 1; k <= 5; k++) h += '<button type="button" class="' + (v === k ? 'on r' + k : '') + '" data-act="fRate" data-i="' + i + '" data-val="' + k + '" aria-pressed="' + (v === k) + '">' + k + '</button>';
    h += '<button type="button" class="na' + (v === '-' ? ' on' : '') + '" data-act="fRate" data-i="' + i + '" data-val="-" aria-pressed="' + (v === '-') + '">לא נצפה</button></div>';
    h += open ? '<textarea class="in" data-d="' + i + '" placeholder="מה ראית? דוגמה מהשיעור" aria-label="פירוט: ' + esc(c.label) + '">' + esc(f.details[i]) + '</textarea>'
      : '<div class="more-d"><button type="button" data-act="fOpen" data-i="' + i + '">הוסף פירוט</button></div>';
    h += '</div>';
  });
  h += '</div></div>';

  /* 5 — סיכום */
  h += '<div class="sheet"><span class="step" aria-hidden="true">5</span><div class="hd"><h2>סיכום ומשוב</h2></div><div class="bd">';
  h += '<div class="fld"><label for="fKeep">נקודות לשימור</label><textarea id="fKeep" class="in' + (M.keep ? ' err' : '') + '" data-f="keep" placeholder="מה עבד טוב ושווה שתמשיך לעשות">' + esc(f.keep) + '</textarea></div>';
  h += '<div class="fld"><label for="fImp">נקודות לשיפור</label><textarea id="fImp" class="in' + (M.improve ? ' err' : '') + '" data-f="improve" placeholder="מה כדאי לעשות אחרת בשיעור הבא">' + esc(f.improve) + '</textarea></div>';
  h += '<div class="fld"><label for="fPers">התייחסות אישית <span class="opt">רשות</span></label><textarea id="fPers" class="in" data-f="personal">' + esc(f.personal) + '</textarea></div>';
  h += '<div class="fld"><span class="lb">המשוב הועבר למש"קית?</span><div class="seg" role="group">' +
    cfg.feedback.map(function (x) { return '<button type="button" class="' + (f.feedback === x ? 'on' : '') + '" data-act="fSeg" data-k="feedback" data-val="' + esc(x) + '" aria-pressed="' + (f.feedback === x) + '">' + esc(x) + '</button>'; }).join('') + '</div></div>';
  h += '</div></div>';

  h += '<div class="savebar"><div class="s" id="fScore">' + scoreBar() + '</div>' +
    (FORM.wasDone
      ? '<button type="button" class="btn pri" data-act="fSave" data-fin="1"' + (FORM.saving ? ' disabled' : '') + '>שמור שינויים</button>'
      : '<button type="button" class="btn" data-act="fSave" data-fin="0"' + (FORM.saving ? ' disabled' : '') + '>שמור טיוטה</button>' +
        '<button type="button" class="btn pri" data-act="fSave" data-fin="1"' + (FORM.saving ? ' disabled' : '') + '>סיים תצפית</button>') +
    '</div></div>';
  return h;
};

/* שדות טקסט: מעדכנים את המצב בלי לצייר מחדש, כדי לא לאבד מיקוד */
document.addEventListener('input', function (ev) {
  var el = ev.target;
  if (!FORM || ST.view !== 'form' || !el.dataset) return;
  if (el.dataset.f) { FORM.f[el.dataset.f] = el.value; if (FORM.miss[el.dataset.f] && el.value.trim()) { delete FORM.miss[el.dataset.f]; el.classList.remove('err'); } formTouch(); }
  else if (el.dataset.d !== undefined) { FORM.f.details[+el.dataset.d] = el.value; formTouch(); }
});
CH.fShift = function (el) {
  var f = FORM.f;
  if (f.shift !== el.value) { f.shift = el.value; f.lesson = ''; }
  delete FORM.miss.shift; formTouch(); render();
};
CH.fRole = function (el) {
  var f = FORM.f, list = (D.lists.observers || {})[el.value] || [];
  f.role = el.value;
  if (f.observer && list.length && list.indexOf(f.observer) === -1 && !same(f.observer, D.user.name)) f.observer = '';
  delete FORM.miss.role; formTouch(); render();
};
ACT.fSeg = function (el) {
  var k = el.dataset.k, v = el.dataset.val;
  FORM.f[k] = FORM.f[k] === v ? '' : v;
  formTouch();
  $$('button', el.parentNode).forEach(function (b) { var on = FORM.f[k] === b.dataset.val; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
};
ACT.fRate = function (el) {
  var i = +el.dataset.i, raw = el.dataset.val, v = raw === '-' ? '-' : +raw;
  FORM.f.scores[i] = FORM.f.scores[i] === v ? null : v;
  formTouch();
  var box = el.closest('.rub'), cur = FORM.f.scores[i];
  $$('.rate button', box).forEach(function (b) {
    var bv = b.dataset.val === '-' ? '-' : +b.dataset.val, on = cur === bv;
    b.className = (b.dataset.val === '-' ? 'na' : '') + (on ? ' on' + (bv === '-' ? '' : ' r' + bv) : '');
    b.setAttribute('aria-pressed', on);
  });
  if (cur !== null) box.classList.remove('miss');
  $('#fScore').innerHTML = scoreBar();
};
ACT.fOpen = function (el) {
  var i = +el.dataset.i; FORM.open[i] = true; render();
  var t = $('[data-d="' + i + '"]'); if (t) t.focus();
};
ACT.draftUse = function () {
  var d = FORM.offer; if (!d) return;
  var blank = formBlank();
  Object.keys(blank).forEach(function (k) { if (d.f[k] !== undefined) blank[k] = d.f[k]; });
  if (d.row && X.byRow[d.row] && fpOf(X.byRow[d.row]) === d.fp) { FORM.row = d.row; FORM.fp = d.fp; FORM.wasDone = X.byRow[d.row].dn; FORM.key = 'r' + d.row; ST.p = { r: d.row }; }
  FORM.f = blank; FORM.offer = null; FORM.dirty = true;
  blank.details.forEach(function (t, i) { if (t) FORM.open[i] = true; });
  render();
};
ACT.draftDrop = function () { lsDel(DRAFT_KEY); FORM.offer = null; render(); };

ACT.pkMash = function () {
  var items = [], scoped = X.scoped && X.universe.length;
  if (scoped) X.universe.forEach(function (n) { items.push({ v: n, t: n, s: X.people[n].ra.join(' / '), g: 'באחריותך' }); });
  heSort(Object.keys(X.people)).forEach(function (n) {
    if (scoped && X.inUni[n]) return;
    items.push({ v: n, t: n, s: X.people[n].ra.join(' / '), g: scoped ? 'שאר המש"קיות' : '' });
  });
  pick({ title: 'בחירת מש"קית', ph: 'הקלד שם או רשות', items: items, cur: FORM.f.mashakit, custom: true, customLabel: 'מש"קית שאינה ברשימה:' })
    .then(function (v) { if (v === null) return; formSetMash(v); delete FORM.miss.mashakit; render(); });
};
ACT.pkRashut = function () {
  var p = X.people[FORM.f.mashakit], hers = p ? p.ra : [], items = [];
  hers.forEach(function (r) { items.push({ v: r, t: r, g: 'הרשויות שלה' }); });
  (D.rashuyot || []).forEach(function (r) { if (hers.indexOf(r) === -1) items.push({ v: r, t: r, g: hers.length ? 'רשויות אחרות' : '' }); });
  pick({ title: 'בחירת רשות', items: items, cur: FORM.f.rashut, custom: true, customLabel: 'רשות שאינה ברשימה:' }).then(function (v) {
    if (v === null) return;
    if (FORM.f.rashut !== v) { FORM.f.rashut = v; FORM.f.school = ''; }
    delete FORM.miss.rashut; formTouch(); render();
  });
};
ACT.pkSchool = function () {
  if (!FORM.f.rashut) { toast('בחר רשות קודם — רשימת בתי הספר תלויה בה.'); return; }
  var list = (D.schools || {})[FORM.f.rashut] || [];
  pick({ title: 'בית ספר ב' + FORM.f.rashut, items: list.map(function (s) { return { v: s, t: s }; }), cur: FORM.f.school, custom: true, customLabel: 'בית ספר שאינו ברשימה:' })
    .then(function (v) { if (v === null) return; FORM.f.school = v; delete FORM.miss.school; formTouch(); render(); });
};
ACT.pkLesson = function () {
  if (!FORM.f.shift) { toast('בחר שיפט קודם — רשימת השיעורים תלויה בו.'); return; }
  var list = (D.lists.lessons || {})[FORM.f.shift] || [];
  pick({ title: 'שיעור ב-' + FORM.f.shift, items: list.map(function (s) { return { v: s, t: s }; }), cur: FORM.f.lesson, custom: true, customLabel: 'שיעור שאינו ברשימה:' })
    .then(function (v) { if (v === null) return; FORM.f.lesson = v; delete FORM.miss.lesson; formTouch(); render(); });
};
ACT.pkBoost = function () {
  var cfg = D.cfg, items = [{ v: cfg.noBoost, t: 'אין מתגברת' }];
  heSort(Object.keys(X.people)).forEach(function (n) { if (n !== FORM.f.mashakit) items.push({ v: n, t: n, s: X.people[n].ra.join(' / ') }); });
  pick({ title: 'מש"קית מתגברת', items: items, cur: FORM.f.boost, custom: true, customLabel: 'שם שאינו ברשימה:' }).then(function (v) {
    if (v === null) return;
    FORM.f.boost = v;
    if (v === cfg.noBoost) { FORM.f.boostFn = cfg.noBoostFn; FORM.f.boostNote = ''; }
    else if (FORM.f.boostFn === cfg.noBoostFn) FORM.f.boostFn = '';
    formTouch(); render();
  });
};
ACT.pkObserver = function () {
  var by = D.lists.observers || {}, list = by[FORM.f.role] || [], items = [];
  if (D.user.name) items.push({ v: D.user.name, t: D.user.name, s: 'את/ה', g: list.length ? 'אני' : '' });
  list.forEach(function (n) { if (!same(n, D.user.name)) items.push({ v: n, t: n, g: FORM.f.role }); });
  if (!list.length) {
    var all = [];
    Object.keys(by).forEach(function (k) { all = all.concat(by[k]); });
    heSort(uniq(all)).forEach(function (n) { if (!same(n, D.user.name)) items.push({ v: n, t: n }); });
  }
  pick({ title: 'שם המתצפת', items: items, cur: FORM.f.observer, custom: true, customLabel: 'שם שאינו ברשימה:' })
    .then(function (v) { if (v === null) return; FORM.f.observer = v; delete FORM.miss.observer; formTouch(); render(); });
};

ACT.fSave = function (el) {
  if (FORM.saving || FORM.loading) return;
  var finish = el.dataset.fin === '1', f = FORM.f, miss = {};
  if (!f.mashakit) miss.mashakit = 1;
  if (!f.date) miss.date = 1;
  if (finish) {
    (D.cfg.finishRequired || []).forEach(function (k) {
      if (k === 'scores') { if (f.scores.indexOf(null) !== -1) miss.scores = 1; }
      else if (!String(f[k] || '').trim()) miss[k] = 1;
    });
  }
  FORM.miss = miss;
  var keys = Object.keys(miss);
  if (keys.length) {
    render();
    var names = keys.map(function (k) { return (D.cfg.labels || {})[k] || k; });
    toast((finish ? 'כדי לסיים חסר: ' : 'חסר: ') + names.join(', '), 'err');
    var firstErr = $('.form .err, .form .rub.miss');
    if (firstErr) firstErr.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  formSend(finish, false);
};
function formSend(finish, force) {
  FORM.saving = true;
  $$('.savebar .btn').forEach(function (b) { b.disabled = true; });
  var payload = { row: FORM.row, fp: FORM.fp, finish: finish, force: force, f: FORM.f };
  call('apiSave', payload).then(function (res) {
    if (res && res.dup) {
      FORM.saving = false; render();
      return confirmBox({ title: 'תצפית זהה כבר קיימת', text: 'כבר נשמרה תצפית על ' + FORM.f.mashakit + ' באותו תאריך, באותו שיעור ועל ידי אותו מתצפת.\nלשמור תצפית נוספת בכל זאת?', ok: 'שמור בכל זאת', cancel: 'פתח את הקיימת' })
        .then(function (yes) { if (yes) formSend(finish, true); else { FORM.saved = true; go('obs', { r: res.dup }); } });
    }
    var o = res.obs;
    DETAIL[o.r] = o.x; delete o.x;
    var at = -1;
    D.obs.forEach(function (x, i) { if (x.r === o.r) at = i; });
    if (at >= 0) D.obs[at] = o; else D.obs.push(o);
    if (FORM.f.observer && !D.user.name) lsSet('my_name', FORM.f.observer);
    if (FORM.f.role) lsSet('my_role', FORM.f.role);
    lsDel(DRAFT_KEY);
    FORM.saved = true;
    recompute();
    go('obs', { r: o.r });
    toast(o.dn ? (res.isNew || !payload.row ? 'התצפית נשמרה והסתיימה' : 'השינויים נשמרו') : 'הטיוטה נשמרה');
  }).catch(function (e) {
    FORM.saving = false;
    $$('.savebar .btn').forEach(function (b) { b.disabled = false; });
    fail(e);
  });
}
