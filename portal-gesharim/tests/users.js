// 40 משתמשים מדומים במקביל: מכשירים, קהלים ומצבי תצוגה שונים, כל אחד 35 פעולות אקראיות
const {chromium,devices}=require('playwright');
const N=+process.argv[2]||40,STEPS=+process.argv[3]||35;
const DEV=[devices['iPhone 13'],devices['iPhone SE'],devices['Pixel 7'],devices['Galaxy S9+'],devices['iPad Mini'],{viewport:{width:1280,height:800}},{viewport:{width:1920,height:1080}},{viewport:{width:360,height:640},isMobile:true,hasTouch:true},{viewport:{width:768,height:1024}}];
const WORDS=['משקיות','מש"קיות','אקזיט','מחוון','זהת','שנה ב','<img>','"','🎯','xyz','  ','שנה','א','תצפית מחוון','ENGLISH','מסמך 1','\\','(',')','[a-z]+'];
let seed=12345;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n};
(async()=>{
 const b=await chromium.launch();
 const report={errors:[],issues:[],actions:0,calls:{submitDoc:0,reportIssue:0,logClick:0}};
 async function user(id){
  const dev=DEV[id%DEV.length],role=['m','n','all'][id%3],scheme=id%4===0?'dark':'light';
  const ctx=await b.newContext({...dev,colorScheme:scheme});const p=await ctx.newPage();
  const tag='משתמש '+id+' ('+(dev.viewport.width)+'px,'+role+','+scheme+')';
  p.on('pageerror',e=>report.errors.push(tag+': '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/fonts|net::|Failed to load/.test(m.text()))report.errors.push(tag+' console: '+m.text())});
  p.on('dialog',d=>{report.issues.push(tag+': נפתח dialog: '+d.message());d.dismiss()});
  await p.addInitScript(id=>{let s=id*7+1;const r=()=>{s=(s*9301+49297)%233280;return s/233280};
   // חיקוי google.script.run: השהיה אקראית, 10% כשל רשת, 15% תשובת שגיאה מהשרת
   window.CALLS=[];
   function Runner(){this.ok=null;this.bad=null}
   Runner.prototype.withSuccessHandler=function(f){var n=new Runner();n.ok=f;n.bad=this.bad;return n};
   Runner.prototype.withFailureHandler=function(f){var n=new Runner();n.ok=this.ok;n.bad=f;return n};
   ['submitDoc','reportIssue','logClick'].forEach(function(k){Runner.prototype[k]=function(){CALLS.push(k);var me=this,x=r();
     setTimeout(function(){if(x<.1){me.bad&&me.bad(new Error('net'))}else{me.ok&&me.ok(x<.25?{ok:false,msg:'שגיאה מדומה'}:{ok:true})}},50+x*300)}});
   window.google={script:{run:new Runner()}};
  },id);
  p.setDefaultTimeout(4000);
  const file='p_'+(id%7===0?'big':role)+'.html';
  await p.goto('file://'+process.cwd()+'/'+file);await p.waitForTimeout(150);
  const mobile=dev.viewport.width<=700;
  const acts=[
   async()=>{const w=WORDS[rnd(WORDS.length)];await p.fill('#q',w);await p.waitForTimeout(200)},
   async()=>{await p.fill('#q','');await p.waitForTimeout(160)},
   async()=>{const n=await p.$$eval('.pill',x=>x.length);if(n){await p.locator('.pill').nth(rnd(n)).click({force:true})}},
   async()=>{const n=await p.$$eval('[data-act=fav]',x=>x.length);if(n)await p.locator('[data-act=fav]').nth(rnd(n)).click({force:true})},
   async()=>{const o=await p.$$eval('#ftype option',x=>x.map(e=>e.value));await p.selectOption('#ftype',o[rnd(o.length)])},
   async()=>{await p.selectOption('#fsort',['sheet','az','new','top'][rnd(4)])},
   async()=>{await p.click('[data-view='+(rnd(2)?'list':'grid')+']',{force:true})},
   async()=>{await p.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),rnd(6000));await p.waitForTimeout(60)},
   async()=>{const n=await p.$$eval('[data-act=report]',x=>x.length);if(!n)return;await p.locator('[data-act=report]').nth(rnd(n)).click({force:true});
     if(rnd(2))await p.click('#rquick button:nth-child('+(1+rnd(4))+')');else await p.fill('#rf textarea','בדיקה '+id);
     if(rnd(3))await p.click('#rbtn');await p.waitForTimeout(400);if(rnd(2))await p.keyboard.press('Escape');else{const c=p.locator('#rmodal [data-close]:visible').first();if(await c.count())await c.click()}},
   async()=>{if(mobile)await p.click('[data-bn=add]');else await p.click('#fab',{force:true});
     await p.fill('#sf input[name=name]',rnd(2)?'נועה':'');await p.fill('#sf input[name=title]','מסמך '+id);await p.fill('#sf input[name=url]',['https://docs.google.com/x'+id,'not a url','https://a b'][rnd(3)]);
     await p.click('#sbtn');await p.waitForTimeout(400);await p.keyboard.press('Escape')},
   async()=>{if(mobile)await p.click('[data-bn='+['home','search','fav','due'][rnd(4)]+']');await p.waitForTimeout(150)},
   async()=>{const a=p.locator('[data-arch]');if(await a.count())await a.click({force:true})},
   async()=>{const a=p.locator('[data-more]');if(await a.count())await a.first().click({force:true})},
   async()=>{const a=p.locator('footer [data-a2hs]');await a.click({force:true});await p.waitForTimeout(100);await p.keyboard.press('Escape')},
   async()=>{const c=p.locator('.chip:visible');const n=await c.count();if(n)await c.nth(rnd(n)).click()},
   async()=>{const n=await p.$$eval('a.card',x=>x.length);if(n){const ctxPages=ctx.pages().length;await p.locator('a.card').nth(rnd(n)).click({force:true,modifiers:[]});await p.waitForTimeout(100);for(const pp of ctx.pages())if(pp!==p)await pp.close()}},
   async()=>{const n=await p.$$eval('[data-act=copy]',x=>x.length);if(n)await p.locator('[data-act=copy]').nth(rnd(n)).click({force:true});await p.waitForTimeout(80)},
  ];
  for(let s=0;s<STEPS;s++){
   const k=rnd(acts.length);
   try{await acts[k]();report.actions++}catch(e){report.issues.push(tag+': פעולה '+k+' נכשלה: '+e.message.split('\n')[0]);await p.keyboard.press('Escape').catch(()=>{})}
   const st=await p.evaluate(()=>{
     const out=document.getElementById('out').innerText+document.getElementById('stats').innerText+document.getElementById('pills').innerText;
     const ids={};let dup=0;document.querySelectorAll('[id]').forEach(e=>{if(ids[e.id])dup++;ids[e.id]=1});
     return {ow:document.documentElement.scrollWidth>window.innerWidth+1,bad:/undefined|NaN|\[object/.test(out),lock:document.body.classList.contains('lock')&&!document.querySelector('.modal:not([hidden])'),
       dup,xss:!!document.querySelector('#out img,#out script,#msgs b b,#msgs i'),w:window.innerWidth,sw:document.documentElement.scrollWidth}});
   if(st.ow)report.issues.push(tag+': גלילה הצידה אחרי פעולה '+k+' ('+st.sw+'>'+st.w+')');
   if(st.bad)report.issues.push(tag+': טקסט undefined/NaN אחרי פעולה '+k);
   if(st.lock)report.issues.push(tag+': הגלילה נשארה נעולה בלי חלון פתוח אחרי פעולה '+k);
   if(st.dup)report.issues.push(tag+': '+st.dup+' מזהים כפולים');
   if(st.xss)report.issues.push(tag+': HTML מהנתונים הוזרק לדף!');
  }
  const c=await p.evaluate(()=>CALLS);c.forEach(k=>report.calls[k]=(report.calls[k]||0)+1);
  await ctx.close();
 }
 const t0=Date.now();
 const ids=[...Array(N).keys()];const C=10;
 for(let i=0;i<ids.length;i+=C)await Promise.all(ids.slice(i,i+C).map(user));
 await b.close();
 const uniq=a=>[...new Set(a)];
 console.log('\n== סיכום ==');console.log('משתמשים:',N,'פעולות:',report.actions,'זמן:',Math.round((Date.now()-t0)/1000)+'s');
 console.log('קריאות לשרת:',JSON.stringify(report.calls));
 console.log('שגיאות JS:',report.errors.length);uniq(report.errors).slice(0,15).forEach(e=>console.log('  ',e));
 console.log('בעיות:',report.issues.length);uniq(report.issues.map(x=>x.replace(/משתמש \d+ /,''))).slice(0,30).forEach(e=>console.log('  ',e));
})();
