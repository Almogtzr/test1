const {chromium,devices}=require('playwright');const fs=require('fs');
const axe=fs.readFileSync('node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();
 for(const [name,o] of [['נייד בהיר',{...devices['iPhone 13']}],['מחשב כהה',{viewport:{width:1280,height:900},colorScheme:'dark'}]]){
  const p=await (await b.newContext(o)).newPage();await p.goto('file://'+process.cwd()+'/p_all.html');await p.waitForTimeout(300);
  await p.addScriptTag({content:axe});
  const r=await p.evaluate(async()=>{const x=await axe.run(document,{runOnly:['wcag2a','wcag2aa']});return x.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,ex:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' :: '+(n.any[0]&&n.any[0].message||''))}))});
  console.log('== '+name+': '+r.length+' סוגי בעיות');r.forEach(v=>console.log(v.impact,v.id,'x'+v.n,'-',v.help,'\n   ',v.ex.join('\n    ')));
 }
 await b.close();})();
