const fs=require('fs'),{makeEnv,load}=require('./mock');
const src=fs.readFileSync(process.argv[2],'utf8');
let pass=0,fail=0;const ok=(c,name,extra)=>{if(c)pass++;else{fail++;console.log('❌',name,extra!==undefined?JSON.stringify(extra):'')}};
const H=['כותרת','קישור','קטגוריה','m','n','תיאור','pin','הוספה','צפיות','אחרונה','צm','צn','תגב','שגרה','יום','שעה','אחראי','תת','ארכיון'];
const day=864e5,now=Date.now();
const row=(o)=>{const r=Array(19).fill('');Object.assign(r,o);return r};
function base(){return {
 'קישורים':[H,
  row({0:'מסמך רגיל',1:'https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/edit',2:'תוכן',3:true,4:true,7:new Date(now-3*day),8:5}),
  row({0:'למנהדים',1:'https://docs.google.com/spreadsheets/d/BBBBBBBBBBBBBBBBBBBBBBBB',2:'נהלים',3:false,4:true,7:new Date(now-40*day)}),
  row({0:'טיוטה',1:'https://docs.google.com/document/d/CCCCCCCCCCCCCCCCCCCCCCCC',2:'תוכן',3:false,4:false}),
  row({0:'זדוני',1:'javascript:alert(1)',2:'תוכן',3:true,4:true}),
  row({0:'בארכיון',1:'https://docs.google.com/document/d/DDDDDDDDDDDDDDDDDDDDDDDD',2:'תוכן',3:true,4:true,18:true,12:new Date(now+2*day)}),
  row({0:'שגרה',1:'https://forms.gle/abcdef',2:'טפסים',3:true,4:false,13:'כל שבוע',14:'חמישי',15:'14:00'}),
  row({0:'תאריך כטקסט',1:'https://example.com/x',2:'',3:true,4:true,7:'לא תאריך',12:'גם לא',16:'  אלמוג  ',17:'שנה א'}),
  row({0:'קישור בלי כותרת',1:'',2:'תוכן',3:true,4:true}),
 ],
 'הודעות':[['h'],[new Date(),'דחוף','גוף\nשורה',true,true,'דחוף',null],[new Date(),'פג תוקף','',true,true,'רגיל',new Date(now-2*day)],[new Date(),'','',true,true,'רגיל',null],[new Date(now-day),'רגיל','',true,false,'רגיל',null]],
 'הגדרות':[['a','b','','קטגוריה','אימוג'],['שם','פורטל <b>&','','תוכן','📚'],['ימים',14,'','נהלים',''],['דרייב',true,'','טפסים','📝'],['קישור','https://script.google.com/x/exec?role=m','','','']],
 'בקשות':[['h']]
}}
// ---- getData_
let env=makeEnv(base()),A=load(src,env);
let d=A.getData_();
const titles=d.links.map(l=>l.t);
ok(titles.includes('מסמך רגיל')&&titles.includes('למנהדים'),'מסמכים מפורסמים מופיעים');
ok(!titles.includes('טיוטה'),'טיוטה לא מופיעה');
ok(!titles.includes('זדוני'),'קישור javascript: נחסם');
ok(!titles.includes('קישור בלי כותרת'),'שורה בלי קישור לא מופיעה');
ok(titles.includes('תאריך כטקסט'),'שורה עם תאריכים לא תקינים לא שוברת');
const arch=d.links.find(l=>l.t==='בארכיון');ok(arch&&arch.x===true&&!arch.due,'ארכיון מסומן ובלי תג"ב',arch);
const rec=d.links.find(l=>l.t==='שגרה');ok(rec&&rec.rec==='כל שבוע'&&rec.dueT==='14:00'&&new Date(rec.dueTs).getDay()===4&&rec.dueTs>now,'שגרה מחושבת ליום חמישי הבא',rec);
ok(rec.type==='form','forms.gle מזוהה כטופס');
const tx=d.links.find(l=>l.t==='תאריך כטקסט');ok(tx.o==='אלמוג'&&tx.s==='שנה א'&&tx.c==='כללי'&&!tx.due,'שדות טקסט נקיים, קטגוריה ריקה = כללי',tx);
ok(d.links.find(l=>l.t==='מסמך רגיל').isNew===true&&d.links.find(l=>l.t==='למנהדים').isNew===false,'חדש לפי תאריך הוספה');
ok(d.msgs.length===2&&d.msgs[0].lvl==='urgent','הודעות: פג תוקף והודעה ריקה מסוננות, דחוף ראשון',d.msgs.map(m=>m.t));
ok(d.cats.join()==='תוכן,נהלים,טפסים'&&d.cm['תוכן'].e==='📚'&&d.cm['נהלים'].e==='','קטגוריות ואימוג\'י',d.cm);
ok(A.getSettings_().url==='https://script.google.com/x/exec','קישור הפורטל בלי ?role');
// צבע קטגוריה
env.bgs['הגדרות:3:4']='#F4CCCC';d=A.getData_();ok(d.cm['נהלים'].c==='#f4cccc'&&d.cm['תוכן'].c==='','צבע מילוי נקרא, לבן = בלי צבע',d.cm);
// ---- doGet + זיכרון זמני
env=makeEnv(base());A=load(src,env);
let out;try{out=A.doGet({parameter:{role:'m'}});ok(true,'doGet רץ')}catch(e){ok(false,'doGet רץ',e.message)}
ok(out&&out.html.indexOf('פורטל &lt;b&gt;&amp;')>-1,'שם הפורטל עובר escape בכותרת');
ok(out&&out.html.indexOf("role='m'")>-1,'role מוזרק');
const drive1=env.calls.drive;A.doGet({parameter:{}});ok(env.calls.drive===drive1,'כניסה שנייה מהזיכרון, בלי דרייב',[drive1,env.calls.drive]);
const html2=A.doGet({parameter:{role:'<script>'}}).html;ok(html2.indexOf("role='all'")>-1,'role לא חוקי הופך ל-all');
ok(html2.indexOf('</script><script')<0&&!/"t":"[^"]*<\/script/.test(html2),'אין סגירת script מתוך הנתונים');
// עריכה מנקה זיכרון
const L=env.sheet('קישורים');
A.onEditInstalled({range:L.getRange(2,6),value:'x'});ok(!('pd_n' in env.cache),'עריכה בגיליון מנקה את הזיכרון');
// נתונים גדולים + אימוג'י בגבול חלק
env=makeEnv(base());for(let i=0;i<600;i++)env.sheets['קישורים'].push(row({0:'מסמך ארוך 🎯 '+i+' '+'א'.repeat(i%7?40:120),1:'https://example.com/'+i,2:'תוכן',3:true,4:true,5:'🎓'.repeat(30)}));
A=load(src,env);const big=A.portalData_();const n=Number(env.cache.pd_n);
ok(n>1,'נתונים גדולים נשמרים בכמה חלקים',n);
const again=A.portalData_();ok(JSON.stringify(again)===JSON.stringify(big),'קריאה מהחלקים זהה למקור, כולל אימוג\'י');
// ---- הדבקת כמה שורות
env=makeEnv(base());A=load(src,env);
env.sheets['קישורים'].push(row({1:'https://docs.google.com/document/d/EEEEEEEEEEEEEEEEEEEEEEEE'}),row({1:'https://docs.google.com/document/d/FFFFFFFFFFFFFFFFFFFFFFFF'}),row({0:'יש כותרת',1:'https://x.com'}));
const L2=env.sheet('קישורים');const last=env.sheets['קישורים'].length;
A.onEditInstalled({range:L2.getRange(last-2,1,3,2)});
const pasted=env.sheets['קישורים'].slice(-3);
ok(pasted.every(r=>r[7] instanceof Date),'הדבקה מרובה: תאריך הוספה לכל השורות');
ok(pasted.every(r=>r[8]===0&&r[10]===0&&r[11]===0),'הדבקה מרובה: מונים מאופסים');
ok(pasted[0][0].indexOf('שם מהדרייב')===0&&pasted[2][0]==='יש כותרת','שם מהדרייב רק כשאין כותרת',pasted.map(r=>r[0]));
// עריכה בעמודה אחרת לא נוגעת
const before=JSON.stringify(env.sheets['קישורים'][1]);A.onEditInstalled({range:L2.getRange(2,6),value:'תיאור'});ok(JSON.stringify(env.sheets['קישורים'][1])===before,'עריכת תיאור לא משנה שדות אחרים');
// ---- logClick
A.logClick('https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/edit','m');A.logClick('https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/edit','n');A.logClick('https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/edit','all');
const r1=env.sheets['קישורים'][1];ok(r1[8]===8&&r1[10]===1&&r1[11]===1&&r1[9] instanceof Date,'מונה צפיות לפי קהל',r1.slice(8,12));
A.logClick('https://unknown');A.logClick(null);ok(true,'לחיצה על קישור לא קיים לא קורסת');
// ---- submitDoc
const sd=f=>A.submitDoc(Object.assign({name:'נועה',title:'כותרת',url:'https://docs.google.com/document/d/GGGGGGGGGGGGGGGGGGGGGGGG',cat:'תוכן',aud:'m'},f));
ok(sd({}).ok,'הצעה תקינה');
ok(!sd({}).ok,'הצעה כפולה נחסמת');
ok(!sd({url:'https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/view'}).ok,'מסמך שכבר בפורטל נחסם (לפי מזהה)');
ok(!sd({url:'http://x.com'}).ok&&!sd({url:'javascript:x'}).ok&&!sd({url:'https://a b'}).ok,'קישור לא תקין נחסם');
ok(!sd({name:'   '}).ok,'בלי שם נחסם');
ok(!sd({url:'https://z.com/1',due:'2001-01-01'}).ok,'תג"ב בעבר נחסם');
ok(sd({url:'https://z.com/2',title:'=IMPORTXML("x")',name:'+972',desc:'@x',cat:'לא קיימת'}).ok,'הצעה עם תווי נוסחה מתקבלת');
const req=env.sheets['בקשות'];const lastReq=req[req.length-1];
ok(lastReq[2][0]==="'"&&lastReq[1][0]==="'"&&lastReq[6][0]==="'"&&lastReq[4]==='כללי','תווי נוסחה מנוטרלים, קטגוריה לא קיימת = כללי',lastReq);
ok(sd({website:'bot',url:'https://z.com/3'}).ok&&!req.some(r=>r[3]==='https://z.com/3'),'בוט נבלע בשקט');
ok(!sd({url:'https://z.com/'+'a'.repeat(600)}).ok||true,'קישור ארוך מאוד לא קורס');
for(let i=0;i<45;i++)sd({url:'https://flood.com/'+i});ok(!sd({url:'https://flood.com/x'}).ok,'מכסה יומית נאכפת');
// ---- reportIssue
ok(A.reportIssue({u:'https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/edit',msg:'לא נפתח'}).ok,'דיווח תקין');
ok(!A.reportIssue({u:'https://evil',msg:'xxxx'}).ok&&!A.reportIssue({u:'https://docs.google.com/document/d/AAAAAAAAAAAAAAAAAAAAAAAA/edit',msg:''}).ok,'דיווח על מסמך לא קיים או ריק נחסם');
ok(env.mails.every(m=>m.to==='me@x'),'מיילים נשלחים רק לבעלים',env.mails.map(m=>m.to));
// ---- אישור בקשה
env=makeEnv(base());A=load(src,env);
A.submitDoc({name:'=נועה',title:'-מסמך מוצע',url:'https://docs.google.com/document/d/HHHHHHHHHHHHHHHHHHHHHHHH',cat:'נהלים',aud:'n',due:'2099-05-05'});
const R=env.sheet('בקשות'),rr=env.sheets['בקשות'].length;env.sheets['בקשות'][rr-1][7]='אושר';
A.onEditInstalled({range:R.getRange(rr,8),value:'אושר'});
const added=env.sheets['קישורים'][env.sheets['קישורים'].length-1];
ok(added[1]==='https://docs.google.com/document/d/HHHHHHHHHHHHHHHHHHHHHHHH'&&added[3]===false&&added[4]===true&&added[12] instanceof Date,'אישור מפרסם לקהל הנכון עם תג"ב',added.slice(0,13));
ok(added[0][0]==="'"&&!/^[=+@-]/.test(added[5]),'אישור לא הופך טקסט לנוסחה',[added[0],added[5]]);
A.onEditInstalled({range:R.getRange(rr,8),value:'אושר'});ok(env.sheets['קישורים'].filter(r=>r[1]===added[1]).length===1,'אישור כפול לא מפרסם פעמיים');
// ---- nextDue_ מקרי קצה (Asia/Jerusalem: מעבר שעון 25/10/2026)
const nd=(o,nowTs,t)=>A.nextDue_(row(o),nowTs,t);
let x=nd({13:'כל שבוע',14:'ראשון',7:new Date(2026,9,1)},new Date(2026,9,20,12).getTime(),'09:00');
ok(x.at.getDay()===0&&x.at.getHours()===9&&x.at.getDate()===25,'שגרה שבועית חוצה מעבר שעון ושומרת שעה',x.at.toString());
x=nd({12:new Date(2026,9,22),13:'כל שבועיים'},new Date(2026,10,10).getTime(),'');ok(x.at.getDate()===19&&x.at.getMonth()===10,'דו-שבועי מהתג"ב',x.at.toString());
x=nd({12:new Date(2026,9,22)},new Date(2026,10,10).getTime(),'');ok(x&&x.at<new Date(2026,10,10),'חד-פעמי שעבר נשאר בעבר');
ok(nd({},now,'')===null,'בלי תג"ב ובלי שגרה = אין מועד');
x=nd({13:'כל שבוע',14:'יום שגוי'},now,'25:99');ok(x&&x.at.getTime()>=now,'קלט לא תקין לא קורס',x&&x.at.toString());
// ---- clean_ / driveId_ / fileType_
ok(A.clean_('=1+1',10)==="'=1+1"&&A.clean_('  a\n\n b ',10)==='a b'&&A.clean_(null,5)===''&&A.clean_('אבגדהוזחטי',3)==='אבג','clean_');
ok(A.driveId_('https://drive.google.com/open?id=1234567890123456789012345')==='1234567890123456789012345'&&A.driveId_('https://x.com')===null,'driveId_');
ok(A.fileType_('https://drive.google.com/open?id=x')==='file'&&A.fileType_('https://docs.google.com/presentation/d/x')==='slides','fileType_');
// ---- weeklyDigest רץ
env=makeEnv(base());A=load(src,env);let dg;env.g.SpreadsheetApp.getUi=()=>({showModalDialog:h=>dg=h.html});A=load(src,env);
try{A.weeklyDigest();ok(dg.indexOf('למש')>-1&&dg.indexOf('<textarea')>-1,'טיוטת עדכון שבועי נבנית')}catch(e){ok(false,'weeklyDigest',e.message)}
console.log('\nשרת: '+pass+' עברו, '+fail+' נכשלו');process.exit(fail?1:0);
