/* GTAHUB Content Hub — lógica e interacciones (conectado a Supabase) */
let pubSort={k:'d',dir:-1},sideOpen=true,undoFn=null;
let brand='ALL',view='inicio',selDay=todayISO(),selMonth=todayISO().slice(0,7),
    pubFilter='todas',pfFilter=null,pubMode='tabla',taskFilter='todas',
    ideaFilter='todas',ideaSort='impacto',period='30',metSub='contenido';
const byBrand=a=>brand==='ALL'?a:a.filter(x=>normMarca(x.brand)===brand);
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
/* Los pasos y las etiquetas de marca salen de MARCAS: con BR ya no basta
   escribir «ESP · PE» a mano. */
const BOOTSTEPS=['Conectando con el hub',...MARCA_IDS.map(id=>'Sincronizando GTAHUB '+id),'Cargando calendario y métricas','Listo'];
$('#loginMarcas').textContent='GTAHUB '+MARCA_IDS.join(' · ');
$('#bootMarcas').textContent=MARCA_IDS.join(' · ');
/* Piso corto para que la pantalla de carga no parpadee cuando la
   respuesta es muy rápida. Antes los pasos avanzaban con un
   temporizador fijo de 320ms cada uno más 300ms al final: 1.6s
   mínimo aunque los datos llegaran en 100ms. Ahora los pasos
   intermedios son informativos y el último lo marca la petición. */
const BOOT_PISO=420;
function boot(){
 $('#login').classList.add('hide');$('#boot').classList.remove('hide');
 const t0=performance.now();
 let paso=0;
 const pinta=()=>{$('#bootBar').style.width=Math.round((paso+1)/BOOTSTEPS.length*100)+'%';
  $('#bootSt').textContent=BOOTSTEPS[paso]};
 pinta();
 // Avanza solo hasta el penúltimo paso: el último lo cierra la carga real.
 const avance=setInterval(()=>{if(paso<BOOTSTEPS.length-2){paso++;pinta()}},130);
 const terminar=()=>{
  clearInterval(avance);paso=BOOTSTEPS.length-1;pinta();
  setTimeout(enter,Math.max(0,BOOT_PISO-(performance.now()-t0)));
 };
 const reintentar=()=>{
  clearInterval(avance);
  $('#bootSt').textContent='Sin conexión con la base. Reintentando…';
  hubLoad().then(terminar).catch(()=>{$('#bootSt').textContent='No se pudo conectar. Recarga la página.'});
 };
 hubLoad().then(terminar).catch(reintentar);
}
function enter(){
 $('#boot').classList.add('hide');$('#app').classList.remove('hide');
 const u=HUB.user||{name:'Equipo',role:''};
 $('#meName').textContent=u.name;$('#meRole').textContent=(u.role||'').toUpperCase();
 $('#meAv').textContent=u.name.slice(0,2).toUpperCase();
 pintarServidores();
 render();
}
$('#logout').addEventListener('click',()=>location.reload());

/* ---------- NAVEGACIÓN ---------- */
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
function go(v){if(view===v)return;view=v;$$('[data-view]').forEach(b=>b.classList.toggle('act',b.dataset.view===v));render()}
$$('#brandSeg button').forEach(b=>b.addEventListener('click',()=>{
 brand=b.dataset.brand;
 $$('#brandSeg button').forEach(x=>x.classList.toggle('act',x===b));
 pintarServidores();render();
}));
/* Lista legible de los servidores en juego segun la marca activa. */
function listaServidores(){
 const ids=brand==='ALL'?MARCA_IDS:[normMarca(brand)];
 const s=ids.flatMap(id=>MARCAS[id].servidores);
 return s.length>1?s.slice(0,-1).join(', ')+' y '+s[s.length-1]:s[0];
}
/* Pie del selector: que marca se esta viendo y con que servidores. */
function pintarServidores(){
 const el=$('#brandSrv');if(!el)return;
 el.innerHTML=(brand==='ALL'?MARCA_IDS:[normMarca(brand)])
  .map(id=>`<span class="bsrv"><b class="tag ${MARCAS[id].clase}">${id}</b>${MARCAS[id].servidores.join(' · ')}</span>`).join('');
}
const VIEWS=['inicio','pendientes','publicaciones','calendario','ideas','metricas','brief'];
const TITLES={inicio:'INICIO',pendientes:'PENDIENTES',publicaciones:'PUBLICACIONES',calendario:'CALENDARIO',ideas:'IDEAS',metricas:'MÉTRICAS',brief:'BRIEF'};
document.addEventListener('keydown',e=>{
 if($('#login').classList.contains('hide')===false)return;
 if(e.key==='Escape'){closeDrawer();$('#omni').classList.remove('on');$('#notiPanel').classList.remove('on')}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openOmni()}
 if(!e.metaKey&&!e.ctrlKey&&/^[1-7]$/.test(e.key)&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){go(VIEWS[+e.key-1])}
});

function skeleton(n=5){return `<div class="card">${'<div class="skrow"><div class="sk" style="width:38px;height:38px"></div><div style="flex:1"><div class="sk" style="height:11px;width:52%"></div><div class="sk" style="height:9px;width:28%;margin-top:7px"></div></div><div class="sk" style="width:74px;height:22px"></div></div>'.repeat(n)}</div>`}
const VISTAS={inicio:vInicio,pendientes:vPend,publicaciones:vPub,calendario:vCal,ideas:vIdeas,metricas:vMet,brief:vBrief};
function render(){
 $('#title').textContent=TITLES[view];
 $('#cntPend').textContent=TASKS.filter(t=>t.col!=='done').length||'';
 $('#cntPub').textContent=POSTS.length||'';
 $('#cntIdeas').textContent=IDEAS.length||'';
 $('#notiBdg').textContent=buildNotis().length||'';
 const v=$('#view');
 v.scrollTop=0;
 /* Los datos viven en memoria desde el arranque: armar la vista es
    trabajo síncrono de unos pocos milisegundos. Antes se pintaba un
    esqueleto y se esperaban 300ms fijos antes de dibujar de verdad,
    lo que sumaba más de medio segundo a cada cambio de pestaña sin
    que hubiera nada que esperar. El esqueleto solo aparece si de
    verdad todavía no hay datos. */
 if(!HUB.online){
  v.innerHTML=`<div class="sk" style="height:210px;border-radius:14px"></div><div class="g4">${'<div class="card" style="height:108px"><div class="sk" style="height:9px;width:50%"></div><div class="sk" style="height:26px;width:38%;margin-top:14px"></div></div>'.repeat(4)}</div>${skeleton()}`;
  return;
 }
 v.innerHTML=VISTAS[view]();
 v.classList.remove('in');void v.offsetWidth;v.classList.add('in');
 wire();
}
const HERO_SUB={
 inicio:()=>brand==='ALL'
  ?`Todo lo que sale de ${MARCA_IDS.map(i=>MARCAS[i].nombre).join(', ').replace(/, ([^,]*)$/,' y $1')}, en una sola vista.`
  :`${marca(brand).nombre} · ${marca(brand).idioma} · ${servidoresDe(brand).join(' y ')}.`,
 brief:()=>brand==='ALL'?'La guía de voz de cada marca, para que todo lo que se genere suene igual.'
  :`Cómo habla ${marca(brand).nombre} y con qué cuentas sale.`,
 pendientes:()=>`${byBrand(TASKS).filter(t=>t.col!=='done').length} tareas abiertas entre ${listaServidores()}.`,
 publicaciones:()=>`${byBrand(POSTS).length} piezas publicadas, programadas y en borrador.`,
 calendario:()=>calTitle(selMonth)+' · '+byBrand(POSTS).filter(p=>p.d&&p.d.startsWith(selMonth)).length+' publicaciones en el mes.',
 ideas:()=>`${byBrand(IDEAS).length} ideas priorizadas por impacto y esfuerzo, cruzadas con el radar de tendencias.`,
 metricas:()=>{const s=periodPosts(period);return `Últimos ${period} días · ${fmt(s.reduce((a,p)=>a+p.reach,0))} de alcance y ${fmt(s.reduce((a,p)=>a+p.eng,0))} interacciones.`}};
function hero(extra=''){const h=HEROES[view];return `<div class="hero"><img class="bg" src="${h.bg}" alt=""><span class="glow"></span><img class="char" src="${h.char}" alt=""><span class="diag"></span><span class="scan"></span><span class="vig"></span><span class="hud tl"></span><span class="hud tr"></span><span class="hud bl"></span><span class="hud br"></span><div class="in"><div class="lbl" style="margin-bottom:9px">GTAHUB · ${brand==='ALL'?MARCA_IDS.join(' + '):normMarca(brand)}</div><h3>${h.h}</h3><p>${HERO_SUB[view]()}</p>${extra}</div></div>`}
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
 /* Con las tres marcas juntas, los totales no dicen de quien es que:
    esta tira reparte el mismo dato por marca y deja entrar a cada una. */
 const desglose=brand!=='ALL'?'':`<div class="marcas">${MARCA_IDS.map(id=>{
  const mp=POSTS.filter(x=>normMarca(x.brand)===id),mt=TASKS.filter(x=>normMarca(x.brand)===id);
  const abiertas=mt.filter(x=>x.col!=='done').length;
  const atrasadas=mt.filter(x=>x.col!=='done'&&dueInfo(x).late).length;
  return `<button class="mcard" data-brand-go="${id}">
   <span class="mhead"><b class="tag ${MARCAS[id].clase}">${id}</b><span class="meta">${MARCAS[id].servidores.join(' · ')}</span></span>
   <span class="mnums"><span><i>${pubIn(mp,daysAgoISO(7),'9999').length}</i>publicadas 7d</span><span><i>${mp.filter(x=>x.st!=='publicada').length}</i>en cola</span><span><i class="${atrasadas?'dn':''}">${abiertas}</i>pendientes</span></span>
  </button>`}).join('')}</div>`;
 return hero(`<div class="heroacts"><button class="btn sm" data-new="publicación">+<span class="lgtxt"> Nueva publicación</span></button><button class="btn gh2 sm" data-goto="calendario">Ver<span class="lgtxt"> calendario</span></button></div>`)
 +desglose
 +`<div class="g4">
 ${kpi('PUBLICADAS · 7 DÍAS',p7,p7>=p7prev?`<span class="up">▲ +${p7-p7prev}</span> vs. semana previa`:`<span class="dn">▼ ${p7-p7prev}</span> vs. semana previa`,sparkOf(wkSeries))}
 ${kpi('PROGRAMADAS',prog.length,`${in48} en las próximas 48 h`)}
 ${kpi('PENDIENTES ABIERTOS',byBrand(TASKS).filter(t=>t.col!=='done').length,late?`<span class="dn">${late} fuera de plazo</span>`:'Todo en plazo')}
 ${kpi('ALCANCE · 30 DÍAS',reach30?fmt(reach30):'—',reach30?'Suma de views registradas':'Captura métricas al publicar')}</div>
 <div class="g2">
 <div class="card"><header><h3>PRÓXIMAS PROGRAMADAS</h3><button class="chip" data-goto="publicaciones">VER TODO</button></header>
 ${prog.slice(0,5).map(p=>`<div class="row" data-post="${p.id}"><img class="thumb" src="${p.thumb}" alt=""><div class="t">${p.t}<div class="meta" style="margin-top:3px">${p.fmt}</div></div>${brandTag(p.brand)}${pill(p.pf)}<span class="meta">${dlabel(p.d)}${p.h?' '+p.h:''}</span></div>`).join('')||emptyState('No hay publicaciones programadas para esta marca.','programadas')}</div>
 <div class="card"><header><h3>PENDIENTES URGENTES</h3><span class="tag alta">${urg.length}</span></header>
 ${urg.map(t=>{const di=dueInfo(t);return `<div class="row" data-task="${t.id}"><span class="prio ${t.prio}"></span><div class="t">${t.t}<div class="meta" style="margin-top:3px"${di.late?' style="color:var(--bad)"':''}>${di.label} · ${t.owner}</div></div><span class="tag ${t.prio}">${t.prio.toUpperCase()}</span></div>`}).join('')||emptyState('Ninguna tarea vence pronto ni está fuera de plazo.','urgentes')}</div></div>
 <div class="g2">
 <div class="card"><header><h3>CADENCIA SEMANAL · PUBLICADAS VS. META</h3><span class="lbl">ESTA SEMANA</span></header>
 ${cad.map(([p,a,b])=>`<div class="meter"><div class="lg">${pill(p)}<span><b style="color:var(--tx)">${a}</b> / ${b}</span></div><div class="tr"><i style="width:${Math.min(100,a/b*100)}%;background:var(--${p})"></i></div></div>`).join('')}</div>
 <div class="card"><header><h3>ÚLTIMAS TENDENCIAS</h3><button class="chip" data-goto="ideas">EXPLORAR</button></header>
 ${TRENDS.slice(0,5).map(trendRow).join('')||emptyState('El radar de los lunes todavía no carga tendencias.','tendencias')}</div></div>`;
}
const REL_ST={alta:'publicada',media:'programada',baja:'borrador'};
function trendRow(r){return `<div class="trend" data-trend="${r.id}"><div class="t" style="flex:1;min-width:0;font-weight:600;font-size:12.5px">${r.t}<div class="meta" style="margin-top:3px">${r.note.slice(0,90)}${r.note.length>90?'…':''}</div></div><span class="st ${REL_ST[r.rel]||'borrador'}">${r.rel.toUpperCase()}</span></div>`}
/* Estados vacíos. Cada uno dice qué pasa con voz de transmisión (código de
   señal + titular) y, si hay algo que hacer, ofrece el botón ahí mismo. El
   personaje cambia por contexto y nunca repite el del hero de la vista. */
const ESTADOS_VACIOS={
 programadas:{cod:'AGENDA LIBRE',h:'NADA EN COLA',char:'char-redsuit',accion:['+ Nueva publicación','data-new="publicación"']},
 urgentes:{cod:'ZONA DESPEJADA',h:'SIN URGENCIAS',char:'char-varsity'},
 tendencias:{cod:'RADAR EN ESPERA',h:'SIN SEÑAL DEL SECTOR',char:'char-woman'},
 filtros:{cod:'SIN COINCIDENCIAS',h:'NADA CON ESTOS FILTROS',char:'char-redsuit',accion:['Quitar filtros','data-limpiar="pub"']},
 grafica:{cod:'SIN SEÑAL',h:'FALTAN VIEWS',char:'char-redsuit'},
 plataformas:{cod:'SIN SEÑAL',h:'PERIODO EN BLANCO',char:'char-varsity'},
 top:{cod:'SIN RANKING',h:'NADIE EN EL PODIO',char:'char-woman'}};
function emptyState(m,clave='filtros'){
 const e=ESTADOS_VACIOS[clave]||ESTADOS_VACIOS.filtros;
 return `<div class="empty vacio"><span class="hud tl"></span><span class="hud br"></span><div class="txt"><div class="cod"><i></i>${e.cod}</div><h4>${e.h}</h4><p>${m}</p>${e.accion?`<button class="btn gh2 sm" type="button" ${e.accion[1]}>${e.accion[0]}</button>`:''}</div><img src="hub-art/${e.char}.png" alt="" decoding="async" loading="lazy"></div>`;
}
/* Variante compacta para listas y buscadores, donde un personaje no cabe. */
const emptyMini=(cod,m)=>`<div class="empty vacio mini"><div class="txt"><div class="cod"><i></i>${cod}</div><p>${m}</p></div></div>`;

/* ---------- PENDIENTES (kanban con arrastre) ---------- */
function vPend(){
 const ts=byBrand(TASKS).filter(t=>taskFilter==='todas'||t.prio===taskFilter);
 const col=(k,n)=>`<div class="col" data-col="${k}"><h3>${n} <em>${ts.filter(t=>t.col===k).length}</em></h3><div class="drop" data-drop="${k}">${ts.filter(t=>t.col===k).map(t=>{const di=dueInfo(t);return `<div class="tk" draggable="true" data-task="${t.id}"${t.col==='done'?' style="opacity:.75"':''}><span class="prio ${t.prio}"></span><div class="tt">${t.t}</div><div class="mt"><span class="tag ${t.prio}">${t.prio.toUpperCase()}</span><span class="tag ${marca(t.brand).clase}">${(t.srv||t.brand).toUpperCase()}</span>${refBdg('tarea',t.id)}</div>${t.col==='prog'?`<div class="tr mini"><i style="width:${t.prog}%"></i></div>`:''}<div class="ft"><span class="who"><span class="av xs">${t.owner.slice(0,2).toUpperCase()}</span>${t.owner}</span><span${di.late?' style="color:var(--bad)"':''}>${di.label}</span></div></div>`}).join('')||'<div class="meta" style="padding:12px 4px">Suelta una tarjeta aquí.</div>'}</div></div>`;
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
 ${ps.map(p=>`<tr data-post="${p.id}"><td><div style="display:flex;align-items:center;gap:11px"><img class="thumb" src="${p.thumb}" alt=""><b>${p.t}</b>${refBdg('publicacion',p.id)}</div></td><td><span class="tag ${marca(p.brand).clase}">${(p.srv||p.brand).toUpperCase()}</span></td><td>${pill(p.pf)}</td><td><span class="st ${p.st}">${p.st.toUpperCase()}</span></td><td>${dlabel(p.d)}${p.h?' · '+p.h:''}</td><td style="text-align:right">${p.reach?'<b>'+fmt(p.reach)+'</b>':'—'}</td><td style="text-align:right">${p.eng?fmt(p.eng):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
 const gal=`<div class="gal">${ps.map(p=>`<figure class="gcard" data-post="${p.id}"><img src="${p.thumb}" alt=""><span class="scan"></span><span class="gbar ${p.pf}"></span><span class="hud tl"></span><span class="hud br"></span><figcaption><div class="gt">${p.t}</div><div class="gm"><span class="st ${p.st}">${p.st.toUpperCase()}</span><span class="meta">${dlabel(p.d)}${p.h?' · '+p.h:''}</span></div><div class="gm">${pill(p.pf)}${brandTag(p.brand)}${refBdg('publicacion',p.id)}${p.reach?`<span class="meta" style="margin-left:auto">${fmt(p.reach)}</span>`:''}</div></figcaption></figure>`).join('')}</div>`;
 return hero()+`<div class="fbar">${[['todas','TODAS'],['publicada','PUBLICADAS'],['programada','PROGRAMADAS'],['borrador','BORRADORES']].map(([k,n])=>`<button class="chip ${pubFilter===k?'act':''}" data-pubf="${k}">${n} · ${k==='todas'?byBrand(POSTS).length:byBrand(POSTS).filter(p=>p.st===k).length}</button>`).join('')}<span style="width:1px;height:22px;background:var(--line)"></span>${Object.keys(PF).map(k=>`<button class="chip ${pfFilter===k?'act':''}" data-pff="${k}">${PF[k].n}</button>`).join('')}
 <div class="seg sm" style="margin-left:auto;width:150px"><button class="${pubMode==='tabla'?'act':''}" data-mode="tabla">TABLA</button><button class="${pubMode==='galeria'?'act':''}" data-mode="galeria">GALERÍA</button></div><button class="btn sm" data-new="publicación">+ Nueva</button></div>
 ${ps.length?(pubMode==='tabla'?table:gal):emptyState('Ninguna publicación coincide con estado, plataforma y marca.','filtros')}
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
 <div class="g3">${is.map(i=>`<div class="idea" data-idea="${i.id}"><div style="display:flex;gap:6px;flex-wrap:wrap">${pill(i.pf)}${brandTag(i.brand)}${refBdg('idea',i.id)}</div><h4>${i.t}</h4><p>${i.d.slice(0,140)}${i.d.length>140?'…':''}</p><div class="ie"><div><div class="lbl">IMPACTO</div><div class="pips">${[1,2,3,4,5].map(n=>`<i class="${n<=i.imp?'f':''}"></i>`).join('')}</div></div><div><div class="lbl">ESFUERZO</div><div class="pips e">${[1,2,3,4,5].map(n=>`<i class="${n<=i.eff?'f':''}"></i>`).join('')}</div></div></div></div>`).join('')||emptyState('Sin ideas con este filtro. Crea una con «+ Idea».')}</div></div>
 <div class="card"><header><h3>TENDENCIAS DEL SECTOR</h3><span class="lbl">GTA RP · SEMANAL</span></header>
 <div class="srch" style="max-width:none;margin-bottom:12px"><input id="trendQ" placeholder="Buscar tendencia…"></div>
 <div id="trendList">${TRENDS.map(trendRow).join('')||emptyMini('RADAR EN ESPERA','El radar semanal de Claude aún no carga tendencias.')}</div>
 <div class="sugg"><div class="lbl" style="margin-bottom:9px">RADAR DEL HUB</div><p>Cada lunes Claude investiga la escena GTA RP y agrega tendencias nuevas aquí. Haz clic en una para ver el análisis completo y crear una idea a partir de ella.</p></div></div></div>`;
}
/* ---------- MÉTRICAS ---------- */
function periodPosts(per){const from=daysAgoISO(+per);return byBrand(POSTS).filter(p=>p.st==='publicada'&&p.d&&p.d>=from)}
/* Bloque de Manychat en Metricas: compara los dos cortes mas recientes del
   flujo de bienvenida. Si la tabla no existe (migracion sin correr) MANYCHAT
   queda vacio y no se pinta nada: no se inventan numeros. */
function mcDelta(hoy,ayer){
 if(ayer==null)return'';
 const d=hoy-ayer;
 if(!ayer||!d)return'<span class="meta">Sin cambio</span>';
 const pct=Math.round(d/ayer*1000)/10;
 return `<span class="${d>=0?'up':'dn'}">${d>=0?'▲':'▼'} ${Math.abs(pct)}%</span> <span class="meta">${d>=0?'+':''}${fmt(d)} vs. corte anterior</span>`;
}
function mcFila(l,hoy,ayer,max){
 /* ayer en null = no hay corte anterior: ni "antes X" ni barra fantasma,
    que con un solo corte decian "antes 0" y eso no es cierto. */
 const hay=ayer!=null;
 return `<div class="meter"><div class="lg"><span class="lbl">${l}</span><span><b style="color:var(--tx)">${fmt(hoy)}</b>${hay?` <span class="meta">antes ${fmt(ayer)}</span>`:''}</span></div>
 <div class="tr"><i style="width:${Math.max(4,hoy/max*100)}%;background:var(--crimson)"></i></div>
 ${hay?`<div class="tr mini" style="margin-top:4px"><i style="width:${Math.max(2,ayer/max*100)}%;background:var(--line3)"></i></div>`:''}
 <div class="meta" style="margin-top:6px">${hay?mcDelta(hoy,ayer):'<span class="meta">Sin corte anterior para comparar</span>'}</div></div>`;
}
/* Bloque de cuenta en Metricas: la foto de Instagram a 30 dias. Con un solo
   corte muestra los numeros; con dos o mas compara contra el anterior. */
function cuentaBloque(){
 const cs=byBrand(CUENTA);
 const lista=cs.length?cs:CUENTA;
 if(!lista.length)return'';
 const hoy=lista[0],ayer=lista[1]||null;
 const max=Math.max(1,hoy.repro,hoy.espect,ayer?ayer.repro:0,ayer?ayer.espect:0);
 const tipos=[['HISTORIAS',hoy.historias],['REELS',hoy.reels],
              ['PUBLICACIONES',hoy.posts],['EN VIVO',hoy.envivo]];
 const sum=Math.max(1,tipos.reduce((a,t)=>a+t[1],0));
 const seg=hoy.segNetos;
 return `<div class="card" style="margin-top:15px"><header><h3>CUENTA DE INSTAGRAM · ${hoy.dias} DÍAS</h3>
  <span class="lbl">CORTE ${dlabel(hoy.corte)}${ayer?' · ANTES '+dlabel(ayer.corte):''}</span></header>
  <div class="g3 gmet">
   ${mcFila('REPRODUCCIONES',hoy.repro,ayer?ayer.repro:null,max)}
   ${mcFila('ESPECTADORES',hoy.espect,ayer?ayer.espect:null,max)}
   <div class="meter"><div class="lg"><span class="lbl">SEGUIDORES NETOS</span>
    <span><b style="color:var(--tx)">${seg>=0?'+':''}${fmt(seg)}</b>${ayer?` <span class="meta">antes ${ayer.segNetos>=0?'+':''}${fmt(ayer.segNetos)}</span>`:''}</span></div>
    <div class="tr"><i style="width:${Math.min(100,Math.abs(seg)/Math.max(1,Math.abs(seg),ayer?Math.abs(ayer.segNetos):1)*100)}%;background:var(--${seg>=0?'ok':'bad'}-tx)"></i></div>
    <div class="meta" style="margin-top:6px">${ayer?mcDelta(seg,ayer.segNetos):'<span class="meta">Altas menos bajas del periodo</span>'}</div></div>
  </div>
  <div class="mcpie" style="display:block">
   <div class="lbl" style="margin-bottom:9px">VISUALIZACIONES POR TIPO DE CONTENIDO</div>
   ${tipos.map(([l,v])=>`<div class="meter"><div class="lg"><span class="lbl">${l}</span>
     <span><b style="color:var(--tx)">${v?fmt(v):'—'}</b> <span class="meta">${Math.round(v/sum*100)}%</span></span></div>
     <div class="tr"><i style="width:${Math.max(v?3:0,v/sum*100)}%;background:var(--crimson)"></i></div></div>`).join('')}
   <div class="meta" style="margin-top:10px">Interacciones del periodo <b style="color:var(--tx)">${fmt(hoy.inter)}</b>${hoy.nota?' · '+esc(hoy.nota):''}</div>
  </div></div>`;
}
/* Seccion de Manychat: los numeros del corte, el embudo de entrada, el
   recorrido mensaje por mensaje y donde decide la gente. Cada pieza se pinta
   solo si hay datos; sin la migracion de detalle, salen los numeros y un
   aviso, nunca una tabla inventada. */
function panelManychat(){
 const cs=byBrand(MANYCHAT), lista=cs.length?cs:MANYCHAT;
 if(!lista.length) return emptyState('Corre supabase/manychat.sql para traer los cortes del flujo.','grafica');
 const hoy=lista[0],ayer=lista[1]||null;
 const porC=c=>c&&c.contactos?(c.envios/c.contactos).toFixed(2):'—';

 /* Embudo: del primer mensaje, cuantos lo reciben, lo abren y tocan boton. */
 const entrada=MC_PASOS[0]||null;
 const embudo=entrada?[['ENVIADO',entrada.enviado,null],
   ['ENTREGADO',Math.round(entrada.enviado*(entrada.entregado??0)/100),entrada.entregado],
   ['ABIERTO',Math.round(entrada.enviado*(entrada.abierto??0)/100),entrada.abierto],
   ['CLIC',Math.round(entrada.enviado*(entrada.clic??0)/100),entrada.clic]]:[];

 const maxP=Math.max(1,...MC_PASOS.map(p=>p.enviado));
 const grupos={};
 MC_BOTONES.forEach(b=>{(grupos[b.paso]=grupos[b.paso]||[]).push(b)});

 return `<div class="g4">
  ${kpi('CONTACTOS ÚNICOS',fmt(hoy.contactos),ayer?mcDelta(hoy.contactos,ayer.contactos):'Último corte')}
  ${kpi('ENVÍOS DEL FLUJO',fmt(hoy.envios),ayer?mcDelta(hoy.envios,ayer.envios):'Último corte')}
  ${kpi('BANDEJA DE ENTRADA',fmt(hoy.bandeja),ayer?mcDelta(hoy.bandeja,ayer.bandeja):'Conversaciones abiertas')}
  ${kpi('ENVÍOS POR CONTACTO',porC(hoy),ayer?`antes ${porC(ayer)}`:'Veces que se disparó por persona')}</div>

 ${embudo.length?`<div class="card" style="margin-top:15px"><header><h3>ENTRADA DEL FLUJO</h3>
  <span class="lbl">${esc(entrada.titulo||entrada.paso)} · ${fmt(entrada.enviado)} PERSONAS</span></header>
  <div class="bars embudo">${embudo.map(([l,v,pct])=>`<div class="b" data-tip="${l} · ${fmt(v)}${pct!=null?' ('+pct+'%)':''}">
    <div class="bstack"><i style="height:${Math.max(6,v/Math.max(1,entrada.enviado)*100)}%;background:var(--crimson)"></i></div>
    <span>${l}<b style="display:block;color:var(--tx);font-size:12px;margin-top:3px">${pct!=null?pct+'%':fmt(v)}</b></span></div>`).join('')}</div></div>`:''}

 ${MC_PASOS.length?`<div class="card" style="margin-top:15px;padding:16px 16px 6px"><header><h3>RECORRIDO COMPLETO</h3>
  <span class="meta">Todos los pasos con envío</span></header>
  <div class="tblwrap"><table><thead><tr><th style="width:38%">PASO</th><th style="text-align:right">ENVIADO</th>
   <th style="text-align:right">ENTREGADO</th><th style="text-align:right">ABIERTO</th><th style="text-align:right">CLIC</th></tr></thead><tbody>
  ${MC_PASOS.map(p=>`<tr><td><b>${esc(p.paso)}</b><div class="meta" style="margin-top:3px;white-space:normal">${esc(p.titulo||'')}</div></td>
   <td style="text-align:right"><b>${fmt(p.enviado)}</b><div class="tr mini" style="margin-top:5px"><i style="width:${p.enviado/maxP*100}%;background:var(--crimson)"></i></div></td>
   <td style="text-align:right">${p.entregado==null?'—':p.entregado+'%'}</td>
   <td style="text-align:right">${p.abierto==null?'—':p.abierto+'%'}</td>
   <td style="text-align:right">${p.clic==null?'<span class="meta">sin botón</span>':`<span class="${p.clic>=45?'up':''}">${p.clic}%</span>`}</td></tr>`).join('')}
  </tbody></table></div></div>`:`<div class="card" style="margin-top:15px"><div class="meta">Corre supabase/manychat-detalle.sql para ver el recorrido paso por paso.</div></div>`}

 ${MC_BOTONES.length?`<div class="card" style="margin-top:15px"><header><h3>DÓNDE DECIDEN</h3>
  <span class="lbl">CTR POR BOTÓN</span></header>
  ${Object.keys(grupos).map(p=>`<div style="margin-bottom:14px"><div class="lbl" style="margin-bottom:8px">${esc(p)}</div>
   ${grupos[p].map(b=>`<div class="meter"><div class="lg"><span class="meta" style="white-space:normal">${esc(b.boton)}</span>
     <span><b style="color:var(--tx)">${b.ctr==null?'—':b.ctr+'%'}</b></span></div>
     <div class="tr"><i style="width:${Math.max(3,(b.ctr||0))}%;background:var(--crimson)"></i></div></div>`).join('')}</div>`).join('')}
  </div>`:''}`;
}
function mcBloque(){
 if(!MANYCHAT.length)return'';
 const cs=byBrand(MANYCHAT);
 const lista=(cs.length?cs:MANYCHAT);
 const hoy=lista[0],ayer=lista[1]||null;
 const max=Math.max(1,hoy.envios,hoy.contactos,hoy.bandeja,ayer?ayer.envios:0,ayer?ayer.contactos:0,ayer?ayer.bandeja:0);
 const porC=(c)=>c&&c.contactos?(c.envios/c.contactos).toFixed(2):'—';
 const emb=[['ENTREGADO',hoy.entregado],['ABIERTO',hoy.abierto],['CLIC',hoy.clic]].filter(x=>x[1]!=null);
 return `<div class="card" style="margin-top:15px"><header><h3>MANYCHAT · ${hoy.flujo.toUpperCase()}</h3>
  <span class="lbl">CORTE ${dlabel(hoy.corte)}${ayer?' · ANTES '+dlabel(ayer.corte):''}</span></header>
  <div class="g3 gmet">
   ${mcFila('CONTACTOS ÚNICOS',hoy.contactos,ayer?ayer.contactos:null,max)}
   ${mcFila('ENVÍOS DEL FLUJO',hoy.envios,ayer?ayer.envios:null,max)}
   ${mcFila('BANDEJA DE ENTRADA',hoy.bandeja,ayer?ayer.bandeja:null,max)}
  </div>
  <div class="mcpie">
   <span class="meta">Envíos por contacto <b style="color:var(--tx)">${porC(hoy)}</b>${ayer?` · antes ${porC(ayer)}`:''}</span>
   ${emb.length?`<span class="mcemb">${emb.map(([l,v])=>`<span class="lbl">${l} <b style="color:var(--tx)">${v}%</b></span>`).join('')}</span>`:''}
  </div></div>`;
}
function metContenido(){
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
 return `<div class="fbar"><div class="seg sm" style="width:230px">${['7','30','90'].map(k=>`<button class="${period===k?'act':''}" data-per="${k}">${k} DÍAS</button>`).join('')}</div><span class="meta" style="margin-left:auto">Pasa el cursor por las barras para ver el detalle</span><button class="btn sm" data-new="informe">Exportar CSV</button></div>
 <div class="g4">
 ${kpi('ALCANCE',reach?fmt(reach):'—',delta===null?'Sin periodo previo comparable':(delta>=0?`<span class="up">▲ ${delta}%</span>`:`<span class="dn">▼ ${Math.abs(delta)}%</span>`)+' vs. periodo previo')}
 ${kpi('INTERACCIONES',eng?fmt(eng):'—','Suma del periodo')}
 ${kpi('TASA DE INTERACCIÓN',rate,'Interacciones / alcance')}
 ${kpi('PUBLICADAS',ps.length,`En los últimos ${period} días`)}</div>
 <div class="g2"><div class="card"><header><h3>ALCANCE POR ${period==='7'?'DÍA':period==='30'?'TRAMO':'MES'}</h3><span class="lbl">■ VIEWS REGISTRADAS</span></header>${reach?`<div class="bars">${buckets.map(([r,l])=>`<div class="b" data-tip="${l} · ${fmt(r)} de alcance"><div class="bstack"><i style="height:${Math.max(4,r/maxB*100)}%;background:var(--crimson)"></i></div><span>${l}</span></div>`).join('')}</div>`:emptyState('Captura views en tus publicaciones para ver la gráfica.','grafica')}</div>
 <div class="card"><header><h3>ALCANCE POR PLATAFORMA</h3><span class="lbl">${period} DÍAS</span></header>${reach?pfAll.map(([k,v])=>`<div class="meter"><div class="lg">${pill(k)}<span><b style="color:var(--tx)">${v?fmt(v):'—'}</b>${reach?' · '+Math.round(v/reach*100)+'%':''}</span></div><div class="tr"><i style="width:${v/maxPf*100}%;background:var(--${k})"></i></div></div>`).join(''):emptyState('Ninguna plataforma registró alcance en este periodo.','plataformas')}</div></div>
 <div class="card" style="padding:16px 16px 6px"><header><h3>TOP DE PUBLICACIONES</h3><span class="meta">Clic para ver la ficha</span></header>${top.length?`<div class="tblwrap"><table><thead><tr><th style="width:40%">PUBLICACIÓN</th><th>MARCA</th><th>PLATAFORMA</th><th style="text-align:right">ALCANCE</th><th style="text-align:right">INTERACC.</th><th style="text-align:right">TASA</th></tr></thead><tbody>
 ${top.map(p=>`<tr data-post="${p.id}"><td><div style="display:flex;align-items:center;gap:11px"><img class="thumb" src="${p.thumb}" alt=""><b>${p.t}</b></div></td><td><span class="tag ${marca(p.brand).clase}">${(p.srv||p.brand).toUpperCase()}</span></td><td>${pill(p.pf)}</td><td style="text-align:right"><b>${fmt(p.reach)}</b></td><td style="text-align:right">${fmt(p.eng)}</td><td style="text-align:right"><span class="up">${(p.eng/p.reach*100).toFixed(1)}%</span></td></tr>`).join('')}</tbody></table></div>`:emptyState('Todavía no hay publicaciones con métricas en este periodo.','top')}</div>`;
}

/* Metricas se reparte en tres paneles: el contenido propio, la cuenta de
   Instagram y Manychat. Van como sub-pestanas y no como vistas del menu
   porque una octava pestana en la barra movil deja etiquetas de 6px. */
const MET_SUBS=[['contenido','CONTENIDO'],['cuenta','CUENTA'],['manychat','MANYCHAT']];
function vMet(){
 const barra=`<div class="seg sm metsub">${MET_SUBS.map(([k,l])=>
   `<button class="${metSub===k?'act':''}" data-sub="${k}">${l}</button>`).join('')}</div>`;
 const panel=metSub==='cuenta'?(cuentaBloque()||emptyState('Corre supabase/cuenta.sql para ver los cortes de la cuenta.','grafica'))
   :metSub==='manychat'?panelManychat()
   :metContenido();
 return hero()+barra+panel;
}
/* ---------- FORMULARIOS ---------- */
const OPT=(o,sel)=>o.map(([v,n])=>`<option value="${v}"${v===sel?' selected':''}>${n}</option>`).join('');
const PF_OPTS=[['ig','Instagram'],['tt','TikTok'],['dc','Discord'],['em','Email'],['fb','Facebook']];
/* Pares marca·servidor: MARCA_SRV se arma solo desde el catálogo. */
const BR_OPTS=MARCA_SRV;
/* `vf` en vez de f.v||'': el 0 es un valor (progreso 0%), y con || se perdia. */
const vf=f=>f.v==null||f.v===''?'':esc(f.v);
function frm(fields){return fields.map(f=>`<div class="fld"><label class="lbl" for="f_${f.id}">${f.l}</label>${f.tag==='select'?`<select id="f_${f.id}">${f.opts}</select>`:f.tag==='textarea'?`<textarea id="f_${f.id}" rows="${f.rows||3}" placeholder="${f.ph||''}">${vf(f)}</textarea>`:`<input id="f_${f.id}" type="${f.type||'text'}" value="${vf(f)}" placeholder="${f.ph||''}">`}</div>`).join('')}
const fv=id=>{const e=$('#f_'+id);return e?e.value.trim():''};
/* marcaEscribible() existia pero nadie la llamaba: una alta en BR antes de
   la migracion fallaba contra el CHECK de la base y el equipo solo veia
   «No se pudo guardar». Ahora el formulario lo dice y dice que correr. */
const avisoBR='BR todavía no se puede guardar: corre supabase/marcas-brief.sql.';
/* Editar una tarea que ya existe.
   El kanban dejaba cambiar estado y progreso, pero no el titulo, la fecha,
   el responsable ni la descripcion: para corregir una palabra habia que
   borrar la tarjeta y volver a crearla. */
const COL_OPTS=[['todo','Por hacer'],['prog','En progreso'],['done','Listo']];
function editarTarea(id){
 const t=TASKS.find(x=>x.id===id);if(!t)return;
 const volver=()=>openTask(id);
 const sel=normMarca(t.brand)+'|'+(t.srv||servidoresDe(t.brand)[0]);
 drawer('Editar tarea',frm([
  {id:'t',l:'TAREA',v:t.t,ph:'Qué hay que hacer'},
  {id:'prio',l:'PRIORIDAD',tag:'select',opts:OPT([['alta','Alta'],['media','Media'],['baja','Baja']],t.prio)},
  {id:'col',l:'ESTADO',tag:'select',opts:OPT(COL_OPTS,t.col)},
  {id:'br',l:'MARCA · SERVIDOR',tag:'select',opts:OPT(BR_OPTS,sel)},
  {id:'pf',l:'PLATAFORMA (OPCIONAL)',tag:'select',opts:'<option value="">—</option>'+OPT(PF_OPTS,t.pf)},
  {id:'d',l:'FECHA LÍMITE',type:'date',v:t.dueDate},
  {id:'ow',l:'RESPONSABLE',v:t.owner==='—'?'':t.owner},
  {id:'prog',l:'PROGRESO (0-100)',type:'number',v:t.prog},
  {id:'ds',l:'DESCRIPCIÓN',tag:'textarea',rows:4,v:t.desc},
 ]),`<button class="btn gh2" id="eBack">Volver</button><button class="btn" style="flex:1" id="eSave">Guardar cambios</button>`);
 $('#eBack').onclick=volver;
 $('#eSave').onclick=async()=>{
  if(!fv('t'))return toast('La tarea necesita un título.');
  const[b,sv]=fv('br').split('|');
  if(!marcaEscribible(b))return toast(avisoBR);
  const prog=Math.max(0,Math.min(100,parseInt(fv('prog')||'0',10)));
  await persist(()=>dbPatchTask(t.id,{title:fv('t'),prio:fv('prio'),col:fv('col'),
   brand:marcaParaDB(b),srv:sv,platform:fv('pf')?DB_PF[fv('pf')]:null,
   due_date:fv('d')||null,owner:fv('ow')||'—',prog,descr:fv('ds')||null}),'Tarea actualizada');
  volver();
 };
}
function newForm(kind,presetDate){
 if(kind==='informe'){exportCSV();return}
 if(kind==='campaña'){toast('Usa «Crear idea» dentro de una tendencia.');return}
 const bd=brand==='ALL'?'ESP':normMarca(brand);
 const brandDef=bd+'|'+servidoresDe(bd)[0];
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
   if(!marcaEscribible(b))return toast(avisoBR);
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
   if(!marcaEscribible(b))return toast(avisoBR);
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
   if(!marcaEscribible(b))return toast(avisoBR);
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
 $$('[data-brief]').forEach(e=>e.onclick=()=>editarBrief(e.dataset.brief));
 $$('[data-brand-go]').forEach(e=>e.onclick=()=>{
  brand=e.dataset.brandGo;
  $$('#brandSeg button').forEach(x=>x.classList.toggle('act',x.dataset.brand===brand));
  pintarServidores();render();
 });
 $$('[data-tf]').forEach(e=>e.onclick=()=>{taskFilter=e.dataset.tf;render()});
 $$('[data-pubf]').forEach(e=>e.onclick=()=>{pubFilter=e.dataset.pubf;render()});
 $$('[data-pff]').forEach(e=>e.onclick=()=>{pfFilter=pfFilter===e.dataset.pff?null:e.dataset.pff;render()});
 $$('[data-if]').forEach(e=>e.onclick=()=>{ideaFilter=e.dataset.if;render()});
 $$('[data-limpiar=pub]').forEach(e=>e.onclick=()=>{pubFilter='todas';pfFilter=null;render()});
 $$('[data-is]').forEach(e=>e.onclick=()=>{ideaSort=e.dataset.is;render()});
 $$('[data-mode]').forEach(e=>e.onclick=()=>{pubMode=e.dataset.mode;render()});
 $$('[data-per]').forEach(e=>e.onclick=()=>{period=e.dataset.per;render()});
 $$('[data-sub]').forEach(e=>e.onclick=()=>{metSub=e.dataset.sub;render()});
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
  l.innerHTML=r.map(trendRow).join('')||emptyMini('SIN RESULTADOS',`Nada para «${esc(v)}» en el radar.`);
  $$('[data-trend]',l).forEach(e=>e.onclick=()=>openTrend(e.dataset.trend));
 },380);
}
/* ---------- PANEL LATERAL ---------- */
function drawer(title,body,foot){
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
 paint();   // la ficha se arma con datos que ya están cargados
}
const closeDrawer=()=>{$('#drawer').classList.remove('on');$('#scrim').classList.remove('on')};
$('#dClose').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;
function openPost(id){const p=POSTS.find(x=>x.id===id);if(!p)return;const done=p.chkState.filter(Boolean).length;
 drawer(p.t,`<div class="previewwrap"><img class="prev" src="${p.thumb}" alt=""><span class="scan"></span><span class="hud tl"></span><span class="hud tr"></span><span class="hud bl"></span><span class="hud br"></span></div>
 <div style="display:flex;gap:7px;flex-wrap:wrap">${pill(p.pf)}<span class="st ${p.st}">${p.st.toUpperCase()}</span><span class="tag ${marca(p.brand).clase}">${(p.srv||p.brand).toUpperCase()}</span></div>
 <dl class="kv"><dt>Publicación</dt><dd>${dlabel(p.d)}${p.h?' · '+p.h:''}</dd><dt>Formato</dt><dd>${p.fmt}</dd><dt>Responsable</dt><dd>${p.owner}</dd>${p.url?`<dt>Enlace</dt><dd><a href="${p.url}" target="_blank" style="color:var(--crimson-tx)">${p.url}</a></dd>`:''}<dt>Alcance</dt><dd>${p.reach?fmt(p.reach)+' · '+fmt(p.eng)+' interacciones · '+(p.eng/p.reach*100).toFixed(1)+'%':'Pendiente de publicar'}</dd></dl>
 ${p.copy?`<div><div class="lbl" style="margin-bottom:8px">TEXTO DE LA PUBLICACIÓN</div><div class="copybox">${p.copy}</div></div>`:''}
 ${p.chk.length?`<div><div class="lbl" style="margin-bottom:10px;display:flex;justify-content:space-between">CHECKLIST<span id="chkNum" style="color:var(--crimson-tx)">${done}/${p.chkState.length}</span></div><div class="tr mini" style="margin-bottom:12px"><i id="chkProg" style="width:${done/p.chkState.length*100}%"></i></div><div class="chkl">${p.chk.map((c,i)=>`<label><input type="checkbox" data-chk="${p.id}:${i}" ${p.chkState[i]?'checked':''}><span>${c}</span></label>`).join('')}</div></div>`:''}
 ${bloqueRefs('publicacion',p.id)}`,
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
   persist(async()=>{await dbDeleteRefsDe('publicacion',p.id);await dbDeletePost(p.id)},'Publicación eliminada');closeDrawer()};
  wireRefs('publicacion',p.id,()=>openPost(p.id));
 },instantDelay());
}
/* La ficha del drawer se pinta de forma síncrona, así que los
   manejadores se pueden enganchar en el siguiente tick. Antes
   esperaban 320ms a que terminara un esqueleto simulado. */
const instantDelay=()=>0;
function openTask(id){const t=TASKS.find(x=>x.id===id);if(!t)return;const di=dueInfo(t);
 drawer(t.t,`<div style="display:flex;gap:7px;flex-wrap:wrap"><span class="tag ${t.prio}">${t.prio.toUpperCase()}</span><span class="tag ${marca(t.brand).clase}">${(t.srv||t.brand).toUpperCase()}</span>${t.pf?pill(t.pf):''}</div>
 ${t.desc?`<p style="color:var(--tx2);font-size:12.5px">${t.desc}</p>`:''}
 <dl class="kv"><dt>Estado</dt><dd>${({todo:'Por hacer',prog:'En progreso',done:'Listo'})[t.col]}</dd><dt>Responsable</dt><dd>${t.owner}</dd><dt>Entrega</dt><dd${di.late?' style="color:var(--bad)"':''}>${di.label}</dd></dl>
 <div><div class="lbl" style="margin-bottom:8px">PROGRESO · ${t.prog}%</div><div class="tr mini"><i style="width:${t.prog}%"></i></div></div>
 ${bloqueRefs('tarea',t.id)}`,
 `<button class="btn gh2" id="tEdit">Editar</button>${t.col!=='done'?`<button class="btn" style="flex:1" id="tNext">Avanzar estado</button>`:`<button class="btn gh2" style="flex:1" id="tBack">Reabrir</button>`}<button class="btn gh2" id="tDel" title="Eliminar">✕</button>`);
 setTimeout(()=>{
  const n=$('#tNext');if(n)n.onclick=()=>{const to=t.col==='todo'?'prog':'done';
   persist(()=>dbPatchTask(t.id,{col:to,prog:to==='done'?100:Math.max(t.prog,25)}),'Tarea → '+(to==='done'?'Listo':'En progreso'));closeDrawer()};
  const b=$('#tBack');if(b)b.onclick=()=>{persist(()=>dbPatchTask(t.id,{col:'prog',prog:50}),'Tarea reabierta');closeDrawer()};
  const ed=$('#tEdit');if(ed)ed.onclick=()=>editarTarea(t.id);
  const del=$('#tDel');if(del)del.onclick=()=>{if(!confirm('¿Eliminar esta tarea?'))return;
   persist(async()=>{await dbDeleteRefsDe('tarea',t.id);await dbDeleteTask(t.id)},'Tarea eliminada');closeDrawer()};
  wireRefs('tarea',t.id,()=>openTask(t.id));
 },instantDelay());
}
function openIdea(id){const i=IDEAS.find(x=>x.id===id);if(!i)return;
 drawer(i.t,`<div style="display:flex;gap:7px;flex-wrap:wrap">${pill(i.pf)}${brandTag(i.brand)}<span class="st ${i.st==='aprobada'?'publicada':'programada'}">${i.st==='aprobada'?'APROBADA':'EN REVISIÓN'}</span></div>
 <p style="color:var(--tx2);font-size:12.5px">${i.d}</p>
 ${i.why?`<div><div class="lbl" style="margin-bottom:8px">POR QUÉ AHORA</div><div class="copybox">${i.why}</div></div>`:''}
 ${i.copy?`<div><div class="lbl" style="margin-bottom:8px">COPY SUGERIDO</div><div class="copybox">${i.copy}</div></div>`:''}
 <div style="display:flex;gap:18px"><div style="flex:1"><div class="lbl" style="margin-bottom:7px">IMPACTO ${i.imp}/5</div><div class="pips">${[1,2,3,4,5].map(n=>`<i class="${n<=i.imp?'f':''}"></i>`).join('')}</div></div><div style="flex:1"><div class="lbl" style="margin-bottom:7px">ESFUERZO ${i.eff}/5</div><div class="pips e">${[1,2,3,4,5].map(n=>`<i class="${n<=i.eff?'f':''}"></i>`).join('')}</div></div></div>
 ${bloqueRefs('idea',i.id)}`,
 `${i.copy?'<button class="btn gh2" id="iCopy">Copiar copy</button>':''}${i.st!=='aprobada'?'<button class="btn gh2" id="iOk">Aprobar</button>':''}<button class="btn" style="flex:1" id="iConv">Convertir en publicación</button><button class="btn gh2" id="iDel" title="Descartar">✕</button>`);
 setTimeout(()=>{
  const c=$('#iCopy');if(c)c.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(i.copy);toast('Copy copiado')};
  const ok=$('#iOk');if(ok)ok.onclick=()=>{persist(()=>dbPatchIdea(i.id,{status:'aprobada'}),'Idea aprobada');closeDrawer()};
  const cv=$('#iConv');if(cv)cv.onclick=()=>{
   persist(async()=>{const hecho=await dbCreatePost({t:i.t,brand:normMarca(i.brand),srv:servidoresDe(i.brand)[0],pf:i.pf,st:'borrador',copy:i.copy||i.d,chk:['Arte','Copy revisado','Programada']});
    /* Las imagenes y las propuestas de copy se van con la pieza nueva. */
    const nueva=Array.isArray(hecho)?hecho[0]:hecho;
    if(nueva&&nueva.id)await dbMoverRefs('idea',i.id,'publicacion',nueva.id);
    await dbPatchIdea(i.id,{status:'convertida'})},'Idea convertida en borrador de publicación');closeDrawer()};
  const del=$('#iDel');if(del)del.onclick=()=>{if(!confirm('¿Descartar esta idea?'))return;
   persist(()=>dbPatchIdea(i.id,{status:'descartada'}),'Idea descartada');closeDrawer()};
  wireRefs('idea',i.id,()=>openIdea(i.id));
 },instantDelay());
}
function openTrend(id){const r=TRENDS.find(x=>x.id===id);if(!r)return;
 drawer(r.t,`<div style="display:flex;gap:7px;flex-wrap:wrap"><span class="st ${REL_ST[r.rel]||'borrador'}">RELEVANCIA ${r.rel.toUpperCase()}</span>${r.d?`<span class="tag esp">${dlabel(r.d).toUpperCase()}</span>`:''}</div>
 <div><div class="lbl" style="margin-bottom:8px">ANÁLISIS</div><div class="copybox">${r.note}</div></div>
 ${r.src?`<dl class="kv"><dt>Fuente</dt><dd><a href="${r.src}" target="_blank" style="color:var(--crimson-tx)">Abrir fuente ↗</a></dd></dl>`:''}
 <div><div class="lbl" style="margin-bottom:8px">IDEAS RELACIONADAS</div>${IDEAS.slice(0,3).map(i=>`<div class="row" data-idea="${i.id}"><div class="t">${i.t}<div class="meta" style="margin-top:3px">Impacto ${i.imp}/5 · esfuerzo ${i.eff}/5</div></div>${brandTag(i.brand)}</div>`).join('')||'<div class="meta">Todavía no hay ideas. Crea una desde esta tendencia.</div>'}</div>`,
 `<button class="btn" style="flex:1" id="rIdea">Crear idea desde la tendencia</button>`);
 setTimeout(()=>{
  $$('#dBody [data-idea]').forEach(e=>e.onclick=()=>openIdea(e.dataset.idea));
  const b=$('#rIdea');if(b)b.onclick=()=>{
   persist(()=>dbCreateIdea({t:r.t,brand:brand==='ALL'?'ESP':normMarca(brand),pf:'tt',imp:4,eff:3,d:r.note,why:'Tendencia del radar ('+r.rel+' relevancia).'}),'Idea creada desde la tendencia');closeDrawer()};
 },instantDelay());
}
/* ---------- REFERENCIAS: IMAGENES Y PROPUESTAS DE COPY ----------
   Para que el equipo vea como va a quedar la pieza antes de que exista:
   capturas, bocetos, moodboard. Y para que el copy se proponga en varias
   versiones y el equipo elija, en vez de una sola casilla de texto.

   Cuelgan de una idea, de una publicacion o de una tarea del kanban.
   Quien sube queda firmado en `autor`, asi que se sabe de quien es cada
   propuesta sin preguntar.

   NO lleva candado de rol a proposito. Si solo MeDed pudiera subir, el
   resto del equipo no podria proponer copy, que es justo para lo que
   sirve el apartado. Si algun dia hay que cerrarlo, es la misma linea
   que puedeEditarBrief() y va aqui.

   Mientras supabase/referencias.sql no corra, HUB.refs es falso y la
   ficha lo dice en vez de mostrar una galeria vacia como si nadie
   hubiera subido nada. */
const refsDe=(ref,id,tipo)=>REFS.filter(r=>r.ref===ref&&r.refId===id&&r.tipo===tipo);
const REF_N={idea:'idea',publicacion:'publicación',tarea:'tarea'};

/* Contador para las tarjetas de las vistas: silencioso cuando no hay nada. */
function refBdg(ref,id){
 if(!HUB.refs)return '';
 const im=refsDe(ref,id,'imagen').length,cp=refsDe(ref,id,'copy').length;
 if(!im&&!cp)return '';
 return `<span class="refbdg" title="${im} imagen${im===1?'':'es'} · ${cp} propuesta${cp===1?'':'s'} de copy">`+
  (im?`<i class="im"></i>${im}`:'')+(cp?`<i class="cp"></i>${cp}`:'')+`</span>`;
}

function bloqueRefs(ref,id){
 if(!HUB.refs)
  return `<div class="refs"><div class="lbl refhead">REFERENCIAS Y COPY</div>
   ${emptyMini('FALTA LA TABLA','Corre supabase/referencias.sql y aquí podrás subir imágenes de muestra y propuestas de copy.')}</div>`;
 const ims=refsDe(ref,id,'imagen'),cps=refsDe(ref,id,'copy');
 const galeria=ims.length?`<div class="refgrid">${ims.map(r=>`<figure class="refim">
   <a href="${esc(r.url)}" target="_blank" rel="noopener"><img src="${esc(r.url)}" alt="${esc(r.texto||'Referencia visual')}" loading="lazy"></a>
   <figcaption>${r.texto?esc(r.texto):'<span class="sinnota">Sin nota</span>'}<em>${esc(r.autor)}</em></figcaption>
   <div class="refacts">${ref==='publicacion'?`<button class="btn gh2 sm" data-portada="${r.id}">Portada</button>`:''}<button class="btn gh2 sm" data-refdel="${r.id}" aria-label="Quitar imagen">✕</button></div>
  </figure>`).join('')}</div>`
  :`<p class="refvacio">Todavía nadie sube una imagen. Pon una captura o un boceto para que el equipo vea cómo va a quedar.</p>`;
 const copys=cps.length?cps.map((r,i)=>`<div class="copyprop">
   <div class="lbl">OPCIÓN ${i+1} · ${esc(r.autor)}${r.d?' · '+dlabel(r.d):''}</div>
   <div class="copybox">${esc(r.texto)}</div>
   <div class="refacts"><button class="btn gh2 sm" data-refcopy="${r.id}">Copiar</button><button class="btn gh2 sm" data-refdel="${r.id}" aria-label="Quitar propuesta">✕</button></div>
  </div>`).join('')
  :`<p class="refvacio">Sin propuestas de copy. Escribe una versión del texto y el equipo la revisa aquí mismo.</p>`;
 return `<div class="refs">
  <div class="lbl refhead">REFERENCIAS VISUALES${ims.length?`<span>${ims.length}</span>`:''}</div>
  ${galeria}
  <button class="btn gh2 sm refadd" data-refnew="imagen">+ Agregar imagen</button>
  <div class="lbl refhead">PROPUESTAS DE COPY${cps.length?`<span>${cps.length}</span>`:''}</div>
  ${copys}
  <button class="btn gh2 sm refadd" data-refnew="copy">+ Propuesta de copy</button>
 </div>`;
}

/* `volver` repinta la ficha del padre: persist() recarga los datos y
   re-renderiza la vista de fondo, pero el drawer hay que armarlo otra vez
   para que la galeria incluya lo que se acaba de subir. */
function wireRefs(ref,id,volver){
 $$('#dBody [data-refnew]').forEach(e=>e.onclick=()=>formRef(ref,id,e.dataset.refnew,volver));
 $$('#dBody [data-refcopy]').forEach(e=>e.onclick=()=>{
  const r=REFS.find(x=>x.id===e.dataset.refcopy);if(!r)return;
  if(navigator.clipboard)navigator.clipboard.writeText(r.texto);
  toast('Propuesta copiada al portapapeles');
 });
 $$('#dBody [data-refdel]').forEach(e=>e.onclick=async()=>{
  const r=REFS.find(x=>x.id===e.dataset.refdel);if(!r)return;
  if(!confirm(r.tipo==='imagen'?'¿Quitar esta imagen de la ficha?':'¿Quitar esta propuesta de copy?'))return;
  await persist(()=>dbDeleteRef(r.id),r.tipo==='imagen'?'Imagen quitada':'Propuesta quitada');
  volver();
 });
 /* Solo en publicaciones: usar la referencia como portada de la pieza. */
 $$('#dBody [data-portada]').forEach(e=>e.onclick=async()=>{
  const r=REFS.find(x=>x.id===e.dataset.portada);if(!r)return;
  await persist(()=>dbPatchPost(id,{thumb:r.url}),'Portada actualizada');
  volver();
 });
}

function formRef(ref,id,tipo,volver){
 const cuerpo=tipo==='imagen'
  ? `<div class="fld"><label class="lbl" for="f_arch">ARCHIVO</label>
     <input id="f_arch" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif"></div>
     <p class="refnota">JPG, PNG, WEBP o GIF, hasta ${MEDIA_MB} MB. Se guarda en Supabase Storage.</p>
     <div class="fld"><label class="lbl" for="f_url">…O PEGA UNA URL QUE YA EXISTA</label>
     <input id="f_url" placeholder="https://…"></div>
     <div class="fld"><label class="lbl" for="f_nota">NOTA (OPCIONAL)</label>
     <input id="f_nota" placeholder="Qué hay que ver aquí"></div>`
  : `<div class="fld"><label class="lbl" for="f_txt">TEXTO PROPUESTO</label>
     <textarea id="f_txt" rows="8" placeholder="Escribe el caption tal como saldría publicado…"></textarea></div>
     <p class="refnota">Queda firmada con tu nombre. Deja las versiones que quieras: el equipo elige una.</p>`;
 drawer(tipo==='imagen'?'Agregar imagen':'Nueva propuesta de copy',cuerpo,
  `<button class="btn gh2" id="rBack">Volver</button><button class="btn" style="flex:1" id="rSave">Guardar</button>`);
 $('#rBack').onclick=volver;
 $('#rSave').onclick=async()=>{
  if(tipo==='copy'){
   const t=$('#f_txt').value.trim();
   if(!t)return toast('Escribe el texto de la propuesta.');
   await persist(()=>dbCreateRef({ref,refId:id,tipo:'copy',texto:t}),'Propuesta guardada');
   return volver();
  }
  const f=$('#f_arch').files[0],u=$('#f_url').value.trim(),nota=$('#f_nota').value.trim();
  if(!f&&!u)return toast('Elige un archivo o pega una URL.');
  if(f&&f.size>MEDIA_MB*1048576)return toast('La imagen pesa más de '+MEDIA_MB+' MB. Compártela más ligera.');
  const b=$('#rSave');b.disabled=true;b.innerHTML='<span class="spin"></span>Subiendo';
  let url;
  try{url=f?await dbSubirImagen(f,ref):u}
  catch(e){console.error(e);b.disabled=false;b.textContent='Guardar';
   return toast('No se pudo subir el archivo. Revisa que el bucket gtahub-media exista; mientras, pega una URL.')}
  await persist(()=>dbCreateRef({ref,refId:id,tipo:'imagen',url,texto:nota}),'Imagen agregada a la '+REF_N[ref]);
  volver();
 };
}
/* ---------- BRIEF DE MARCA ----------
   La guia de voz de cada marca. La edita solo marketing: el rol 'mkt' de
   gtahub_usuarios.

   AVISO IMPORTANTE: esto es un candado de interfaz, no de seguridad. Todo
   el hub entra a Supabase con la MISMA llave anonima, asi que la base no
   puede distinguir quien escribe y RLS no puede frenarlo; quien sepa abrir
   la consola del navegador puede saltarselo. Sirve para que nadie del
   equipo lo toque por error, que es lo que se pidio. Para que sea un
   permiso de verdad, el login tiene que pasar a Supabase Auth y entonces
   RLS ve auth.uid(). */
const ROL_BRIEF='mkt';
const puedeEditarBrief=()=>((HUB.user&&HUB.user.role)||'').toLowerCase()===ROL_BRIEF;
const CAMPOS_BRIEF=[
 ['publico','PÚBLICO','A quién le habla esta marca'],
 ['tono','TONO','Cómo suena: registro, ritmo, qué tanto se permite'],
 ['pilares','PILARES DE CONTENIDO','Los temas que sí se tocan, uno por línea'],
 ['si','QUÉ SÍ','Lo que no puede faltar en una pieza'],
 ['no','QUÉ NO','Lo que nunca va: palabras, temas, formatos'],
 ['referencias','REFERENCIAS','Cuentas o piezas que marcan el estándar'],
 ['cta','LLAMADA A LA ACCIÓN','Con qué cierra cada pieza'],
];
const briefDe=id=>BRIEFS[id]||{};
const briefVacio=id=>!CAMPOS_BRIEF.some(([k])=>(briefDe(id)[k]||'').trim());

/* Cuentas de una marca en cada red, para el pie del brief. */
function redesDe(id){
 const c=CUENTAS[id]||{};
 return `<div class="redes">${['ig','tt','dc','em','fb'].map(k=>{
  const v=c[k]||{};
  const txt=v.cuenta?esc(v.cuenta):'<i>sin asignar</i>';
  return `<div class="red"><span class="pf p-${k}"><span class="dot"></span>${PF[k].n}</span>${
   v.url?`<a href="${esc(v.url)}" target="_blank" rel="noopener">${txt} ↗</a>`:`<span class="meta">${txt}</span>`}</div>`;
 }).join('')}</div>`;
}

function vBrief(){
 const aviso=HUB.migrado?'':`<div class="card nota"><h3>FALTA CORRER LA MIGRACIÓN</h3>
  <p>El brief y las cuentas por marca viven en tablas que todavía no existen en Supabase.
  Corre <code>supabase/marcas-brief.sql</code> en el SQL Editor y esta vista se llena sola.
  Mientras tanto se puede leer la estructura, pero no guardar.</p></div>`;

 const ficha=id=>{
  const b=briefDe(id),m=MARCAS[id];
  const cuerpo=briefVacio(id)
   ? emptyMini('SIN BRIEF TODAVÍA',puedeEditarBrief()?'Escríbelo con «Editar brief».':'Marketing aún no lo ha escrito.')
   : CAMPOS_BRIEF.map(([k,l])=>(b[k]||'').trim()
       ?`<div class="bcampo"><div class="lbl">${l}</div><p>${esc(b[k]).replace(/\n/g,'<br>')}</p></div>`:'').join('');
  return `<div class="card brief">
   <header><h3>${esc(m.nombre)}</h3>${puedeEditarBrief()?`<button class="chip" data-brief="${id}">EDITAR BRIEF</button>`:''}</header>
   <div class="bmeta meta">${esc(m.idioma)} · ${m.servidores.map(esc).join(' · ')}</div>
   ${cuerpo}
   <div class="bcampo"><div class="lbl">CUENTAS</div>${redesDe(id)}</div>
   ${b.actualizado?`<div class="meta" style="margin-top:10px">Actualizado ${dlabel((b.actualizado||'').slice(0,10))}${b.por?' por '+esc(b.por):''}</div>`:''}
  </div>`;
 };

 const quien=puedeEditarBrief()
  ? `<div class="meta">Puedes editar el brief: tu rol es <b>${esc(HUB.user.role)}</b>.</div>`
  : `<div class="meta">Solo marketing (rol <b>${ROL_BRIEF}</b>) edita el brief. Tú lo ves en modo lectura.</div>`;

 const ids=brand==='ALL'?MARCA_IDS:[normMarca(brand)];
 return hero(`<div style="margin-top:14px">${quien}</div>`)+aviso+
  `<div class="${ids.length>1?'briefs':''}">${ids.map(ficha).join('')}</div>`;
}

/* Formulario de edición, en el drawer como el resto de altas. */
function editarBrief(id){
 if(!puedeEditarBrief())return toast('Solo marketing puede editar el brief.');
 if(!HUB.migrado)return toast('Corre supabase/marcas-brief.sql antes de guardar.');
 const b=briefDe(id);
 drawer('Brief · '+MARCAS[id].nombre,
  frm(CAMPOS_BRIEF.map(([k,l,ph])=>({id:'b_'+k,l,tag:'textarea',rows:k==='pilares'||k==='no'?4:3,ph}))),
  `<button class="btn" style="flex:1" id="bSave">Guardar brief</button>`);
 CAMPOS_BRIEF.forEach(([k])=>{const e=$('#f_b_'+k);if(e)e.value=b[k]||''});
 $('#bSave').onclick=()=>{
  const datos={};CAMPOS_BRIEF.forEach(([k])=>datos[k]=fv('b_'+k));
  persist(()=>dbGuardarBrief(id,datos),'Brief de '+id+' guardado');closeDrawer();
 };
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
   ||emptyMini('SIN RESULTADOS',`Nada para «${esc(v)}» en publicaciones, tareas, ideas ni tendencias.`);
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


/* ---- tema claro / oscuro ----
   La preferencia se guarda en localStorage. Es la única excepción a
   la regla de no persistir nada en el navegador: no es dato de
   sesión, es una preferencia de accesibilidad, y perderla en cada
   visita haría inútil el interruptor. Sin elección guardada se
   respeta la del sistema operativo. */
const TEMA_CLAVE='gtahub.tema';
function temaGuardado(){try{return localStorage.getItem(TEMA_CLAVE)}catch(e){return null}}
function temaActivo(){
 const g=temaGuardado();
 if(g==='light'||g==='dark')return g;
 return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
}
function aplicarTema(t){
 document.documentElement.dataset.theme=t;
 try{localStorage.setItem(TEMA_CLAVE,t)}catch(e){}
 const m=document.querySelector('meta[name=theme-color]:not([media])')||(()=>{
  const n=document.createElement('meta');n.name='theme-color';document.head.appendChild(n);return n})();
 m.content=t==='light'?'#F1F1F6':'#000000';
 const b=$('#themeBtn');
 if(b)b.setAttribute('aria-label',t==='light'?'Cambiar a tema oscuro':'Cambiar a tema claro');
}
$('#themeBtn').addEventListener('click',()=>{
 const nuevo=temaActivo()==='light'?'dark':'light';
 aplicarTema(nuevo);
 toast(nuevo==='light'?'Tema claro':'Tema oscuro');
});
// Sin elección propia, seguir al sistema si el usuario lo cambia en caliente.
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{
 if(!temaGuardado())aplicarTema(temaActivo());
});
aplicarTema(temaActivo());

/* ---------- APP INSTALABLE ----------
   Chrome solo ofrece «Instalar» si hay un service worker con 'fetch'.
   updateViaCache:'none' evita que la caché HTTP de GitHub Pages (10 min)
   retrase la llegada de un sw.js nuevo. Ruta relativa: vive bajo /gtahub/. */
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 addEventListener('load',()=>{
  navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'})
   .catch(e=>console.warn('No se pudo registrar el service worker',e));
 });
}
