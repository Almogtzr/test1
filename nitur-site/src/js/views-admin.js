/* ==========================================================================
   מסך הניהול: משתמשים ופעולות מערכת
   ========================================================================== */
VIEWS.adm = function () {
  if (!D.user.isAdmin) return '<div class="sheet"><div class="empty"><b>המסך הזה פתוח למנהלי המערכת בלבד</b></div></div>';
  return ph('ניהול', '') + tabs('adm', [['users', 'משתמשים והרשאות'], ['sys', 'מערכת']]) + ADM[ST.tab.adm]();
};
var ADM = {};
var ROLE_HELP = {
  'מנהל': 'רואה ועורך הכל, כולל המסך הזה',
  'צופה': 'רואה הכל, בלי להזין ובלי לערוך',
  'מנה"ד מחוזי': 'רואה את כל המחוז שנבחר לו',
  'מנה"ד': 'רואה את המש"קיות שבאחריותו לפי קובץ השיוך',
  'מפקדת': 'רואה את המש"קיות שלה לפי קובץ השיוך',
  'מתצפת': 'מזין תצפיות ורואה רק את מה שהזין'
};
function loadUsers() {
  ST.users = 'loading';
  call('apiUsers').then(function (r) { ST.users = r; if (ST.view === 'adm') render(); })
    .catch(function (e) { ST.users = { err: cleanErr(e) }; if (ST.view === 'adm') render(); });
}
ADM.users = function () {
  if (ST.users === null) loadUsers();
  if (ST.users === null || ST.users === 'loading') return '<div class="sheet"><div class="spin">טוען משתמשים…</div></div>';
  if (ST.users.err) return '<div class="sheet"><div class="empty"><b>הרשימה לא נטענה</b>' + esc(ST.users.err) + '</div></div>';
  var U = ST.users.users;
  var h = '<div class="bar"><button type="button" class="btn pri" data-act="userEdit" data-email="">' + ic('plus') + 'הוסף משתמש</button>' +
    '<span class="cnt">מי שאינו ברשימה ושייך לארגון נכנס כ"מתצפת"</span></div>';
  h += '<div class="sheet">' + table('users', [
    { k: 'email', t: 'אימייל', f: function (u) { return '<span dir="ltr">' + esc(u.email) + '</span>'; } },
    { k: 'name', t: 'שם', f: function (u) { return u.name ? '<b>' + esc(u.name) + '</b>' : '<span class="muted">—</span>'; } },
    { k: 'role', t: 'תפקיד', f: function (u) { return '<span class="chip ' + (u.role === 'מנהל' ? 'blue' : 'plain') + '">' + esc(u.role) + '</span>' + (u.fixed ? ' <span class="muted">קבוע בקוד</span>' : ''); } },
    { k: 'scope', t: 'רואה', f: function (u) {
      if (u.role === 'מנה"ד מחוזי') return 'מחוז ' + esc(u.scope || '?');
      if (u.role === 'מנה"ד' || u.role === 'מפקדת') return 'המש"קיות של ' + esc(u.name || '?');
      return esc(ROLE_HELP[u.role] || '');
    }, v: function (u) { return u.scope; } },
    { k: 'x', t: '', f: function (u) {
      return '<span class="row-btns"><button type="button" class="btn sm" data-act="userEdit" data-email="' + esc(u.email) + '">עריכה</button>' +
        (u.fixed ? '' : '<button type="button" class="btn sm danger" data-act="userDel" data-email="' + esc(u.email) + '">הסרה</button>') + '</span>';
    }, v: function () { return 0; } }
  ], U) + '</div>';
  var have = {};
  U.forEach(function (u) { if (u.name) have[norm(u.name)] = 1; });
  var cand = [];
  uniq(D.roster.filter(function (r) { return !r.sus; }).map(function (r) { return r.mn; })).forEach(function (n) { if (!have[norm(n)] && !/^\d+$/.test(n)) cand.push([n, 'מנה"ד']); });
  uniq(D.roster.filter(function (r) { return !r.sus; }).map(function (r) { return r.mf; })).forEach(function (n) { if (!have[norm(n)] && !/^\d+$/.test(n)) cand.push([n, 'מפקדת']); });
  if (cand.length) {
    h += '<div class="sheet"><div class="hd"><h2>בעלי תפקיד בלי משתמש</h2><span class="note">מופיעים בקובץ השיוך. עד שיוגדרו, הם נכנסים כ"מתצפת" ורואים רק מה שהזינו.</span></div><div class="bd"><div class="row-btns">' +
      cand.map(function (c) { return '<button type="button" class="btn sm" data-act="userEdit" data-email="" data-name="' + esc(c[0]) + '" data-role="' + esc(c[1]) + '">' + esc(c[0]) + ' <span class="muted">' + esc(c[1]) + '</span></button>'; }).join('') +
      '</div></div></div>';
  }
  h += '<div class="sheet"><div class="hd"><h2>מה כל תפקיד רואה</h2></div><div class="bd"><dl class="kv">' +
    D.cfg.userRoles.map(function (r) { return '<dt>' + esc(r) + '</dt><dd style="font-weight:400">' + esc(ROLE_HELP[r] || '') + '</dd>'; }).join('') +
    '</dl><p class="sub" style="margin-top:10px;max-width:75ch">למנה"ד ולמפקדת, השם חייב להיות זהה לשם שמופיע בקובץ השיוך — לפיו נקבע מה הם רואים. לכן השם נבחר מרשימה ולא מוקלד.</p></div></div>';
  return h;
};
ACT.userEdit = function (el) {
  var email = el.dataset.email, U = ST.users, u = (U.users || []).filter(function (x) { return x.email === email; })[0] || { email: '', name: el.dataset.name || '', role: el.dataset.role || 'מתצפת', scope: '' };
  var roles = D.cfg.userRoles;
  openDlg({
    title: email ? 'עריכת משתמש' : 'משתמש חדש',
    html: '<div class="db">' +
      '<div class="fld"><label for="uEmail">אימייל</label><input id="uEmail" class="in" dir="ltr" type="email" value="' + esc(u.email) + '"' + (email ? ' readonly' : ' data-focus') + ' placeholder="name@cyber.org.il" autocomplete="off"></div>' +
      '<div class="fld"><label for="uRole">תפקיד</label><select id="uRole" class="in" data-ch="uRole"' + (u.fixed ? ' disabled' : '') + '>' + roles.map(function (r) { return '<option' + (r === u.role ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select>' +
      '<div class="sub" id="uRoleHelp" style="margin-top:4px">' + esc(ROLE_HELP[u.role] || '') + '</div></div>' +
      '<div class="fld"><label for="uName">שם <span class="opt" id="uNameOpt">' + ((u.role === 'מנה"ד' || u.role === 'מפקדת') ? 'חובה — כפי שהוא בקובץ השיוך' : 'ישמש כשם המתצפת בטופס') + '</span></label>' +
      '<input id="uName" class="in" list="uNames" value="' + esc(u.name) + '" autocomplete="off"><datalist id="uNames">' + (U.names || []).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist></div>' +
      '<div class="fld" id="uScopeBox"' + (u.role === 'מנה"ד מחוזי' ? '' : ' hidden') + '><label for="uScope">מחוז</label><select id="uScope" class="in"><option value="">בחר מחוז</option>' +
      (U.mehozot || []).map(function (m) { return '<option' + (m === u.scope ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '</div><div class="df"><button type="button" class="btn pri" data-act="userSave">שמור משתמש</button><button type="button" class="btn" data-act="dlgClose">ביטול</button></div>'
  });
};
CH.uRole = function (el) {
  var r = el.value;
  $('#uRoleHelp').textContent = ROLE_HELP[r] || '';
  $('#uScopeBox').hidden = r !== 'מנה"ד מחוזי';
  $('#uNameOpt').textContent = (r === 'מנה"ד' || r === 'מפקדת') ? 'חובה — כפי שהוא בקובץ השיוך' : 'ישמש כשם המתצפת בטופס';
};
ACT.userSave = function (el) {
  var rec = { email: $('#uEmail').value.trim(), role: $('#uRole').value, name: $('#uName').value.trim(), scope: $('#uScope').value };
  el.disabled = true;
  call('apiUserSave', rec).then(function (r) { ST.users = r; closeDlg(null); render(); toast('המשתמש נשמר'); })
    .catch(function (e) { el.disabled = false; fail(e); });
};
ACT.userDel = function (el) {
  var email = el.dataset.email;
  confirmBox({ title: 'הסרת משתמש', text: 'להסיר את ' + email + ' מרשימת המשתמשים?\nאם הוא שייך לארגון, הוא ימשיך להיכנס כ"מתצפת".', ok: 'הסר משתמש', danger: true }).then(function (yes) {
    if (!yes) return;
    call('apiUserDelete', email).then(function (r) { ST.users = r; render(); toast('המשתמש הוסר'); }).catch(fail);
  });
};

ADM.sys = function () {
  var cfg = D.cfg, h = '';
  h += '<div class="sheet"><div class="hd"><h2>פעולות</h2></div><div class="bd"><div class="list" style="margin:0 -16px">' +
    sysRow('סנכרון קובץ השיוך', 'מושך מחדש את המש"קיות, המפקדות והמנה"דים מקובץ "כא גשרים". להריץ אחרי כל שינוי בקובץ.', 'sysSync', 'סנכרן עכשיו') +
    sysRow('רענון הנתונים', 'האתר שומר את הנתונים כמה דקות כדי לעבוד מהר. אם ערכת משהו ישירות בגיליון ואינך רואה אותו — רענן.', 'refresh', 'רענן') +
    sysRow('מצגת חודשית', 'יוצר מצגת Google Slides מהגרפים שבגיליון "דשבורד", ושומר אותה לצד הקובץ.', 'sysPres', 'הפק מצגת') +
    (cfg.sheetUrl ? '<div class="li"><span class="t">הגיליון</span><span class="e"><a class="btn sm" href="' + esc(cfg.sheetUrl) + '" target="_blank" rel="noopener">' + ic('ext') + 'פתח</a></span><span class="m">מקום האחסון של כל הנתונים. לעבודה שוטפת אין צורך לפתוח אותו.</span></div>' : '') +
    '</div></div></div>';
  h += '<div class="cols c2"><div class="sheet"><div class="hd"><h2>כללי החישוב</h2><span class="note">מוגדרים בקוד הגיליון, תחת CFG</span></div><div class="bd"><dl class="kv">' +
    [['ציון נמוך', 'מתחת ל-' + cfg.low], ['יעד למש"קית', cfg.target + ' תצפיות בסמסטר'], ['יעד למנה"ד ולמפקדת', cfg.weeklyTarget + ' תצפיות בשבוע'],
     ['משוב באיחור', 'אחרי ' + cfg.feedbackDays + ' ימים'], ['לא נצפתה זמן רב', 'אחרי ' + cfg.staleDays + ' ימים'], ['ירידה שמדליקה סיכון', cfg.riskDrop + ' נקודות ומעלה'],
     ['סמסטר נוכחי', X.sem]].map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl></div></div>' +
    '<div class="sheet"><div class="hd"><h2>מצב המערכת</h2></div><div class="bd"><dl class="kv">' +
    [['גרסת האתר', cfg.version], ['תצפיות', D.obs.length], ['מש"קיות בשיוך', Object.keys(X.people).length], ['רשויות', (D.rashuyot || []).length],
     ['שיפטים', (D.lists.shifts || []).length], ['מחובר כ', D.user.email]].map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl></div></div></div>';
  return h;
};
function sysRow(title, text, act, label) {
  return '<div class="li"><span class="t">' + esc(title) + '</span><span class="e"><button type="button" class="btn sm" data-act="' + act + '">' + esc(label) + '</button></span><span class="m">' + esc(text) + '</span></div>';
}
ACT.sysSync = function (el) {
  el.disabled = true; el.textContent = 'מסנכרן…';
  call('apiSyncRoster').then(function (r) {
    toast('הסנכרון הושלם: ' + r.mashakiot + ' מש"קיות' + (r.incomplete ? ', ' + r.incomplete + ' עם פרטים חסרים' : ''));
    return reloadData(true);
  }).catch(function (e) { el.disabled = false; el.textContent = 'סנכרן עכשיו'; fail(e); });
};
ACT.sysPres = function (el) {
  el.disabled = true; el.textContent = 'מפיק…';
  call('apiPresentation').then(function (r) {
    el.disabled = false; el.textContent = 'הפק מצגת';
    openDlg({ title: 'המצגת נוצרה', html: '<div class="db"><p>המצגת נשמרה לצד הגיליון בדרייב.</p></div><div class="df"><a class="btn pri" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + ic('ext') + 'פתח את המצגת</a><button type="button" class="btn" data-act="dlgClose">סגור</button></div>' });
  }).catch(function (e) { el.disabled = false; el.textContent = 'הפק מצגת'; fail(e); });
};
