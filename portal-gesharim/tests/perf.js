const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();
 for(const [name,o,cpu] of [['מחשב',{viewport:{width:1280,height:900}},1],['טלפון איטי (פי 4)',{...devices['Pixel 7']},4]]){
  const ctx=await b.newContext(o);const p=await ctx.newPage();const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  const t0=Date.now();await p.goto('file://'+process.cwd()+'/p_big.html');const load=Date.now()-t0;
  const r=await p.evaluate(async()=>{const T=[];const q=document.getElementById('q');
    for(const w of ['מ','מצ','מצג','מצגת','']){const s=performance.now();q.value=w;render();T.push(Math.round(performance.now()-s))}
    let s=performance.now();for(let i=0;i<20;i++){window.scrollTo(0,i*300);spy()}const sp=Math.round((performance.now()-s)/20*10)/10;
    s=performance.now();document.querySelector('[data-view=list]').click();const lv=Math.round(performance.now()-s);
    return {T,sp,lv,cards:document.querySelectorAll('.cw').length}});
  console.log(name+': טעינה '+load+'ms | חיפוש לכל הקשה (ms): '+r.T.join(', ')+' | חישוב גלילה '+r.sp+'ms | מעבר לרשימה '+r.lv+'ms | כרטיסים '+r.cards);
  await ctx.close();}
 await b.close();})();
