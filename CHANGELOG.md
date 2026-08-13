# Changelog

Todos los cambios importantes de TramIA se documentarán en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto utiliza [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

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

[Unreleased]: https://github.com/Davsan82/Tramia/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Davsan82/Tramia/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Davsan82/Tramia/releases/tag/v0.1.0
