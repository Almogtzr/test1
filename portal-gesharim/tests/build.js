// בונה שני דפים: נתונים אמיתיים מהאתר + מקרי קצה, ו-300 מסמכים לבדיקת עומס
const fs=require('fs');const src=fs.readFileSync(process.argv[2],'utf8');
const PAGE=eval(src.slice(src.indexOf('var PAGE_ = ')+'var PAGE_ = '.length));
const D=JSON.parse(fs.readFileSync(__dirname+'/sample-data.json','utf8'));
const at=(days,h,m)=>{const x=new Date();x.setDate(x.getDate()+days);x.setHours(h,m,0,0);return x};
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const setDue=(l,d,t,rec)=>{l.due=ymd(d);l.dueTs=+d;l.dueT=t;l.rec=rec||''};
D.links.forEach((l,i)=>{l.o=i%3?'':'אלמוג';l.v=(i*7)%13;l.s='';l.x=false;l.due='';l.dueTs=0;l.dueT='';l.rec=''});
D.links[1].s="שנה א'";D.links[2].s="שנה א'";D.links[3].s="שנה ב'";D.links[7].x=true;
setDue(D.links[4],at(1,14,0),'14:00','כל שבוע');setDue(D.links[6],at(0,0,1),'00:01');setDue(D.links[5],at(-1,9,0),'09:00','כל שבועיים'); // שגרה שעברה (צריכה להתגלגל)
// מקרי קצה: כותרות עם HTML, גרשיים, אימוג'י, טקסט ארוך מאוד, קטגוריה בלי הגדרה
const edge=[
 {t:'<img src=x onerror=alert(1)> כותרת זדונית',d:'"><script>alert(2)</script>',c:'קטגוריה חדשה <b>',u:'https://example.com/?a=1&b="x"'},
 {t:'א'.repeat(260),d:'ב '.repeat(300),c:'תוכן ושיעורים',u:'https://example.com/long'},
 {t:'מסמך עם גרשיים מש"קיות ומנה"דים 🎯🎓',d:'',c:'אקזיט טיקט',u:'https://example.com/q'},
 {t:'English Title Mixed עברית 123',d:'desc',c:'תוכן ושיעורים',u:'https://example.com/en',s:'שנה ב\''},
];
edge.forEach((e,i)=>D.links.push(Object.assign({a:i%2?'m':'all',p:false,type:'link',isNew:true,isUpd:false,when:Date.now(),v:0,o:'',s:'',x:false,due:'',dueTs:0,dueT:'',rec:''},e)));
D.cm={'תוכן ושיעורים':{e:'📚',c:''},'אקזיט טיקט':{e:'🎯',c:'#f4cccc'},'זה"ת והכשרות':{e:'🎓',c:'#000000'},'תצפיות ומשוב':{e:'👀',c:'#674ea7'},'נהלים ותפקיד':{e:'',c:'#ffff00'}};
D.msgs.push({date:'28/10',t:'<b>הודעה</b> חשובה',b:'שורה 1\nשורה 2 <i>x</i>',a:'n',lvl:'important',ts:0});
const page=(DD,r)=>PAGE.replace('__DATA__',()=>JSON.stringify(DD).replace(/</g,'\\u003c')).replace('__ROLE__',r).replace(/__TITLE__/g,'פורטל גשרים מדמ"ח');
for(const r of ['m','n','all'])fs.writeFileSync('p_'+r+'.html',page(D,r));
// 300 מסמכים
const B=JSON.parse(JSON.stringify(D));const types=['doc','slides','sheet','form','folder','file','link'];const cats=D.cats.concat(['כללי']);
for(let i=0;i<300;i++)B.links.push({t:'מסמך '+i+' '+['מצגת','מחוון','טופס','סילבוס','תצפית'][i%5]+' מש"קיות',d:'תיאור '+i,c:cats[i%cats.length],a:['all','m','n'][i%3],p:i%40===0,type:types[i%7],u:'https://example.com/b'+i,isNew:i%9===0,isUpd:i%11===0,when:Date.now()-i*1e6,v:i%17,o:i%4?'':'דנה',s:i%3?'':'שנה '+(i%2?'א':'ב'),x:i%50===0,due:'',dueTs:0,dueT:'',rec:''});
fs.writeFileSync('p_big.html',page(B,'all'));
console.log('built',D.links.length,B.links.length);
