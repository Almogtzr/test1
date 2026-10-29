/**
 * פורטל גשרים מדמ"ח - מסמך מרכז לקישורים ולהודעות
 * ------------------------------------------------
 * התקנה (פעם אחת, כ-5 דקות):
 * 1. יוצרים Google Sheet חדש בשם "פורטל גשרים מדמ"ח - ניהול".
 * 2. תוספים (Extensions) > Apps Script. מוחקים הכל ומדביקים את הקובץ הזה. שומרים.
 * 3. בוחרים בפונקציה setup ולוחצים Run (לאשר הרשאות). נוצרות 3 לשוניות עם קישורים לדוגמה.
 * 4. Deploy > New deployment > Web app.
 *    Execute as: Me  |  Who has access: כל מי שבארגון (או Anyone with the link אם למש"קיות אין חשבון ארגוני).
 * 5. מקבלים קישור לפורטל. קישורים ייעודיים:
 *    <קישור>?role=m  -> נפתח מסונן למש"קיות
 *    <קישור>?role=n  -> נפתח מסונן למנה"דים
 *
 * תפריט 🌉 פורטל בגיליון: ייבוא קבצים מתיקייה, דוח צפיות, טיוטת עדכון שבועי, בקשות ממתינות.
 * הצעות מסמכים מהצוות: נכנסות ללשונית "בקשות" (ומייל אליך). בוחרים "אושר" בעמודת הסטטוס, והמסמך מתפרסם.
 * בהגדרות B5 מדביקים את קישור הפורטל (משמש את "פתיחת הפורטל" ואת העדכון השבועי).
 * תחזוקה: עובדים רק בגיליון. מוסיפים שורה, בוחרים קטגוריה ומסמנים וי למי המסמך מיועד (מש"קיות / מנה"דים / שניהם).
 * שורה בלי וי היא טיוטה: נצבעת אפור ולא מופיעה בפורטל.
 * תג"ב (עמודה M): תאריך אחרון למילוי. עד התאריך המסמך מופיע בראש הפורטל ב"⏰ למילוי", עם ספירה לאחור.
 * שגרה (עמודות N-P): "כל שבוע" / "כל שבועיים", יום ושעה. הפורטל מחשב לבד את המועד הבא.
 *   בשגרה דו-שבועית ממלאים ב-M את המועד הקרוב, וממנו נספרים השבועיים. השעה (P) חלה גם על תג"ב חד-פעמי.
 * אחראי (עמודה Q): בחירה מתוך רשימת האחראים בהגדרות, עמודה F. מוצג בכרטיס בפורטל.
 * דוח הרשאות (בתפריט): מי יכול לערוך כל מסמך מפורסם, ואיפה השיתוף פתוח מדי או סגור מדי.
 * תת-קטגוריה (R): כותרת משנה בתוך הקטגוריה, למשל "שנה א'". בארכיון (S): המסמך יורד לאזור הארכיון בתחתית הפורטל.
 * דיווח על טעות: כפתור בכל כרטיס. הדיווח נכנס ללשונית "דיווחים" ונשלח אליך מייל.
 * צבע ואימוג'י לקטגוריה: בהגדרות, האימוג'י בעמודה E ליד הקטגוריה, והצבע = צבע המילוי של תא הקטגוריה בעמודה D.
 *   בלי צבע, הפורטל בוחר צבע לבד.
 * גיבוי שבועי: עותק של הגיליון כל שישי לתיקייה "פורטל גשרים - גיבויים" (נשמרים 8 אחרונים).
 * אין צורך לפרוס מחדש, אלא אם משנים את הקוד.
 */

var SHEET_LINKS = 'קישורים';
var SHEET_MSGS = 'הודעות';
var SHEET_SET = 'הגדרות';
var SHEET_REQ = 'בקשות';

// ---------------------------------------------------------------- setup
var CATS = ['תוכן ושיעורים', 'אקזיט טיקט', 'זה"ת והכשרות', 'תצפיות ומשוב', 'נהלים ותפקיד', 'טפסים ושאלונים', 'כללי'];
var CAT_EMOJI = { 'תוכן ושיעורים': '📚', 'אקזיט טיקט': '🎯', 'זה"ת והכשרות': '🎓', 'תצפיות ומשוב': '👀', 'נהלים ותפקיד': '📋', 'טפסים ושאלונים': '📝', 'כללי': '📂' };

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var old = ss.getSheetByName(SHEET_LINKS);
  if (old && old.getLastRow() > 1 && !confirmWipe_()) return;
  var today = new Date();

  // ---- הגדרות (נבנה ראשון כי רשימת הקטגוריות משמשת את הדרופדאון)
  var S = ss.getSheetByName(SHEET_SET) || ss.insertSheet(SHEET_SET);
  S.clear();
  S.getRange(1, 1, 5, 2).setValues([
    ['הגדרה', 'ערך'],
    ['שם הפורטל', 'פורטל גשרים מדמ"ח'],
    ['כמה ימים מסמנים "חדש" / "עודכן"', 14],
    ['בדיקת "עודכן" מול הדרייב (TRUE/FALSE)', true],
    ['קישור לפורטל (מדביקים אחרי הפריסה)', '']
  ]);
  S.getRange(1, 4).setValue('קטגוריות (לפי סדר ההצגה בפורטל)');
  S.getRange(1, 6, 2, 1).setValues([['אחראים (לבחירה בעמודת "אחראי")'], ['אלמוג']]);
  S.getRange(2, 4, CATS.length, 1).setValues(CATS.map(function (c) { return [c]; }));
  catEmojiColumn_(S);
  styleHeader_(S, 6);
  S.setColumnWidth(1, 300); S.setColumnWidth(4, 260); S.setColumnWidth(6, 240);

  // ---- קישורים
  var L = ss.getSheetByName(SHEET_LINKS) || ss.insertSheet(SHEET_LINKS);
  L.clear();
  var lh = ['כותרת', 'קישור', 'קטגוריה', 'מש"קיות ✓', 'מנה"דים ✓', 'תיאור קצר', '📌 מוצמד', 'תאריך הוספה', 'צפיות', 'צפייה אחרונה', 'צפיות מש"קיות', 'צפיות מנה"דים', 'תג"ב (למילוי עד)', 'שגרה', 'יום', 'עד שעה', '👤 אחראי', 'תת-קטגוריה', '🗄️ בארכיון'];
  L.getRange(1, 1, 1, lh.length).setValues([lh]);
  var B = true, N = false; // B = לשניהם, N = למנה"דים בלבד
  var seed = [
    ['טבלה מרכזת - מפגשי גשרים מדמ"ח', 'https://docs.google.com/document/d/1OkfRDpvqZjV1r_i8JQdFw1n11Ml5JONHo2VqEDnr2MY', 'תוכן ושיעורים', B, 'כל המפגשים של שנה א\' ושנה ב\' במקום אחד', true],
    ['סילבוס גשרים מדמ"ח', 'https://docs.google.com/document/d/1OlvPx1g23pAObfBHZ0i51nbNaj_VrtPiaWErGIj-BKI', 'תוכן ושיעורים', B, 'מבנה התוכנית ויעדי הלמידה', false],
    ['חומרי שנה א\' - מבואות', 'https://drive.google.com/drive/folders/1WlHAZx_-brKw1LV2wvPvtZjuq8_AnJVV', 'תוכן ושיעורים', B, 'מצגות, קולאב ומסמכים למורה - כיתות ח\'', false],
    ['חומרי שנה ב\' - תכנות, סייבר, דאטה', 'https://drive.google.com/drive/folders/1bqc1NdYbhY9gC6GuCSCFBRFBIBL02Trq', 'תוכן ושיעורים', B, 'כיתות ט\'', false],
    ['דף עזר לתלמיד', 'https://docs.google.com/document/d/1hIsnbnzpL-gSOCbNXW6O73-yxndWkC4-qKhIlbXnqdY', 'תוכן ושיעורים', B, 'לחלוקה לתלמידים', false],
    ['מצגות הכנה לאקזיט טיקט', 'https://drive.google.com/drive/folders/1K0OU4iNKihActGrRhY8zPkdb0rfBaRau', 'אקזיט טיקט', B, 'מפגש הכנה של 30 דקות לכל אקזיט', true],
    ['אקזיט טיקט שנה א\'+ב\' - מחוון', 'https://docs.google.com/document/d/1bZUC3b5sO4KwLGHSzdexrWOptuU9XUyrEpWlaIyWV1A', 'אקזיט טיקט', B, 'לא להעביר לתלמידים', false],
    ['מודל פעולה תשפ"ז', 'https://docs.google.com/document/d/13shs1graH7-kudlzuON1b1Nh_r-jioNEVDScNszbOaA', 'נהלים ותפקיד', N, 'נהלי עבודה, תצפיות ומשוב', false],
    ['היערכות לתחילת למידה', 'https://docs.google.com/document/d/1_n5GKOTDSBCPMcTUshj2aXC0R6BlMEVJagx-pgMMmkQ', 'נהלים ותפקיד', B, '', false],
    ['טמפלייט זה"ת', 'https://docs.google.com/document/d/1GfaUgOgr4UzVqqvJr_zr_og-w85W3Xlh7cElMmKH27o', 'זה"ת והכשרות', N, 'מבנה קבוע להכנת זה"ת', false],
    ['ניטור תצפיות תשפ"ז', 'https://docs.google.com/spreadsheets/d/1gXpKq_dm5KVliVUBL3Hfe2hOsENDb_aHWG6toYVYCYg', 'תצפיות ומשוב', N, 'מילוי שורה אחרי כל תצפית', false],
    ['טמפלייט חוו"ד תצפית', 'https://docs.google.com/document/d/187XIHxDYmpOK_mU3l9G0WDwqCbnQ1cQm6TGyps6GdUQ', 'תצפיות ומשוב', N, '', false]
  ];
  var rows = seed.map(function (r) { return [r[0], r[1], r[2], r[3], true, r[4], r[5], today, 0, '', 0, 0, '', '', '', '', '', '', false]; });
  L.getRange(2, 1, rows.length, lh.length).setValues(rows);
  styleHeader_(L, lh.length);
  L.setColumnWidth(1, 260); L.setColumnWidth(2, 300); L.setColumnWidth(3, 150); L.setColumnWidth(6, 280);
  L.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(S.getRange('D2:D40'), true).build());
  L.getRange('D2:E').insertCheckboxes();
  L.getRange('G2:G').insertCheckboxes();
  L.getRange('H2:H').setNumberFormat('dd/MM/yyyy');
  L.getRange('J2:J').setNumberFormat('dd/MM/yyyy HH:mm');
  L.getRange(1, 9, 1, 4).setBackground('#475569');
  // שורה בלי אף וי בקהל = טיוטה: נצבעת אפור ולא מופיעה בפורטל
  var draft = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A2<>"",NOT($D2),NOT($E2))')
    .setBackground('#f1f5f9').setFontColor('#94a3b8').setRanges([L.getRange('A2:S')]).build();
  var fresh = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($H2<>"",TODAY()-$H2<=INDIRECT("הגדרות!B3"))')
    .setBackground('#ecfdf5').setRanges([L.getRange('A2:A')]).build();
  L.setConditionalFormatRules([draft, fresh]);
  dueColumn_(L); // אחרי הכללים הקודמים, כי הוא מוסיף עליהם
  routineColumns_(L);
  ownerColumn_(L, S);
  extraColumns_(L);

  // ---- הודעות
  var M = ss.getSheetByName(SHEET_MSGS) || ss.insertSheet(SHEET_MSGS);
  M.clear();
  var mh = ['תאריך', 'כותרת', 'תוכן', 'מש"קיות ✓', 'מנה"דים ✓', 'דחיפות', 'מוצג עד'];
  M.getRange(1, 1, 1, mh.length).setValues([mh]);
  var until = new Date(); until.setDate(until.getDate() + 14);
  M.getRange(2, 1, 1, mh.length).setValues([[today, 'ברוכים הבאים לפורטל גשרים מדמ"ח', 'כל הקישורים החשובים במקום אחד. שמרו את הקישור במועדפים 🙂', true, true, 'רגיל', until]]);
  styleHeader_(M, mh.length);
  M.setColumnWidth(2, 240); M.setColumnWidth(3, 420);
  M.getRange('D2:E').insertCheckboxes();
  dropdown_(M, 'F2:F', ['רגיל', 'חשוב', 'דחוף']);
  M.getRange('A2:A').setNumberFormat('dd/MM/yyyy');
  M.getRange('G2:G').setNumberFormat('dd/MM/yyyy');

  installTriggers_();
  installBackupTrigger_();
  ensureRequests_();
  ensureIssues_();

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (def && ss.getSheets().length > 3) ss.deleteSheet(def);
  ss.setActiveSheet(L);
  clearPortalCache_();
  try { SpreadsheetApp.getUi().alert('הפורטל מוכן. עכשיו: Deploy > New deployment > Web app.'); } catch (err) {}
}

// התקנה מחדש מוחקת הכל, ולכן דורשת אישור. מהעורך (בלי חלון אישור) היא נחסמת כשיש נתונים.
function confirmWipe_() {
  var ui;
  try { ui = SpreadsheetApp.getUi(); }
  catch (err) { throw new Error('בגיליון יש נתונים. התקנה מחדש אפשרית רק מהתפריט 🌉 פורטל בגיליון.'); }
  return ui.alert('⚠️ התקנה מחדש', 'הפעולה תמחק את כל הקישורים, ההודעות ומוני הצפיות, ותחזיר את קישורי הדוגמה.\n\nלהמשיך?', ui.ButtonSet.YES_NO) === ui.Button.YES;
}

function styleHeader_(sh, n) {
  sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}
function dropdown_(sh, a1, values) {
  sh.getRange(a1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).build());
}

// ---------------------------------------------------------------- תאריך הוספה אוטומטי + תפריט
function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onEditInstalled') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onEditInstalled').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

// רץ בכל עריכה: תאריך אוטומטי, ושם המסמך נמשך מהדרייב כשמדביקים קישור בלי כותרת.
// בסוף כל עריכה מנקים את הזיכרון הזמני, כדי שהפורטל יציג את השינוי מיד.
function onEditInstalled(e) {
  var sh = e.range.getSheet(), r = e.range.getRow(), one = e.range.getNumRows() === 1 && r >= 2;
  try {
    if (sh.getName() === SHEET_LINKS) fillLinkRows_(sh, e.range);
    if (one && sh.getName() === SHEET_MSGS && e.range.getColumn() === 2 && e.value && !sh.getRange(r, 1).getValue())
      sh.getRange(r, 1).setValue(new Date());
    if (one && sh.getName() === SHEET_REQ && e.range.getColumn() === 8) {
      if (e.value === 'אושר') approveRequest_(sh, r);
      else if (e.value === 'נדחה' && !sh.getRange(r, 9).getValue()) sh.getRange(r, 9).setValue('נדחה ' + fmt_(new Date(), 'dd/MM'));
    }
  } finally { clearPortalCache_(); }
}

// עובד גם כשמדביקים הרבה קישורים בבת אחת (עד 200 שורות; שם מהדרייב לעד 30 שורות, כדי לא לחרוג מזמן הריצה)
function fillLinkRows_(sh, rg) {
  if (rg.getColumn() > 2 || rg.getLastColumn() < 2) return;
  var r0 = Math.max(rg.getRow(), 2), r1 = Math.min(rg.getLastRow(), r0 + 199);
  if (r1 < r0) return;
  var n = r1 - r0 + 1, AB = sh.getRange(r0, 1, n, 2).getValues(), HL = sh.getRange(r0, 8, n, 5).getValues(), changed = false, looked = 0;
  for (var i = 0; i < n; i++) {
    var url = String(AB[i][1] || '').trim();
    if (!url) continue;
    if (!HL[i][0]) { HL[i][0] = new Date(); changed = true; }
    [1, 3, 4].forEach(function (j) { if (HL[i][j] === '') { HL[i][j] = 0; changed = true; } }); // צפיות: סה"כ, מש"קיות, מנה"דים
    if (!AB[i][0] && looked++ < 30) {
      var name = driveName_(url);
      if (name) sh.getRange(r0 + i, 1).setValue(name);
    }
  }
  if (changed) sh.getRange(r0, 8, n, 5).setValues(HL);
}

function driveId_(url) {
  var m = String(url).match(/\/d\/([a-zA-Z0-9_-]{20,})/) || String(url).match(/folders\/([a-zA-Z0-9_-]{20,})/) || String(url).match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
}
function driveName_(url) {
  var id = driveId_(url);
  if (!id) return null;
  try { return (url.indexOf('/folders/') > -1 ? DriveApp.getFolderById(id) : DriveApp.getFileById(id)).getName(); }
  catch (err) { return null; }
}

// ---------------------------------------------------------------- ייבוא מתיקייה
function importFolder() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('ייבוא מתיקייה בדרייב', 'הדביקו קישור לתיקייה:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var fid = driveId_(r1.getResponseText().trim());
  var folder;
  try { folder = DriveApp.getFolderById(fid); } catch (err) { ui.alert('לא הצלחתי לפתוח את התיקייה. בדקו את הקישור וההרשאות.'); return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var S = ss.getSheetByName(SHEET_SET);
  var cats = S.getRange(2, 4, Math.max(S.getLastRow() - 1, 1), 1).getValues().map(function (x) { return String(x[0]); }).filter(String);
  var r2 = ui.prompt('קטגוריה', 'לאיזו קטגוריה לשייך? (השאירו ריק ל"כללי")\n\nקיימות: ' + cats.join(' · '), ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var cat = r2.getResponseText().trim() || 'כללי';
  if (cats.indexOf(cat) < 0) S.getRange(cats.length + 2, 4).setValue(cat);

  var L = ss.getSheetByName(SHEET_LINKS);
  var have = {};
  if (L.getLastRow() > 1) L.getRange(2, 2, L.getLastRow() - 1, 1).getValues().forEach(function (x) { var id = driveId_(x[0]); if (id) have[id] = 1; });

  ensureColumns_();
  var today = new Date(), rows = [];
  var subs = folder.getFolders();
  while (subs.hasNext()) { var f = subs.next(); if (!have[f.getId()]) rows.push([f.getName(), f.getUrl(), cat, false, false, 'תיקייה', false, today, 0, '', 0, 0, '', '', '', '', '', '', false]); }
  var files = folder.getFiles();
  while (files.hasNext()) {
    var x = files.next();
    if (have[x.getId()] || x.getMimeType() === MimeType.SHORTCUT) continue;
    rows.push([x.getName(), x.getUrl(), cat, false, false, '', false, today, 0, '', 0, 0, '', '', '', '', '', '', false]);
  }
  if (!rows.length) { ui.alert('לא נמצאו קבצים חדשים בתיקייה (כל הקבצים כבר בגיליון).'); return; }
  rows.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0]), 'he'); });
  L.getRange(L.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  clearPortalCache_();
  ui.alert('נוספו ' + rows.length + ' פריטים כטיוטה (אפורים).\nכדי לפרסם: סמנו וי למש"קיות ו/או למנה"דים.');
}

// ---------------------------------------------------------------- מונה צפיות
// who = הקהל שמופיע בקישור שממנו נכנסו (?role=m / ?role=n). כניסה מהקישור הכללי נספרת רק בסה"כ.
function logClick(url, who) {
  url = String(url || '');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    var L = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LINKS);
    var n = L.getLastRow() - 1;
    if (n < 1) return;
    var urls = L.getRange(2, 2, n, 1).getValues();
    for (var i = 0; i < n; i++) {
      if (String(urls[i][0]).trim() === url) {
        var cell = L.getRange(i + 2, 9, 1, 4), v = cell.getValues()[0];
        v[0] = (Number(v[0]) || 0) + 1;
        v[1] = new Date();
        if (who === 'm') v[2] = (Number(v[2]) || 0) + 1;
        if (who === 'n') v[3] = (Number(v[3]) || 0) + 1;
        cell.setValues([v]);
        return;
      }
    }
  } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------- דוח הרשאות
// לכל מסמך מפורסם: בעלים, מי יכול לערוך, ומה השיתוף הכללי. רק קורא, לא משנה כלום.
// ההמלצה: הצוות בצפייה או בתגובה בלבד, ורק מעטים עורכים. כך אין "כל אחד משנה את המקור".
var MAX_EDITORS_OK = 3;
function permissionsReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), L = ss.getSheetByName(SHEET_LINKS);
  var n = L.getLastRow() - 1;
  if (n < 1) return;
  var start = Date.now(), out = [], skipped = 0;
  var A = DriveApp.Access, P = DriveApp.Permission;
  var ACC = {}; ACC[A.ANYONE] = 'ציבורי'; ACC[A.ANYONE_WITH_LINK] = 'כל מי שיש לו קישור'; ACC[A.DOMAIN] = 'כל הארגון';
  ACC[A.DOMAIN_WITH_LINK] = 'בארגון, עם קישור'; ACC[A.PRIVATE] = 'פרטי (רק מי שהוזמן)';
  var PER = {}; PER[P.VIEW] = 'צפייה'; PER[P.COMMENT] = 'תגובה'; PER[P.EDIT] = 'עריכה';
  L.getRange(2, 1, n, 17).getValues().forEach(function (r) {
    var url = String(r[1] || '').trim(), id = driveId_(url);
    if (!r[0] || !id || !aud_(r[3], r[4])) return;
    if (Date.now() - start > 300000) { skipped++; return; } // מגבלת הזמן של גוגל היא 6 דקות
    var row = [r[0], r[2], String(r[16] || ''), '', 0, '', '', '', url];
    try {
      var f = url.indexOf('/folders/') > -1 ? DriveApp.getFolderById(id) : DriveApp.getFileById(id);
      var owner = f.getOwner(), eds = f.getEditors().map(function (u) { return u.getEmail(); });
      var acc = f.getSharingAccess(), per = f.getSharingPermission();
      row[3] = owner ? owner.getEmail() : 'אחסון שיתופי';
      row[4] = eds.length;
      row[5] = eds.join(', ');
      row[6] = (ACC[acc] || String(acc)) + (acc === A.PRIVATE ? '' : ' · ' + (PER[per] || String(per)));
      var bad = [];
      if (acc !== A.PRIVATE && per === P.EDIT) bad.push('🔴 כל מי שיש לו קישור יכול לערוך. מומלץ לשנות לצפייה');
      if (eds.length > MAX_EDITORS_OK) bad.push('🟠 ' + eds.length + ' עורכים. כדאי לצמצם לבעלים בלבד');
      if (acc === A.PRIVATE) bad.push('🟡 פרטי: מי שלא הוזמן לא יוכל לפתוח');
      row[7] = bad.length ? bad.join(' | ') : '✅ תקין';
    } catch (err) {
      row[7] = '⚪ אין לי גישה לקובץ, או שהוא נמחק';
    }
    out.push(row);
  });
  if (!out.length) { SpreadsheetApp.getUi().alert('לא נמצאו מסמכים מפורסמים מהדרייב.'); return; }
  // החמור ביותר למעלה: 🔴 > 🟠 > 🟡 > ⚪ > ✅
  var rank = function (t) { return ['🔴', '🟠', '🟡', '⚪', '✅'].map(function (m) { return t.indexOf(m) > -1; }).indexOf(true); };
  out.sort(function (a, b) { return rank(a[7]) - rank(b[7]) || b[4] - a[4]; });
  var R = ss.getSheetByName('דוח הרשאות') || ss.insertSheet('דוח הרשאות');
  R.clear();
  R.getRange(1, 1, 1, 9).setValues([['מסמך', 'קטגוריה', 'אחראי', 'בעלים', 'עורכים', 'רשימת עורכים', 'שיתוף כללי', 'מה לבדוק', 'קישור']]);
  R.getRange(2, 1, out.length, 9).setValues(out);
  styleHeader_(R, 9);
  R.setColumnWidth(1, 260); R.setColumnWidth(6, 320); R.setColumnWidth(7, 200); R.setColumnWidth(8, 380);
  var rule = function (f, bg) { return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f).setBackground(bg).setRanges([R.getRange('A2:I')]).build(); };
  R.setConditionalFormatRules([rule('=ISNUMBER(SEARCH("🔴",$H2))', '#fee2e2'), rule('=ISNUMBER(SEARCH("עורכים",$H2))', '#ffedd5'), rule('=ISNUMBER(SEARCH("פרטי",$H2))', '#fef9c3')]);
  R.getRange(1, 11).setValue('הדוח רק קורא ולא משנה הרשאות. לתיקון: פותחים את הקישור > שיתוף.' + (skipped ? ' ⚠️ ' + skipped + ' מסמכים לא נבדקו בגלל מגבלת זמן. הריצו שוב.' : '')).setFontColor('#64748b');
  ss.setActiveSheet(R);
}

var DEAD_DAYS = 90;
function viewsReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = ss.getSheetByName(SHEET_LINKS);
  var n = L.getLastRow() - 1;
  if (n < 1) return;
  ensureColumns_();
  // רדום = מפורסם יותר מ-90 יום, ואף אחד לא פתח אותו ב-90 הימים האחרונים. מועמד לארכיון.
  var now = Date.now(), DEAD = DEAD_DAYS * 86400000;
  var v = L.getRange(2, 1, n, 19).getValues().filter(function (r) { return r[0]; })
    .map(function (r) {
      var pub = aud_(r[3], r[4]), arch = r[18] === true;
      var old = r[7] instanceof Date && now - r[7].getTime() > DEAD;
      var seenRecently = r[9] instanceof Date && now - r[9].getTime() <= DEAD;
      var st = arch ? 'בארכיון' : pub ? 'מפורסם' : 'טיוטה';
      var dead = pub && !arch && old && !seenRecently ? '💤 אף אחד לא פתח ' + DEAD_DAYS + ' יום. לשקול ארכיון' : '';
      return [r[0], r[2], Number(r[8]) || 0, Number(r[10]) || 0, Number(r[11]) || 0, r[9] || '', st, dead];
    })
    .sort(function (a, b) { return (b[7] ? 1 : 0) - (a[7] ? 1 : 0) || b[2] - a[2]; });
  if (!v.length) return;
  var R = ss.getSheetByName('דוח צפיות') || ss.insertSheet('דוח צפיות');
  R.clear();
  R.getRange(1, 1, 1, 8).setValues([['מסמך', 'קטגוריה', 'צפיות (סה"כ)', 'מש"קיות', 'מנה"דים', 'צפייה אחרונה', 'סטטוס', '💤 רדום']]);
  R.getRange(2, 1, v.length, 8).setValues(v);
  R.getRange('F2:F').setNumberFormat('dd/MM/yyyy HH:mm');
  styleHeader_(R, 8);
  R.setColumnWidth(1, 300); R.setColumnWidth(8, 300);
  R.getRange(1, 10).setValue('מש"קיות / מנה"דים = כניסות דרך הקישור הייעודי. כניסה מהקישור הכללי נספרת רק בסה"כ.').setFontColor('#64748b');
  var dead = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$H2<>""')
    .setBackground('#ffedd5').setRanges([R.getRange('A2:H')]).build();
  var zero = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A2<>"",$C2=0,$G2="מפורסם")')
    .setBackground('#fef2f2').setRanges([R.getRange('A2:H')]).build();
  R.setConditionalFormatRules([dead, zero]);
  ss.setActiveSheet(R);
}

// פונקציות שמופעלות מהתפריט חייבות שם בלי קו תחתון בסוף (פונקציה עם _ היא פרטית ב-Apps Script)
function onOpen() {
  var pending = 0, issues = 0;
  try { ensureColumns_(); pending = pendingCount_(); issues = openIssuesCount_(); } catch (err) {}
  SpreadsheetApp.getUi().createMenu('🌉 פורטל')
    .addItem('פתיחת הפורטל', 'openPortal')
    .addItem('📨 בקשות ממתינות' + (pending ? ' (' + pending + ')' : ''), 'openRequests')
    .addItem('🛠️ דיווחים על טעויות' + (issues ? ' (' + issues + ')' : ''), 'openIssues')
    .addItem('📥 ייבוא קבצים מתיקייה בדרייב', 'importFolder')
    .addItem('📊 דוח צפיות', 'viewsReport')
    .addItem('🔐 דוח הרשאות עריכה', 'permissionsReport')
    .addItem('🛟 גיבוי עכשיו', 'backupNow')
    .addItem('🔄 רענון הפורטל עכשיו', 'refreshPortal')
    .addItem('✉️ טיוטת עדכון שבועי', 'weeklyDigest')
    .addSeparator()
    .addItem('התקנה מחדש (מוחק נתונים!)', 'setup')
    .addToUi();
}
// גיליונות שנבנו לפני שנוספו עמודות הצפיות לפי קהל (K-L), התג"ב (M) ולשונית הבקשות מקבלים אותן כאן
function ensureColumns_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRequests_();
  var L = ss.getSheetByName(SHEET_LINKS);
  if (L && !L.getRange(1, 11).getValue())
    L.getRange(1, 11, 1, 2).setValues([['צפיות מש"קיות', 'צפיות מנה"דים']]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#475569');
  if (L && !L.getRange(1, 13).getValue()) dueColumn_(L);
  if (L && !L.getRange(1, 14).getValue()) routineColumns_(L);
  var S = ss.getSheetByName(SHEET_SET);
  if (S && !S.getRange(1, 5).getValue()) catEmojiColumn_(S);
  if (S && !S.getRange(1, 6).getValue()) {
    S.getRange(1, 6).setValue('אחראים (לבחירה בעמודת "אחראי")').setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    if (!S.getRange(2, 6).getValue()) S.getRange(2, 6).setValue('אלמוג');
    S.setColumnWidth(6, 240);
  }
  if (L && S && !L.getRange(1, 17).getValue()) ownerColumn_(L, S);
  if (L && !L.getRange(1, 18).getValue()) extraColumns_(L);
  if (S && !S.getRange(5, 1).getValue()) S.getRange(5, 1).setValue('קישור לפורטל (מדביקים אחרי הפריסה)');
}

// עמודת תג"ב: כותרת, פורמט תאריך, לוח שנה בלחיצה כפולה, ואדום כשנשארו 3 ימים או פחות
function dueColumn_(L) {
  L.getRange(1, 13).setValue('תג"ב (למילוי עד)').setFontWeight('bold').setFontColor('#ffffff').setBackground('#b91c1c');
  L.setColumnWidth(13, 130);
  L.getRange('M2:M').setNumberFormat('dd/MM/yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText('תאריך אחרון למילוי. לחיצה כפולה פותחת לוח שנה.').build());
  var soon = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($M2<>"",$M2>=TODAY(),$M2-TODAY()<=3)')
    .setBackground('#fee2e2').setFontColor('#b91c1c').setRanges([L.getRange('M2:M')]).build();
  var past = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($M2<>"",$M2<TODAY())')
    .setFontColor('#94a3b8').setRanges([L.getRange('M2:M')]).build();
  L.setConditionalFormatRules(L.getConditionalFormatRules().concat([soon, past]));
}

var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// עמודות שגרה: N שגרה | O יום | P עד שעה
function routineColumns_(L) {
  L.getRange(1, 14, 1, 3).setValues([['שגרה', 'יום', 'עד שעה']]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#7c3aed');
  dropdown_(L, 'N2:N', ['כל שבוע', 'כל שבועיים']);
  dropdown_(L, 'O2:O', DAYS);
  L.getRange('P2:P').setNumberFormat('HH:mm');
  L.getRange(1, 14).setNote('מסמך שממלאים שוב ושוב: בוחרים "כל שבוע" או "כל שבועיים", יום (O) ושעה (P).\n' +
    'בשגרה דו-שבועית: בעמודה M (תג"ב) ממלאים את המועד הקרוב, וממנו נספרים השבועיים.');
  L.getRange(1, 16).setNote('למשל 14:00. בלי שעה = עד סוף היום. השעה חלה גם על תג"ב חד-פעמי.');
}

// המועד הקרוב למילוי. r = שורה מלשונית הקישורים, timeText = השעה (P) כפי שהיא מוצגת בגיליון.
// שגרה: מתחילים מהתג"ב (או מתאריך ההוספה), מזיזים ליום שנבחר, ומוסיפים 7/14 יום עד שמגיעים לעתיד.
function nextDue_(r, now, timeText) {
  var tm = String(timeText || '').match(/(\d{1,2}):(\d{2})/), h = tm ? Number(tm[1]) : 23, mi = tm ? Number(tm[2]) : 59;
  var rec = String(r[13] || ''), period = rec.indexOf('שבועיים') > -1 ? 14 : rec.indexOf('שבוע') > -1 ? 7 : 0;
  var base = r[12] instanceof Date ? r[12] : null;
  if (!period && !base) return null;
  var a = base || (r[7] instanceof Date ? r[7] : new Date(now));
  var d = new Date(a.getFullYear(), a.getMonth(), a.getDate(), h, mi);
  if (period) {
    var day = DAYS.indexOf(String(r[14]).trim());
    if (day > -1) while (d.getDay() !== day) d.setDate(d.getDate() + 1);
    while (d.getTime() < now) d.setDate(d.getDate() + period);
  }
  return { at: d, time: tm ? fmt_(d, 'HH:mm') : '', rec: period === 7 ? 'כל שבוע' : period === 14 ? 'כל שבועיים' : '' };
}

// עמודת אחראי (Q): רשימה נפתחת מתוך הגדרות F. מוסיפים שם בהגדרות, והוא מופיע לבחירה.
function ownerColumn_(L, S) {
  L.getRange(1, 17).setValue('👤 אחראי').setFontWeight('bold').setFontColor('#ffffff').setBackground('#0f766e');
  L.setColumnWidth(17, 130);
  L.getRange('Q2:Q').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(S.getRange('F2:F40'), true).build());
}

// R תת-קטגוריה (טקסט חופשי) | S בארכיון (וי). שורה בארכיון נצבעת אפור ומחוקה בגיליון.
function extraColumns_(L) {
  L.getRange(1, 18, 1, 2).setValues([['תת-קטגוריה', '🗄️ בארכיון']]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#0f766e');
  L.getRange(1, 19).setBackground('#475569');
  L.setColumnWidth(18, 150);
  L.getRange(1, 18).setNote('כותרת משנה בתוך הקטגוריה, למשל "שנה א\'" או "מפגשים 1-6". הסדר בפורטל לפי הסדר בגיליון.');
  L.getRange(1, 19).setNote('מסמך שהוחלף או כבר לא בשימוש. יורד לאזור "ארכיון" בתחתית הפורטל, ועדיין נמצא בחיפוש.');
  L.getRange('S2:S').insertCheckboxes();
  var arch = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$S2=TRUE')
    .setFontColor('#94a3b8').setStrikethrough(true).setRanges([L.getRange('A2:A')]).build();
  L.setConditionalFormatRules(L.getConditionalFormatRules().concat([arch]));
}

// הגדרות E: אימוג'י לכל קטגוריה (ממלא ברירות מחדל לקטגוריות המוכרות). הצבע נלקח ממילוי התא בעמודה D.
function catEmojiColumn_(S) {
  S.getRange(1, 5).setValue("אימוג'י").setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  S.getRange(1, 4).setNote('צבע לקטגוריה: מסמנים את התא של הקטגוריה וצובעים אותו בכלי "צבע מילוי" (דלי הצבע). בלי צבע, הפורטל בוחר לבד.');
  S.setColumnWidth(5, 80);
  var n = Math.max(S.getLastRow() - 1, 1), names = S.getRange(2, 4, n, 1).getValues(), em = S.getRange(2, 5, n, 1).getValues();
  S.getRange(2, 5, n, 1).setValues(names.map(function (x, i) { return [em[i][0] || CAT_EMOJI[String(x[0])] || (x[0] ? '📂' : '')]; }));
  S.getRange(2, 5, n, 1).setHorizontalAlignment('center');
}

function portalUrl_() {
  return getSettings_().url || ScriptApp.getService().getUrl() || '';
}

function openPortal() {
  var url = portalUrl_();
  var html = url ? '<a href="' + url + '" target="_blank" style="font-family:Arial;font-size:16px">פתיחת הפורטל ↗</a>'
                 : '<p style="font-family:Arial">עדיין לא בוצעה פריסה: Deploy > New deployment > Web app</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(260).setHeight(80), 'פורטל');
}

// ---------------------------------------------------------------- הצעות מסמכים מהצוות
// עמודות "בקשות": תאריך | שם המציע/ה | כותרת | קישור | קטגוריה | קהל | תיאור | סטטוס | הערות מערכת | תג"ב
var MAX_SUBMITS_PER_DAY = 40;

function ensureRequests_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var R = ss.getSheetByName(SHEET_REQ);
  if (R) {
    if (!R.getRange(1, 10).getValue()) {
      R.getRange(1, 10).setValue('תג"ב').setFontWeight('bold').setFontColor('#ffffff').setBackground('#b91c1c');
      R.getRange('J2:J').setNumberFormat('dd/MM/yyyy');
    }
    return R;
  }
  R = ss.insertSheet(SHEET_REQ);
  var h = ['תאריך', 'שם המציע/ה', 'כותרת', 'קישור', 'קטגוריה', 'קהל', 'תיאור', 'סטטוס', 'הערות מערכת', 'תג"ב'];
  R.getRange(1, 1, 1, h.length).setValues([h]);
  styleHeader_(R, h.length);
  R.getRange(1, 8).setBackground('#b45309');
  R.getRange(1, 10).setBackground('#b91c1c');
  R.getRange('J2:J').setNumberFormat('dd/MM/yyyy');
  R.setColumnWidth(2, 140); R.setColumnWidth(3, 240); R.setColumnWidth(4, 260); R.setColumnWidth(7, 240); R.setColumnWidth(9, 320);
  R.getRange('A2:A').setNumberFormat('dd/MM/yyyy HH:mm');
  dropdown_(R, 'H2:H', ['ממתין', 'אושר', 'נדחה']);
  var rule = function (v, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$H2="' + v + '"').setBackground(bg).setFontColor(fg).setRanges([R.getRange('A2:I')]).build();
  };
  R.setConditionalFormatRules([rule('ממתין', '#fffbeb', '#000000'), rule('אושר', '#ecfdf5', '#000000'), rule('נדחה', '#f1f5f9', '#94a3b8')]);
  return R;
}

function pendingCount_() {
  var R = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REQ);
  if (!R || R.getLastRow() < 2) return 0;
  return R.getRange(2, 8, R.getLastRow() - 1, 1).getValues().filter(function (x) { return x[0] === 'ממתין'; }).length;
}

function openRequests() {
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(ensureRequests_());
}

function fmt_(d, f) { return Utilities.formatDate(d, Session.getScriptTimeZone(), f); }

// טקסט מהמשתמשים: מקצר, ומונע שהגיליון יפרש אותו כנוסחה
function clean_(v, max) {
  var t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

// נקרא מהפורטל (google.script.run) כשמישהו מציע מסמך
function submitDoc(f) {
  f = f || {};
  if (f.website) return { ok: true }; // שדה מוסתר: רק בוטים ממלאים אותו
  var name = clean_(f.name, 60), title = clean_(f.title, 120), desc = clean_(f.desc, 300);
  var url = String(f.url || '').trim().slice(0, 500);
  if (!name || !title) return { ok: false, msg: 'חסרים שם או כותרת.' };
  if (!/^https:\/\/[^\s]+$/.test(url)) return { ok: false, msg: 'הקישור צריך להתחיל ב-https://' };
  var aud = { m: 'מש"קיות', n: 'מנה"דים', all: 'שניהם' }[f.aud] || 'שניהם';
  var due = '', dm = String(f.due || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dm) {
    due = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (isNaN(due) || due < today) return { ok: false, msg: 'התג"ב כבר עבר. בחרו תאריך עתידי או השאירו ריק.' };
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, msg: 'עומס רגעי. נסו שוב בעוד דקה.' };
  try {
    var props = PropertiesService.getScriptProperties(), key = 'sub_' + fmt_(new Date(), 'yyyyMMdd');
    var count = Number(props.getProperty(key)) || 0;
    if (count >= MAX_SUBMITS_PER_DAY) return { ok: false, msg: 'הגענו למכסת ההצעות היומית. נסו שוב מחר.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet(), R = ensureRequests_();
    var S = ss.getSheetByName(SHEET_SET), cats = [];
    if (S && S.getLastRow() > 1) cats = S.getRange(2, 4, S.getLastRow() - 1, 1).getValues().map(function (x) { return String(x[0]); });
    var cat = cats.indexOf(f.cat) > -1 ? f.cat : 'כללי';

    var id = driveId_(url);
    var same = function (u) { u = String(u).trim(); return u === url || (id && driveId_(u) === id); };
    var L = ss.getSheetByName(SHEET_LINKS);
    if (L.getLastRow() > 1 && L.getRange(2, 2, L.getLastRow() - 1, 1).getValues().some(function (r) { return same(r[0]); }))
      return { ok: false, msg: 'המסמך הזה כבר נמצא בפורטל 🙂' };
    if (R.getLastRow() > 1 && R.getRange(2, 4, R.getLastRow() - 1, 5).getValues().some(function (r) { return same(r[0]) && r[4] === 'ממתין'; }))
      return { ok: false, msg: 'המסמך הזה כבר הוצע ומחכה לאישור.' };

    R.getRange(R.getLastRow() + 1, 1, 1, 10).setValues([[new Date(), name, title, url, cat, aud, desc, 'ממתין', '', due]]);
    props.setProperty(key, String(count + 1));
  } finally { lock.releaseLock(); }

  notifyRequest_(name, title, url, aud);
  return { ok: true };
}

// מייל אליך בלבד (בעל הסקריפט) על הצעה חדשה
function notifyRequest_(name, title, url, aud) {
  try {
    var me = Session.getEffectiveUser().getEmail();
    if (!me) return;
    var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    MailApp.sendEmail({
      to: me,
      subject: '📨 הצעה חדשה לפורטל: ' + String(title).replace(/^'/, ''),
      htmlBody: '<div dir="rtl" style="font-family:Arial;font-size:15px;line-height:1.6">' +
        '<b>' + escapeHtml_(String(name).replace(/^'/, '')) + '</b> הציע/ה מסמך לפורטל (' + escapeHtml_(aud) + '):<br>' +
        '<a href="' + escapeHtml_(url) + '">' + escapeHtml_(String(title).replace(/^'/, '')) + '</a><br><br>' +
        'לאישור: בלשונית "בקשות" בוחרים <b>אושר</b> בעמודת הסטטוס.<br>' +
        '<a href="' + sheetUrl + '">פתיחת הגיליון</a></div>'
    });
  } catch (err) {}
}

// סטטוס "אושר": מעביר ללשונית הקישורים, פותח שיתוף לכל מי שיש לו את הקישור, ורושם הערה
function approveRequest_(R, r) {
  var v = R.getRange(r, 1, 1, 10).getValues()[0];
  if (String(v[8]).indexOf('פורסם') === 0 || !v[3]) return;
  var L = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LINKS);
  var forM = v[5] !== 'מנה"דים', forN = v[5] !== 'מש"קיות';
  // הגיליון מחזיר את הטקסט בלי סימן ההגנה ('), אז מגינים שוב לפני ההעתקה
  var desc = clean_(String(v[6] || '') + (v[1] ? (v[6] ? ' · ' : '') + 'הוצע ע"י ' + v[1] : ''), 400);
  L.getRange(L.getLastRow() + 1, 1, 1, 13).setValues([[clean_(v[2], 120), v[3], v[4] || 'כללי', forM, forN, desc, false, new Date(), 0, '', 0, 0, v[9] instanceof Date ? v[9] : '']]);

  var note = '';
  var id = driveId_(v[3]);
  if (id) {
    try {
      var item = String(v[3]).indexOf('/folders/') > -1 ? DriveApp.getFolderById(id) : DriveApp.getFileById(id);
      var acc = item.getSharingAccess();
      if (acc !== DriveApp.Access.ANYONE && acc !== DriveApp.Access.ANYONE_WITH_LINK) {
        item.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        note = ' · השיתוף נפתח לכל מי שיש לו את הקישור';
      }
    } catch (err) {
      note = ' · ⚠️ אין לי הרשאה לשנות את השיתוף. בקשו מהמציע/ה לשתף "כל מי שיש לו את הקישור"';
    }
  }
  R.getRange(r, 9).setValue('פורסם ' + fmt_(new Date(), 'dd/MM') + note);
}

// מריצים פעם אחת מהעורך אחרי העדכון, כדי לאשר את הרשאת המייל
function authorize() {
  MailApp.getRemainingDailyQuota();
  ensureRequests_();
  ensureIssues_();
  installBackupTrigger_();
}

// ---------------------------------------------------------------- דיווח על טעות במסמך
// עמודות "דיווחים": תאריך | מסמך | קישור | אחראי | מדווח/ת | מה הבעיה | סטטוס
var SHEET_ISSUES = 'דיווחים';
var MAX_REPORTS_PER_DAY = 60;

function ensureIssues_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var R = ss.getSheetByName(SHEET_ISSUES);
  if (R) return R;
  R = ss.insertSheet(SHEET_ISSUES);
  var h = ['תאריך', 'מסמך', 'קישור', 'אחראי', 'מדווח/ת', 'מה הבעיה', 'סטטוס'];
  R.getRange(1, 1, 1, h.length).setValues([h]);
  styleHeader_(R, h.length);
  R.getRange(1, 7).setBackground('#b45309');
  R.setColumnWidth(2, 240); R.setColumnWidth(3, 220); R.setColumnWidth(6, 380);
  R.getRange('A2:A').setNumberFormat('dd/MM/yyyy HH:mm');
  dropdown_(R, 'G2:G', ['פתוח', 'טופל']);
  var rule = function (v, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="' + v + '"').setBackground(bg).setFontColor(fg).setRanges([R.getRange('A2:G')]).build();
  };
  R.setConditionalFormatRules([rule('פתוח', '#fff7ed', '#000000'), rule('טופל', '#f1f5f9', '#94a3b8')]);
  return R;
}

function openIssuesCount_() {
  var R = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ISSUES);
  if (!R || R.getLastRow() < 2) return 0;
  return R.getRange(2, 7, R.getLastRow() - 1, 1).getValues().filter(function (x) { return x[0] === 'פתוח'; }).length;
}

function openIssues() {
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(ensureIssues_());
}

// נקרא מהפורטל. מקבל רק מסמך שקיים בפורטל.
function reportIssue(f) {
  f = f || {};
  if (f.website) return { ok: true };
  var msg = clean_(f.msg, 500), name = clean_(f.name, 60), url = String(f.u || '').trim();
  if (msg.length < 3) return { ok: false, msg: 'נא לכתוב בקצרה מה הבעיה.' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, msg: 'עומס רגעי. נסו שוב בעוד דקה.' };
  var title = '', owner = '';
  try {
    var props = PropertiesService.getScriptProperties(), key = 'rep_' + fmt_(new Date(), 'yyyyMMdd');
    var count = Number(props.getProperty(key)) || 0;
    if (count >= MAX_REPORTS_PER_DAY) return { ok: false, msg: 'הגענו למכסת הדיווחים היומית. נסו שוב מחר.' };
    var L = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LINKS);
    var rows = L.getLastRow() > 1 ? L.getRange(2, 1, L.getLastRow() - 1, 17).getValues() : [];
    var hit = rows.filter(function (r) { return String(r[1]).trim() === url; })[0];
    if (!hit) return { ok: false, msg: 'המסמך לא נמצא בפורטל.' };
    title = String(hit[0]); owner = String(hit[16] || '');
    var R = ensureIssues_();
    R.getRange(R.getLastRow() + 1, 1, 1, 7).setValues([[new Date(), clean_(title, 200), url, owner, name, msg, 'פתוח']]);
    props.setProperty(key, String(count + 1));
  } finally { lock.releaseLock(); }
  try {
    var me = Session.getEffectiveUser().getEmail();
    if (me) MailApp.sendEmail({
      to: me,
      subject: '🛠️ דיווח על טעות: ' + title,
      htmlBody: '<div dir="rtl" style="font-family:Arial;font-size:15px;line-height:1.6">' +
        '<b>' + escapeHtml_(String(name || 'מישהו מהצוות').replace(/^'/, '')) + '</b> דיווח/ה על בעיה ב-<a href="' + escapeHtml_(url) + '">' + escapeHtml_(title) + '</a>' +
        (owner ? ' (אחראי: ' + escapeHtml_(owner) + ')' : '') + ':<br><br>' + escapeHtml_(msg.replace(/^'/, '')) +
        '<br><br><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">פתיחת הגיליון</a> > לשונית "דיווחים"</div>'
    });
  } catch (err) {}
  return { ok: true };
}

// ---------------------------------------------------------------- גיבוי שבועי
var BACKUP_FOLDER = 'פורטל גשרים - גיבויים';
var BACKUPS_TO_KEEP = 8;

function installBackupTrigger_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'weeklyBackup'; });
  if (!has) ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(3).create();
}

function backupNow() {
  var name = weeklyBackup();
  try { SpreadsheetApp.getUi().alert('✅ נשמר גיבוי: ' + name + '\nבתיקייה "' + BACKUP_FOLDER + '" בדרייב שלך.'); } catch (err) {}
}

// עותק של הגיליון לתיקיית הגיבויים, ומחיקה (לפח) של גיבויים ישנים מעבר ל-8 האחרונים
function weeklyBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties(), folder = null;
  try { folder = DriveApp.getFolderById(props.getProperty('backupFolder')); } catch (err) {}
  if (!folder || folder.isTrashed()) { folder = DriveApp.createFolder(BACKUP_FOLDER); props.setProperty('backupFolder', folder.getId()); }
  var name = 'גיבוי ' + ss.getName() + ' ' + fmt_(new Date(), 'yyyy-MM-dd HH:mm');
  DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf('גיבוי ') === 0) files.push(f); }
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(BACKUPS_TO_KEEP).forEach(function (f) { f.setTrashed(true); });
  return name;
}

// ---------------------------------------------------------------- נתונים
function getSettings_() {
  var S = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SET);
  var v = S ? S.getRange(2, 2, 4, 1).getValues() : [['פורטל גשרים מדמ"ח'], [14], [true], ['']];
  return {
    title: v[0][0] || 'פורטל', days: Number(v[1][0]) || 14, checkDrive: String(v[2][0]).toUpperCase() !== 'FALSE',
    url: String(v[3][0] || '').trim().replace(/\?.*$/, '')
  };
}

function aud_(m, n) {
  if (m === true && n === true) return 'all';
  if (m === true) return 'm';
  if (n === true) return 'n';
  return null; // אין וי = טיוטה
}

function fileType_(url) {
  if (/\/presentation\//.test(url)) return 'slides';
  if (/\/spreadsheets\//.test(url)) return 'sheet';
  if (/\/document\//.test(url)) return 'doc';
  if (/\/forms\/|forms\.gle/.test(url)) return 'form';
  if (/\/folders\//.test(url)) return 'folder';
  if (/drive\.google\.com\/(file|open)/.test(url)) return 'file';
  return 'link';
}

// מחזיר {url: זמן עדכון אחרון בדרייב}. קורא את כל הזיכרון הזמני בפעם אחת (במקום פנייה לכל קישור),
// ופונה לדרייב רק על מה שחסר. אם הבדיקה מתארכת, מפסיקים כדי שהדף ייטען מהר. השאר יושלם בכניסה הבאה.
var DRIVE_BUDGET_MS = 8000;
function driveUpdatedAll_(urls) {
  var cache = CacheService.getScriptCache(), start = Date.now();
  var ids = {}, out = {}, put = {};
  urls.forEach(function (u) { var id = driveId_(u); if (id) ids[u] = id; });
  var keys = Object.keys(ids).map(function (u) { return 'u_' + ids[u]; });
  var hit = keys.length ? cache.getAll(keys) : {};
  Object.keys(ids).forEach(function (u) {
    var k = 'u_' + ids[u], v = hit[k] || put[k];
    if (!v) {
      if (Date.now() - start > DRIVE_BUDGET_MS) { out[u] = null; return; }
      var t = null;
      try { t = (u.indexOf('/folders/') > -1 ? DriveApp.getFolderById(ids[u]) : DriveApp.getFileById(ids[u])).getLastUpdated().getTime(); }
      catch (err) { t = null; }
      v = put[k] = t ? String(t) : 'x';
    }
    out[u] = v === 'x' ? null : Number(v);
  });
  if (Object.keys(put).length) cache.putAll(put, 1800);
  return out;
}

// winDays: חלון "חדש/עודכן" בימים. ברירת המחדל לפי הגדרות B3 (העדכון השבועי שולח 7).
function getData_(winDays) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var st = getSettings_();
  var now = Date.now(), win = (winDays || st.days) * 86400000;

  var links = [];
  var L = ss.getSheetByName(SHEET_LINKS);
  if (L && L.getLastRow() > 1) {
    var times = L.getRange(2, 16, L.getLastRow() - 1, 1).getDisplayValues();
    var rows = L.getRange(2, 1, L.getLastRow() - 1, 19).getValues().map(function (r, i) { r.time = times[i][0]; return r; }).filter(function (r) {
      // רק קישורי http(s). קישור מסוג אחר (למשל javascript:) לא יוצג בפורטל
      return r[0] && /^https?:\/\//i.test(String(r[1] || '').trim()) && aud_(r[3], r[4]);
    });
    var updAll = st.checkDrive ? driveUpdatedAll_(rows.map(function (r) { return String(r[1]).trim(); })) : {};
    rows.forEach(function (r) {
      var url = String(r[1]).trim(), a = aud_(r[3], r[4]);
      var added = r[7] instanceof Date ? r[7].getTime() : null;
      var upd = updAll[url] || null;
      var isNew = added && now - added <= win, nd = r[18] === true ? null : nextDue_(r, now, r.time);
      links.push({
        t: String(r[0]), u: url, c: String(r[2] || 'כללי'), a: a, d: String(r[5] || ''),
        p: r[6] === true, type: fileType_(url),
        isNew: !!isNew, isUpd: !isNew && upd && now - upd <= win,
        when: Math.max(added || 0, upd || 0),
        due: nd ? fmt_(nd.at, 'yyyy-MM-dd') : '', dueTs: nd ? nd.at.getTime() : 0, dueT: nd ? nd.time : '', rec: nd ? nd.rec : '',
        o: String(r[16] || '').trim(), s: String(r[17] || '').trim(), x: r[18] === true, v: Number(r[8]) || 0
      });
    });
  }

  var msgs = [];
  var M = ss.getSheetByName(SHEET_MSGS);
  if (M && M.getLastRow() > 1) {
    var startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    M.getRange(2, 1, M.getLastRow() - 1, 7).getValues().forEach(function (r) {
      var a = aud_(r[3], r[4]);
      if ((!r[1] && !r[2]) || !a) return;
      if (r[6] instanceof Date && r[6].getTime() < startToday.getTime()) return;
      msgs.push({
        date: r[0] instanceof Date ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'dd/MM') : '',
        t: String(r[1] || ''), b: String(r[2] || ''), a: a,
        lvl: String(r[5]).indexOf('דחוף') > -1 ? 'urgent' : (String(r[5]).indexOf('חשוב') > -1 ? 'important' : 'normal'),
        ts: r[0] instanceof Date ? r[0].getTime() : 0
      });
    });
    var rank = { urgent: 0, important: 1, normal: 2 };
    msgs.sort(function (x, y) { return rank[x.lvl] - rank[y.lvl] || y.ts - x.ts; });
  }
  // קטגוריות לפי הסדר בהגדרות, עם אימוג'י (E) וצבע (מילוי התא ב-D. לבן = בלי צבע)
  var S = ss.getSheetByName(SHEET_SET), cats = [], cm = {};
  if (S && S.getLastRow() > 1) {
    var n = S.getLastRow() - 1, cv = S.getRange(2, 4, n, 2).getValues(), bg = S.getRange(2, 4, n, 1).getBackgrounds();
    cv.forEach(function (x, i) {
      var c = String(x[0]).trim();
      if (!c) return;
      cats.push(c);
      var col = String(bg[i][0] || '').toLowerCase();
      cm[c] = { e: String(x[1] || '').trim(), c: /^#[0-9a-f]{6}$/.test(col) && col !== '#ffffff' ? col : '' };
    });
  }
  return { title: st.title, days: st.days, links: links, msgs: msgs, cats: cats, cm: cm };
}

// ---------------------------------------------------------------- זיכרון זמני לנתוני הפורטל
// כל כניסה לפורטל קוראת את הגיליון. עם עשרות כניסות בבת אחת זה איטי, וגוגל מגבילה ל-30 הרצות במקביל.
// לכן הנתונים נשמרים בזיכרון ל-2 דקות, ומתנקים בכל עריכה בגיליון (או ב"רענון הפורטל" בתפריט).
// הזיכרון מוגבל ל-100KB לערך, אז הנתונים נשמרים בחלקים.
var DATA_CACHE_SEC = 120, CACHE_CHUNK = 40000;
function portalData_() {
  var c = CacheService.getScriptCache();
  try {
    var n = Number(c.get('pd_n'));
    if (n > 0) {
      var keys = [];
      for (var i = 0; i < n; i++) keys.push('pd_' + i);
      var got = c.getAll(keys), parts = keys.map(function (k) { return got[k]; });
      if (parts.every(function (x) { return x != null; })) return JSON.parse(parts.join(''));
    }
  } catch (err) {}
  var data = getData_(), json = JSON.stringify(data), put = {}, pos = 0, k = 0;
  while (pos < json.length) {
    var end = Math.min(pos + CACHE_CHUNK, json.length);
    var code = json.charCodeAt(end - 1);
    if (end < json.length && code >= 0xD800 && code <= 0xDBFF) end--; // לא לחתוך אימוג'י באמצע
    put['pd_' + k++] = json.slice(pos, end);
    pos = end;
  }
  if (k <= 20) { put.pd_n = String(k); try { c.putAll(put, DATA_CACHE_SEC); } catch (err) {} }
  return data;
}
function clearPortalCache_() {
  try { CacheService.getScriptCache().remove('pd_n'); } catch (err) {}
}
function refreshPortal() {
  clearPortalCache_();
  SpreadsheetApp.getUi().alert('✅ הפורטל יציג את השינויים האחרונים בכניסה הבאה.\n(שינויים בגיליון מתעדכנים לבד. זה נחוץ רק אחרי שינוי צבעים.)');
}

// ---------------------------------------------------------------- טיוטת עדכון שבועי
// בונה נוסח מוכן להעתקה (וואטסאפ / מייל) של מה שחדש ועודכן ב-7 הימים האחרונים. לא שולח כלום.
function weeklyDigest() {
  var data = getData_(7), url = portalUrl_(), weekAgo = Date.now() - 7 * 86400000;
  var NAME = { m: 'מש"קיות', n: 'מנה"דים' };
  function text(who) {
    var mine = function (x) { return !x.x && (x.a === 'all' || x.a === who); };
    var links = data.links.filter(mine).filter(function (l) { return l.isNew || l.isUpd; })
      .sort(function (a, b) { return b.when - a.when; });
    var msgs = data.msgs.filter(mine).filter(function (m) { return m.ts >= weekAgo; });
    var out = ['היי צוות 👋', '', 'העדכון השבועי מפורטל גשרים מדמ"ח:'];
    if (msgs.length) {
      out.push('', '📢 הודעות:');
      msgs.forEach(function (m) { out.push((m.lvl === 'urgent' ? '🔴 ' : m.lvl === 'important' ? '🟡 ' : '• ') + m.t + (m.b ? ': ' + m.b.replace(/\n+/g, ' ') : '')); });
    }
    var todayStr = fmt_(new Date(), 'yyyy-MM-dd'), in14 = fmt_(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd');
    var due = data.links.filter(mine).filter(function (l) { return l.due && l.due >= todayStr && l.due <= in14; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    if (due.length) {
      out.push('', '⏰ למילוי:');
      due.forEach(function (l) {
        var d = l.due.split('-');
        out.push('• ' + l.t + ' (עד ' + d[2] + '/' + d[1] + (l.dueT ? ' ' + l.dueT : '') + (l.rec ? ', ' + l.rec : '') + ')');
      });
    }
    out.push('', '📄 מסמכים:');
    if (links.length) links.forEach(function (l) { out.push((l.isNew ? '🆕 ' : '✏️ ') + l.t + (l.isNew ? '' : ' (עודכן)')); });
    else out.push('השבוע לא נוספו מסמכים חדשים.');
    if (url) out.push('', 'הכל בפורטל: ' + url + '?role=' + who);
    return { name: NAME[who], body: out.join('\n') };
  }
  var parts = [text('m'), text('n')].map(function (t, i) {
    return '<h3>ל' + t.name + '</h3><textarea id="t' + i + '">' + escapeHtml_(t.body) + '</textarea>' +
      '<button onclick="var x=document.getElementById(\'t' + i + '\');x.select();document.execCommand(\'copy\');this.textContent=\'הועתק ✓\'">📋 העתקה</button>';
  }).join('');
  var html = '<div dir="rtl" style="font-family:Arial">' +
    '<style>h3{margin:14px 0 6px;color:#0f766e}textarea{width:100%;height:170px;font:14px Arial;direction:rtl;box-sizing:border-box}' +
    'button{margin-top:6px;padding:6px 14px;border:0;border-radius:8px;background:#0f766e;color:#fff;cursor:pointer}</style>' +
    (url ? '' : '<p style="color:#b91c1c">טיפ: הדביקו את קישור הפורטל בלשונית הגדרות, תא B5, והוא יתווסף לנוסח.</p>') +
    parts + '<p style="color:#64748b;font-size:12px">זו טיוטה בלבד. שום דבר לא נשלח.</p></div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(560), '✉️ טיוטת עדכון שבועי');
}

// ---------------------------------------------------------------- אפליקציית הרשת
// אייקון הפורטל (לשונית הדפדפן ומסך הבית). חייב להיות קישור ל-PNG.
var ICON_URL = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f309/512.png';
function doGet(e) {
  var data = portalData_();
  var role = (e && e.parameter && e.parameter.role) || 'all';
  if (['all', 'm', 'n'].indexOf(role) < 0) role = 'all';
  var json = JSON.stringify(data).replace(/</g, '\\u003c');
  var title = escapeHtml_(data.title);
  var html = PAGE_.replace('__DATA__', function () { return json; }).replace('__ROLE__', role).replace(/__TITLE__/g, function () { return title; });
  return HtmlService.createHtmlOutput(html)
    .setTitle(data.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setFaviconUrl(ICON_URL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var PAGE_ = String.raw`
<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>__TITLE__</title><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3f5fa;--surface:#fff;--surface2:#f6f8fc;--ink:#0b1324;--muted:#5b6478;--line:#e4e9f1;--brand:#0f766e;--brand2:#14b8a6;--soft:#d5f5ef;
  --shadow:0 1px 2px rgba(15,23,42,.04),0 4px 16px rgba(15,23,42,.06);--shadow2:0 12px 32px rgba(15,23,42,.14);--r:16px}
@media (prefers-color-scheme:dark){:root{--bg:#0a0f1c;--surface:#121a2b;--surface2:#0e1524;--ink:#e8edf6;--muted:#9aa6bb;--line:#1f2a3f;--soft:rgba(20,184,166,.16);
  --shadow:0 1px 2px rgba(0,0,0,.35);--shadow2:0 12px 32px rgba(0,0,0,.55)}}
*{box-sizing:border-box}
[hidden]{display:none!important}
body.lock{overflow:hidden}
html{scroll-behavior:smooth}
body{margin:0;font-family:Heebo,Arial,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.5}
button,input,select,textarea{font-family:inherit}
svg{display:block}
.wrap{max-width:1120px;margin:0 auto;padding:0 16px;position:relative}

/* ---- כותרת */
.hero{position:relative;overflow:hidden;color:#fff;background:linear-gradient(135deg,#0f766e 0%,#0e7490 48%,#1e3a8a 100%);padding:32px 0 66px}
.hero:before{content:"";position:absolute;inset:0;background:radial-gradient(620px 300px at 90% -20%,rgba(255,255,255,.2),transparent 60%),radial-gradient(520px 280px at 0% 130%,rgba(45,212,191,.4),transparent 60%)}
.hero:after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.13) 1px,transparent 1px);background-size:20px 20px;-webkit-mask-image:linear-gradient(#000,transparent 85%);mask-image:linear-gradient(#000,transparent 85%)}
.hero .wrap{z-index:1}
.brand{display:flex;align-items:center;gap:14px}
.logo{flex:0 0 52px;height:52px;border-radius:16px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);display:grid;place-items:center;font-size:28px;box-shadow:0 8px 24px rgba(0,0,0,.15)}
h1{margin:0;font-size:clamp(23px,4.2vw,34px);font-weight:800;letter-spacing:-.02em;line-height:1.15}
.sub{margin:4px 0 0;opacity:.88;font-size:15px}
.who{display:inline-block;margin-inline-start:8px;vertical-align:middle;font-size:12px;font-weight:700;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:2px 10px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
.stat{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 13px;font-size:13.5px}
.stat b{font-weight:800}
.seg{display:inline-flex;gap:4px;margin-top:16px;padding:4px;border-radius:999px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.18)}
.chip{border:0;background:none;color:#fff;opacity:.85;border-radius:999px;padding:7px 16px;font-size:14px;font-weight:600;cursor:pointer}
.chip.on{background:#fff;color:var(--brand);opacity:1;box-shadow:0 2px 8px rgba(0,0,0,.15)}

/* ---- חיפוש, סרגל כלים וניווט */
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.tools{display:flex;gap:8px;align-items:center;margin-top:12px}
.sel{position:relative;flex:1;min-width:0;max-width:220px}
.sel select{width:100%;appearance:none;-webkit-appearance:none;font-size:16px;padding:9px 12px 9px 30px;border:1px solid var(--line);border-radius:12px;text-overflow:ellipsis;background:var(--surface);color:var(--ink);cursor:pointer;box-shadow:var(--shadow)}
.sel:after{content:"▾";position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;font-size:12px}
.vt{display:flex;gap:2px;margin-inline-start:auto;padding:3px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
.vt button{width:38px;height:36px;display:grid;place-items:center;border:0;border-radius:9px;background:none;color:var(--muted);cursor:pointer}
.vt button svg{width:18px;height:18px}
.vt button.on{background:var(--soft);color:var(--brand)}
/* פירורי הלחם צפים מתחת לשורת הקטגוריות, כדי שהופעתם לא תזיז את התוכן */
.nav .wrap{position:relative}
.crumb{position:absolute;top:100%;right:0;left:0;padding:0 16px 6px;display:flex;align-items:center;gap:6px;height:30px;opacity:0;pointer-events:none;font-size:13px;color:var(--muted);transition:opacity .15s;white-space:nowrap;
  background:var(--bg);border-bottom:1px solid var(--line)}
.crumb.show{opacity:1;pointer-events:auto}
.crumb b{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis}
.crumb button{border:0;background:none;color:var(--brand);font-size:13px;font-weight:600;cursor:pointer;padding:0}
.pill.on{background:var(--brand);border-color:var(--brand);color:#fff}
.pill.on small{color:rgba(255,255,255,.8)}
mark{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px}
@media (prefers-color-scheme:dark){mark{background:rgba(250,204,21,.35)}}
.tip{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px 12px;border-radius:14px;background:var(--soft);color:var(--brand);font-size:14px;font-weight:500}
.tip span{flex:1}
@media (prefers-color-scheme:dark){.tip{color:#5eead4}.tip button{color:#5eead4}}
.tip button{border:0;background:var(--surface);color:var(--brand);border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer}
.tip .tipx{background:none;padding:4px 6px;font-size:18px;color:var(--muted)}
.box{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow2);padding:0 18px;color:var(--muted)}
.box svg{width:20px;height:20px;flex:0 0 auto}
#q{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:16.5px;padding:16px 0;color:var(--ink)}
#q::placeholder{color:var(--muted)}
/* הסרגל הצף: חיפוש + שורת הקטגוריות. בראש הדף הוא חופף לתחתית הכותרת, ובגלילה נצמד למעלה עם רקע */
.nav{position:sticky;top:0;z-index:5;margin-top:-30px;transition:background .15s,box-shadow .15s}
.nav.stuck{background:var(--bg);box-shadow:0 6px 18px rgba(15,23,42,.08)}
.nav .box{transition:box-shadow .15s}
.nav.stuck .box{box-shadow:var(--shadow);margin-top:8px}
.nav.stuck #q{padding:11px 0}
@media (prefers-color-scheme:dark){.nav.stuck{box-shadow:0 6px 18px rgba(0,0,0,.45)}}
.pills{display:flex;gap:8px;overflow-x:auto;padding:14px 0 10px;scrollbar-width:none}
.pills::-webkit-scrollbar{display:none}
.pill{flex:0 0 auto;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 14px;font-size:13.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:.15s}
.pill:hover{border-color:var(--brand2);color:var(--brand)}
.pill small{color:var(--muted);margin-inline-start:4px}
.res{color:var(--muted);font-size:14px;padding:4px 2px}

/* ---- הודעות */
.msg{display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-inline-start:4px solid var(--brand2);border-radius:14px;padding:14px 16px;margin-top:12px;box-shadow:var(--shadow)}
.msg .mi{font-size:20px;line-height:1.3}
.msg b{display:block;font-size:15.5px}
.msg p{margin:2px 0 0;color:var(--muted);font-size:14.5px}
.msg small{color:var(--muted);font-size:12px}
.msg.important{border-inline-start-color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,var(--surface))}
.msg.urgent{border-inline-start-color:#ef4444;background:color-mix(in srgb,#ef4444 9%,var(--surface))}

/* ---- אזורים וכרטיסים */
.sec{margin-top:30px;scroll-margin-top:150px}
/* קטגוריה מקופלת: כותרת שהיא כפתור. תת-קטגוריה: שורה מקופלת בתוך הקטגוריה */
.catsec{margin-top:12px}
.cath{display:flex;align-items:center;gap:12px;width:100%;text-align:start;border:1px solid var(--line);border-inline-start:4px solid var(--k);background:var(--surface);color:var(--ink);
  border-radius:16px;padding:12px 14px;cursor:pointer;box-shadow:var(--shadow);font-size:17px;transition:border-color .15s,box-shadow .15s}
.cath:hover{box-shadow:var(--shadow2)}
.cath .hi{flex:0 0 38px;height:38px;border-radius:12px;background:var(--ks);display:grid;place-items:center;font-size:19px}
.cath .ct{flex:1;min-width:0;display:flex;flex-direction:column}
.cath .ct b{font-weight:700;line-height:1.3}
.cath .ct small{color:var(--muted);font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cath .n,.subh .n{font-size:12px;font-weight:700;color:var(--muted);background:var(--surface2);border:1px solid var(--line);border-radius:999px;padding:1px 9px}
.chev{width:22px;height:22px;flex:0 0 22px;display:grid;place-items:center;color:var(--muted);transition:transform .2s}
.chev:before{content:"";width:8px;height:8px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(-45deg)}
.open>.cath .chev,.subh[aria-expanded=true] .chev{transform:rotate(180deg)}
.open>.cath{border-radius:16px 16px 6px 6px}
.catbody{padding:12px 0 6px}
.subh{display:flex;align-items:center;gap:10px;width:100%;margin:8px 0;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);
  color:var(--k);font-size:15px;font-weight:700;text-align:start;cursor:pointer;scroll-margin-top:150px}
.subh .st{flex:1}
.subh[aria-expanded=true]{margin-bottom:12px}
.subgrid{margin-bottom:14px}
.cathead{display:flex;align-items:center;gap:10px;margin-top:30px;scroll-margin-top:150px}
.cathead h2{flex:1;margin:0}
.xall{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:9px 12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:var(--shadow);white-space:nowrap}
.archt{display:flex;align-items:center;gap:10px;width:100%;border:1px dashed var(--line);background:none;color:var(--muted);border-radius:14px;padding:12px 14px;font-size:16px;font-weight:700;cursor:pointer;text-align:start}
.archt .hi{width:30px;height:30px;border-radius:10px;background:var(--surface2);display:grid;place-items:center}
.archt .chev{margin-inline-start:auto}
.archt .n{font-size:12px;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:1px 9px}
.archnote{color:var(--muted);font-size:13.5px;margin:10px 2px}
.cw.old{opacity:.75}
.tag.arch{background:var(--surface2);color:var(--muted);border:1px solid var(--line)}
h2{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:700;margin:0 0 14px;letter-spacing:-.01em}
h2 .hi{width:34px;height:34px;border-radius:11px;background:var(--soft);display:grid;place-items:center;font-size:17px}
h2 .n{font-size:12px;font-weight:700;color:var(--muted);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:1px 9px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:14px}
.cw{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);transition:transform .18s,box-shadow .18s,border-color .18s;animation:in .35s ease both}
.cw:hover{transform:translateY(-2px);box-shadow:var(--shadow2);border-color:color-mix(in srgb,var(--brand2) 45%,var(--line))}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
a.card{flex:1;display:flex;gap:14px;align-items:flex-start;padding:16px 16px 6px;text-decoration:none;color:inherit;border-radius:var(--r) var(--r) 0 0;outline:0}
a.card:focus-visible{box-shadow:inset 0 0 0 2px var(--brand2)}
.ic{flex:0 0 46px;height:46px;border-radius:13px;display:grid;place-items:center}
.ic svg{width:23px;height:23px}
.t-doc{background:#dbeafe;color:#1d4ed8}.t-slides{background:#fef3c7;color:#b45309}.t-sheet{background:#dcfce7;color:#15803d}
.t-form{background:#ede9fe;color:#6d28d9}.t-folder{background:#e2e8f0;color:#475569}.t-file,.t-link{background:#ccfbf1;color:#0f766e}
@media (prefers-color-scheme:dark){.t-doc{background:rgba(59,130,246,.16);color:#93c5fd}.t-slides{background:rgba(245,158,11,.16);color:#fcd34d}
  .t-sheet{background:rgba(34,197,94,.16);color:#86efac}.t-form{background:rgba(139,92,246,.18);color:#c4b5fd}
  .t-folder{background:rgba(148,163,184,.16);color:#cbd5e1}.t-file,.t-link{background:rgba(20,184,166,.16);color:#5eead4}}
.body{min-width:0;flex:1}
.tt{font-weight:700;font-size:15.5px;line-height:1.35;overflow-wrap:anywhere}
.dd{color:var(--muted);font-size:13.5px;margin-top:3px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:12px;color:var(--muted)}
.tag{font-size:11.5px;font-weight:700;border-radius:6px;padding:1px 8px}
.tag.due{background:#e0e7ff;color:#3730a3}.tag.due.soon{background:#fee2e2;color:#b91c1c}.tag.due.past{background:var(--surface2);color:var(--muted);border:1px solid var(--line)}
.tag.rec{background:#f3e8ff;color:#6b21a8}
.own:before{content:"·";margin-inline-end:6px;color:var(--line)}
.cw.hot{border-color:#fca5a5;box-shadow:0 0 0 3px rgba(239,68,68,.08),var(--shadow)}
.tag.new{background:#dcfce7;color:#166534}.tag.upd{background:#dbeafe;color:#1e40af}.tag.pin{background:#fef3c7;color:#92400e}.tag.aud{background:var(--surface2);color:var(--muted);border:1px solid var(--line)}
@media (prefers-color-scheme:dark){.tag.rec{background:rgba(168,85,247,.2);color:#d8b4fe}.tag.due{background:rgba(99,102,241,.2);color:#c7d2fe}.tag.due.soon{background:rgba(239,68,68,.2);color:#fca5a5}.cw.hot{border-color:rgba(239,68,68,.5)}.tag.new{background:rgba(34,197,94,.18);color:#86efac}.tag.upd{background:rgba(59,130,246,.2);color:#93c5fd}.tag.pin{background:rgba(245,158,11,.2);color:#fcd34d}}
.acts{display:flex;justify-content:flex-end;gap:2px;padding:0 8px 8px}
.act{width:36px;height:36px;display:grid;place-items:center;border:0;background:none;border-radius:10px;color:var(--muted);cursor:pointer;text-decoration:none;transition:.15s}
.act svg{width:18px;height:18px}
.act:hover,.act:focus-visible{background:var(--surface2);color:var(--ink);outline:0}
.act.on{color:#f59e0b}
.more{display:block;margin:14px auto 0;border:1px solid var(--line);background:var(--surface);color:var(--brand);border-radius:999px;padding:9px 20px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:var(--shadow)}
.more:hover{border-color:var(--brand2)}
.empty{text-align:center;color:var(--muted);padding:56px 16px}
.empty .big{font-size:42px}
footer{color:var(--muted);font-size:12.5px;text-align:center;padding:40px 16px 110px}

/* ---- הצעת מסמך */
.fab{position:fixed;right:20px;bottom:calc(20px + env(safe-area-inset-bottom));z-index:20;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:14px 20px 14px 22px;background:linear-gradient(135deg,#0f766e,#1e3a8a);color:#fff;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 12px 28px rgba(15,118,110,.38);transition:transform .15s}
.fab:hover{transform:translateY(-2px)}
.fab svg{width:20px;height:20px}
.modal{position:fixed;inset:0;z-index:30;background:rgba(2,6,23,.55);display:flex;align-items:flex-end;justify-content:center;animation:fade .2s}
.modal[hidden]{display:none}
@keyframes fade{from{opacity:0}}
.sheet{position:relative;width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--surface);color:var(--ink);border-radius:22px 22px 0 0;padding:24px 22px 22px;box-shadow:var(--shadow2);animation:up .25s ease}
@keyframes up{from{transform:translateY(30px);opacity:0}}
@media (min-width:640px){.modal{align-items:center;padding:20px}.sheet{border-radius:22px}}
.sheet h3{margin:0;font-size:21px;font-weight:800}
.sheet .lead{margin:4px 0 6px;color:var(--muted);font-size:14px}
.x{position:absolute;left:14px;top:14px;width:36px;height:36px;border:0;border-radius:10px;background:var(--surface2);color:var(--muted);font-size:20px;cursor:pointer}
.f{display:block;margin-top:14px;font-size:13.5px;font-weight:600}
.f input,.f select,.f textarea{display:block;width:100%;margin-top:6px;font-size:15px;padding:11px 13px;border:1px solid var(--line);border-radius:11px;background:var(--surface2);color:var(--ink);outline:0;transition:.15s}
.f input:focus,.f select:focus,.f textarea:focus{border-color:var(--brand2);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand2) 22%,transparent)}
.f textarea{resize:vertical}
.radios{display:flex;gap:8px;margin-top:6px}
.radios label{flex:1;position:relative}
.radios input{position:absolute;opacity:0}
.radios span{display:block;text-align:center;padding:10px 6px;border:1px solid var(--line);border-radius:11px;background:var(--surface2);font-weight:500;cursor:pointer;transition:.15s}
.radios input:checked+span{border-color:var(--brand);background:var(--soft);color:var(--brand);font-weight:700}
.radios input:focus-visible+span{box-shadow:0 0 0 3px color-mix(in srgb,var(--brand2) 30%,transparent)}
.hint{margin:14px 0 0;font-size:13px;color:var(--muted);background:var(--surface2);border-radius:10px;padding:10px 12px}
.err{margin:12px 0 0;color:#dc2626;font-size:14px;font-weight:600}
.btn{display:block;width:100%;margin-top:16px;border:0;border-radius:13px;padding:14px;background:var(--brand);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
.btn:disabled{opacity:.6;cursor:wait}
.btn.ghost{background:var(--surface2);color:var(--ink)}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.ok{text-align:center;padding:18px 4px 4px}
.ok .big{width:64px;height:64px;margin:0 auto 10px;border-radius:50%;background:var(--soft);color:var(--brand);display:grid;place-items:center;font-size:32px}
#toast{position:fixed;bottom:88px;left:50%;transform:translate(-50%,10px);z-index:40;background:#0b1324;color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;opacity:0;transition:.2s;pointer-events:none;white-space:nowrap}
#toast.show{opacity:1;transform:translate(-50%,0)}
@media (max-width:480px){.fab span{display:none}.fab{padding:16px}}
.totop{position:fixed;left:20px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:19;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:grid;place-items:center;box-shadow:var(--shadow2);cursor:pointer;opacity:0;pointer-events:none;transform:translateY(10px);transition:.2s}
.totop.show{opacity:1;pointer-events:auto;transform:none}
.totop svg{width:20px;height:20px}
.flink{margin-top:8px;border:0;background:none;color:var(--brand);font-size:13px;font-weight:600;cursor:pointer}
.quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.quick button{border:1px solid var(--line);background:var(--surface2);color:var(--ink);border-radius:999px;padding:7px 12px;font-size:13.5px;cursor:pointer}
.quick button.on{border-color:var(--brand);background:var(--soft);color:var(--brand);font-weight:600}
.howto{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:14px}
.howto ol{margin:8px 0 0;padding-inline-start:20px;line-height:1.9}
.k{display:inline-block;background:var(--surface2);border:1px solid var(--line);border-radius:7px;padding:0 7px;font-weight:600}

/* ---- תצוגת רשימה */
body.list .grid{grid-template-columns:1fr;gap:8px}
body.list .cw{flex-direction:row;align-items:center;animation:none}
body.list a.card{padding:10px 14px;align-items:center;gap:12px}
body.list .ic{flex-basis:36px;height:36px;border-radius:10px}
body.list .ic svg{width:19px;height:19px}
body.list .dd{-webkit-line-clamp:1}
body.list .meta{margin-top:4px}
body.list .acts{padding:0 8px 0 6px;align-self:center}
@media (max-width:600px){body.list .cw{flex-direction:column;align-items:stretch}body.list .acts{padding:0 6px 4px}body.list .dd{display:none}}

/* ---- צבעי קטגוריות (המשתנים נקבעים לכל כרטיס / אזור) */
.cat{--k:var(--cc);--ks:var(--cs)}
@media (prefers-color-scheme:dark){.cat{--k:var(--ccd);--ks:var(--csd)}}
.cw.cat{border-inline-start:4px solid var(--k)}
.sec.cat h2 .hi{background:var(--ks)}
.sec.cat .subh{color:var(--k)}
.catchip{color:var(--k);font-weight:700}
.pill .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--k);margin-inline-end:7px;vertical-align:1px}
.pill.cat.on{background:var(--k);border-color:var(--k)}
.pill.cat.on .dot{background:#fff}

/* ---- נייד: פס עליון מכווץ וסרגל ניווט תחתון */
.bnav{display:none}
@media (max-width:700px){
  .bnav{display:flex;align-items:flex-end;position:fixed;left:0;right:0;bottom:0;z-index:20;background:var(--surface);border-top:1px solid var(--line);
    padding:6px 4px calc(6px + env(safe-area-inset-bottom));box-shadow:0 -6px 22px rgba(15,23,42,.08)}
  .bnav button{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;border:0;background:none;color:var(--muted);font-size:11.5px;font-weight:600;padding:3px 0;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .bnav button svg{width:23px;height:23px}
  .bnav button.on{color:var(--brand)}
  .bnav .bplus{flex:0 0 70px}
  .bnav .bplus i{width:54px;height:54px;margin-top:-26px;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#0f766e,#1e3a8a);border:4px solid var(--surface);box-shadow:0 8px 20px rgba(15,118,110,.35)}
  .bnav .bplus i svg{width:24px;height:24px}
  .badge{position:absolute;top:-2px;left:50%;margin-left:4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;border:2px solid var(--surface)}
  .fab,.totop{display:none}
  #toast{bottom:calc(96px + env(safe-area-inset-bottom))}
  footer{padding-bottom:calc(120px + env(safe-area-inset-bottom))}
}
@media (max-width:700px) and (prefers-color-scheme:dark){.bnav{box-shadow:0 -6px 22px rgba(0,0,0,.4)}}

/* ---- נייד ומגע */
@media (max-width:480px){.hero{padding:22px 0 58px}.stats{margin-top:14px}.logo{flex-basis:44px;height:44px;font-size:24px}.sec{margin-top:24px}h2{font-size:17.5px}}
@media (hover:none){.cw:hover{transform:none;box-shadow:var(--shadow);border-color:var(--line)}.fab:hover{transform:none}}
@media (pointer:coarse){.act{width:42px;height:42px}.pill{padding:8px 14px}}
.f input,.f select,.f textarea{font-size:16px!important}
.sheet{padding-bottom:calc(22px + env(safe-area-inset-bottom))}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}html{scroll-behavior:auto}}
/* במצב כהה, טקסט בצבע המותג מקבל גוון בהיר יותר כדי להיות קריא (בסוף, כדי לגבור על ההגדרות שלמעלה) */
@media (prefers-color-scheme:dark){.more,.flink,.crumb button,.vt button.on,.radios input:checked+span,.ok .big,.bnav button.on,.pill:hover{color:#5eead4}}
</style></head><body>
<header class="hero"><div class="wrap">
  <div class="brand"><div class="logo">🌉</div><div><h1>__TITLE__<span class="who" id="who" hidden></span></h1><p class="sub">כל מה שצריך לעבודה, במקום אחד</p></div></div>
  <div class="stats" id="stats"></div>
  <div class="seg" id="seg" hidden><button class="chip" data-r="all">הכל</button><button class="chip" data-r="m">מש"קיות</button><button class="chip" data-r="n">מנה"דים</button></div>
</div></header>
<div class="nav" id="nav"><div class="wrap"><label class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" type="search" placeholder="חיפוש מסמך, נושא או קטגוריה..." autocomplete="off" aria-label="חיפוש"></label><div class="pills" id="pills"></div><div class="crumb" id="crumb"></div></div></div>
<div class="wrap tools">
  <label class="sel"><span class="sr">סוג קובץ</span><select id="ftype" aria-label="סינון לפי סוג קובץ"></select></label>
  <label class="sel"><span class="sr">מיון</span><select id="fsort" aria-label="מיון בתוך הקטגוריות">
    <option value="sheet">סדר מומלץ</option><option value="az">א-ב</option><option value="new">חדש ביותר</option><option value="top">הכי נצפה</option></select></label>
  <div class="vt" role="group" aria-label="תצוגה">
    <button type="button" data-view="grid" title="כרטיסים" aria-label="תצוגת כרטיסים"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></button>
    <button type="button" data-view="list" title="רשימה" aria-label="תצוגת רשימה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg></button>
  </div>
</div>
<main class="wrap"><div class="tip" id="tip" hidden><span>📲 שמרו את הפורטל במסך הבית, ותמיד יהיה בהישג יד</span><button type="button" data-a2hs>איך?</button><button type="button" class="tipx" data-tipx aria-label="סגירה">×</button></div>
<div id="msgs"></div><div id="out"></div></main>
<footer>הפורטל מתעדכן אוטומטית · נבנה עבור צוות גשרים מדמ"ח · המרכז לחינוך סייבר<br><button type="button" class="flink" data-a2hs>📲 הוספה למסך הבית</button></footer>
<nav class="bnav" id="bnav" aria-label="ניווט מהיר">
  <button type="button" data-bn="home" class="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg><span>ראשי</span></button>
  <button type="button" data-bn="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>חיפוש</span></button>
  <button type="button" data-bn="add" class="bplus" aria-label="הצעת מסמך"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></i><span>הצעה</span></button>
  <button type="button" data-bn="fav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg><span>מועדפים</span></button>
  <button type="button" data-bn="due"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/></svg><span>למילוי</span><b class="badge" id="bdue" hidden></b></button>
</nav>
<button class="totop" id="totop" type="button" aria-label="חזרה למעלה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>

<button class="fab" id="fab" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>הצעת מסמך</span></button>
<div class="modal" id="modal" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mt">
  <button class="x" type="button" data-close aria-label="סגירה">×</button>
  <form id="sf" novalidate>
    <h3 id="mt">הצעת מסמך לפורטל</h3>
    <p class="lead">מצאת משהו שכדאי שכל הצוות יכיר? המסמך יפורסם אחרי אישור.</p>
    <label class="f">השם שלך<input name="name" required maxlength="60" autocomplete="name"></label>
    <label class="f">כותרת המסמך<input name="title" required maxlength="120"></label>
    <label class="f">קישור למסמך<input name="url" type="url" required dir="ltr" placeholder="https://docs.google.com/..."></label>
    <label class="f">קטגוריה<select name="cat" id="scat"></select></label>
    <div class="f">למי זה מיועד?<div class="radios">
      <label><input type="radio" name="aud" value="m"><span>מש"קיות</span></label>
      <label><input type="radio" name="aud" value="n"><span>מנה"דים</span></label>
      <label><input type="radio" name="aud" value="all"><span>שניהם</span></label></div></div>
    <label class="f">תג"ב למילוי <small style="color:var(--muted);font-weight:400">(אם צריך למלא עד תאריך)</small><input name="due" type="date"></label>
    <label class="f">תיאור קצר <small style="color:var(--muted);font-weight:400">(לא חובה)</small><textarea name="desc" rows="2" maxlength="300"></textarea></label>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="hint">💡 ודאו שהמסמך משותף ל"כל מי שיש לו את הקישור", כדי שכולם יוכלו לפתוח אותו.</p>
    <p class="err" id="serr" hidden></p>
    <button class="btn" id="sbtn" type="submit">שליחה לאישור</button>
  </form>
  <div class="ok" id="sok" hidden><div class="big">✓</div><h3>תודה! ההצעה נשלחה</h3><p class="lead">המסמך יופיע בפורטל אחרי שיאושר.</p><button class="btn ghost" type="button" data-close>סגירה</button></div>
</div></div>
<div class="modal" id="rmodal" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="rt">
  <button class="x" type="button" data-close aria-label="סגירה">×</button>
  <form id="rf" novalidate>
    <h3 id="rt">דיווח על טעות</h3>
    <p class="lead" id="rdoc"></p>
    <div class="quick" id="rquick"><button type="button">הקישור לא נפתח</button><button type="button">אין לי הרשאה</button><button type="button">יש גרסה חדשה יותר</button><button type="button">טעות בתוכן</button></div>
    <label class="f">מה לא תקין?<textarea name="msg" rows="3" maxlength="500" placeholder="כמה מילים יעזרו לתקן מהר"></textarea></label>
    <label class="f">השם שלך <small style="color:var(--muted);font-weight:400">(לא חובה)</small><input name="name" maxlength="60" autocomplete="name"></label>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="err" id="rerr" hidden></p>
    <button class="btn" id="rbtn" type="submit">שליחת דיווח</button>
  </form>
  <div class="ok" id="rok" hidden><div class="big">✓</div><h3>תודה! הדיווח התקבל</h3><p class="lead">נטפל בזה בהקדם.</p><button class="btn ghost" type="button" data-close>סגירה</button></div>
</div></div>
<div class="modal" id="amodal" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="at">
  <button class="x" type="button" data-close aria-label="סגירה">×</button>
  <h3 id="at">📲 הוספה למסך הבית</h3>
  <p class="lead">ככה הפורטל נפתח בלחיצה אחת, כמו אפליקציה.</p>
  <div class="howto" id="h-ios"><b>באייפון (Safari)</b><ol><li>לוחצים על כפתור השיתוף <span class="k">⬆︎</span> בתחתית המסך</li><li>גוללים ובוחרים <span class="k">הוספה למסך הבית</span></li><li>לוחצים <span class="k">הוספה</span></li></ol></div>
  <div class="howto" id="h-and"><b>באנדרואיד (Chrome)</b><ol><li>לוחצים על שלוש הנקודות <span class="k">⋮</span> למעלה</li><li>בוחרים <span class="k">הוספה למסך הבית</span></li><li>לוחצים <span class="k">הוספה</span></li></ol></div>
  <p class="hint">💡 כדאי לשמור את הקישור הייעודי שלכם (של מש"קיות או של מנה"דים), כדי שהפורטל ייפתח ישר עם החומרים שלכם.</p>
  <button class="btn ghost" type="button" data-close>הבנתי</button>
</div></div>
<div id="toast" role="status" aria-live="polite"></div>

<script>
var D=__DATA__, role='__ROLE__', ROLE0=role, MORE=false, FRESH_MAX=6;
var BYU={};D.links.forEach(function(l){BYU[l.u]=l});
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
// מועדפים נשמרים בדפדפן של כל משתמשת (לא בגיליון)
var FAV={};try{FAV=JSON.parse(store('gesharim_fav')||'{}')||{}}catch(e){}
function saveFav(){store('gesharim_fav',JSON.stringify(FAV))}
var tt;function toast(s){var t=document.getElementById('toast');t.textContent=s;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},1900)}
function copy(u){
  var l=BYU[u],txt=(l?l.t+'\n':'')+u;
  function ok(){toast('הקישור הועתק ✓')}
  function old(){
    var t=document.createElement('textarea');t.value=txt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();
    var s=false;try{s=document.execCommand('copy')}catch(e){}document.body.removeChild(t);
    if(s)ok();else window.prompt('העתיקו את הקישור:',txt);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,old);else old();
}
var P='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
var ICON={
  doc:P+'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  slides:P+'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M10 8.5v4l3.5-2z"/></svg>',
  sheet:P+'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></svg>',
  form:P+'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8.5l1 1 2-2M13.5 9h2M8.5 14.5l1 1 2-2M13.5 15h2"/></svg>',
  folder:P+'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  file:P+'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  link:P+'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'};
var STAR='<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
var COPY=P+'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
var WA=P+'<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.2a8.5 8.5 0 1 1 15.6-4.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/></svg>';
var CAL=P+'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>';
// "הוסף ליומן": אירוע מוכן ביומן גוגל של המשתמשת. עם שעה = חצי שעה שמסתיימת בשעת התג"ב, בלי שעה = יום שלם.
// בשגרה האירוע חוזר כל שבוע / שבועיים. שום דבר לא נשלח, המשתמשת שומרת בעצמה.
function calUrl(l){
  var d=l.due.replace(/-/g,''),dates;
  if(l.dueT){
    var p=l.due.split('-'),t=l.dueT.split(':'),end=new Date(+p[0],p[1]-1,+p[2],+t[0],+t[1]),st=new Date(end.getTime()-30*6e4);
    var f=function(x){return x.getFullYear()+('0'+(x.getMonth()+1)).slice(-2)+('0'+x.getDate()).slice(-2)+'T'+('0'+x.getHours()).slice(-2)+('0'+x.getMinutes()).slice(-2)+'00'};
    dates=f(st)+'/'+f(end);
  }else{
    var p2=l.due.split('-'),n=new Date(+p2[0],p2[1]-1,+p2[2]+1);
    dates=d+'/'+n.getFullYear()+('0'+(n.getMonth()+1)).slice(-2)+('0'+n.getDate()).slice(-2);
  }
  var q='action=TEMPLATE&text='+encodeURIComponent('⏰ '+l.t)+'&dates='+dates+'&ctz=Asia/Jerusalem'+
    '&details='+encodeURIComponent('למילוי'+(l.dueT?' עד '+l.dueT:'')+(l.rec?' ('+l.rec+')':'')+'\n'+l.u);
  if(l.rec)q+='&recur='+encodeURIComponent('RRULE:FREQ=WEEKLY;INTERVAL='+(l.rec.indexOf('שבועיים')>-1?2:1));
  return 'https://calendar.google.com/calendar/render?'+q;
}
var KIND={doc:'מסמך',slides:'מצגת',sheet:'גיליון',form:'טופס',folder:'תיקייה',file:'קובץ',link:'קישור'};
var AUD={all:'',m:'למש"קיות',n:'למנה"דים'};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
// חיפוש סלחני: בלי גרשיים ומקפים, אותיות סופיות כרגילות, וכל מילה בנפרד בכל סדר
// ("משקיות" מוצא "מש"קיות", "אקזיט מחוון" מוצא "אקזיט טיקט ... - מחוון")
var FIN={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
function norm(s){return String(s).toLowerCase().replace(/["'\x60״׳ְ-ׇ]/g,'').replace(/[ךםןףץ]/g,function(c){return FIN[c]}).replace(/[-–—_.,:;()\/|+]+/g,' ').replace(/\s+/g,' ').trim()}
function seen(x){return role==='all'||x.a==='all'||x.a===role}
// תג"ב: כמה ימים נשארו (לפי התאריך בדפדפן). null = אין תג"ב
var T0=new Date();T0.setHours(0,0,0,0);
// אם הדף נשאר פתוח: שגרה שהמועד שלה עבר עוברת למועד הבא (באותה שעה מקומית), ו"היום" מתעדכן אחרי חצות
function roll(){
  T0=new Date();T0.setHours(0,0,0,0);
  var now=Date.now();
  D.links.forEach(function(l){
    if(!l.rec||!l.dueTs||l.dueTs>=now)return;
    var d=new Date(l.dueTs),step=l.rec.indexOf('שבועיים')>-1?14:7;
    while(d.getTime()<now)d.setDate(d.getDate()+step);
    l.dueTs=d.getTime();l.due=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  });
}
function left(l){if(!l.due)return null;var p=l.due.split('-');return Math.round((new Date(+p[0],p[1]-1,+p[2])-T0)/864e5)}
function past(l){return !!l.dueTs&&l.dueTs<Date.now()}
// "למילוי" = תג"ב חד-פעמי שעוד לא עבר, או שגרה שהמועד שלה בעוד יומיים או פחות
function isTodo(l){return !!l.due&&!past(l)&&(!l.rec||left(l)<=2)}
var DAYN=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
function dueTag(l){
  var n=left(l);if(n===null)return '';var p=l.due.split('-'),d=p[2]+'/'+p[1],at=l.dueT?' עד '+l.dueT:'';
  var rec=l.rec?'<span class="tag rec">🔁 '+l.rec+'</span>':'';
  if(past(l))return '<span class="tag due past">התג"ב עבר ('+d+')</span>';
  var txt=n===0?'⏰ היום'+(at||'!'):n===1?'⏰ מחר'+at:n<=3?'⏰ עוד '+n+' ימים':'📅 עד יום '+DAYN[new Date(+p[0],p[1]-1,+p[2]).getDay()]+' '+d+(l.dueT?' '+l.dueT:'');
  return '<span class="tag due'+(n<=3?' soon':'')+'" title="למילוי עד '+d+(l.dueT?' '+l.dueT:'')+'">'+txt+'</span>'+rec;
}
var TYPES={doc:'מסמכים',slides:'מצגות',sheet:'גיליונות',form:'טפסים',folder:'תיקיות',file:'קבצים',link:'קישורים'};
var FLAG=P+'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
D.links.forEach(function(l,i){l.i=i});
// צבע ואימוג'י לכל קטגוריה. צבע מהגיליון מותאם לגוון קריא (כהה בבהיר, בהיר בכהה), ובלי צבע נבחר אחד מהפלטה
var PAL=['#0f766e','#2563eb','#d97706','#7c3aed','#db2777','#0891b2','#65a30d','#dc2626','#4f46e5','#ea580c'],CM={};
(function(){var all=(D.cats||[]).slice();D.links.forEach(function(l){if(all.indexOf(l.c)<0)all.push(l.c)});
  all.forEach(function(c,i){var m=(D.cm||{})[c]||{};CM[c]={e:m.e||'📂',c:m.c||PAL[i%PAL.length]}})})();
function hslOf(hex){
  var r=parseInt(hex.substr(1,2),16)/255,g=parseInt(hex.substr(3,2),16)/255,b=parseInt(hex.substr(5,2),16)/255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0,d=mx-mn;
  if(d){s=d/(1-Math.abs(2*l-1));h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=Math.round(h*60);if(h<0)h+=360}
  return [h,Math.round(s*100)];
}
function tone(hex,l){var x=hslOf(hex),s=x[1]<8?x[1]:Math.max(x[1],50);return 'hsl('+x[0]+','+s+'%,'+l+'%)'}
// גוון טקסט קריא: מכהים (או מבהירים במצב כהה) עד ניגודיות 4.5 לפחות מול הרקע, לפי תקן הנגישות
function lum(h,s,l){s/=100;l/=100;var k=function(n){return (n+h/30)%12},a=s*Math.min(l,1-l);
  var f=function(n){var c=l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};
  return .2126*f(0)+.7152*f(8)+.0722*f(4)}
function readable(hex,dark){
  var x=hslOf(hex),s=x[1]<8?x[1]:Math.max(x[1],50),bg=dark?.0107:1,l=dark?72:40;
  for(var i=0;i<30;i++){var L=lum(x[0],s,l),r=dark?(L+.05)/(bg+.05):(bg+.05)/(L+.05);if(r>=4.6)break;l+=dark?2:-2}
  return 'hsl('+x[0]+','+s+'%,'+l+'%)';
}
var TONES={};
function cvars(c){
  if(TONES[c])return TONES[c];
  var m=CM[c]||{c:'#64748b'};
  return TONES[c]='--cc:'+readable(m.c,false)+';--cs:'+tone(m.c,93)+';--ccd:'+readable(m.c,true)+';--csd:'+tone(m.c,20);
}
var VIEW=store('gesharim_view')==='list'?'list':'grid',SORT=store('gesharim_sort')||'sheet',FTYPE='',ARCH_OPEN=false,HRE=null;
if(!/^(sheet|az|new|top)$/.test(SORT))SORT='sheet';
// מיון בתוך הקטגוריות. "סדר מומלץ" = הסדר בגיליון
function sorter(){
  if(SORT==='az')return function(a,b){return a.t.localeCompare(b.t,'he')};
  if(SORT==='new')return function(a,b){return b.when-a.when};
  if(SORT==='top')return function(a,b){return b.v-a.v};
  return function(a,b){return a.i-b.i};
}
// הדגשת מילות החיפוש: סלחני כמו החיפוש עצמו (גרשיים, מקפים ואותיות סופיות באמצע מילה)
var FINS={'כ':'[כך]','מ':'[מם]','נ':'[נן]','פ':'[פף]','צ':'[צץ]'};
function makeHre(words){
  var gap='["\'\x60״׳ְ-ׇ_.,:;()/|+–—-]*';
  var parts=words.filter(function(w){return w.length>1}).map(function(w){
    return w.split('').map(function(c){return FINS[c]||c.replace(/[-.*+?^$(){}|[\]\\\/]/g,'\\$&')}).join(gap);
  });
  return parts.length?new RegExp(parts.join('|'),'gi'):null;
}
function hl(t){
  t=String(t);if(!HRE)return esc(t);
  var out='',last=0,m;HRE.lastIndex=0;
  while((m=HRE.exec(t))){if(!m[0]){HRE.lastIndex++;continue}out+=esc(t.slice(last,m.index))+'<mark>'+esc(m[0])+'</mark>';last=m.index+m[0].length}
  return out+esc(t.slice(last));
}
// showCat: להציג את שם הקטגוריה בכרטיס (באזורים שמערבבים קטגוריות)
function card(l,showCat){
  var f=!!FAV[l.u],u=esc(l.u),n=left(l);
  var tags=(l.x?'<span class="tag arch">🗄️ בארכיון</span>':'')+dueTag(l)+(l.p?'<span class="tag pin">📌 חשוב</span>':'')+(l.isNew?'<span class="tag new">חדש</span>':'')+(l.isUpd?'<span class="tag upd">עודכן</span>':'')+
    (role==='all'&&l.a!=='all'?'<span class="tag aud">'+AUD[l.a]+'</span>':'');
  var cat=showCat?'<span class="catchip">'+(CM[l.c]?CM[l.c].e+' ':'')+esc(l.c)+'</span>':'';
  return '<div class="cw cat'+(n!==null&&!past(l)&&n<=3?' hot':'')+(l.x?' old':'')+'" style="'+cvars(l.c)+'"><a class="card" href="'+u+'" target="_blank" rel="noopener" data-u="'+u+'"><div class="ic t-'+l.type+'">'+ICON[l.type]+'</div><div class="body">'+
    '<div class="tt">'+hl(l.t)+'</div>'+(l.d?'<div class="dd">'+hl(l.d)+'</div>':'')+
    '<div class="meta">'+tags+cat+'<span>'+KIND[l.type]+'</span>'+(l.o?'<span class="own" title="אחראי על המסמך">👤 '+esc(l.o)+'</span>':'')+'</div></div></a>'+
    '<div class="acts"><button class="act'+(f?' on':'')+'" data-act="fav" data-u="'+u+'" title="'+(f?'הסרה מהמועדפים':'הוספה למועדפים')+'" aria-label="מועדפים" aria-pressed="'+f+'">'+
      P.replace('fill="none"','fill="'+(f?'currentColor':'none')+'"')+STAR+'</button>'+
    (l.due&&!past(l)?'<a class="act" href="'+esc(calUrl(l))+'" target="_blank" rel="noopener" title="הוספה ליומן" aria-label="הוספה ליומן">'+CAL+'</a>':'')+
    '<button class="act" data-act="copy" data-u="'+u+'" title="העתקת קישור" aria-label="העתקת קישור">'+COPY+'</button>'+
    '<a class="act" href="https://wa.me/?text='+esc(encodeURIComponent(l.t+'\n'+l.u))+'" target="_blank" rel="noopener" title="שליחה בוואטסאפ" aria-label="שליחה בוואטסאפ">'+WA+'</a>'+
    '<button class="act" data-act="report" data-u="'+u+'" title="דיווח על טעות" aria-label="דיווח על טעות">'+FLAG+'</button></div></div>';
}
function grid(items,showCat){return '<div class="grid">'+items.map(function(l){return card(l,showCat)}).join('')+'</div>'}
// תת-קטגוריות: מסמכים בלי תת-קטגוריה ראשונים, ואחריהם כל תת-קטגוריה לפי הסדר שבו היא מופיעה לראשונה בגיליון
// קטגוריות ותת-קטגוריות נטענות מקופלות. OPEN/SOPEN = מה שהמשתמשת פתחה. בחיפוש או בסינון הכל פתוח (FORCE)
var OPEN={},SOPEN={},FORCE=false,ALLC=[],ALLS=[];
function bySubs(items,cat){
  var g={},first={};
  items.forEach(function(l){var k=l.s||'';(g[k]=g[k]||[]).push(l);if(!(k in first)||l.i<first[k])first[k]=l.i});
  var keys=Object.keys(g);
  if(keys.length===1&&!keys[0])return grid(items);
  keys.sort(function(a,b){return (a?1:0)-(b?1:0)||first[a]-first[b]});
  return keys.map(function(k){
    if(!k)return grid(g[k]);
    var key=cat+'|'+k,open=FORCE||!!SOPEN[key];ALLS.push(key);
    return '<button type="button" class="subh" data-sub="'+esc(k)+'" data-sk="'+esc(key)+'" aria-expanded="'+open+'"><span class="st">'+esc(k)+'</span><span class="n">'+g[k].length+'</span><span class="chev" aria-hidden="true"></span></button>'+
      (open?'<div class="subgrid">'+grid(g[k])+'</div>':'');
  }).join('');
}
// max: כמה כרטיסים להציג לפני כפתור "הצג עוד" (0 = הכל). cat: אזור של קטגוריה אחת (עם הצבע שלה ותת-קטגוריות)
var NAV=[];
function section(id,icon,title,items,max,cat){
  if(!items.length)return '';
  NAV.push({id:id,t:title,n:items.length,c:cat});
  if(cat){
    var open=FORCE||!!OPEN[cat],subs=[];ALLC.push(cat);
    items.forEach(function(l){if(l.s&&subs.indexOf(l.s)<0)subs.push(l.s)});
    return '<section class="sec cat catsec'+(open?' open':'')+'" id="'+id+'" data-t="'+esc(title)+'" style="'+cvars(cat)+'">'+
      '<button type="button" class="cath" data-cat="'+esc(cat)+'" aria-expanded="'+open+'"><span class="hi">'+(CM[cat]?CM[cat].e:icon)+'</span>'+
      '<span class="ct"><b>'+esc(title)+'</b>'+(subs.length?'<small>'+esc(subs.join(' · '))+'</small>':'')+'</span><span class="n">'+items.length+'</span><span class="chev" aria-hidden="true"></span></button>'+
      (open?'<div class="catbody">'+bySubs(items,cat)+'</div>':'')+'</section>';
  }
  var cut=max&&items.length>max,show=cut?items.slice(0,max):items;
  return '<section class="sec" id="'+id+'" data-t="'+esc(title)+'"><h2><span class="hi">'+icon+'</span>'+esc(title)+' <span class="n">'+items.length+'</span></h2>'+
    grid(show,true)+(cut?'<button class="more" data-more>הצג עוד '+(items.length-max)+'</button>':'')+'</section>';
}
function tools(V){
  var have={};V.forEach(function(l){have[l.type]=(have[l.type]||0)+1});
  if(FTYPE&&!have[FTYPE])FTYPE='';
  document.getElementById('ftype').innerHTML='<option value="">כל הסוגים</option>'+Object.keys(TYPES).filter(function(t){return have[t]}).map(function(t){
    return '<option value="'+t+'"'+(t===FTYPE?' selected':'')+'>'+TYPES[t]+' ('+have[t]+')</option>'}).join('');
  document.getElementById('fsort').value=SORT;
  document.querySelectorAll('[data-view]').forEach(function(b){var on=b.dataset.view===VIEW;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  document.body.classList.toggle('list',VIEW==='list');
}
function render(){
  roll();
  document.querySelectorAll('.chip').forEach(function(c){c.classList.toggle('on',c.dataset.r===role)});
  var raw=document.getElementById('q').value,q=norm(raw),words=q.split(' ').filter(String);
  HRE=makeHre(words);FORCE=!!(words.length||FTYPE);ALLC=[];ALLS=[];
  var V=D.links.filter(seen),A=V.filter(function(l){return !l.x});
  var fresh=A.filter(function(l){return l.isNew||l.isUpd}).length,cats={};A.forEach(function(l){cats[l.c]=1});
  var todo=A.filter(isTodo).length;
  document.getElementById('bdue').textContent=todo;document.getElementById('bdue').hidden=!todo;
  document.getElementById('stats').innerHTML='<span class="stat"><b>'+A.length+'</b> מסמכים</span><span class="stat"><b>'+Object.keys(cats).length+'</b> קטגוריות</span>'+
    (todo?'<span class="stat">⏰ <b>'+todo+'</b> למילוי</span>':'')+(fresh?'<span class="stat">🆕 <b>'+fresh+'</b> חדשים ועודכנו</span>':'');
  document.getElementById('msgs').innerHTML=q?'':D.msgs.filter(seen).map(function(m){
    return '<div class="msg '+m.lvl+'"><div class="mi">'+(m.lvl==='urgent'?'🔴':m.lvl==='important'?'⚠️':'💬')+'</div><div><b>'+esc(m.t)+'</b>'+
      (m.b?'<p>'+esc(m.b).replace(/\n/g,'<br>')+'</p>':'')+(m.date?'<small>'+m.date+'</small>':'')+'</div></div>';
  }).join('');
  tools(q?V:A);
  var L=V.filter(function(l){
    if(FTYPE&&l.type!==FTYPE)return false;
    if(!words.length)return true;
    var hay=l.n||(l.n=norm(l.t+' '+l.d+' '+l.c+' '+(l.s||'')+' '+(l.o||'')));
    // אות בודדת (כמו "ב" ב"שנה ב") מתאימה רק לתחילת מילה
    return words.every(function(w){return w.length>1?hay.indexOf(w)>-1:(' '+hay).indexOf(' '+w)>-1});
  });
  var pills=document.getElementById('pills');
  if(!L.length){
    pills.innerHTML='';
    document.getElementById('out').innerHTML='<div class="empty"><div class="big">🔍</div><p>לא נמצאו מסמכים'+(q?' עבור "'+esc(raw)+'"':'')+(FTYPE?' מסוג '+TYPES[FTYPE]:'')+'</p><p>חסר משהו? אפשר להציע מסמך בכפתור למטה.</p></div>';
    spy();return;
  }
  // בחיפוש מוצגים גם מסמכים מהארכיון (עם תג). בלי חיפוש הם רק באזור הארכיון בתחתית
  var act=q?L:L.filter(function(l){return !l.x}),srt=sorter();
  NAV=[];var h='';
  if(!q){
    h+=section('s-fav','⭐','המועדפים שלי',L.filter(function(l){return FAV[l.u]}));
    // מסמך מופיע רק באזור העליון הראשון שמתאים לו: למילוי > שגרות > חשוב עכשיו > חדש ועודכן
    var byDue=function(a,b){return a.dueTs-b.dueTs},top=function(l){return isTodo(l)||!!l.rec};
    h+=section('s-due','⏰','למילוי עד תאריך',act.filter(isTodo).sort(byDue));
    h+=section('s-rec','🔁','שגרות קבועות',act.filter(function(l){return l.rec&&!isTodo(l)}).sort(byDue));
    h+=section('s-pin','📌','חשוב עכשיו',act.filter(function(l){return l.p&&!top(l)}));
    h+=section('s-new','🆕','חדש ועודכן ב-'+D.days+' הימים האחרונים',act.filter(function(l){return (l.isNew||l.isUpd)&&!l.p&&!top(l)}).sort(function(a,b){return b.when-a.when}),MORE?0:FRESH_MAX);
  }
  var cs=(D.cats||[]).slice();act.forEach(function(l){if(cs.indexOf(l.c)<0)cs.push(l.c)});
  var ch='';cs.forEach(function(c,i){ch+=section('s-c'+i,'📂',c,act.filter(function(l){return l.c===c}).sort(srt),0,c)});
  // כותרת לרשימת הקטגוריות, עם כפתור פתיחה/צמצום של הכל (לא בחיפוש, שבו הכל פתוח ממילא)
  if(ch){
    var allOpen=ALLC.every(function(c){return OPEN[c]})&&ALLS.every(function(k){return SOPEN[k]});
    h+='<div class="cathead"><h2><span class="hi">📂</span>'+(FORCE?'תוצאות לפי קטגוריה':'קטגוריות')+'</h2>'+
      (FORCE?'':'<button type="button" class="xall" data-xall="'+(allOpen?'1':'')+'">'+(allOpen?'▴ צמצום הכל':'▾ פתיחת הכל')+'</button>')+'</div>'+ch;
  }
  var AR=q?[]:L.filter(function(l){return l.x}).sort(srt);
  if(AR.length){
    NAV.push({id:'s-arch',t:'ארכיון',n:AR.length});
    h+='<section class="sec archs" id="s-arch" data-t="ארכיון"><button class="archt" type="button" data-arch aria-expanded="'+ARCH_OPEN+'"><span class="hi">🗄️</span>ארכיון <span class="n">'+AR.length+'</span><span class="chev">'+(ARCH_OPEN?'▴':'▾')+'</span></button>'+
      (ARCH_OPEN?'<p class="archnote">מסמכים שהוחלפו או כבר לא בשימוש. נשמרים כאן למקרה שצריך לחזור אליהם.</p>'+grid(AR,true):'')+'</section>';
  }
  document.getElementById('out').innerHTML=h;
  pills.innerHTML=q||FTYPE?'<div class="res">'+L.length+' תוצאות'+(FTYPE?' · '+TYPES[FTYPE]:'')+'</div>':NAV.map(function(s){
    return '<button class="pill'+(s.c?' cat':'')+'" data-go="'+s.id+'"'+(s.c?' data-c="'+esc(s.c)+'"':'')+(s.c?' style="'+cvars(s.c)+'"':'')+'>'+(s.c?'<i class="dot"></i>':'')+esc(s.t.replace(/ ב-\d+ הימים האחרונים/,''))+'<small>'+s.n+'</small></button>';
  }).join('');
  spy();
}
// פירורי לחם + סימון האזור הנוכחי בשורת הקטגוריות + כפתור "חזרה למעלה"
var CUR=null,ticking=false;
function spy(){
  ticking=false;
  var base=document.getElementById('pills').getBoundingClientRect().bottom+48,cur=null,sub=null;
  document.querySelectorAll('.sec').forEach(function(s){if(s.getBoundingClientRect().top<=base)cur=s});
  if(cur&&cur.getBoundingClientRect().bottom<=base)cur=null;
  if(cur)cur.querySelectorAll('.subh').forEach(function(x){if(x.getBoundingClientRect().top<=base)sub=x});
  var c=document.getElementById('crumb');
  if(cur){c.innerHTML='<button type="button" data-top>🏠 ראשי</button><span aria-hidden="true">›</span><b>'+esc(cur.dataset.t.replace(/ ב-\d+ הימים האחרונים/,''))+'</b>'+(sub?'<span aria-hidden="true">›</span><b>'+esc(sub.dataset.sub)+'</b>':'');c.classList.add('show')}
  else c.classList.remove('show');
  var id=cur?cur.id:null;
  if(id!==CUR){
    CUR=id;
    document.querySelectorAll('.pill').forEach(function(p){
      var on=p.dataset.go===id;p.classList.toggle('on',on);
      if(on)p.scrollIntoView({block:'nearest',inline:'center'});
    });
  }
  document.getElementById('totop').classList.toggle('show',window.scrollY>700);
  // בנייד: כשהכותרת הגדולה יוצאת מהמסך, מופיע פס עליון דק
  document.getElementById('nav').classList.toggle('stuck',document.querySelector('.hero').getBoundingClientRect().bottom<1);
  var qf=document.activeElement===document.getElementById('q');
  var bn=qf?'search':id==='s-fav'?'fav':id==='s-due'?'due':'home';
  document.querySelectorAll('[data-bn]').forEach(function(b){b.classList.toggle('on',b.dataset.bn===bn)});
}
window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(spy)}},{passive:true});
window.addEventListener('resize',function(){if(!ticking){ticking=true;requestAnimationFrame(spy)}});

document.querySelectorAll('.chip').forEach(function(c){c.onclick=function(){role=c.dataset.r;render()}});
// בקישור ייעודי (?role=m / ?role=n) מסתירים את בחירת הקהל. זו הסתרה בתצוגה בלבד, לא חסימת גישה.
if(ROLE0==='all')document.getElementById('seg').hidden=false;
else{var w=document.getElementById('who');w.textContent=ROLE0==='m'?'מש"קיות':'מנה"דים';w.hidden=false}
var qt;document.getElementById('q').oninput=function(){clearTimeout(qt);qt=setTimeout(function(){
  render();
  var t=document.querySelector('.tools'),y=t.getBoundingClientRect().top+window.scrollY-document.getElementById('nav').offsetHeight;
  if(window.scrollY>y)window.scrollTo({top:Math.max(0,y)});
},D.links.length>80?150:0)};
document.getElementById('pills').addEventListener('click',function(e){
  var b=e.target.closest('[data-go]');if(!b)return;
  if(b.dataset.c&&!OPEN[b.dataset.c]){OPEN[b.dataset.c]=true;render()}
  document.getElementById(b.dataset.go).scrollIntoView({behavior:'smooth',block:'start'});
});
document.getElementById('ftype').onchange=function(){FTYPE=this.value;render();window.scrollTo({top:0})};
document.getElementById('fsort').onchange=function(){SORT=this.value;store('gesharim_sort',SORT);render()};
document.querySelectorAll('[data-view]').forEach(function(b){b.onclick=function(){VIEW=b.dataset.view;store('gesharim_view',VIEW);render()}});
document.getElementById('crumb').addEventListener('click',function(e){if(e.target.closest('[data-top]'))window.scrollTo({top:0,behavior:'smooth'})});
document.getElementById('totop').onclick=function(){window.scrollTo({top:0,behavior:'smooth'})};
// שורת החיפוש צפה תמיד, אז לא צריך לגלול אליה
function focusSearch(){document.getElementById('q').focus({preventScroll:true});spy()}
// קפיצה לאזור. בחיפוש פעיל האזורים העליונים מוסתרים, אז קודם מנקים את החיפוש והסינון
function goSec(id,none){
  var q=document.getElementById('q');
  if(q.value||FTYPE){q.value='';FTYPE='';render()}
  var el=document.getElementById(id);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});else toast(none);
}
document.getElementById('bnav').addEventListener('click',function(e){
  var b=e.target.closest('[data-bn]');if(!b)return;
  var k=b.dataset.bn;
  if(k==='home'){var q=document.getElementById('q');if(q.value||FTYPE){q.value='';FTYPE='';render()}q.blur();window.scrollTo({top:0,behavior:'smooth'})}
  else if(k==='search')focusSearch();
  else if(k==='add')openForm();
  else if(k==='fav')goSec('s-fav','עוד אין מועדפים. לוחצים ☆ על מסמך כדי להוסיף');
  else if(k==='due')goSec('s-due','אין כרגע מסמכים למילוי 🎉');
});
document.getElementById('q').addEventListener('focus',spy);
document.getElementById('q').addEventListener('blur',function(){setTimeout(spy,50)});
// פתיחה וצמצום. אחרי צמצום, אם הכותרת ברחה מעל המסך, מחזירים אותה לתצוגה
function keepInView(el){
  if(!el)return;var top=el.getBoundingClientRect().top,nav=document.getElementById('nav').getBoundingClientRect().bottom;
  if(top<nav)el.scrollIntoView({block:'start'});
}
function toggleAll(open){
  ALLC.forEach(function(c){OPEN[c]=open});ALLS.forEach(function(k){SOPEN[k]=open});
  render();
  // תת-קטגוריות מופיעות רק אחרי שהקטגוריה שלהן נפתחה, אז בפתיחה עוברים פעם שנייה
  if(open){ALLS.forEach(function(k){SOPEN[k]=true});render()}
  keepInView(document.querySelector('.cathead'));
}
document.getElementById('out').addEventListener('click',function(e){
  if(e.target.closest('button[data-more]')){MORE=true;render();return}
  var xa=e.target.closest('button[data-xall]');
  if(xa){toggleAll(!xa.dataset.xall);return}
  var ch=e.target.closest('button[data-cat]');
  if(ch){var c=ch.dataset.cat,id=ch.parentNode.id;OPEN[c]=!OPEN[c];render();keepInView(document.getElementById(id));return}
  var sh=e.target.closest('button[data-sk]');
  if(sh){var k=sh.dataset.sk,sid=sh.closest('.sec').id;SOPEN[k]=!SOPEN[k];render();
    keepInView([].filter.call(document.querySelectorAll('#'+sid+' [data-sk]'),function(x){return x.dataset.sk===k})[0]);return}
  if(e.target.closest('button[data-arch]')){
    ARCH_OPEN=!ARCH_OPEN;render();
    if(ARCH_OPEN)document.getElementById('s-arch').scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  var b=e.target.closest('button[data-act]');
  if(b){
    var u=b.getAttribute('data-u');
    if(b.dataset.act==='fav'){if(FAV[u])delete FAV[u];else FAV[u]=1;saveFav();render();toast(FAV[u]?'נוסף למועדפים ⭐':'הוסר מהמועדפים')}
    else if(b.dataset.act==='report')openReport(u);
    else copy(u);
    return;
  }
  var a=e.target.closest('a.card');
  if(a&&window.google&&google.script&&google.script.run)google.script.run.logClick(a.getAttribute('data-u'),ROLE0);
});

// ---- הצעת מסמך
// סגירה של כל החלונות: לחיצה ברקע, כפתור סגירה או Esc
// בזמן שחלון פתוח, הדף שמאחוריו לא נגלל
function showM(m){m.hidden=false;document.body.classList.add('lock')}
function hideM(m){m.hidden=true;if(!document.querySelector('.modal:not([hidden])'))document.body.classList.remove('lock')}
document.querySelectorAll('.modal').forEach(function(m){
  m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-close]'))hideM(m)});
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.modal').forEach(hideM)});

// ---- דיווח על טעות
var rm=document.getElementById('rmodal'),rf=document.getElementById('rf'),RU='';
function openReport(u){
  RU=u;rf.hidden=false;document.getElementById('rok').hidden=true;document.getElementById('rerr').hidden=true;
  rf.reset();rf.name.value=store('gesharim_name')||'';
  document.querySelectorAll('#rquick button').forEach(function(b){b.classList.remove('on')});
  document.getElementById('rdoc').textContent=BYU[u]?BYU[u].t:'';
  showM(rm);
}
document.getElementById('rquick').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  b.classList.toggle('on');
  rf.msg.value=[].map.call(document.querySelectorAll('#rquick button.on'),function(x){return x.textContent}).join(' · ');
});
rf.addEventListener('submit',function(e){
  e.preventDefault();
  var err=document.getElementById('rerr'),btn=document.getElementById('rbtn');
  function fail(m){err.textContent=m;err.hidden=false;btn.disabled=false;btn.textContent='שליחת דיווח'}
  var f={u:RU,msg:rf.msg.value.trim(),name:rf.name.value.trim(),website:rf.website.value};
  if(f.msg.length<3)return fail('נא לבחור או לכתוב מה הבעיה.');
  if(!(window.google&&google.script&&google.script.run))return fail('אפשר לשלוח רק מתוך הפורטל עצמו.');
  err.hidden=true;btn.disabled=true;btn.textContent='שולח...';
  if(f.name)store('gesharim_name',f.name);
  google.script.run.withSuccessHandler(function(r){
    if(!r||!r.ok)return fail((r&&r.msg)||'משהו השתבש. נסו שוב.');
    rf.hidden=true;document.getElementById('rok').hidden=false;btn.disabled=false;btn.textContent='שליחת דיווח';
  }).withFailureHandler(function(){fail('משהו השתבש. נסו שוב בעוד דקה.')}).reportIssue(f);
});

// ---- הוספה למסך הבית: הסבר, וטיפ חד-פעמי בנייד
var IOS=/iPhone|iPad|iPod/.test(navigator.userAgent);
document.addEventListener('click',function(e){
  if(e.target.closest('[data-a2hs]')){
    var ios=document.getElementById('h-ios'),and=document.getElementById('h-and');
    ios.parentNode.insertBefore(IOS?ios:and,IOS?and:ios);
    showM(document.getElementById('amodal'));
  }
  if(e.target.closest('[data-tipx]')){document.getElementById('tip').hidden=true;store('gesharim_tip','1')}
});
if(window.matchMedia('(max-width:700px)').matches&&!store('gesharim_tip'))document.getElementById('tip').hidden=false;

var modal=document.getElementById('modal'),sf=document.getElementById('sf');
document.getElementById('scat').innerHTML=(D.cats.length?D.cats:['כללי']).map(function(c){return '<option>'+esc(c)+'</option>'}).join('');
function openForm(){
  sf.hidden=false;document.getElementById('sok').hidden=true;document.getElementById('serr').hidden=true;
  sf.name.value=store('gesharim_name')||'';
  var r=sf.querySelector('input[name=aud][value="'+(ROLE0==='all'?'all':ROLE0)+'"]');if(r)r.checked=true;
  showM(modal);setTimeout(function(){(sf.name.value?sf.title:sf.name).focus()},50);
}
document.getElementById('fab').onclick=openForm;
sf.addEventListener('submit',function(e){
  e.preventDefault();
  var err=document.getElementById('serr'),btn=document.getElementById('sbtn');
  function fail(m){err.textContent=m;err.hidden=false;btn.disabled=false;btn.textContent='שליחה לאישור'}
  var f={name:sf.name.value.trim(),title:sf.title.value.trim(),url:sf.url.value.trim(),cat:sf.cat.value,desc:sf.desc.value.trim(),due:sf.due.value,website:sf.website.value,
    aud:(sf.querySelector('input[name=aud]:checked')||{}).value||'all'};
  if(!f.name||!f.title)return fail('נא למלא שם וכותרת.');
  if(!/^https:\/\/\S+$/.test(f.url))return fail('נא להדביק קישור מלא שמתחיל ב-https://');
  if(!(window.google&&google.script&&google.script.run))return fail('אפשר לשלוח רק מתוך הפורטל עצמו.');
  err.hidden=true;btn.disabled=true;btn.textContent='שולח...';
  store('gesharim_name',f.name);
  google.script.run.withSuccessHandler(function(r){
    if(!r||!r.ok)return fail((r&&r.msg)||'משהו השתבש. נסו שוב.');
    sf.reset();sf.hidden=true;document.getElementById('sok').hidden=false;btn.disabled=false;btn.textContent='שליחה לאישור';
  }).withFailureHandler(function(){fail('משהו השתבש. נסו שוב בעוד דקה.')}).submitDoc(f);
});
render();
</script></body></html>`;
