/* GTAHUB Content Hub — conexión a Supabase.
 *
 * SUPABASE_URL: la "Project URL" del proyecto GTAHUB
 * (Supabase → Project Settings → API → Project URL).
 *
 * La clave publishable es pública por diseño: quien protege los datos es
 * RLS + el login. La clave secreta (sb_secret_...) NUNCA va aquí ni en
 * ningún archivo del repo.
 *
 * Si la URL está vacía, el sitio pide los datos en pantalla la primera vez
 * y los guarda en el navegador (útil para probar antes de fijarlos aquí).
 */
window.GTAHUB_CONFIG = {
  SUPABASE_URL: "", // ← pega aquí la Project URL, ej. "https://xxxxxxxx.supabase.co"
  SUPABASE_ANON_KEY: "sb_publishable_4bo-HL4KOmINZZCQs8cfhw_iqFClE_A"
};
