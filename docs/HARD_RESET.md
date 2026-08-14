# Hard reset administrativo

El **Hard reset** deja las interacciones de TramIA en estado inicial sin eliminar la estructura de la base de datos ni sus datos maestros. Se encuentra en **Administración → Configuración → Zona de peligro**.

## Protección del proceso

1. Requiere una sesión activa con rol `administrator`.
2. La palabra de seguridad se valida únicamente en el servidor. Actualmente es `david`; puede reemplazarse con la variable opcional `HARD_RESET_CONFIRMATION`.
3. El servidor entrega una autorización firmada de corta duración vinculada al administrador.
4. La interfaz inicia una cuenta regresiva cancelable de 10 segundos.
5. Al llegar a cero, el servidor ejecuta la limpieza dentro de una sola transacción. Ante cualquier error, PostgreSQL revierte todo el proceso.
6. El resultado queda registrado en auditoría con el administrador que lo ejecutó y los totales eliminados.

## Datos eliminados

- trámites iniciados, pasos, requisitos e historial de estados;
- delegaciones y asignaciones;
- pagos, transacciones y medios de pago guardados;
- documentos y validaciones registradas en PostgreSQL;
- calificaciones, conversaciones y notificaciones;
- mensajes y notas del formulario de contacto;
- estadísticas operativas acumuladas de los asesores.

El proceso elimina referencias de documentos en PostgreSQL. No borra archivos huérfanos directamente del proveedor de object storage.

## Datos conservados

- usuarios, perfiles, identidad validada y sesiones;
- roles y permisos;
- asesores, fotografías, experiencia, disponibilidad y capacidad;
- categorías, entidades, trámites, versiones, pasos y requisitos del catálogo;
- configuración global y datos públicos;
- auditoría administrativa general.

## Extensión futura

Cuando se agregue una tabla que contenga interacciones, debe incorporarse a la transacción de `POST /api/v1/admin/hard-reset` respetando el orden de dependencias: primero tablas hijas y luego tablas padre. También debe añadirse su conteo al objeto `deleted` de la respuesta y actualizar este documento.
