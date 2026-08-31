/* ============================================================
   GTAHUB · Content Hub
   Publicaciones, pendientes, ideas y métricas del equipo.
   Datos en Supabase (Postgres + RLS + realtime).
   ============================================================ */

/* ---------- Catálogos ---------- */

const PLATAFORMAS = [
  { id: 'instagram', nombre: 'Instagram', color: '#E1306C', ic: '📸' },
  { id: 'tiktok',    nombre: 'TikTok',    color: '#25F4EE', ic: '🎵' },
  { id: 'discord',   nombre: 'Discord',   color: '#5865F2', ic: '💬' },
  { id: 'email',     nombre: 'Email',     color: '#F2A007', ic: '✉️' },
  { id: 'facebook',  nombre: 'Facebook',  color: '#1877F2', ic: '👥' }
];

const SECCIONES = [
  { id: 'esp', nombre: 'ESP', detalle: 'Orion / Andromeda', color: '#E8005A' },
  { id: 'pe',  nombre: 'PE',  detalle: 'Pegasus · English', color: '#9085e9' }
];

const SECCION_OPCIONES = [
  { id: 'esp',   nombre: 'GTAHUB ESP · Orion / Andromeda' },
  { id: 'pe',    nombre: 'GTAHUB PE · Pegasus (inglés)' },
  { id: 'ambas', nombre: 'Ambas secciones' }
];

const METAS_BASE = { tiktok: 7, instagram: 5, facebook: 3, discord: 2, email: 1 };

const ESTADOS_PUB = [
  { id: 'idea',       nombre: 'Idea' },
  { id: 'borrador',   nombre: 'Borrador' },
  { id: 'programada', nombre: 'Programada' },
  { id: 'publicada',  nombre: 'Publicada' },
  { id: 'pausada',    nombre: 'Pausada' }
];

const COLUMNAS = [
  { id: 'por_hacer',   nombre: 'Por hacer' },
  { id: 'en_progreso', nombre: 'En progreso' },
  { id: 'listo',       nombre: 'Listo' }
];

const PRIORIDADES = [
  { id: 'alta',  nombre: 'Alta' },
  { id: 'media', nombre: 'Media' },
  { id: 'baja',  nombre: 'Baja' }
];

const ESTADOS_IDEA = [
  { id: 'nueva',        nombre: 'Nueva' },
  { id: 'en_evaluacion', nombre: 'En evaluación' },
  { id: 'aprobada',     nombre: 'Aprobada' },
  { id: 'convertida',   nombre: 'Convertida' },
  { id: 'descartada',   nombre: 'Descartada' }
];

const VISTAS = [
  { id: 'inicio',        nombre: 'Inicio',        ic: '🏠' },
  { id: 'pendientes',    nombre: 'Pendientes',    ic: '✅' },
  { id: 'publicaciones', nombre: 'Publicaciones', ic: '📣' },
  { id: 'calendario',    nombre: 'Calendario',    ic: '🗓️' },
  { id: 'ideas',         nombre: 'Ideas',         ic: '💡' },
  { id: 'metricas',      nombre: 'Métricas',      ic: '📈' }
];

/* ---------- Estado ---------- */

let sb = null;

const S = {
  user: null,
  perfil: null,
  perfiles: [],
  metas: [],
  publicaciones: [],
  pendientes: [],
  ideas: [],
  tendencias: [],
  vista: 'inicio',
  seccion: localStorage.getItem('gtahub.seccion') || 'todas',
  filtros: { q: '', plataforma: '', estado: '' },
  mes: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  dragId: null,
  canal: null
};

/* ---------- Utilidades ---------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function plat(id) {
  return PLATAFORMAS.find(p => p.id === id) || { id, nombre: id, color: '#888', ic: '•' };
}

function nombreEstado(lista, id) {
  const e = lista.find(x => x.id === id);
  return e ? e.nombre : id;
}

function toast(texto, malo) {
  const root = $('#toast-root');
  root.innerHTML = '<div class="toast' + (malo ? ' bad' : '') + '">' + esc(texto) + '</div>';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { root.innerHTML = ''; }, 3200);
}

function hoy0() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function fechaHora(iso) {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (isNaN(d)) return 'Sin fecha';
  return d.toLocaleString('es-MX', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function paraInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
         'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function claveDia(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function num(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(v);
}

function iniciales(texto) {
  const partes = String(texto || '?').trim().split(/[\s@._-]+/).filter(Boolean);
  return ((partes[0] || '?')[0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
}

function enSeccion(x) {
  if (S.seccion === 'todas') return true;
  const s = x.seccion || 'ambas';
  return s === 'ambas' || s === S.seccion;
}

function seccionInicial() {
  return S.seccion === 'pe' ? 'pe' : 'esp';
}

function pillSeccion(x) {
  const s = x.seccion || 'ambas';
  if (s === 'ambas') return '<span class="pill sec-ambas">ESP·PE</span>';
  const sec = SECCIONES.find(z => z.id === s);
  return '<span class="pill sec-' + s + '">' + esc(sec ? sec.nombre : s) + '</span>';
}

function lunesDe(fecha) {
  const d = new Date(fecha);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function metaDe(seccion, plataforma) {
  const fila = S.metas.find(m => m.seccion === seccion && m.plataforma === plataforma);
  return fila ? fila.meta_semanal : (METAS_BASE[plataforma] ?? 3);
}

function metaPara(plataforma) {
  if (S.seccion === 'todas') return metaDe('esp', plataforma) + metaDe('pe', plataforma);
  return metaDe(S.seccion, plataforma);
}

function pills(ids) {
  return (ids || []).map(id => {
    const p = plat(id);
    return '<span class="pill" style="border-color:' + p.color + '55;color:' + p.color + '">' +
           '<span class="dot" style="background:' + p.color + '"></span>' + esc(p.nombre) + '</span>';
  }).join('');
}

/* ============================================================
   Arranque
   ============================================================ */

const LS_URL = 'gtahub.supabase.url';
const LS_KEY = 'gtahub.supabase.key';

function credenciales() {
  const cfg = window.GTAHUB_CONFIG || {};
  return {
    url: (cfg.SUPABASE_URL || localStorage.getItem(LS_URL) || '').trim(),
    key: (cfg.SUPABASE_ANON_KEY || localStorage.getItem(LS_KEY) || '').trim()
  };
}

function pantalla(cual) {
  $('#setup').classList.toggle('hidden', cual !== 'setup');
  $('#login').classList.toggle('hidden', cual !== 'login');
  $('#app').classList.toggle('on', cual === 'app');
}

async function arrancar() {
  $$('.year').forEach(e => { e.textContent = new Date().getFullYear(); });

  const { url, key } = credenciales();
  if (!url || !key) { pantalla('setup'); return; }

  try {
    sb = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  } catch (e) {
    pantalla('setup');
    $('#setup-msg').className = 'msg error';
    $('#setup-msg').textContent = 'No se pudo conectar: ' + e.message;
    return;
  }

  const { data } = await sb.auth.getSession();
  if (data && data.session) {
    await entrar(data.session.user);
  } else {
    pantalla('login');
  }

  sb.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT') {
      S.user = null;
      pantalla('login');
    }
  });
}

/* ---------- Setup ---------- */

$('#setup-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const url = $('#su-url').value.trim().replace(/\/+$/, '');
  const key = $('#su-key').value.trim();
  if (!/^https:\/\/.+/.test(url)) {
    $('#setup-msg').className = 'msg error';
    $('#setup-msg').textContent = 'La URL debe empezar con https://';
    return;
  }
  localStorage.setItem(LS_URL, url);
  localStorage.setItem(LS_KEY, key);
  $('#setup-msg').className = 'msg ok';
  $('#setup-msg').textContent = 'Guardado. Conectando…';
  setTimeout(() => location.reload(), 500);
});

/* ---------- Login ---------- */

$('#login-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const msg = $('#login-msg');
  const btn = $('#lg-btn');
  msg.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Entrando…';

  const { data, error } = await sb.auth.signInWithPassword({
    email: $('#lg-email').value.trim(),
    password: $('#lg-pass').value
  });

  btn.disabled = false;
  btn.textContent = 'Entrar';

  if (error) {
    msg.className = 'msg error';
    msg.textContent = error.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos.'
      : error.message;
    return;
  }
  $('#lg-pass').value = '';
  await entrar(data.user);
});

async function salir() {
  if (S.canal) { sb.removeChannel(S.canal); S.canal = null; }
  await sb.auth.signOut();
  S.user = null;
  pantalla('login');
}

$('#logout').addEventListener('click', salir);
$('#logout-m').addEventListener('click', salir);

/* ---------- Sesión iniciada ---------- */

async function entrar(user) {
  S.user = user;
  pantalla('app');
  $('#view').innerHTML = '<div class="empty">Cargando el hub…</div>';
  pintarNav();
  await cargarTodo();
  pintarIdentidad();
  suscribir();
  render();
}

function pintarIdentidad() {
  const nombre = (S.perfil && S.perfil.nombre) || (S.user.email || '').split('@')[0];
  const rol = (S.perfil && S.perfil.rol) || 'Equipo';
  $('#me-name').textContent = nombre;
  $('#me-role').textContent = rol;
  $('#me-avatar').textContent = iniciales(nombre);
}

/* ============================================================
   Datos
   ============================================================ */

async function cargarTodo() {
  const [pub, pen, ide, ten, per, met] = await Promise.all([
    sb.from('publicaciones').select('*').order('fecha_programada', { ascending: true }),
    sb.from('pendientes').select('*').order('orden', { ascending: true }),
    sb.from('ideas').select('*').order('created_at', { ascending: false }),
    sb.from('tendencias').select('*').order('periodo', { ascending: false }).limit(24),
    sb.from('perfiles').select('*'),
    sb.from('metas').select('*')
  ]);

  const err = [pub, pen, ide, ten, per, met].find(r => r.error);
  if (err) {
    console.error(err.error);
    toast('Error leyendo datos: ' + err.error.message, true);
  }

  S.publicaciones = pub.data || [];
  S.pendientes = pen.data || [];
  S.ideas = ide.data || [];
  S.tendencias = ten.data || [];
  S.perfiles = per.data || [];
  S.metas = met.data || [];
  S.perfil = S.perfiles.find(p => p.id === S.user.id) || null;
}

function suscribir() {
  if (S.canal) sb.removeChannel(S.canal);
  S.canal = sb.channel('gtahub-live')
    .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
      await cargarTodo();
      render();
    })
    .subscribe();
}

async function guardar(tabla, fila, id) {
  const q = id
    ? sb.from(tabla).update(fila).eq('id', id)
    : sb.from(tabla).insert(fila);
  const { error } = await q;
  if (error) { toast(error.message, true); return false; }
  await cargarTodo();
  render();
  return true;
}

async function borrar(tabla, id) {
  const { error } = await sb.from(tabla).delete().eq('id', id);
  if (error) { toast(error.message, true); return false; }
  await cargarTodo();
  render();
  return true;
}

/* ============================================================
   Navegación
   ============================================================ */

function pendientesAbiertos() {
  return S.pendientes.filter(enSeccion).filter(p => p.estado !== 'listo').length;
}

function pintarSecciones() {
  const items = [{ id: 'todas', nombre: 'Todo' }].concat(SECCIONES);
  const html = items.map(x =>
    '<button data-seccion="' + x.id + '" class="' + (S.seccion === x.id ? 'on' : '') + '"' +
    (x.detalle ? ' title="' + esc(x.detalle) + '"' : '') + '>' + esc(x.nombre) + '</button>'
  ).join('');
  const a = $('#seg-side'); if (a) a.innerHTML = html;
  const b = $('#seg-m'); if (b) b.innerHTML = html;
}

function pintarNav() {
  const abiertos = pendientesAbiertos();
  $('#nav').innerHTML = VISTAS.map(v =>
    '<button data-ir="' + v.id + '" class="' + (v.id === S.vista ? 'active' : '') + '">' +
      '<span class="ic">' + v.ic + '</span>' + esc(v.nombre) +
      (v.id === 'pendientes' && abiertos ? '<span class="badge">' + abiertos + '</span>' : '') +
    '</button>'
  ).join('');

  $('#tabbar').innerHTML = VISTAS.map(v =>
    '<button data-ir="' + v.id + '" class="' + (v.id === S.vista ? 'active' : '') + '">' +
      '<span class="ic">' + v.ic + '</span>' + esc(v.nombre) +
    '</button>'
  ).join('');
}

document.addEventListener('click', ev => {
  const ir = ev.target.closest('[data-ir]');
  if (ir) {
    S.vista = ir.dataset.ir;
    pintarNav();
    render();
    window.scrollTo({ top: 0 });
    return;
  }
  const seg = ev.target.closest('[data-seccion]');
  if (seg && !seg.closest('.modal')) {
    S.seccion = seg.dataset.seccion;
    localStorage.setItem('gtahub.seccion', S.seccion);
    render();
  }
});

/* ============================================================
   Render
   ============================================================ */

function cabecera(eyebrow, titulo, acciones) {
  return '<div class="topbar"><div>' +
    '<div class="eyebrow">' + esc(eyebrow) + '</div>' +
    '<h1>' + esc(titulo) + '</h1>' +
    '</div><div class="actions">' + (acciones || '') + '</div></div>';
}

function render() {
  pintarNav();
  pintarSecciones();
  const v = $('#view');
  if (S.vista === 'inicio') v.innerHTML = vistaInicio();
  else if (S.vista === 'publicaciones') v.innerHTML = vistaPublicaciones();
  else if (S.vista === 'pendientes') { v.innerHTML = vistaPendientes(); armarDnD(); }
  else if (S.vista === 'calendario') v.innerHTML = vistaCalendario();
  else if (S.vista === 'ideas') v.innerHTML = vistaIdeas();
  else if (S.vista === 'metricas') v.innerHTML = vistaMetricas();
}

/* ---------- Inicio ---------- */

function proximas(limite) {
  const ahora = Date.now();
  return S.publicaciones.filter(enSeccion)
    .filter(p => p.fecha_programada && new Date(p.fecha_programada).getTime() >= ahora && p.estado !== 'publicada')
    .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))
    .slice(0, limite || 6);
}

function tarjetaCadencia() {
  const inicio = lunesDe(new Date());
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 7);
  const publicadas = S.publicaciones.filter(enSeccion).filter(p => {
    if (p.estado !== 'publicada' || !p.fecha_programada) return false;
    const f = new Date(p.fecha_programada);
    return f >= inicio && f < fin;
  });
  const filas = PLATAFORMAS.map(pl => {
    const n = publicadas.filter(p => (p.plataformas || []).includes(pl.id)).length;
    const meta = metaPara(pl.id);
    const pct = meta > 0 ? Math.min(100, n / meta * 100) : 0;
    return '<div class="bar-row">' +
      '<div class="lbl"><span class="dot" style="background:' + pl.color + '"></span>' + esc(pl.nombre) + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + pl.color + '"></div></div>' +
      '<div class="val"><b>' + n + '</b><span class="goal" data-meta="' + pl.id + '" title="Editar meta semanal"> / ' + meta + '</span>' +
      (meta > 0 && n >= meta ? ' ✓' : '') + '</div>' +
    '</div>';
  }).join('');
  const nota = S.seccion === 'todas'
    ? 'Metas de ESP + PE sumadas. Elige una sección para editar sus metas.'
    : 'Publicadas esta semana vs. meta. Toca el número de meta para cambiarla.';
  return '<div class="card">' +
    '<h2>Cadencia semanal</h2>' +
    '<div class="bars">' + filas + '</div>' +
    '<div class="hint">' + esc(nota) + '</div>' +
  '</div>';
}

function vistaInicio() {
  const ahora = new Date();
  const delMes = S.publicaciones.filter(enSeccion).filter(p => {
    const f = p.fecha_programada ? new Date(p.fecha_programada) : null;
    return f && f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
  });
  const programadas = S.publicaciones.filter(enSeccion).filter(p => p.estado === 'programada').length;
  const ideasNuevas = S.ideas.filter(enSeccion).filter(i => i.estado === 'nueva').length;

  const prox = proximas(6);
  const urgentes = S.pendientes.filter(enSeccion)
    .filter(p => p.estado !== 'listo')
    .sort((a, b) => {
      const peso = { alta: 0, media: 1, baja: 2 };
      const d = (peso[a.prioridad] ?? 1) - (peso[b.prioridad] ?? 1);
      if (d !== 0) return d;
      return (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999');
    })
    .slice(0, 6);

  const kpi = (v, l) => '<div class="card kpi"><div class="bar"></div><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div></div>';

  return cabecera('Panel del equipo', 'Inicio',
      '<button class="btn btn-ghost" data-nueva="pendiente">+ Pendiente</button>' +
      '<button class="btn btn-primary" data-nueva="publicacion">+ Publicación</button>') +

    '<div class="grid g-4" style="margin-bottom:16px">' +
      kpi(delMes.length, 'Publicaciones este mes') +
      kpi(programadas, 'Programadas') +
      kpi(pendientesAbiertos(), 'Pendientes abiertos') +
      kpi(ideasNuevas, 'Ideas nuevas') +
    '</div>' +

    '<div class="grid g-2">' +
      '<div class="card">' +
        '<h2>Próximas programadas <span class="count">' + prox.length + '</span></h2>' +
        (prox.length ? '<div class="list">' + prox.map(p =>
          '<div class="row" data-pub="' + p.id + '">' +
            '<div class="grow">' +
              '<div class="t">' + esc(p.titulo) + '</div>' +
              '<div class="s">' + pills(p.plataformas) + '</div>' +
            '</div>' +
            '<div class="when">' + esc(fechaHora(p.fecha_programada)) + '</div>' +
          '</div>'
        ).join('') + '</div>'
        : '<div class="empty">Nada programado todavía.<br>Crea una publicación y ponle fecha.</div>') +
      '</div>' +

      '<div class="card">' +
        '<h2>Pendientes urgentes <span class="count">' + urgentes.length + '</span></h2>' +
        (urgentes.length ? '<div class="list">' + urgentes.map(t =>
          '<div class="row" data-pen="' + t.id + '">' +
            '<div class="grow">' +
              '<div class="t">' + esc(t.titulo) + '</div>' +
              '<div class="s">' + esc(nombreEstado(COLUMNAS, t.estado)) +
                (t.responsable ? ' · ' + esc(t.responsable) : '') + '</div>' +
            '</div>' +
            '<span class="pill pr-' + esc(t.prioridad || 'media') + '">' + esc(t.prioridad || 'media') + '</span>' +
          '</div>'
        ).join('') + '</div>'
        : '<div class="empty">Sin pendientes abiertos. 🎉</div>') +
      '</div>' +

      tarjetaCadencia() +

      '<div class="card">' +
        '<h2>Últimas tendencias</h2>' +
        (S.tendencias.filter(enSeccion).length ? '<div class="list">' + S.tendencias.filter(enSeccion).slice(0, 5).map(t =>
          '<div class="row trend" style="cursor:default">' +
            '<div class="grow">' +
              '<div class="t">' + esc(t.titulo) + '</div>' +
              '<div class="src">' + esc(t.fuente || 'Investigación semanal') +
                (t.periodo ? ' · ' + esc(fechaCorta(t.periodo)) : '') + '</div>' +
            '</div>' +
            (t.valor != null ? '<div class="v">' + esc(num(t.valor)) + '</div>' : '') +
          '</div>'
        ).join('') + '</div>'
        : '<div class="empty">La tarea semanal de tendencias todavía no ha escrito nada aquí.</div>') +
      '</div>' +
    '</div>';
}

/* ---------- Publicaciones ---------- */

function filtrarPublicaciones() {
  const q = S.filtros.q.toLowerCase();
  return S.publicaciones.filter(enSeccion).filter(p => {
    if (S.filtros.plataforma && !(p.plataformas || []).includes(S.filtros.plataforma)) return false;
    if (S.filtros.estado && p.estado !== S.filtros.estado) return false;
    if (q) {
      const texto = (p.titulo + ' ' + (p.copy_texto || '') + ' ' + (p.hashtags || '') + ' ' + (p.responsable || '')).toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const fa = a.fecha_programada || a.created_at || '';
    const fb = b.fecha_programada || b.created_at || '';
    return fb.localeCompare(fa);
  });
}

function vistaPublicaciones() {
  const lista = filtrarPublicaciones();

  const filtros = '<div class="filters">' +
    '<input class="search" id="f-q" type="text" placeholder="Buscar por título, copy, hashtag…" value="' + esc(S.filtros.q) + '">' +
    '<select id="f-plat"><option value="">Todas las plataformas</option>' +
      PLATAFORMAS.map(p => '<option value="' + p.id + '"' + (S.filtros.plataforma === p.id ? ' selected' : '') + '>' + esc(p.nombre) + '</option>').join('') +
    '</select>' +
    '<select id="f-est"><option value="">Todos los estados</option>' +
      ESTADOS_PUB.map(e => '<option value="' + e.id + '"' + (S.filtros.estado === e.id ? ' selected' : '') + '>' + esc(e.nombre) + '</option>').join('') +
    '</select>' +
  '</div>';

  const cuerpo = lista.length
    ? '<div class="card scroll-x"><table class="data"><thead><tr>' +
        '<th>Publicación</th><th>Plataformas</th><th>Estado</th><th>Fecha</th><th class="num">Alcance</th>' +
      '</tr></thead><tbody>' +
      lista.map(p =>
        '<tr data-pub="' + p.id + '" style="cursor:pointer">' +
          '<td><b>' + esc(p.titulo) + '</b>' +
            (p.responsable ? '<div class="s" style="color:var(--text-3);font-size:12px;margin-top:3px">' + esc(p.responsable) + '</div>' : '') +
          '</td>' +
          '<td><span class="pf">' + pillSeccion(p) + pills(p.plataformas) + '</span></td>' +
          '<td><span class="pill st-' + esc(p.estado) + '">' + esc(nombreEstado(ESTADOS_PUB, p.estado)) + '</span></td>' +
          '<td style="white-space:nowrap;color:var(--text-2)">' + esc(fechaCorta(p.fecha_programada)) + '</td>' +
          '<td class="num">' + esc(num(p.alcance)) + '</td>' +
        '</tr>'
      ).join('') + '</tbody></table></div>'
    : '<div class="card"><div class="empty">Sin publicaciones con esos filtros.</div></div>';

  return cabecera('Contenido', 'Publicaciones',
      '<button class="btn btn-ghost" data-csv>Exportar CSV</button>' +
      '<button class="btn btn-primary" data-nueva="publicacion">+ Nueva publicación</button>') +
    filtros + cuerpo;
}

/* ---------- Pendientes (kanban) ---------- */

function vistaPendientes() {
  return cabecera('Flujo de trabajo', 'Pendientes',
      '<button class="btn btn-primary" data-nueva="pendiente">+ Nuevo pendiente</button>') +
    '<div class="kanban">' + COLUMNAS.map(col => {
      const tareas = S.pendientes.filter(enSeccion)
        .filter(t => (t.estado || 'por_hacer') === col.id)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      return '<div class="col" data-col="' + col.id + '">' +
        '<h3>' + esc(col.nombre) + '<span class="n">' + tareas.length + '</span></h3>' +
        '<div class="stack">' + (tareas.length ? tareas.map(tarjetaPendiente).join('')
          : '<div class="empty" style="padding:16px 6px">Arrastra tareas aquí</div>') + '</div>' +
      '</div>';
    }).join('') + '</div>';
}

function tarjetaPendiente(t) {
  const vencida = t.fecha_limite && t.estado !== 'listo' && new Date(t.fecha_limite + 'T23:59') < hoy0();
  return '<div class="task p-' + esc(t.prioridad || 'media') + (vencida ? ' vencida' : '') + '" draggable="true" data-pen="' + t.id + '">' +
    '<div class="t">' + esc(t.titulo) + '</div>' +
    (t.descripcion ? '<div class="d">' + esc(t.descripcion) + '</div>' : '') +
    '<div class="foot">' +
      pillSeccion(t) +
      '<span class="pill pr-' + esc(t.prioridad || 'media') + '">' + esc(t.prioridad || 'media') + '</span>' +
      (t.responsable ? '<span class="due">' + esc(t.responsable) + '</span>' : '') +
      (t.fecha_limite ? '<span class="due">📅 ' + esc(fechaCorta(t.fecha_limite)) + '</span>' : '') +
    '</div>' +
  '</div>';
}

function armarDnD() {
  $$('.task').forEach(el => {
    el.addEventListener('dragstart', ev => {
      S.dragId = el.dataset.pen;
      el.classList.add('dragging');
      ev.dataTransfer.effectAllowed = 'move';
      try { ev.dataTransfer.setData('text/plain', S.dragId); } catch (e) {}
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      $$('.col').forEach(c => c.classList.remove('drop'));
    });
  });

  $$('.col').forEach(col => {
    col.addEventListener('dragover', ev => { ev.preventDefault(); col.classList.add('drop'); });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', async ev => {
      ev.preventDefault();
      col.classList.remove('drop');
      const id = S.dragId || ev.dataTransfer.getData('text/plain');
      if (!id) return;
      const tarea = S.pendientes.find(t => t.id === id);
      const destino = col.dataset.col;
      if (!tarea || tarea.estado === destino) return;
      const orden = S.pendientes.filter(t => t.estado === destino).length;
      tarea.estado = destino;
      tarea.orden = orden;
      render();
      const { error } = await sb.from('pendientes')
        .update({ estado: destino, orden: orden }).eq('id', id);
      if (error) { toast(error.message, true); }
      else { toast('Movido a “' + nombreEstado(COLUMNAS, destino) + '”'); }
      await cargarTodo();
      render();
    });
  });
}

/* ---------- Calendario ---------- */

function vistaCalendario() {
  const base = S.mes;
  const primero = new Date(base.getFullYear(), base.getMonth(), 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - ((primero.getDay() + 6) % 7)); // semana arranca en lunes

  const porDia = {};
  S.publicaciones.filter(enSeccion).forEach(p => {
    if (!p.fecha_programada) return;
    const k = claveDia(new Date(p.fecha_programada));
    (porDia[k] = porDia[k] || []).push(p);
  });

  const hoyK = claveDia(new Date());
  const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  let celdas = dows.map(d => '<div class="dow">' + d + '</div>').join('');

  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const k = claveDia(d);
    const fuera = d.getMonth() !== base.getMonth();
    const evs = (porDia[k] || []).slice(0, 3);
    const extra = (porDia[k] || []).length - evs.length;
    celdas += '<div class="day' + (fuera ? ' out' : '') + (k === hoyK ? ' today' : '') + '">' +
      '<div class="n">' + d.getDate() + '</div>' +
      evs.map(p => {
        const c = plat((p.plataformas || [])[0]).color;
        return '<div class="ev" data-pub="' + p.id + '" style="border-left-color:' + c + '" title="' + esc(p.titulo) + '">' + esc(p.titulo) + '</div>';
      }).join('') +
      (extra > 0 ? '<div class="n">+' + extra + ' más</div>' : '') +
    '</div>';
  }

  const titulo = base.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return cabecera('Programación', 'Calendario',
      '<button class="btn btn-primary" data-nueva="publicacion">+ Nueva publicación</button>') +
    '<div class="cal-head">' +
      '<button class="btn btn-ghost btn-sm" data-mes="-1">‹</button>' +
      '<div class="m">' + esc(titulo.charAt(0).toUpperCase() + titulo.slice(1)) + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-mes="1">›</button>' +
      '<button class="btn btn-ghost btn-sm" data-mes="0">Hoy</button>' +
    '</div>' +
    '<div class="cal-grid">' + celdas + '</div>';
}

/* ---------- Ideas ---------- */

function vistaIdeas() {
  const activas = S.ideas.filter(enSeccion).filter(i => i.estado !== 'descartada');
  const tend = S.tendencias.filter(enSeccion);

  const tarjetas = activas.length
    ? '<div class="grid g-3">' + activas.map(i =>
        '<div class="card idea" data-idea="' + i.id + '" style="cursor:pointer">' +
          '<div class="t">' + esc(i.titulo) + '</div>' +
          (i.descripcion ? '<div class="d">' + esc(i.descripcion) + '</div>' : '') +
          '<div class="foot">' +
            pillSeccion(i) +
            '<span class="pill">' + esc(nombreEstado(ESTADOS_IDEA, i.estado)) + '</span>' +
            pills(i.plataformas) +
            '<span class="score" style="margin-left:auto">Impacto <b>' + (i.impacto || 3) + '</b> · Esfuerzo <b>' + (i.esfuerzo || 3) + '</b></span>' +
          '</div>' +
        '</div>'
      ).join('') + '</div>'
    : '<div class="card"><div class="empty">Sin ideas todavía.<br>Guarda aquí lo que se le ocurra al equipo.</div></div>';

  const tendencias = tend.length
    ? '<div class="grid g-3">' + tend.map(t =>
        '<div class="card trend">' +
          '<div class="t" style="font-weight:700">' + esc(t.titulo) + '</div>' +
          (t.resumen ? '<div class="d" style="margin-top:8px;font-size:13px;line-height:20px;color:var(--text-2)">' + esc(t.resumen) + '</div>' : '') +
          '<div class="foot" style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            (t.valor != null ? '<span class="v">' + esc(num(t.valor)) + '</span>' : '') +
            (t.metrica ? '<span class="src">' + esc(t.metrica) + '</span>' : '') +
            '<span class="src" style="margin-left:auto">' + esc(t.fuente || 'Investigación') + '</span>' +
          '</div>' +
        '</div>'
      ).join('') + '</div>'
    : '<div class="card"><div class="empty">La investigación semanal de tendencias (servidores de roleplay) escribe aquí.<br>Tabla <b>tendencias</b> en Supabase.</div></div>';

  return cabecera('Banco de ideas', 'Ideas',
      '<button class="btn btn-primary" data-nueva="idea">+ Nueva idea</button>') +
    tarjetas +
    '<h2 class="display" style="margin:30px 0 14px;font-size:15px;letter-spacing:3px;color:var(--text-2)">Tendencias del sector</h2>' +
    tendencias;
}

/* ---------- Métricas ---------- */

function barrasPorPlataforma(lista) {
  const totales = PLATAFORMAS.map(p => ({
    p,
    n: lista.filter(x => (x.plataformas || []).includes(p.id)).length
  }));
  const max = Math.max(1, ...totales.map(t => t.n));
  if (!lista.length) return '<div class="empty">Sin datos todavía.</div>';
  return '<div class="bars">' + totales.map(t =>
    '<div class="bar-row">' +
      '<div class="lbl"><span class="dot" style="background:' + t.p.color + '"></span>' + esc(t.p.nombre) + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + (t.n / max * 100) + '%;background:' + t.p.color + '"></div></div>' +
      '<div class="val">' + t.n + '</div>' +
    '</div>'
  ).join('') + '</div>';
}

function graficaSemanas(publicadas) {
  const lunes = lunesDe(new Date());
  const semanas = [];
  for (let i = 7; i >= 0; i--) {
    const ini = new Date(lunes);
    ini.setDate(lunes.getDate() - i * 7);
    const fin = new Date(ini);
    fin.setDate(ini.getDate() + 7);
    const n = publicadas.filter(p => {
      if (!p.fecha_programada) return false;
      const f = new Date(p.fecha_programada);
      return f >= ini && f < fin;
    }).length;
    semanas.push({
      etiqueta: ini.getDate() + ' ' + ini.toLocaleDateString('es-MX', { month: 'short' }),
      n
    });
  }
  const W = 480, H = 180, padL = 26, padB = 24, padT = 14;
  const max = Math.max(4, ...semanas.map(x => x.n));
  const bw = (W - padL - 8) / semanas.length;
  let ejes = '', barras = '', etiquetas = '';
  for (let g = 0; g <= 4; g++) {
    const v = Math.round(max * g / 4);
    const y = padT + (H - padT - padB) * (1 - g / 4);
    ejes += '<line x1="' + padL + '" x2="' + (W - 4) + '" y1="' + y + '" y2="' + y + '" stroke="#1e1e2e"/>' +
      '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="9" fill="rgba(255,255,255,.45)">' + v + '</text>';
  }
  semanas.forEach((sem, i) => {
    const h = (H - padT - padB) * (sem.n / max);
    const x = padL + i * bw + bw * 0.18;
    const ancho = bw * 0.64;
    if (sem.n > 0) {
      barras += '<rect x="' + x + '" y="' + (H - padB - h) + '" width="' + ancho + '" height="' + h +
        '" rx="3" fill="#E8005A"><title>Semana del ' + esc(sem.etiqueta) + ': ' + sem.n + '</title></rect>';
    } else {
      barras += '<rect x="' + x + '" y="' + (H - padB - 2) + '" width="' + ancho + '" height="2" fill="#1e1e2e"/>';
    }
    if (i % 2 === 0) {
      etiquetas += '<text x="' + (x + ancho / 2) + '" y="' + (H - 7) + '" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.45)">' + esc(sem.etiqueta) + '</text>';
    }
  });
  return '<div class="card"><h2>Publicadas por semana (8 semanas)</h2>' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Publicaciones por semana" style="width:100%;max-width:760px;height:auto;display:block;margin:0 auto">' +
    ejes + barras + etiquetas + '</svg></div>';
}

function vistaMetricas() {
  const publicadas = S.publicaciones.filter(enSeccion).filter(p => p.estado === 'publicada');
  const suma = campo => publicadas.reduce((a, p) => a + Number(p[campo] || 0), 0);
  const alcance = suma('alcance');
  const interacciones = suma('likes') + suma('comentarios') + suma('compartidos') + suma('guardados');
  const tasa = alcance ? (interacciones / alcance * 100).toFixed(1) + '%' : '—';

  const porPlataforma = PLATAFORMAS.map(pl => {
    const rows = publicadas.filter(p => (p.plataformas || []).includes(pl.id));
    return {
      pl,
      n: rows.length,
      alcance: rows.reduce((a, p) => a + Number(p.alcance || 0), 0),
      inter: rows.reduce((a, p) => a + Number(p.likes || 0) + Number(p.comentarios || 0) +
                                    Number(p.compartidos || 0) + Number(p.guardados || 0), 0)
    };
  });
  const maxAlc = Math.max(1, ...porPlataforma.map(x => x.alcance));

  const top = publicadas.slice()
    .sort((a, b) => Number(b.alcance || 0) - Number(a.alcance || 0))
    .slice(0, 8);

  const kpi = (v, l) => '<div class="card kpi"><div class="bar"></div><div class="v">' + v + '</div><div class="l">' + esc(l) + '</div></div>';

  return cabecera('Resultados', 'Métricas', '') +
    '<div class="grid g-4" style="margin-bottom:16px">' +
      kpi(publicadas.length, 'Publicaciones publicadas') +
      kpi(num(alcance), 'Alcance acumulado') +
      kpi(num(interacciones), 'Interacciones') +
      kpi(tasa, 'Tasa de interacción') +
    '</div>' +

    graficaSemanas(publicadas) +

    '<div class="grid g-2" style="margin-top:16px">' +
      '<div class="card"><h2>Alcance por plataforma</h2>' +
        (alcance ? '<div class="bars">' + porPlataforma.map(x =>
          '<div class="bar-row">' +
            '<div class="lbl"><span class="dot" style="background:' + x.pl.color + '"></span>' + esc(x.pl.nombre) + '</div>' +
            '<div class="bar-track"><div class="bar-fill" style="width:' + (x.alcance / maxAlc * 100) + '%;background:' + x.pl.color + '"></div></div>' +
            '<div class="val">' + num(x.alcance) + '</div>' +
          '</div>'
        ).join('') + '</div>' : '<div class="empty">Captura el alcance en cada publicación publicada.</div>') +
      '</div>' +

      '<div class="card"><h2>Volumen por plataforma</h2>' + barrasPorPlataforma(publicadas) + '</div>' +
    '</div>' +

    '<div class="card" style="margin-top:16px"><h2>Top publicaciones</h2>' +
      (top.length ? '<div class="scroll-x"><table class="data"><thead><tr>' +
        '<th>Publicación</th><th>Plataformas</th><th class="num">Alcance</th><th class="num">Likes</th><th class="num">Coment.</th><th class="num">Guardados</th>' +
      '</tr></thead><tbody>' + top.map(p =>
        '<tr data-pub="' + p.id + '" style="cursor:pointer">' +
          '<td><b>' + esc(p.titulo) + '</b></td>' +
          '<td><span class="pf">' + pills(p.plataformas) + '</span></td>' +
          '<td class="num">' + num(p.alcance) + '</td>' +
          '<td class="num">' + num(p.likes) + '</td>' +
          '<td class="num">' + num(p.comentarios) + '</td>' +
          '<td class="num">' + num(p.guardados) + '</td>' +
        '</tr>').join('') + '</tbody></table></div>'
      : '<div class="empty">Aún no hay publicaciones marcadas como publicadas.</div>') +
    '</div>';
}

/* ============================================================
   Modales
   ============================================================ */

function abrirModal(titulo, cuerpo, pie) {
  $('#modal-root').innerHTML =
    '<div class="modal" id="modal">' +
      '<div class="modal-card">' +
        '<div class="modal-head"><h3>' + esc(titulo) + '</h3><button class="x" id="modal-x">×</button></div>' +
        '<div class="modal-body">' + cuerpo + '</div>' +
        '<div class="modal-foot">' + pie + '</div>' +
      '</div>' +
    '</div>';
  const modal = $('#modal');
  $('#modal-x').addEventListener('click', cerrarModal);
  modal.addEventListener('mousedown', ev => { if (ev.target === modal) cerrarModal(); });
  return modal;
}

function cerrarModal() { $('#modal-root').innerHTML = ''; }

document.addEventListener('keydown', ev => { if (ev.key === 'Escape') cerrarModal(); });

function campoTexto(id, etiqueta, valor, tipo, ph) {
  return '<div class="field"><label for="' + id + '">' + esc(etiqueta) + '</label>' +
    '<input id="' + id + '" type="' + (tipo || 'text') + '" value="' + esc(valor == null ? '' : valor) + '"' +
    (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>';
}

function campoSelect(id, etiqueta, opciones, valor) {
  return '<div class="field"><label for="' + id + '">' + esc(etiqueta) + '</label><select id="' + id + '">' +
    opciones.map(o => '<option value="' + esc(o.id) + '"' + (o.id === valor ? ' selected' : '') + '>' + esc(o.nombre) + '</option>').join('') +
    '</select></div>';
}

function campoArea(id, etiqueta, valor, ph) {
  return '<div class="field"><label for="' + id + '">' + esc(etiqueta) + '</label>' +
    '<textarea id="' + id + '" placeholder="' + esc(ph || '') + '">' + esc(valor || '') + '</textarea></div>';
}

function campoPlataformas(sel) {
  return '<div class="field"><label>Plataformas</label><div class="checks" id="chk-plat">' +
    PLATAFORMAS.map(p => {
      const on = (sel || []).includes(p.id);
      return '<label class="check' + (on ? ' on' : '') + '" style="' + (on ? 'border-color:' + p.color + ';background:' + p.color + '22' : '') + '" data-color="' + p.color + '">' +
        '<input type="checkbox" value="' + p.id + '"' + (on ? ' checked' : '') + '>' +
        '<span class="dot" style="background:' + p.color + '"></span>' + esc(p.nombre) +
      '</label>';
    }).join('') + '</div></div>';
}

function leerPlataformas() {
  return $$('#chk-plat input:checked').map(i => i.value);
}

function armarChecks() {
  $$('#chk-plat .check').forEach(l => {
    l.addEventListener('click', () => {
      setTimeout(() => {
        const on = $('input', l).checked;
        l.classList.toggle('on', on);
        l.style.borderColor = on ? l.dataset.color : '';
        l.style.background = on ? l.dataset.color + '22' : '';
      }, 0);
    });
  });
}

/* ---------- Modal publicación ---------- */

function modalPublicacion(id) {
  const p = S.publicaciones.find(x => x.id === id) || {
    titulo: '', copy_texto: '', plataformas: [], estado: 'idea',
    fecha_programada: '', url: '', hashtags: '', responsable: '', notas: ''
  };
  const editando = !!id;

  const cuerpo =
    campoTexto('f-titulo', 'Título', p.titulo, 'text', 'Ej. Teaser del evento de fin de semana') +
    campoSelect('f-seccion', 'Sección', SECCION_OPCIONES, p.seccion || seccionInicial()) +
    campoPlataformas(p.plataformas) +
    '<div class="two">' +
      campoSelect('f-estado', 'Estado', ESTADOS_PUB, p.estado || 'idea') +
      campoTexto('f-fecha', 'Fecha y hora', paraInput(p.fecha_programada), 'datetime-local') +
    '</div>' +
    campoArea('f-copy', 'Copy', p.copy_texto, 'El texto que se va a publicar…') +
    '<div class="two">' +
      campoTexto('f-resp', 'Responsable', p.responsable, 'text', 'Quién lo saca') +
      campoTexto('f-hash', 'Hashtags', p.hashtags, 'text', '#gtahub #roleplay') +
    '</div>' +
    campoTexto('f-url', 'Enlace publicado', p.url, 'url', 'https://…') +
    campoArea('f-notas', 'Notas internas', p.notas, 'Contexto, referencias, quién aprueba…') +
    '<div class="field"><label>Métricas (al publicar)</label>' +
      '<div class="two">' +
        campoTexto('f-alcance', 'Alcance', p.alcance, 'number') +
        campoTexto('f-likes', 'Likes', p.likes, 'number') +
      '</div><div class="two">' +
        campoTexto('f-coment', 'Comentarios', p.comentarios, 'number') +
        campoTexto('f-comp', 'Compartidos', p.compartidos, 'number') +
      '</div><div class="two">' +
        campoTexto('f-guard', 'Guardados', p.guardados, 'number') +
      '</div>' +
    '</div>';

  const pie =
    (editando ? '<button class="btn btn-danger left" id="m-del">Eliminar</button>' : '') +
    '<button class="btn btn-ghost" id="m-cancel">Cancelar</button>' +
    '<button class="btn btn-primary" id="m-save">Guardar</button>';

  abrirModal(editando ? 'Editar publicación' : 'Nueva publicación', cuerpo, pie);
  armarChecks();

  $('#m-cancel').addEventListener('click', cerrarModal);

  $('#m-save').addEventListener('click', async () => {
    const titulo = $('#f-titulo').value.trim();
    if (!titulo) { toast('Ponle un título.', true); return; }
    const nvalor = sel => { const v = $(sel).value; return v === '' ? null : Number(v); };
    const fila = {
      titulo,
      seccion: $('#f-seccion').value,
      copy_texto: $('#f-copy').value.trim() || null,
      plataformas: leerPlataformas(),
      estado: $('#f-estado').value,
      fecha_programada: $('#f-fecha').value ? new Date($('#f-fecha').value).toISOString() : null,
      responsable: $('#f-resp').value.trim() || null,
      hashtags: $('#f-hash').value.trim() || null,
      url: $('#f-url').value.trim() || null,
      notas: $('#f-notas').value.trim() || null,
      alcance: nvalor('#f-alcance'),
      likes: nvalor('#f-likes'),
      comentarios: nvalor('#f-coment'),
      compartidos: nvalor('#f-comp'),
      guardados: nvalor('#f-guard')
    };
    if (!editando) fila.creado_por = S.user.id;
    const ok = await guardar('publicaciones', fila, id);
    if (ok) { cerrarModal(); toast(editando ? 'Publicación actualizada' : 'Publicación creada'); }
  });

  if (editando) {
    $('#m-del').addEventListener('click', async () => {
      if (!confirm('¿Eliminar “' + p.titulo + '”? No se puede deshacer.')) return;
      const ok = await borrar('publicaciones', id);
      if (ok) { cerrarModal(); toast('Publicación eliminada'); }
    });
  }
}

/* ---------- Modal pendiente ---------- */

function modalPendiente(id) {
  const t = S.pendientes.find(x => x.id === id) || {
    titulo: '', descripcion: '', estado: 'por_hacer', prioridad: 'media',
    fecha_limite: '', responsable: ''
  };
  const editando = !!id;

  const cuerpo =
    campoTexto('f-titulo', 'Título', t.titulo, 'text', '¿Qué hay que hacer?') +
    campoSelect('f-seccion', 'Sección', SECCION_OPCIONES, t.seccion || seccionInicial()) +
    campoArea('f-desc', 'Descripción', t.descripcion, 'Detalle, links, contexto…') +
    '<div class="two">' +
      campoSelect('f-estado', 'Columna', COLUMNAS, t.estado || 'por_hacer') +
      campoSelect('f-prio', 'Prioridad', PRIORIDADES, t.prioridad || 'media') +
    '</div>' +
    '<div class="two">' +
      campoTexto('f-resp', 'Responsable', t.responsable, 'text', 'Quién lo toma') +
      campoTexto('f-limite', 'Fecha límite', t.fecha_limite || '', 'date') +
    '</div>';

  const pie =
    (editando ? '<button class="btn btn-danger left" id="m-del">Eliminar</button>' : '') +
    '<button class="btn btn-ghost" id="m-cancel">Cancelar</button>' +
    '<button class="btn btn-primary" id="m-save">Guardar</button>';

  abrirModal(editando ? 'Editar pendiente' : 'Nuevo pendiente', cuerpo, pie);
  $('#m-cancel').addEventListener('click', cerrarModal);

  $('#m-save').addEventListener('click', async () => {
    const titulo = $('#f-titulo').value.trim();
    if (!titulo) { toast('Ponle un título.', true); return; }
    const estado = $('#f-estado').value;
    const fila = {
      titulo,
      seccion: $('#f-seccion').value,
      descripcion: $('#f-desc').value.trim() || null,
      estado,
      prioridad: $('#f-prio').value,
      responsable: $('#f-resp').value.trim() || null,
      fecha_limite: $('#f-limite').value || null
    };
    if (!editando) {
      fila.creado_por = S.user.id;
      fila.orden = S.pendientes.filter(x => x.estado === estado).length;
    }
    const ok = await guardar('pendientes', fila, id);
    if (ok) { cerrarModal(); toast(editando ? 'Pendiente actualizado' : 'Pendiente creado'); }
  });

  if (editando) {
    $('#m-del').addEventListener('click', async () => {
      if (!confirm('¿Eliminar “' + t.titulo + '”?')) return;
      const ok = await borrar('pendientes', id);
      if (ok) { cerrarModal(); toast('Pendiente eliminado'); }
    });
  }
}

/* ---------- Modal idea ---------- */

function modalIdea(id) {
  const i = S.ideas.find(x => x.id === id) || {
    titulo: '', descripcion: '', categoria: '', plataformas: [],
    estado: 'nueva', fuente: '', impacto: 3, esfuerzo: 3
  };
  const editando = !!id;
  const escala = [1, 2, 3, 4, 5].map(n => ({ id: String(n), nombre: String(n) }));

  const cuerpo =
    campoTexto('f-titulo', 'Idea', i.titulo, 'text', 'Ej. Serie de clips “así se vive el RP”') +
    campoSelect('f-seccion', 'Sección', SECCION_OPCIONES, i.seccion || seccionInicial()) +
    campoArea('f-desc', 'Descripción', i.descripcion, 'De qué va, por qué funcionaría…') +
    campoPlataformas(i.plataformas) +
    '<div class="two">' +
      campoSelect('f-estado', 'Estado', ESTADOS_IDEA, i.estado || 'nueva') +
      campoTexto('f-cat', 'Categoría', i.categoria, 'text', 'Evento, comunidad, devblog…') +
    '</div>' +
    '<div class="two">' +
      campoSelect('f-imp', 'Impacto (1-5)', escala, String(i.impacto || 3)) +
      campoSelect('f-esf', 'Esfuerzo (1-5)', escala, String(i.esfuerzo || 3)) +
    '</div>' +
    campoTexto('f-fuente', 'Fuente', i.fuente, 'text', 'Equipo, comunidad, investigación semanal…');

  const pie =
    (editando ? '<button class="btn btn-danger left" id="m-del">Eliminar</button>' : '') +
    '<button class="btn btn-ghost" id="m-cancel">Cancelar</button>' +
    '<button class="btn btn-primary" id="m-save">Guardar</button>';

  abrirModal(editando ? 'Editar idea' : 'Nueva idea', cuerpo, pie);
  armarChecks();
  $('#m-cancel').addEventListener('click', cerrarModal);

  $('#m-save').addEventListener('click', async () => {
    const titulo = $('#f-titulo').value.trim();
    if (!titulo) { toast('Ponle un título.', true); return; }
    const fila = {
      titulo,
      seccion: $('#f-seccion').value,
      descripcion: $('#f-desc').value.trim() || null,
      plataformas: leerPlataformas(),
      estado: $('#f-estado').value,
      categoria: $('#f-cat').value.trim() || null,
      impacto: Number($('#f-imp').value),
      esfuerzo: Number($('#f-esf').value),
      fuente: $('#f-fuente').value.trim() || null
    };
    if (!editando) fila.creado_por = S.user.id;
    const ok = await guardar('ideas', fila, id);
    if (ok) { cerrarModal(); toast(editando ? 'Idea actualizada' : 'Idea guardada'); }
  });

  if (editando) {
    $('#m-del').addEventListener('click', async () => {
      if (!confirm('¿Eliminar “' + i.titulo + '”?')) return;
      const ok = await borrar('ideas', id);
      if (ok) { cerrarModal(); toast('Idea eliminada'); }
    });
  }
}

/* ============================================================
   Eventos globales de la vista
   ============================================================ */

function exportarCSV() {
  const lista = filtrarPublicaciones();
  if (!lista.length) { toast('No hay publicaciones que exportar.', true); return; }
  const celda = v => {
    const t = String(v == null ? '' : v);
    return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const cab = ['Titulo', 'Seccion', 'Plataformas', 'Estado', 'Fecha', 'Responsable',
    'Alcance', 'Likes', 'Comentarios', 'Compartidos', 'Guardados', 'URL'];
  const filas = lista.map(p => [
    p.titulo, p.seccion || '', (p.plataformas || []).join(' '), p.estado,
    p.fecha_programada || '', p.responsable || '',
    p.alcance ?? '', p.likes ?? '', p.comentarios ?? '', p.compartidos ?? '', p.guardados ?? '',
    p.url || ''
  ]);
  const csv = '\ufeff' + [cab.join(','), ...filas.map(f => f.map(celda).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'gtahub-publicaciones.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exportado');
}

async function editarMeta(plataforma) {
  if (S.seccion !== 'esp' && S.seccion !== 'pe') {
    toast('Elige la sección ESP o PE para editar sus metas.', true);
    return;
  }
  const pl = plat(plataforma);
  const actual = metaDe(S.seccion, plataforma);
  const v = prompt('Meta semanal de ' + pl.nombre + ' (' + S.seccion.toUpperCase() + '):', actual);
  if (v === null) return;
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 0) { toast('Número inválido.', true); return; }
  const { error } = await sb.from('metas')
    .upsert({ seccion: S.seccion, plataforma, meta_semanal: n });
  if (error) { toast(error.message, true); return; }
  await cargarTodo();
  render();
  toast('Meta actualizada');
}

document.addEventListener('click', ev => {
  const meta = ev.target.closest('[data-meta]');
  if (meta) { editarMeta(meta.dataset.meta); return; }

  const csv = ev.target.closest('[data-csv]');
  if (csv) { exportarCSV(); return; }

  const nueva = ev.target.closest('[data-nueva]');
  if (nueva) {
    const tipo = nueva.dataset.nueva;
    if (tipo === 'publicacion') modalPublicacion(null);
    if (tipo === 'pendiente') modalPendiente(null);
    if (tipo === 'idea') modalIdea(null);
    return;
  }

  const mes = ev.target.closest('[data-mes]');
  if (mes) {
    const paso = Number(mes.dataset.mes);
    if (paso === 0) S.mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    else S.mes = new Date(S.mes.getFullYear(), S.mes.getMonth() + paso, 1);
    render();
    return;
  }

  if (ev.target.closest('.modal')) return;

  const pub = ev.target.closest('[data-pub]');
  if (pub) { modalPublicacion(pub.dataset.pub); return; }

  const pen = ev.target.closest('[data-pen]');
  if (pen) { modalPendiente(pen.dataset.pen); return; }

  const idea = ev.target.closest('[data-idea]');
  if (idea) { modalIdea(idea.dataset.idea); return; }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'f-q') {
    S.filtros.q = ev.target.value;
    clearTimeout(document._q);
    document._q = setTimeout(() => {
      render();
      const campo = $('#f-q');
      if (campo) { campo.focus(); campo.setSelectionRange(campo.value.length, campo.value.length); }
    }, 220);
  }
});

document.addEventListener('change', ev => {
  if (ev.target.id === 'f-plat') { S.filtros.plataforma = ev.target.value; render(); }
  if (ev.target.id === 'f-est') { S.filtros.estado = ev.target.value; render(); }
});

/* ---------- Service worker (PWA) ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

arrancar();
