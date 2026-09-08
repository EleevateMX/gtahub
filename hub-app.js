/* GTAHUB Content Hub — lógica e interacciones (conectado a Supabase) */
let pubSort={k:'d',dir:-1},sideOpen=true,undoFn=null;
let brand='ALL',view='inicio',selDay=todayISO(),selMonth=todayISO().slice(0,7),
    pubFilter='todas',pfFilter=null,pubMode='tabla',taskFilter='todas',
    ideaFilter='todas',ideaSort='impacto',period='30';
const byBrand=a=>brand==='ALL'?a:a.filter(x=>x.brand===brand);
const toast=(m,undo)=>{const t=$('#toast');undoFn=undo||null;t.innerHTML='<span>'+m+'</span>'+(undo?'<button class="btn gh2 sm" id="undoBtn">Deshacer</button>':'');t.classList.add('on');
 if(undo)$('#undoBtn').onclick=async()=>{await undoFn();undoFn=null;t.classList.remove('on');render();toast('Cambio deshecho')};
 clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),undo?5200:2200)};
const oops=e=>{console.error(e);toast('No se pudo guardar. Revisa tu conexión.')};
async function persist(fn,msg,undo){try{await fn();await hubLoad();render();if(msg)toast(msg,undo)}catch(e){oops(e)}}

/* ---------- NOTIFICACIONES (calculadas) ---------- */
function buildNotis(){
 const n=[];
 TASKS.filter(t=>t.col!=='done'&&dueInfo(t).late).slice(0,3)
  .forEach(t=>n.push({t:'«'+t.t+'» está fuera de plazo',m:'Vencía el '+dlabel(t.dueDate),k:'alta',go:()=>openTask(t.id)}));
 POSTS.filter(p=>p.st==='programada'&&p.d===todayISO()).slice(0,2)
  .forEach(p=>n.push({t:'«'+p.t+'» se publica hoy'+(p.h?' a las '+p.h:''),m:'Programada',k:'media',go:()=>openPost(p.id)}));
 TASKS.filter(t=>t.col!=='done'&&t.dueDate===todayISO()).slice(0,2)
  .forEach(t=>n.push({t:'«'+t.t+'» vence hoy',m:t.owner,k:'media',go:()=>openTask(t.id)}));
 TRENDS.slice(0,1).forEach(r=>n.push({t:'Tendencia nueva: '+r.t,m:r.d?dlabel(r.d):'Radar GTA RP',k:'baja',go:()=>openTrend(r.id)}));
 return n;
}

/* ---------- LOGIN + CARGA ---------- */
$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const b=$('#loginBtn'),err=$('#loginErr');err.style.display='none';
 b.disabled=true;b.innerHTML='<span class="spin"></span>Verificando acceso';
 try{
  const u=await hubLogin($('#em').value,$('#pw').value);
  if(!u){err.textContent='Usuario o contraseña incorrectos.';err.style.display='block';
   b.disabled=false;b.textContent='Entrar al hub';return}
  boot();
 }catch(ex){err.textContent='No hay conexión con la base. Inténtalo de nuevo.';err.style.display='block';
  b.disabled=false;b.textContent='Entrar al hub'}
});
const BOOTSTEPS=['Conectando con el hub','Sincronizando GTAHUB ESP','Sincronizando GTAHUB PE','Cargando calendario y métricas','Listo'];
function boot(){
 $('#login').classList.add('hide');$('#boot').classList.remove('hide');
 let i=0,loaded=false,failed=null;
 hubLoad().then(()=>loaded=true).catch(e=>failed=e);
 const tick=()=>{
  $('#bootBar').style.width=((i+1)/BOOTSTEPS.length*100)+'%';$('#bootSt').textContent=BOOTSTEPS[i];i++;
  if(i<BOOTSTEPS.length)setTimeout(tick,320);
  else{const fin=()=>{
    if(failed){$('#bootSt').textContent='Sin conexión con la base. Reintentando…';
     hubLoad().then(()=>{enter()}).catch(()=>{$('#bootSt').textContent='No se pudo conectar. Recarga la página.'});return}
    if(!loaded){setTimeout(fin,250);return}
    enter()};
   setTimeout(fin,300)}
 };
 tick();
}
function enter(){
 $('#boot').classList.add('hide');$('#app').classList.remove('hide');
 const u=HUB.user||{name:'Equipo',role:''};
 $('#meName').textContent=u.name;$('#meRole').textContent=(u.role||'').toUpperCase();
 $('#meAv').textContent=u.name.slice(0,2).toUpperCase();
 render();
}
$('#logout').addEventListener('click',()=>location.reload());

/* ---------- NAVEGACIÓN ---------- */
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
function go(v){if(view===v)return;view=v;$$('[data-view]').forEach(b=>b.classList.toggle('act',b.dataset.view===v));render()}
$$('#brandSeg button').forEach(b=>b.addEventListener('click',()=>{brand=b.dataset.brand;$$('#brandSeg button').forEach(x=>x.classList.toggle('act',x===b));render()}));
const VIEWS=['inicio','pendientes','publicaciones','calendario','ideas','metricas'];
const TITLES={inicio:'INICIO',pendientes:'PENDIENTES',publicaciones:'PUBLICACIONES',calendario:'CALENDARIO',ideas:'IDEAS',metricas:'MÉTRICAS'};
document.addEventListener('keydown',e=>{
 if($('#login').classList.contains('hide')===false)return;
 if(e.key==='Escape'){closeDrawer();$('#omni').classList.remove('on');$('#notiPanel').classList.remove('on')}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openOmni()}
 if(!e.metaKey&&!e.ctrlKey&&/^[1-6]$/.test(e.key)&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){go(VIEWS[+e.key-1])}
});

function skeleton(n=5){return `<div class="card">${'<div class="skrow"><div class="sk" style="width:38px;height:38px"></div><div style="flex:1"><div class="sk" style="height:11px;width:52%"></div><div class="sk" style="height:9px;width:28%;margin-top:7px"></div></div><div class="sk" style="width:74px;height:22px"></div></div>'.repeat(n)}</div>`}
function render(){
 $('#title').textContent=TITLES[view];
 $('#cntPend').textContent=TASKS.filter(t=>t.col!=='done').length||'';
 $('#cntPub').textContent=POSTS.length||'';
 $('#cntIdeas').textContent=IDEAS.length||'';
 $('#notiBdg').textContent=buildNotis().length||'';
 const v=$('#view');
 v.innerHTML=`<div class="sk" style="height:210px;border-radius:14px"></div><div class="g4">${'<div class="card" style="height:108px"><div class="sk" style="height:9px;width:50%"></div><div class="sk" style="height:26px;width:38%;margin-top:14px"></div></div>'.repeat(4)}</div>${skeleton()}`;
 v.scrollTop=0;
 clearTimeout(render._h);
 render._h=setTimeout(()=>{v.innerHTML=({inicio:vInicio,pendientes:vPend,publicaciones:vPub,calendario:vCal,ideas:vIdeas,metricas:vMet})[view]();v.classList.remove('in');void v.offsetWidth;v.classList.add('in');wire()},300);
}
const HERO_SUB={
 inicio:()=>'Todo lo que sale de GTAHUB ESP y GTAHUB PE, en una sola vista.',
 pendientes:()=>`${byBrand(TASKS).filter(t=>t.col!=='done').length} tareas abiertas entre Orion, Andromeda y Pegasus.`,
 publicaciones:()=>`${byBrand(POSTS).length} piezas publicadas, programadas y en borrador.`,
 calendario:()=>calTitle(selMonth)+' · '+byBrand(POSTS).filter(p=>p.d&&p.d.startsWith(selMonth)).length+' publicaciones en el mes.',
 ideas:()=>`${byBrand(IDEAS).length} ideas priorizadas por impacto y esfuerzo, cruzadas con el radar de tendencias.`,
 metricas:()=>{const s=periodPosts(period);return `Últimos ${period} días · ${fmt(s.reduce((a,p)=>a+p.reach,0))} de alcance y ${fmt(s.reduce((a,p)=>a+p.eng,0))} interacciones.`}};
function hero(extra=''){const h=HEROES[view];return `<div class="hero"><img class="bg" src="${h.bg}" alt=""><span class="glow"></span><img class="char" src="${h.char}" alt=""><span class="diag"></span><span class="scan"></span><span class="vig"></span><span class="hud tl"></span><span class="hud tr"></span><span class="hud bl"></span><span class="hud br"></span><div class="in"><div class="lbl" style="margin-bottom:9px">GTAHUB · ${brand==='ALL'?'ESP + PE':brand}</div><h3>${h.h}</h3><p>${HERO_SUB[view]()}</p>${extra}</div></div>`}
const kpi=(l,n,d,spark)=>`<div class="kpi"><div class="lbl">${l}</div><div class="n">${n}</div><div class="d">${d}</div>${spark?`<div class="kspark">${spark.map(v=>`<i style="height:${v}%"></i>`).join('')}</div>`:''}</div>`;
function sparkOf(vals){const m=Math.max(1,...vals);return vals.map(v=>Math.max(8,Math.round(v/m*100)))}
function pubIn(ps,from,to){return ps.filter(p=>p.st==='publicada'&&p.d&&p.d>=from&&p.d<to)}

/* ---------- INICIO ---------- */
function vInicio(){
 const ps=byBrand(POSTS);
 const prog=ps.filter(p=>p.st!=='publicada').sort((a,b)=>(a.d||'9999')<(b.d||'9999')?-1:1);
 const urg=byBrand(TASKS).filter(t=>t.col!=='done').sort((a,b)=>({alta:0,media:1,baja:2})[a.prio]-({alta:0,media:1,baja:2})[b.prio]||((a.dueDate||'9999')<(b.dueDate||'9999')?-1:1)).slice(0,5);
 const late=byBrand(TASKS).filter(t=>t.col!=='done'&&dueInfo(t).late).length;
 const p7=pubIn(ps,daysAgoISO(7),'9999').length,p7prev=pubIn(ps,daysAgoISO(14),daysAgoISO(7)).length;
 const in48=prog.filter(p=>p.d&&p.d<=daysAgoISO(-2)).length;
 const reach30=pubIn(ps,daysAgoISO(30),'9999').reduce((a,p)=>a+p.reach,0);
 const wkSeries=[...Array(7)].map((_,i)=>pubIn(ps,daysAgoISO((7-i)*7),daysAgoISO((6-i)*7)).length);
 const cadKeys=['ig','tt','dc','em','fb'];
 const wkFrom=mondayISO(),wkTo=mondayISO(1);
 const cad=cadKeys.map(k=>[k,pubIn(ps,wkFrom,wkTo).filter(p=>p.pf===k).length,HUB.metas[k]||1]);
 return hero(`<div style="display:flex;gap:8px;margin-top:16px"><button class="btn sm" data-new="publicación">+ Nueva publicación</button><button class="btn gh2 sm" data-goto="calendario">Ver calendario</button></div>`)
 +`<div class="g4">
 ${kpi('PUBLICADAS · 7 DÍAS',p7,p7>=p7prev?`<span class="up">▲ +${p7-p7prev}</span> vs. semana previa`:`<span class="dn">▼ ${p7-p7prev}</span> vs. semana previa`,sparkOf(wkSeries))}
 ${kpi('PROGRAMADAS',prog.length,`${in48} en las próximas 48 h`)}
 ${kpi('PENDIENTES ABIERTOS',byBrand(TASKS).filter(t=>t.col!=='done').length,late?`<span class="dn">${late} fuera de plazo</span>`:'Todo en plazo')}
 ${kpi('ALCANCE · 30 DÍAS',reach30?fmt(reach30):'—',reach30?'Suma de views registradas':'Captura métricas al publicar')}</div>
 <div class="g2">
 <div class="card"><header><h3>PRÓXIMAS PROGRAMADAS</h3><button class="chip" data-goto="publicaciones">VER TODO</button></header>
 ${prog.slice(0,5).map(p=>`<div class="row" data-post="${p.id}"><img class="thumb" src="${p.thumb}" alt=""><div class="t">${p.t}<div class="meta" style="margin-top:3px">${p.fmt}</div></div>${brandTag(p.brand)}${pill(p.pf)}<span class="meta">${dlabel(p.d)}${p.h?' '+p.h:''}</span></div>`).join('')||emptyState('Sin publicaciones programadas. Crea la primera con «Nueva publicación».')}</div>
 <div class="card"><header><h3>PENDIENTES URGENTES</h3><span class="tag alta">${urg.length}</span></header>
 ${urg.map(t=>{const di=dueInfo(t);return `<div class="row" data-task="${t.id}"><span class="prio ${t.prio}"></span><div class="t">${t.t}<div class="meta" style="margin-top:3px"${di.late?' style="color:var(--bad)"':''}>${di.label} · ${t.owner}</div></div><span class="tag ${t.prio}">${t.prio.toUpperCase()}</span></div>`}).join('')||emptyState('Nada urgente. Buen trabajo.')}</div></div>
 <div class="g2">
 <div class="card"><header><h3>CADENCIA SEMANAL · PUBLICADAS VS. META</h3><span class="lbl">ESTA SEMANA</span></header>
 ${cad.map(([p,a,b])=>`<div class="meter"><div class="lg">${pill(p)}<span><b style="color:#fff">${a}</b> / ${b}</span></div><div class="tr"><i style="width:${Math.min(100,a/b*100)}%;background:var(--${p})"></i></div></div>`).join('')}</div>
 <div class="card"><header><h3>ÚLTIMAS TENDENCIAS</h3><button class="chip" data-goto="ideas">EXPLORAR</button></header>
 ${TRENDS.slice(0,5).map(trendRow).join('')||emptyState('El radar semanal aún no carga tendencias.')}</div></div>`;
}
const REL_ST={alta:'publicada',media:'programada',baja:'borrador'};
function trendRow(r){return `<div class="trend" data-trend="${r.id}"><div class="t" style="flex:1;min-width:0;font-weight:600;font-size:12.5px">${r.t}<div class="meta" style="margin-top:3px">${r.note.slice(0,90)}${r.note.length>90?'…':''}</div></div><span class="st ${REL_ST[r.rel]||'borrador'}">${r.rel.toUpperCase()}</span></div>`}
function emptyState(m){return `<div class="empty"><img src="hub-art/char-woman.png" alt=""><div>${m}</div></div>`}

/* ---------- PENDIENTES (kanban con arrastre) ---------- */
function vPend(){
 const ts=byBrand(TASKS).filter(t=>taskFilter==='todas'||t.prio===taskFilter);
 const col=(k,n)=>`<div class="col" data-col="${k}"><h3>${n} <em>${ts.filter(t=>t.col===k).length}</em></h3><div class="drop" data-drop="${k}">${ts.filter(t=>t.col===k).map(t=>{const di=dueInfo(t);return `<div class="tk" draggable="true" data-task="${t.id}"${t.col==='done'?' style="opacity:.75"':''}><span class="prio ${t.prio}"></span><div class="tt">${t.t}</div><div class="mt"><span class="tag ${t.prio}">${t.prio.toUpperCase()}</span><span class="tag ${t.brand==='ESP'?'esp':'pe'}">${(t.srv||t.brand).toUpperCase()}</span></div>${t.col==='prog'?`<div class="tr mini"><i style="width:${t.prog}%"></i></div>`:''}<div class="ft"><span class="who"><span class="av xs">${t.owner.slice(0,2).toUpperCase()}</span>${t.owner}</span><span${di.late?' style="color:var(--bad)"':''}>${di.label}</span></div></div>`}).join('')||'<div class="meta" style="padding:12px 4px">Suelta una tarjeta aquí.</div>'}</div></div>`;
 return hero()+`<div class="fbar">${['todas','alta','media','baja'].map(f=>`<button class="chip ${taskFilter===f?'act':''}" data-tf="${f}">${f.toUpperCase()} · ${f==='todas'?byBrand(TASKS).length:byBrand(TASKS).filter(t=>t.prio===f).length}</button>`).join('')}<span class="meta" style="margin-left:auto">Arrastra las tarjetas entre columnas</span><button class="btn sm" data-new="tarea">+ Nueva tarea</button></div>
 <div class="kb">${col('todo','POR HACER')}${col('prog','EN PROGRESO')}${col('done','LISTO')}</div>`;
}
function wireDnD(){
 let drag=null;
 $$('.tk[draggable]').forEach(el=>{
  el.addEventListener('dragstart',e=>{drag=el.dataset.task;el.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
  el.addEventListener('dragend',()=>{el.classList.remove('dragging');$$('.drop').forEach(d=>d.classList.remove('over'))});
 });
 $$('.drop').forEach(d=>{
  d.addEventListener('dragover',e=>{e.preventDefault();d.classList.add('over')});
  d.addEventListener('dragleave',()=>d.classList.remove('over'));
  d.addEventListener('drop',e=>{e.preventDefault();if(!drag)return;const t=TASKS.find(x=>x.id===drag);const to=d.dataset.drop;drag=null;
   if(t&&t.col!==to){const prog=to==='done'?100:to==='prog'?Math.max(t.prog,25):0;
    persist(()=>dbPatchTask(t.id,{col:to,prog}),'«'+t.t.slice(0,34)+'…» → '+({todo:'Por hacer',prog:'En progreso',done:'Listo'})[to])}
  });
 });
}
/* ---------- PUBLICACIONES ---------- */
function vPub(){
 let ps=byBrand(POSTS);
 if(pubFilter!=='todas')ps=ps.filter(p=>p.st===pubFilter);
 if(pfFilter)ps=ps.filter(p=>p.pf===pfFilter);
 ps=[...ps].sort((a,b)=>{const k=pubSort.k,x=a[k]??'',y=b[k]??'';return (x<y?-1:x>y?1:0)*pubSort.dir});
 const ar=(k)=>pubSort.k===k?(pubSort.dir===1?' ▲':' ▼'):'';
 const table=`<div class="card" style="padding:16px 16px 6px"><div class="tblwrap"><table><thead><tr><th class="so" data-sort="t" style="width:36%">PUBLICACIÓN${ar('t')}</th><th class="so" data-sort="brand">MARCA${ar('brand')}</th><th class="so" data-sort="pf">PLATAFORMA${ar('pf')}</th><th class="so" data-sort="st">ESTADO${ar('st')}</th><th class="so" data-sort="d">FECHA${ar('d')}</th><th class="so" data-sort="reach" style="text-align:right">ALCANCE${ar('reach')}</th><th class="so" data-sort="eng" style="text-align:right">INTERACC.${ar('eng')}</th></tr></thead><tbody>
 ${ps.map(p=>`<tr data-post="${p.id}"><td><div style="display:flex;align-items:center;gap:11px"><img class="thumb" src="${p.thumb}" alt=""><b>${p.t}</b></div></td><td><span class="tag ${p.brand==='ESP'?'esp':'pe'}">${(p.srv||p.brand).toUpperCase()}</span></td><td>${pill(p.pf)}</td><td><span class="st ${p.st}">${p.st.toUpperCase()}</span></td><td>${dlabel(p.d)}${p.h?' · '+p.h:''}</td><td style="text-align:right">${p.reach?'<b>'+fmt(p.reach)+'</b>':'—'}</td><td style="text-align:right">${p.eng?fmt(p.eng):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
 const gal=`<div class="gal">${ps.map(p=>`<figure class="gcard" data-post="${p.id}"><img src="${p.thumb}" alt=""><span class="scan"></span><span class="gbar ${p.pf}"></span><span class="hud tl"></span><span class="hud br"></span><figcaption><div class="gt">${p.t}</div><div class="gm"><span class="st ${p.st}">${p.st.toUpperCase()}</span><span class="meta">${dlabel(p.d)}${p.h?' · '+p.h:''}</span></div><div class="gm">${pill(p.pf)}${brandTag(p.brand)}${p.reach?`<span class="meta" style="margin-left:auto">${fmt(p.reach)}</span>`:''}</div></figcaption></figure>`).join('')}</div>`;
 return hero()+`<div class="fbar">${[['todas','TODAS'],['publicada','PUBLICADAS'],['programada','PROGRAMADAS'],['borrador','BORRADORES']].map(([k,n])=>`<button class="chip ${pubFilter===k?'act':''}" data-pubf="${k}">${n} · ${k==='todas'?byBrand(POSTS).length:byBrand(POSTS).filter(p=>p.st===k).length}</button>`).join('')}<span style="width:1px;height:22px;background:var(--line)"></span>${Object.keys(PF).map(k=>`<button class="chip ${pfFilter===k?'act':''}" data-pff="${k}">${PF[k].n}</button>`).join('')}
 <div class="seg sm" style="margin-left:auto;width:150px"><button class="${pubMode==='tabla'?'act':''}" data-mode="tabla">TABLA</button><button class="${pubMode==='galeria'?'act':''}" data-mode="galeria">GALERÍA</button></div><button class="btn sm" data-new="publicación">+ Nueva</button></div>
 ${ps.length?(pubMode==='tabla'?table:gal):emptyState('Ninguna publicación coincide con estos filtros.')}
 <div style="display:flex;align-items:center;justify-content:space-between"><span class="lbl">MOSTRANDO ${ps.length} DE ${POSTS.length}</span><span class="meta">Clic en una pieza para ver la ficha completa</span></div>`;
}
/* ---------- CALENDARIO ---------- */
function monthMeta(ym){
 const y=+ym.slice(0,4),m=+ym.slice(5,7);
 const NM=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
 return{n:NM[m-1]+' '+y,start:(new Date(y,m-1,1).getDay()+6)%7,days:new Date(y,m,0).getDate()};
}
function calTitle(ym){const M=monthMeta(ym);return M.n.charAt(0)+M.n.slice(1).toLowerCase()}
function shiftMonth(ym,off){const y=+ym.slice(0,4),m=+ym.slice(5,7)-1+off;const d=new Date(y,m,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function vCal(){
 let ps=byBrand(POSTS);if(pfFilter)ps=ps.filter(p=>p.pf===pfFilter);
 const M=monthMeta(selMonth);
 let cells='';
 for(let i=0;i<M.start;i++)cells+='<div class="cl out"><u></u></div>';
 for(let d=1;d<=M.days;d++){
  const key=selMonth+'-'+String(d).padStart(2,'0'),evs=ps.filter(p=>p.d===key),today=key===todayISO();
  cells+=`<div class="cl ${today?'tod':''} ${key===selDay?'sel':''}" data-day="${key}"><u>${d}${today?' · HOY':''}</u>${evs.map(e=>`<div class="ev ${e.pf}" draggable="true" data-ev="${e.id}" data-post="${e.id}">${e.h?e.h+' ':''}${e.t.split('·')[0].trim()}</div>`).join('')}${evs.length?`<span class="mdots">${evs.map(e=>`<i style="background:var(--${e.pf})"></i>`).join('')}</span>`:''}</div>`;
 }
 const rest=(7-((M.start+M.days)%7))%7;for(let i=1;i<=rest;i++)cells+='<div class="cl out"><u></u></div>';
 const sel=ps.filter(p=>p.d===selDay);
 return hero()+`<div class="fbar"><button class="chip" data-mon="${shiftMonth(selMonth,-1)}">‹ ${calTitle(shiftMonth(selMonth,-1)).split(' ')[0].toUpperCase()}</button><span style="font:700 12px Inter;letter-spacing:2px;text-transform:uppercase">${M.n}</span><button class="chip" data-mon="${shiftMonth(selMonth,1)}">${calTitle(shiftMonth(selMonth,1)).split(' ')[0].toUpperCase()} ›</button><span style="width:1px;height:22px;background:var(--line)"></span>${Object.keys(PF).map(k=>`<button class="chip pfleg ${pfFilter===k?'act':''}" data-pff="${k}"><span class="dot" style="background:var(--${k})"></span>${PF[k].n}</button>`).join('')}<button class="btn sm" style="margin-left:auto" data-new="programación">+ Programar</button></div>
 <div class="cal"><div class="hd">LUN</div><div class="hd">MAR</div><div class="hd">MIÉ</div><div class="hd">JUE</div><div class="hd">VIE</div><div class="hd">SÁB</div><div class="hd">DOM</div>${cells}</div>
 <div class="card"><header><h3>${dlabel(selDay).toUpperCase()}</h3><span class="lbl">${sel.length} PUBLICACIÓN${sel.length===1?'':'ES'}</span></header>
 ${sel.map(p=>`<div class="row" data-post="${p.id}"><img class="thumb" src="${p.thumb}" alt=""><div class="t">${p.t}<div class="meta" style="margin-top:3px">${p.h?p.h+' · ':''}${p.srv} · ${p.fmt}</div></div>${pill(p.pf)}<span class="st ${p.st}">${p.st.toUpperCase()}</span></div>`).join('')||emptyState('Ese día no hay nada programado. Buen hueco para el banco de ideas.')}</div>`;
}
/* ---------- IDEAS ---------- */
function vIdeas(){
 let is=byBrand(IDEAS).filter(i=>ideaFilter==='todas'||i.st===ideaFilter);
 is=[...is].sort((a,b)=>ideaSort==='impacto'?b.imp-a.imp:a.eff-b.eff);
 return hero()+`<div class="ideasgrid" style="display:grid;gap:15px;align-items:start">
 <div style="display:flex;flex-direction:column;gap:14px">
 <div class="fbar">${[['todas','TODAS'],['aprobada','APROBADAS'],['revision','EN REVISIÓN']].map(([k,n])=>`<button class="chip ${ideaFilter===k?'act':''}" data-if="${k}">${n} · ${k==='todas'?byBrand(IDEAS).length:byBrand(IDEAS).filter(i=>i.st===k).length}</button>`).join('')}<div class="seg sm" style="margin-left:auto;width:190px"><button class="${ideaSort==='impacto'?'act':''}" data-is="impacto">MÁS IMPACTO</button><button class="${ideaSort==='esfuerzo'?'act':''}" data-is="esfuerzo">MENOS ESFUERZO</button></div><button class="btn sm" data-new="idea">+ Idea</button></div>
 <div class="g3">${is.map(i=>`<div class="idea" data-idea="${i.id}"><div style="display:flex;gap:6px">${pill(i.pf)}${brandTag(i.brand)}</div><h4>${i.t}</h4><p>${i.d.slice(0,140)}${i.d.length>140?'…':''}</p><div class="ie"><div><div class="lbl">IMPACTO</div><div class="pips">${[1,2,3,4,5].map(n=>`<i class="${n<=i.imp?'f':''}"></i>`).join('')}</div></div><div><div class="lbl">ESFUERZO</div><div class="pips e">${[1,2,3,4,5].map(n=>`<i class="${n<=i.eff?'f':''}"></i>`).join('')}</div></div></div></div>`).join('')||emptyState('Sin ideas con este filtro. Crea una con «+ Idea».')}</div></div>
 <div class="card"><header><h3>TENDENCIAS DEL SECTOR</h3><span class="lbl">GTA RP · SEMANAL</span></header>
 <div class="srch" style="max-width:none;margin-bottom:12px"><input id="trendQ" placeholder="Buscar tendencia…"></div>
 <div id="trendList">${TRENDS.map(trendRow).join('')||'<div class="meta">El radar semanal de Claude aún no carga tendencias.</div>'}</div>
 <div class="sugg"><div class="lbl" style="margin-bottom:9px">RADAR DEL HUB</div><p>Cada lunes Claude investiga la escena GTA RP y agrega tendencias nuevas aquí. Haz clic en una para ver el análisis completo y crear una idea a partir de ella.</p></div></div></div>`;
}
/* ---------- MÉTRICAS ---------- */
function periodPosts(per){const from=daysAgoISO(+per);return byBrand(POSTS).filter(p=>p.st==='publicada'&&p.d&&p.d>=from)}
function vMet(){
 const ps=periodPosts(period),prev=byBrand(POSTS).filter(p=>p.st==='publicada'&&p.d&&p.d>=daysAgoISO(+period*2)&&p.d<daysAgoISO(+period));
 const reach=ps.reduce((a,p)=>a+p.reach,0),eng=ps.reduce((a,p)=>a+p.eng,0);
 const reachPrev=prev.reduce((a,p)=>a+p.reach,0);
 const rate=reach?(eng/reach*100).toFixed(1)+'%':'—';
 const delta=reachPrev?Math.round((reach-reachPrev)/reachPrev*100):null;
 const nb=period==='7'?7:period==='30'?6:3;
 const buckets=[...Array(nb)].map((_,i)=>{
  const span=period==='7'?1:period==='30'?5:30;
  const from=daysAgoISO((nb-i)*span),to=daysAgoISO((nb-1-i)*span);
  const r=byBrand(POSTS).filter(p=>p.st==='publicada'&&p.d&&p.d>=from&&p.d<to).reduce((a,p)=>a+p.reach,0);
  const lbl=period==='7'?['L','M','X','J','V','S','D'][new Date(daysAgoISO((nb-i)*span-0)+'T12:00').getDay()===0?6:(new Date(daysAgoISO((nb-i)*span)+'T12:00').getDay()+6)%7]:dlabel(from).replace(' ','');
  return[r,lbl,from,to]});
 const maxB=Math.max(1,...buckets.map(b=>b[0]));
 const pfAll=['tt','ig','fb','dc','em'].map(k=>[k,ps.filter(p=>p.pf===k).reduce((a,p)=>a+p.reach,0)]).sort((a,b)=>b[1]-a[1]);
 const maxPf=Math.max(1,...pfAll.map(x=>x[1]));
 const top=[...ps].filter(p=>p.reach).sort((a,b)=>b.reach-a.reach).slice(0,6);
 return hero()+`<div class="fbar"><div class="seg sm" style="width:230px">${['7','30','90'].map(k=>`<button class="${period===k?'act':''}" data-per="${k}">${k} DÍAS</button>`).join('')}</div><span class="meta" style="margin-left:auto">Pasa el cursor por las barras para ver el detalle</span><button class="btn sm" data-new="informe">Exportar CSV</button></div>
 <div class="g4">
 ${kpi('ALCANCE',reach?fmt(reach):'—',delta===null?'Sin periodo previo comparable':(delta>=0?`<span class="up">▲ ${delta}%</span>`:`<span class="dn">▼ ${Math.abs(delta)}%</span>`)+' vs. periodo previo')}
 ${kpi('INTERACCIONES',eng?fmt(eng):'—','Suma del periodo')}
 ${kpi('TASA DE INTERACCIÓN',rate,'Interacciones / alcance')}
 ${kpi('PUBLICADAS',ps.length,`En los últimos ${period} días`)}</div>
 <div class="g2"><div class="card"><header><h3>ALCANCE POR ${period==='7'?'DÍA':period==='30'?'TRAMO':'MES'}</h3><span class="lbl">■ VIEWS REGISTRADAS</span></header>${reach?`<div class="bars">${buckets.map(([r,l])=>`<div class="b" data-tip="${l} · ${fmt(r)} de alcance"><div class="bstack"><i style="height:${Math.max(4,r/maxB*100)}%;background:var(--crimson)"></i></div><span>${l}</span></div>`).join('')}</div>`:emptyState('Captura views en tus publicaciones para ver la gráfica.')}</div>
 <div class="card"><header><h3>ALCANCE POR PLATAFORMA</h3><span class="lbl">${period} DÍAS</span></header>${reach?pfAll.map(([k,v])=>`<div class="meter"><div class="lg">${pill(k)}<span><b style="color:#fff">${v?fmt(v):'—'}</b>${reach?' · '+Math.round(v/reach*100)+'%':''}</span></div><div class="tr"><i style="width:${v/maxPf*100}%;background:var(--${k})"></i></div></div>`).join(''):emptyState('Sin métricas en este periodo.')}</div></div>
 <div class="card" style="padding:16px 16px 6px"><header><h3>TOP DE PUBLICACIONES</h3><span class="meta">Clic para ver la ficha</span></header>${top.length?`<div class="tblwrap"><table><thead><tr><th style="width:40%">PUBLICACIÓN</th><th>MARCA</th><th>PLATAFORMA</th><th style="text-align:right">ALCANCE</th><th style="text-align:right">INTERACC.</th><th style="text-align:right">TASA</th></tr></thead><tbody>
 ${top.map(p=>`<tr data-post="${p.id}"><td><div style="display:flex;align-items:center;gap:11px"><img class="thumb" src="${p.thumb}" alt=""><b>${p.t}</b></div></td><td><span class="tag ${p.brand==='ESP'?'esp':'pe'}">${(p.srv||p.brand).toUpperCase()}</span></td><td>${pill(p.pf)}</td><td style="text-align:right"><b>${fmt(p.reach)}</b></td><td style="text-align:right">${fmt(p.eng)}</td><td style="text-align:right"><span class="up">${(p.eng/p.reach*100).toFixed(1)}%</span></td></tr>`).join('')}</tbody></table></div>`:emptyState('Todavía no hay publicaciones con métricas en este periodo.')}</div>`;
}
/* ---------- FORMULARIOS ---------- */
const OPT=(o,sel)=>o.map(([v,n])=>`<option value="${v}"${v===sel?' selected':''}>${n}</option>`).join('');
const PF_OPTS=[['ig','Instagram'],['tt','TikTok'],['dc','Discord'],['em','Email'],['fb','Facebook']];
const BR_OPTS=[['ESP|Orion','ESP · Orion'],['ESP|Andromeda','ESP · Andromeda'],['PE|Pegasus','PE · Pegasus']];
function frm(fields){return fields.map(f=>`<div class="fld"><label class="lbl" for="f_${f.id}">${f.l}</label>${f.tag==='select'?`<select id="f_${f.id}">${f.opts}</select>`:f.tag==='textarea'?`<textarea id="f_${f.id}" rows="${f.rows||3}" placeholder="${f.ph||''}"></textarea>`:`<input id="f_${f.id}" type="${f.type||'text'}" value="${f.v||''}" placeholder="${f.ph||''}">`}</div>`).join('')}
const fv=id=>{const e=$('#f_'+id);return e?e.value.trim():''};
function newForm(kind,presetDate){
 if(kind==='informe'){exportCSV();return}
 if(kind==='campaña'){toast('Usa «Crear idea» dentro de una tendencia.');return}
 const brandDef=brand==='PE'?'PE|Pegasus':'ESP|Orion';
 if(kind==='publicación'||kind==='programación'){
  drawer('Nueva publicación',frm([
   {id:'t',l:'TÍTULO',ph:'Nombre de la pieza'},
   {id:'br',l:'MARCA · SERVIDOR',tag:'select',opts:OPT(BR_OPTS,brandDef)},
   {id:'pf',l:'PLATAFORMA',tag:'select',opts:OPT(PF_OPTS,'ig')},
   {id:'st',l:'ESTADO',tag:'select',opts:OPT([['borrador','Borrador'],['programada','Programada'],['publicada','Publicada']],presetDate?'programada':'borrador')},
   {id:'d',l:'FECHA',type:'date',v:presetDate||''},
   {id:'h',l:'HORA (OPCIONAL)',type:'time'},
   {id:'fmt',l:'FORMATO',ph:'Reel · 22 s · 1080×1920'},
   {id:'copy',l:'TEXTO / COPY',tag:'textarea',rows:4,ph:'Caption o texto de la publicación'},
   {id:'chk',l:'CHECKLIST (UNA POR LÍNEA)',tag:'textarea',rows:3,ph:'Arte exportado\nCopy revisado\nProgramada'},
  ]),`<button class="btn" style="flex:1" id="fSave">Guardar publicación</button>`,true);
  $('#fSave').onclick=()=>{if(!fv('t'))return toast('Ponle un título.');const[b,s]=fv('br').split('|');
   persist(()=>dbCreatePost({t:fv('t'),brand:b,srv:s,pf:fv('pf'),st:fv('st'),d:fv('d'),h:fv('h'),fmt:fv('fmt'),copy:fv('copy'),chk:fv('chk')?fv('chk').split('\n').map(x=>x.trim()).filter(Boolean):[]}),'Publicación creada');closeDrawer()};
 }else if(kind==='tarea'){
  drawer('Nueva tarea',frm([
   {id:'t',l:'TAREA',ph:'Qué hay que hacer'},
   {id:'prio',l:'PRIORIDAD',tag:'select',opts:OPT([['alta','Alta'],['media','Media'],['baja','Baja']],'media')},
   {id:'br',l:'MARCA · SERVIDOR',tag:'select',opts:OPT(BR_OPTS,brandDef)},
   {id:'pf',l:'PLATAFORMA (OPCIONAL)',tag:'select',opts:'<option value="">—</option>'+OPT(PF_OPTS,null)},
   {id:'d',l:'FECHA LÍMITE',type:'date'},
   {id:'ow',l:'RESPONSABLE',v:HUB.user?HUB.user.name:''},
   {id:'ds',l:'DESCRIPCIÓN',tag:'textarea',rows:3},
  ]),`<button class="btn" style="flex:1" id="fSave">Guardar tarea</button>`,true);
  $('#fSave').onclick=()=>{if(!fv('t'))return toast('Describe la tarea.');const[b,s]=fv('br').split('|');
   persist(()=>dbCreateTask({t:fv('t'),prio:fv('prio'),brand:b,srv:s,pf:fv('pf')||null,dueDate:fv('d'),owner:fv('ow'),desc:fv('ds')}),'Tarea creada');closeDrawer()};
 }else if(kind==='idea'){
  drawer('Nueva idea',frm([
   {id:'t',l:'IDEA',ph:'Título corto'},
   {id:'br',l:'MARCA · SERVIDOR',tag:'select',opts:OPT(BR_OPTS,brandDef)},
   {id:'pf',l:'PLATAFORMA',tag:'select',opts:OPT(PF_OPTS,'tt')},
   {id:'imp',l:'IMPACTO (1-5)',tag:'select',opts:OPT([['1','1'],['2','2'],['3','3'],['4','4'],['5','5']],'3')},
   {id:'eff',l:'ESFUERZO (1-5)',tag:'select',opts:OPT([['1','1'],['2','2'],['3','3'],['4','4'],['5','5']],'3')},
   {id:'ds',l:'DESCRIPCIÓN',tag:'textarea',rows:3},
   {id:'why',l:'POR QUÉ AHORA',tag:'textarea',rows:2},
  ]),`<button class="btn" style="flex:1" id="fSave">Guardar idea</button>`,true);
  $('#fSave').onclick=()=>{if(!fv('t'))return toast('Ponle un título.');const[b]=fv('br').split('|');
   persist(()=>dbCreateIdea({t:fv('t'),brand:b,pf:fv('pf'),imp:+fv('imp'),eff:+fv('eff'),d:fv('ds'),why:fv('why')}),'Idea guardada');closeDrawer()};
 }
}
function exportCSV(){
 const rows=[['titulo','marca','servidor','plataforma','estado','fecha','hora','alcance','interacciones','responsable'],
  ...byBrand(POSTS).map(p=>[p.t,p.brand,p.srv,PF[p.pf].n,p.st,p.d,p.h,p.reach||'',p.eng||'',p.owner])];
 const cell=v=>{const s=String(v??'');return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob(['﻿'+rows.map(r=>r.map(cell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'}));
 a.download='gtahub-publicaciones.csv';a.click();URL.revokeObjectURL(a.href);
 toast('CSV exportado');
}
/* ---------- WIRING ---------- */
function wire(){
 $$('[data-post]').forEach(e=>e.onclick=ev=>{ev.stopPropagation();openPost(e.dataset.post)});
 $$('[data-task]').forEach(e=>e.onclick=()=>openTask(e.dataset.task));
 $$('[data-idea]').forEach(e=>e.onclick=()=>openIdea(e.dataset.idea));
 $$('[data-trend]').forEach(e=>e.onclick=()=>openTrend(e.dataset.trend));
 $$('[data-goto]').forEach(e=>e.onclick=()=>go(e.dataset.goto));
 $$('[data-tf]').forEach(e=>e.onclick=()=>{taskFilter=e.dataset.tf;render()});
 $$('[data-pubf]').forEach(e=>e.onclick=()=>{pubFilter=e.dataset.pubf;render()});
 $$('[data-pff]').forEach(e=>e.onclick=()=>{pfFilter=pfFilter===e.dataset.pff?null:e.dataset.pff;render()});
 $$('[data-if]').forEach(e=>e.onclick=()=>{ideaFilter=e.dataset.if;render()});
 $$('[data-is]').forEach(e=>e.onclick=()=>{ideaSort=e.dataset.is;render()});
 $$('[data-mode]').forEach(e=>e.onclick=()=>{pubMode=e.dataset.mode;render()});
 $$('[data-per]').forEach(e=>e.onclick=()=>{period=e.dataset.per;render()});
 $$('[data-mon]').forEach(e=>e.onclick=()=>{selMonth=e.dataset.mon;render()});
 $$('[data-new]').forEach(e=>e.onclick=()=>newForm(e.dataset.new,view==='calendario'?selDay:null));
 $$('[data-day]').forEach(e=>e.onclick=()=>{selDay=e.dataset.day;render()});
 $$('[data-tip]').forEach(e=>{e.onmouseenter=()=>showTip(e);e.onmouseleave=hideTip});
 const q=$('#trendQ');if(q)q.oninput=()=>searchTrends(q.value);
 if(view==='pendientes')wireDnD();
 if(view==='calendario')wireCalDnD();
 $$('.so').forEach(e=>e.onclick=()=>{const k=e.dataset.sort;pubSort=pubSort.k===k?{k,dir:-pubSort.dir}:{k,dir:k==='reach'||k==='eng'||k==='d'?-1:1};render()});
}
function showTip(el){const t=$('#tip'),r=el.getBoundingClientRect();t.textContent=el.dataset.tip;t.classList.add('on');t.style.left=(r.left+r.width/2)+'px';t.style.top=(r.top-10)+'px'}
const hideTip=()=>$('#tip').classList.remove('on');
function searchTrends(v){
 const l=$('#trendList');l.innerHTML='<div class="skrow"><div class="sk" style="width:56px;height:24px"></div><div style="flex:1"><div class="sk" style="height:11px;width:60%"></div><div class="sk" style="height:9px;width:34%;margin-top:7px"></div></div></div>'.repeat(3);
 clearTimeout(searchTrends._h);
 searchTrends._h=setTimeout(()=>{
  const t=v.trim().toLowerCase(),r=TRENDS.filter(x=>!t||x.t.toLowerCase().includes(t)||x.note.toLowerCase().includes(t));
  l.innerHTML=r.map(trendRow).join('')||`<div class="empty" style="padding:22px"><div>Sin resultados para «${v}».</div></div>`;
  $$('[data-trend]',l).forEach(e=>e.onclick=()=>openTrend(e.dataset.trend));
 },380);
}
/* ---------- PANEL LATERAL ---------- */
function drawer(title,body,foot,instant){
 $('#dTitle').textContent=title;
 $('#dFoot').innerHTML=foot||'';$('#drawer').classList.add('on');$('#scrim').classList.add('on');
 const paint=()=>{$('#dBody').innerHTML=body;
  $$('#dBody [data-chk]').forEach(b=>b.onchange=async()=>{
   const[id,i]=b.dataset.chk.split(':');const p=POSTS.find(x=>x.id===id);
   p.chkState[+i]=b.checked;
   const done=p.chkState.filter(Boolean).length;
   $('#chkProg').style.width=(done/p.chkState.length*100)+'%';$('#chkNum').textContent=done+'/'+p.chkState.length;
   try{await dbPatchPost(p.id,{chk_state:p.chkState})}catch(e){oops(e)}
  })};
 if(instant)paint();
 else{$('#dBody').innerHTML='<div class="sk" style="height:190px;border-radius:10px"></div><div class="sk" style="height:12px;width:60%"></div><div class="sk" style="height:12px;width:40%"></div>';setTimeout(paint,300)}
}
const closeDrawer=()=>{$('#drawer').classList.remove('on');$('#scrim').classList.remove('on')};
$('#dClose').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;
function openPost(id){const p=POSTS.find(x=>x.id===id);if(!p)return;const done=p.chkState.filter(Boolean).length;
 drawer(p.t,`<div class="previewwrap"><img class="prev" src="${p.thumb}" alt=""><span class="scan"></span><span class="hud tl"></span><span class="hud tr"></span><span class="hud bl"></span><span class="hud br"></span></div>
 <div style="display:flex;gap:7px;flex-wrap:wrap">${pill(p.pf)}<span class="st ${p.st}">${p.st.toUpperCase()}</span><span class="tag ${p.brand==='ESP'?'esp':'pe'}">${(p.srv||p.brand).toUpperCase()}</span></div>
 <dl class="kv"><dt>Publicación</dt><dd>${dlabel(p.d)}${p.h?' · '+p.h:''}</dd><dt>Formato</dt><dd>${p.fmt}</dd><dt>Responsable</dt><dd>${p.owner}</dd>${p.url?`<dt>Enlace</dt><dd><a href="${p.url}" target="_blank" style="color:var(--crimson)">${p.url}</a></dd>`:''}<dt>Alcance</dt><dd>${p.reach?fmt(p.reach)+' · '+fmt(p.eng)+' interacciones · '+(p.eng/p.reach*100).toFixed(1)+'%':'Pendiente de publicar'}</dd></dl>
 ${p.copy?`<div><div class="lbl" style="margin-bottom:8px">TEXTO DE LA PUBLICACIÓN</div><div class="copybox">${p.copy}</div></div>`:''}
 ${p.chk.length?`<div><div class="lbl" style="margin-bottom:10px;display:flex;justify-content:space-between">CHECKLIST<span id="chkNum" style="color:var(--crimson)">${done}/${p.chkState.length}</span></div><div class="tr mini" style="margin-bottom:12px"><i id="chkProg" style="width:${done/p.chkState.length*100}%"></i></div><div class="chkl">${p.chk.map((c,i)=>`<label><input type="checkbox" data-chk="${p.id}:${i}" ${p.chkState[i]?'checked':''}><span>${c}</span></label>`).join('')}</div></div>`:''}`,
 `<button class="btn gh2" id="pCopy">Copiar texto</button>${p.st!=='publicada'?`<button class="btn gh2" id="pDate">Reprogramar</button><button class="btn" style="flex:1" id="pPub">Marcar publicada</button>`:`<button class="btn" style="flex:1" id="pMet">Registrar métricas</button>`}<button class="btn gh2" id="pDel" title="Eliminar">✕</button>`);
 setTimeout(()=>{
  const c=$('#pCopy');if(c)c.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(p.copy||p.t);toast('Texto copiado al portapapeles')};
  const d=$('#pDate');if(d)d.onclick=()=>{const nd=prompt('Nueva fecha (AAAA-MM-DD):',p.d||todayISO());if(!nd)return;
   persist(()=>dbPatchPost(p.id,{publish_date:nd,status:'programado'}),'Publicación reprogramada al '+dlabel(nd));closeDrawer()};
  const pb=$('#pPub');if(pb)pb.onclick=()=>{persist(()=>dbPatchPost(p.id,{status:'publicado',publish_date:p.d||todayISO()}),'Marcada como publicada');closeDrawer()};
  const pm=$('#pMet');if(pm)pm.onclick=()=>{const r=prompt('Alcance (views):',p.reach||'');if(r===null)return;
   const e2=prompt('Interacciones:',p.eng||'');if(e2===null)return;
   persist(()=>dbPatchPost(p.id,{views:parseInt(r||'0',10),interactions:parseInt(e2||'0',10)}),'Métricas guardadas');closeDrawer()};
  const del=$('#pDel');if(del)del.onclick=()=>{if(!confirm('¿Eliminar esta publicación?'))return;
   persist(()=>dbDeletePost(p.id),'Publicación eliminada');closeDrawer()};
 },instantDelay());
}
const instantDelay=()=>320;
function openTask(id){const t=TASKS.find(x=>x.id===id);if(!t)return;const di=dueInfo(t);
 drawer(t.t,`<div style="display:flex;gap:7px;flex-wrap:wrap"><span class="tag ${t.prio}">${t.prio.toUpperCase()}</span><span class="tag ${t.brand==='ESP'?'esp':'pe'}">${(t.srv||t.brand).toUpperCase()}</span>${t.pf?pill(t.pf):''}</div>
 ${t.desc?`<p style="color:var(--tx2);font-size:12.5px">${t.desc}</p>`:''}
 <dl class="kv"><dt>Estado</dt><dd>${({todo:'Por hacer',prog:'En progreso',done:'Listo'})[t.col]}</dd><dt>Responsable</dt><dd>${t.owner}</dd><dt>Entrega</dt><dd${di.late?' style="color:var(--bad)"':''}>${di.label}</dd></dl>
 <div><div class="lbl" style="margin-bottom:8px">PROGRESO · ${t.prog}%</div><div class="tr mini"><i style="width:${t.prog}%"></i></div></div>`,
 `<button class="btn gh2" id="tProg">Progreso…</button>${t.col!=='done'?`<button class="btn" style="flex:1" id="tNext">Avanzar estado</button>`:`<button class="btn gh2" style="flex:1" id="tBack">Reabrir</button>`}<button class="btn gh2" id="tDel" title="Eliminar">✕</button>`);
 setTimeout(()=>{
  const n=$('#tNext');if(n)n.onclick=()=>{const to=t.col==='todo'?'prog':'done';
   persist(()=>dbPatchTask(t.id,{col:to,prog:to==='done'?100:Math.max(t.prog,25)}),'Tarea → '+(to==='done'?'Listo':'En progreso'));closeDrawer()};
  const b=$('#tBack');if(b)b.onclick=()=>{persist(()=>dbPatchTask(t.id,{col:'prog',prog:50}),'Tarea reabierta');closeDrawer()};
  const pr=$('#tProg');if(pr)pr.onclick=()=>{const v=prompt('Progreso (0-100):',t.prog);if(v===null)return;
   const n2=Math.max(0,Math.min(100,parseInt(v||'0',10)));
   persist(()=>dbPatchTask(t.id,{prog:n2,col:n2===100?'done':n2>0?'prog':t.col==='done'?'prog':t.col}),'Progreso actualizado');closeDrawer()};
  const del=$('#tDel');if(del)del.onclick=()=>{if(!confirm('¿Eliminar esta tarea?'))return;
   persist(()=>dbDeleteTask(t.id),'Tarea eliminada');closeDrawer()};
 },instantDelay());
}
function openIdea(id){const i=IDEAS.find(x=>x.id===id);if(!i)return;
 drawer(i.t,`<div style="display:flex;gap:7px;flex-wrap:wrap">${pill(i.pf)}${brandTag(i.brand)}<span class="st ${i.st==='aprobada'?'publicada':'programada'}">${i.st==='aprobada'?'APROBADA':'EN REVISIÓN'}</span></div>
 <p style="color:var(--tx2);font-size:12.5px">${i.d}</p>
 ${i.why?`<div><div class="lbl" style="margin-bottom:8px">POR QUÉ AHORA</div><div class="copybox">${i.why}</div></div>`:''}
 ${i.copy?`<div><div class="lbl" style="margin-bottom:8px">COPY SUGERIDO</div><div class="copybox">${i.copy}</div></div>`:''}
 <div style="display:flex;gap:18px"><div style="flex:1"><div class="lbl" style="margin-bottom:7px">IMPACTO ${i.imp}/5</div><div class="pips">${[1,2,3,4,5].map(n=>`<i class="${n<=i.imp?'f':''}"></i>`).join('')}</div></div><div style="flex:1"><div class="lbl" style="margin-bottom:7px">ESFUERZO ${i.eff}/5</div><div class="pips e">${[1,2,3,4,5].map(n=>`<i class="${n<=i.eff?'f':''}"></i>`).join('')}</div></div></div>`,
 `${i.copy?'<button class="btn gh2" id="iCopy">Copiar copy</button>':''}${i.st!=='aprobada'?'<button class="btn gh2" id="iOk">Aprobar</button>':''}<button class="btn" style="flex:1" id="iConv">Convertir en publicación</button><button class="btn gh2" id="iDel" title="Descartar">✕</button>`);
 setTimeout(()=>{
  const c=$('#iCopy');if(c)c.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(i.copy);toast('Copy copiado')};
  const ok=$('#iOk');if(ok)ok.onclick=()=>{persist(()=>dbPatchIdea(i.id,{status:'aprobada'}),'Idea aprobada');closeDrawer()};
  const cv=$('#iConv');if(cv)cv.onclick=()=>{
   persist(async()=>{await dbCreatePost({t:i.t,brand:i.brand,srv:i.brand==='PE'?'Pegasus':'Orion',pf:i.pf,st:'borrador',copy:i.copy||i.d,chk:['Arte','Copy revisado','Programada']});
    await dbPatchIdea(i.id,{status:'convertida'})},'Idea convertida en borrador de publicación');closeDrawer()};
  const del=$('#iDel');if(del)del.onclick=()=>{if(!confirm('¿Descartar esta idea?'))return;
   persist(()=>dbPatchIdea(i.id,{status:'descartada'}),'Idea descartada');closeDrawer()};
 },instantDelay());
}
function openTrend(id){const r=TRENDS.find(x=>x.id===id);if(!r)return;
 drawer(r.t,`<div style="display:flex;gap:7px;flex-wrap:wrap"><span class="st ${REL_ST[r.rel]||'borrador'}">RELEVANCIA ${r.rel.toUpperCase()}</span>${r.d?`<span class="tag esp">${dlabel(r.d).toUpperCase()}</span>`:''}</div>
 <div><div class="lbl" style="margin-bottom:8px">ANÁLISIS</div><div class="copybox">${r.note}</div></div>
 ${r.src?`<dl class="kv"><dt>Fuente</dt><dd><a href="${r.src}" target="_blank" style="color:var(--crimson)">Abrir fuente ↗</a></dd></dl>`:''}
 <div><div class="lbl" style="margin-bottom:8px">IDEAS RELACIONADAS</div>${IDEAS.slice(0,3).map(i=>`<div class="row" data-idea="${i.id}"><div class="t">${i.t}<div class="meta" style="margin-top:3px">Impacto ${i.imp}/5 · esfuerzo ${i.eff}/5</div></div>${brandTag(i.brand)}</div>`).join('')||'<div class="meta">Todavía no hay ideas. Crea una desde esta tendencia.</div>'}</div>`,
 `<button class="btn" style="flex:1" id="rIdea">Crear idea desde la tendencia</button>`);
 setTimeout(()=>{
  $$('#dBody [data-idea]').forEach(e=>e.onclick=()=>openIdea(e.dataset.idea));
  const b=$('#rIdea');if(b)b.onclick=()=>{
   persist(()=>dbCreateIdea({t:r.t,brand:brand==='PE'?'PE':'ESP',pf:'tt',imp:4,eff:3,d:r.note,why:'Tendencia del radar ('+r.rel+' relevancia).'}),'Idea creada desde la tendencia');closeDrawer()};
 },instantDelay());
}
/* ---------- NOTIFICACIONES ---------- */
function renderNotis(){
 const N=buildNotis();
 $('#notiList').innerHTML=N.map((n,i)=>`<div class="row" data-noti="${i}"><span class="prio ${n.k}"></span><div class="t" style="white-space:normal">${n.t}<div class="meta" style="margin-top:3px">${n.m}</div></div></div>`).join('')||'<div class="meta" style="padding:10px">Sin avisos. Todo bajo control.</div>';
 $$('[data-noti]').forEach(e=>e.onclick=()=>{$('#notiPanel').classList.remove('on');N[+e.dataset.noti].go()});
}
$('#notiBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('#notiPanel');p.classList.toggle('on');if(p.classList.contains('on'))renderNotis()});
document.addEventListener('click',e=>{if(!e.target.closest('#notiPanel')&&!e.target.closest('#notiBtn'))$('#notiPanel').classList.remove('on')});
/* ---------- BUSCADOR GLOBAL ---------- */
function openOmni(){$('#omni').classList.add('on');const i=$('#omniQ');i.value='';i.focus();omniSearch('')}
$('#omniQ').addEventListener('input',e=>omniSearch(e.target.value));
$('#omni').addEventListener('click',e=>{if(e.target.id==='omni')$('#omni').classList.remove('on')});
$('#globalSearch').addEventListener('focus',openOmni);
$('#mSearch').addEventListener('click',openOmni);
function omniSearch(v){
 const r=$('#omniRes');r.innerHTML='<div class="skrow"><div class="sk" style="width:38px;height:38px"></div><div style="flex:1"><div class="sk" style="height:11px;width:55%"></div><div class="sk" style="height:9px;width:30%;margin-top:7px"></div></div></div>'.repeat(4);
 clearTimeout(omniSearch._h);
 omniSearch._h=setTimeout(()=>{
  const t=v.trim().toLowerCase();
  const P=POSTS.filter(p=>!t||p.t.toLowerCase().includes(t)||(p.copy||'').toLowerCase().includes(t)).slice(0,4);
  const T=TASKS.filter(x=>!t||x.t.toLowerCase().includes(t)).slice(0,3);
  const I=IDEAS.filter(x=>!t||x.t.toLowerCase().includes(t)).slice(0,3);
  const R=TRENDS.filter(x=>!t||x.t.toLowerCase().includes(t)||x.note.toLowerCase().includes(t)).slice(0,3);
  const sec=(n,h)=>h?`<div class="lbl" style="padding:10px 10px 6px">${n}</div>${h}`:'';
  r.innerHTML=sec('PUBLICACIONES',P.map(p=>`<div class="row" data-o="post:${p.id}"><img class="thumb" src="${p.thumb}" alt=""><div class="t">${p.t}<div class="meta" style="margin-top:3px">${dlabel(p.d)}${p.h?' · '+p.h:''}</div></div>${pill(p.pf)}</div>`).join(''))
   +sec('PENDIENTES',T.map(x=>`<div class="row" data-o="task:${x.id}"><div class="t">${x.t}<div class="meta" style="margin-top:3px">${dueInfo(x).label}</div></div><span class="tag ${x.prio}">${x.prio.toUpperCase()}</span></div>`).join(''))
   +sec('IDEAS',I.map(x=>`<div class="row" data-o="idea:${x.id}"><div class="t">${x.t}</div>${pill(x.pf)}</div>`).join(''))
   +sec('TENDENCIAS',R.map(x=>`<div class="row" data-o="trend:${x.id}"><div class="t">${x.t}<div class="meta" style="margin-top:3px">${x.note.slice(0,60)}…</div></div><span class="st ${REL_ST[x.rel]}">${x.rel.toUpperCase()}</span></div>`).join(''))
   ||`<div class="empty"><div>Sin resultados para «${v}».</div></div>`;
  $$('[data-o]',r).forEach(e=>e.onclick=()=>{const [k,id]=e.dataset.o.split(':');$('#omni').classList.remove('on');({post:openPost,task:openTask,idea:openIdea,trend:openTrend})[k](id)});
 },400);
}
/* ---- reprogramar arrastrando en el calendario ---- */
function wireCalDnD(){
 let id=null;
 $$('.ev[draggable]').forEach(el=>{
  el.addEventListener('dragstart',e=>{e.stopPropagation();id=el.dataset.ev;el.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
  el.addEventListener('dragend',()=>{el.classList.remove('dragging');$$('.cl').forEach(c=>c.classList.remove('over'))});
 });
 $$('.cl[data-day]').forEach(cl=>{
  cl.addEventListener('dragover',e=>{e.preventDefault();cl.classList.add('over')});
  cl.addEventListener('dragleave',()=>cl.classList.remove('over'));
  cl.addEventListener('drop',e=>{e.preventDefault();cl.classList.remove('over');if(!id)return;
   const p=POSTS.find(x=>x.id===id),prev=p.d,nd=cl.dataset.day;id=null;
   if(prev!==nd){selDay=nd;
    persist(()=>dbPatchPost(p.id,{publish_date:nd}),'«'+p.t.slice(0,30)+'…» movida al '+dlabel(nd),()=>dbPatchPost(p.id,{publish_date:prev}).then(hubLoad))}
  });
 });
}
/* ---- plegar la barra lateral ---- */
$('#sideToggle').addEventListener('click',()=>{sideOpen=!sideOpen;document.querySelector('#app').classList.toggle('narrow',!sideOpen)});
