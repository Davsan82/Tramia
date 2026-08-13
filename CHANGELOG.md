# Changelog

Todos los cambios importantes de TramIA se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto utiliza [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

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

[Unreleased]: https://github.com/Davsan82/Tramia/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Davsan82/Tramia/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Davsan82/Tramia/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Davsan82/Tramia/releases/tag/v0.1.0
