# Base de datos

Las migraciones SQL de TramIA viven en `database/migrations` y deben ejecutarse en orden.

## Ambientes recomendados en Neon

- `production`: rama principal con datos reales.
- `dev/<nombre>`: desarrollo aislado por persona o funcionalidad.
- `preview/pr-<numero>`: pruebas temporales de pull requests.

Las migraciones deben probarse primero en una rama temporal o de desarrollo. No se deben ejecutar cambios de esquema directamente en producción sin revisión.

## Conexión

El backend lee `DATABASE_URL`. Nunca expongas esta variable mediante Vite ni uses un nombre que empiece con `VITE_`, porque eso incluiría la credencial en el frontend.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

La interfaz React no se conecta directamente a PostgreSQL. Todas las operaciones pasan por la API Express.
