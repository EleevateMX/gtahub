/* GTAHUB Content Hub — capa de datos (Supabase) */
const SB_URL='https://hwqiyqullrznovamkhsz.supabase.co';
const SB_KEY='sb_publishable_drCD07AueLcmq1JRb4xS1w_CHbhSN3C';
const SB_H={apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json',Prefer:'return=representation'};

const HUB={user:null,online:false,metas:{ig:5,tt:7,dc:2,em:1,fb:3}};
const PF_DB={instagram:'ig',tiktok:'tt',discord:'dc',email:'em',facebook:'fb',multi:'dc'};
const DB_PF={ig:'instagram',tt:'tiktok',dc:'discord',em:'email',fb:'facebook'};
const THUMB_PF={ig:'hub-art/t-acceso.jpg',tt:'hub-art/t-atraco.jpg',dc:'hub-art/t-drop.jpg',em:'hub-art/t-newsletter.jpg',fb:'hub-art/t-jornada.jpg'};
const ST_DB={publicado:'publicada',programado:'programada',pendiente:'borrador',borrador:'borrador'};
const DB_ST={publicada:'publicado',programada:'programado',borrador:'borrador'};

async function api(path,opts={}){
 const r=await fetch(SB_URL+'/rest/v1/'+path,Object.assign({headers:SB_H},opts));
 if(!r.ok)throw new Error((await r.text()).slice(0,300));
 const tx=await r.text();return tx?JSON.parse(tx):null;
}

/* SHA-256 puro (mismo esquema que gtahub_usuarios: sha256(salt+':'+pass)) */
function sha256hex(str){
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
 const bytes=Array.from(new TextEncoder().encode(str));const bitLen=bytes.length*8;bytes.push(0x80);
 while(bytes.length%64!==56)bytes.push(0);
 for(let i=7;i>=0;i--)bytes.push((bitLen/Math.pow(2,i*8))&0xff);
 const rr=(x,n)=>(x>>>n)|(x<<(32-n));const w=new Array(64);
 for(let off=0;off<bytes.length;off+=64){
  for(let i=0;i<16;i++)w[i]=(bytes[off+i*4]<<24)|(bytes[off+i*4+1]<<16)|(bytes[off+i*4+2]<<8)|bytes[off+i*4+3];
  for(let i=16;i<64;i++){const s0=rr(w[i-15],7)^rr(w[i-15],18)^(w[i-15]>>>3),s1=rr(w[i-2],17)^rr(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}
  let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
  for(let i=0;i<64;i++){const S1=rr(e,6)^rr(e,11)^rr(e,25),ch=(e&f)^(~e&g),t1=(h+S1+ch+K[i]+w[i])|0,S0=rr(a,2)^rr(a,13)^rr(a,22),mj=(a&b)^(a&c)^(b&c),t2=(S0+mj)|0;
   h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}
  h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0;
 }
 return[h0,h1,h2,h3,h4,h5,h6,h7].map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}

/* ---------- LOGIN ---------- */
async function hubLogin(userOrEmail,pass){
 const u=userOrEmail.trim().toLowerCase().split('@')[0];
 const rows=await api('gtahub_usuarios?username=eq.'+encodeURIComponent(u)+'&select=username,display_name,role,salt,pass_hash');
 const row=rows&&rows[0];
 if(!row||sha256hex(row.salt+':'+pass)!==row.pass_hash)return null;
 HUB.user={username:row.username,name:row.display_name,role:row.role};
 return HUB.user;
}

/* ---------- CARGA DE DATOS ---------- */
function mapPost(r){
 const pf=PF_DB[r.platform]||'dc';
 return{id:r.id,t:r.title,brand:r.brand||'ESP',srv:r.srv||'Orion',pf,
  st:ST_DB[r.status]||'borrador',d:r.publish_date||'',h:r.publish_time||'',
  reach:r.views||0,eng:r.interactions||0,likes:r.likes||0,url:r.url||'',
  thumb:r.thumb||THUMB_PF[pf],fmt:r.fmt||r.type||'post',owner:r.created_by||'—',
  copy:r.copy_text||r.notes||'',chk:Array.isArray(r.chk)?r.chk:[],
  chkState:Array.isArray(r.chk_state)?r.chk_state:(Array.isArray(r.chk)?r.chk.map(()=>false):[])};
}
function mapTask(r){
 return{id:r.id,t:r.title,col:r.col,prio:r.prio,brand:r.brand||'ESP',srv:r.srv||'Orion',
  pf:r.platform?(PF_DB[r.platform]||null):null,dueDate:r.due_date||'',owner:r.owner||'—',
  prog:r.prog||0,desc:r.descr||''};
}
function mapIdea(r){
 return{id:r.id,t:r.title,pf:PF_DB[r.platform]||'ig',brand:r.brand||'ESP',
  imp:r.imp||3,eff:r.eff||3,st:r.status==='aprobada'?'aprobada':'revision',
  d:r.description||'',why:r.rationale||'',copy:r.copy_text||'',src:r.source,raw:r.status};
}
function mapTrend(r){
 return{id:r.id,t:r.title,rel:r.relevance||'media',note:r.insight||'',src:r.source_url||'',d:(r.created_at||'').slice(0,10)};
}
async function hubLoad(){
 const[pubs,tasks,ideas,trends,metas]=await Promise.all([
  api('gtahub_publicaciones?select=*&order=publish_date.desc.nullslast&limit=500'),
  api('gtahub_tareas?select=*&order=created_at.asc&limit=300'),
  api('gtahub_ideas?select=*&order=created_at.desc&limit=300'),
  api('gtahub_tendencias?select=*&order=created_at.desc&limit=100'),
  api('gtahub_metas?select=*'),
 ]);
 POSTS.length=0;pubs.forEach(r=>POSTS.push(mapPost(r)));
 TASKS.length=0;tasks.forEach(r=>TASKS.push(mapTask(r)));
 IDEAS.length=0;ideas.filter(r=>r.status!=='descartada'&&r.status!=='convertida').forEach(r=>IDEAS.push(mapIdea(r)));
 TRENDS.length=0;trends.forEach(r=>TRENDS.push(mapTrend(r)));
 (metas||[]).forEach(m=>{const k=PF_DB[m.platform];if(k)HUB.metas[k]=m.weekly_goal});
 HUB.online=true;
}

/* ---------- ESCRITURA ---------- */
const by=()=>HUB.user?HUB.user.name:null;
async function dbCreatePost(f){
 return api('gtahub_publicaciones',{method:'POST',body:JSON.stringify({
  title:f.t,platform:DB_PF[f.pf]||'instagram',type:f.fmt||'post',status:DB_ST[f.st]||'borrador',
  publish_date:f.d||null,publish_time:f.h||null,brand:f.brand,srv:f.srv,fmt:f.fmt||null,
  copy_text:f.copy||null,notes:f.notes||null,chk:f.chk||[],chk_state:(f.chk||[]).map(()=>false),
  created_by:by()})});
}
async function dbPatchPost(id,patch){
 return api('gtahub_publicaciones?id=eq.'+id,{method:'PATCH',body:JSON.stringify(patch)});
}
async function dbDeletePost(id){return api('gtahub_publicaciones?id=eq.'+id,{method:'DELETE'})}
async function dbCreateTask(f){
 return api('gtahub_tareas',{method:'POST',body:JSON.stringify({
  title:f.t,col:f.col||'todo',prio:f.prio||'media',brand:f.brand||'ESP',srv:f.srv||'Orion',
  platform:f.pf?DB_PF[f.pf]:null,due_date:f.dueDate||null,owner:f.owner||by()||'—',
  prog:f.prog||0,descr:f.desc||null,created_by:by()})});
}
async function dbPatchTask(id,patch){return api('gtahub_tareas?id=eq.'+id,{method:'PATCH',body:JSON.stringify(patch)})}
async function dbDeleteTask(id){return api('gtahub_tareas?id=eq.'+id,{method:'DELETE'})}
async function dbCreateIdea(f){
 return api('gtahub_ideas',{method:'POST',body:JSON.stringify({
  title:f.t,description:f.d||null,platform:DB_PF[f.pf]||'instagram',brand:f.brand||'ESP',
  imp:f.imp||3,eff:f.eff||3,status:'nueva',source:'manual',priority:'media',
  rationale:f.why||null,created_by:by()})});
}
async function dbPatchIdea(id,patch){return api('gtahub_ideas?id=eq.'+id,{method:'PATCH',body:JSON.stringify(patch)})}

/* ---------- HELPERS DE FECHA ---------- */
const todayISO=()=>{const t=new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')};
const MESES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function dlabel(d){
 if(!d)return 'sin fecha';
 const t=todayISO();
 if(d===t)return 'Hoy';
 const tm=new Date();tm.setDate(tm.getDate()+1);
 if(d===fmtISO(tm))return 'Mañana';
 return +d.slice(8,10)+' '+MESES[+d.slice(5,7)-1]+(d.slice(0,4)!==t.slice(0,4)?' '+d.slice(0,4):'');
}
function fmtISO(dt){return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')}
function dueInfo(t){
 if(!t.dueDate)return{label:'sin fecha',late:false};
 const late=t.col!=='done'&&t.dueDate<todayISO();
 const days=Math.round((new Date(t.dueDate+'T12:00')-new Date(todayISO()+'T12:00'))/864e5);
 return{label:late?('Vencida · '+Math.abs(days)+' día'+(Math.abs(days)!==1?'s':'')):dlabel(t.dueDate),late};
}
function daysAgoISO(n){const d=new Date();d.setDate(d.getDate()-n);return fmtISO(d)}
function mondayISO(off=0){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)+off*7);return fmtISO(d)}
