/* ===== STATE ===== */
const S = {
  userType:'varsity', style:'regular', colorScheme:'regular',
  logoSrc:null, artSrc:null, artBackSrc:null, rimManual:false,
  useCustomTc:false, useCustomTcs:false,
  logoAspect:1, artAspect:1, artBackAspect:1
};

/* ===== UI UTILS ===== */
function toggleSec(id){ document.getElementById(id).classList.toggle('open') }

function switchSubTab(panelId, btn){
  const sb = btn.closest('.sb-body');
  sb.querySelectorAll('.sub-tab').forEach(t=>t.classList.remove('active'));
  sb.querySelectorAll('.sub-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

function setPill(gId, el){
  document.querySelectorAll('#'+gId+' .pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  if(gId==='pg-user') S.userType=el.dataset.val;
  else if(gId==='pg-style') S.style=el.dataset.val;
  else if(gId==='pg-color') S.colorScheme=el.dataset.val;
  updateUI();
}

function syncC(cId,tId){ document.getElementById(tId).value=document.getElementById(cId).value }
function syncCT(tId,cId){
  const v=document.getElementById(tId).value;
  if(/^#[0-9a-fA-F]{6}$/.test(v)) document.getElementById(cId).value=v;
}
function onC2Change(){
  if(!S.rimManual){
    const v=document.getElementById('f-c2').value;
    document.getElementById('f-rim').value=v;
    document.getElementById('f-rimt').value=v;
  }
}
function resetRim(){
  S.rimManual=false;
  const v=document.getElementById('f-c2').value;
  document.getElementById('f-rim').value=v;
  document.getElementById('f-rimt').value=v;
  render();
}
function resetTc(){
  S.useCustomTc=false;
  render();
}
function resetTcs(){
  S.useCustomTcs=false;
  render();
}

function loadImg(inp,target){
  const f=inp.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    const src=e.target.result;
    const img=new Image();
    img.onload=()=>{
      const asp=img.width/img.height;
      if(target==='logo'){S.logoSrc=src;S.logoAspect=asp;updUZ('uz-logo',src)}
      if(target==='art'){S.artSrc=src;S.artAspect=asp;updUZ('uz-art',src)}
      if(target==='artback'){S.artBackSrc=src;S.artBackAspect=asp;updUZ('uz-artback',src)}
      render();
    };
    img.src=src;
  };
  r.readAsDataURL(f);
}
function updUZ(id,src){
  const z=document.getElementById(id);
  z.classList.add('has-image');
  z.querySelector('.uz-icon').innerHTML=`<img class="uz-preview" src="${src}">`;
  z.querySelector('.uz-text').textContent='Click to change';
}

function updateUI(skipBuild = false){
  const sty=S.style, type=S.userType;
  document.getElementById('art-field').style.display=sty==='noart'?'none':'';
  document.getElementById('artback-field').style.display=sty==='full'?'':'none';
  document.getElementById('overlay-field').style.display=sty==='full'?'':'none';
  document.getElementById('brightness-field').style.display=sty==='full'?'':'none';
  document.getElementById('rim-field').style.display=['jv','coach','volunteer'].includes(type)?'':'none';
  if (!skipBuild) { buildFrontFields(); buildBackFields(); }
  render();
}

function switchTab(tab,btn){
  document.querySelectorAll('.preview-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const fw=document.getElementById('front-wrapper'), bw=document.getElementById('back-wrapper');
  if(tab==='front'){fw.style.display='';bw.style.display='none'}
  else if(tab==='back'){fw.style.display='none';bw.style.display=''}
  else{fw.style.display='';bw.style.display=''}
}

/* ===== DRAG-SORT ===== */
let _dragSrc=null;
function initDrag(el){
  el.setAttribute('draggable','true');
  el.addEventListener('dragstart',e=>{_dragSrc=el;el.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
  el.addEventListener('dragend',()=>{el.classList.remove('dragging');render()});
  el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over')});
  el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
  el.addEventListener('drop',e=>{
    e.preventDefault();el.classList.remove('drag-over');
    if(_dragSrc&&_dragSrc!==el){
      const p=el.parentNode, items=[...p.children];
      const si=items.indexOf(_dragSrc), ti=items.indexOf(el);
      p.insertBefore(_dragSrc, si<ti?el.nextSibling:el);
      render();
    }
  });
}

/* ===== TAG / SORTABLE ITEM SYSTEM ===== */
const TD={}; // tagData keyed by base
let _tid=0;

function addTag(base, hasSub){
  const inp=document.getElementById(base+'-input');
  const val=inp.value.trim(); if(!val) return;
  if(!TD[base]) TD[base]=[];
  const sub=hasSub?(document.getElementById(base+'-sub-input')?.value?.trim()||''):'';
  const id='t'+(++_tid);
  TD[base].push({id,label:val,sub});
  renderSortItem(base,{id,label:val,sub});
  inp.value='';
  if(hasSub&&document.getElementById(base+'-sub-input')) document.getElementById(base+'-sub-input').value='';
  render();
}

function renderSortItem(base, item){
  const list=document.getElementById(base+'-tags'); if(!list) return;
  const d=document.createElement('div');
  d.className='sort-item'; d.dataset.iid=item.id;
  d.innerHTML=`<span class="drag-handle" title="Drag to reorder"><ion-icon name="reorder-two-outline"></ion-icon></span>
    <div class="sort-item-main">
      <div class="sort-item-label">${esc(item.label)}</div>
      ${item.sub?`<div class="sort-item-sub">${esc(item.sub)}</div>`:''}
    </div>
    <span class="sort-del" onclick="removeTag('${base}','${item.id}',this)"><ion-icon name="close-outline"></ion-icon></span>`;
  initDrag(d);
  list.appendChild(d);
}

function removeTag(base,id,el){
  if(TD[base]) TD[base]=TD[base].filter(t=>t.id!==id);
  el.closest('.sort-item').remove(); render();
}

function getTags(base){
  const list=document.getElementById(base+'-tags');
  if(!list||!TD[base]) return [];
  const domIds=[...list.querySelectorAll('.sort-item')].map(e=>e.dataset.iid);
  return domIds.map(id=>TD[base].find(t=>t.id===id)).filter(Boolean);
}

/* ===== FIELD BUILDERS ===== */
function fv(cont,id){ const e=document.getElementById(cont+'-'+id); return e?e.value.trim():'' }

function sortableBlock(cont,fid,label,ph,sph){
  const base=`${cont}-${fid}`;
  return `<div class="field">
    <label class="fl">${label}</label>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;gap:6px">
        <input type="text" id="${base}-input" placeholder="${ph}" style="flex:1;font-size:12px"
          onkeydown="if(event.key==='Enter'){event.preventDefault();addTag('${base}',${!!sph})}">
        <button class="btn btn-secondary btn-sm" onclick="addTag('${base}',${!!sph})">+</button>
      </div>
      ${sph?`<input type="text" id="${base}-sub-input" placeholder="${sph}" style="font-size:11px;color:var(--color-text-secondary)">`:''} 
    </div>
    <div class="sortable-list" id="${base}-tags" style="margin-top:6px"></div>
  </div>`;
}

const PF={ // PRESET FRONT
  varsity:{
    main:[
      {id:'grade',label:'Grade',ph:'11th'},
      {id:'gpa',label:'GPA / Academic Focus',ph:'4.2 · STEM'},
      {id:'motto',label:'Personal Motto',ph:'"The universe is under no obligation…"',area:true},
    ],
    sort:[{id:'events',label:'Events',ph:'Event name',sph:'Placement (e.g. 1st — optional)'}],
    adv:[{id:'tourn_name',label:'Featured Tournament',ph:'State Invitational 2025'}],
  },
  jv:{
    main:[
      {id:'grade',label:'Grade',ph:'9th'},
      {id:'goal',label:'Season Goal',ph:'Make varsity & medal in Wright Stuff'},
      {id:'motto',label:'Personal Motto',ph:'"Science is not a body of knowledge…"',area:true},
    ],
    sort:[{id:'events',label:'Events',ph:'Event name',sph:'Placement (optional)'}],
  },
  coach:{
    main:[
      {id:'title',label:'Title / Role',ph:'Head Coach'},
      {id:'yearscoaching',label:'Years Coaching',ph:'8'},
      {id:'school',label:'School Subject / Career',ph:'Physics Teacher'},
      {id:'accolade',label:'Top Accolade',ph:'State Champions 2023'},
    ],
    sort:[{id:'eventscoached',label:'Events Coached',ph:'Event name'}],
  },
  es:{
    main:[
      {id:'event',label:'Event Supervised',ph:'Astronomy'},
      {id:'org',label:'Affiliated Org / School',ph:'State University'},
      {id:'expertise',label:'Area of Expertise',ph:'Stellar Astrophysics'},
      {id:'pronoun',label:'Pronouns',ph:'she/her'},
    ],
  },
  volunteer:{
    main:[
      {id:'role',label:'Volunteer Role',ph:'Proctor / Timekeeper'},
      {id:'affil',label:'Affiliation',ph:"Alumni — Lincoln High '19"},
      {id:'pronoun',label:'Pronouns',ph:'they/them'},
    ],
  },
};

const PB={ // PRESET BACK
  varsity:{
    main:[
      {id:'bio',label:'About Me',ph:'Passionate about astrophysics and robotics. Science Olympiad changed my life!',area:true},
      {id:'home_invite',label:'Home Invitational',ph:'Lincoln Classic 2025'},
      {id:'fun_fact',label:'Fun Fact',ph:'I have read every Carl Sagan book.'},
      {id:'contact',label:'Contact / Social',ph:'@alex_scioly'},
    ],
    sort:[{id:'extra_events',label:'Additional Events',ph:'Event name'}],
  },
  jv:{
    main:[
      {id:'bio',label:'About Me',ph:'Freshman discovering the joy of competitive science!',area:true},
      {id:'fun_fact',label:'Fun Fact',ph:'I taught myself to code in 6th grade.'},
      {id:'contact',label:'Contact / Social',ph:'@jv_scioly'},
    ],
  },
  coach:{
    main:[
      {id:'bio',label:'Coach Bio',ph:'8-year head coach. Former competitor. State champion x2.',area:true},
      {id:'contact',label:'Contact Email',ph:'coach@lincoln.edu'},
      {id:'philosophy',label:'Coaching Philosophy',ph:'Every student has a medal in them.',area:true},
    ],
    sort:[{id:'tournaments',label:'Tournaments Attended',ph:'Tournament name'}],
  },
  es:{
    main:[
      {id:'bio',label:'Bio / Background',ph:'PhD Candidate in Astrophysics. 3rd year supervising Astronomy.',area:true},
      {id:'contact',label:'Contact / Email',ph:'supervisor@university.edu'},
      {id:'fun_fact',label:'Fun Fact',ph:'I discovered a minor planet in 2019.'},
    ],
    sort:[{id:'tournaments',label:'Tournaments Supervised',ph:'Tournament name'}],
  },
  volunteer:{
    main:[
      {id:'bio',label:'Bio',ph:"Lincoln High alum '19. Volunteering 5 years.",area:true},
      {id:'contact',label:'Contact / Social',ph:'@volunteer_name'},
      {id:'fun_fact',label:'Fun Fact',ph:'I can recite pi to 50 digits.'},
    ],
    sort:[{id:'tournaments',label:'Tournaments Volunteered',ph:'Tournament name'}],
  },
};

function buildSectionHTML(cont, preset){
  const p=preset[S.userType]||{};
  const mains=p.main||[], sorts=p.sort||[], advs=p.adv||[];
  const hasAdv=advs.length>0;
  let h='';
  if(hasAdv){
    h+=`<div class="sub-tabs">
      <button class="sub-tab active" onclick="switchSubTab('${cont}-mpanel',this)">Main</button>
      <button class="sub-tab" onclick="switchSubTab('${cont}-apanel',this)">Advanced</button>
    </div><div class="sub-panel active" id="${cont}-mpanel">`;
  }
  mains.forEach(f=>{
    if(f.area) h+=`<div class="field"><label class="fl">${f.label}</label><textarea id="${cont}-${f.id}" placeholder="${f.ph}" oninput="render()" rows="3"></textarea></div>`;
    else h+=`<div class="field"><label class="fl">${f.label}</label><input type="text" id="${cont}-${f.id}" placeholder="${f.ph}" oninput="render()"></div>`;
  });
  sorts.forEach(f=>{ h+=sortableBlock(cont,f.id,f.label,f.ph,f.sph); });
  if(hasAdv){
    h+=`</div><div class="sub-panel" id="${cont}-apanel">`;
    advs.forEach(f=>{
      if(f.area) h+=`<div class="field"><label class="fl">${f.label}</label><textarea id="${cont}-${f.id}" placeholder="${f.ph}" oninput="render()" rows="2"></textarea></div>`;
      else h+=`<div class="field"><label class="fl">${f.label}</label><input type="text" id="${cont}-${f.id}" placeholder="${f.ph}" oninput="render()"></div>`;
    });
    h+=`</div>`;
  }
  return h;
}

function buildFrontFields(){ document.getElementById('front-fields').innerHTML=buildSectionHTML('front-fields',PF) }
function buildBackFields(){ document.getElementById('back-fields').innerHTML=buildSectionHTML('back-fields',PB) }

/* ===== CUSTOM FIELDS ===== */
let _cfc=0;
function addCustomField(){
  const id='cf'+(++_cfc);
  const d=document.createElement('div');
  d.id=id; d.className='sort-item';
  d.style.cssText='flex-direction:column;align-items:stretch;gap:6px;padding:10px';
  d.innerHTML=`<div style="display:flex;gap:6px;align-items:center">
    <span class="drag-handle" title="Drag to reorder"><ion-icon name="reorder-two-outline"></ion-icon></span>
    <input type="text" placeholder="Label" oninput="render()" class="cf-label"
      style="font-size:11px;flex:0 0 85px;min-width:0;padding:5px 8px">
    <div class="side-toggle" style="margin-left:auto">
      <span class="sto active" onclick="setSide(this,'F')">F</span>
      <span class="sto" onclick="setSide(this,'B')">B</span>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('${id}').remove();render()" title="Remove Field"
      style="padding:4px 8px;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center"><ion-icon name="close-outline"></ion-icon></button>
  </div>
  <input type="text" placeholder="Value" oninput="render()" class="cf-val" style="font-size:12px">`;
  initDrag(d);
  document.getElementById('custom-list').appendChild(d);
}
function setSide(el, side){
  const tog=el.closest('.side-toggle');
  tog.querySelectorAll('.sto').forEach(o=>o.classList.remove('active'));
  el.classList.add('active');
  render();
}
function getCustomFields(side){
  return [...document.querySelectorAll('#custom-list>div')].filter(d=>{
    const a=d.querySelector('.sto.active');
    return a&&a.textContent.trim()===side;
  }).map(d=>({
    label:d.querySelector('.cf-label')?.value||'',
    val:d.querySelector('.cf-val')?.value||''
  })).filter(f=>f.label||f.val);
}

/* ===== COLOR UTILS ===== */
function hexRgb(h){
  if(!h||h.length<7) return{r:128,g:128,b:128};
  return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};
}
function lum(h){ const{r,g,b}=hexRgb(h); return(0.299*r+0.587*g+0.114*b)/255 }
function tc(h,rainbow){ // text color contrasting with bg
  if(rainbow) return'rgba(255,255,255,0.93)';
  return lum(h)>0.45?'rgba(0,0,0,0.88)':'rgba(255,255,255,0.93)';
}
function tcs(h,rainbow){ // subdued text
  if(rainbow) return'rgba(255,255,255,0.55)';
  return lum(h)>0.45?'rgba(0,0,0,0.45)':'rgba(255,255,255,0.5)';
}
function darken(h,pct){ const{r,g,b}=hexRgb(h),f=1-pct/100; return`rgb(${~~(r*f)},${~~(g*f)},${~~(b*f)})` }
function ha(h,a){ const{r,g,b}=hexRgb(h); return`rgba(${r},${g},${b},${a})` }
function divC(h,rainbow){
  if(rainbow) return'rgba(255,255,255,0.12)';
  return lum(h)>0.45?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.12)';
}

function getCardBg(scheme,c1,c2,back){
  if(scheme==='rainbow') return back
    ?'linear-gradient(200deg,#ce93d8,#7c4dff,#4fc3f7,#69f0ae,#ffd740,#f06292)'
    :'linear-gradient(145deg,#f06292,#ffd740,#69f0ae,#4fc3f7,#ce93d8,#7c4dff)';
  if(scheme==='mono') return`linear-gradient(145deg,${c1},${darken(c1,30)})`;
  return`linear-gradient(145deg,${darken(c1,20)} 0%,${c1} 50%,${darken(c2,30)} 100%)`;
}

function getPat(scheme,c1){
  const lc=lum(c1)>0.45?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.13)';
  if(scheme==='regular') return`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><defs><pattern id="p" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><polygon points="15,2 28,8 28,22 15,28 2,22 2,8" fill="none" stroke="${lc}" stroke-width="0.8"/><circle cx="15" cy="15" r="2" fill="${lc}"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  if(scheme==='mono') return`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><defs><pattern id="p" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="20" y2="20" stroke="${lc}" stroke-width="0.7"/><line x1="20" y1="0" x2="0" y2="20" stroke="${lc}" stroke-width="0.7"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  if(scheme==='rainbow') return`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><pattern id="p" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="10" height="40" fill="rgba(255,100,100,0.14)"/><rect x="10" y="0" width="10" height="40" fill="rgba(255,215,64,0.14)"/><rect x="20" y="0" width="10" height="40" fill="rgba(105,240,174,0.14)"/><rect x="30" y="0" width="10" height="40" fill="rgba(79,195,247,0.14)"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
  return'';
}

/* ===== IMAGE HELPER ===== */
function genImg(src, asp, cW, cH, mode='cover', posTop=true) {
  if(!src) return '';
  asp = asp || 1;
  const ac = cW / cH;
  let w, h, l, t;
  if(mode==='cover'){
    if(asp>ac){ w=(asp/ac)*100; h=100; l=-(w-100)/2; t=0; }
    else{ w=100; h=(ac/asp)*100; l=0; t=posTop?0:-(h-100)/2; }
  }else{
    if(asp>ac){ w=100; h=(ac/asp)*100; l=0; t=(100-h)/2; }
    else{ w=(asp/ac)*100; h=100; l=(100-w)/2; t=0; }
  }
  return `<img src="${src}" style="position:absolute;width:${w}%;height:${h}%;left:${l}%;top:${t}%;border:none;outline:none;max-width:none;max-height:none;pointer-events:none;object-fit:fill;">`;
}

/* ===== HTML ESCAPE ===== */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function escNL(s){ return esc(s).replace(/\n/g,'<br>') }

/* ===== CARD STAT HELPERS ===== */
function cstat(label,val,_tc,_tcs){
  if(!val) return'';
  return`<div class="cstat"><span class="cstat-lbl" style="color:${_tcs}">${label}</span><span class="cstat-val" style="color:${_tc}">${esc(val)}</span></div>`;
}
function cstatTags(label,tags,_tc,_tcs){
  if(!tags||!tags.length) return'';
  const chips=tags.map(t=>`<span style="background:rgba(128,128,128,.18);border-radius:4px;padding:0 5px;margin:1px 2px;display:inline-block;font-size:9.5px">${esc(t.label)}${t.sub?`<span style="opacity:.55;margin-left:3px">${esc(t.sub)}</span>`:''}</span>`).join('');
  return`<div class="cstat" style="flex-wrap:wrap;align-items:flex-start"><span class="cstat-lbl" style="color:${_tcs};margin-top:2px">${label}</span><span class="cstat-val wrap" style="color:${_tc}">${chips}</span></div>`;
}

/* ===== RENDER FRONT ===== */
function renderFront(){
  const c1=document.getElementById('f-c1')?.value||'#1a3a6b';
  const c2=document.getElementById('f-c2')?.value||'#d4a017';
  const rim=document.getElementById('f-rim')?.value||c2;
  const bright=parseInt(document.getElementById('f-bright')?.value||85);
  const ovC=document.getElementById('f-overlay')?.value||'#000000';
  const ovOp=parseInt(document.getElementById('f-overlay-op')?.value||55);
  const scheme=S.colorScheme, type=S.userType, sty=S.style;
  const isRB=scheme==='rainbow';
  const name=document.getElementById('f-name')?.value||'';
  const org=document.getElementById('f-org')?.value||'';
  const season=document.getElementById('f-season')?.value||'';
  const {logoSrc,artSrc}=S;

  const showRim=['jv','coach','volunteer'].includes(type);
  const bg=getCardBg(scheme,c1,c2,false);
  const pat=getPat(scheme,c1);
  const patUrl=pat?`url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(pat)}")`:' none';
  const hasBg=sty==='full'&&artSrc;
  const _tc=S.useCustomTc?document.getElementById('f-tc').value:(hasBg?'rgba(255,255,255,0.93)':tc(c1,isRB));
  const _tcs=S.useCustomTcs?document.getElementById('f-tcs').value:(hasBg?'rgba(255,255,255,0.55)':tcs(c1,isRB));

  const typeMap={varsity:'✦ Varsity Competitor',jv:'JV Competitor',coach:'+ Head Coach',es:'Event Supervisor',volunteer:'Volunteer'};

  let stats='';
  if(type==='varsity'||type==='jv'){
    stats+=cstat('Grade',fv('front-fields','grade'),_tc,_tcs);
    if(type==='varsity') stats+=cstat('Academic',fv('front-fields','gpa'),_tc,_tcs);
    const evts=getTags('front-fields-events');
    if(evts.length) stats+=cstatTags('Events',evts,_tc,_tcs);
    if(type==='varsity'){
      const tn=fv('front-fields','tourn_name');
      if(tn) stats+=cstat('Tournament',tn,_tc,_tcs);
    }
    if(type==='jv'){
      const g=fv('front-fields','goal');
      if(g) stats+=`<div class="cstat"><span class="cstat-lbl" style="color:${_tcs}">Goal</span><span class="cstat-val wrap" style="color:${_tc}">${esc(g)}</span></div>`;
    }
    const m=fv('front-fields','motto');
    if(m) stats+=`<div class="cquote" style="color:${_tcs};border-left-color:${_tcs}">${escNL(m)}</div>`;
  } else if(type==='coach'){
    stats+=cstat('Title',fv('front-fields','title'),_tc,_tcs);
    stats+=cstat('Years',fv('front-fields','yearscoaching'),_tc,_tcs);
    const evts=getTags('front-fields-eventscoached');
    if(evts.length) stats+=cstatTags('Events',evts,_tc,_tcs);
    stats+=cstat('Career',fv('front-fields','school'),_tc,_tcs);
    stats+=cstat('Accolade',fv('front-fields','accolade'),_tc,_tcs);
  } else if(type==='es'){
    stats+=cstat('Event',fv('front-fields','event'),_tc,_tcs);
    stats+=cstat('Org',fv('front-fields','org'),_tc,_tcs);
    stats+=cstat('Expertise',fv('front-fields','expertise'),_tc,_tcs);
    stats+=cstat('Pronouns',fv('front-fields','pronoun'),_tc,_tcs);
  } else if(type==='volunteer'){
    stats+=cstat('Role',fv('front-fields','role'),_tc,_tcs);
    stats+=cstat('Affil.',fv('front-fields','affil'),_tc,_tcs);
    stats+=cstat('Pronouns',fv('front-fields','pronoun'),_tc,_tcs);
  }
  getCustomFields('F').forEach(f=>{ stats+=cstat(f.label,f.val,_tc,_tcs) });

  let artHtml='';
  if(sty==='regular'){
    artHtml=artSrc
      ?`<div class="card-art-frame"><div style="position:relative;width:100%;height:100%;overflow:hidden">${genImg(artSrc, S.artAspect, 228, 130, 'cover', true)}</div></div>`
      :`<div class="card-art-frame"><div class="card-art-ph" style="color:${ha(c1,.25)}"><span style="font-size:20px;font-family:var(--font-u)">[PHOTO]</span></div></div>`;
  }

  let bgHtml=hasBg
    ?`<div class="card-bg" style="filter:brightness(${bright}%)"><div class="card-artwork"><div style="position:relative;width:100%;height:100%;overflow:hidden">${genImg(artSrc, S.artAspect, 250, 350, 'cover', true)}</div></div><div class="card-artwork-overlay" style="background:${bg};opacity:.2"></div></div>`
    :`<div class="card-bg"><div class="card-bg-solid" style="background:${bg}"></div><div style="position:absolute;inset:0;background-image:${patUrl};background-size:60px 60px;opacity:.18"></div></div>`;

  const ovStyle=hasBg?`background:${ha(ovC,ovOp/100)};backdrop-filter:blur(1px)`:'';

  return`${bgHtml}
    ${showRim?`<div class="card-rim" style="border-color:${rim}"></div>`:''}
    <div class="card-content">
      ${season?`<div style="position:absolute;top:8px;right:10px;z-index:12;font-family:var(--font-m);font-size:8px;letter-spacing:1px;color:${_tcs}">${esc(season)}</div>`:''}
      <div class="card-header${hasBg?' has-bg':''}">
        ${logoSrc?`<div class="card-logo" style="position:relative;overflow:hidden;background-color:rgba(255,255,255,.1)">${genImg(logoSrc, S.logoAspect, 38, 38, 'contain')}</div>`:`<div class="card-logo-ph" style="color:${_tcs}">ORG</div>`}
        <div class="card-name-block">
          <div class="card-name" style="color:${_tc}">${esc(name)||'YOUR NAME'}</div>
          <div class="card-org" style="color:${_tcs}">${esc(org)||'School / Organization'}</div>
        </div>
      </div>
      ${artHtml}
      <div class="card-type-badge" style="color:${_tc};border-color:${ha(c1,.25)}">${typeMap[type]||''}</div>
      <div class="card-body${hasBg?' has-bg':''}" style="${hasBg?ovStyle:''}">
        ${stats}
      </div>
    </div>`;
}

/* ===== RENDER BACK ===== */
function renderBack(){
  const c1=document.getElementById('f-c1')?.value||'#1a3a6b';
  const c2=document.getElementById('f-c2')?.value||'#d4a017';
  const rim=document.getElementById('f-rim')?.value||c2;
  const bright=parseInt(document.getElementById('f-bright')?.value||85);
  const ovC=document.getElementById('f-overlay')?.value||'#000000';
  const ovOp=parseInt(document.getElementById('f-overlay-op')?.value||55);
  const scheme=S.colorScheme, type=S.userType, sty=S.style;
  const isRB=scheme==='rainbow';
  const name=document.getElementById('f-name')?.value||'';
  const org=document.getElementById('f-org')?.value||'';
  const url=document.getElementById('f-url')?.value||'';
  const {logoSrc,artSrc,artBackSrc}=S;

  const showRim=['jv','coach','volunteer'].includes(type);
  const bg=getCardBg(scheme,c1,c2,true);
  const pat=getPat(scheme,c1);
  const patUrl=pat?`url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(pat)}")`:' none';
  const backArt=sty==='full'?(artBackSrc||artSrc):null;
  const backAsp=sty==='full'?(artBackSrc?S.artBackAspect:S.artAspect):1;
  const hasBg=!!backArt;
  const _tc=S.useCustomTc?document.getElementById('f-tc').value:(hasBg?'rgba(255,255,255,0.92)':tc(c1,isRB));
  const _tcs=S.useCustomTcs?document.getElementById('f-tcs').value:(hasBg?'rgba(255,255,255,0.5)':tcs(c1,isRB));
  const dc=hasBg?'rgba(255,255,255,0.1)':divC(c1,isRB);

  let bgHtml=hasBg
    ?`<div class="card-bg" style="filter:brightness(${bright}%)"><div class="card-artwork"><div style="position:relative;width:100%;height:100%;overflow:hidden">${genImg(backArt, backAsp, 250, 350, 'cover', true)}</div></div><div class="card-artwork-overlay" style="background:${bg};opacity:.25"></div></div>`
    :`<div class="card-bg"><div class="card-bg-solid" style="background:${bg}"></div><div style="position:absolute;inset:0;background-image:${patUrl};background-size:60px 60px;opacity:.18"></div></div>`;

  const ovStyle=hasBg?`background:${ha(ovC,ovOp/100)};backdrop-filter:blur(1px)`:'';

  let bio='',list='',extra='';

  if(type==='varsity'||type==='jv'){
    const b=fv('back-fields','bio');
    if(b) bio=`<div class="cquote" style="font-size:9px;color:${_tc};border-left-color:${_tcs}">${escNL(b)}</div>`;
    const evts=getTags('back-fields-extra_events');
    if(evts.length){
      list+=`<div class="cb-stitle" style="color:${_tcs}">More Events</div>`;
      list+=`<div style="display:flex;flex-wrap:wrap;gap:3px">${evts.map(t=>`<span style="background:rgba(128,128,128,.18);border-radius:4px;padding:1px 6px;font-size:9px;color:${_tc};font-family:var(--font-u)">${esc(t.label)}</span>`).join('')}</div>`;
    }
    const hi=fv('back-fields','home_invite'),ff=fv('back-fields','fun_fact'),ct=fv('back-fields','contact');
    if(hi) extra+=cstat('Home Invite',hi,_tc,_tcs);
    if(ff) extra+=`<div class="cflavor" style="color:${_tcs};border-top-color:${dc}">✦ ${esc(ff)}</div>`;
    if(ct) extra+=cstat('Contact',ct,_tc,_tcs);
  } else if(type==='coach'){
    const b=fv('back-fields','bio');
    if(b) bio=`<div class="cquote" style="font-size:9px;color:${_tc};border-left-color:${_tcs}">${escNL(b)}</div>`;
    const ts=getTags('back-fields-tournaments');
    if(ts.length){
      list+=`<div class="cb-stitle" style="color:${_tcs}">Tournaments</div>`;
      ts.forEach(t=>{list+=`<div class="ct-item" style="color:${_tc}"><div class="ct-dot" style="background:${_tc}"></div>${esc(t.label)}</div>`});
    }
    const ct=fv('back-fields','contact'),ph=fv('back-fields','philosophy');
    if(ct) extra+=cstat('Contact',ct,_tc,_tcs);
    if(ph) extra+=`<div class="cflavor" style="color:${_tcs};border-top-color:${dc}">"${escNL(ph)}"</div>`;
  } else if(type==='es'){
    const b=fv('back-fields','bio');
    if(b) bio=`<div class="cquote" style="font-size:9px;color:${_tc};border-left-color:${_tcs}">${escNL(b)}</div>`;
    const ts=getTags('back-fields-tournaments');
    if(ts.length){
      list+=`<div class="cb-stitle" style="color:${_tcs}">Supervised At</div>`;
      ts.forEach(t=>{list+=`<div class="ct-item" style="color:${_tc}"><div class="ct-dot" style="background:${_tc}"></div>${esc(t.label)}</div>`});
    }
    const ct=fv('back-fields','contact'),ff=fv('back-fields','fun_fact');
    if(ct) extra+=cstat('Contact',ct,_tc,_tcs);
    if(ff) extra+=`<div class="cflavor" style="color:${_tcs};border-top-color:${dc}">✦ ${esc(ff)}</div>`;
  } else if(type==='volunteer'){
    const b=fv('back-fields','bio');
    if(b) bio=`<div class="cquote" style="font-size:9px;color:${_tc};border-left-color:${_tcs}">${escNL(b)}</div>`;
    const ts=getTags('back-fields-tournaments');
    if(ts.length){
      list+=`<div class="cb-stitle" style="color:${_tcs}">Volunteered At</div>`;
      ts.forEach(t=>{list+=`<div class="ct-item" style="color:${_tc}"><div class="ct-dot" style="background:${_tc}"></div>${esc(t.label)}</div>`});
    }
    const ct=fv('back-fields','contact'),ff=fv('back-fields','fun_fact');
    if(ct) extra+=cstat('Contact',ct,_tc,_tcs);
    if(ff) extra+=`<div class="cflavor" style="color:${_tcs};border-top-color:${dc}">✦ ${esc(ff)}</div>`;
  }
  getCustomFields('B').forEach(f=>{ extra+=cstat(f.label,f.val,_tc,_tcs) });

  return`${bgHtml}
    ${showRim?`<div class="card-rim" style="border-color:${rim}"></div>`:''}
    <div class="card-content" style="${hasBg?ovStyle:''}">
      <div class="cb-header" style="border-bottom-color:${dc}${hasBg?';background:rgba(0,0,0,.5);backdrop-filter:blur(3px)':''}">
        <div>
          <div class="cb-title" style="color:${_tc}">${esc(name)||'YOUR NAME'}</div>
          <div class="cb-sub" style="color:${_tcs}">${esc(org)}</div>
        </div>
        ${logoSrc?`<div style="width:30px;height:30px;border-radius:5px;position:relative;overflow:hidden;background-color:rgba(128,128,128,.1)">${genImg(logoSrc, S.logoAspect, 30, 30, 'contain')}</div>` :''}
      </div>
      <div class="cb-body">${bio}${list}${extra}</div>
      <div class="cb-footer" style="border-top-color:${dc}">
        <div class="cb-url" style="color:${_tcs}">${esc(url)||'team-website.org'}</div>
        <div class="card-qr"><div class="card-qr-inner">
      <svg width="100%" height="100%" viewBox="0 0 22.224998 22.225" version="1.1" id="svg1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><defs id="defs1" /><g id="layer1" transform="translate(-574.14582,-576.79169)"><g style="fill:${_tc};stroke:none" id="g6-8" transform="matrix(0.264583,0,0,0.264583,569.91251,572.55834)"><path d="M 95.6,100 H 92.4 C 92.1791,100 92,99.8209 92,99.6 V 96 h 3.6 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -12,0 H 80.4 C 80.1791,100 80,99.8209 80,99.6 V 96.4 C 80,96.1791 79.8209,96 79.6,96 H 76 v -8 h 3.6 C 79.8209,88 80,87.8209 80,87.6 V 80.4 C 80,80.1791 80.1791,80 80.4,80 h 3.2 C 83.8209,80 84,79.8209 84,79.6 V 72.4 C 84,72.1791 83.8209,72 83.6,72 H 80.4 C 80.1791,72 80,71.8209 80,71.6 V 68.4 C 80,68.1791 80.1791,68 80.4,68 h 11.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 0.1791,0.4 0.4,0.4 H 96 v 3.6 C 96,75.8209 95.8209,76 95.6,76 H 92.4 C 92.1791,76 92,76.1791 92,76.4 V 80 H 88.4 C 88.1791,80 88,80.1791 88,80.4 V 84 H 84.4 C 84.1791,84 84,84.1791 84,84.4 v 7.2 c 0,0.2209 0.1791,0.4 0.4,0.4 H 92 v 4 H 84.4 C 84.1791,96 84,96.1791 84,96.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -8,0 H 72.4 C 72.1791,100 72,99.8209 72,99.6 V 96 h 4 v 3.6 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -8,0 H 64.4 C 64.1791,100 64,99.8209 64,99.6 V 96 h 4 v 3.6 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -8,0 H 56.4 C 56.1791,100 56,99.8209 56,99.6 V 96.4 C 56,96.1791 56.1791,96 56.4,96 H 60 v 3.6 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -8,0 H 48.4 C 48.1791,100 48,99.8209 48,99.6 V 92.4 C 48,92.1791 48.1791,92 48.4,92 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 7.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -8,0 H 16.4 C 16.1791,100 16,99.8209 16,99.6 V 72.4 C 16,72.1791 16.1791,72 16.4,72 h 27.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 27.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m 28,-4 H 68 v -4 h 3.6 c 0.2209,0 0.4,0.1791 0.4,0.4 V 96 Z m -8,0 H 60 V 92.4 C 60,92.1791 60.1791,92 60.4,92 H 64 v 4 z M 40,95.6 V 76.4 C 40,76.1791 39.8209,76 39.6,76 H 20.4 C 20.1791,76 20,76.1791 20,76.4 v 19.2 c 0,0.2209 0.1791,0.4 0.4,0.4 H 39.6 C 39.8209,96 40,95.8209 40,95.6 Z M 99.6,92 H 92 v -4 h 7.6 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -32,0 H 64 V 88.4 C 64,88.1791 64.1791,88 64.4,88 H 68 v 4 z m -32,0 H 24.4 C 24.1791,92 24,91.8209 24,91.6 V 80.4 C 24,80.1791 24.1791,80 24.4,80 h 11.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 11.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m 56,-4 H 88.4 C 88.1791,88 88,87.8209 88,87.6 V 84 h 4 v 4 z m -16,0 H 68 v -4 h 3.6 C 71.8209,84 72,83.8209 72,83.6 V 76.4 C 72,76.1791 71.8209,76 71.6,76 H 68.4 C 68.1791,76 68,76.1791 68,76.4 V 84 H 64.4 C 64.1791,84 64,83.8209 64,83.6 V 80.4 C 64,80.1791 63.8209,80 63.6,80 H 60.4 C 60.1791,80 60,79.8209 60,79.6 V 76.4 C 60,76.1791 59.8209,76 59.6,76 H 56.4 C 56.1791,76 56,76.1791 56,76.4 v 7.2 c 0,0.2209 0.1791,0.4 0.4,0.4 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 C 60,87.8209 59.8209,88 59.6,88 H 52.4 C 52.1791,88 52,87.8209 52,87.6 V 80.4 C 52,80.1791 51.8209,80 51.6,80 H 48.4 C 48.1791,80 48,79.8209 48,79.6 V 68.4 C 48,68.1791 48.1791,68 48.4,68 H 59.6 C 59.8209,68 60,67.8209 60,67.6 V 64 h 7.6 C 67.8209,64 68,63.8209 68,63.6 V 60 h 4 v 11.6 c 0,0.2209 0.1791,0.4 0.4,0.4 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 88 Z m 24,-4 H 92 v -4 h 7.6 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m 0,-12 H 96 V 68.4 C 96,68.1791 96.1791,68 96.4,68 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z M 68,71.6 V 68.4 C 68,68.1791 67.8209,68 67.6,68 H 64.4 C 64.1791,68 64,68.1791 64,68.4 v 3.2 c 0,0.2209 0.1791,0.4 0.4,0.4 h 3.2 C 67.8209,72 68,71.8209 68,71.6 Z M 43.6,68 H 24.4 C 24.1791,68 24,67.8209 24,67.6 V 64.4 C 24,64.1791 24.1791,64 24.4,64 h 3.2 C 27.8209,64 28,63.8209 28,63.6 V 60 h 4 v 3.6 c 0,0.2209 0.1791,0.4 0.4,0.4 h 11.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -24,0 H 16.4 C 16.1791,68 16,67.8209 16,67.6 V 60.4 C 16,60.1791 16.1791,60 16.4,60 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 7.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m 76,-4 H 76.4 C 76.1791,64 76,63.8209 76,63.6 V 60 h 7.6 C 83.8209,60 84,59.8209 84,59.6 V 56.4 C 84,56.1791 84.1791,56 84.4,56 H 88 v 3.6 c 0,0.2209 0.1791,0.4 0.4,0.4 h 3.2 C 91.8209,60 92,59.8209 92,59.6 V 56.4 C 92,56.1791 91.8209,56 91.6,56 H 88 v -4 h 7.6 c 0.2209,0 0.4,0.1791 0.4,0.4 v 11.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -36,0 H 56.4 C 56.1791,64 56,63.8209 56,63.6 V 60.4 C 56,60.1791 55.8209,60 55.6,60 H 48.4 C 48.1791,60 48,59.8209 48,59.6 V 56.4 C 48,56.1791 47.8209,56 47.6,56 H 44 V 52.4 C 44,52.1791 43.8209,52 43.6,52 H 36.4 C 36.1791,52 36,51.8209 36,51.6 V 48.4 C 36,48.1791 36.1791,48 36.4,48 h 11.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 c 0,0.2209 0.1791,0.4 0.4,0.4 H 52 v 3.6 c 0,0.2209 0.1791,0.4 0.4,0.4 h 15.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 60 H 60.4 C 60.1791,60 60,60.1791 60,60.4 V 64 Z m 16,-4 H 72 V 52.4 C 72,52.1791 72.1791,52 72.4,52 H 80 v 3.6 C 80,55.8209 79.8209,56 79.6,56 H 76.4 C 76.1791,56 76,56.1791 76,56.4 V 60 Z m -32,0 H 32 v -4 h 12 v 3.6 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -16,0 H 24.4 C 24.1791,60 24,59.8209 24,59.6 V 56.4 C 24,56.1791 24.1791,56 24.4,56 H 28 v 4 z m 4,-4 H 28 V 52.4 C 28,52.1791 28.1791,52 28.4,52 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 56 Z m -12,0 H 16.4 C 16.1791,56 16,55.8209 16,55.6 V 48.4 C 16,48.1791 16.1791,48 16.4,48 h 7.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 C 24,51.8209 23.8209,52 23.6,52 H 20.4 C 20.1791,52 20,52.1791 20,52.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m 68,-4 H 80 V 48.4 C 80,48.1791 80.1791,48 80.4,48 h 7.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 52 Z m -20,0 H 60.4 C 60.1791,52 60,51.8209 60,51.6 V 48 h 3.6 C 63.8209,48 64,47.8209 64,47.6 V 32 h 3.6 c 0.2209,0 0.4,0.1791 0.4,0.4 v 19.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -12,0 H 52 v -8 h 3.6 C 55.8209,44 56,43.8209 56,43.6 V 32.4 C 56,32.1791 55.8209,32 55.6,32 H 52.4 C 52.1791,32 52,32.1791 52,32.4 v 3.2 C 52,35.8209 51.8209,36 51.6,36 H 48.4 C 48.1791,36 48,35.8209 48,35.6 V 28.4 C 48,28.1791 48.1791,28 48.4,28 h 3.2 C 51.8209,28 52,27.8209 52,27.6 V 16.4 C 52,16.1791 52.1791,16 52.4,16 h 15.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 3.2 C 68,19.8209 67.8209,20 67.6,20 H 64.4 C 64.1791,20 64,20.1791 64,20.4 v 3.2 C 64,23.8209 63.8209,24 63.6,24 H 60.4 C 60.1791,24 60,23.8209 60,23.6 V 20.4 C 60,20.1791 59.8209,20 59.6,20 H 56.4 C 56.1791,20 56,20.1791 56,20.4 v 7.2 c 0,0.2209 0.1791,0.4 0.4,0.4 h 7.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 32 H 60.4 C 60.1791,32 60,32.1791 60,32.4 V 48 H 56.4 C 56.1791,48 56,48.1791 56,48.4 v 3.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m 44,-8 H 72.4 C 72.1791,44 72,43.8209 72,43.6 V 16.4 C 72,16.1791 72.1791,16 72.4,16 h 27.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 27.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -48,0 H 48.4 C 48.1791,44 48,43.8209 48,43.6 V 40.4 C 48,40.1791 48.1791,40 48.4,40 h 3.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 44 Z m -8,0 H 16.4 C 16.1791,44 16,43.8209 16,43.6 V 16.4 C 16,16.1791 16.1791,16 16.4,16 h 27.2 c 0.2209,0 0.4,0.1791 0.4,0.4 V 43.6 C 44,43.8209 43.8209,44 43.6,44 Z M 96,39.6 V 20.4 C 96,20.1791 95.8209,20 95.6,20 H 76.4 C 76.1791,20 76,20.1791 76,20.4 v 19.2 c 0,0.2209 0.1791,0.4 0.4,0.4 h 19.2 c 0.2209,0 0.4,-0.1791 0.4,-0.4 z m -56,0 V 20.4 C 40,20.1791 39.8209,20 39.6,20 H 20.4 C 20.1791,20 20,20.1791 20,20.4 v 19.2 c 0,0.2209 0.1791,0.4 0.4,0.4 H 39.6 C 39.8209,40 40,39.8209 40,39.6 Z M 91.6,36 H 80.4 C 80.1791,36 80,35.8209 80,35.6 V 24.4 C 80,24.1791 80.1791,24 80.4,24 h 11.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 11.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z m -56,0 H 24.4 C 24.1791,36 24,35.8209 24,35.6 V 24.4 C 24,24.1791 24.1791,24 24.4,24 h 11.2 c 0.2209,0 0.4,0.1791 0.4,0.4 v 11.2 c 0,0.2209 -0.1791,0.4 -0.4,0.4 z" id="path6-2" /></g></g></svg>
    </div></div>
      </div>
    </div>`;
}

function render(){
  document.getElementById('card-front').innerHTML=renderFront();
  document.getElementById('card-back').innerHTML=renderBack();
}

/* ===== EXPORT ===== */
async function toCanvas(el){
  const scale = parseInt(document.getElementById('export-scale')?.value || 12);
  return await html2canvas(el,{scale:scale,useCORS:true,allowTaint:true,backgroundColor:null,logging:false});
}
async function exportPNG(side){
  const el=document.getElementById(side==='front'?'card-front':'card-back');
  const c=await toCanvas(el); const a=document.createElement('a');
  a.href=c.toDataURL('image/png');
  a.download=`${(document.getElementById('f-name')?.value||'card').replace(/\s+/g,'-').toLowerCase()}-${side}.png`;
  a.click();
}
async function exportJPG(side){
  const el=document.getElementById(side==='front'?'card-front':'card-back');
  const c=await toCanvas(el); const a=document.createElement('a');
  a.href=c.toDataURL('image/jpeg',0.93);
  a.download=`${(document.getElementById('f-name')?.value||'card').replace(/\s+/g,'-').toLowerCase()}-${side}.jpg`;
  a.click();
}
function showPDFModal(){ 
  const btn = document.querySelector('.preview-tabs button:last-child');
  if (btn) switchTab('both', btn);
  document.getElementById('pdf-modal').style.display='flex';
}
function closePDFModal(){ document.getElementById('pdf-modal').style.display='none' }

async function rotated(el, angle = Math.PI/2){
  const src=await toCanvas(el);
  const out=document.createElement('canvas');
  out.width=src.height; out.height=src.width;
  const ctx=out.getContext('2d');
  ctx.translate(src.height/2,src.width/2);
  ctx.rotate(angle);
  ctx.drawImage(src,-src.width/2,-src.height/2);
  return out;
}

async function exportPDF(){
  closePDFModal();
  const copies=Math.min(8,Math.max(1,parseInt(document.getElementById('pdf-copies').value)||1));
  const side=document.querySelector('#pg-pdf-side .pill.active')?.dataset.val||'both';
  const{jsPDF}=window.jspdf;
  const pw=8.5*72, ph=11*72; // 612 x 792 pt
  // Cards rotated 90 degrees: 3.5" wide x 2.5" tall on page
  const cw=3.5*72, ch=2.5*72; // 252 x 180 pt
  const sx=18, sy=18; // 1/4 inch margins
  const gx=72, gy=12;
  const cols=2, rows=4;
  const n=Math.min(copies, 8);
  const pos=[];
  for(let i=0;i<n;i++){
    const c=i%cols,r=Math.floor(i/cols);
    pos.push({x:sx+c*(cw+gx),y:sy+r*(ch+gy)});
  }
  const pdf=new jsPDF({orientation:'portrait',unit:'pt',format:[pw,ph]});
  if(side==='front'||side==='both'){
    const fc=await rotated(document.getElementById('card-front'), Math.PI/2);
    const fd=fc.toDataURL('image/png');
    pos.forEach(p=>pdf.addImage(fd,'PNG',p.x,p.y,cw,ch));
  }
  if(side==='back'||side==='both'){
    if(side==='both') pdf.addPage();
    const bc=await rotated(document.getElementById('card-back'), -Math.PI/2);
    const bd=bc.toDataURL('image/png');
    // Long-edge duplex: mirror X position and use upside-down rotation
    pos.forEach((p)=>{
      const mx=pw-p.x-cw;
      pdf.addImage(bd,'PNG',mx,p.y,cw,ch);
    });
  }
  const nm=(document.getElementById('f-name')?.value||'card').replace(/\s+/g,'-').toLowerCase();
  pdf.save(`${nm}-trading-card.pdf`);
}

/* ===== JSON EXPORT / IMPORT ===== */
function exportJSON(){
  const data = { state: S, td: TD, inputs: {}, custom: [] };
  // Collect normal inputs
  document.querySelectorAll('input:not([type="file"]), textarea, select').forEach(el=>{
    if(el.id && !el.closest('#custom-list') && !el.closest('.sort-list')){
      data.inputs[el.id] = el.type==='checkbox'?el.checked:el.value;
    }
  });
  // Custom fields
  const cList = document.getElementById('custom-list');
  if (cList) {
    data.custom = [...cList.children].map(d => ({
      label: d.querySelector('.cf-label')?.value||'',
      val: d.querySelector('.cf-val')?.value||'',
      side: d.querySelector('.sto.active')?.textContent.trim() || 'F'
    }));
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `${data.inputs['f-name']?.replace(/\s+/g,'-').toLowerCase()||'card'}-data.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.state) {
        Object.assign(S, data.state);
        ['pg-user', 'pg-style', 'pg-color'].forEach(gId => {
          const val = gId === 'pg-user' ? S.userType : (gId === 'pg-style' ? S.style : S.colorScheme);
          document.querySelectorAll(`#${gId} .pill`).forEach(p => {
             if(p.dataset.val === val) p.classList.add('active');
             else p.classList.remove('active');
          });
        });
      }
      
      // Build the interface before setting values
      buildFrontFields();
      buildBackFields();

      if (data.inputs) {
        for (const [id, val] of Object.entries(data.inputs)) {
          const el = document.getElementById(id);
          if (el) {
             if (el.type === 'checkbox') el.checked = val;
             else el.value = val;
          }
        }
      }
      
      // Clear out global TD before re-assigning so we don't keep old list keys
      for (const key in TD) delete TD[key];
      
      if (data.td) {
        Object.assign(TD, data.td);
      }
      
      for (const base in TD) {
        const list = document.getElementById(base+'-tags');
        if (list) {
          list.innerHTML = '';
          TD[base].forEach(item => renderSortItem(base, item));
        }
      }
      
      if (data.custom) {
        const cList = document.getElementById('custom-list');
        if (cList) cList.innerHTML = '';
        _cfc = 0;
        data.custom.forEach(c => {
           addCustomField();
           const last = cList.lastElementChild;
           if (last) {
              last.querySelector('.cf-label').value = c.label;
              last.querySelector('.cf-val').value = c.val;
              last.querySelectorAll('.sto').forEach(o => {
                if (o.textContent.trim() === c.side) o.classList.add('active');
                else o.classList.remove('active');
              });
           }
        });
      }
      updateUI(true);
    } catch (err) {
      alert('Failed to load JSON data.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ===== INIT ===== */
function init(){
  buildFrontFields(); buildBackFields(); updateUI();
  const c2=document.getElementById('f-c2').value;
  document.getElementById('f-rim').value=c2;
  document.getElementById('f-rimt').value=c2;
  render();
  // Default to showing both sides
  const btn = document.querySelector('.preview-tabs button:last-child');
  if (btn) switchTab('both', btn);
}
window.addEventListener('DOMContentLoaded',init);
