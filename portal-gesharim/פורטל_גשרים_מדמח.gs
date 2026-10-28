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
 * תפריט 🌉 פורטל בגיליון: ייבוא קבצים מתיקייה, דוח צפיות, טיוטת עדכון שבועי.
 * בהגדרות B5 מדביקים את קישור הפורטל (משמש את "פתיחת הפורטל" ואת העדכון השבועי).
 * תחזוקה: עובדים רק בגיליון. מוסיפים שורה, בוחרים קטגוריה ומסמנים וי למי המסמך מיועד (מש"קיות / מנה"דים / שניהם).
 * שורה בלי וי היא טיוטה: נצבעת אפור ולא מופיעה בפורטל.
 * אין צורך לפרוס מחדש, אלא אם משנים את הקוד.
 */

var SHEET_LINKS = 'קישורים';
var SHEET_MSGS = 'הודעות';
var SHEET_SET = 'הגדרות';

// ---------------------------------------------------------------- setup
var CATS = ['תוכן ושיעורים', 'אקזיט טיקט', 'זה"ת והכשרות', 'תצפיות ומשוב', 'נהלים ותפקיד', 'טפסים ושאלונים', 'כללי'];

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
  S.getRange(2, 4, CATS.length, 1).setValues(CATS.map(function (c) { return [c]; }));
  styleHeader_(S, 4);
  S.setColumnWidth(1, 300); S.setColumnWidth(4, 260);

  // ---- קישורים
  var L = ss.getSheetByName(SHEET_LINKS) || ss.insertSheet(SHEET_LINKS);
  L.clear();
  var lh = ['כותרת', 'קישור', 'קטגוריה', 'מש"קיות ✓', 'מנה"דים ✓', 'תיאור קצר', '📌 מוצמד', 'תאריך הוספה', 'צפיות', 'צפייה אחרונה', 'צפיות מש"קיות', 'צפיות מנה"דים'];
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
  var rows = seed.map(function (r) { return [r[0], r[1], r[2], r[3], true, r[4], r[5], today, 0, '', 0, 0]; });
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
    .setBackground('#f1f5f9').setFontColor('#94a3b8').setRanges([L.getRange('A2:L')]).build();
  var fresh = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($H2<>"",TODAY()-$H2<=INDIRECT("הגדרות!B3"))')
    .setBackground('#ecfdf5').setRanges([L.getRange('A2:A')]).build();
  L.setConditionalFormatRules([draft, fresh]);

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

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (def && ss.getSheets().length > 3) ss.deleteSheet(def);
  ss.setActiveSheet(L);
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

// רץ בכל עריכה: תאריך אוטומטי, ושם המסמך נמשך מהדרייב כשמדביקים קישור בלי כותרת
function onEditInstalled(e) {
  var sh = e.range.getSheet(), r = e.range.getRow();
  if (r < 2 || e.range.getNumRows() > 1) return;
  if (sh.getName() === SHEET_LINKS && e.range.getColumn() === 2 && e.value) {
    if (!sh.getRange(r, 8).getValue()) sh.getRange(r, 8).setValue(new Date());
    if (!sh.getRange(r, 9).getValue()) sh.getRange(r, 9).setValue(0);
    if (!sh.getRange(r, 11).getValue()) sh.getRange(r, 11, 1, 2).setValues([[0, 0]]);
    if (!sh.getRange(r, 1).getValue()) {
      var name = driveName_(String(e.value));
      if (name) sh.getRange(r, 1).setValue(name);
    }
  }
  if (sh.getName() === SHEET_MSGS && e.range.getColumn() === 2 && e.value && !sh.getRange(r, 1).getValue())
    sh.getRange(r, 1).setValue(new Date());
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
  while (subs.hasNext()) { var f = subs.next(); if (!have[f.getId()]) rows.push([f.getName(), f.getUrl(), cat, false, false, 'תיקייה', false, today, 0, '', 0, 0]); }
  var files = folder.getFiles();
  while (files.hasNext()) {
    var x = files.next();
    if (have[x.getId()] || x.getMimeType() === MimeType.SHORTCUT) continue;
    rows.push([x.getName(), x.getUrl(), cat, false, false, '', false, today, 0, '', 0, 0]);
  }
  if (!rows.length) { ui.alert('לא נמצאו קבצים חדשים בתיקייה (כל הקבצים כבר בגיליון).'); return; }
  rows.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0]), 'he'); });
  L.getRange(L.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  ui.alert('נוספו ' + rows.length + ' פריטים כטיוטה (אפורים).\nכדי לפרסם: סמנו וי למש"קיות ו/או למנה"דים.');
}

// ---------------------------------------------------------------- מונה צפיות
// who = הקהל שמופיע בקישור שממנו נכנסו (?role=m / ?role=n). כניסה מהקישור הכללי נספרת רק בסה"כ.
function logClick(url, who) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
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

function viewsReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = ss.getSheetByName(SHEET_LINKS);
  var n = L.getLastRow() - 1;
  if (n < 1) return;
  ensureColumns_();
  var v = L.getRange(2, 1, n, 12).getValues().filter(function (r) { return r[0]; })
    .map(function (r) { return [r[0], r[2], Number(r[8]) || 0, Number(r[10]) || 0, Number(r[11]) || 0, r[9] || '', aud_(r[3], r[4]) ? 'מפורסם' : 'טיוטה']; })
    .sort(function (a, b) { return b[2] - a[2]; });
  if (!v.length) return;
  var R = ss.getSheetByName('דוח צפיות') || ss.insertSheet('דוח צפיות');
  R.clear();
  R.getRange(1, 1, 1, 7).setValues([['מסמך', 'קטגוריה', 'צפיות (סה"כ)', 'מש"קיות', 'מנה"דים', 'צפייה אחרונה', 'סטטוס']]);
  R.getRange(2, 1, v.length, 7).setValues(v);
  R.getRange('F2:F').setNumberFormat('dd/MM/yyyy HH:mm');
  styleHeader_(R, 7);
  R.setColumnWidth(1, 300);
  R.getRange(1, 9).setValue('מש"קיות / מנה"דים = כניסות דרך הקישור הייעודי. כניסה מהקישור הכללי נספרת רק בסה"כ.').setFontColor('#64748b');
  var zero = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A2<>"",$C2=0,$G2="מפורסם")')
    .setBackground('#fef2f2').setRanges([R.getRange('A2:G')]).build();
  R.setConditionalFormatRules([zero]);
  ss.setActiveSheet(R);
}

// פונקציות שמופעלות מהתפריט חייבות שם בלי קו תחתון בסוף (פונקציה עם _ היא פרטית ב-Apps Script)
function onOpen() {
  try { ensureColumns_(); } catch (err) {}
  SpreadsheetApp.getUi().createMenu('🌉 פורטל')
    .addItem('פתיחת הפורטל', 'openPortal')
    .addItem('📥 ייבוא קבצים מתיקייה בדרייב', 'importFolder')
    .addItem('📊 דוח צפיות', 'viewsReport')
    .addItem('✉️ טיוטת עדכון שבועי', 'weeklyDigest')
    .addSeparator()
    .addItem('התקנה מחדש (מוחק נתונים!)', 'setup')
    .addToUi();
}
// גיליונות שנבנו לפני שנוספו עמודות הצפיות לפי קהל (K-L) מקבלים אותן כאן
function ensureColumns_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = ss.getSheetByName(SHEET_LINKS);
  if (L && !L.getRange(1, 11).getValue())
    L.getRange(1, 11, 1, 2).setValues([['צפיות מש"קיות', 'צפיות מנה"דים']]).setFontWeight('bold').setFontColor('#ffffff').setBackground('#475569');
  var S = ss.getSheetByName(SHEET_SET);
  if (S && !S.getRange(5, 1).getValue()) S.getRange(5, 1).setValue('קישור לפורטל (מדביקים אחרי הפריסה)');
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
  if (/drive\.google\.com\/file/.test(url)) return 'file';
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
    var rows = L.getRange(2, 1, L.getLastRow() - 1, 8).getValues().filter(function (r) {
      return r[0] && String(r[1] || '').trim() && aud_(r[3], r[4]);
    });
    var updAll = st.checkDrive ? driveUpdatedAll_(rows.map(function (r) { return String(r[1]).trim(); })) : {};
    rows.forEach(function (r) {
      var url = String(r[1]).trim(), a = aud_(r[3], r[4]);
      var added = r[7] instanceof Date ? r[7].getTime() : null;
      var upd = updAll[url] || null;
      var isNew = added && now - added <= win;
      links.push({
        t: String(r[0]), u: url, c: String(r[2] || 'כללי'), a: a, d: String(r[5] || ''),
        p: r[6] === true, type: fileType_(url),
        isNew: !!isNew, isUpd: !isNew && upd && now - upd <= win,
        when: Math.max(added || 0, upd || 0)
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
  var S = ss.getSheetByName(SHEET_SET), cats = [];
  if (S && S.getLastRow() > 1) cats = S.getRange(2, 4, S.getLastRow() - 1, 1).getValues().map(function (x) { return String(x[0]); }).filter(String);
  return { title: st.title, days: st.days, links: links, msgs: msgs, cats: cats };
}

// ---------------------------------------------------------------- טיוטת עדכון שבועי
// בונה נוסח מוכן להעתקה (וואטסאפ / מייל) של מה שחדש ועודכן ב-7 הימים האחרונים. לא שולח כלום.
function weeklyDigest() {
  var data = getData_(7), url = portalUrl_(), weekAgo = Date.now() - 7 * 86400000;
  var NAME = { m: 'מש"קיות', n: 'מנה"דים' };
  function text(who) {
    var mine = function (x) { return x.a === 'all' || x.a === who; };
    var links = data.links.filter(mine).filter(function (l) { return l.isNew || l.isUpd; })
      .sort(function (a, b) { return b.when - a.when; });
    var msgs = data.msgs.filter(mine).filter(function (m) { return m.ts >= weekAgo; });
    var out = ['היי צוות 👋', '', 'העדכון השבועי מפורטל גשרים מדמ"ח:'];
    if (msgs.length) {
      out.push('', '📢 הודעות:');
      msgs.forEach(function (m) { out.push((m.lvl === 'urgent' ? '🔴 ' : m.lvl === 'important' ? '🟡 ' : '• ') + m.t + (m.b ? ': ' + m.b.replace(/\n+/g, ' ') : '')); });
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
function doGet(e) {
  var data = getData_();
  var role = (e && e.parameter && e.parameter.role) || 'all';
  if (['all', 'm', 'n'].indexOf(role) < 0) role = 'all';
  var json = JSON.stringify(data).replace(/</g, '\\u003c');
  var title = escapeHtml_(data.title);
  var html = PAGE_.replace('__DATA__', function () { return json; }).replace('__ROLE__', role).replace(/__TITLE__/g, function () { return title; });
  return HtmlService.createHtmlOutput(html)
    .setTitle(data.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var PAGE_ = String.raw`
<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<style>
:root{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#f8fafc;--brand:#0f766e;--brand2:#ccfbf1}
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--ink)}
header{background:var(--brand);color:#fff;padding:22px 20px 18px}
header h1{margin:0;font-size:24px}header p{margin:6px 0 0;opacity:.85;font-size:14px}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px 40px}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:16px 0}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 16px;font-size:14px;cursor:pointer}
.chip.on{background:var(--brand);color:#fff;border-color:var(--brand)}
#q{flex:1;min-width:200px;border:1px solid var(--line);border-radius:10px;padding:10px 14px;font-size:15px;background:#fff}
.msg{border-radius:12px;padding:12px 16px;margin:10px 0;background:#fff;border:1px solid var(--line)}
.msg.important{background:#fffbeb;border-color:#fcd34d}.msg.urgent{background:#fef2f2;border-color:#fca5a5}
.msg b{display:block;margin-bottom:4px}.msg small{color:var(--muted)}
h2{font-size:17px;margin:26px 0 10px;display:flex;align-items:center;gap:8px}
h2 .n{background:var(--brand2);color:var(--brand);border-radius:999px;font-size:12px;padding:2px 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}

.cw{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:12px;transition:.15s}
.cw:hover{border-color:var(--brand);box-shadow:0 4px 14px rgba(15,118,110,.12);transform:translateY(-1px)}
a.card{flex:1;display:flex;gap:12px;align-items:flex-start;text-decoration:none;color:inherit;padding:14px 14px 4px}
.acts{display:flex;gap:2px;justify-content:flex-end;padding:0 8px 6px}
.act{border:0;background:none;cursor:pointer;font-size:15px;line-height:1;padding:6px;border-radius:8px;opacity:.5;text-decoration:none;color:var(--ink)}
.act:hover,.act:focus-visible{background:var(--bg);opacity:1}.act.on{opacity:1;color:#d97706}
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none}
#toast.show{opacity:1}
.ic{flex:0 0 38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:#fff}
.doc{background:#2563eb}.slides{background:#f59e0b}.sheet{background:#16a34a}.form{background:#7c3aed}.folder{background:#64748b}.file,.link{background:#0f766e}
.tt{font-weight:bold;font-size:15px;line-height:1.3}.dd{color:var(--muted);font-size:13px;margin-top:4px}
.tag{display:inline-block;font-size:11px;border-radius:6px;padding:2px 6px;margin-inline-start:6px;vertical-align:middle;font-weight:bold}
.tag.new{background:#dcfce7;color:#166534}.tag.upd{background:#dbeafe;color:#1e40af}.tag.pin{background:#fef3c7;color:#92400e}
.aud{font-size:11px;color:var(--muted);margin-top:6px}
.empty{color:var(--muted);padding:30px;text-align:center}
footer{color:var(--muted);font-size:12px;text-align:center;margin-top:30px}
</style></head><body>
<header><div class="wrap" style="padding-bottom:0"><h1>🌉 __TITLE__</h1><p>כל מה שצריך לעבודה במקום אחד</p></div></header>
<div class="wrap">
  <div class="bar">
    <button class="chip" data-r="all">הכל</button>
    <button class="chip" data-r="m">מש"קיות</button>
    <button class="chip" data-r="n">מנה"דים</button>
    <input id="q" placeholder="🔍 חיפוש מסמך...">
  </div>
  <div id="msgs"></div>
  <div id="out"></div>
  <footer>הפורטל מתעדכן אוטומטית · נבנה עבור צוות גשרים מדמ"ח</footer>
</div>
<div id="toast" role="status"></div>
<script>
var D=__DATA__, role='__ROLE__', ROLE0=role;
var BYU={};D.links.forEach(function(l){BYU[l.u]=l});
// מועדפים נשמרים בדפדפן של כל משתמשת (לא בגיליון)
var FAV={};try{FAV=JSON.parse(localStorage.getItem('gesharim_fav')||'{}')||{}}catch(e){}
function saveFav(){try{localStorage.setItem('gesharim_fav',JSON.stringify(FAV))}catch(e){}}
var tt;function toast(s){var t=document.getElementById('toast');t.textContent=s;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},1800)}
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
var TYPE={doc:'DOC',slides:'PPT',sheet:'XLS',form:'טופס',folder:'📁',file:'קובץ',link:'🔗'};
var AUD={all:'',m:'למש"קיות',n:'למנה"דים'};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function seen(x){return role==='all'||x.a==='all'||x.a===role}
function card(l){
  var tags=(l.p?'<span class="tag pin">📌 חשוב</span>':'')+(l.isNew?'<span class="tag new">חדש</span>':'')+(l.isUpd?'<span class="tag upd">עודכן</span>':'');
  var f=!!FAV[l.u],u=esc(l.u);
  return '<div class="cw"><a class="card" href="'+u+'" target="_blank" rel="noopener" data-u="'+u+'"><div class="ic '+l.type+'">'+TYPE[l.type]+'</div><div>'+
    '<div class="tt">'+esc(l.t)+tags+'</div>'+(l.d?'<div class="dd">'+esc(l.d)+'</div>':'')+
    (role==='all'&&l.a!=='all'?'<div class="aud">'+AUD[l.a]+'</div>':'')+'</div></a>'+
    '<div class="acts"><button class="act'+(f?' on':'')+'" data-act="fav" data-u="'+u+'" title="'+(f?'הסרה מהמועדפים':'הוספה למועדפים')+'" aria-label="מועדפים">'+(f?'★':'☆')+'</button>'+
    '<button class="act" data-act="copy" data-u="'+u+'" title="העתקת קישור" aria-label="העתקת קישור">📋</button>'+
    '<a class="act" href="https://wa.me/?text='+esc(encodeURIComponent(l.t+'\n'+l.u))+'" target="_blank" rel="noopener" title="שליחה בוואטסאפ" aria-label="שליחה בוואטסאפ">💬</a></div></div>';
}
function section(title,items){
  if(!items.length)return '';
  return '<h2>'+title+' <span class="n">'+items.length+'</span></h2><div class="grid">'+items.map(card).join('')+'</div>';
}
function render(){
  document.querySelectorAll('.chip').forEach(function(c){c.classList.toggle('on',c.dataset.r===role)});
  var q=document.getElementById('q').value.trim().toLowerCase();
  document.getElementById('msgs').innerHTML=q?'':D.msgs.filter(seen).map(function(m){
    return '<div class="msg '+m.lvl+'"><b>'+(m.lvl==='urgent'?'🔴 ':m.lvl==='important'?'🟡 ':'💬 ')+esc(m.t)+'</b>'+esc(m.b).replace(/\n/g,'<br>')+(m.date?' <small>· '+m.date+'</small>':'')+'</div>';
  }).join('');
  var L=D.links.filter(seen).filter(function(l){return !q||(l.t+' '+l.d+' '+l.c).toLowerCase().indexOf(q)>-1});
  if(!L.length){document.getElementById('out').innerHTML='<div class="empty">לא נמצאו מסמכים</div>';return}
  var h='';
  if(!q){
    h+=section('⭐ המועדפים שלי',L.filter(function(l){return FAV[l.u]}));
    h+=section('📌 חשוב עכשיו',L.filter(function(l){return l.p}));
    h+=section('🆕 חדש ועודכן ב-'+D.days+' הימים האחרונים',L.filter(function(l){return l.isNew||l.isUpd}).sort(function(a,b){return b.when-a.when}));
  }
  var cats=(D.cats||[]).slice();L.forEach(function(l){if(cats.indexOf(l.c)<0)cats.push(l.c)});
  cats.forEach(function(c){h+=section('📂 '+esc(c),L.filter(function(l){return l.c===c}))});
  document.getElementById('out').innerHTML=h;
}
document.querySelectorAll('.chip').forEach(function(c){c.onclick=function(){role=c.dataset.r;render()}});
document.getElementById('q').oninput=render;
document.getElementById('out').addEventListener('click',function(e){
  var b=e.target.closest('button[data-act]');
  if(b){
    var u=b.getAttribute('data-u');
    if(b.dataset.act==='fav'){if(FAV[u])delete FAV[u];else FAV[u]=1;saveFav();render();toast(FAV[u]?'נוסף למועדפים ⭐':'הוסר מהמועדפים')}
    else copy(u);
    return;
  }
  var a=e.target.closest('a.card');
  if(a&&window.google&&google.script&&google.script.run)google.script.run.logClick(a.getAttribute('data-u'),ROLE0);
});
render();
</script></body></html>`;
