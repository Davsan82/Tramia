# Publicar una versión

TramIA utiliza Versionado Semántico con tags prefijados por `v`.

## Cuándo incrementar cada número

- `PATCH`: correcciones compatibles, por ejemplo `0.1.0` → `0.1.1`.
- `MINOR`: funcionalidad nueva compatible, por ejemplo `0.1.0` → `0.2.0`.
- `MAJOR`: cambios incompatibles o una etapa estable mayor, por ejemplo `1.4.0` → `2.0.0`.

Mientras el proyecto permanezca en `0.x`, una versión minor puede representar cambios relevantes en arquitectura o comportamiento.

## Proceso

1. Trabaja en una rama y fusiona los cambios aprobados en `main`.
2. Mueve las entradas correspondientes de `CHANGELOG.md` desde `Unreleased` hacia una sección con la nueva versión y fecha.
3. Asegúrate de que el repositorio esté limpio.
4. Ejecuta uno de estos comandos:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

`npm version` ejecutará primero TypeScript y el build. Después actualizará `package.json` y `package-lock.json`, creará un commit y generará el tag correspondiente.

5. Publica el commit y el tag:

```bash
git push origin main --follow-tags
```

6. GitHub Actions verificará que el tag coincida con `package.json`, instalará dependencias, ejecutará los controles y creará un GitHub Release con notas automáticas y el build comprimido.

## Primera publicación

La versión inicial ya está establecida como `0.1.0`. Después de subir el repositorio por primera vez:

```bash
git tag -a v0.1.0 -m "TramIA v0.1.0"
git push origin v0.1.0
```

Antes de hacerlo, reemplaza `OWNER/REPOSITORY` en los enlaces al final de `CHANGELOG.md` por la organización y el repositorio reales.

## Versiones preliminares

Para probar una versión antes de declararla estable puedes crearla manualmente:

```bash
npm version 0.2.0-beta.1
git push origin main --follow-tags
```

El workflow estable actual publica tags `vMAJOR.MINOR.PATCH`. Si se desean releases preliminares automáticos, debe ampliarse el patrón del workflow y marcar el release como prerelease.
