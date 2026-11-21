/* ==========================================================================
   חישובים: כל הדוחות נגזרים כאן מרשימת התצפיות, בדפדפן.
   הכללים זהים לאלה של גיליונות הניתוח בקובץ.
   ========================================================================== */
function r1(x) { return Math.round(x * 10) / 10; }
function trimNum(x) { return String(Math.round(x * 100) / 100); }

function semOf(iso) {
  if (!iso) return '';
  var d = toD(iso), S = D.cfg.semesters || [];
  for (var i = 0; i < S.length; i++) {
    var a = new Date(S[i][1][0], S[i][1][1], S[i][1][2]);
    var b = new Date(S[i][2][0], S[i][2][1], S[i][2][2], 23, 59, 59);
    if (d >= a && d <= b) return S[i][0];
  }
  return '';
}
function curSem() {
  var S = D.cfg.semesters || [];
  return semOf(D.today) || (S.length ? S[S.length - 1][0] : '');
}
function schoolWeek(iso) {
  var ss = D.cfg.schoolStart;
  if (!iso || !ss) return 0;
  var start = new Date(ss[0], ss[1], ss[2]), x = toD(iso);
  if (x < start) return 0;
  return Math.floor((x - start) / (7 * 86400000)) + 1;
}
function weekStart(n) {
  var ss = D.cfg.schoolStart, d = new Date(ss[0], ss[1], ss[2]);
  d.setDate(d.getDate() + (n - 1) * 7);
  return isoOf(d);
}

function agg(list) {
  var n6 = D.cfg.criteria.length;
  var a = { n: 0, cnt: 0, sum: 0, low: 0, crit: [], critN: [], seen: {}, last: '', fb: 0 };
  for (var i = 0; i < n6; i++) { a.crit.push(0); a.critN.push(0); }
  list.forEach(function (o) {
    a.n++;
    if (o.m) a.seen[o.m] = 1;
    if (o.s !== null && o.s !== undefined) { a.cnt++; a.sum += o.s; if (o.s < D.cfg.low) a.low++; }
    (o.c || []).forEach(function (v, i) { if (typeof v === 'number') { a.crit[i] += v; a.critN[i]++; } });
    if (o.d && o.d > a.last) a.last = o.d;
    if (o.fb === 'כן') a.fb++;
  });
  a.avg = a.cnt ? a.sum / a.cnt : null;
  a.mash = Object.keys(a.seen).length;
  a.ca = a.crit.map(function (s, i) { return a.critN[i] ? s / a.critN[i] : null; });
  return a;
}

function isMadmach(o) { return (D.cfg.madmach || []).indexOf(o.sh) !== -1; }
function isMine(o) { return (o.by && o.by === D.user.email) || same(o.ob, D.user.name); }

/* ---------- מש"קית אחת ---------- */
function mashStats(name) {
  var cfg = D.cfg, list = X.byMash[name] || [];
  var a = agg(list);
  var st = { n: name, total: list.length, list: list, avg: a.avg, ca: a.ca };
  var last = list.length ? list[list.length - 1] : null;
  st.last = last;
  st.lastScore = last ? last.s : null;
  st.firstScore = list.length ? list[0].s : null;
  st.semN = list.filter(function (o) { return semOf(o.d) === X.sem; }).length;
  st.age = last ? last.age : null;
  st.diff = (list.length >= 2 && st.lastScore !== null && st.firstScore !== null)
    ? r1(st.lastScore - st.firstScore) : null;

  /* סיכון — כמו "מש"קיות שדורשות טיפול" */
  var reasons = [], level = 0;
  if (last) {
    if (st.lastScore !== null && st.lastScore < cfg.low) {
      reasons.push('הציון האחרון ' + f1(st.lastScore) + ', מתחת לסף ' + cfg.low); level += 2;
    }
    if (st.diff !== null && st.diff <= -cfg.riskDrop) {
      reasons.push('ירידה של ' + Math.abs(st.diff) + ' נקודות מהתצפית הראשונה (' + f1(st.firstScore) + ' ← ' + f1(st.lastScore) + ')'); level += 2;
    }
    var weak = [];
    (last.c || []).forEach(function (v, i) { if (typeof v === 'number' && v <= 2) weak.push(cfg.criteria[i].label + ' (' + v + ')'); });
    if (weak.length >= cfg.riskWeak) { reasons.push('חולשה ב-' + weak.length + ' קריטריונים: ' + weak.join(', ')); level += 2; }
    else if (weak.length === 1) { reasons.push('קריטריון חלש בודד: ' + weak[0]); level += 1; }
    if (list.length >= 2) {
      var prev = list[list.length - 2].s;
      if (st.lastScore !== null && prev !== null && st.lastScore < cfg.low && prev < cfg.low) {
        reasons.push('שתי תצפיות רצופות מתחת לסף (' + f1(prev) + ' ואז ' + f1(st.lastScore) + ')'); level += 3;
        st.lowTwice = [prev, st.lastScore];
      }
    }
    if (last.fb !== 'כן' && st.age !== null && st.age > cfg.feedbackDays) {
      reasons.push('לא הועבר משוב כבר ' + st.age + ' ימים מאז התצפית'); level += 1;
    }
    if (st.semN < cfg.target) { reasons.push('בוצעו ' + st.semN + ' מתוך ' + cfg.target + ' תצפיות ב' + X.sem); level += 1; }
    if (st.age !== null && st.age > cfg.staleDays) { reasons.push('עברו ' + st.age + ' ימים מהתצפית האחרונה'); level += 1; }
  }
  st.risk = reasons.length ? {
    level: level, reasons: reasons,
    label: level >= 5 ? 'קריטי' : (level >= 3 ? 'גבוה' : 'למעקב'),
    cls: level >= 5 ? 'red' : (level >= 3 ? 'orange' : 'yellow')
  } : null;

  /* המלצה — כמו "המלצות למנה"ד" */
  var gap = cfg.target - st.semN, pri = 0, why = '';
  if (!last) { pri = 1; why = 'מעולם לא נצפתה — אין עליה שום מידע. זו התצפית שתיתן הכי הרבה ערך.'; }
  else if (gap > 0 && st.lastScore !== null && st.lastScore < cfg.low) {
    pri = 2; why = 'הציון האחרון ' + f1(st.lastScore) + ' מתחת לסף, וחסרות ' + gap + ' תצפיות להשלמת היעד. צריכה ליווי צמוד.';
  } else if (gap > 0) { pri = 3; why = 'חסרות ' + gap + ' תצפיות מתוך ' + cfg.target + ' ב' + X.sem + '.'; }
  else if (st.age !== null && st.age > cfg.staleDays) { pri = 4; why = 'עמדה ביעד, אבל עברו ' + st.age + ' ימים מהתצפית האחרונה. רענון.'; }
  st.reco = pri ? { pri: pri, why: why, gap: Math.max(gap, 0), label: ['דחוף', 'גבוה', 'רגיל', 'רענון'][pri - 1], cls: ['red', 'orange', 'plain', 'blue'][pri - 1] } : null;

  st.status = !last ? 'never' : (st.risk && st.risk.level >= 3 ? 'risk' : (st.semN < cfg.target ? 'below' : 'ok'));
  return st;
}
function person(name) {
  return X.people[name] || { n: name, rows: [], ra: [], mn: [], mf: [], pl: [], mz: [], mc: '', pid: '', x: '', unknown: true };
}
function statusChip(st) {
  if (st.status === 'never') return '<span class="chip yellow">טרם נצפתה</span>';
  if (st.status === 'risk') return '<span class="chip ' + st.risk.cls + '">סיכון ' + esc(st.risk.label) + '</span>';
  if (st.status === 'below') return '<span class="chip plain">מתחת ליעד</span>';
  return '<span class="chip green">תקין</span>';
}

/* ---------- חישוב ראשי ---------- */
function recompute() {
  X = { valid: [], broken: [], byRow: {}, byMash: {}, people: {}, ms: {} };
  D.obs.forEach(function (o) {
    X.byRow[o.r] = o;
    if (o.m && o.d) { o.t = toD(o.d).getTime(); o.age = daysAgo(o.d); X.valid.push(o); }
    else X.broken.push(o);
  });
  X.valid.sort(function (a, b) { return (b.t - a.t) || (b.r - a.r); });
  for (var i = X.valid.length - 1; i >= 0; i--) {
    var o = X.valid[i];
    (X.byMash[o.m] || (X.byMash[o.m] = [])).push(o);
  }
  X.sem = curSem();

  D.roster.forEach(function (r) {
    if (r.sus) return;
    var p = X.people[r.n] || (X.people[r.n] = { n: r.n, rows: [], ra: [], mn: [], mf: [], pl: [], mz: [], mc: '', pid: '', x: '' });
    p.rows.push(r);
    [['ra', r.ra], ['mn', r.mn], ['mf', r.mf], ['pl', r.pl], ['mz', r.mz]].forEach(function (x) {
      if (x[1] && p[x[0]].indexOf(x[1]) === -1) p[x[0]].push(x[1]);
    });
    if (r.mc) p.mc = r.mc;
    if (r.pid) p.pid = r.pid;
    if (r.x) p.x = r.x;
  });

  var names;
  if (D.user.seesAll) names = Object.keys(X.people);
  else if (D.mine && D.mine.length) names = D.mine.filter(function (n) { return X.people[n]; });
  else names = [];
  X.scoped = !D.user.seesAll;
  X.universe = heSort(names);
  X.inUni = {}; X.universe.forEach(function (n) { X.inUni[n] = 1; });

  uniq(X.universe.concat(Object.keys(X.byMash))).forEach(function (n) { X.ms[n] = mashStats(n); });
  X.nat = agg(X.valid);
  X.seenUni = X.universe.filter(function (n) { return X.ms[n].total > 0; }).length;

  X.alerts = buildAlerts();
  X.reco = buildReco();
  X.risk = Object.keys(X.byMash).map(function (n) { return X.ms[n]; })
    .filter(function (s) { return s.risk; })
    .sort(function (a, b) { return (b.risk.level - a.risk.level) || ((a.lastScore === null ? 999 : a.lastScore) - (b.lastScore === null ? 999 : b.lastScore)); });
  // רק טיוטות מהחודש האחרון; תצפיות ישנות שלא סומנו אינן "טיוטה שמחכה"
  X.drafts = D.obs.filter(function (o) { return !o.dn && o.e && isMine(o) && (!o.d || daysAgo(o.d) <= 30); });
  X.quality = null;
}

/* ---------- התראות ---------- */
function buildAlerts() {
  var cfg = D.cfg, out = [];
  Object.keys(X.byMash).forEach(function (n) {
    var st = X.ms[n];
    if (st.lowTwice) {
      out.push({ sev: 1, kind: 'low2', title: 'ציון נמוך פעמיים ברצף', m: n, o: st.last,
        info: f1(st.lowTwice[0]) + ' ואז ' + f1(st.lowTwice[1]), todo: 'לתאם שיחת משוב ותצפית מלווה' });
    }
  });
  X.valid.forEach(function (o) {
    if (o.age === null || o.age <= cfg.feedbackDays || o.fb === 'כן') return;
    out.push({ sev: o.age > 21 ? 1 : 2, kind: 'fb', title: 'משוב לא הועבר ' + o.age + ' ימים', m: o.m, o: o,
      info: o.ob ? 'מתצפת: ' + o.ob : '', todo: 'להעביר משוב ולסמן' });
  });
  out.sort(function (a, b) { return (a.sev - b.sev) || (a.o.t - b.o.t); });
  return out;
}

/* ---------- המלצות ---------- */
function buildReco() {
  var out = [];
  X.universe.forEach(function (n) {
    var st = X.ms[n];
    if (st.reco) out.push(st);
  });
  out.sort(function (a, b) {
    if (a.reco.pri !== b.reco.pri) return a.reco.pri - b.reco.pri;
    var x = a.lastScore, y = b.lastScore;
    if (x === null && y === null) return a.n.localeCompare(b.n, 'he');
    if (x === null) return -1; if (y === null) return 1;
    return x - y;
  });
  return out;
}

/* ---------- פילוח ---------- */
function pivot(list, keyFn) {
  var box = {}, order = [];
  list.forEach(function (o) {
    var k = keyFn(o);
    if (!k) return;
    var id = (typeof k === 'object') ? k.id : k;
    if (!box[id]) { box[id] = { key: k, list: [] }; order.push(id); }
    box[id].list.push(o);
  });
  return order.map(function (id) {
    var a = agg(box[id].list), k = box[id].key;
    return { id: id, key: (typeof k === 'object') ? k.t : k, sub: (typeof k === 'object') ? k.s : '',
      n: a.n, share: list.length ? a.n / list.length : 0, mash: a.mash, avg: a.avg === null ? null : r1(a.avg),
      low: a.low, ca: a.ca, last: a.last, fbp: a.n ? a.fb / a.n : 0 };
  });
}

/* ---------- אחריות ---------- */
function responsibility(field) {
  var own = {};
  D.roster.forEach(function (r) {
    if (r.sus) return;
    var who = r[field];
    if (!who || /^\d{5,}$/.test(who)) return;
    if (!X.scoped || X.inUni[r.n]) {
      var o = own[who] || (own[who] = { mash: {}, rash: {} });
      o.mash[r.n] = 1;
      if (r.ra) o.rash[r.ra] = 1;
    }
  });
  var byRash = {};
  X.valid.forEach(function (o) {
    if (!o.ra || o.s === null) return;
    var b = byRash[o.ra] || (byRash[o.ra] = { sum: 0, cnt: 0 });
    b.sum += o.s; b.cnt++;
  });
  return Object.keys(own).map(function (who) {
    var mine = Object.keys(own[who].mash), rash = Object.keys(own[who].rash);
    var all = [], seen = 0;
    mine.forEach(function (m) { var l = X.byMash[m]; if (l && l.length) { seen++; all = all.concat(l); } });
    var a = agg(all), rs = 0, rc = 0;
    rash.forEach(function (r) { if (byRash[r]) { rs += byRash[r].sum; rc += byRash[r].cnt; } });
    return { who: who, total: mine.length, seen: seen, none: mine.length - seen,
      cov: mine.length ? seen / mine.length : 0, rash: heSort(rash), n: a.n,
      avg: a.avg === null ? null : r1(a.avg), ravg: rc ? r1(rs / rc) : null, ca: a.ca, last: a.last, names: mine };
  });
}

/* ---------- מתצפתים ---------- */
function observers(role) {
  var cfg = D.cfg, by = {}, curWeek = Math.max(schoolWeek(D.today), 1);
  X.valid.forEach(function (o) {
    if (!o.ob) return;
    if (role && o.ro !== role) return;
    var a = by[o.ob] || (by[o.ob] = { who: o.ob, role: '', list: [], w: {}, same: {} });
    a.list.push(o);
    if (o.ro) a.role = o.ro;
    var wn = schoolWeek(o.d);
    if (wn > 0) a.w[wn] = (a.w[wn] || 0) + 1;
    (o.c || []).forEach(function (v) { if (typeof v === 'number') a.same[v] = (a.same[v] || 0) + 1; });
  });
  var g = X.nat.avg;
  return Object.keys(by).map(function (k) {
    var a = by[k], ag = agg(a.list);
    var diff = (ag.avg === null || g === null) ? null : r1(ag.avg - g);
    var sd = null;
    var scores = a.list.map(function (o) { return o.s; }).filter(function (s) { return s !== null; });
    if (scores.length >= 2) {
      var m = ag.avg;
      sd = r1(Math.sqrt(scores.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / scores.length));
    }
    var top = 0, tot = 0;
    Object.keys(a.same).forEach(function (v) { tot += a.same[v]; if (a.same[v] > top) top = a.same[v]; });
    var uniform = tot >= 12 && (top / tot) >= 0.8;
    var status = 'תקין', cls = 'green', note = 'מדרג בטווח הארצי — אין צורך בפעולה.';
    if (ag.n < 3) { status = 'מעט תצפיות'; cls = 'plain'; note = 'רק ' + ag.n + ' תצפיות — אי אפשר להסיק מהן על סגנון הדירוג.'; }
    else if (uniform) { status = 'דירוג אחיד'; cls = 'orange'; note = 'נותן את אותו ציון ב-' + Math.round(top / tot * 100) + '% מהקריטריונים. סימן שאינו מבחין בין ממדים — שווה שיחה.'; }
    else if (diff !== null && diff >= 5) { status = 'מקל'; cls = 'orange'; note = 'נותן בממוצע ' + diff + ' נקודות מעל הממוצע הכללי. מש"קיות שנצפו על ידו נראות טובות יותר ממה שהן.'; }
    else if (diff !== null && diff <= -5) { status = 'מחמיר'; cls = 'orange'; note = 'נותן בממוצע ' + Math.abs(diff) + ' נקודות מתחת לממוצע הכללי. מש"קיות שנצפו על ידו נראות חלשות יותר ממה שהן.'; }
    else if (sd !== null && sd < 3 && ag.n >= 5) { status = 'פיזור נמוך'; cls = 'yellow'; note = 'הציונים שלו כמעט זהים זה לזה. ייתכן שאינו מבחין בין מש"קיות.'; }
    var done = 0, weeks = [];
    for (var w = 1; w <= curWeek; w++) { weeks.push(a.w[w] || 0); done += (a.w[w] || 0); }
    var hasGoal = (cfg.activityRoles || []).indexOf(a.role) !== -1;
    var goal = hasGoal ? curWeek * cfg.weeklyTarget : null;
    return { who: k, role: a.role, n: ag.n, avg: ag.avg === null ? null : r1(ag.avg), diff: diff, sd: sd,
      status: status, cls: cls, note: note, ca: ag.ca, last: ag.last, weeks: weeks, done: done,
      goal: goal, gap: goal === null ? null : Math.max(goal - done, 0), thisWeek: a.w[curWeek] || 0 };
  });
}

/* ---------- חודשים ---------- */
function monthly(list) {
  var by = {}, first = null;
  list.forEach(function (o) {
    var k = o.d.slice(0, 7);
    (by[k] || (by[k] = [])).push(o);
    if (!first || k < first) first = k;
  });
  var out = [], cur = D.today.slice(0, 7);
  if (!first) return out;
  var y = +first.slice(0, 4), m = +first.slice(5, 7), prev = null, guard = 0;
  while (guard++ < 60) {
    var k = y + '-' + ('0' + m).slice(-2);
    var a = agg(by[k] || []);
    var row = { key: k, n: a.n, mash: a.mash, avg: a.avg === null ? null : r1(a.avg), low: a.low, ca: a.ca,
      cov: X.universe.length ? a.mash / X.universe.length : null,
      delta: (a.avg !== null && prev !== null) ? r1(a.avg - prev) : null };
    if (a.avg !== null) prev = a.avg;
    out.push(row);
    if (k >= cur) break;
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

/* ---------- איכות נתונים ---------- */
function lev(a, b) {
  if (a === b) return 0;
  var m = a.length, n = b.length, i, j, prev = [], cur = [];
  if (Math.abs(m - n) > 3) return 9;
  for (j = 0; j <= n; j++) prev[j] = j;
  for (i = 1; i <= m; i++) {
    cur = [i];
    for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function quality() {
  if (X.quality) return X.quality;
  var q = { obs: [], unknown: [], roster: [], dups: [], mismatch: [], pid: [] };
  var REQ = [['mz', 'מחוז'], ['ra', 'רשות'], ['m', 'מש"קית'], ['sc', 'בית ספר'], ['k', 'כיתה'], ['sh', 'שיפט'],
             ['le', 'שיעור'], ['ro', 'תפקיד המתצפת'], ['ob', 'שם המתצפת'], ['d', 'תאריך']];
  D.obs.forEach(function (o) {
    var issues = [], sev = 3;
    var miss = REQ.filter(function (f) { return !o[f[0]]; }).map(function (f) { return f[1]; });
    if (miss.length) { issues.push('שדות חסרים: ' + miss.join(', ')); sev = 1; }
    if (o.sm) { issues.push('חסר ציון — קריטריון שסומן "לא נצפה"'); sev = Math.min(sev, 2); }
    else if (o.s === null) { issues.push('אין ציון'); sev = Math.min(sev, 2); }
    if (!o.dn && o.d && daysAgo(o.d) > 3 && daysAgo(o.d) <= 60) { issues.push('לא הסתיימה כבר ' + daysAgo(o.d) + ' ימים — דוח המשוב לא הופק'); sev = Math.min(sev, 2); }
    var off = [];
    if (o.sh && (D.lists.shifts || []).length && D.lists.shifts.indexOf(o.sh) === -1) off.push('שיפט "' + o.sh + '"');
    if (o.ro && (D.lists.roles || []).length && D.lists.roles.indexOf(o.ro) === -1) off.push('תפקיד "' + o.ro + '"');
    if (o.pl && (D.cfg.plugot || []).length && D.cfg.plugot.indexOf(o.pl) === -1) off.push('פלוגה "' + o.pl + '"');
    if (o.ra && (D.rashuyot || []).length && D.rashuyot.indexOf(o.ra) === -1) off.push('רשות "' + o.ra + '"');
    if (off.length) { issues.push('ערך שאינו ברשימה: ' + off.join(', ')); sev = Math.min(sev, 2); }
    if (!o.bf) issues.push('אין דירוג מתגברת');
    if (issues.length) q.obs.push({ o: o, sev: sev, text: issues.join(' · ') });
  });
  q.obs.sort(function (a, b) { return (a.sev - b.sev) || ((b.o.t || 0) - (a.o.t || 0)); });

  var known = Object.keys(X.people), mefs = {};
  D.roster.forEach(function (r) { if (r.mf) mefs[r.mf] = 1; });
  if (D.user.seesAll) {
    Object.keys(X.byMash).forEach(function (n) {
      if (X.people[n]) return;
      var best = '', bd = 3;
      known.forEach(function (k) { var d = lev(norm(n), norm(k)); if (d < bd) { bd = d; best = k; } });
      q.unknown.push({ n: n, count: X.byMash[n].length, rows: X.byMash[n].map(function (o) { return o.r; }),
        hint: mefs[n] ? 'השם מופיע כמפקדת — כנראה נבחר מהרשימה הלא נכונה' : (best ? 'דומה ל"' + best + '" — כנראה שגיאת כתיב' : 'אינה קיימת בקובץ השיוך'),
        cls: mefs[n] ? 'red' : (best ? 'orange' : 'plain'), best: best });
    });
    q.unknown.sort(function (a, b) { return b.count - a.count; });

    D.roster.forEach(function (r) {
      if (r.sus) q.roster.push({ n: r.n, text: 'שורת שיוך משובשת: הערכים נמצאים בעמודות הלא נכונות (פלוגה "' + r.pl + '", רשות "' + r.ra + '"). למחוק את השורה בגיליון "מיפוי".', cls: 'red' });
      else if (r.x) q.roster.push({ n: r.n, text: 'חסר: ' + r.x, cls: 'yellow' });
    });

    var pids = {};
    D.roster.forEach(function (r) { if (r.pid) { (pids[r.pid] || (pids[r.pid] = {}))[r.n] = 1; } });
    Object.keys(pids).forEach(function (p) {
      var ns = Object.keys(pids[p]);
      if (ns.length > 1) q.pid.push({ pid: p, names: ns });
    });
  }

  var seen = {};
  X.valid.forEach(function (o) {
    var k = [o.m, o.d, norm(o.ob), o.le, o.sc].join('|');
    (seen[k] || (seen[k] = [])).push(o);
  });
  Object.keys(seen).forEach(function (k) { if (seen[k].length > 1) q.dups.push(seen[k]); });

  X.valid.forEach(function (o) {
    var p = X.people[o.m];
    if (!p) return;
    var bad = [];
    if (p.mf.length === 1 && o.mf && !same(o.mf, p.mf[0])) bad.push('מפקדת: בתצפית "' + o.mf + '", בשיוך "' + p.mf[0] + '"');
    if (o.mn && p.mn.length && !p.mn.some(function (x) { return same(x, o.mn); })) bad.push('מנה"ד: בתצפית "' + o.mn + '", בשיוך "' + p.mn.join(' / ') + '"');
    if (o.ra && p.ra.length && p.ra.indexOf(o.ra) === -1) bad.push('רשות: בתצפית "' + o.ra + '", בשיוך "' + p.ra.join(' / ') + '"');
    if (bad.length) q.mismatch.push({ o: o, text: bad.join(' · ') });
  });

  q.total = q.obs.filter(function (x) { return x.sev < 3; }).length + q.unknown.length + q.roster.length + q.dups.length + q.pid.length;
  X.quality = q;
  return q;
}

/* ---------- השלמה אוטומטית בדפדפן (השרת קובע סופית) ---------- */
function resolveLocal(name, rashut) {
  var out = { known: false, machzor: '', manhad: '', mefakedet: '', plugah: '', mahoz: '', rashut: rashut || '', rashuyot: [] };
  var p = X.people[name];
  if (p) {
    out.known = true;
    out.rashuyot = p.ra.slice();
    var pool = p.rows;
    if (rashut) { var nr = pool.filter(function (r) { return r.ra === rashut; }); if (nr.length) pool = nr; }
    var u = function (list, f) { var s = uniq(list.map(function (r) { return r[f]; })); return s.length === 1 ? s[0] : ''; };
    out.machzor = u(p.rows, 'mc') || u(pool, 'mc');
    out.mefakedet = u(p.rows, 'mf') || u(pool, 'mf');
    out.manhad = u(pool, 'mn');
    if (!out.rashut) out.rashut = u(pool, 'ra');
    out.mahoz = u(pool, 'mz');
  }
  if (out.rashut) {
    var key = norm(out.rashut);
    out.plugah = (D.plugahByRashut || {})[key] || '';
    if (!out.plugah) {
      Object.keys(D.plugahByRashut || {}).forEach(function (k) { if (norm(k) === key) out.plugah = D.plugahByRashut[k]; });
    }
  }
  if (out.plugah) out.mahoz = out.plugah.indexOf('צפון') === 0 ? 'צפון' : 'דרום';
  return out;
}
