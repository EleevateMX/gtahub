/* GTAHUB Content Hub — helpers de UI + contenedores de datos (se llenan desde Supabase) */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PF={ig:{k:'ig',n:'Instagram'},tt:{k:'tt',n:'TikTok'},dc:{k:'dc',n:'Discord'},em:{k:'em',n:'Email'},fb:{k:'fb',n:'Facebook'}};
const pill=p=>PF[p]?`<span class="pf p-${p}"><span class="dot"></span>${PF[p].n}</span>`:'';

/* ============================================================
   CATÁLOGO DE MARCAS — fuente única
   ------------------------------------------------------------
   Antes la marca era binaria: ESP, o si no, PE. Agregar BR con
   eso habría significado tocar cada condicional. Ahora todo
   (etiquetas, selector, servidores, formularios, filtros) se
   deriva de este objeto: sumar una marca es sumar una entrada.

   `alias` guarda los nombres que esa marca tuvo antes y que
   siguen viniendo de la base. PE es el nombre anterior de ENG;
   `normMarca` lo traduce al leer, así que el hub funciona igual
   antes y después de correr supabase/marcas-brief.sql.
   ============================================================ */
const MARCAS={
 ESP:{id:'ESP',nombre:'GTAHUB ESP',idioma:'Español', clase:'esp',servidores:['Orion','Andromeda']},
 ENG:{id:'ENG',nombre:'GTAHUB ENG',idioma:'Inglés',  clase:'eng',servidores:['Pegasus'],alias:['PE']},
 /* OJO: falta confirmar el nombre real del servidor de BR.
    Es lo único por definir aquí; cámbialo y el resto se acomoda. */
 BR: {id:'BR', nombre:'GTAHUB BR', idioma:'Portugués',clase:'br', servidores:['Por confirmar']},
};
const MARCA_IDS=Object.keys(MARCAS);
const ALIAS_MARCA=Object.fromEntries(
 MARCA_IDS.flatMap(id=>(MARCAS[id].alias||[]).map(a=>[a,id])));
/* Traduce cualquier valor que venga de la base a un id vigente. */
const normMarca=b=>ALIAS_MARCA[b]||(MARCAS[b]?b:'ESP');
const marca=b=>MARCAS[normMarca(b)];
const brandTag=b=>{const m=marca(b);return `<span class="tag ${m.clase}" title="${m.nombre} · ${m.idioma}">${m.id}</span>`};
const servidoresDe=b=>marca(b).servidores;
/* Todos los pares marca·servidor, para los selectores de los formularios. */
const MARCA_SRV=MARCA_IDS.flatMap(id=>MARCAS[id].servidores.map(s=>[id+'|'+s,MARCAS[id].id+' · '+s]));
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n);

/* Los datos reales llegan desde Supabase vía hub-api.js (hubLoad) */
const POSTS=[];
const TASKS=[];
const IDEAS=[];
const TRENDS=[];
/* Cortes del flujo de Manychat, mas reciente primero. Lo llena
   supabase/manychat.sql; si la tabla no existe, queda vacio y Metricas
   simplemente no pinta el bloque. */
const MANYCHAT=[];
/* Cortes de las estadisticas de la cuenta (no de una pieza), mas reciente
   primero. Lo llena supabase/cuenta.sql. */
const CUENTA=[];
/* Detalle del flujo de Manychat: cada mensaje y el CTR de cada boton.
   Lo llena supabase/manychat-detalle.sql. */
const MC_PASOS=[];
const MC_BOTONES=[];
/* Referencias: imagenes de muestra y propuestas de copy colgadas de una
   idea, una publicacion o una tarea. Lo llena supabase/referencias.sql;
   si la tabla no existe, HUB.refs queda en falso y la ficha lo dice en vez
   de fingir que nadie ha subido nada. */
const REFS=[];
/* Cuentas de cada marca en cada red: {ESP:{ig:{cuenta,url}},…}. Lo llena
   hubLoad desde gtahub_cuentas; queda vacío si la migración no ha corrido. */
const CUENTAS={};
/* Brief de marca: {ESP:{publico,tono,pilares,si,no,referencias,cta},…} */
const BRIEFS={};

const HEROES={
 inicio:{bg:'hub-art/bg-inicio.jpg',char:'hub-art/char-business.png',h:'PANEL DEL EQUIPO',p:''},
 pendientes:{bg:'hub-art/bg-pendientes.jpg',char:'hub-art/char-bluesuit.png',h:'FLUJO DE TRABAJO',p:''},
 publicaciones:{bg:'hub-art/bg-publicaciones.jpg',char:'hub-art/char-varsity.png',h:'BIBLIOTECA DE PUBLICACIONES',p:''},
 calendario:{bg:'hub-art/bg-calendario.jpg',char:'hub-art/char-redsuit.png',h:'AGENDA DEL HUB',p:''},
 ideas:{bg:'hub-art/bg-ideas.jpg',char:'hub-art/char-business.png',h:'BANCO DE IDEAS',p:''},
 metricas:{bg:'hub-art/bg-metricas.jpg',char:'hub-art/char-bluesuit.png',h:'RENDIMIENTO',p:''},
 brief:{bg:'hub-art/bg-ideas.jpg',char:'hub-art/char-woman.png',h:'BRIEF DE MARCA',p:''}};
