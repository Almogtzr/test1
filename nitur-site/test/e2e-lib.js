/* הרצת הממשק האמיתי מול קוד השרת האמיתי (בסימולציה), בדפדפן אמיתי. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { Server } = require('./gas-sim.js');
const { build } = require('./workbook.js');
const OUT = path.join(__dirname, '..') + '/';
const HTML = OUT + 'dist/WebAppUI.html';

function fontCss() {
  const f = (pkg, fam, file, w, range) => {
    const b = fs.readFileSync(path.join(__dirname, '..', 'node_modules/@fontsource', pkg, 'files', file)).toString('base64');
    return `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${b}) format('woff2');unicode-range:${range}}`;
  };
  const HEB = 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F', LAT = 'U+0000-00FF,U+2000-206F,U+2190-21FF';
  let css = '';
  [400, 500, 600, 700].forEach(w => {
    css += f('ibm-plex-sans-hebrew', 'IBM Plex Sans Hebrew', `ibm-plex-sans-hebrew-hebrew-${w}-normal.woff2`, w, HEB);
    css += f('ibm-plex-sans-hebrew', 'IBM Plex Sans Hebrew', `ibm-plex-sans-hebrew-latin-${w}-normal.woff2`, w, LAT);
  });
  [500, 700].forEach(w => {
    css += f('frank-ruhl-libre', 'Frank Ruhl Libre', `frank-ruhl-libre-hebrew-${w}-normal.woff2`, w, HEB);
    css += f('frank-ruhl-libre', 'Frank Ruhl Libre', `frank-ruhl-libre-latin-${w}-normal.woff2`, w, LAT);
  });
  return css;
}
const SHIM = `
(function(){
  function runner(ok, no){
    return new Proxy({}, { get: function(t, name){
      if (name === 'withSuccessHandler') return function(f){ return runner(f, no); };
      if (name === 'withFailureHandler') return function(f){ return runner(ok, f); };
      return function(){
        var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
        window.__gas(window.__EMAIL, name, args).then(function(r){
          setTimeout(function(){ if (r.err) { if (no) no(new Error(r.err)); } else if (ok) ok(r.value); }, window.__LAG || 20);
        });
      };
    }});
  }
  window.__hist = [];
  window.google = { script: { run: runner(null, null), history: {
    push: function(s){ window.__hist.push(s); }, setChangeHandler: function(f){ window.__histCb = f; } } } };
})();`;

async function open(opts) {
  opts = opts || {};
  const T = opts.T || build(opts.build || {});
  const S = opts.S || new Server(T.wb, [OUT + 'gas/SheetCode.gs', OUT + 'gas/WebApp.gs']);
  const browser = opts.browser || await chromium.launch();
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 900 }, deviceScaleFactor: opts.dpr || 1, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', hasTouch: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  const css = fontCss();
  await page.route('**fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: css }));
  await page.route('**fonts.gstatic.com/**', r => r.abort());
  await page.exposeFunction('__gas', (email, fn, args) => {
    try { return { value: S.call(email, fn, args) }; }
    catch (e) { return { err: e.message }; }
  });
  await page.addInitScript(SHIM);
  await page.addInitScript(e => { window.__EMAIL = e; }, opts.email === undefined ? 'almogt@cyber.org.il' : opts.email);
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => !document.getElementById('gate') || document.getElementById('gate').hidden || /אין הרשאה|לא זוהה|נסה שוב/.test(document.getElementById('gateMsg').textContent), null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  return { page, ctx, browser, T, S, errors };
}
const settle = page => page.waitForFunction(() => !document.querySelector('#busy.on'), null, { timeout: 15000 }).then(() => page.waitForTimeout(120));
module.exports = { open, settle, build, Server, OUT };
