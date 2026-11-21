/* ==========================================================================
   מסך הטיפול: התראות, המלצות, סיכון, בקרת נתונים, יומן שינויים
   ========================================================================== */
VIEWS.care = function () {
  var crit = X.alerts.filter(function (a) { return a.sev === 1; }).length, q = quality();
  var T = [['alerts', 'התראות', crit || ''], ['reco', 'את מי לצפות'], ['risk', 'בסיכון'], ['quality', 'בקרת נתונים', q.total || '']];
  if (D.user.isAdmin) T.push(['log', 'יומן שינויים']);
  if (!T.some(function (t) { return t[0] === ST.tab.care; })) ST.tab.care = 'alerts';
  return ph('טיפול', 'מה דורש פעולה עכשיו, לפי סדר דחיפות.') + tabs('care', T) + CARE[ST.tab.care]();
};
var CARE = {};

CARE.alerts = function () {
  var rows = X.alerts;
  if (!rows.length) return '<div class="sheet"><div class="empty"><b>אין התראות פתוחות</b>אין ציונים נמוכים ברצף, וכל המשובים הועברו בזמן.</div></div>';
  var note = '<p class="sub" style="max-width:75ch">קריטי = ציון מתחת ל-' + D.cfg.low + ' בשתי תצפיות רצופות, או משוב שלא הועבר יותר משלושה שבועות. לטיפול = משוב שלא הועבר יותר מ-' + D.cfg.feedbackDays + ' ימים.</p>';
  if (!isWide()) return '<div class="sheet"><div class="list">' + rows.map(alertLi).join('') + '</div></div>' + note;
  return '<div class="sheet">' + table('alerts', [
    { k: 'sev', t: 'דחיפות', f: function (a) { return '<span class="chip ' + (a.sev === 1 ? 'red' : 'orange') + '">' + (a.sev === 1 ? 'קריטי' : 'לטיפול') + '</span>'; } },
    { k: 'title', t: 'מה קרה' },
    { k: 'm', t: 'מש"קית', f: function (a) { return '<b>' + esc(a.m) + '</b>'; } },
    { k: 'ra', t: 'רשות', v: function (a) { return a.o.ra; }, f: function (a) { return esc(a.o.ra || '—'); } },
    { k: 'ob', t: 'מתצפת', v: function (a) { return a.o.ob; }, f: function (a) { return esc(a.o.ob || '—'); } },
    { k: 'd', t: 'תאריך התצפית', v: function (a) { return a.o.d; }, f: function (a) { return '<span class="num">' + fmtD(a.o.d) + '</span>'; } },
    { k: 'info', t: 'פרטים', f: function (a) { return a.kind === 'low2' ? esc(a.info) : scHtml(a.o.s); }, v: function (a) { return a.o.s; } },
    { k: 'todo', t: 'מה לעשות', f: function (a) {
      var can = a.kind === 'fb' && (a.o.e || (D.user.canWrite && !D.user.seesAll));
      return can ? '<button type="button" class="btn sm" data-act="fbSet" data-r="' + a.o.r + '" data-val="כן">' + ic('check') + 'המשוב הועבר</button>' : esc(a.todo);
    } }
  ], rows, { row: function (a) { return 'data-act="rowObs" data-r="' + a.o.r + '" tabindex="0"'; } }) + '</div>' + note;
};
/* לחיצה על שורה פותחת את התצפית, אבל לא כשלוחצים על כפתור שבתוכה */
ACT.rowObs = function (el, ev) {
  if (ev.target.closest('button,a')) return;
  go('obs', { r: el.dataset.r });
};

CARE.reco = function () {
  var cfg = D.cfg, F = ST.reco;
  var whoList = heSort(uniq([].concat.apply([], X.reco.map(function (s) { return person(s.n).mn; }))));
  var rows = X.reco.filter(function (s) { return !F.who || person(s.n).mn.indexOf(F.who) !== -1; });
  if (!X.universe.length) return '<div class="sheet"><div class="empty"><b>אין רשימת מש"קיות באחריותך</b>ההמלצות נגזרות מטבלת השיוך. כשיוגדר לך תפקיד עם מש"קיות, הן יופיעו כאן.</div></div>';
  if (!X.reco.length) return '<div class="sheet"><div class="empty"><b>כולן נצפו ועומדות ביעד</b>אין כרגע מש"קית שדורשת תצפית.</div></div>';
  var h = '<div class="bar no-print">' + (whoList.length > 1 ? sel('recoWho', F.who, 'כל המנה"דים', whoList) : '') +
    '<span class="cnt">' + rows.length + ' מש"קיות · יעד: ' + cfg.target + ' תצפיות לכל מש"קית ב' + esc(X.sem) + '</span></div>';
  if (!isWide()) return h + '<div class="sheet"><div class="list">' + rows.map(recoLi).join('') + '</div></div>';
  return h + '<div class="sheet">' + table('reco', [
    { k: 'pri', t: 'עדיפות', v: function (s) { return s.reco.pri; }, f: function (s) { return '<span class="chip ' + s.reco.cls + '">' + s.reco.label + '</span>'; } },
    { k: 'n', t: 'מש"קית', f: function (s) { return '<b>' + esc(s.n) + '</b>'; } },
    { k: 'ra', t: 'רשות', v: function (s) { return person(s.n).ra.join(' '); }, f: function (s) { return esc(person(s.n).ra.join(' / ') || '—'); } },
    { k: 'mn', t: 'מנה"ד', v: function (s) { return person(s.n).mn.join(' '); }, f: function (s) { return esc(person(s.n).mn.join(' / ') || '—'); } },
    { k: 'mf', t: 'מפקדת', v: function (s) { return person(s.n).mf.join(' '); }, f: function (s) { return esc(person(s.n).mf.join(' / ') || '—'); } },
    { k: 'semN', t: 'בסמסטר', n: 1, f: function (s) { return s.semN + ' מתוך ' + cfg.target; } },
    { k: 'lastScore', t: 'ציון אחרון', n: 1, f: function (s) { return scHtml(s.lastScore); } },
    { k: 'age', t: 'נצפתה לאחרונה', f: function (s) { return s.last ? esc(ago(s.last.d)) : '<span class="muted">אף פעם</span>'; } },
    { k: 'why', t: 'למה דווקא היא', c: 'w', v: function (s) { return s.reco.why; }, f: function (s) { return esc(s.reco.why); } }
  ], rows, { row: function (s) { return 'data-act="go" data-v="card" data-n="' + esc(s.n) + '" tabindex="0"'; } }) + '</div>';
};
CH.recoWho = function (el) { ST.reco.who = el.value; render(); };

CARE.risk = function () {
  var all = ST.riskAll, rows = X.risk.filter(function (s) { return all || s.risk.level >= 3; });
  var hidden = X.risk.length - X.risk.filter(function (s) { return s.risk.level >= 3; }).length;
  var h = '<div class="bar no-print">' + seg('riskSet', all ? '1' : '0', [['0', 'קריטי וגבוה'], ['1', 'כולל למעקב (' + hidden + ')']]) + '<span class="cnt">' + rows.length + ' מש"קיות</span></div>';
  if (!rows.length) return h + '<div class="sheet"><div class="empty"><b>אין מש"קיות ברמת סיכון גבוהה</b>' + (hidden ? hidden + ' נמצאות במעקב בלבד.' : '') + '</div></div>';
  if (!isWide()) {
    return h + '<div class="sheet"><div class="list">' + rows.map(function (s) {
      return '<button type="button" class="li" data-act="go" data-v="card" data-n="' + esc(s.n) + '"><span class="t">' + esc(s.n) + '</span><span class="e">' + scHtml(s.lastScore) + '</span>' +
        '<span class="m"><span class="chip ' + s.risk.cls + '">' + esc(s.risk.label) + '</span><span>' + esc(s.risk.reasons[0]) + (s.risk.reasons.length > 1 ? ' ועוד ' + (s.risk.reasons.length - 1) : '') + '</span></span></button>';
    }).join('') + '</div></div>';
  }
  return h + '<div class="sheet">' + table('risk', [
    { k: 'level', t: 'רמה', v: function (s) { return s.risk.level; }, f: function (s) { return '<span class="chip ' + s.risk.cls + '">' + esc(s.risk.label) + '</span>'; } },
    { k: 'n', t: 'מש"קית', f: function (s) { return '<b>' + esc(s.n) + '</b>'; } },
    { k: 'ra', t: 'רשות', v: function (s) { return s.last.ra; }, f: function (s) { return esc(s.last.ra || person(s.n).ra.join(' / ') || '—'); } },
    { k: 'mn', t: 'מנה"ד', v: function (s) { return s.last.mn; }, f: function (s) { return esc(s.last.mn || person(s.n).mn.join(' / ') || '—'); } },
    { k: 'total', t: 'תצפיות', n: 1 },
    { k: 'lastScore', t: 'ציון אחרון', n: 1, f: function (s) { return scHtml(s.lastScore); } },
    { k: 'diff', t: 'שינוי', n: 1, f: function (s) { return sg(s.diff); } },
    { k: 'age', t: 'תצפית אחרונה', f: function (s) { return '<span class="num">' + fmtD(s.last.d) + '</span>'; } },
    { k: 'why', t: 'הסיבות', c: 'w', v: function (s) { return s.risk.reasons.length; }, f: function (s) { return s.risk.reasons.map(esc).join('<br>'); } }
  ], rows, { row: function (s) { return 'data-act="go" data-v="card" data-n="' + esc(s.n) + '" tabindex="0"'; } }) + '</div>';
};
ACT.riskSet = function (el) { ST.riskAll = el.dataset.val === '1'; render(); };

CARE.quality = function () {
  var q = quality(), h = '';
  var block = function (title, note, body) { return '<div class="sheet"><div class="hd"><h2>' + title + '</h2>' + (note ? '<span class="note">' + note + '</span>' : '') + '</div>' + body + '</div>'; };
  if (!q.obs.length && !q.unknown.length && !q.roster.length && !q.dups.length && !q.mismatch.length && !q.pid.length) {
    return '<div class="sheet"><div class="empty"><b>הנתונים תקינים</b>לא נמצאו שדות חסרים, כפילויות או שמות לא מזוהים.</div></div>';
  }
  if (q.unknown.length) h += block('מש"קיות שלא זוהו', 'שמות שמופיעים בתצפיות ואינם בקובץ השיוך', table('qUnknown', [
    { k: 'n', t: 'השם בתצפיות', f: function (r) { return '<b>' + esc(r.n) + '</b>'; } }, { k: 'count', t: 'תצפיות', n: 1 },
    { k: 'hint', t: 'מה כנראה קרה', c: 'w', f: function (r) { return '<span class="chip ' + r.cls + ' plain">' + esc(r.hint) + '</span>'; } }
  ], q.unknown, { row: function (r) { return 'data-act="go" data-v="card" data-n="' + esc(r.n) + '" tabindex="0"'; } }));
  if (q.pid.length) h += block('מספר אישי אחד תחת כמה שמות', 'כנראה שגיאת כתיב באחד מהם', table('qPid', [
    { k: 'pid', t: 'מספר אישי' }, { k: 'names', t: 'השמות', f: function (r) { return esc(r.names.join('  |  ')); }, v: function (r) { return r.names.join(' '); } }
  ], q.pid));
  if (q.roster.length) h += block('חוסרים בקובץ השיוך', 'מתקנים בקובץ "כא גשרים" ואז מסנכרנים', table('qRoster', [
    { k: 'n', t: 'מש"קית', f: function (r) { return '<b>' + esc(r.n) + '</b>'; } },
    { k: 'text', t: 'מה חסר', c: 'w', f: function (r) { return '<span class="chip ' + r.cls + ' plain">' + esc(r.text) + '</span>'; } }
  ], q.roster));
  if (q.dups.length) h += block('תצפיות כפולות', 'אותה מש"קית, תאריך, שיעור ומתצפת', '<div class="list">' + q.dups.map(function (g) {
    return '<div class="li"><span class="t">' + esc(g[0].m) + ' · ' + fmtD(g[0].d) + '</span><span class="e"></span><span class="m">' +
      g.map(function (o) { return '<button type="button" class="btn sm" data-act="go" data-v="obs" data-r="' + o.r + '">שורה ' + o.r + '</button>'; }).join('') + '</span></div>';
  }).join('') + '</div>');
  if (q.obs.length) h += block('תצפיות עם חוסרים', q.obs.length + ' תצפיות', table('qObs', [
    { k: 'sev', t: 'עדיפות', f: function (r) { return '<span class="chip ' + ['', 'red', 'orange', 'plain'][r.sev] + '">' + ['', 'דחוף', 'לטיפול', 'השלמה'][r.sev] + '</span>'; } },
    { k: 'd', t: 'תאריך', v: function (r) { return r.o.d; }, f: function (r) { return '<span class="num">' + fmtD(r.o.d) + '</span>'; } },
    { k: 'm', t: 'מש"קית', v: function (r) { return r.o.m; }, f: function (r) { return '<b>' + esc(r.o.m || '(בלי שם)') + '</b>'; } },
    { k: 'ob', t: 'מתצפת', v: function (r) { return r.o.ob; }, f: function (r) { return esc(r.o.ob || '—'); } },
    { k: 'text', t: 'מה חסר', c: 'w' }
  ], q.obs, { limit: ST.qLimit || 40, moreAct: 'qMore', row: function (r) { return 'data-act="go" data-v="obs" data-r="' + r.o.r + '" tabindex="0"'; } }));
  if (q.mismatch.length) h += block('סתירות מול קובץ השיוך', 'מה שנכתב בתצפית שונה ממה שבשיוך היום. תצפית ישנה משקפת לעתים שיוך קודם — זה תקין.', table('qMis', [
    { k: 'd', t: 'תאריך', v: function (r) { return r.o.d; }, f: function (r) { return '<span class="num">' + fmtD(r.o.d) + '</span>'; } },
    { k: 'm', t: 'מש"קית', v: function (r) { return r.o.m; }, f: function (r) { return '<b>' + esc(r.o.m) + '</b>'; } },
    { k: 'text', t: 'הסתירה', c: 'w' }
  ], q.mismatch, { limit: 30, row: function (r) { return 'data-act="go" data-v="obs" data-r="' + r.o.r + '" tabindex="0"'; } }));
  return h;
};
ACT.qMore = function () { ST.qLimit = (ST.qLimit || 40) + 60; render(); };

CARE.log = function () {
  if (ST.log === null) {
    ST.log = 'loading';
    call('apiLog').then(function (rows) { ST.log = rows; if (ST.view === 'care') render(); })
      .catch(function (e) { ST.log = { err: cleanErr(e) }; if (ST.view === 'care') render(); });
  }
  if (ST.log === 'loading') return '<div class="sheet"><div class="spin">טוען את היומן…</div></div>';
  if (ST.log.err) return '<div class="sheet"><div class="empty"><b>היומן לא נטען</b>' + esc(ST.log.err) + '</div></div>';
  return '<div class="bar no-print"><button type="button" class="btn sm" data-act="logReload">' + ic('refresh') + 'טען מחדש</button><span class="cnt">' + ST.log.length + ' הרשומות האחרונות</span></div>' +
    '<div class="sheet">' + table('log', [
      { k: 't', t: 'מתי', f: function (r) { return '<span class="num">' + esc(r.t) + '</span>'; } },
      { k: 'who', t: 'מי' }, { k: 'row', t: 'שורה', n: 1 }, { k: 'field', t: 'שדה' },
      { k: 'oldV', t: 'ערך קודם', c: 'w' }, { k: 'newV', t: 'ערך חדש', c: 'w' }
    ], ST.log, { empty: 'היומן ריק', row: function (r) { return X.byRow[r.row] ? 'data-act="go" data-v="obs" data-r="' + esc(r.row) + '" tabindex="0"' : ''; } }) + '</div>';
};
ACT.logReload = function () { ST.log = null; render(); };
