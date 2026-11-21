/* גיליון מדומה במבנה האמיתי של "ניטור תצפיות" (כותרות אמיתיות, נתונים סינתטיים). */
const { Sheet, Workbook } = require('./gas-sim.js');

function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const CRIT_TITLES = [
  'שליטה בחומרי הדרכה (מפגינה שליטה ובקיאות בתוכן)',
  'מדגימה חיבור בין המיומנויות לתוכן (על סמך דמות הבוגר)',
  'מובילה את הלמידה בהתייחס למבנה השיעור(מבנה שיעור שהכיל פתיח מעניין, גוף וסיכום)',
  'קתימב"ה נס (שולטת טכניקות מסירה ועמידה מול קהל)',
  'מנהלת קשב, דיון ואת השיח בכיתה(כולל רתימת תלמידים לעשייה וניהול זמן)',
  'משתמשת באמצעים העומדים לרשותה לטיפול באתגרים (הפעלת חניכים, מתגברת, מורה)'
];
const DETAIL_TITLES = ['פירוט (שליטה בחומרי הדרכה)', 'פירוט (מיומנויות)', 'פירוט (מבנה שיעור)',
  'פירוט (קתימבה-נס)', 'פירוט (ניהול דיון ושיח בכתה)', 'פירוט (מענה לאתגרים וניהול כתה)'];
const WEIGHTS = [0.10, 0.15, 0.15, 0.15, 0.15, 0.30];

function mainHeader() {
  const h = ['Visible', 'תחילת תצפית', 'משקית', 'מ.א מש"קית', 'מחוז', 'מחזור', 'פלוגה', 'מנהד אזורי',
    'מפקדת', 'מ.א מפקדת', 'מש"קית מתגברת', 'רשות', 'בית ספר', 'כיתה', 'שם השיפט', 'שם ומספר שיעור',
    'תפקיד המתצפת', 'שם המתצפת', 'תאריך'];
  for (let i = 0; i < 6; i++) { h.push(CRIT_TITLES[i]); h.push(DETAIL_TITLES[i]); }
  h.push('ציון תצפית', 'נקודות לשימור', 'נקודות לשיפור', 'התייחסות אישית', 'תפקוד המתגברת',
    'הערות מתגברת', 'הועבר משוב לאחר תצפית ?',
    'סיום תצפית והפקת דוח (תפקיד המתצפת לאשר שכל הנתונים מלאים)');
  for (let i = 1; i <= 55; i++) h.push('נתונים ' + i);
  h.push('מיפוי סטטוס מילוי (האם כל הנתונים מלאים וניתן להוציא דוח משוב)',
    'Merged Doc ID - משובי תצפיות תשפז', 'Merged Doc URL - משובי תצפיות תשפז',
    'Link to merged Doc - משובי תצפיות תשפז', 'Document Merge Status - משובי תצפיות תשפז');
  return h;
}

const RASHUYOT = [
  ['עכו', 'צפון א', 'דוד אלפיא'], ['כרמיאל', 'צפון א', 'דוד אלפיא'], ['מעלות', 'צפון א', 'איריס אמסלם'],
  ['נהריה', 'צפון א', 'איריס אמסלם'], ['טירת כרמל', 'צפון ב', 'אביה בצלאל'], ['קריית אתא', 'צפון ב', 'אביה בצלאל'],
  ['נוף הגליל', 'צפון ב', 'איילה ישלח'], ['בית שאן', 'צפון ב', 'איילה ישלח'], ['ירושלים', 'מרכז', 'אורית שמחוני'],
  ['רמלה', 'מרכז', 'שחף בן בסט'], ['בת ים', 'מרכז', 'שחף בן בסט'], ['אשקלון', 'דרום', 'דורין כהן'],
  ['באר שבע', 'דרום', 'עידן יסקיאס'], ['אילת', 'דרום', 'אופיר זויתן']
];
const MEFAKDOT = ['יערה פרסקו', 'מיקה שר', 'אופיר קופר', 'נויה דרמינר', 'שי ורדי', 'נעמה הס', 'ורד בקסנסקי'];
const FIRST = ['נטע', 'אביב', 'הדר', 'שירה', 'מאיה', 'רוני', 'טל', 'ליאור', 'נועה', 'יעל', 'עדי', 'גל', 'שקד', 'אור', 'מור', 'דנה', 'ליה', 'רותם', 'עמית', 'סתיו'];
const LAST = ['כלפון', 'ממן', 'אברבנאל', 'לוי', 'כהן', 'ברק', 'אדרי', 'נחום', 'פרץ', 'ביטון', 'דהן', 'אזולאי', 'מזרחי', 'גבאי', 'שטרן'];
const SHIFTS = { 'Shift2Tech': 16, 'Shift2Product': 7, 'Shift2Code': 14, 'מדמח_א': 27, 'מדמח_ב': 21, 'Shift2Ai': 17 };
const ROLES = ['מנהד אזורי', 'מפקדת', 'מנה"ד מחוזי', 'מנה"ד ארצי', 'צוות הכשרות', 'מ"מ', 'מ"פ'];

function build(opts) {
  opts = opts || {};
  const today = opts.today || new Date();
  const R = rng(opts.seed || 11);
  const pick = a => a[Math.floor(R() * a.length)];
  const wb = new Workbook();

  /* ---------- מיפוי ---------- */
  const roster = [];
  const used = {};
  let pid = 9500000;
  for (let i = 0; i < 64; i++) {
    let name;
    do { name = pick(FIRST) + ' ' + pick(LAST); } while (used[name]);
    used[name] = true;
    const rs = RASHUYOT[i % RASHUYOT.length];
    const mef = MEFAKDOT[i % MEFAKDOT.length];
    roster.push({ name, pid: String(pid += 137), machzor: pick(["ז'", "ח'", "ט'"]), plugah: rs[1],
      mahoz: rs[1].indexOf('צפון') === 0 ? 'צפון' : 'דרום', rashut: rs[0], mef, mefPid: String(9800000 + (i % 7) * 311), manhad: rs[2], missing: '' });
  }
  // מש"קית בשתי רשויות
  roster.push(Object.assign({}, roster[0], { rashut: 'כרמיאל', manhad: 'דוד אלפיא', plugah: 'צפון א' }));
  // שורה חסרה
  roster.push({ name: 'אביב קורן', pid: '9523630', machzor: "ז'", plugah: '', mahoz: '', rashut: '', mef: '', mefPid: '', manhad: '', missing: 'לא מופיעה בקובץ השיוך, פלוגה, רשות, מפקדת, מ.א מפקדת, מנה"ד' });
  // שורה שנדחפה (כמו "נטע חלפון" האמיתית)
  roster.push({ name: 'נטע חלפון', pid: '9497599', machzor: 'צפון', plugah: 'טירת כרמל', mahoz: 'יערה פרסקו', rashut: '9846842', mef: 'אביה', mefPid: '', manhad: '', missing: 'לא מופיעה בקובץ השיוך, מ.א מפקדת, מנה"ד' });

  const mapRows = [['טבלת האמת של הקובץ, מסונכרנת מ"כא גשרים".'],
    ['מש"קית', 'מספר אישי', 'מחזור', 'פלוגה', 'מחוז', 'רשות', 'מפקדת', 'מ.א מפקדת', 'מנה"ד', 'מה חסר']];
  roster.forEach(r => mapRows.push([r.name, r.pid, r.machzor, r.plugah, r.mahoz, r.rashut, r.mef, r.mefPid, r.manhad, r.missing]));
  wb.add(new Sheet('מיפוי', mapRows, 400, 12));

  /* ---------- פלוגות לפי רשות ---------- */
  const pl = [['רשות מול פלוגה. זה מקור האמת.'], ['רשות', 'פלוגה', 'מקור', 'מש"קיות במיפוי', 'תצפיות', 'הערה']];
  RASHUYOT.forEach(r => pl.push([r[0], r[1], 'מיפוי', 4, 10, '']));
  pl.push(['שלומי', 'צפון א', 'ידני', 0, 5, '']);
  wb.add(new Sheet('פלוגות לפי רשות', pl, 200, 8));

  /* ---------- רשימת בתי ספר ---------- */
  const schools = {};
  const sc = [['זו רשימת האמת של בתי הספר.'], ['רשות', 'בית ספר', 'מקור', 'תצפיות', 'ממוצע', 'כתיבים נוספים']];
  RASHUYOT.forEach(r => {
    schools[r[0]] = ['מקיף א', 'אורט ' + r[0], 'חטיבת ' + pick(['רבין', 'בגין', 'הרצל', 'גולדה'])];
    schools[r[0]].forEach(s => sc.push([r[0], s, 'ידני', 0, '', '']));
  });
  wb.add(new Sheet('רשימת בתי ספר', sc, 400, 8));

  /* ---------- נתונים ---------- */
  const dHead = ['רשות', 'בית ספר', 'מפקדת', 'מ.א (מפקדת)', 'מש"קית', 'מ.א (משקית)', 'מנהד אזורי', 'מנהד מחוזי',
    'מנהד ארצי', 'צוות הכשרות', 'ממ', 'מפ', 'ממשבות מהצבא', 'שם השיפט', 'תפקיד מתצפת', '',
    'Shift2Tech', 'Shift2Product', 'Shift2Code', 'מדמח_א', 'מדמח_ב', 'Shift2Ai', 'מחזור', 'פלוגה'];
  const manhadim = Array.from(new Set(RASHUYOT.map(r => r[2])));
  const cols = {
    0: RASHUYOT.map(r => r[0]), 2: MEFAKDOT, 4: ['אין'].concat(roster.map(r => r.name)), 6: manhadim,
    7: ['נועה', 'סחר'], 8: ['קרן-אור'], 9: ['דור', 'שירי', 'שרה'], 10: ['אלמוג בר טוב', 'דניאלה ארגי'],
    11: ['אליה זימרן נתיב', 'מעיין אלבז'], 12: ['ליאור גאון', 'מאיה קייט'], 13: Object.keys(SHIFTS),
    14: ROLES, 22: ["ה'", "ו'", "ז'", "ח'", "ט'", "י'"], 23: ['צפון א', 'צפון ב', 'מרכז', 'דרום']
  };
  Object.keys(SHIFTS).forEach((s, i) => { cols[16 + i] = Array.from({ length: SHIFTS[s] }, (_, k) => 'מפגש ' + (k + 1) + ': ' + s); });
  const dRows = [dHead];
  for (let r = 0; r < 70; r++) dRows.push(dHead.map((_, c) => (cols[c] && cols[c][r]) || ''));
  wb.add(new Sheet('נתונים', dRows, 300, 33));

  /* ---------- יומן שינויים ---------- */
  wb.add(new Sheet('יומן שינויים', [['תאריך ושעה', 'מי', 'גיליון', 'תא', 'שורה', 'עמודה', 'ערך קודם', 'ערך חדש']], 3000, 10));

  /* ---------- ניטור תצפיות ---------- */
  const H = mainHeader();
  const ix = {}; H.forEach((h, i) => { if (!(h in ix)) ix[h] = i; });
  const W = H.length;
  const rows = [['ניטור תצפיות מחצית א תשפ"ז'], [], [], H];
  const blank = () => { const r = new Array(W).fill(''); r[1] = false; r[38] = false; return r; };
  const observers = { 'מנהד אזורי': manhadim, 'מפקדת': MEFAKDOT, 'מנה"ד מחוזי': ['נועה', 'סחר'], 'מנה"ד ארצי': ['קרן-אור'] };
  const day = n => { const d = new Date(today.getFullYear(), today.getMonth(), today.getDate()); d.setDate(d.getDate() - n); return d; };
  const N = opts.obs === undefined ? 150 : opts.obs;

  const mk = (ro, ageDays, o) => {
    o = o || {};
    const r = blank();
    const role = o.role || (R() < 0.6 ? 'מנהד אזורי' : (R() < 0.8 ? 'מפקדת' : pick(['מנה"ד מחוזי', 'מנה"ד ארצי'])));
    const shift = o.shift || pick(Object.keys(SHIFTS));
    r[1] = true; r[2] = o.name || ro.name; r[3] = ro.pid; r[4] = ro.mahoz; r[5] = ro.machzor; r[6] = ro.plugah;
    r[7] = ro.manhad; r[8] = ro.mef; r[9] = ro.mefPid; r[10] = R() < 0.3 ? pick(roster).name : 'אין';
    r[11] = ro.rashut; r[12] = pick(schools[ro.rashut] || ['מקיף א']); r[13] = pick(["ז'1", "ז'2", "ח'3", "ט'1"]);
    r[14] = shift; r[15] = 'מפגש ' + (1 + Math.floor(R() * 6)) + ': ' + shift; r[16] = role;
    r[17] = o.observer || (role === 'מנהד אזורי' ? ro.manhad : (role === 'מפקדת' ? ro.mef : pick(observers[role])));
    r[18] = o.noDate ? '' : day(ageDays);
    const base = o.base !== undefined ? o.base : 2.6 + R() * 2.2;
    for (let i = 0; i < 6; i++) {
      const v = Math.max(1, Math.min(5, Math.round(base + (R() - 0.5) * 1.6)));
      r[19 + i * 2] = (o.dash && i === 2) ? '-' : v;
      r[20 + i * 2] = R() < 0.6 ? 'הערה על ' + DETAIL_TITLES[i].replace('פירוט ', '') : '';
    }
    r[32] = 'פתיחה טובה, חיבור לתלמידים.'; r[33] = 'ניהול זמן בחלק השני.'; r[34] = R() < 0.5 ? 'מתמודדת יפה עם הכיתה.' : '';
    r[35] = r[10] === 'אין' ? 'אין מתגברת' : pick(['מעולה', 'טוב', 'בינוני']); r[36] = '';
    r[37] = o.fb !== undefined ? o.fb : (R() < 0.7 ? 'כן' : pick(['לא', 'בהמשך', '']));
    r[38] = o.done === undefined ? true : o.done;
    if (r[38] && R() < 0.7) r[96] = 'https://docs.google.com/document/d/FAKE' + rows.length + '/edit';
    return r;
  };

  for (let i = 0; i < N; i++) {
    const ro = roster[Math.floor(R() * 52)];           // חלק מהמש"קיות נשארות בלי תצפית
    rows.push(mk(ro, Math.floor(R() * 75)));
  }
  if (opts.edge !== false) {
    const low = roster[55];
    rows.push(mk(low, 40, { base: 2.0, fb: 'כן' }));    // נמוך פעמיים ברצף
    rows.push(mk(low, 12, { base: 1.8, fb: 'לא' }));
    rows.push(mk(roster[56], 30, { base: 4.6, fb: '' }));               // משוב לא הועבר, קריטי
    rows.push(mk(roster[5], 3, { name: 'נטע חלפוןן', fb: 'כן' }));       // שם לא מזוהה
    rows.push(mk(roster[6], 5, { dash: true }));                          // חסר ציון
    rows.push(mk(roster[7], 2, { noDate: true }));                        // בלי תאריך
    const draft = mk(roster[8], 1, { done: false, fb: '' });              // טיוטה
    draft[32] = ''; draft[33] = ''; draft[19] = ''; rows.push(draft);
    rows.push(mk(roster[9], 9, { shift: 'מדמח_א' }));
    rows.push(mk(roster[10], 6, { shift: 'מדמח_ב' }));
  }
  const lastData = rows.length;
  const POOL = opts.pool || 700;
  while (rows.length < POOL) rows.push(blank());

  const main = new Sheet('ניטור תצפיות', rows, POOL, W);
  // נוסחת הציון בכל שורה, ונוסחאות שליפה בשורות המאוחרות
  for (let r = 5; r <= POOL; r++) main.formulas[r + ',32'] = '=SCORE';
  for (let r = Math.max(366, lastData + 1); r <= POOL; r++) [4, 5, 6, 7, 8, 9, 10].forEach(c => { main.formulas[r + ',' + c] = '=LOOKUP'; });
  const recalc = sh => {
    for (let r = 5; r <= sh.cells.length; r++) {
      if (!sh.formulas[r + ',32']) continue;
      const row = sh.cells[r - 1];
      const v = [0, 1, 2, 3, 4, 5].map(i => row[19 + i * 2]);
      const nums = v.filter(x => typeof x === 'number');
      if (!nums.length && v.indexOf('-') === -1) { row[31] = ''; continue; }
      if (v.indexOf('-') !== -1) { row[31] = 'חסר ציון'; continue; }
      if (nums.length < 6) { row[31] = Math.round(v.reduce((s, x, i) => s + ((typeof x === 'number' ? x : 0) / 5) * WEIGHTS[i], 0) * 100); continue; }
      row[31] = Math.round(v.reduce((s, x, i) => s + (x / 5) * WEIGHTS[i], 0) * 100);
    }
  };
  main.onFlush = recalc;
  recalc(main);
  wb.add(main);

  return { wb, roster, ix, lastData, schools };
}

module.exports = { build, CRIT_TITLES, RASHUYOT };
