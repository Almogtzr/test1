const { open, settle } = require('./e2e-lib.js');
(async () => {
  const which = process.argv[2] || 'desktop';
  const mobile = which === 'mobile';
  const s = await open({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 }, dpr: mobile ? 2 : 1, touch: mobile });
  const p = s.page;
  const shot = async (name, full) => { await settle(p); await p.screenshot({ path: __dirname + `/../shots/${which}-${name}.png`, fullPage: full !== false }); };
  const nav = async v => { await p.evaluate(v => go(v), v); await settle(p); };
  await shot('home');
  await nav('list'); await shot('list', false);
  await p.evaluate(() => go('obs', { r: X.valid[3].r })); await settle(p); await p.waitForTimeout(200); await shot('obs');
  await nav('mash'); await shot('mash', false);
  await p.evaluate(() => { const n = Object.keys(X.byMash).sort((a, b) => X.byMash[b].length - X.byMash[a].length)[0]; go('card', { n }); }); await shot('card');
  await nav('rep'); await shot('rep-nat');
  for (const t of ['dim', 'resp', 'obsv', 'month', 'mad']) { await p.evaluate(t => { ST.tab.rep = t; render(); }, t); await shot('rep-' + t, false); }
  await nav('care'); await shot('care-alerts', false);
  for (const t of ['reco', 'risk', 'quality', 'log']) { await p.evaluate(t => { ST.tab.care = t; render(); }, t); await settle(p); await shot('care-' + t, false); }
  await nav('adm'); await settle(p); await shot('adm-users', false);
  await p.evaluate(() => { ST.tab.adm = 'sys'; render(); }); await shot('adm-sys');
  await nav('form'); await shot('form-empty');
  console.log(s.errors.length ? s.errors.join('\n') : 'NO JS ERRORS (' + which + ')');
  await s.browser.close();
})().catch(e => { console.error('E2E FAILED:', e.message); process.exit(1); });
