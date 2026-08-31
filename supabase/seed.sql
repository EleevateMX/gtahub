-- Datos de ejemplo (opcional). Sirven para ver el dashboard con contenido
-- antes de capturar lo real. Se pueden borrar despues sin consecuencias.

insert into public.pendientes (titulo, descripcion, seccion, estado, prioridad, responsable, fecha_limite, orden) values
  ('Definir calendario del mes', 'Bajar el plan de contenido a fechas concretas por plataforma.', 'esp', 'por_hacer', 'alta', 'Marketing', current_date + 3, 0),
  ('Grabar clips del evento', 'Capturas del fin de semana para cortes de TikTok y Reels.', 'esp', 'en_progreso', 'media', 'Media', current_date + 7, 0),
  ('Traducir comunicado para Pegasus', 'Version en ingles del comunicado de mantenimiento.', 'pe', 'por_hacer', 'media', 'Marketing', current_date + 4, 1),
  ('Actualizar arte del Discord', 'Banners nuevos con la paleta crimson.', 'ambas', 'listo', 'baja', 'Diseno', null, 0);

insert into public.publicaciones (titulo, copy_texto, seccion, plataformas, estado, fecha_programada, responsable, hashtags) values
  ('Teaser del evento de fin de semana', 'Este viernes se abre la subasta. Prepara el efectivo.', 'esp', array['instagram','tiktok'], 'programada', now() + interval '2 days', 'Marketing', '#gtahub #roleplay'),
  ('Weekend auction teaser (Pegasus)', 'The auction opens this Friday. Get your cash ready.', 'pe', array['instagram','discord'], 'borrador', now() + interval '2 days', 'Marketing', '#gtahub #roleplay'),
  ('Comunicado: mantenimiento del servidor', 'Ventana de mantenimiento el martes de 3 a 5 AM.', 'ambas', array['discord','email'], 'borrador', now() + interval '5 days', 'Sistemas', null);

insert into public.ideas (titulo, descripcion, categoria, seccion, plataformas, estado, fuente, impacto, esfuerzo) values
  ('Serie "Asi se vive el RP"', 'Cortes verticales de historias reales de jugadores, un capitulo por semana.', 'Comunidad', 'esp', array['tiktok','instagram'], 'nueva', 'Equipo', 5, 3),
  ('Pegasus spotlight series', 'Weekly player-story clips for the English community.', 'Comunidad', 'pe', array['tiktok'], 'nueva', 'Equipo', 4, 3),
  ('Devblog mensual en video', 'Resumen de cambios del servidor narrado, con clips del changelog.', 'Devblog', 'ambas', array['discord','email'], 'en_evaluacion', 'Equipo', 4, 4);
