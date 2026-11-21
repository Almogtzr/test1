/* ==========================================================================
   הפעלה
   ========================================================================== */
var _loadedAt = 0;
var NAV = [
  ['home', 'בית', 'home'], ['list', 'תצפיות', 'list'], ['mash', 'מש"קיות', 'people'],
  ['rep', 'דוחות', 'chart'], ['care', 'טיפול', 'care'], ['adm', 'ניהול', 'gear']
];
function navItems() { return NAV.filter(function (n) { return n[0] !== 'adm' || D.user.isAdmin; }); }

function buildChrome() {
  var u = D.user, who = u.name || u.email.split('@')[0];
  var rail = '<div class="brand">' + esc(D.cfg.title) + '</div><div class="sub">תוכנית גשרים</div><nav aria-label="ניווט ראשי">';
  if (u.canWrite) rail += '<button type="button" class="new" data-act="newObs">' + ic('plus') + 'תצפית חדשה</button>';
  navItems().forEach(function (n) {
    if (n[0] === 'adm') rail += '<div class="gap"></div>';
    rail += '<button type="button" data-nav="' + n[0] + '" data-act="go" data-v="' + n[0] + '">' + ic(n[2]) + '<span>' + esc(n[1]) + '</span>' + (n[0] === 'care' ? '<span class="n" id="railN" hidden></span>' : '') + '</button>';
  });
  rail += '</nav><div class="me"><b title="' + esc(u.email) + '">' + esc(who) + '</b>' + esc(u.role) + (u.role === 'מנה"ד מחוזי' && u.scope ? ', ' + esc(u.scope) : '') +
    '<br><button type="button" data-act="refresh">רענן נתונים</button></div>';
  $('#rail').innerHTML = rail;

  $('#topbar').innerHTML = '<div class="brand">' + esc(D.cfg.title) + '</div><div class="me"><b>' + esc(who) + '</b>' + esc(u.role) + '</div>';

  var tb = '<button type="button" data-nav="home" data-act="go" data-v="home">' + ic('home') + 'בית</button>' +
    '<button type="button" data-nav="list" data-act="go" data-v="list">' + ic('list') + 'תצפיות</button>';
  if (u.canWrite) tb += '<button type="button" class="plus" data-nav="form" data-act="newObs" aria-label="תצפית חדשה"><span class="c">' + ic('plus') + '</span></button>';
  tb += '<button type="button" data-nav="mash" data-act="go" data-v="mash">' + ic('people') + 'מש"קיות</button>' +
    '<button type="button" data-nav="more" data-act="moreMenu">' + ic('more') + 'עוד<span class="dot" id="tabN" hidden></span></button>';
  $('#tabbar').innerHTML = tb;
}
function afterRender() {
  if (!X) return;
  var crit = X.alerts.filter(function (a) { return a.sev === 1; }).length;
  ['#railN', '#tabN'].forEach(function (id) {
    var el = $(id); if (!el) return;
    el.hidden = !crit; el.textContent = crit || '';
  });
  var more = $('[data-nav=more]');
  if (more) more.classList.toggle('on', ['rep', 'care', 'adm'].indexOf(ST.view) !== -1);
}
ACT.moreMenu = function () {
  var crit = X.alerts.filter(function (a) { return a.sev === 1; }).length;
  var rows = [['rep', 'דוחות', 'תמונת מצב, פילוחים, אחריות, מתצפתים'], ['care', 'טיפול', crit ? crit + ' התראות קריטיות' : 'התראות, המלצות, בקרת נתונים']];
  if (D.user.isAdmin) rows.push(['adm', 'ניהול', 'משתמשים, סנכרון שיוך, מצגת']);
  openDlg({
    title: 'עוד',
    html: '<div class="opts">' + rows.map(function (r) { return '<button type="button" class="opt" data-act="go" data-v="' + r[0] + '"><b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + '</span></button>'; }).join('') +
      '<button type="button" class="opt" data-act="refresh"><b>רענן נתונים</b><span>טוען מחדש מהגיליון</span></button></div>' +
      '<div class="df"><span class="sub">' + esc(D.user.email) + ' · ' + esc(D.user.role) + ' · גרסה ' + esc(D.cfg.version) + '</span></div>'
  });
};

function showGate(html) {
  $('#app').hidden = true;
  var g = $('#gate'); g.hidden = false;
  $('#gateMsg').innerHTML = html;
}
function gateFor(res) {
  if (res && res.why === 'noid') return 'לא זוהה חשבון Google.<br>היכנס עם החשבון הארגוני שלך ורענן את הדף.';
  if (res && res.why === 'domain') return 'לחשבון <span dir="ltr">' + esc(res.email) + '</span> אין הרשאה לאתר.<br>היכנס עם החשבון הארגוני, או פנה למנהל המערכת.';
  return 'האתר לא נטען. נסה לרענן את הדף.';
}
function applyData(res) {
  D = res; DETAIL = {}; ST.log = null; ST.users = null;
  recompute();
  _loadedAt = Date.now();
}
function reloadData(force) {
  return call(force ? 'apiRefresh' : 'apiInit').then(function (res) {
    if (!res || !res.ok) { showGate(gateFor(res)); return; }
    applyData(res); buildChrome(); render();
  });
}
ACT.refresh = function () {
  if (_dlg) closeDlg(null);
  if (ST.view === 'form' && FORM && FORM.dirty) { toast('שמור קודם את התצפית שבמילוי, ואז רענן.', 'err'); return; }
  reloadData(true).then(function () { toast('הנתונים עודכנו'); }).catch(fail);
};
ACT.retry = function () { start(); };

function start() {
  showGate('מתחבר…');
  call('apiInit').then(function (res) {
    if (!res || !res.ok) { showGate(gateFor(res)); return; }
    applyData(res);
    buildChrome();
    $('#gate').hidden = true;
    $('#app').hidden = false;
    render();
    try {
      google.script.history.setChangeHandler(function (e) {
        var s = e && e.state;
        if (_dlg) closeDlg(null);
        if (s && s.v) go(s.v, s.p || {}, { silent: true });
        else go('home', {}, { silent: true });
      });
    } catch (err) {}
  }).catch(function (e) {
    showGate(esc(cleanErr(e)) + '<br><br><button type="button" class="btn pri" data-act="retry">נסה שוב</button>');
  });
}

/* חזרה ללשונית אחרי זמן: טוענים מחדש בשקט, אבל לא באמצע מילוי טופס */
document.addEventListener('visibilitychange', function () {
  if (document.hidden || !D || _dlg || ST.view === 'form') return;
  if (Date.now() - _loadedAt < 4 * 60000) return;
  _loadedAt = Date.now();
  call('apiInit').then(function (res) {
    if (res && res.ok && res.stamp !== D.stamp && ST.view !== 'form' && !_dlg) { applyData(res); render(); }
  }).catch(function () {});
});
var _wide = null, _rsT = null;
window.addEventListener('resize', function () {
  clearTimeout(_rsT);
  _rsT = setTimeout(function () {
    var w = isWide();
    if (_wide !== null && w !== _wide && D && ST.view !== 'form' && !_dlg) render();
    _wide = w;
  }, 150);
});
_wide = isWide();
start();
