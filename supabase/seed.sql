-- Datos de ejemplo (opcional). Sirven para ver el dashboard con contenido
-- antes de capturar lo real. Se pueden borrar despues sin consecuencias.

insert into public.pendientes (titulo, descripcion, estado, prioridad, responsable, fecha_limite, orden) values
  ('Definir calendario del mes', 'Bajar el plan de contenido a fechas concretas por plataforma.', 'por_hacer', 'alta', 'Marketing', current_date + 3, 0),
  ('Grabar clips del evento', 'Capturas del fin de semana para cortes de TikTok y Reels.', 'en_progreso', 'media', 'Media', current_date + 7, 0),
  ('Actualizar arte del Discord', 'Banners nuevos con la paleta crimson.', 'listo', 'baja', 'Diseño', null, 0);

insert into public.publicaciones (titulo, copy_texto, plataformas, estado, fecha_programada, responsable, hashtags) values
  ('Teaser del evento de fin de semana', 'Este viernes se abre la subasta. Prepara el efectivo.', array['instagram','tiktok'], 'programada', now() + interval '2 days', 'Marketing', '#gtahub #roleplay'),
  ('Comunicado: mantenimiento del servidor', 'Ventana de mantenimiento el martes de 3 a 5 AM.', array['discord','email'], 'borrador', now() + interval '5 days', 'Sistemas', null);

insert into public.ideas (titulo, descripcion, categoria, plataformas, estado, fuente, impacto, esfuerzo) values
  ('Serie “Así se vive el RP”', 'Cortes verticales de historias reales de jugadores, un capítulo por semana.', 'Comunidad', array['tiktok','instagram'], 'nueva', 'Equipo', 5, 3),
  ('Devblog mensual en video', 'Resumen de cambios del servidor narrado, con clips del changelog.', 'Devblog', array['discord','email'], 'en_evaluacion', 'Equipo', 4, 4);
