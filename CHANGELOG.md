# Changelog

Todos los cambios importantes de TramIA se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto utiliza [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.10.3] - 2026-08-15

### Agregado

- Carga múltiple de documentos para ciudadanos y asesores, con origen visible, permisos de retiro por autor y revisión de evidencias del ciudadano.
- Calificación administrativa de asesores entre 0 y 5, incluyendo medias estrellas.
- Script controlado para reparar nombres y presentaciones de asesores afectados por una codificación histórica incorrecta.
- Banderas, país y prefijo internacional en el registro y en los datos de contacto del perfil.

### Mejorado

- Supervisión administrativa completamente localizada al español para estados, modalidades, requisitos, pagos, proveedores e historial.
- Distribución responsive del celular: selector internacional legible y número nacional correctamente alineado.
- Presentación de documentos compartidos por el asesor y adjuntados por el ciudadano dentro de una gestión delegada.

### Corregido

- Normalización Unicode de nombres y presentaciones de asesores antes de persistirlos en Neon.
- Bloqueo preventivo de textos con caracteres dañados en la gestión administrativa de asesores.
- Presentación almacenada de David Asesor TramIA reparada en Neon.

### Verificado

- TypeScript, Drizzle, control de secretos, codificación UTF-8 y build de producción finalizan correctamente.

## [0.10.2] - 2026-08-14

### Mejorado

- Precio inicial de la delegación calculado desde la tarifa mínima real de los asesores verificados, disponibles y con capacidad.
- Mensaje alternativo cuando ningún asesor disponible tiene una tarifa válida configurada.

### Corregido

- Eliminación de la etiqueta «pago simulado» en la selección de modalidad.
- Retiro de la franja informativa inferior sobre la Clave SOL en el modal de inicio del trámite.

### Verificado

- TypeScript y build de producción finalizan correctamente.

## [0.10.1] - 2026-08-14

### Mejorado

- Perfil profesional del asesor con disponibilidad, capacidad máxima, tarifa base, estados de guardado y distribución responsive.
- Presentación de los requisitos previos de delegación como actividades completadas por el ciudadano, sin solicitar una segunda validación al asesor.
- Acceso rápido de la portada actualizado de Matrimonio civil a Visa Americana, enlazado con el trámite real del catálogo.

### Corregido

- Selección del siguiente paso del asesor para excluir las actividades previas que corresponden al ciudadano.
- Contrato de la API del asesor para devolver configuración profesional y fechas de finalización de los prerrequisitos.

### Verificado

- TypeScript y build de producción finalizan correctamente.

## [0.10.0] - 2026-08-14

### Agregado

- Cambio seguro de contraseña de asesores desde el panel administrativo, con cierre de sesiones anteriores y registro de auditoría.
- Ventana responsive para cargar, arrastrar, previsualizar y optimizar fotografías de perfil antes de guardarlas.
- Reglas telefónicas compartidas por país para el registro, el perfil y la API.

### Mejorado

- Verificación automática del correo al abrir el enlace, con pantalla de confirmación y acceso directo a Mi perfil.
- Recuperación visual para enlaces de correo vencidos o inválidos, incluyendo la solicitud de un nuevo enlace.
- Distribución de los datos de contacto, prefijo numérico visible y selectores de ubicación con mayor espacio responsive.
- Checklist de autogestión más compacto, con formularios simples y estados cerrados de lectura rápida.

### Corregido

- Cierre idempotente del último paso de una autogestión para evitar el mensaje incorrecto de que el trámite ya no admite cambios.
- Apertura inicial de los checklists completados y cálculo del siguiente paso después de guardar una etapa.
- Actualización inmediata de la fotografía de perfil y manejo visible de archivos pesados o no compatibles.

### Verificado

- TypeScript, Drizzle, control de secretos, codificación UTF-8 y build de producción finalizan correctamente.

## [0.9.0] - 2026-08-14

### Agregado

- Seguimiento de solo lectura para el ciudadano después de pagar una delegación, con asesor asignado, porcentaje y secuencia completa del trámite.
- Control para que el asesor complete exclusivamente el siguiente paso pendiente y notifique al ciudadano por correo.
- Conversación privada entre ciudadano y asesor durante toda la gestión delegada.
- Boleta de venta descargable en PDF para cada pago confirmado.
- Selector de país y prefijo internacional en el celular del perfil.

### Mejorado

- Validación de correo y teléfono en la configuración administrativa de canales de atención.
- Validación del celular tanto en la interfaz como en la API, con almacenamiento normalizado y longitud correspondiente al país.
- La creación de una cuenta inicia sesión y lleva directamente a Mi perfil, sin mostrar el panel heredado ni ejecutar redirecciones pendientes.
- Documentación de la API y README actualizados con el flujo delegado vigente.

### Corregido

- Reanudación de trámites delegados pagados para mostrar el seguimiento moderno en lugar de la interfaz antigua.
- Acceso al chat después de completar una delegación.

## [0.8.1] - 2026-08-14

### Corregido

- Cada nueva solicitud de visa crea una instancia independiente, incluso cuando el mismo usuario inicia varias solicitudes del mismo trámite.
- La modalidad de delegación se guarda desde el inicio y se restaura correctamente al volver desde Mis trámites.
- El checklist delegado muestra únicamente los cuatro requisitos personales configurados antes de elegir asesor y confirmar el pago.
- La navegación principal abandona correctamente el espacio de trabajo al elegir Inicio, Mis trámites o Mi perfil.
- El registro de cuenta ya no queda bloqueado por la latencia del servidor SMTP.
- La visa B1/B2 se identifica como trámite consular y conserva su entidad y fuente oficial desde Neon.

### Mejorado

- Fuentes y metadatos del trámite consumidos desde el catálogo, sin reglas por `slug` en el frontend.
- Asesores obtenidos exclusivamente desde la API, sin nombres o perfiles heredados como respaldo en componentes operativos.
- Contenido del flujo de pago alineado con los medios guardados y la interfaz vigente de TramIA.

### Eliminado

- Modal antiguo de delegación que permanecía como código muerto con contenido de demostración.

### Verificado

- Recorrido de visa B1/B2 en autogestión y delegación, reanudación, aislamiento por instancia y bloqueo secuencial.
- Enlaces oficiales del Departamento de Estado, CEAC, tarifas y tiempos de espera.
- TypeScript, Drizzle, control de secretos, codificación UTF-8 y build de producción.

## [0.8.0] - 2026-08-14

### Agregado

- Hard reset administrativo transaccional con validación en servidor, cuenta regresiva cancelable, animación, auditoría y conservación explícita de usuarios, asesores y catálogo.
- Formularios integrados dentro de cada etapa del checklist, con fecha, campos configurables, evidencias y confirmación irreversible.
- Alertas y confirmaciones propias de TramIA para reemplazar los diálogos nativos del navegador.
- Identidad visible del administrador y estado de sesión coherente al regresar al sitio público.
- Documentación operativa para extender el alcance del Hard reset a futuras tablas.

### Corregido

- Cambio entre autogestión y delegación para mostrar únicamente los requisitos previos aplicables antes de elegir asesor y pagar.
- Eliminación permitida solo antes de registrar avances; después del primer paso, el trámite se cancela y pasa al historial con advertencia de no reembolso.
- Formularios simples compactados y referencia opcional sin perder la fecha ni la confirmación obligatoria.
- Codificación UTF-8 de mensajes de contacto y normalización preventiva de caracteres latinos dañados.
- Destino de los detalles históricos y contadores de trámites activos, completados y cancelados.
- Parpadeo de acciones de invitado mientras el navegador recuperaba una sesión activa.

### Mejorado

- Checklist responsive con datos en línea, bloqueo secuencial, porcentaje único, siguiente paso y cierre visual del trámite.
- Flujo de delegación con selección de asesor, requisitos reducidos, pago con tarjeta y estado posterior a la confirmación.
- Calificaciones de asesores en incrementos de media estrella y bloqueo permanente después de enviarlas.
- Tarjetas con selección explícita y serializada para mantener una única predeterminada por usuario.
- Catálogo y controles administrativos, reportes financieros, gestión de usuarios y documentos.
- Mensajes de finalización, cancelación, errores y acciones irreversibles alineados con la identidad visual de TramIA.

### Base de datos

- Migración de `ratings.rating` a `numeric(2,1)` para admitir medias estrellas.
- Reinicio coherente de estadísticas operativas de asesores durante un Hard reset.

### Verificado

- TypeScript, Drizzle, control de secretos, codificación UTF-8 y build de producción finalizan correctamente.

## [0.7.0] - 2026-08-13

### Agregado

- Trámite guiado para solicitar la visa de turismo de EE. UU. B1/B2, con 18 pasos, evidencias, alertas y fuentes oficiales.
- Vista de detalle histórica de cada gestión, aislada del inicio de nuevos trámites.
- Control rápido de publicación en el catálogo administrativo y selector equivalente dentro del editor.
- Persistencia local de fotos y documentos durante el desarrollo, manteniendo Netlify Blobs en producción.

### Corregido

- Visualización de la foto de perfil después de cargarla y respuesta sin caché para imágenes actualizadas.
- Navegación de «Ver detalle» en el historial para consultar el caso correcto sin crear ni abrir otra gestión.
- Invalidación inmediata del catálogo al activar, desactivar o editar un trámite.
- Exclusión consistente de trámites inactivos del catálogo, búsquedas y fichas públicas.

### Mejorado

- TramIA Bot renovado y contextualizado con la identidad visual del personaje.
- Flujo de delegación, selección de asesor y pago de prueba integrado con la ruta del trámite.
- Resumen de progreso unificado y cierre del checklist con una experiencia celebratoria más clara.
- Protección de datos sensibles de acciones del checklist antes de persistirlos.

### Verificado

- TypeScript, Drizzle, control de secretos, codificación UTF-8 y build de producción finalizan correctamente.

## [0.6.1] - 2026-08-13

### Corregido

- Indicadores administrativos alineados con los estados reales de validación documental en Neon.
- Captura centralizada de errores asíncronos para impedir que un fallo transitorio cierre el servidor.
- Navegación estable por todos los módulos administrativos, incluidos Delegaciones, Pagos simulados y Calificaciones.

### Mejorado

- Conservación de datos, filtros y estado al regresar a módulos administrativos ya visitados.
- Respuestas JSON controladas ante errores internos, con detalles técnicos disponibles solo en desarrollo.

## [0.6.0] - 2026-08-13

### Agregado

- Asignación automática del asesor elegido después de confirmar un pago exclusivamente simulado.
- Foto editable en el portal del asesor y reputación visible en el perfil ciudadano.
- Identificador interno del catálogo para separar las URLs legibles de las llaves UUID de Neon.
- Fotografías profesionales para los perfiles temporales de asesores, con soporte de avatar en API y administración.
- Tarjetas guardadas con identidad visual de Visa, Mastercard, American Express y Diners Club.
- Animación de procesamiento, aprobación y retorno automático al trámite después del pago de prueba.
- Modal de carga por selección o arrastre con vista previa para PDF, JPG y PNG.
- Fecha obligatoria y persistente en cada confirmación del checklist.
- Health check de base de datos, variables críticas e integraciones opcionales sin exposición de secretos.

### Corregido

- Persistencia de rutas guiadas, avance y bloqueo de pasos contra Neon.
- Tipos de acción del editor administrativo alineados con los valores de PostgreSQL.
- Conexión WebSocket de Neon para soportar las transacciones interactivas usadas por trámites, delegaciones y administración.
- Delegaciones sin asesor impedidas en la API y en la interfaz.
- Navegación estable entre Indicadores, Pagos simulados y Calificaciones en el panel administrativo.
- Bloqueo visual y validación de servidor para impedir avanzar sin cerrar el paso anterior.
- Carga de fotografías locales de asesores desde las respuestas de la API.

### Mejorado

- Checklist responsive con estados completado, actual y bloqueado, siguiente paso visible y porcentaje de avance.
- Confirmaciones irreversibles con fecha en formato peruano y archivo consultable después de la carga.
- Selector de asesor y pago con tarjetas de marca, estados accesibles y mensajes claros.
- Catálogo y formularios administrativos alineados con la paleta de control de TramIA.
- Panel de indicadores con pagos, trámites, capacidad de asesores, documentos, reputación y alertas operativas.
- Experiencia y fotografía del portal del asesor, manteniendo identidad verificada y reputación bilateral.
- Respuestas de Netlify y Neon más robustas ante errores de configuración o contenido no JSON.

### Seguridad

- El health check informa únicamente presencia, validez y categoría de variables; nunca devuelve sus valores.
- En producción, la ausencia de configuración crítica devuelve HTTP 503.
- Los medios de pago continúan tokenizados dentro del simulador y no almacenan PAN ni CVV.

### Verificado

- Los 16 trámites tienen pasos, fuente primaria y enlace oficial operativo.
- Las 16 fuentes oficiales respondieron correctamente durante la revisión del 13 de agosto de 2026.
- Los módulos administrativos, el flujo autogestionado y el pago de prueba con asignación fueron probados contra Neon.
- TypeScript, Drizzle, control de secretos, codificación UTF-8 y build de producción finalizan correctamente.

## [0.5.2] - 2026-08-13

### Corregido

- Alineación de la lupa y carga robusta del módulo administrativo de usuarios y roles.
- Apertura accesible y estable del menú de la cuenta autenticada.

### Mejorado

- Roles disponibles visibles y utilizables como filtros rápidos en el panel administrativo.
- Accesos al panel administrativo y al panel de asesor diferenciados por rol.
- Llamado a la acción para iniciar un trámite con una decisión más clara.
- Selector responsive renovado para elegir entre ruta guiada y gestión acompañada.

## [0.5.1] - 2026-08-13

### Corregido

- Eliminado el bucle infinito del módulo “Contenido y canales”.
- Configuración administrativa ahora muestra errores y permite reintentar.
- Navegación entre módulos sin recargas completas ni parámetros atascados.

### Mejorado

- Shell administrativo inspirado en los patrones de AdminLTE, conservando Tailwind y la identidad de TramIA.

## [0.5.0] - 2026-08-13

### Agregado

- Prerrequisitos obligatorios para delegación, selección de asesor y pago simulado con tarjeta guardada.
- Perfil profesional del asesor con identidad verificada, disponibilidad, capacidad, tarifa y reputación.
- Acciones de trámite configurables como fecha, formulario, archivo, confirmación o enlace externo.
- Tarjeta ficticia predeterminada, eliminación de medios e historial de recibos simulados.
- Configuración pública para bloques de landing y canales de atención.
- Control administrativo de pagos, calificaciones e indicadores operativos.

### Mejorado

- Paleta violeta diferenciada para asesores y administración.
- Documentación OpenAPI y división de dependencias del bundle.

## [0.4.0] - 2026-08-13

### Added

- Fotos de perfil para clientes y asesores con almacenamiento en Netlify Blobs.
- Distintivo visible de identidad validada mediante PeruDevs.
- Acceso administrativo diferenciado con paleta violeta de alto contraste.
- Configuración centralizada de canales de atención y consumo público.
- Reputación bilateral entre clientes y asesores.
- Formularios accionables por etapa con confirmación y bloqueo definitivo.
- Medios de pago completamente ficticios y tokenizados, sin PAN ni CVV.

### Changed

- Selector inicial renovado para autogestión o delegación.
- Página de contacto conectada a la configuración administrativa.

## [0.3.0] - 2026-08-13

### Changed

- El flujo heredado de progreso deja de guardar o restaurar trámites desde `localStorage`.
- Las versiones anteriores limpian automáticamente la clave local de progreso demo sin afectar el identificador anónimo de Analytics.
- Guardar los datos de contacto conserva el estado de verificación de correo sin mezclar ambos flujos.
- Los enlaces de verificación requieren confirmación explícita para evitar validaciones causadas por escáneres automáticos de correo.
- El formulario de contacto espera la entrega SMTP antes de finalizar la función serverless, evitando que Netlify interrumpa el envío en segundo plano.

### Added

- Mensajería privada y notificaciones entre usuario y asesor por cada gestión.
- Carga, consulta, revisión y retiro de documentos mediante Netlify Blobs, con metadatos en Neon.
- Centro documental para el usuario y revisión de archivos en el portal del asesor.
- Auditoría administrativa consultable desde el panel.
- Acciones para rechazar, cancelar o vencer delegaciones con trazabilidad.
- Pruebas de humo de endpoints y comando unificado `npm run quality`.

- Panel administrativo inicial en `/admin`, protegido por el rol `administrator` desde el servidor.
- Dashboard responsive con indicadores reales de usuarios, catálogo, gestiones y consultas de contacto.
- Registro de acceso al dashboard en la auditoría y comando explícito para asignar el administrador inicial.
- Módulo administrativo de catálogo con listado editorial de trámites y CRUD de categorías y entidades.
- Editor administrativo responsive de trámites con datos generales, versiones editoriales, requisitos, pasos y fuentes oficiales, protegido por rol y con auditoría de cambios.
- Gestión administrativa de usuarios con búsqueda, filtros, ficha de cuenta, estados, cierre de sesiones al suspender y asignación auditada de roles.
- Protecciones para impedir que el administrador conectado suspenda su propia cuenta o retire su propio rol administrativo.
- Bandeja administrativa de contacto con búsqueda, filtros, lectura completa, responsables, flujo de atención y notas internas.
- Migración de base de datos para asignación e historial interno de atención de consultas.
- Consola administrativa de operación con filtros, progreso, vencimientos y ficha integral de cada gestión.
- Acciones auditadas para pausar, reactivar o cancelar trámites, con confirmación especial cuando existen pagos o puntos de no retorno.
- Corrección de textos con mojibake en el panel administrativo y control automático para exigir UTF-8 en fuentes, HTML y documentación.
- Módulo administrativo de asesores con perfiles, verificación, disponibilidad, capacidad, tarifas y especialidades.
- Bandeja de delegaciones con asignación y reasignación auditada, limitada a pagos autorizados y asesores disponibles.
- Creación idempotente de trámites del usuario en Neon, incluyendo instancias de pasos, requisitos e historial inicial.
- Flujo de delegación desde “Mis trámites” con selección de asesor y pagos simulados Visa/PayPal sin capturar PAN, CVV ni credenciales.
- Persistencia del avance, pasos completados y cancelación de trámites del usuario en Neon.
- Recuperación del espacio de trabajo desde Neon al volver a abrir un trámite, sin depender del estado temporal del navegador.
- Confirmación explícita antes de cancelar una gestión con pagos o que alcanzó un punto de no retorno.
- Asignación automática del asesor elegido después del pago cuando continúa verificado, disponible y dentro de su capacidad; en caso contrario, la solicitud permanece en la cola administrativa.
- Portal responsive del asesor en `/asesor`, protegido por rol, con casos asignados, ficha operativa, requisitos y actualización de estado, paso y progreso.
- Comando idempotente para crear un administrador temporal de desarrollo, con bloqueo explícito de esa cuenta en producción.
- Validaciones para impedir eliminar maestros asociados a trámites y auditoría de cada operación.

## [0.2.1] - 2026-08-12

### Added

- Indicador discreto de versión en el footer y en el menú del usuario.

### Changed

- La versión visible se obtiene automáticamente desde `package.json` durante el build.
- README actualizado para reflejar la arquitectura, configuración, seguridad, funcionalidades y roadmap reales.

## [0.2.0] - 2026-08-12

### Added

- Flujo seguro de recuperación de acceso mediante correo y enlace de un solo uso.
- Pantalla responsive para crear y confirmar una nueva contraseña.
- Validación de enlaces vigentes, vencidos, utilizados o inválidos.

### Changed

- Las sesiones abiertas se cierran después de cambiar la contraseña.
- Los enlaces anteriores de recuperación quedan invalidados al completar el cambio.
- El contador de "Mis trámites" ahora utiliza el valor real de Neon para el usuario autenticado.

### Fixed

- Eliminado el conteo incorrecto de trámites demo almacenados localmente en la cabecera.

## [0.1.0] - 2026-08-12

### Added

- MVP web de TramIA construido con React, TypeScript y Express.
- Exploración, detalle y seguimiento demostrativo de trámites.
- Validación documental experimental asistida por Gemini.
- Eventos personalizados para Google Analytics 4.
- Conexión del backend con Neon Serverless Postgres.
- Esquema inicial de persistencia probado en una rama temporal de Neon.
- Verificación automática de tipos y build de producción.
- Automatización de releases de GitHub mediante tags SemVer.

[Unreleased]: https://github.com/Davsan82/Tramia/compare/v0.10.3...HEAD
[0.10.3]: https://github.com/Davsan82/Tramia/compare/v0.10.2...v0.10.3
[0.10.2]: https://github.com/Davsan82/Tramia/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/Davsan82/Tramia/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/Davsan82/Tramia/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/Davsan82/Tramia/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/Davsan82/Tramia/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/Davsan82/Tramia/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Davsan82/Tramia/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/Davsan82/Tramia/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/Davsan82/Tramia/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/Davsan82/Tramia/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/Davsan82/Tramia/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/Davsan82/Tramia/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Davsan82/Tramia/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Davsan82/Tramia/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/Davsan82/Tramia/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Davsan82/Tramia/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Davsan82/Tramia/releases/tag/v0.1.0
