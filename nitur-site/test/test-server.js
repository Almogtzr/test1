const { Server } = require('./gas-sim.js');
const { build } = require('./workbook.js');
const path = require('path');
const OUT = path.join(__dirname, '..') + '/';
const MAIN = OUT + 'gas/SheetCode.gs';
const WEBGS = OUT + 'gas/WebApp.gs';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + msg); } }
function throws(fn, re, msg) {
  try { fn(); fail++; console.log('  ✗ FAIL (לא נזרקה שגיאה): ' + msg); }
  catch (e) { if (re.test(e.message)) pass++; else { fail++; console.log('  ✗ FAIL: ' + msg + ' — התקבל: ' + e.message); } }
}
function section(t) { console.log('\n— ' + t); }

const T = build();
const S = new Server(T.wb, [MAIN, WEBGS]);
const ADMIN = 'almogt@cyber.org.il', OBS = 'dana@cyber.org.il', OTHER = 'yossi@cyber.org.il';
const main = T.wb.getSheetByName('ניטור תצפיות');

section('טעינה כמנהל');
let a = S.call(ADMIN, 'apiInit');
ok(a.ok && a.user.isAdmin && a.user.role === 'מנהל', 'מנהל מזוהה');
ok(a.obs.length === T.lastData - 4, 'כל התצפיות נטענו: ' + a.obs.length + ' מול ' + (T.lastData - 4));
ok(a.cfg.criteria.length === 6 && a.cfg.criteria[0].title.indexOf('מפגינה שליטה') > 0, 'כותרות הקריטריונים המלאות');
ok(a.lists.shifts.length === 6 && a.lists.lessons['מדמח_א'].length === 27, 'שיפטים ושיעורים');
ok(a.lists.roles.length === 7 && a.lists.observers['מנה"ד מחוזי'] && a.lists.observers['מ"מ'], 'מתצפתים לפי תפקיד (התאמת גרשיים)');
ok(a.roster.length === 67 && a.roster.filter(r => r.sus).length === 1, 'שיוך, כולל שורה חשודה אחת');
ok(a.roster[0].pid, 'מנהל מקבל מספר אישי');
ok(Object.keys(a.schools).length >= 14, 'בתי ספר לפי רשות');
ok(a.cfg.sheetUrl, 'קישור לגיליון למנהל');
const dash = a.obs.filter(o => o.sm)[0];
ok(dash && dash.s === null && dash.c.indexOf('-') !== -1, 'מקף בקריטריון = חסר ציון');
ok(a.obs.filter(o => !o.d).length === 1, 'שורה בלי תאריך נטענת ומסומנת');
ok(a.obs.every(o => o.e === true), 'מנהל יכול לערוך הכל');
const part = a.obs.filter(o => !o.dn && o.c.indexOf(null) !== -1)[0];
ok(part && part.s === null, 'תצפית שמולאה בחלקה אינה מקבלת ציון (נוסחת הגיליון הייתה נותנת לה ציון נמוך מדי)');
const sizes = S.calls[S.calls.length - 1];
console.log('  גודל תשובת הטעינה: ' + Math.round(sizes.bytes / 1024) + 'KB');

section('מטמון');
const keys0 = Object.keys(T.wb.cache).length;
ok(keys0 > 0, 'נכתב מטמון');
ok(Object.keys(T.wb.cache).every(k => T.wb.cache[k].length <= 100000), 'אף ערך לא חורג מ-100KB');
a = S.call(ADMIN, 'apiInit');
ok(Object.keys(T.wb.cache).length === keys0, 'טעינה שנייה משתמשת במטמון');

section('זהות והרשאות');
let r = S.call('', 'apiInit');
ok(r.ok === false && r.why === 'noid', 'בלי זהות — אין כניסה (ולא נפילה לזהות הבעלים)');
r = S.call('stranger@gmail.com', 'apiInit');
ok(r.ok === false && r.why === 'domain', 'מחוץ לארגון — נחסם');
throws(() => S.call('stranger@gmail.com', 'apiSave', [{ f: { mashakit: 'x', date: '2026-11-01' } }]), /אין הרשאה/, 'זר לא יכול לשמור');
throws(() => S.call('', 'apiObservation', [5]), /לא זוהה/, 'בלי זהות לא קוראים תצפית');
let o1 = S.call(OBS, 'apiInit');
ok(o1.ok && o1.user.role === 'מתצפת' && o1.obs.length === 0, 'משתמש ארגוני לא רשום = מתצפת, לא רואה תצפיות של אחרים');
ok(!o1.roster[0].pid && o1.roster[0].x === undefined, 'מתצפת לא מקבל מספרים אישיים');
ok(!o1.cfg.sheetUrl, 'מתצפת לא מקבל קישור לגיליון');
throws(() => S.call(OBS, 'apiObservation', [5]), /אין לך הרשאה/, 'מתצפת לא קורא תצפית זרה');
throws(() => S.call(OBS, 'apiUsers'), /מנהלי המערכת/, 'מתצפת לא מנהל משתמשים');
throws(() => S.call(OBS, 'apiDelete', [5]), /מנהלי המערכת/, 'מתצפת לא מוחק');
throws(() => S.call(OBS, 'apiLog'), /מנהלי המערכת/, 'מתצפת לא רואה יומן');

section('שמירת טיוטה');
const ro = T.roster[3];
const lastBefore = T.lastData;
let sv = S.call(OBS, 'apiSave', [{ f: { mashakit: ro.name, date: a.today, rashut: '' } }]);
ok(sv.ok && sv.isNew && sv.obs.r === lastBefore + 1, 'נכתב לשורה הפנויה הבאה: ' + sv.obs.r);
ok(sv.obs.ra === ro.rashut && sv.obs.mn === ro.manhad && sv.obs.mf === ro.mef && sv.obs.pl === ro.plugah, 'שיוך הושלם אוטומטית');
ok(sv.obs.mz === ro.mahoz, 'מחוז נגזר מהפלוגה');
ok(sv.obs.st === true && sv.obs.dn === false, 'טיוטה: התחילה, לא הסתיימה');
ok(sv.obs.by === OBS, 'נרשם מי הזין');
const hdr = main.getRange(4, 1, 1, main.getLastColumn()).getValues()[0];
ok(hdr[99] === 'הוזן באתר' && main.getMaxColumns() === 100, 'עמודת "הוזן באתר" נוספה בסוף');
ok(main.formulas[sv.obs.r + ',32'] === '=SCORE', 'נוסחת הציון לא נדרסה');
ok(String(main.getRange(sv.obs.r, 4).getValue()) === ro.pid, 'מספר אישי נכתב לגיליון');
const row1 = sv.obs.r, fp1 = sv.obs.m + '|' + sv.obs.d;

o1 = S.call(OBS, 'apiInit');
ok(o1.obs.length === 1 && o1.obs[0].r === row1 && o1.obs[0].e, 'המתצפת רואה את הטיוטה שלו ויכול לערוך');
r = S.call(OTHER, 'apiInit');
ok(r.obs.length === 0, 'מתצפת אחר לא רואה אותה');
throws(() => S.call(OTHER, 'apiSave', [{ row: row1, fp: fp1, f: { mashakit: ro.name, date: a.today } }]), /אין לך הרשאה לערוך/, 'מתצפת אחר לא עורך');

section('סיום תצפית');
throws(() => S.call(OBS, 'apiSave', [{ row: row1, fp: fp1, finish: true, f: { mashakit: ro.name, date: a.today, rashut: ro.rashut } }]), /חסר: .*בית ספר.*ציונים/, 'סיום בלי שדות חובה נדחה, עם פירוט מה חסר');
const full = { mashakit: ro.name, date: a.today, rashut: ro.rashut, school: 'מקיף א', klass: "ז'1", shift: 'Shift2Tech',
  lesson: 'מפגש 2: Shift2Tech', role: 'מנהד אזורי', observer: 'דנה בדיקה', scores: [5, 4, 4, 3, 4, 5],
  details: ['שולטת היטב', '', '', '', '', ''], keep: 'פתיחה מצוינת', improve: 'ניהול זמן', personal: '', feedback: 'לא' };
sv = S.call(OBS, 'apiSave', [{ row: row1, fp: fp1, finish: true, f: full }]);
ok(sv.ok && !sv.isNew && sv.obs.dn === true, 'הסתיימה');
ok(sv.obs.s === Math.round((5 / 5 * .10 + 4 / 5 * .15 + 4 / 5 * .15 + 3 / 5 * .15 + 4 / 5 * .15 + 5 / 5 * .30) * 100), 'הציון חושב על ידי נוסחת הגיליון: ' + sv.obs.s);
ok(sv.obs.bo === 'אין' && sv.obs.bf === 'אין מתגברת', 'בלי מתגברת — מולא "אין"');
ok(sv.obs.x.details[0] === 'שולטת היטב' && sv.obs.x.details[1] === '-' && sv.obs.x.personal === '-', 'שדות רשות ריקים קיבלו מקף בסיום');
ok(main.getRange(row1, 19).getValue() instanceof Date, 'התאריך נכתב כתאריך אמיתי');
ok(typeof main.getRange(row1, 20).getValue() === 'number', 'הציונים נכתבו כמספרים');

section('תצפית חדשה מלאה, כפילות, מקף');
sv = S.call(OBS, 'apiSave', [{ finish: true, f: full }]);
ok(sv.ok === false && sv.dup === row1, 'כפילות מזוהה ולא נכתבת');
sv = S.call(OBS, 'apiSave', [{ finish: true, force: true, f: Object.assign({}, full, { scores: [5, 4, '-', 3, 4, 5], lesson: 'מפגש 3: Shift2Tech' }) }]);
ok(sv.ok && sv.obs.r === row1 + 1 && sv.obs.sm === true && sv.obs.s === null, 'מקף = "חסר ציון", כמו בגיליון');
const row2 = sv.obs.r, fp2 = sv.obs.m + '|' + sv.obs.d;
throws(() => S.call(OBS, 'apiSave', [{ f: { mashakit: '', date: a.today } }]), /מש"קית/, 'בלי מש"קית');
throws(() => S.call(OBS, 'apiSave', [{ f: { mashakit: ro.name, date: '32/13' } }]), /תאריך/, 'תאריך לא תקין');

section('מש"קית בשתי רשויות, ומש"קית לא מוכרת');
const multi = T.roster[0];
sv = S.call(ADMIN, 'apiSave', [{ f: { mashakit: multi.name, date: a.today, rashut: 'כרמיאל' } }]);
ok(sv.obs.ra === 'כרמיאל' && sv.obs.mn === 'דוד אלפיא' && sv.obs.pl === 'צפון א', 'הרשות שנבחרה קובעת מנה"ד ופלוגה');
const row3 = sv.obs.r;
sv = S.call(ADMIN, 'apiSave', [{ f: { mashakit: multi.name, date: '2026-10-02', rashut: '' } }]);
ok(sv.obs.ra === '' && sv.obs.mf === multi.mef, 'בלי רשות ועם שתי אפשרויות: רשות ריקה, מפקדת כן');
sv = S.call(ADMIN, 'apiSave', [{ f: { mashakit: 'שם שלא קיים', date: a.today, rashut: 'שלומי' } }]);
ok(sv.ok && sv.obs.mn === '' && sv.obs.pl === 'צפון א' && sv.obs.mz === 'צפון', 'לא מוכרת: נשמרת, פלוגה ומחוז לפי הרשות');

section('עריכה, טביעת אצבע ויומן');
const logSh = T.wb.getSheetByName('יומן שינויים');
const logBefore = logSh.getLastRow();
throws(() => S.call(ADMIN, 'apiSave', [{ row: row1, fp: 'מישהי אחרת|2026-01-01', f: full }]), /השורה השתנתה/, 'טביעת אצבע שגויה נדחית');
sv = S.call(ADMIN, 'apiSave', [{ row: row1, fp: fp1, f: Object.assign({}, full, { scores: [5, 5, 4, 3, 4, 5], keep: 'פתיחה מצוינת מאוד', details: ['שולטת היטב', '-', '-', '-', '-', '-'], personal: '-', boost: 'אין', boostFn: 'אין מתגברת' }) }]);
ok(sv.ok && sv.obs.dn === true, 'עריכת מנהל לא מבטלת סיום');
const added = logSh.getLastRow() - logBefore;
ok(added === 2, 'נרשמו ביומן בדיוק שני השדות שהשתנו (התקבל ' + added + ')');
const lg = S.call(ADMIN, 'apiLog');
ok(lg.length >= 2 && lg[0].who.indexOf(ADMIN) === 0 && /אתר/.test(lg[0].who), 'היומן מוצג, החדש ראשון, עם ציון המקור');
ok(lg.some(x => x.field === 'תצפית חדשה'), 'תצפית חדשה נרשמת ביומן');

section('משוב');
r = S.call(OBS, 'apiSetFeedback', [row1, fp1, 'כן']);
ok(r.ok && main.getRange(row1, 38).getValue() === 'כן', 'סימון משוב נכתב');
throws(() => S.call(OBS, 'apiSetFeedback', [row1, fp1, 'אולי']), /לא תקין/, 'ערך משוב לא חוקי');
throws(() => S.call(OTHER, 'apiSetFeedback', [row1, fp1, 'כן']), /אין לך הרשאה/, 'זר לא מסמן משוב');

section('משתמשים ותפקידים');
let us = S.call(ADMIN, 'apiUsers');
ok(us.users.length === 2 && us.users.every(u => u.fixed), 'שני המנהלים הקבועים מוצגים');
ok(us.names.indexOf('אביה בצלאל') !== -1, 'רשימת שמות לבחירה');
throws(() => S.call(ADMIN, 'apiUserSave', [{ email: 'bad', role: 'מנה"ד' }]), /אימייל/, 'אימייל לא תקין');
throws(() => S.call(ADMIN, 'apiUserSave', [{ email: 'a@cyber.org.il', role: 'מנה"ד' }]), /חובה לבחור שם/, 'מנה"ד בלי שם');
throws(() => S.call(ADMIN, 'apiUserSave', [{ email: 'a@cyber.org.il', role: 'קוסם' }]), /תפקיד/, 'תפקיד לא קיים');
us = S.call(ADMIN, 'apiUserSave', [{ email: 'Aviya@cyber.org.il', name: 'אביה בצלאל', role: 'מנה"ד' }]);
ok(us.users.some(u => u.email === 'aviya@cyber.org.il'), 'משתמש נשמר (אותיות קטנות)');
S.call(ADMIN, 'apiUserSave', [{ email: 'yaara@cyber.org.il', name: 'יערה פרסקו', role: 'מפקדת' }]);
S.call(ADMIN, 'apiUserSave', [{ email: 'noa@cyber.org.il', name: 'נועה', role: 'מנה"ד מחוזי', scope: 'צפון' }]);
S.call(ADMIN, 'apiUserSave', [{ email: 'boss@cyber.org.il', name: '', role: 'צופה' }]);
S.call(ADMIN, 'apiUserSave', [{ email: 'guest@partner.org', name: 'אורח', role: 'מתצפת' }]);

const all = S.call(ADMIN, 'apiInit').obs;
const mh = S.call('aviya@cyber.org.il', 'apiInit');
const hers = T.roster.filter(x => x.manhad === 'אביה בצלאל').map(x => x.name);
ok(mh.user.role === 'מנה"ד' && mh.mine.length === new Set(hers).size, 'מנה"ד: רשימת המש"קיות שלה');
const expect = all.filter(o => hers.indexOf(o.m) !== -1 || o.mn === 'אביה בצלאל' || o.ob === 'אביה בצלאל').length;
ok(mh.obs.length === expect && expect > 0 && expect < all.length, 'מנה"ד רואה רק את שלה: ' + mh.obs.length + ' מתוך ' + all.length);
ok(mh.obs.some(o => o.e) && mh.obs.some(o => !o.e), 'מנה"ד עורכת רק תצפיות שהיא עצמה ביצעה');
const mf = S.call('yaara@cyber.org.il', 'apiInit');
ok(mf.obs.length > 0 && mf.obs.every(o => o.mf === 'יערה פרסקו' || o.ob === 'יערה פרסקו' || mf.mine.indexOf(o.m) !== -1), 'מפקדת רואה רק את שלה');
const mz = S.call('noa@cyber.org.il', 'apiInit');
ok(mz.obs.length > 0 && mz.obs.every(o => o.mz === 'צפון' || o.ob === 'נועה' || mz.mine.indexOf(o.m) !== -1), 'מחוזי רואה את המחוז');
const vw = S.call('boss@cyber.org.il', 'apiInit');
ok(vw.obs.length === all.length && vw.obs.every(o => !o.e) && !vw.user.canWrite, 'צופה רואה הכל ולא עורך');
throws(() => S.call('boss@cyber.org.il', 'apiSave', [{ f: full }]), /אין הרשאת הזנה/, 'צופה לא מזין');
ok(S.call('guest@partner.org', 'apiInit').ok, 'משתמש חיצוני שנרשם במפורש — נכנס');
us = S.call(ADMIN, 'apiUserDelete', ['guest@partner.org']);
ok(!S.call('guest@partner.org', 'apiInit').ok, 'אחרי מחיקה — נחסם');
r = S.call('aviya@cyber.org.il', 'apiObservation', [mh.obs[0].r]);
ok(r.x && Array.isArray(r.x.details) && r.x.details.length === 6, 'פרטי תצפית מלאים');
const foreign = all.filter(o => mh.obs.every(x => x.r !== o.r))[0];
throws(() => S.call('aviya@cyber.org.il', 'apiObservation', [foreign.r]), /אין לך הרשאה/, 'מנה"ד לא קוראת תצפית מחוץ לאחריותה');
const inScope = mh.obs.filter(o => !o.e)[0];
r = S.call('aviya@cyber.org.il', 'apiSetFeedback', [inScope.r, inScope.m + '|' + inScope.d, 'כן']);
ok(r.ok, 'מנה"ד יכולה לסמן משוב לתצפית שבאחריותה');

section('מחיקה');
const lookupRow = 400;
const before400 = main.formulas['400,5'];
r = S.call(ADMIN, 'apiDelete', [row2, fp2]);
ok(r.ok && main.getRange(row2, 3).getValue() === '' && main.getRange(row2, 2).getValue() === false, 'השורה התרוקנה וחזרה למאגר');
ok(main.formulas[row2 + ',32'] === '=SCORE', 'נוסחת הציון נשארה אחרי מחיקה');
ok(before400 === '=LOOKUP', 'נוסחאות השליפה בשורות המאגר לא נגעו');
throws(() => S.call(ADMIN, 'apiDelete', [row1, 'x|y']), /השורה השתנתה/, 'מחיקה עם טביעת אצבע שגויה נדחית');
const afterDel = S.call(ADMIN, 'apiInit');
ok(afterDel.obs.every(o => o.r !== row2), 'התצפית שנמחקה לא חוזרת');
sv = S.call(ADMIN, 'apiSave', [{ f: { mashakit: ro.name, date: '2026-09-09' } }]);
ok(sv.obs.r > row3, 'תצפית חדשה נכתבת בסוף ולא לתוך החור');

section('כתיבה לשורה עם נוסחאות שליפה');
const T2 = build({ obs: 362, edge: false });
const S2 = new Server(T2.wb, [MAIN, WEBGS]);
const m2 = T2.wb.getSheetByName('ניטור תצפיות');
sv = S2.call(ADMIN, 'apiSave', [{ f: { mashakit: T2.roster[2].name, date: '2026-11-10', rashut: T2.roster[2].rashut } }]);
ok(sv.obs.r === 367 && sv.obs.mn === T2.roster[2].manhad, 'שורה 367 (אחרי תחילת נוסחאות השליפה) נכתבת עם ערכי שיוך');

section('מאגר שורות מלא');
const T3 = build({ obs: 30, edge: false, pool: 34 });
const S3 = new Server(T3.wb, [MAIN, WEBGS]);
const m3 = T3.wb.getSheetByName('ניטור תצפיות');
sv = S3.call(ADMIN, 'apiSave', [{ f: { mashakit: T3.roster[2].name, date: '2026-11-10' } }]);
ok(sv.ok && sv.obs.r === 35 && m3.getMaxRows() >= 35, 'כשהמאגר נגמר — הוא מורחב והשמירה מצליחה (שורה ' + sv.obs.r + ')');

section('גיליון ריק לחלוטין');
const T4 = build({ obs: 0, edge: false });
const S4 = new Server(T4.wb, [MAIN, WEBGS]);
r = S4.call(ADMIN, 'apiInit');
ok(r.ok && r.obs.length === 0, 'בלי תצפיות — האתר נטען');
sv = S4.call(ADMIN, 'apiSave', [{ f: { mashakit: T4.roster[1].name, date: '2026-11-10' } }]);
ok(sv.ok && sv.obs.r === 5, 'תצפית ראשונה נכתבת לשורה 5');

section('טקסט שנראה כמו נוסחה או תאריך');
const TX = build({ obs: 3, edge: false });
const SX = new Server(TX.wb, [MAIN, WEBGS]);
const mx = TX.wb.getSheetByName('ניטור תצפיות');
sv = SX.call(ADMIN, 'apiSave', [{ f: { mashakit: TX.roster[1].name, date: '2026-11-10', klass: '7/2', school: '=IMPORTXML("http://x","//a")', lesson: '+972 שיעור', keep: '-מינוס בהתחלה', improve: '@everyone', personal: "'גרש", scores: [3, 3, 3, 3, 3, 3] } }]);
const rx = sv.obs.r;
ok(mx.getRange(rx, 14).getValue() === '7/2', 'כיתה "7/2" נשמרת כטקסט ולא הופכת לתאריך');
ok(!mx.formulas[rx + ',13'] && mx.getRange(rx, 13).getValue() === '=IMPORTXML("http://x","//a")', 'טקסט שמתחיל ב-"=" נשמר כטקסט ולא כנוסחה');
ok(mx.getRange(rx, 16).getValue() === '+972 שיעור' && mx.getRange(rx, 33).getValue() === '-מינוס בהתחלה' && mx.getRange(rx, 34).getValue() === '@everyone' && mx.getRange(rx, 35).getValue() === "'גרש", 'גם +, -, @ וגרש בתחילת טקסט');
ok(sv.obs.k === '7/2' && sv.obs.sc.charAt(0) === '=', 'הערכים חוזרים לאתר כמו שהוקלדו');
sv = SX.call(ADMIN, 'apiSave', [{ row: rx, fp: sv.obs.m + '|' + sv.obs.d, f: { mashakit: TX.roster[1].name, date: '2026-11-10', klass: '7/2', school: '=IMPORTXML("http://x","//a")', lesson: '+972 שיעור', keep: '-מינוס בהתחלה', improve: '@everyone', personal: "'גרש", scores: [3, 3, 3, 3, 3, 3] } }]);
ok(TX.wb.getSheetByName('יומן שינויים').getLastRow() === 2, 'שמירה חוזרת בלי שינוי לא כותבת כלום ליומן');
SX.call(ADMIN, 'apiUserSave', [{ email: 'q@cyber.org.il', name: '=HYPERLINK("x")', role: 'מתצפת' }]);
ok(Object.keys(TX.wb.getSheetByName('משתמשי האתר').formulas).length === 0, 'גם בגיליון המשתמשים אין נוסחה');

section('אזור זמן של הגיליון שונה משל הסקריפט');
const TZ = build({ obs: 3, edge: false });
TZ.wb.tz = 'America/Los_Angeles';
const SZ = new Server(TZ.wb, [MAIN, WEBGS]);
sv = SZ.call(ADMIN, 'apiSave', [{ f: { mashakit: TZ.roster[1].name, date: '2026-11-10' } }]);
ok(sv.obs.d === '2026-11-10', 'התאריך נשמר ונקרא כאותו יום גם כשהגיליון באזור זמן אחר (התקבל ' + sv.obs.d + ')');
const cellD = TZ.wb.getSheetByName('ניטור תצפיות').getRange(sv.obs.r, 19).getValue();
ok(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(cellD) === '2026-11-10', 'בתא עצמו: 10/11 בשעון הגיליון');
ok(SZ.call(ADMIN, 'apiInit').obs.filter(o => o.r === sv.obs.r)[0].d === '2026-11-10', 'וגם בטעינה מחדש');
throws(() => SZ.call(ADMIN, 'apiSave', [{ f: { mashakit: 'x', date: '2026-13-40' } }]), /תאריך/, 'חודש 13 נדחה');

section('גיזום יומן');
const big = build({ obs: 5, edge: false });
const lsh = big.wb.getSheetByName('יומן שינויים');
for (let i = 0; i < 2260; i++) lsh.cells.push([new Date(), 'x', 'ניטור תצפיות', 'A1', 5, 'שדה', 'a', 'b']);
const SB = new Server(big.wb, [MAIN, WEBGS]);
SB.call(ADMIN, 'apiSave', [{ f: { mashakit: big.roster[1].name, date: '2026-11-10' } }]);
ok(lsh.getLastRow() - 1 === 2000, 'היומן נגזם ל-2000 אחרי חריגה מהמרווח (התקבל ' + (lsh.getLastRow() - 1) + ')');

section('סנכרון ומצגת (נתיבי שגיאה)');
r = S.call(ADMIN, 'apiSyncRoster');
ok(r.ok && r.mashakiot > 0, 'כשל בפתיחת קובץ השיוך לא מפיל: מוחזר המצב הקיים');
throws(() => S.call(ADMIN, 'apiPresentation'), /המצגת לא נוצרה|נכשלה/, 'מצגת בלי גיליון דשבורד — הודעה ברורה');
r = S.call(OBS, 'apiRefresh');
ok(r.ok, 'רענון ביוזמת משתמש');

console.log('\n' + (fail ? '✗ ' : '✓ ') + pass + ' עברו, ' + fail + ' נכשלו');
const slow = S.calls.slice().sort((x, y) => y.ms - x.ms)[0];
console.log('הקריאה האיטית ביותר בסימולציה: ' + slow.fn + ' ' + slow.ms + 'ms');
process.exit(fail ? 1 : 0);
