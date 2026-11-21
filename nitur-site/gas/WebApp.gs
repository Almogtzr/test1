/* ============================================================================
   #                                                                        #
   #        מערכת ניטור תצפיות — שרת האתר                                  #
   #                                                                        #
   #        גרסה 2.0                                                        #
   #                                                                        #
   ============================================================================

   מה זה
   ------
   האתר של מערכת ניטור התצפיות. הזנה, צפייה, דוחות, טיפול
   וניהול — הכל בדפדפן ובנייד, בלי לפתוח את הגיליון.

   הגיליון נשאר מקום האחסון בלבד. האתר קורא ממנו וכותב אליו,
   ושום נתון לא יוצא מהדרייב הארגוני.

   איפה זה יושב
   --------------
   קובץ נוסף באותו פרויקט Apps Script של הגיליון. הוא נשען על
   CFG, colMap_, findCol_ ועל שאר הקוד הקיים, ולכן הקריטריונים,
   המשקלות, הספים ורשימת המנהלים מוגדרים במקום אחד בלבד.

   כל השמות בקובץ הזה מתחילים ב-w או ב-api, כדי שלא יתנגשו
   עם אף פונקציה בקוד הגיליון.

   התקנה
   ------
   1. בעורך הסקריפטים: קובץ סקריפט בשם WebApp — הדבק את הקובץ הזה.
   2. קובץ HTML בשם WebAppUI — הדבק את הקובץ השני.
   3. פריסה -> פריסה חדשה -> אפליקציית אינטרנט:
         הפעל בתור        אני
         למי יש גישה      כל מי שב-cyber.org.il
   4. בכל עדכון קוד: פריסה -> נהל פריסות -> עריכה -> גרסה חדשה.

   "הפעל בתור: אני" הוא לב העניין. הסקריפט ניגש לגיליון
   בהרשאות שלך, והמשתמשים לא צריכים גישה לגיליון בכלל.

   מי רואה מה
   ------------
   התפקיד נקבע בגיליון "משתמשי האתר", שמנוהל מתוך האתר עצמו
   (ניהול -> משתמשים). מי שב-CFG.ADMIN_EMAILS הוא תמיד מנהל.

     מנהל           רואה ועורך הכל
     צופה           רואה הכל, לא מזין ולא עורך
     מנה"ד מחוזי    רואה את המחוז שהוגדר לו
     מנה"ד          רואה את המש"קיות שבאחריותו
     מפקדת          רואה את המש"קיות שלה
     מתצפת          רואה את התצפיות שהוא עצמו הזין

   מי שאינו רשום בגיליון המשתמשים ושייך לארגון מקבל "מתצפת".

   אבטחה
   -------
   הזהות נלקחת מהסשן של Google ולא מהדפדפן, ולכן אי אפשר
   לזייף אותה. כל פונקציה שנקראת מהאתר מתחילה בזיהוי, וכל
   סינון ההרשאות נעשה כאן בשרת — הדפדפן מקבל רק את מה
   שמותר לו לראות.

   מה האתר כותב לגיליון
   ----------------------
   שורה אחת לכל תצפית, במאגר השורות הקיים, לפי שמות הכותרות.
   נוסחת הציון ועמודות הנוסחה האחרות לא נדרסות. עמודה אחת
   מתווספת בסוף הגיליון — "הוזן באתר" — ובה מי הזין.
   כל כתיבה נרשמת ב"יומן שינויים", כמו עריכה ידנית.
   ============================================================================ */


/* ============================================================================
   הגדרות האתר
   ============================================================================ */

const WEB = {
  VERSION: '2.0',
  TITLE: 'ניטור תצפיות',

  // מי שאינו מהדומיינים האלה ואינו רשום בגיליון המשתמשים — נחסם,
  // גם אם הפריסה הוגדרה בטעות כפתוחה לכולם.
  DOMAINS: ['cyber.org.il'],

  USERS_SHEET: 'משתמשי האתר',
  USERS_HEAD: ['אימייל', 'שם', 'תפקיד', 'היקף', 'עודכן'],
  ROLES: ['מנהל', 'צופה', 'מנה"ד מחוזי', 'מנה"ד', 'מפקדת', 'מתצפת'],
  DEFAULT_ROLE: 'מתצפת',

  // העמודה שמתווספת בסוף גיליון ההזנה
  BY_COL: 'הוזן באתר',

  // כמה דקות הנתונים נשמרים במטמון
  CACHE_MIN: 10,

  // כמה רשומות של יומן השינויים מוצגות באתר
  LOG_VIEW: 300,

  FEEDBACK: ['כן', 'לא', 'בהמשך', 'אחר'],
  BOOST_FN: ['מעולה', 'טוב', 'בינוני', 'נמוך', 'אין מתגברת'],
  NO_BOOST: 'אין',
  NO_BOOST_FN: 'אין מתגברת',

  // המחוז נגזר מהפלוגה. פלוגה שאינה כאן — לפי קובץ השיוך.
  MAHOZ_BY_PLUGAH: {
    'צפון א': 'צפון',
    'צפון ב': 'צפון',
    'מרכז': 'דרום',
    'דרום': 'דרום'
  },

  // מה חובה כדי לסיים תצפית. טיוטה נשמרת גם בלי זה.
  FINISH_REQUIRED: ['mashakit', 'rashut', 'school', 'klass', 'shift', 'lesson',
                    'role', 'observer', 'date', 'scores', 'keep', 'improve'],

  // בסיום תצפית, שדות רשות שנשארו ריקים מקבלים את הסימן הזה,
  // כדי שבדיקת השלמות בגיליון תעבור ודוח המשוב יופק.
  // מחרוזת ריקה = לא למלא.
  FILL_EMPTY: '-'
};


/* מפתח -> כותרת בגיליון ההזנה. הכל מאותר לפי שם, לא לפי אות. */
const W_FIELDS = [
  ['started',   'תחילת תצפית'],
  ['mashakit',  'משקית'],
  ['pid',       'מ.א מש"קית'],
  ['mahoz',     'מחוז'],
  ['machzor',   'מחזור'],
  ['plugah',    'פלוגה'],
  ['manhad',    'מנהד אזורי'],
  ['mefakedet', 'מפקדת'],
  ['mefPid',    'מ.א מפקדת'],
  ['boost',     'מש"קית מתגברת'],
  ['rashut',    'רשות'],
  ['school',    'בית ספר'],
  ['klass',     'כיתה'],
  ['shift',     'שם השיפט'],
  ['lesson',    'שם ומספר שיעור'],
  ['role',      'תפקיד המתצפת'],
  ['observer',  'שם המתצפת'],
  ['date',      'תאריך'],
  ['score',     'ציון תצפית'],
  ['keep',      'נקודות לשימור'],
  ['improve',   'נקודות לשיפור'],
  ['personal',  'התייחסות אישית'],
  ['boostFn',   'תפקוד המתגברת'],
  ['boostNote', 'הערות מתגברת'],
  ['feedback',  'הועבר משוב'],
  ['done',      'סיום תצפית'],
  ['docUrl',    'Merged Doc URL'],
  ['docStatus', 'Document Merge Status'],
  ['by',        'הוזן באתר']
];

/* שמות השדות כפי שהם מוצגים למשתמש בהודעות */
const W_LABELS = {
  mashakit: 'מש"קית', rashut: 'רשות', school: 'בית ספר', klass: 'כיתה',
  shift: 'שיפט', lesson: 'שיעור', role: 'תפקיד המתצפת',
  observer: 'שם המתצפת', date: 'תאריך', scores: 'ציונים לכל הקריטריונים',
  keep: 'נקודות לשימור', improve: 'נקודות לשיפור'
};


/* ============================================================================
   כניסה לאתר
   ============================================================================ */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('WebAppUI')
    .setTitle(WEB.TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/** פריט התפריט בגיליון: מציג את כתובת האתר. */
function openWebSite() {
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (err) {}
  const html = url
    ? '<div style="font-family:Arial;direction:rtl;font-size:14px;line-height:1.7">' +
      'כתובת האתר:<br><a href="' + url + '" target="_blank">' + url + '</a></div>'
    : '<div style="font-family:Arial;direction:rtl;font-size:14px;line-height:1.7">' +
      'האתר עוד לא נפרס.<br>פריסה -> פריסה חדשה -> אפליקציית אינטרנט.</div>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(520).setHeight(130), WEB.TITLE);
}


/* ============================================================================
   עזרים קטנים
   ============================================================================ */

function wS_(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}

/** השוואת שמות: בלי גרשיים, בלי רווחים כפולים. */
function wNorm_(v) {
  return wS_(v).replace(/[׳״‘’“”"'`]/g, '')
    .replace(/\s+/g, ' ').trim();
}
function wSame_(a, b) {
  const x = wNorm_(a), y = wNorm_(b);
  return x !== '' && x === y;
}

function wTz_() {
  try { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'Asia/Jerusalem'; }
  catch (err) { return 'Asia/Jerusalem'; }
}

/** ערך תא -> 'yyyy-MM-dd', או '' אם אינו תאריך. */
function wIso_(v, tz) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  const s = wS_(v);
  let m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (m) {
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  return '';
}

/**
 * 'yyyy-MM-dd' -> Date בחצות לפי אזור הזמן של הגיליון, או null.
 *
 * התאריך נבנה באזור הזמן של הגיליון ולא של הסקריפט. אם השניים
 * שונים, תאריך שנבנה בשעון הסקריפט נוחת בגיליון יום קודם.
 */
function wDate_(iso, tz) {
  const m = wS_(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const mo = Number(m[2]), da = Number(m[3]);
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  let d = null;
  try { d = Utilities.parseDate(m[0] + ' 00:00', tz || wTz_(), 'yyyy-MM-dd HH:mm'); }
  catch (err) { d = new Date(Number(m[1]), mo - 1, da); }
  return (d && !isNaN(d.getTime())) ? d : null;
}

/**
 * טקסט חופשי שהמשתמש הקליד, לפני כתיבה לתא.
 *
 * setValue מפרש מחרוזת כאילו הוקלדה ביד: "=..." הופך לנוסחה,
 * ו-"7/2" הופך לתאריך. גרש בתחילת הערך אומר לגיליון לשמור אותו
 * כטקסט כמו שהוא, והגרש עצמו אינו נשמר.
 */
function wText_(v) {
  const s = wS_(v);
  if (s === '' || s === '-') return s;
  if (/^[=+@\-']/.test(s) || /^\d{1,4}[\/.\-]\d{1,2}([\/.\-]\d{1,4})?$/.test(s)) return "'" + s;
  return s;
}

/** ערך תא כפי שיירשם ביומן. */
function wShow_(v, tz) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz, 'dd/MM/yyyy');
  }
  if (v === true) return 'כן';
  if (v === false) return '';
  return wS_(v);
}

function wMahoz_(plugah, fallback) {
  const p = wS_(plugah);
  if (p && WEB.MAHOZ_BY_PLUGAH[p]) return WEB.MAHOZ_BY_PLUGAH[p];
  return wS_(fallback);
}


/* ============================================================================
   מטמון
   ============================================================================
   קריאה מהגיליון יקרה, ולכן כל טבלה נקראת פעם אחת ונשמרת.
   המפתח כולל שני חותמים: אחד שהאתר מקדם בכל כתיבה שלו,
   ואחד שהוא זמן העדכון האחרון של הקובץ בדרייב. כך גם עריכה
   ידנית בגיליון מגיעה לאתר, בלי שום חיבור לטריגר העריכה.

   CacheService מוגבל ל-100KB לערך, ולכן ערך גדול נחתך לפרוסות.
   ============================================================================ */

var _W_FRESH = null;

function wProps_() {
  return PropertiesService.getDocumentProperties() || PropertiesService.getScriptProperties();
}
function wCache_() {
  return CacheService.getDocumentCache() || CacheService.getScriptCache();
}

function wFresh_() {
  if (_W_FRESH) return _W_FRESH;
  const p = wProps_();
  let s = p.getProperty('WEB_STAMP');
  if (!s) { s = String(Date.now()); p.setProperty('WEB_STAMP', s); }
  let f = '';
  try {
    f = String(DriveApp.getFileById(SpreadsheetApp.getActive().getId())
      .getLastUpdated().getTime());
  } catch (err) {
    // בלי גישה לדרייב: חלון זמן קבוע במקום חותם הקובץ
    f = 't' + Math.floor(Date.now() / (WEB.CACHE_MIN * 60000));
  }
  _W_FRESH = s + '_' + f;
  return _W_FRESH;
}

function wBump_() {
  wProps_().setProperty('WEB_STAMP', String(Date.now()));
  _W_FRESH = null;
  try { clearObsCache_(); } catch (err) {}
  try { clearMappingCache_(); } catch (err) {}
}

function wCached_(name, fn) {
  const cache = wCache_();
  const key = 'W2_' + name + '_' + wFresh_();
  const SIZE = 90000;

  try {
    const n = Number(cache.get(key + '_n') || 0);
    if (n > 0) {
      const keys = [];
      for (let i = 0; i < n; i++) keys.push(key + '_' + i);
      const got = cache.getAll(keys);
      let txt = '', whole = true;
      for (let i = 0; i < n; i++) {
        if (got[keys[i]] === undefined || got[keys[i]] === null) { whole = false; break; }
        txt += got[keys[i]];
      }
      if (whole) return JSON.parse(txt);
    }
  } catch (err) {}

  const val = fn();

  try {
    const txt = JSON.stringify(val);
    const parts = {};
    let n = 0;
    for (let i = 0; i < txt.length; i += SIZE) {
      parts[key + '_' + n] = txt.substr(i, SIZE);
      n++;
    }
    if (n <= 40) {
      parts[key + '_n'] = String(n);
      cache.putAll(parts, WEB.CACHE_MIN * 60);
    }
  } catch (err) {}

  return val;
}


/* ============================================================================
   זהות והרשאות
   ============================================================================ */

function wUsersMap_() {
  return wCached_('USERS', function () {
    const sh = SpreadsheetApp.getActive().getSheetByName(WEB.USERS_SHEET);
    const out = {};
    if (!sh || sh.getLastRow() < 2) return out;
    sh.getRange(2, 1, sh.getLastRow() - 1, WEB.USERS_HEAD.length).getValues()
      .forEach(function (r) {
        const email = wS_(r[0]).toLowerCase();
        if (!email) return;
        out[email] = { name: wS_(r[1]), role: wS_(r[2]), scope: wS_(r[3]) };
      });
    return out;
  });
}

/**
 * מי קורא עכשיו, ומה מותר לו.
 * הזהות מהסשן של Google בלבד. אם אין זהות — אין כניסה;
 * לעולם לא נופלים חזרה לזהות של בעל הסקריפט.
 */
function wUser_() {
  let email = '';
  try { email = wS_(Session.getActiveUser().getEmail()).toLowerCase(); }
  catch (err) {}

  const u = { email: email, name: '', role: '', scope: '', ok: false, why: '' };
  if (!email) { u.why = 'noid'; return u; }

  const admins = (CFG.ADMIN_EMAILS || [])
    .map(function (x) { return wS_(x).toLowerCase(); });
  const rec = wUsersMap_()[email] || null;
  const inDomain = (WEB.DOMAINS || []).some(function (d) {
    return email.slice(-(d.length + 1)) === '@' + String(d).toLowerCase();
  });

  if (rec) { u.name = rec.name; u.scope = rec.scope; }

  if (admins.indexOf(email) !== -1) u.role = 'מנהל';
  else if (rec && WEB.ROLES.indexOf(rec.role) !== -1) u.role = rec.role;
  else if (inDomain) u.role = WEB.DEFAULT_ROLE;
  else { u.why = 'domain'; return u; }

  u.ok = true;
  u.isAdmin = u.role === 'מנהל';
  u.seesAll = u.role === 'מנהל' || u.role === 'צופה';
  u.canWrite = u.role !== 'צופה';
  return u;
}

function wNeed_() {
  const u = wUser_();
  if (!u.ok) {
    throw new Error(u.why === 'noid'
      ? 'לא זוהה חשבון. היכנס עם החשבון הארגוני ונסה שוב.'
      : 'לחשבון ' + u.email + ' אין הרשאה לאתר. פנה למנהל המערכת.');
  }
  return u;
}

function wNeedAdmin_() {
  const u = wNeed_();
  if (!u.isAdmin) throw new Error('הפעולה הזו פתוחה למנהלי המערכת בלבד.');
  return u;
}


/** שמות המש"קיות שבאחריות המשתמש, לפי טבלת השיוך. */
function wMineSet_(u, roster) {
  const set = {};
  if (u.seesAll) return set;
  roster.forEach(function (r) {
    if (u.role === 'מנה"ד' && u.name && wSame_(r.mn, u.name)) set[r.n] = true;
    else if (u.role === 'מפקדת' && u.name && wSame_(r.mf, u.name)) set[r.n] = true;
    else if (u.role === 'מנה"ד מחוזי' && u.scope && r.mz === u.scope) set[r.n] = true;
  });
  return set;
}

function wIsOwn_(u, o) {
  if (o.by && o.by === u.email) return true;
  return !!(u.name && wSame_(o.ob, u.name));
}

function wCanSee_(u, o, mine) {
  if (u.seesAll) return true;
  if (wIsOwn_(u, o)) return true;
  if (mine[o.m]) return true;
  if (u.name) {
    if (u.role === 'מנה"ד' && wSame_(o.mn, u.name)) return true;
    if (u.role === 'מפקדת' && wSame_(o.mf, u.name)) return true;
  }
  if (u.role === 'מנה"ד מחוזי' && u.scope && o.mz === u.scope) return true;
  return false;
}

function wCanEdit_(u, o) {
  if (u.isAdmin) return true;
  if (!u.canWrite) return false;
  return wIsOwn_(u, o);
}


/* ============================================================================
   מבנה גיליון ההזנה
   ============================================================================ */

function wSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CFG.SRC);
  if (!sh) throw new Error('לא נמצא גיליון הנתונים "' + CFG.SRC + '".');
  return sh;
}

/** מפת העמודות: מפתח -> אינדקס (מאפס), לפי שמות הכותרות. */
function wCols_(sh) {
  const width = sh.getLastColumn();
  const hdr = sh.getRange(CFG.HEADER_ROW, 1, 1, width).getValues()[0]
    .map(function (x) { return wS_(x); });
  const m = colMap_(sh);

  const F = {};
  W_FIELDS.forEach(function (p) { F[p[0]] = findCol_(m, p[1]); });
  if (F.started < 0) F.started = 1;           // עמודה B, כמו בקוד הגיליון

  const crit = CFG.CRITERIA.map(function (x) {
    const k = findCol_(m, x[0]);
    const d = (k >= 0 && wS_(hdr[k + 1]).indexOf('פירוט') === 0) ? k + 1 : -1;
    return { key: x[0], label: x[2], weight: x[1], k: k, d: d,
             title: k >= 0 ? hdr[k] : x[0] };
  });

  return { F: F, crit: crit, width: width, hdr: hdr };
}

/** שורת הנתונים האחרונה שיש בה משהו. */
function wLastUsed_(sh, C) {
  const maxR = sh.getMaxRows();
  const n = maxR - CFG.FIRST_ROW + 1;
  if (n < 1) return CFG.FIRST_ROW - 1;

  const col = function (i) {
    return i >= 0 ? sh.getRange(CFG.FIRST_ROW, i + 1, n, 1).getValues() : null;
  };
  const a = col(C.F.started), b = col(C.F.mashakit), d = col(C.F.date);

  for (let i = n - 1; i >= 0; i--) {
    if ((a && a[i][0] === true) ||
        (b && wS_(b[i][0]) !== '') ||
        (d && wS_(d[i][0]) !== '')) return CFG.FIRST_ROW + i;
  }
  return CFG.FIRST_ROW - 1;
}

/** ציון משוקלל מששת הקריטריונים, או null אם חסר אחד מהם. */
function wCalcScore_(vals) {
  let sum = 0;
  for (let i = 0; i < CFG.CRITERIA.length; i++) {
    const v = vals[i];
    if (typeof v !== 'number' || !isFinite(v)) return null;
    sum += (v / 5) * CFG.CRITERIA[i][1];
  }
  return Math.round(sum * 100);
}

/** שורת גיליון -> אובייקט תצפית קומפקטי. */
function wRowToObs_(r, C, rowNum, tz) {
  const F = C.F;
  const g = function (k) {
    const i = F[k];
    return (i < 0 || i >= r.length) ? '' : r[i];
  };

  const name = wS_(g('mashakit'));
  const dateRaw = g('date');
  const iso = wIso_(dateRaw, tz);
  if (!name && !iso && wS_(dateRaw) === '') return null;      // שורה פנויה

  const c = C.crit.map(function (x) {
    if (x.k < 0) return null;
    const v = r[x.k];
    if (typeof v === 'number' && isFinite(v)) return v;
    if (wS_(v) === '-') return '-';
    const n = Number(wS_(v));
    return (wS_(v) !== '' && isFinite(n)) ? n : null;
  });

  let s = null, sm = false;
  const sv = g('score');
  if (typeof sv === 'number' && isFinite(sv)) s = Math.round(sv * 10) / 10;
  else if (wS_(sv) === 'חסר ציון') sm = true;
  if (c.indexOf('-') !== -1) sm = true;
  if (s === null && !sm) s = wCalcScore_(c);

  // נוסחת הגיליון סופרת קריטריון ריק כאפס, ולכן תצפית שמולאה
  // בחלקה מקבלת שם ציון נמוך מדי. ציון קיים רק כשכל הקריטריונים מולאו.
  const allCols = C.crit.every(function (x) { return x.k >= 0; });
  if (allCols && (c.indexOf(null) !== -1 || sm)) s = null;

  const plugah = wS_(g('plugah'));

  return {
    r: rowNum,
    m: name,
    d: iso,
    ra: wS_(g('rashut')),
    sc: wS_(g('school')),
    k: wS_(g('klass')),
    sh: wS_(g('shift')),
    le: wS_(g('lesson')),
    ro: wS_(g('role')),
    ob: wS_(g('observer')),
    mz: wS_(g('mahoz')) || wMahoz_(plugah, ''),
    pl: plugah,
    mc: wS_(g('machzor')),
    mn: wS_(g('manhad')),
    mf: wS_(g('mefakedet')),
    bo: wS_(g('boost')),
    bf: wS_(g('boostFn')),
    fb: wS_(g('feedback')),
    c: c,
    s: s,
    sm: sm,
    st: g('started') === true,
    dn: g('done') === true,
    doc: wS_(g('docUrl')),
    by: wS_(g('by')).toLowerCase()
  };
}

/** כל התצפיות. */
function wReadObs_() {
  const sh = wSheet_();
  const C = wCols_(sh);
  const last = wLastUsed_(sh, C);
  if (last < CFG.FIRST_ROW) return [];

  const tz = wTz_();
  const vals = sh.getRange(CFG.FIRST_ROW, 1, last - CFG.FIRST_ROW + 1, C.width)
    .getValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const o = wRowToObs_(vals[i], C, CFG.FIRST_ROW + i, tz);
    if (o) out.push(o);
  }
  return out;
}

function wObs_() { return wCached_('OBS', wReadObs_); }


/* ============================================================================
   טבלאות העזר
   ============================================================================ */

/** טבלת השיוך: שורה לכל צירוף מש"קית + רשות. */
function wRoster_() {
  return wCached_('ROSTER', function () {
    const sh = SpreadsheetApp.getActive().getSheetByName(CFG.MAPPING_SHEET);
    if (!sh || sh.getLastRow() < 2) return [];

    const hdrRow = wS_(sh.getRange(1, 1).getValue()) === MAP_HEAD[0] ? 1 : 2;
    const first = hdrRow + 1;
    if (sh.getLastRow() < first) return [];

    let plug = {};
    try { plug = getPlugahByRashut_() || {}; } catch (err) {}

    const out = [];
    sh.getRange(first, 1, sh.getLastRow() - hdrRow, MAP_HEAD.length).getValues()
      .forEach(function (r) {
        const name = wS_(r[0]);
        if (!name) return;
        const rashut = wS_(r[5]);
        let plugah = wS_(r[3]);
        // שורה שהערכים בה נדחפו עמודה: פלוגה שאינה פלוגה, או רשות שהיא מספר
        const sus = (plugah !== '' && (CFG.PLUGAH_LIST || []).indexOf(plugah) === -1) ||
                    /^\d{5,}$/.test(rashut);
        if (!sus && rashut) {
          const byR = plug[normRashut_(rashut)];
          if (byR) plugah = byR;
        }
        out.push({
          n: name, pid: wS_(r[1]), mc: wS_(r[2]), pl: plugah,
          mz: sus ? wS_(r[4]) : wMahoz_(plugah, r[4]),
          ra: rashut, mf: wS_(r[6]), mfp: wS_(r[7]), mn: wS_(r[8]),
          x: wS_(r[9]), sus: sus
        });
      });
    return out;
  });
}


/** הרשימות מגיליון "נתונים": שיפטים, שיעורים, תפקידים ומתצפתים. */
function wLists_() {
  return wCached_('LISTS', function () {
    const out = { shifts: [], roles: [], lessons: {}, observers: {}, machzorim: [] };
    const sh = SpreadsheetApp.getActive().getSheetByName(CFG.DATA_SHEET);
    if (!sh || sh.getLastRow() < 2) return out;

    const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    const hdr = vals[0].map(function (x) { return wS_(x); });

    const column = function (i) {
      const seen = {}, list = [];
      for (let r = 1; r < vals.length; r++) {
        const v = wS_(vals[r][i]);
        if (v && v !== '-' && !seen[v]) { seen[v] = true; list.push(v); }
      }
      return list;
    };
    const at = function (title) {
      for (let i = 0; i < hdr.length; i++) if (hdr[i] === title) return i;
      return -1;
    };
    const atNorm = function (title) {
      const t = wNorm_(title).replace(/\s/g, '');
      for (let i = 0; i < hdr.length; i++) {
        if (hdr[i] && wNorm_(hdr[i]).replace(/\s/g, '') === t) return i;
      }
      return -1;
    };

    let i = at('שם השיפט');
    if (i >= 0) out.shifts = column(i);
    i = at('תפקיד מתצפת');
    if (i >= 0) out.roles = column(i);
    i = at('מחזור');
    if (i >= 0) out.machzorim = column(i);

    out.shifts.forEach(function (s) {
      const j = at(s);
      if (j >= 0) out.lessons[s] = column(j);
    });
    out.roles.forEach(function (role) {
      const j = atNorm(role);
      if (j >= 0) out.observers[role] = column(j);
    });
    return out;
  });
}


/** רשות -> בתי הספר שלה. */
function wSchools_(obs) {
  return wCached_('SCHOOLS', function () {
    const box = {};
    const add = function (rashut, school) {
      const r = wS_(rashut), s = wS_(school);
      if (!r || !s || s === '-') return;
      if (!box[r]) box[r] = {};
      box[r][s] = true;
    };

    const sh = SpreadsheetApp.getActive().getSheetByName(CFG.SCHOOLS_SHEET);
    if (sh && sh.getLastRow() > 1) {
      const width = Math.max(sh.getLastColumn(), 2);
      const top = sh.getRange(1, 1, Math.min(sh.getLastRow(), 4), width).getValues();
      let hRow = -1, iR = -1, iS = -1;
      for (let r = 0; r < top.length; r++) {
        const h = top[r].map(function (x) { return wS_(x); });
        if (h.indexOf('רשות') !== -1 && h.indexOf('בית ספר') !== -1) {
          hRow = r + 1; iR = h.indexOf('רשות'); iS = h.indexOf('בית ספר');
          break;
        }
      }
      if (hRow > 0 && sh.getLastRow() > hRow) {
        sh.getRange(hRow + 1, 1, sh.getLastRow() - hRow, width).getValues()
          .forEach(function (row) { add(row[iR], row[iS]); });
      }
    }

    (obs || []).forEach(function (o) { add(o.ra, o.sc); });

    const out = {};
    Object.keys(box).sort().forEach(function (r) {
      out[r] = Object.keys(box[r]).sort();
    });
    return out;
  });
}


/* ============================================================================
   השלמה אוטומטית
   ============================================================================
   אותה לוגיקה של הגיליון: המפקדת והמספרים האישיים נקבעים לפי
   המש"קית, המנה"ד לפי המש"קית והרשות, הפלוגה לפי הרשות,
   והמחוז לפי הפלוגה.
   ============================================================================ */

function wResolve_(mashakit, rashut) {
  const name = wS_(mashakit);
  let chosen = wS_(rashut);
  const out = { pid: '', machzor: '', manhad: '', mefakedet: '', mefPid: '',
                plugah: '', mahoz: '', rashut: chosen, known: false };

  let pool = wRoster_().filter(function (r) { return r.n === name && !r.sus; });
  if (pool.length) {
    out.known = true;
    const all = pool;
    if (chosen) {
      const narrowed = pool.filter(function (r) { return r.ra === chosen; });
      if (narrowed.length) pool = narrowed;
    }
    const uniq = function (list, f) {
      const s = [];
      list.forEach(function (r) { if (r[f] && s.indexOf(r[f]) === -1) s.push(r[f]); });
      return s.length === 1 ? s[0] : '';
    };
    out.pid = uniq(all, 'pid') || uniq(pool, 'pid');
    out.machzor = uniq(all, 'mc') || uniq(pool, 'mc');
    out.mefakedet = uniq(all, 'mf') || uniq(pool, 'mf');
    out.mefPid = uniq(all, 'mfp') || uniq(pool, 'mfp');
    out.manhad = uniq(pool, 'mn');
    if (!chosen) { chosen = uniq(pool, 'ra'); out.rashut = chosen; }
    out.mahoz = uniq(pool, 'mz');
  }

  if (chosen) {
    let tbl = {};
    try { tbl = getPlugahByRashut_() || {}; } catch (err) {}
    out.plugah = tbl[normRashut_(chosen)] || '';
  }
  out.mahoz = wMahoz_(out.plugah, out.mahoz);
  return out;
}


/* ============================================================================
   טעינת האתר
   ============================================================================ */

function apiInit() {
  const u = wUser_();
  if (!u.ok) return { ok: false, why: u.why, email: u.email };

  const tz = wTz_();
  const sh = wSheet_();
  const C = wCols_(sh);
  const all = wObs_();
  const roster = wRoster_();
  const lists = wLists_();
  const schools = wSchools_(all);
  const mine = wMineSet_(u, roster);

  const obs = u.seesAll ? all
    : all.filter(function (o) { return wCanSee_(u, o, mine); });

  let plug = {};
  try { plug = getPlugahByRashut_() || {}; } catch (err) {}

  const rashuyot = {};
  roster.forEach(function (r) { if (r.ra && !r.sus) rashuyot[r.ra] = true; });
  Object.keys(schools).forEach(function (k) { rashuyot[k] = true; });

  let sheetUrl = '';
  if (u.isAdmin) {
    try { sheetUrl = SpreadsheetApp.getActive().getUrl(); } catch (err) {}
  }

  return {
    ok: true,
    user: { email: u.email, name: u.name, role: u.role, scope: u.scope,
            isAdmin: u.isAdmin, seesAll: u.seesAll, canWrite: u.canWrite },
    cfg: {
      title: WEB.TITLE,
      version: WEB.VERSION,
      criteria: C.crit.map(function (x) {
        return { key: x.key, label: x.label, weight: x.weight, title: x.title };
      }),
      low: CFG.LOW_SCORE,
      feedbackDays: CFG.FEEDBACK_DAYS,
      staleDays: CFG.STALE_DAYS,
      riskDrop: CFG.RISK_DROP,
      riskWeak: CFG.RISK_WEAK_CRIT,
      target: CFG.MASHAKIT_TARGET,
      weeklyTarget: CFG.WEEKLY_TARGET,
      semesters: CFG.SEMESTERS,
      schoolStart: CFG.SCHOOL_START,
      plugot: CFG.PLUGAH_LIST || [],
      madmach: CFG.MADMACH_SHIFTS || [],
      activityRoles: [CFG.ROLE_MANHAD, CFG.ROLE_MEFAKEDET],
      feedback: WEB.FEEDBACK,
      boostFn: WEB.BOOST_FN,
      noBoost: WEB.NO_BOOST,
      noBoostFn: WEB.NO_BOOST_FN,
      userRoles: WEB.ROLES,
      finishRequired: WEB.FINISH_REQUIRED,
      labels: W_LABELS,
      sheetUrl: sheetUrl
    },
    lists: lists,
    roster: roster.map(function (r) {
      const x = { n: r.n, ra: r.ra, pl: r.pl, mz: r.mz, mc: r.mc,
                  mf: r.mf, mn: r.mn, sus: r.sus };
      if (u.isAdmin) { x.pid = r.pid; x.x = r.x; }
      return x;
    }),
    mine: Object.keys(mine),
    schools: schools,
    plugahByRashut: plug,
    rashuyot: Object.keys(rashuyot).sort(),
    obs: obs.map(function (o) {
      const x = {};
      Object.keys(o).forEach(function (k) { x[k] = o[k]; });
      x.e = wCanEdit_(u, o);
      return x;
    }),
    today: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
    stamp: wFresh_()
  };
}


/** רענון ביוזמת המשתמש: מאפס את המטמון וטוען מחדש. */
function apiRefresh() {
  wNeed_();
  wBump_();
  return apiInit();
}


/* ============================================================================
   תצפית בודדת
   ============================================================================ */

function wReadRow_(sh, C, row) {
  return sh.getRange(row, 1, 1, C.width).getValues()[0];
}

function wDetail_(r, C, o) {
  const F = C.F;
  const t = function (k) { return (F[k] >= 0) ? wS_(r[F[k]]) : ''; };
  return {
    details: C.crit.map(function (x) { return x.d >= 0 ? wS_(r[x.d]) : ''; }),
    keep: t('keep'),
    improve: t('improve'),
    personal: t('personal'),
    boostNote: t('boostNote'),
    docStatus: t('docStatus')
  };
}

/** מוודא שהשורה היא עדיין אותה תצפית שהדפדפן מחזיק. */
function wCheckFp_(o, fp) {
  if (fp === undefined || fp === null) return;
  const now = (o ? o.m : '') + '|' + (o ? o.d : '');
  if (now !== String(fp)) {
    throw new Error('השורה השתנתה בגיליון מאז שהנתונים נטענו. ' +
                    'רענן את האתר ונסה שוב.');
  }
}

function apiObservation(row, fp) {
  const u = wNeed_();
  const n = Number(row);
  if (!(n >= CFG.FIRST_ROW)) throw new Error('תצפית לא תקינה.');

  const sh = wSheet_();
  const C = wCols_(sh);
  const r = wReadRow_(sh, C, n);
  const o = wRowToObs_(r, C, n, wTz_());
  if (!o) throw new Error('התצפית לא נמצאה. ייתכן שנמחקה.');
  wCheckFp_(o, fp);

  const mine = wMineSet_(u, wRoster_());
  if (!wCanSee_(u, o, mine)) throw new Error('אין לך הרשאה לצפות בתצפית הזו.');

  o.e = wCanEdit_(u, o);
  o.x = wDetail_(r, C, o);
  return o;
}


/* ============================================================================
   יומן שינויים
   ============================================================================ */

function wLog_(u, row, entries) {
  try {
    if (!entries || !entries.length) return;
    const sh = SpreadsheetApp.getActive().getSheetByName(CFG.LOG_SHEET);
    if (!sh) return;
    const now = new Date();
    const rows = entries.map(function (e) {
      return [now, u.email + ' (אתר)', CFG.SRC,
              e.a1 || '', row, e.field || '', e.oldV || '', e.newV || ''];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);

    const n = sh.getLastRow() - 1;
    if (n > CFG.LOG_MAX + (CFG.LOG_SLACK || 0)) sh.deleteRows(2, n - CFG.LOG_MAX);
  } catch (err) {}
}


/* ============================================================================
   שמירה
   ============================================================================
   הכתיבה היא לשורה במאגר השורות הקיים, תא אחרי תא ולפי שם
   הכותרת. נכתב רק מה שהשתנה, כך שנוסחה שמחזירה כבר את הערך
   הנכון נשארת נוסחה. נוסחת הציון אינה נדרסת לעולם.
   ============================================================================ */

function apiSave(p) {
  const u = wNeed_();
  if (!u.canWrite) throw new Error('לתפקיד "' + u.role + '" אין הרשאת הזנה.');

  p = p || {};
  const f = p.f || {};
  const finish = p.finish === true;

  const name = wS_(f.mashakit);
  const date = wDate_(f.date, wTz_());
  if (!name) throw new Error('חובה לבחור מש"קית.');
  if (!date) throw new Error('חובה למלא תאריך.');

  const scores = [];
  for (let i = 0; i < CFG.CRITERIA.length; i++) {
    const v = (f.scores || [])[i];
    if (v === '-' ) scores.push('-');
    else if (v === null || v === undefined || v === '') scores.push(null);
    else {
      const n = Math.round(Number(v));
      scores.push((n >= 1 && n <= 5) ? n : null);
    }
  }

  if (finish) {
    const missing = [];
    WEB.FINISH_REQUIRED.forEach(function (k) {
      if (k === 'scores') {
        if (scores.indexOf(null) !== -1) missing.push(W_LABELS.scores);
      } else if (k === 'date') {
        // נבדק למעלה
      } else if (wS_(f[k]) === '') {
        missing.push(W_LABELS[k] || k);
      }
    });
    if (missing.length) {
      throw new Error('כדי לסיים את התצפית חסר: ' + missing.join(', ') + '.');
    }
  }

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(25000)) {
    throw new Error('המערכת עסוקה כרגע. נסה שוב בעוד רגע.');
  }

  try {
    const sh = wSheet_();
    let C = wCols_(sh);
    const tz = wTz_();
    const isNew = !(Number(p.row) >= CFG.FIRST_ROW);

    // עמודת "הוזן באתר" — נוצרת פעם אחת, בסוף הגיליון
    if (C.F.by < 0) {
      const col = sh.getLastColumn() + 1;
      if (sh.getMaxColumns() < col) sh.insertColumnAfter(sh.getMaxColumns());
      sh.getRange(CFG.HEADER_ROW, col).setValue(WEB.BY_COL);
      SpreadsheetApp.flush();
      C = wCols_(sh);
    }
    const F = C.F;

    let row, before = null, old = null;

    if (isNew) {
      // אותה תצפית בדיוק כבר קיימת? עוצרים לפני כפילות
      if (!p.force) {
        const iso = wIso_(date, tz);
        const dup = wObs_().filter(function (o) {
          return o.m === name && o.d === iso &&
                 wSame_(o.ob, f.observer) && o.le === wS_(f.lesson) &&
                 o.sc === wS_(f.school);
        })[0];
        if (dup) return { ok: false, dup: dup.r };
      }
      row = wLastUsed_(sh, C) + 1;
      if (row < CFG.FIRST_ROW) row = CFG.FIRST_ROW;
      if (row > sh.getMaxRows()) {
        try { topUpRowPool(); } catch (err) {}
        if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);
      }
      before = wReadRow_(sh, C, row);
    } else {
      row = Number(p.row);
      before = wReadRow_(sh, C, row);
      old = wRowToObs_(before, C, row, tz);
      if (!old) throw new Error('התצפית לא נמצאה. ייתכן שנמחקה.');
      wCheckFp_(old, p.fp);
      if (!wCanEdit_(u, old)) throw new Error('אין לך הרשאה לערוך את התצפית הזו.');
    }

    const formulas = sh.getRange(row, 1, 1, C.width).getFormulas()[0];
    const fill = wResolve_(name, f.rashut);
    const wasDone = old ? old.dn : false;
    const done = finish || wasDone;

    let boost = wS_(f.boost);
    let boostFn = wS_(f.boostFn);
    const details = C.crit.map(function (x, i) { return wS_((f.details || [])[i]); });
    let personal = wS_(f.personal);

    if (done) {
      if (!boost) boost = WEB.NO_BOOST;
      if (!boostFn && boost === WEB.NO_BOOST) boostFn = WEB.NO_BOOST_FN;
      if (WEB.FILL_EMPTY) {
        for (let i = 0; i < details.length; i++) {
          if (!details[i]) details[i] = WEB.FILL_EMPTY;
        }
        if (!personal) personal = WEB.FILL_EMPTY;
      }
    }

    // ---- מה צריך להיות בכל תא ----
    const want = [];
    const put = function (idx, value, label) {
      if (idx < 0 || value === undefined) return;
      want.push({ idx: idx, value: value, label: label });
    };

    put(F.started, true, 'תחילת תצפית');
    put(F.mashakit, name, 'מש"קית');
    put(F.rashut, fill.rashut, 'רשות');

    // שדות השיוך: נכתבים רק אם יש ערך. מש"קית שאינה בקובץ
    // השיוך לא מוחקת מה שכבר כתוב בשורה.
    [['pid', fill.pid, 'מ.א מש"קית'], ['machzor', fill.machzor, 'מחזור'],
     ['plugah', fill.plugah, 'פלוגה'], ['mahoz', fill.mahoz, 'מחוז'],
     ['manhad', fill.manhad, 'מנה"ד'], ['mefakedet', fill.mefakedet, 'מפקדת'],
     ['mefPid', fill.mefPid, 'מ.א מפקדת']].forEach(function (x) {
      if (x[1] !== '') put(F[x[0]], x[1], x[2]);
    });

    put(F.boost, boost, 'מש"קית מתגברת');
    put(F.school, wS_(f.school), 'בית ספר');
    put(F.klass, wS_(f.klass), 'כיתה');
    put(F.shift, wS_(f.shift), 'שיפט');
    put(F.lesson, wS_(f.lesson), 'שיעור');
    put(F.role, wS_(f.role), 'תפקיד המתצפת');
    put(F.observer, wS_(f.observer), 'שם המתצפת');
    put(F.date, date, 'תאריך');

    C.crit.forEach(function (x, i) {
      put(x.k, scores[i] === null ? '' : scores[i], x.label);
      put(x.d, details[i], 'פירוט ' + x.label);
    });

    put(F.keep, wS_(f.keep), 'נקודות לשימור');
    put(F.improve, wS_(f.improve), 'נקודות לשיפור');
    put(F.personal, personal, 'התייחסות אישית');
    put(F.boostFn, boostFn, 'תפקוד המתגברת');
    put(F.boostNote, wS_(f.boostNote), 'הערות מתגברת');
    put(F.feedback, wS_(f.feedback), 'הועבר משוב');
    put(F.done, done, 'סיום תצפית');
    if (isNew) put(F.by, u.email, WEB.BY_COL);

    // ---- כתיבת ההבדלים בלבד ----
    const log = [];
    want.forEach(function (w) {
      const cur = before[w.idx];
      let same;
      if (w.value instanceof Date) {
        same = (cur instanceof Date) && wIso_(cur, tz) === wIso_(w.value, tz);
      } else if (typeof w.value === 'boolean') {
        same = (cur === true) === w.value;
      } else if (typeof w.value === 'number') {
        same = (typeof cur === 'number' && cur === w.value);
      } else {
        same = wS_(cur) === w.value;
      }
      if (same) return;

      const cell = sh.getRange(row, w.idx + 1);
      if (w.value === '' && typeof w.value === 'string') cell.clearContent();
      else cell.setValue(typeof w.value === 'string' ? wText_(w.value) : w.value);

      if (!isNew && w.label !== 'תחילת תצפית') {
        log.push({ a1: colLetter_(w.idx) + row, field: w.label,
                   oldV: wShow_(cur, tz), newV: wShow_(w.value, tz) });
      }
    });

    // ---- הציון: רק אם אין שם נוסחה ----
    if (F.score >= 0 && !formulas[F.score]) {
      const calc = wCalcScore_(scores);
      const sv = (scores.indexOf('-') !== -1) ? 'חסר ציון' : (calc === null ? '' : calc);
      if (wS_(before[F.score]) !== String(sv)) {
        const cell = sh.getRange(row, F.score + 1);
        if (sv === '') cell.clearContent(); else cell.setValue(sv);
      }
    }

    SpreadsheetApp.flush();

    if (isNew) {
      wLog_(u, row, [{ a1: 'שורה ' + row, field: 'תצפית חדשה',
                       oldV: '', newV: name + ' — ' + wShow_(date, tz) }]);
    } else {
      wLog_(u, row, log);
    }

    wBump_();

    const after = wReadRow_(sh, C, row);
    const o = wRowToObs_(after, C, row, tz);
    o.e = true;
    o.x = wDetail_(after, C, o);
    return { ok: true, isNew: isNew, obs: o, stamp: wFresh_() };

  } finally {
    lock.releaseLock();
  }
}


/** סימון "הועבר משוב" בלחיצה אחת. */
function apiSetFeedback(row, fp, value) {
  const u = wNeed_();
  const v = wS_(value);
  if (WEB.FEEDBACK.indexOf(v) === -1) throw new Error('ערך משוב לא תקין.');

  const n = Number(row);
  const sh = wSheet_();
  const C = wCols_(sh);
  const tz = wTz_();
  const r = wReadRow_(sh, C, n);
  const o = wRowToObs_(r, C, n, tz);
  if (!o) throw new Error('התצפית לא נמצאה.');
  wCheckFp_(o, fp);

  const mine = wMineSet_(u, wRoster_());
  const allowed = wCanEdit_(u, o) ||
    (u.canWrite && !u.seesAll && wCanSee_(u, o, mine));
  if (!allowed) throw new Error('אין לך הרשאה לעדכן את התצפית הזו.');
  if (C.F.feedback < 0) throw new Error('לא נמצאה עמודת המשוב בגיליון.');

  sh.getRange(n, C.F.feedback + 1).setValue(v);
  SpreadsheetApp.flush();
  wLog_(u, n, [{ a1: colLetter_(C.F.feedback) + n, field: 'הועבר משוב',
                 oldV: o.fb, newV: v }]);
  wBump_();
  return { ok: true, row: n, fb: v, stamp: wFresh_() };
}


/**
 * מחיקת תצפית — מנהלים בלבד.
 * מתרוקנים רק התאים שהאתר כותב אליהם. הנוסחאות שבשורה
 * נשארות, והשורה חוזרת להיות שורה פנויה במאגר.
 */
function apiDelete(row, fp) {
  const u = wNeedAdmin_();
  const n = Number(row);
  if (!(n >= CFG.FIRST_ROW)) throw new Error('שורה לא תקינה.');

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(25000)) throw new Error('המערכת עסוקה כרגע. נסה שוב בעוד רגע.');

  try {
    const sh = wSheet_();
    const C = wCols_(sh);
    const tz = wTz_();
    const r = wReadRow_(sh, C, n);
    const o = wRowToObs_(r, C, n, tz);
    if (!o) throw new Error('התצפית לא נמצאה.');
    wCheckFp_(o, fp);

    const formulas = sh.getRange(n, 1, 1, C.width).getFormulas()[0];
    const F = C.F;
    const idxs = [];
    ['mashakit', 'pid', 'mahoz', 'machzor', 'plugah', 'manhad', 'mefakedet',
     'mefPid', 'boost', 'rashut', 'school', 'klass', 'shift', 'lesson', 'role',
     'observer', 'date', 'keep', 'improve', 'personal', 'boostFn', 'boostNote',
     'feedback', 'by'].forEach(function (k) { if (F[k] >= 0) idxs.push(F[k]); });
    C.crit.forEach(function (x) {
      if (x.k >= 0) idxs.push(x.k);
      if (x.d >= 0) idxs.push(x.d);
    });

    idxs.forEach(function (i) {
      if (formulas[i]) return;                       // נוסחה נשארת
      if (wS_(r[i]) === '' ) return;
      sh.getRange(n, i + 1).clearContent();
    });
    if (F.score >= 0 && !formulas[F.score]) sh.getRange(n, F.score + 1).clearContent();
    if (F.started >= 0) sh.getRange(n, F.started + 1).setValue(false);
    if (F.done >= 0) sh.getRange(n, F.done + 1).setValue(false);

    SpreadsheetApp.flush();
    wLog_(u, n, [{ a1: 'שורה ' + n, field: 'תצפית נמחקה',
                   oldV: o.m + ' — ' + o.d + ' — ' + o.ob, newV: '' }]);
    wBump_();
    return { ok: true, row: n, stamp: wFresh_() };

  } finally {
    lock.releaseLock();
  }
}


/* ============================================================================
   ניהול
   ============================================================================ */

function apiLog() {
  wNeedAdmin_();
  const sh = SpreadsheetApp.getActive().getSheetByName(CFG.LOG_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];

  const tz = wTz_();
  const last = sh.getLastRow();
  const from = Math.max(2, last - WEB.LOG_VIEW + 1);
  return sh.getRange(from, 1, last - from + 1, LOG_HEAD.length).getValues()
    .filter(function (r) { return r[0] instanceof Date; })
    .map(function (r) {
      return {
        t: Utilities.formatDate(r[0], tz, 'dd/MM/yyyy HH:mm'),
        who: wS_(r[1]), cell: wS_(r[3]), row: wS_(r[4]),
        field: wS_(r[5]), oldV: wShow_(r[6], tz), newV: wShow_(r[7], tz)
      };
    })
    .reverse();
}


function wUsersSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(WEB.USERS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(WEB.USERS_SHEET);
    sh.getRange(1, 1, 1, WEB.USERS_HEAD.length).setValues([WEB.USERS_HEAD]);
    try {
      sh.setRightToLeft(true);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, WEB.USERS_HEAD.length).setFontWeight('bold');
      sh.setColumnWidth(1, 240);
    } catch (err) {}
  }
  return sh;
}

function apiUsers() {
  wNeedAdmin_();
  const map = wUsersMap_();
  const admins = (CFG.ADMIN_EMAILS || [])
    .map(function (x) { return wS_(x).toLowerCase(); });

  const users = Object.keys(map).sort().map(function (email) {
    return { email: email, name: map[email].name, role: map[email].role,
             scope: map[email].scope, fixed: admins.indexOf(email) !== -1 };
  });
  admins.forEach(function (a) {
    if (!map[a]) users.unshift({ email: a, name: '', role: 'מנהל', scope: '', fixed: true });
  });

  // שמות מוכרים, כדי שהשם ייבחר מרשימה ולא יוקלד עם שגיאה
  const names = {};
  wRoster_().forEach(function (r) {
    if (r.sus) return;
    if (r.mn) names[r.mn] = true;
    if (r.mf) names[r.mf] = true;
  });
  const lists = wLists_();
  Object.keys(lists.observers || {}).forEach(function (k) {
    lists.observers[k].forEach(function (n) { names[n] = true; });
  });

  return { users: users, names: Object.keys(names).sort(),
           mehozot: ['צפון', 'דרום'] };
}

function apiUserSave(rec) {
  wNeedAdmin_();
  rec = rec || {};
  const email = wS_(rec.email).toLowerCase();
  const role = wS_(rec.role);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('כתובת אימייל לא תקינה.');
  if (WEB.ROLES.indexOf(role) === -1) throw new Error('תפקיד לא תקין.');
  if ((role === 'מנה"ד' || role === 'מפקדת') && !wS_(rec.name)) {
    throw new Error('לתפקיד הזה חובה לבחור שם — לפיו נקבע מה המשתמש רואה.');
  }
  if (role === 'מנה"ד מחוזי' && !wS_(rec.scope)) {
    throw new Error('למנה"ד מחוזי חובה לבחור מחוז.');
  }

  const sh = wUsersSheet_();
  const last = sh.getLastRow();
  const line = [wText_(email), wText_(rec.name), role,
                role === 'מנה"ד מחוזי' ? wText_(rec.scope) : '', new Date()];
  let at = -1;
  if (last >= 2) {
    const col = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < col.length; i++) {
      if (wS_(col[i][0]).toLowerCase() === email) { at = i + 2; break; }
    }
  }
  if (at < 0) at = last + 1;
  sh.getRange(at, 1, 1, line.length).setValues([line]);
  SpreadsheetApp.flush();
  wBump_();
  return apiUsers();
}

function apiUserDelete(email) {
  wNeedAdmin_();
  const e = wS_(email).toLowerCase();
  const sh = SpreadsheetApp.getActive().getSheetByName(WEB.USERS_SHEET);
  if (sh && sh.getLastRow() >= 2) {
    const col = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (let i = col.length - 1; i >= 0; i--) {
      if (wS_(col[i][0]).toLowerCase() === e) sh.deleteRow(i + 2);
    }
    SpreadsheetApp.flush();
  }
  wBump_();
  return apiUsers();
}


/** סנכרון טבלת השיוך מקובץ "כא גשרים". */
function apiSyncRoster() {
  wNeedAdmin_();
  let err = '';
  try { syncRosterFromFile(true); }
  catch (e) { err = (e && e.message) ? e.message : String(e); }
  wBump_();

  const roster = wRoster_();
  const names = {};
  roster.forEach(function (r) { names[r.n] = true; });
  if (!roster.length && err) throw new Error('הסנכרון נכשל: ' + err);

  return {
    ok: true,
    mashakiot: Object.keys(names).length,
    rows: roster.length,
    incomplete: roster.filter(function (r) { return r.x; }).length
  };
}

/** הפקת המצגת החודשית. */
function apiPresentation() {
  wNeedAdmin_();
  let url = '';
  try { url = buildMonthlyPresentation() || ''; }
  catch (e) {
    throw new Error('הפקת המצגת נכשלה: ' + ((e && e.message) ? e.message : e));
  }
  if (!url) {
    throw new Error('המצגת לא נוצרה. היא נבנית מהגרפים שבגיליון "דשבורד" — ' +
                    'ודא שהוא קיים, או הרץ "רענן הכול" בגיליון.');
  }
  return { ok: true, url: url };
}
