/* GTAHUB Content Hub — helpers de UI + contenedores de datos (se llenan desde Supabase) */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PF={ig:{k:'ig',n:'Instagram'},tt:{k:'tt',n:'TikTok'},dc:{k:'dc',n:'Discord'},em:{k:'em',n:'Email'},fb:{k:'fb',n:'Facebook'}};
const pill=p=>PF[p]?`<span class="pf p-${p}"><span class="dot"></span>${PF[p].n}</span>`:'';
const brandTag=b=>b==='ESP'?'<span class="tag esp">ESP</span>':'<span class="tag pe">PE</span>';
const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n);

/* Los datos reales llegan desde Supabase vía hub-api.js (hubLoad) */
const POSTS=[];
const TASKS=[];
const IDEAS=[];
const TRENDS=[];

const HEROES={
 inicio:{bg:'hub-art/bg-inicio.jpg',char:'hub-art/char-business.png',h:'PANEL DEL EQUIPO',p:''},
 pendientes:{bg:'hub-art/bg-pendientes.jpg',char:'hub-art/char-bluesuit.png',h:'FLUJO DE TRABAJO',p:''},
 publicaciones:{bg:'hub-art/bg-publicaciones.jpg',char:'hub-art/char-varsity.png',h:'BIBLIOTECA DE PUBLICACIONES',p:''},
 calendario:{bg:'hub-art/bg-calendario.jpg',char:'hub-art/char-redsuit.png',h:'AGENDA DEL HUB',p:''},
 ideas:{bg:'hub-art/bg-ideas.jpg',char:'hub-art/char-business.png',h:'BANCO DE IDEAS',p:''},
 metricas:{bg:'hub-art/bg-metricas.jpg',char:'hub-art/char-bluesuit.png',h:'RENDIMIENTO',p:''}};
