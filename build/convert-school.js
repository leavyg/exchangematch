const fs=require('fs');
const el=()=>new Proxy({},{get:(t,k)=>k==='classList'?{add(){},remove(){},toggle(){}}:['addEventListener','focus','setAttribute','removeAttribute'].includes(k)?()=>{}:k==='querySelectorAll'?()=>[]:t[k],set:(t,k,v)=>(t[k]=v,true)});
global.document={getElementById:()=>el(),addEventListener(){},body:el(),contains:()=>false};
global.window={scrollTo(){}};global.localStorage={getItem:()=>null,setItem(){}};
const out = eval(fs.readFileSync('oldapp.js','utf8')+`
;(function(){
evaluate = x=>x;   // capture raw matches
const TODAY="2026-11-10";
const SRCMETA={
 tbsJH:{date:"2026-10-27",academicYear:"2027-28"}, tbsFB:{date:"2026-10-27",academicYear:"2027-28"},
 sssp:{date:"2026-10-28",academicYear:"2027-28"}};
const recs={};
const recId=(dept,d)=>{ dept=dept.replace(" department",""); return dept==="Business School" ? d.id+"-tbs" : d.id.replace(/^[eps]-/,"")+"-"+({Economics:"econ","Political Science":"pol",Sociology:"soc"}[dept])+"-sssp"; };
function base(d,dept,srcKeys){
  const lang = {required: d.req? (d.req.level==="some"?"Some "+d.req.lang:d.req.level+" "+d.req.lang):null, priority:d.prio||null, note:d.langNote||null};
  const warnings=[...(d.warn||[])];
  if(d.country==="France"&&dept==="Business School") warnings.push(FRANCE_WARN);
  return {id:recId(dept,d),name:d.name,city:d.city,country:d.country,view:"school",runBy:dept,
    erasmusCode:(d.code&&d.code!=="Non-EU")?d.code:null,places:d.places??null,placesText:d.placesText||null,
    terms:[...d.t],agreementStatus:d.renewal?"renewal":"active",language:lang,pathways:{},records:[],
    warnings:warnings.map(t=>({text:t,stale:false,year:"2027-28",sourceRef:0})),
    notes:[...(d.priority?[d.priority]:[]),...(d.notes||[])].map(t=>({text:t,stale:false,year:"2027-28",sourceRef:0})),
    web:d.web||null,sources:[],newestSourceDate:null,changesEachYear:["places","semester availability","module notes"],
    signOff:{status:"unverified",byId:null,role:null,date:null,comment:null},
    history:[{date:TODAY,by:"ExchangeMatch app",change:"Converted from the demo's School data (TBS lists 27 Oct 2026, SSSP destinations 28 Oct 2026)."}],
    lastChecked:TODAY};
}
function addSource(r,srcKey){
  const s=SRC[srcKey]; let i=r.sources.findIndex(x=>x.url===s.url);
  if(i<0){ r.sources.push({url:s.url,title:s.label,date:SRCMETA[srcKey].date,academicYear:SRCMETA[srcKey].academicYear,location:null,stale:false}); i=r.sources.length-1; }
  r.newestSourceDate = r.sources.map(x=>x.date).sort().pop();
  return i;
}
function ensure(d,dept,srcKey){
  const id=recId(dept,d);
  if(!recs[id]) recs[id]=base(d,dept);
  const r=recs[id];
  d.t.forEach(t=>{ if(!r.terms.includes(t)) r.terms.push(t); });
  if(d.renewal) r.agreementStatus="renewal";
  (d.warn||[]).forEach(t=>{ if(!r.warnings.some(w=>w.text===t)) r.warnings.push({text:t,stale:false,year:"2027-28",sourceRef:0}); });
  (d.notes||[]).forEach(t=>{ if(!r.notes.some(w=>w.text===t)) r.notes.push({text:t,stale:false,year:"2027-28",sourceRef:0}); });
  if(!r.web && d.web) r.web=d.web;
  return [r, addSource(r,srcKey)];
}
// register every school destination first
TBS_JH.forEach(d=>ensure(d,"Business School","tbsJH"));
TBS_FB.forEach(d=>ensure(d,"Business School","tbsFB"));
SSSP.forEach(d=>ensure(d,d.dept,"sssp"));
const order=["Economics","Political Science","Sociology"];
const KEYS=[
 ["sh-bus",{path:"sh-bus"}],["sh-econ",{path:"sh-econ"}],["sh-pol",{path:"sh-pol"}],["sh-soc",{path:"sh-soc"}],
 ["jh-bus-econ",{path:"jh-bus-econ"}],["jh-bus-pol",{path:"jh-bus-pol"}],["jh-bus-soc",{path:"jh-bus-soc"}],
 ["jh-econ-pol",{path:"jh-econ-pol"}],["jh-econ-soc",{path:"jh-econ-soc"}],["jh-pol-soc",{path:"jh-pol-soc"}],
 ["maj-bus-econ-abroad",{path:"maj-bus",minor:"Economics",fb:"abroad"}],["maj-bus-pol-abroad",{path:"maj-bus",minor:"Political Science",fb:"abroad"}],
 ["maj-bus-soc-abroad",{path:"maj-bus",minor:"Sociology",fb:"abroad"}],["maj-bus-tcd",{path:"maj-bus",minor:"MINOR",fb:"tcd"}],
 ["maj-econ",null],["maj-pol",null],["maj-soc",null]];
const NOT_LISTED="Not on the partner list for this pathway.";
for(const [key,cfg] of KEYS){
  const hit={};
  if(cfg){
    state.path=cfg.path; state.minor=cfg.minor||"Economics"; state.fb=cfg.fb||"abroad";
    state.length="any"; state.langs=new Set(); state.regions=new Set();
    schoolMatches().forEach(it=>{
      const srcKey = it.src===SRC.tbsJH?"tbsJH":it.src===SRC.tbsFB?"tbsFB":"sssp";
      const id=recId(it.dept,it.d); const r=recs[id]; const sref=addSource(r,srcKey);
      let status, note="", conds=[];
      if(it.block){ status="not"; note=it.block; }
      else if(it.fit.lvl==="warn"){ status="condition"; note=it.fit.text; }
      else if(it.fit.lvl==="cond"){ status="verified"; note="Trinity lists this destination for your pathway."; conds.push(it.fit.text); }
      else { status="verified"; note=it.fit.text; }
      conds.push(...(it.extraWarn||[]));
      const fix=t=>key==="maj-bus-tcd"?t.replace(/your MINOR minor/g,"your minor").replace(/the MINOR exchange coordinator/g,"your minor's exchange coordinator"):t;
      hit[id]={status,terms:status==="not"?[]:[...it.terms],note:fix(note),conditions:conds.map(fix),sourceRef:sref};
    });
  }
  Object.values(recs).forEach(r=>{
    r.pathways[key]= hit[r.id] || (cfg? {status:"not",terms:[],note:NOT_LISTED,sourceRef:null} : {status:"unknown",terms:[],note:"School exchanges for this pathway haven't been mapped yet.",sourceRef:null});
  });
}
return Object.values(recs);
})()`);
fs.writeFileSync('school.json',JSON.stringify(out,null,1));
const c={}; out.forEach(r=>Object.entries(r.pathways).forEach(([k,p])=>{c[k]=c[k]||{};c[k][p.status]=(c[k][p.status]||0)+1;}));
console.log(out.length,'school records'); console.log(c);
