# Revisión de rutas de trámites

La revisión de rutas separa el catálogo versionado de los expedientes que ya están en ejecución:

- `npm run db:audit:routes` inspecciona la última versión de cada trámite activo, sus posiciones, modos de finalización, campos, fechas y checklist.
- `npm run db:revise:routes` muestra una vista previa de las revisiones definidas en el script.
- `npm run db:revise:routes -- --apply` crea nuevas versiones `reviewed`; no modifica ni elimina las versiones usadas por expedientes existentes.

## Criterios funcionales

1. Cada paso debe representar un resultado reconocible para el ciudadano.
2. Acciones que forman una sola tarea se agrupan para evitar confirmaciones redundantes.
3. Una confirmación manual sin campos registra automáticamente la fecha y hora con un solo clic.
4. Las fechas de cita, vencimiento o seguimiento continúan solicitándose porque representan información futura o verificable.
5. Pagos, archivos, formularios, presencia del usuario y puntos de no retorno conservan un tratamiento explícito.
6. Las credenciales de entidades públicas no se solicitan ni se almacenan en TramIA.

## Revisión del 15 de agosto de 2026

Se auditaron las 11 rutas activas. Siete ya tenían una secuencia breve y coherente y se conservaron. Se crearon nuevas versiones para:

| Ruta | Antes | Ahora |
| --- | ---: | ---: |
| Obtener pasaporte electrónico ordinario | 11 pasos | 5 pasos |
| Inscribirse en el RUC como persona natural | 12 pasos | 7 pasos |
| Constituir una empresa mediante SID-SUNARP | 16 pasos | 9 pasos |
| Celebrar matrimonio civil municipal | 18 pasos | 10 pasos |

La ruta **Solicitar visa de turismo para EE. UU. B1/B2** está protegida por slug y título en el script de revisión. Conserva su versión y sus 18 pasos sin cambios.

Los expedientes iniciados antes de esta revisión permanecen vinculados a su versión original. Solo las nuevas solicitudes reciben la versión revisada.
