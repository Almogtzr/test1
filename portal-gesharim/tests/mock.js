// גיליון מדומה של Apps Script, מספיק כדי להריץ את קוד השרת
const chain=new Proxy(function(){},{get:(t,k)=>k==='build'?()=>({}):k==='getConditionalFormatRules'?()=>[]:()=>chain,apply:()=>chain});
function makeEnv(init){
  const sheets={},bgs={};
  for(const k in init)sheets[k]=init[k].map(r=>r.slice());
  function rng(name,r,c,nr,nc){nr=nr||1;nc=nc||1;const d=sheets[name];
    const self={
      getRow:()=>r,getColumn:()=>c,getNumRows:()=>nr,getLastRow:()=>r+nr-1,getLastColumn:()=>c+nc-1,getSheet:()=>sheet(name),
      getValues(){const o=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++){let x=((d[r-1+i]||[])[c-1+j]);if(x===undefined||x===null)x='';if(typeof x==='string'&&x[0]==="'")x=x.slice(1);row.push(x)}o.push(row)}return o},
      getDisplayValues(){return this.getValues().map(row=>row.map(x=>x instanceof Date?String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0'):String(x)))},
      getBackgrounds(){const o=[];for(let i=0;i<nr;i++){o.push([(bgs[name+':'+(r+i)+':'+c])||'#ffffff'])}return o},
      getValue(){return this.getValues()[0][0]},
      setValues(v){if(v.length!==nr||v[0].length!==nc)throw new Error('setValues size mismatch '+v.length+'x'+v[0].length+' vs '+nr+'x'+nc);v.forEach((row,i)=>row.forEach((x,j)=>{d[r-1+i]=d[r-1+i]||[];d[r-1+i][c-1+j]=x}));return px},
      setValue(x){d[r-1]=d[r-1]||[];d[r-1][c-1]=x;return px}};
    let px;
    px=new Proxy(self,{get:(t,k,rc)=>k in t?t[k]:(()=>rc)});return px}
  function sheet(name){return new Proxy({getName:()=>name,getLastRow:()=>{const d=sheets[name];let n=d.length;while(n>0&&(!d[n-1]||d[n-1].every(x=>x===''||x==null)))n--;return n},
    getRange:(a,b,c,dd)=>typeof a==='string'?rng(name,2,1,1,1):rng(name,a,b,c,dd),clear(){sheets[name].length=0}},{get:(t,k)=>k in t?t[k]:(()=>chain)})}
  const ss={getSheetByName:n=>sheets[n]?sheet(n):null,insertSheet:n=>{sheets[n]=[];return sheet(n)},getUrl:()=>'SHEETURL',setActiveSheet(){},getName:()=>'פורטל',getId:()=>'SSID'};
  const cache={},props={},mails=[],calls={drive:0,cacheGetAll:0};
  const g={
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss,getActive:()=>ss,newConditionalFormatRule:()=>chain,newDataValidation:()=>chain,getUi:()=>{throw new Error('no ui')}},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,getAll:ks=>{calls.cacheGetAll++;const o={};ks.forEach(k=>{if(k in cache)o[k]=cache[k]});return o},
      putAll:(o)=>{for(const k in o){if(o[k].length>100000)throw new Error('cache value too big');cache[k]=o[k]}},put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>props[k]=v})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    Utilities:{formatDate:(d,z,f)=>{const p=n=>String(n).padStart(2,'0');return f.replace('yyyy',d.getFullYear()).replace('MM',p(d.getMonth()+1)).replace('dd',p(d.getDate())).replace('HH',p(d.getHours())).replace('mm',p(d.getMinutes()))}},
    Session:{getScriptTimeZone:()=>'Asia/Jerusalem',getEffectiveUser:()=>({getEmail:()=>'me@x'})},
    MailApp:{sendEmail:o=>mails.push(o),getRemainingDailyQuota:()=>100},
    DriveApp:{Access:{ANYONE:'A',ANYONE_WITH_LINK:'AWL',DOMAIN:'D',DOMAIN_WITH_LINK:'DWL',PRIVATE:'P'},Permission:{VIEW:'V',EDIT:'E',COMMENT:'C'},
      getFileById:id=>{calls.drive++;if(/^BAD/.test(id))throw new Error('no');return{getName:()=>'שם מהדרייב '+id.slice(0,4),getLastUpdated:()=>new Date(Date.now()-864e5),getSharingAccess:()=>'P',setSharing(){}}},
      getFolderById:id=>{calls.drive++;return{getName:()=>'תיקייה',getLastUpdated:()=>new Date()}}},
    HtmlService:{createHtmlOutput:h=>({html:h,setTitle(){return this},addMetaTag(n){if(['viewport','apple-mobile-web-app-capable','mobile-web-app-capable','google-site-verification'].indexOf(n)<0)throw new Error('meta not allowed: '+n);return this},setFaviconUrl(){return this},setXFrameOptionsMode(){return this},setWidth(){return this},setHeight(){return this}}),XFrameOptionsMode:{ALLOWALL:1}},
    ScriptApp:{getService:()=>({getUrl:()=>'https://script.google.com/x/exec'})},
    MimeType:{SHORTCUT:'shortcut'}
  };
  return {g,sheets,bgs,cache,props,mails,calls,sheet};
}
function load(src,env){
  const names=Object.keys(env.g);
  const fn=new Function(...names,src+'\n;return {getData_,portalData_,doGet,onEditInstalled,logClick,submitDoc,reportIssue,nextDue_,clean_,driveId_,fileType_,clearPortalCache_,approveRequest_,weeklyDigest,getSettings_};');
  return fn(...names.map(n=>env.g[n]));
}
module.exports={makeEnv,load};
