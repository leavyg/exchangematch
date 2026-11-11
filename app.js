/* ExchangeMatch student app.
   All destination data comes from data.json (records in the shared register format, see claude/data-research-brief.md).
   This script holds no destination data of its own. */

/* ---------- Reference ---------- */
const REGION = {Austria:"Europe",Belgium:"Europe",Czechia:"Europe",Denmark:"Europe",Finland:"Europe",France:"Europe",Germany:"Europe",Italy:"Europe",Malta:"Europe",Netherlands:"Europe",Poland:"Europe",Romania:"Europe",Spain:"Europe",Sweden:"Europe",Switzerland:"Europe",Turkey:"Europe",
  China:"Asia","Hong Kong":"Asia",India:"Asia",Japan:"Asia",Singapore:"Asia","South Korea":"Asia",Taiwan:"Asia",Thailand:"Asia",
  Australia:"Australia & NZ","New Zealand":"Australia & NZ",
  Canada:"North America",USA:"North America",
  Chile:"Latin America",
  Egypt:"Africa & Middle East",Jordan:"Africa & Middle East",Morocco:"Africa & Middle East","South Africa":"Africa & Middle East"};
const regionOf = c => REGION[c] || "Other";
const ERASMUS = new Set(["Austria","Belgium","Czechia","Denmark","Finland","France","Germany","Italy","Malta","Netherlands","Poland","Romania","Spain","Sweden","Turkey"]);
const NOT_LISTED = "Not on the partner list for this pathway.";
const RENEWAL_WARN = "Agreement being renewed for 2027/28. Places may change.";
const GLOBAL_URL = "https://www.tcd.ie/global/mobility/outbound/where-can-i-go/";
const AGREEMENT = {active:"Active for 2027/28",renewal:"Renewal in progress","not-renewed":"Not renewed",unconfirmed:"Not on the 2027/28 partner list"};

const PROGRAMMES = [["bess","BESS (Business, Economic & Social Studies)",true],["gb","Global & Sustainable Business",false],["bsl","Business & a Language",false],["ppes","PPES",false],["tjh","Trinity Joint Honours",false],["law-bus","Law & Business",false],["csb","Computer Science & Business",false]];
const PATHS = {
  "sh-bus":{label:"Single Honours Business"},
  "sh-econ":{label:"Single Honours Economics"},
  "sh-pol":{label:"Single Honours Political Science"},
  "sh-soc":{label:"Single Honours Sociology"},
  "jh-bus-econ":{label:"Joint Honours Business & Economics"},
  "jh-bus-pol":{label:"Joint Honours Business & Political Science"},
  "jh-bus-soc":{label:"Joint Honours Business & Sociology"},
  "jh-econ-pol":{label:"Joint Honours Economics & Political Science"},
  "jh-econ-soc":{label:"Joint Honours Economics & Sociology"},
  "jh-pol-soc":{label:"Joint Honours Political Science & Sociology"},
  "maj-bus":{label:"Major Business with a minor",minor:true},
  "maj-econ":{label:"Major Economics with a minor"},
  "maj-pol":{label:"Major Political Science with a minor"},
  "maj-soc":{label:"Major Sociology with a minor"}
};
const PATH_GROUPS = [["Single Honours",["sh-bus","sh-econ","sh-pol","sh-soc"]],["Joint Honours",["jh-bus-econ","jh-bus-pol","jh-bus-soc","jh-econ-pol","jh-econ-soc","jh-pol-soc"]],["Major with minor",["maj-bus","maj-econ","maj-pol","maj-soc"]]];
const PATH_SHORT = {"sh-bus":"SH Business","sh-econ":"SH Economics","sh-pol":"SH Politics","sh-soc":"SH Sociology","jh-bus-econ":"JH Business & Economics","jh-bus-pol":"JH Business & Politics","jh-bus-soc":"JH Business & Sociology","jh-econ-pol":"JH Economics & Politics","jh-econ-soc":"JH Economics & Sociology","jh-pol-soc":"JH Politics & Sociology","maj-bus-econ-abroad":"Major Business, Economics minor","maj-bus-pol-abroad":"Major Business, Politics minor","maj-bus-soc-abroad":"Major Business, Sociology minor","maj-bus-tcd":"Major Business, minor at Trinity","maj-econ":"Major Economics","maj-pol":"Major Politics","maj-soc":"Major Sociology"};
const MINORS = ["Economics","Political Science","Sociology"];
const MINOR_KEY = {Economics:"econ","Political Science":"pol",Sociology:"soc"};
const LENGTHS = [["any","Any length"],["fy","Full year"],["mt","Semester 1"],["ht","Semester 2"]];
const TERM = {fy:"Full year",mt:"Sem 1",ht:"Sem 2"};
const TERM_LONG = {fy:"a full year",mt:"Semester 1",ht:"Semester 2"};
const TERM_NAME = {fy:"Full year",mt:"Semester 1",ht:"Semester 2"};
const LANGS = ["French","German","Spanish","Italian","Polish","Russian","Japanese"];
const REGIONS = ["Europe","Asia","Australia & NZ","North America","Latin America","Africa & Middle East"];

/* ---------- State ---------- */
const state = {step:1,started:false,path:"jh-bus-econ",minor:"Economics",fb:"abroad",length:"any",langs:new Set(),regions:new Set(),view:"school",type:"both",sort:"fit"};
try{
  const p=JSON.parse(localStorage.getItem("em-profile")||"null");
  if(p){ if(PATHS[p.path]) state.path=p.path; if(MINORS.includes(p.minor)) state.minor=p.minor; if(p.fb==="tcd"||p.fb==="abroad") state.fb=p.fb;
    if(LENGTHS.some(l=>l[0]===p.length)) state.length=p.length; (p.langs||[]).forEach(l=>LANGS.includes(l)&&state.langs.add(l)); (p.regions||[]).forEach(r=>REGIONS.includes(r)&&state.regions.add(r));
    if(p.view==="school"||p.view==="college") state.view=p.view; if(["both","school","college"].includes(p.type)) state.type=p.type; if(p.started) state.started=true; }
}catch(e){}
function saveProfile(){ try{ localStorage.setItem("em-profile", JSON.stringify({path:state.path,minor:state.minor,fb:state.fb,length:state.length,langs:[...state.langs],regions:[...state.regions],view:state.view,type:state.type,started:state.started})); }catch(e){} }
function dataKey(){
  if(state.path==="maj-bus") return state.fb==="tcd" ? "maj-bus-tcd" : `maj-bus-${MINOR_KEY[state.minor]}-abroad`;
  return state.path;
}
function pathLabel(){
  const P=PATHS[state.path];
  if(state.path==="maj-bus") return `${P.label} (${state.minor}${state.fb==="tcd"?", at Trinity":""})`;
  return P.label;
}

/* ---------- Data ---------- */
let DATA = null, LOAD_ERR = null;
function reqLang(rec){
  const r = rec.language && rec.language.required; if(!r) return null;
  return LANGS.find(l=>r.includes(l)) || null;
}
/* Evaluate one record for the current pathway and filters.
   Returns null when the record isn't on this pathway's list at all (kept out of view entirely). */
function evaluateRec(rec){
  const key = dataKey();
  const p = rec.pathways && rec.pathways[key] || {status:"unknown",terms:[],note:""};
  if(p.status==="not" && p.note===NOT_LISTED) return null;
  const terms = (p.terms && p.terms.length) ? p.terms : rec.terms;
  const why = [];
  if(rec.agreementStatus==="unconfirmed" || rec.agreementStatus==="not-renewed") why.push(AGREEMENT[rec.agreementStatus]);
  else if((rec.sources||[]).length && rec.sources.every(s=>s.stale)) why.push("Not confirmed for 2027/28 (older sources only)");
  if(p.status==="not") why.push((p.note||"Not suitable for your pathway").replace(/\.$/,""));
  if(state.length!=="any" && p.status!=="not" && !terms.includes(state.length)) why.push(`Not offered for ${TERM_LONG[state.length]}`+(rec.terms.includes(state.length)?" on your pathway":""));
  const rl = reqLang(rec); if(rl && !state.langs.has(rl)) why.push(`Requires ${rec.language.required}`);
  if(state.regions.size && !state.regions.has(regionOf(rec.country))) why.push(`Outside your regions (${regionOf(rec.country)})`);
  const warns = [];
  if(p.status==="condition" && p.note) warns.push(p.note);
  (p.conditions||[]).forEach(c=>warns.push(c));
  (rec.warnings||[]).forEach(w=>warns.push(w.stale?`${w.text} (${w.year} info)`:w.text));
  if(rec.agreementStatus==="renewal") warns.push(RENEWAL_WARN);
  const so = rec.signOff||{};
  if(so.status==="flagged") warns.unshift(`Flagged by a coordinator${so.comment?": "+so.comment:"."}`);
  const recs = (rec.records||[]).filter(r=>r.pathway===key);
  return {rec, p, key, status:p.status, terms, why, warns, recs};
}
function matches(view){
  const out = {verified:[],condition:[],unknown:[],nofit:[]};
  if(!DATA) return out;
  DATA.records.filter(r=>r.view===view).forEach(rec=>{
    const ev = evaluateRec(rec); if(!ev) return;
    if(ev.why.length) out.nofit.push(ev);
    else (out[ev.status]||out.unknown).push(ev);
  });
  return out;
}
const hasWarn = ev => ev.warns.length>0 || ev.status==="condition";
const isGreen = ev => ev && ev.status==="verified" && !ev.why.length;

/* ---------- Helpers ---------- */
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const I_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const I_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/></svg>';
const I_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const I_Q = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.1 2-2.1 3.2M12 17v.01"/></svg>';
const I_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
const I_HEART_ON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
const I_GRIP='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
const I_UP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>';
const I_DOWN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
const cityOf = rec => rec.city && rec.city!==rec.country ? `${rec.city}, ${rec.country}` : rec.country;
const placesOf = rec => rec.places!=null ? `<b>${rec.places}</b> places` : rec.placesText ? esc(rec.placesText) : "";

/* ---------- Favourites & ranking (this browser only) ---------- */
const SL = {favs:{school:[],college:[]}, ranks:{school:[],college:[]}, view:"school"};
try{ const p=JSON.parse(localStorage.getItem("em-shortlist-v2")||"null"); if(p&&p.favs&&p.ranks){ SL.favs=p.favs; SL.ranks=p.ranks; } }catch(e){}
function saveSL(){ try{ localStorage.setItem("em-shortlist-v2", JSON.stringify({favs:SL.favs,ranks:SL.ranks})); }catch(e){} }
const isFav = id => SL.favs.school.some(f=>f.id===id) || SL.favs.college.some(f=>f.id===id);
function toggleFav(rec){
  const v=rec.view, list=SL.favs[v], i=list.findIndex(f=>f.id===rec.id);
  if(i>=0){ list.splice(i,1); SL.ranks[v]=SL.ranks[v].filter(x=>x!==rec.id); toast("Removed from shortlist"); }
  else { list.push({id:rec.id,name:rec.name,city:rec.city,country:rec.country,runBy:rec.runBy}); toast("Saved to shortlist"); }
  saveSL(); updateSLCount();
}
function updateSLCount(){ document.getElementById("sl-count").textContent = SL.favs.school.length+SL.favs.college.length; }

/* ---------- Toast ---------- */
let toastT=null;
function toast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.hidden=false; t.classList.remove("out");
  clearTimeout(toastT); toastT=setTimeout(()=>{ t.classList.add("out"); setTimeout(()=>{t.hidden=true;},220); },1800);
}

/* ---------- Cards ---------- */
let LISTS = {};
function card(ev, list, i){
  const rec=ev.rec, ok=isGreen(ev), fav=isFav(rec.id);
  const terms = ["fy","mt","ht"].filter(t=>rec.terms.includes(t)).map(t=>`<span class="chip ${ev.terms.includes(t)?"":"off"}">${TERM[t]}</span>`).join("");
  const right = placesOf(rec) || (ev.recs.length ? `${ev.recs.length} past record${ev.recs.length>1?"s":""}` : "");
  const icon = ok ? `<span class="ic ok" title="Fits your pathway">${I_OK}</span>` : ev.status==="unknown" ? `<span class="ic q" title="Not confirmed for your pathway">${I_Q}</span>` : "";
  const warn = hasWarn(ev);
  return `<div class="cw"><button class="card ${ok?"ok":""}" data-list="${list}" data-i="${i}" aria-label="${esc(rec.name)}, ${esc(cityOf(rec))}${ok?", fits your pathway":""}${warn?", check details":""}">
    <div><div class="c-name">${esc(rec.name)}${warn||icon?`<span class="marks">${warn?`<span class="ic warn" title="Check details">${I_WARN}</span>`:""}${icon}</span>`:""}</div><div class="c-city">${esc(cityOf(rec))}</div></div>
    <div class="c-foot"><span class="terms">${terms}</span><span class="c-places">${right}</span></div>
  </button><button class="heart ${fav?"on":""}" type="button" data-fav="${list}" data-i="${i}" aria-pressed="${fav}" aria-label="${fav?"Remove from":"Save to"} favourites: ${esc(rec.name)}">${fav?I_HEART_ON:I_HEART}</button></div>`;
}
function grid(list, items){ LISTS[list]=items; return `<div class="grid">${items.map((it,i)=>card(it,list,i)).join("")}</div>`; }
function nofitBlock(items){
  if(!items.length) return "";
  LISTS.nofit = items;
  return `<details class="more"><summary>Doesn't fit your choices <span>${items.length}</span></summary>
    <ul class="nofit-list">${items.map((x,i)=>`<li><button data-list="nofit" data-i="${i}"><span>${esc(x.rec.name)}${x.rec.view==="school"&&x.rec.runBy!=="Business School"?` <span style="color:var(--muted)">(${esc(x.rec.runBy)})</span>`:""}</span><span class="why">${esc(x.why[0])}</span></button></li>`).join("")}</ul></details>`;
}
function unknownBlock(items, open){
  if(!items.length) return "";
  return `<details class="more" ${open?"open":""}><summary>Not confirmed for your pathway <span>${items.length}</span></summary>
    <div class="inner">${grid("unk", items)}</div></details>`;
}
const legend = `<div class="legend"><span><i class="sw ok"></i>Fits your pathway</span><span><i class="sw"></i>Not confirmed by Trinity yet</span><span><span class="ic warn">${I_WARN}</span>Check details</span></div>`;
function sorter(a,b){
  const ra=a.rec, rb=b.rec;
  if(state.sort==="places") return (rb.places||0)-(ra.places||0) || ra.name.localeCompare(rb.name);
  if(state.sort==="country") return ra.country.localeCompare(rb.country) || ra.name.localeCompare(rb.name);
  if(state.sort==="fit") return (isGreen(a)?0:1)-(isGreen(b)?0:1) || (a.warns.length?1:0)-(b.warns.length?1:0) || ra.name.localeCompare(rb.name);
  return ra.name.localeCompare(rb.name);
}

/* ---------- Detail drawer ---------- */
let OPEN=null, lastFocus=null;
const I_EXT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/></svg>';
function detail(ev){
  const rec=ev.rec, p=ev.p;
  let status;
  if(ev.why.length) status = `<div class="status bad"><b>${I_X}Doesn't fit your choices</b><span>${esc(ev.why.join(". "))}.</span></div>`;
  else if(ev.status==="verified") status = `<div class="status good"><b>${I_OK}Fits your pathway</b></div>`;
  else if(ev.status==="condition") status = `<div class="status warn"><b>${I_WARN}Not confirmed by Trinity yet</b></div>`;
  else status = `<div class="status neutral"><b>${I_Q}Not confirmed for your pathway</b><span>Research further.</span></div>`;
  const warns = ev.warns.length ? `<div class="blk"><h3>${I_WARN}Check before applying</h3><ul class="notes w">${ev.warns.map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>` : "";
  const so = rec.signOff||{}, when = so.date?`, ${esc(so.date)}`:"";
  const badge = so.status==="verified" ? `<span class="signoff yes">${I_OK}Verified by ${esc(so.role||rec.runBy)}${when}</span>`
    : so.status==="flagged" ? `<span class="signoff flag">${I_WARN}Flagged for review${when}</span>`
    : so.status==="changed" ? `<span class="signoff flag">${I_WARN}Changed since sign-off</span>`
    : `<span class="signoff">Not yet verified by a coordinator</span>`;
  const termTxt = ["fy","mt","ht"].filter(t=>rec.terms.includes(t)).map(t=>ev.terms.includes(t)?TERM_NAME[t]:`<s class="mut">${TERM_NAME[t]}</s>`).join(", ") || "Not listed";
  const L = rec.language||{};
  const lang = L.required ? `Requires ${esc(L.required)}` : L.priority ? `English. Priority to ${esc(L.priority)} speakers` : "English";
  const F = rec.facts||{};
  const facts = [
    ["Places", rec.places!=null?`${rec.places} <span class="mut">semester places</span>`:rec.placesText?esc(rec.placesText):`<span class="mut">Not published</span>`],
    ["Semesters", termTxt],
    F.dates ? ["Partner dates", esc(F.dates)] : null,
    ["Language", lang],
    F.competition ? ["Competition", esc(F.competition)] : null,
    ["Funding", ERASMUS.has(rec.country)?"Erasmus+ grant":"Global Mobility Bursary"],
    rec.agreementStatus!=="active" ? ["Agreement", esc(AGREEMENT[rec.agreementStatus]||rec.agreementStatus)] : null,
    rec.erasmusCode ? ["Erasmus code", esc(rec.erasmusCode)] : null,
  ].filter(Boolean);
  const recs = (rec.records||[]).length ? `<div class="blk"><h3>Past Trinity students</h3><dl class="facts">${rec.records.map(r=>`<dt class="num">${esc(r.year)}</dt><dd>${esc(PATH_SHORT[r.pathway]||r.pathway)}, ${TERM_NAME[r.term]||esc(r.term)}${r.pathway===ev.key?` <span class="tagy">your pathway</span>`:""}</dd>`).join("")}</dl></div>` : "";
  const notes = (rec.notes||[]).length ? `<div class="blk"><h3>Good to know</h3><ul class="notes">${rec.notes.map(n=>`<li><span>${esc(n.text)}${n.stale?` <span class="stale">${esc(n.year)}</span>`:""}</span></li>`).join("")}</ul></div>` : "";
  return `<div><div class="kind"><span class="vtag ${rec.view}">${rec.view==="school"?"School exchange":"College-wide exchange"}</span>${rec.view==="school"?esc(rec.runBy)+(/School$/.test(rec.runBy)?"":" department"):""}</div>
      <h2 id="sh-title">${esc(rec.name)}</h2><div class="sh-city">${esc(cityOf(rec))}</div>${badge}</div>
    ${status}${warns}
    <dl class="facts">${facts.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    ${recs}${notes}
    ${rec.web?`<a class="hostlink" href="${esc(rec.web)}" target="_blank" rel="noopener">Host university page ${I_EXT}</a>`:""}`;
}
const sheet=document.getElementById("sheet"), scrim=document.getElementById("scrim");
function openDetail(list,i){
  const items=LISTS[list]; if(!items||!items[i]) return;
  if(!OPEN) lastFocus=document.activeElement;
  OPEN={list,i,ev:items[i]};
  setFavBtn();
  document.getElementById("sh-body").innerHTML = detail(items[i]);
  document.getElementById("sh-body").scrollTop=0;
  document.getElementById("pos").textContent = `${i+1} of ${items.length}`;
  document.getElementById("prev").disabled = i===0;
  document.getElementById("next").disabled = i===items.length-1;
  sheet.hidden=false; scrim.hidden=false; document.body.classList.add("locked");
  document.getElementById("close").focus({preventScroll:true});
}
function closeDetail(){
  if(!OPEN) return;
  OPEN=null; sheet.hidden=true; scrim.hidden=true; document.body.classList.remove("locked");
  if(lastFocus && document.contains(lastFocus)) lastFocus.focus({preventScroll:true});
}
function setFavBtn(){
  const b=document.getElementById("favbtn"); if(!OPEN) return;
  const on=isFav(OPEN.ev.rec.id);
  b.setAttribute("aria-pressed",on); b.innerHTML=`${on?I_HEART_ON:I_HEART}${on?"Saved":"Save"}`;
}
function rerender(){ if(state.step===2) renderResults(); if(state.step===3) renderShortlist(); }
document.getElementById("favbtn").onclick=()=>{ if(!OPEN) return; toggleFav(OPEN.ev.rec); setFavBtn(); rerender(); };
document.getElementById("close").onclick=closeDetail;
scrim.onclick=closeDetail;
document.getElementById("prev").onclick=()=>OPEN&&openDetail(OPEN.list,OPEN.i-1);
document.getElementById("next").onclick=()=>OPEN&&openDetail(OPEN.list,OPEN.i+1);
document.addEventListener("keydown",e=>{
  if(!OPEN) return;
  if(e.key==="Escape") closeDetail();
  if(e.key==="ArrowLeft" && OPEN.i>0) openDetail(OPEN.list,OPEN.i-1);
  if(e.key==="ArrowRight" && OPEN.i<LISTS[OPEN.list].length-1) openDetail(OPEN.list,OPEN.i+1);
});
document.getElementById("panel").addEventListener("click",e=>{
  const h=e.target.closest("[data-fav]");
  if(h){ const ev=LISTS[h.dataset.fav][+h.dataset.i]; toggleFav(ev.rec); const on=isFav(ev.rec.id);
    h.classList.toggle("on",on); h.setAttribute("aria-pressed",on); h.innerHTML=on?I_HEART_ON:I_HEART;
    h.setAttribute("aria-label",`${on?"Remove from":"Save to"} favourites: ${ev.rec.name}`); return; }
  const b=e.target.closest("[data-list]"); if(b) openDetail(b.dataset.list, +b.dataset.i);
});

/* ---------- Dropdowns ---------- */
const TYPES=[["both","School and College-wide"],["school","School only"],["college","College-wide only"]];
const typeOptions = () => TYPES.map(([v,l])=>`<option value="${v}" ${state.type===v?"selected":""}>${l}</option>`).join("");
const lengthOptions = () => LENGTHS.map(([v,l])=>`<option value="${v}" ${state.length===v?"selected":""}>${l}</option>`).join("");
function pathOptions(){
  return PATH_GROUPS.map(([g,keys])=>`<optgroup label="${g}">${keys.map(k=>`<option value="${k}" ${state.path===k?"selected":""}>${esc(PATHS[k].label)}</option>`).join("")}</optgroup>`).join("");
}
let openMsel=null;
function mselText(name,set){
  const isLang=name.includes("lang");
  if(!set.size) return `<span class="ph">${isLang?"English only":"Any region"}</span>`;
  return esc((isLang?["English",...set]:[...set]).join(", "));
}
function msel(id,name,items,set,labelId,small){
  const open=openMsel===id, isLang=name.includes("lang");
  return `<div class="msel ${small?"sm":""}" data-name="${name}">
    <button type="button" class="msel-btn" id="${id}" aria-haspopup="true" aria-expanded="${open}" aria-labelledby="${labelId} ${id}">${mselText(name,set)}</button>
    <div class="msel-pop" role="group" aria-labelledby="${labelId}" ${open?"":"hidden"}>
      ${isLang?`<label class="fixed"><input type="checkbox" checked disabled>English (always included)</label>`:""}
      ${items.map(v=>{const iid=`${id}-${v}`.replace(/[^a-z0-9-]/gi,"_");return `<label for="${iid}"><input type="checkbox" id="${iid}" name="${name}" value="${esc(v)}" ${set.has(v)?"checked":""}>${esc(v)}</label>`;}).join("")}
      ${set.size?`<button type="button" class="mclear" data-clear="${name}">Clear</button>`:""}
    </div></div>`;
}
function closeMsel(){ if(!openMsel) return; const b=document.getElementById(openMsel); openMsel=null; if(b){ b.setAttribute("aria-expanded","false"); b.nextElementSibling.hidden=true; } }
document.addEventListener("click",e=>{
  const clr=e.target.closest("[data-clear]");
  if(clr){ (clr.dataset.clear.includes("lang")?state.langs:state.regions).clear(); clr.dataset.clear.startsWith("f-")?refresh(null):renderForm(); saveProfile(); return; }
  const btn=e.target.closest(".msel-btn");
  if(btn){ const was=openMsel===btn.id; closeMsel(); if(!was){ openMsel=btn.id; btn.setAttribute("aria-expanded","true"); btn.nextElementSibling.hidden=false; } return; }
  if(openMsel && !e.target.closest(".msel")) closeMsel();
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && openMsel){ const id=openMsel; closeMsel(); const b=document.getElementById(id); if(b) b.focus(); } });

/* ---------- Screen 1: form ---------- */
function optionChip(name,value,label,checked){
  const id=`${name}-${value}`.replace(/[^a-z0-9-]/gi,"_");
  return `<div class="opt"><input type="radio" name="${name}" id="${id}" value="${esc(value)}" ${checked?"checked":""}><label for="${id}">${esc(label)}</label></div>`;
}
function renderForm(){
  document.getElementById("programme").innerHTML = PROGRAMMES.map(([v,l,on])=>`<option value="${v}" ${on?"":"disabled"} ${v==="bess"?"selected":""}>${esc(l)}${on?"":" (soon)"}</option>`).join("");
  document.getElementById("path").innerHTML = pathOptions();
  document.getElementById("minors").innerHTML = MINORS.map(m=>optionChip("minor",m,m,state.minor===m)).join("");
  document.getElementById("fb").innerHTML = optionChip("fb","abroad","Abroad, with Business",state.fb==="abroad") + optionChip("fb","tcd","At Trinity, other semester",state.fb==="tcd");
  document.getElementById("type").innerHTML = typeOptions();
  document.getElementById("length").innerHTML = lengthOptions();
  document.getElementById("langs").innerHTML = msel("ms-lang","lang",LANGS,state.langs,"langs-l",false);
  document.getElementById("regions").innerHTML = msel("ms-region","region",REGIONS,state.regions,"regions-l",false);
  syncForm();
}
function counts(){ return {school:matches("school").verified.length, college:matches("college").verified.length}; }
function syncForm(){
  document.getElementById("minor-box").hidden = state.path!=="maj-bus";
  const ml=document.getElementById("ms-lang"), mr=document.getElementById("ms-region");
  if(ml) ml.innerHTML=mselText("lang",state.langs);
  if(mr) mr.innerHTML=mselText("region",state.regions);
  document.getElementById("side-path").textContent = pathLabel();
  const go=document.getElementById("go");
  if(!DATA){ document.getElementById("c-school").textContent="…"; document.getElementById("c-college").textContent="…"; go.disabled=!!LOAD_ERR; return; }
  go.disabled=false;
  const c=counts();
  document.getElementById("c-school").textContent=c.school;
  document.getElementById("c-college").textContent=c.college;
  const t=state.type;
  document.querySelector("#sentence .s").hidden = t==="college";
  document.querySelector("#sentence .c").hidden = t==="school";
  document.getElementById("s-and").hidden = t!=="both";
}
document.getElementById("form").addEventListener("change",e=>{
  const t=e.target;
  if(t.name==="path") state.path=t.value;
  else if(t.name==="minor") state.minor=t.value;
  else if(t.name==="fb") state.fb=t.value;
  else if(t.name==="length") state.length=t.value;
  else if(t.name==="type") setType(t.value);
  else if(t.name==="lang") t.checked?state.langs.add(t.value):state.langs.delete(t.value);
  else if(t.name==="region") t.checked?state.regions.add(t.value):state.regions.delete(t.value);
  else return;
  saveProfile(); syncForm();
});
document.getElementById("form").addEventListener("submit",e=>{ e.preventDefault(); if(DATA) go(2); });

/* ---------- Screen 1b: results ---------- */
function renderBar(){
  const sel=(id,ctl,cls,label,opts)=>`<div class="field ${cls}"><label for="${id}">${label}</label><div class="select"><select id="${id}" data-ctl="${ctl}">${opts}</select></div></div>`;
  let h = sel("bar-path","path","f-path","Pathway",pathOptions());
  if(state.path==="maj-bus"){
    h += sel("bar-minor","minor","f-sm","Minor",MINORS.map(m=>`<option ${state.minor===m?"selected":""}>${m}</option>`).join(""));
    h += sel("bar-fb","fb","f-sm","Minor modules",`<option value="abroad" ${state.fb==="abroad"?"selected":""}>Abroad</option><option value="tcd" ${state.fb==="tcd"?"selected":""}>At Trinity</option>`);
  }
  h += `<span class="sep" aria-hidden="true"></span>`;
  h += sel("f-type","f-type","f-sm","Exchange type",typeOptions());
  h += sel("f-length","f-length","f-sm","Length",lengthOptions());
  h += `<div class="field f-sm"><span class="flabel" id="f-region-l">Region</span>${msel("ms-f-region","f-region",REGIONS,state.regions,"f-region-l",true)}</div>`;
  h += `<div class="field f-sm"><span class="flabel" id="f-lang-l">Languages</span>${msel("ms-f-lang","f-lang",LANGS,state.langs,"f-lang-l",true)}</div>`;
  const active = state.type!=="both" || state.length!=="any" || state.langs.size || state.regions.size;
  h += `<div class="tb-end">${active?`<button class="linkbtn" id="clear">Clear filters</button>`:""}<button class="ghost" id="edit">Start over</button></div>`;
  document.getElementById("bar").innerHTML=`<div class="toolbar">${h}</div>`;
  document.getElementById("edit").onclick=()=>go(1);
  const c=document.getElementById("clear");
  if(c) c.onclick=()=>{ state.type="both"; state.length="any"; state.langs.clear(); state.regions.clear(); saveProfile(); refresh(null); };
}
function refresh(focusId){
  renderForm(); renderResults();
  if(focusId){ const el=document.getElementById(focusId); if(el) el.focus({preventScroll:true}); }
}
document.getElementById("step2").addEventListener("change",e=>{
  const t=e.target, k=t.dataset.ctl||t.name;
  if(k==="path") state.path=t.value;
  else if(k==="minor") state.minor=t.value;
  else if(k==="fb") state.fb=t.value;
  else if(k==="f-length") state.length=t.value;
  else if(k==="f-type") setType(t.value);
  else if(k==="f-lang") t.checked?state.langs.add(t.value):state.langs.delete(t.value);
  else if(k==="f-region") t.checked?state.regions.add(t.value):state.regions.delete(t.value);
  else return;
  saveProfile(); refresh(t.id);
});
const sortSel = () => `<span class="sort"><label for="sort">Sort</label><select id="sort">
  ${[["fit","Best fit first"],["name","A–Z"],["country","Country"],["places","Most places"]].map(([v,l])=>`<option value="${v}" ${state.sort===v?"selected":""}>${l}</option>`).join("")}</select></span>`;
function renderResults(){
  renderBar(); LISTS={};
  if(state.type!=="both") state.view=state.type;
  const v=state.view, m=matches(v);
  const fits=[...m.verified,...m.condition].sort(sorter);
  const c=counts();
  document.getElementById("n-school").textContent=c.school;
  document.getElementById("n-college").textContent=c.college;
  document.getElementById("tab-school").setAttribute("aria-selected", v==="school");
  document.getElementById("tab-college").setAttribute("aria-selected", v==="college");
  const only = state.type!=="both";
  document.querySelector(".views").classList.toggle("one", only);
  document.getElementById("tab-school").hidden = state.type==="college";
  document.getElementById("tab-college").hidden = state.type==="school";
  let body="";
  if(v==="school"){
    const byOwner={}; fits.forEach(x=>(byOwner[x.rec.runBy]=byOwner[x.rec.runBy]||[]).push(x));
    const owners=Object.keys(byOwner).sort((a,b)=>a==="Business School"?-1:b==="Business School"?1:a.localeCompare(b));
    if(!fits.length) body = `<div class="empty"><h3>${m.unknown.length?"No confirmed School exchanges for this pathway yet":"Nothing fits all your choices"}</h3></div>`;
    else if(owners.length===1) body = grid("s0", byOwner[owners[0]]);
    else body = owners.map((o,k)=>`<div class="section-h">${o==="Business School"?"Business School exchanges":esc(o)+" department exchanges"} <span>${byOwner[o].length}</span></div>${grid("s"+k, byOwner[o])}`).join("");
  } else {
    const parts=[];
    if(m.verified.length) parts.push(`<div class="section-h">On record for your pathway <span>${m.verified.length}</span></div>${grid("c0", m.verified.sort(sorter))}`);
    if(m.condition.length) parts.push(`<div class="section-h">Partner allows it, Trinity hasn't confirmed <span>${m.condition.length}</span></div>${grid("c1", m.condition.sort(sorter))}`);
    if(!parts.length) parts.push(`<div class="empty"><h3>${m.unknown.length?"No confirmed College-wide exchanges for this pathway yet":"Nothing fits all your choices"}</h3></div>`);
    body = parts.join("");
  }
  document.getElementById("panel").innerHTML = `<div class="tools">${legend}${sortSel()}</div>${body}${unknownBlock(m.unknown.sort(sorter), false)}${nofitBlock(m.nofit)}`;
  document.getElementById("sort").onchange=e=>{ state.sort=e.target.value; renderResults(); };
}
function setType(t){ state.type=t; if(t!=="both") state.view=t; }
function setView(v){ state.view=v; saveProfile(); closeDetail(); renderResults(); }
document.getElementById("tab-school").onclick=()=>setView("school");
document.getElementById("tab-college").onclick=()=>setView("college");

/* ---------- Navigation ---------- */
function go(n){
  closeDetail(); closeMsel();
  state.step=n;
  if(n===2){ state.started=true; saveProfile(); }
  [1,2,3].forEach(k=>{ document.getElementById("step"+k).hidden = n!==k; });
  const dest=document.getElementById("nav-dest"), sl=document.getElementById("nav-sl");
  if(n===3){ sl.setAttribute("aria-current","page"); dest.removeAttribute("aria-current"); }
  else { dest.setAttribute("aria-current","page"); sl.removeAttribute("aria-current"); }
  if(n===2) renderResults();
  if(n===3) renderShortlist();
  updateSLCount();
  window.scrollTo({top:0});
}
document.getElementById("nav-dest").onclick=()=>go(state.started&&DATA?2:1);
document.getElementById("nav-sl").onclick=()=>go(3);
document.getElementById("home").onclick=e=>{ e.preventDefault(); go(state.started&&DATA?2:1); };

/* ---------- Screen 2: shortlist ---------- */
function liveIndex(){
  const m={}; if(!DATA) return m;
  DATA.records.forEach(rec=>{ m[rec.id]=evaluateRec(rec); });
  return m;
}
function slStatus(ev){
  if(!ev) return {cls:"bad",txt:"Not on your current pathway's lists"};
  if(ev.why.length) return {cls:"bad",txt:ev.why[0]};
  if(ev.status==="verified") return {cls:"good",txt:"Fits your pathway"};
  if(ev.status==="condition") return {cls:"",txt:"Not yet confirmed by Trinity"};
  return {cls:"",txt:"Not confirmed for your pathway"};
}
let dragKey=null;
let slPicked=false;
function renderShortlist(){
  if(!slPicked && !SL.favs[SL.view].length){ const o=SL.view==="school"?"college":"school"; if(SL.favs[o].length) SL.view=o; }
  const v=SL.view, idx=liveIndex(), favs=SL.favs[v], ranks=SL.ranks[v];
  const items=favs.map(f=>idx[f.id]).filter(Boolean);
  LISTS.fav=items;
  const openAttr = f => { const ev=idx[f.id]; return ev ? `data-open="${items.indexOf(ev)}"` : "disabled"; };
  const sub = f => `${esc(cityOf(f))}${f.runBy&&f.runBy!=="Business School"&&f.runBy!=="Trinity Global"?" · "+esc(f.runBy):""}`;
  const favRows = favs.map(f=>{
    const st=slStatus(idx[f.id]), r=ranks.indexOf(f.id);
    return `<li class="sl-row" draggable="true" data-key="${esc(f.id)}">
      <span class="dot ${st.cls}" title="${esc(st.txt)}"></span>
      <button class="sl-main" ${openAttr(f)}><span class="sl-name">${esc(f.name)}</span><span class="sl-sub">${sub(f)}</span></button>
      ${r>=0?`<span class="tagr">Ranked #${r+1}</span>`:`<button class="mini add" data-act="rank" data-key="${esc(f.id)}" aria-label="Add ${esc(f.name)} to ranking">Rank</button>`}
      <button class="mini" data-act="unfav" data-key="${esc(f.id)}" aria-label="Remove ${esc(f.name)} from favourites" style="color:var(--fav)">${I_HEART_ON}</button>
    </li>`;}).join("");
  const rankRows = ranks.map((k,i)=>{
    const f=favs.find(x=>x.id===k); if(!f) return "";
    const st=slStatus(idx[k]);
    return `<li class="sl-row" draggable="true" data-key="${esc(k)}" data-rank="${i}">
      <span class="grip" aria-hidden="true">${I_GRIP}</span>
      <span class="rk ${v==="school"&&i>=5?"over5":""}">${i+1}</span>
      <span class="dot ${st.cls}" title="${esc(st.txt)}"></span>
      <button class="sl-main" ${openAttr(f)}><span class="sl-name">${esc(f.name)}</span><span class="sl-sub">${sub(f)}</span></button>
      <button class="mini" data-act="up" data-key="${esc(k)}" ${i===0?"disabled":""} aria-label="Move ${esc(f.name)} up">${I_UP}</button>
      <button class="mini" data-act="down" data-key="${esc(k)}" ${i===ranks.length-1?"disabled":""} aria-label="Move ${esc(f.name)} down">${I_DOWN}</button>
      <button class="mini" data-act="unrank" data-key="${esc(k)}" aria-label="Remove ${esc(f.name)} from ranking">${I_X}</button>
    </li>`;}).join("");
  const n={school:SL.favs.school.length, college:SL.favs.college.length};
  document.getElementById("step3").innerHTML = `
    <div class="sl-head"><h1>Shortlist</h1></div>
    <div class="views" role="tablist" aria-label="Application type">
      <button class="view-btn school" role="tab" aria-selected="${v==="school"}" data-act="view" data-v="school"><span class="t"><span>School<span class="xw"> exchanges</span></span> <span class="n">${n.school}</span></span><small>Apply through your School</small></button>
      <button class="view-btn college" role="tab" aria-selected="${v==="college"}" data-act="view" data-v="college"><span class="t"><span>College-wide<span class="xw"> exchanges</span></span> <span class="n">${n.college}</span></span><small>Apply through Trinity Global</small></button>
    </div>
    <div class="sl">
      <section class="sl-col" aria-labelledby="h-fav">
        <h2 id="h-fav">Favourites <span>${favs.length}</span></h2>
        ${favs.length?`<ul class="sl-list" id="fav-list">${favRows}</ul>`:`<div class="sl-empty">Tap ♡ on a university to save it here.</div>`}
      </section>
      <section class="sl-col" aria-labelledby="h-rank">
        <h2 id="h-rank">Ranking <span>${ranks.length}${v==="school"?" / 5":""}</span></h2>
        ${v==="school"&&ranks.length>5?`<p class="sl-note">The School form takes 5 preferences.</p>`:""}
        <ol class="sl-list" id="rank-list">${rankRows||`<li class="sl-empty" style="list-style:none">${favs.length?"Tap Rank on a favourite, then drag to order.":"Nothing ranked yet."}</li>`}</ol>
      </section>
    </div>`;
}
function moveRank(v,k,to){ const r=SL.ranks[v], from=r.indexOf(k); if(from<0) r.splice(to,0,k); else { r.splice(from,1); r.splice(Math.max(0,Math.min(to,r.length)),0,k); } saveSL(); renderShortlist(); }
const step3=document.getElementById("step3");
step3.addEventListener("click",e=>{
  const o=e.target.closest("[data-open]"); if(o){ openDetail("fav",+o.dataset.open); return; }
  const b=e.target.closest("[data-act]"); if(!b) return;
  const v=SL.view, k=b.dataset.key, act=b.dataset.act, r=SL.ranks[v];
  if(act==="view"){ SL.view=b.dataset.v; slPicked=true; return renderShortlist(); }
  if(act==="rank"){ if(!r.includes(k)) r.push(k); }
  if(act==="unrank") SL.ranks[v]=r.filter(x=>x!==k);
  if(act==="up"||act==="down"){ const i=r.indexOf(k), j=act==="up"?i-1:i+1; if(j>=0&&j<r.length){ [r[i],r[j]]=[r[j],r[i]]; } }
  if(act==="unfav"){ SL.favs[v]=SL.favs[v].filter(f=>f.id!==k); SL.ranks[v]=r.filter(x=>x!==k); updateSLCount(); }
  saveSL(); renderShortlist();
  if(act==="up"||act==="down"){ const nb=step3.querySelector(`[data-act="${act}"][data-key="${CSS.escape(k)}"]`); if(nb&&!nb.disabled) nb.focus(); }
});
step3.addEventListener("dragstart",e=>{ const row=e.target.closest(".sl-row[data-key]"); if(!row) return; dragKey=row.dataset.key; row.classList.add("dragging"); try{e.dataTransfer.setData("text/plain",dragKey); e.dataTransfer.effectAllowed="move";}catch(_){} });
step3.addEventListener("dragend",()=>{ dragKey=null; step3.querySelectorAll(".dragging,.over,.drop-end").forEach(x=>x.classList.remove("dragging","over","drop-end")); });
step3.addEventListener("dragover",e=>{
  const list=e.target.closest("#rank-list"); if(!list||!dragKey) return;
  e.preventDefault();
  step3.querySelectorAll(".over,.drop-end").forEach(x=>x.classList.remove("over","drop-end"));
  const row=e.target.closest(".sl-row[data-rank]"); if(row) row.classList.add("over"); else list.classList.add("drop-end");
});
step3.addEventListener("drop",e=>{
  const list=e.target.closest("#rank-list"); if(!list||!dragKey) return;
  e.preventDefault();
  const row=e.target.closest(".sl-row[data-rank]");
  if(row && row.dataset.key===dragKey) return;
  const r=SL.ranks[SL.view], from=r.indexOf(dragKey);
  let to = row ? +row.dataset.rank : r.length;
  if(from>=0 && from<to) to-=1;
  moveRank(SL.view,dragKey,to);
});

/* ---------- Boot ---------- */
renderForm();
updateSLCount();
fetch("data.json").then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(d=>{
  if(!d || !Array.isArray(d.records)) throw new Error("bad data");
  DATA=d;
  document.getElementById("data-status").hidden=true;
  syncForm();
  if(state.started) go(2);
}).catch(()=>{
  LOAD_ERR=true;
  const s=document.getElementById("data-status"); s.hidden=false; s.textContent="Destinations didn't load. Refresh the page to try again.";
  syncForm();
});
