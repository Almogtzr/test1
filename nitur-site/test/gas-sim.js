/* חיקוי מינימלי של סביבת Apps Script, כדי להריץ את קוד השרת האמיתי
   (קוד הגיליון + WebApp.gs) מול גיליון מדומה במבנה האמיתי. */
process.env.TZ = 'Asia/Jerusalem';
const vm = require('vm');
const fs = require('fs');

function chain(target) {
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol') return undefined;
      return function () { return chainSelf(t); };
    }
  });
}
function chainSelf(t) { return t.__proxy || t; }

let MTIME = Date.now();
function touch() { MTIME += 1000; }

class Sheet {
  constructor(name, rows, maxRows, maxCols) {
    this.name = name;
    this.cells = rows.map(r => r.slice());
    this.formulas = {};
    const w = this.cells.reduce((m, r) => Math.max(m, r.length), 0);
    this.maxCols = Math.max(maxCols || 0, w, 1);
    this.maxRows = Math.max(maxRows || 0, this.cells.length, 1);
    this.onFlush = null;
    this.__proxy = chain(this);
    return this.__proxy;
  }
  getName() { return this.name; }
  getSheetId() { return 12345; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  _has(v) { return !(v === '' || v === null || v === undefined); }
  getLastRow() {
    for (let r = this.cells.length - 1; r >= 0; r--) {
      if ((this.cells[r] || []).some(v => this._has(v))) return r + 1;
    }
    return 0;
  }
  getLastColumn() {
    let m = 0;
    this.cells.forEach(r => { for (let c = r.length - 1; c >= 0; c--) if (this._has(r[c])) { if (c + 1 > m) m = c + 1; break; } });
    return m;
  }
  _get(r, c) { const row = this.cells[r - 1]; const v = row ? row[c - 1] : ''; return v === undefined || v === null ? '' : (v instanceof Date ? new Date(v.getTime()) : v); }
  _set(r, c, v) {
    if (r > this.maxRows || c > this.maxCols) throw new Error('הטווח חורג מגבולות הגיליון (' + this.name + ' ' + r + ',' + c + ')');
    while (this.cells.length < r) this.cells.push([]);
    const row = this.cells[r - 1];
    while (row.length < c) row.push('');
    /* כמו בגיליון: מחרוזת מתפרשת כאילו הוקלדה ביד */
    if (typeof v === 'string' && v.charAt(0) === '=') { this.formulas[r + ',' + c] = v; row[c - 1] = ''; }
    else {
      delete this.formulas[r + ',' + c];
      if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);
      else if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}$/.test(v)) { const q = v.split('/'); v = new Date(new Date().getFullYear(), q[0] - 1, +q[1]); }
      else if (typeof v === 'string' && v !== '' && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      row[c - 1] = v;
    }
    touch();
  }
  getRange(r, c, nr, nc) {
    if (typeof r === 'string') throw new Error('A1 not supported in sim');
    return new Range(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc);
  }
  getDataRange() { return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  appendRow(vals) { const r = this.getLastRow() + 1; if (r > this.maxRows) this.maxRows = r; vals.forEach((v, i) => this._set(r, i + 1, v)); }
  insertRowsAfter(after, n) { this.maxRows += n; touch(); }
  insertColumnAfter() { this.maxCols += 1; touch(); }
  insertColumnsAfter(after, n) { this.maxCols += n; touch(); }
  deleteRows(start, n) { this.cells.splice(start - 1, n); this.maxRows = Math.max(this.maxRows - n, 1); touch(); }
  deleteRow(r) { this.deleteRows(r, 1); }
}

class Range {
  constructor(sh, r, c, nr, nc) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error('טווח לא תקין: ' + [r, c, nr, nc].join(','));
    if (r + nr - 1 > sh.maxRows || c + nc - 1 > sh.maxCols) throw new Error('הטווח חורג מגבולות הגיליון: ' + sh.name + ' ' + [r, c, nr, nc].join(',') + ' (max ' + sh.maxRows + 'x' + sh.maxCols + ')');
    this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc;
    this.__proxy = chain(this);
    return this.__proxy;
  }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh._get(this.r + i, this.c + j)); o.push(row); } return o; }
  getValue() { return this.sh._get(this.r, this.c); }
  getFormulas() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.formulas[(this.r + i) + ',' + (this.c + j)] || ''); o.push(row); } return o; }
  getFormula() { return this.sh.formulas[this.r + ',' + this.c] || ''; }
  setValues(v) {
    if (v.length !== this.nr || v.some(x => x.length !== this.nc)) throw new Error('מספר השורות/העמודות בנתונים אינו תואם לטווח');
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh._set(this.r + i, this.c + j, v[i][j]);
    return this.__proxy;
  }
  setValue(v) {
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) throw new Error('setValue: סוג לא נתמך');
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh._set(this.r + i, this.c + j, v);
    return this.__proxy;
  }
  clearContent() {
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) { delete this.sh.formulas[(this.r + i) + ',' + (this.c + j)]; const row = this.sh.cells[this.r + i - 1]; if (row && row.length >= this.c + j) row[this.c + j - 1] = ''; }
    touch(); return this.__proxy;
  }
  getRow() { return this.r; } getColumn() { return this.c; }
  getNumRows() { return this.nr; } getNumColumns() { return this.nc; }
}

class Workbook {
  constructor() { this.sheets = {}; this.order = []; this.props = {}; this.cache = {}; this.tz = ''; this.__proxy = chain(this); return this.__proxy; }
  add(sh) { this.sheets[sh.getName()] = sh; this.order.push(sh.getName()); return sh; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { return this.add(new Sheet(n, [[]], 1000, 26)); }
  getSheets() { return this.order.map(n => this.sheets[n]); }
  getId() { return 'FAKE_ID'; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/FAKE_ID/edit'; }
  getName() { return 'ניטור תצפיות - בדיקה'; }
  getSpreadsheetTimeZone() { return this.tz || 'Asia/Jerusalem'; }
  toast() { /* בהקשר אתר אין ממשק */ }
}

function tzParts(d, tz) {
  const o = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).forEach(p => { o[p.type] = p.value; });
  return o;
}
function fmtDate(d, tz, f) {
  const o = tzParts(d, tz || 'Asia/Jerusalem');
  return f.replace('yyyy', o.year).replace('MM', o.month).replace('dd', o.day).replace('HH', o.hour).replace('mm', o.minute);
}
function parseDate(str, tz, f) {
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m || f !== 'yyyy-MM-dd HH:mm') throw new Error('sim: parseDate format');
  const want = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const o = tzParts(new Date(t), tz);
    t += want - Date.UTC(+o.year, o.month - 1, +o.day, +o.hour, +o.minute);
  }
  return new Date(t);
}

function makeEnv(wb, state) {
  const propsOf = bucket => ({
    getProperty: k => (k in bucket ? bucket[k] : null),
    setProperty: (k, v) => { bucket[k] = String(v); },
    deleteProperty: k => { delete bucket[k]; }
  });
  const cache = {
    get: k => (k in wb.cache ? wb.cache[k] : null),
    put: (k, v) => { if (String(v).length > 100000) throw new Error('Cache: ערך גדול מ-100KB'); wb.cache[k] = String(v); },
    getAll: keys => { const o = {}; keys.forEach(k => { if (k in wb.cache) o[k] = wb.cache[k]; }); return o; },
    putAll: obj => { Object.keys(obj).forEach(k => { if (String(obj[k]).length > 100000) throw new Error('Cache: ערך גדול מ-100KB'); }); Object.keys(obj).forEach(k => { wb.cache[k] = String(obj[k]); }); },
    remove: k => { delete wb.cache[k]; }
  };
  const anyChain = () => chain({});
  return {
    console, JSON, Math, Date, String, Number, Object, Array, RegExp, isNaN, isFinite, parseInt, parseFloat, Error, Boolean,
    SpreadsheetApp: chain({
      getActive: () => wb, getActiveSpreadsheet: () => wb,
      flush: () => { wb.getSheets().forEach(s => { if (s.onFlush) s.onFlush(s); }); },
      getUi: () => { throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); },
      openById: () => { throw new Error('sim: openById לא נתמך'); },
      ProtectionType: {}, BorderStyle: {}, CopyPasteType: {}, InterpolationType: {}
    }),
    Session: { getActiveUser: () => ({ getEmail: () => state.email }), getEffectiveUser: () => ({ getEmail: () => 'almogt@cyber.org.il' }), getScriptTimeZone: () => 'Asia/Jerusalem' },
    PropertiesService: { getDocumentProperties: () => propsOf(wb.props), getScriptProperties: () => propsOf(wb.props), getUserProperties: () => propsOf({}) },
    CacheService: { getDocumentCache: () => cache, getScriptCache: () => cache },
    LockService: { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {}, waitLock: () => {} }) },
    Utilities: { formatDate: fmtDate, parseDate: parseDate, sleep: () => {} },
    DriveApp: { getFileById: () => ({ getLastUpdated: () => new Date(MTIME) }) },
    HtmlService: chain({ createHtmlOutputFromFile: anyChain, createHtmlOutput: anyChain, XFrameOptionsMode: { ALLOWALL: 1 } }),
    ScriptApp: chain({ getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/FAKE/exec' }) }),
    SlidesApp: chain({}), Charts: chain({ ChartType: {} }), Logger: { log: () => {} }
  };
}

function hasDate(v, path) {
  if (v instanceof Date) return path;
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) { const hit = hasDate(v[k], path + '.' + k); if (hit) return hit; }
  }
  return null;
}

class Server {
  constructor(wb, files) {
    this.wb = wb;
    this.scripts = files.map(f => new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }));
    this.calls = [];
  }
  /* כל קריאה רצה בהקשר חדש, כמו הרצה נפרדת ב-Apps Script */
  call(email, fn, args) {
    const state = { email: email };
    const ctx = vm.createContext(makeEnv(this.wb, state));
    this.scripts.forEach(s => s.runInContext(ctx));
    const f = vm.runInContext('typeof ' + fn + ' === "function" ? ' + fn + ' : null', ctx);
    if (!f) throw new Error('sim: אין פונקציה ' + fn);
    const t0 = Date.now();
    const out = f.apply(null, args || []);
    const bad = hasDate(out, fn);
    if (bad) throw new Error('ערך מוחזר מכיל Date (לא נתמך ב-google.script.run): ' + bad);
    const json = out === undefined ? undefined : JSON.parse(JSON.stringify(out));
    this.calls.push({ fn, ms: Date.now() - t0, bytes: out === undefined ? 0 : JSON.stringify(out).length });
    return json;
  }
}

module.exports = { Sheet, Workbook, Server, touch };
