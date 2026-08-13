# Sistema de temas de TramIA

## Decisión vigente

La interfaz que se está desarrollando actualmente es la **versión clara oficial** de TramIA. La versión oscura será una variante futura y todavía no debe diseñarse ni activarse.

## Principio técnico

Ambas versiones deben compartir:

- los mismos componentes y estructura HTML;
- el mismo contenido y jerarquía visual;
- las mismas reglas responsive y de accesibilidad;
- los mismos estados, validaciones y flujos funcionales.

La apariencia se controlará mediante el atributo `data-theme` del elemento `html` y variables CSS semánticas. Actualmente la aplicación establece explícitamente:

```html
<html data-theme="light">
```

La futura versión oscura deberá sobrescribir el contrato bajo `[data-theme="dark"]`; no deberá duplicar pantallas ni introducir condiciones de tema dentro de la lógica funcional.

## Contrato semántico inicial

Los tokens se encuentran en `src/index.css`:

- `--tramia-canvas` y `--tramia-canvas-soft`: fondos generales.
- `--tramia-surface` y `--tramia-surface-subtle`: tarjetas, formularios y paneles.
- `--tramia-text` y `--tramia-text-muted`: texto principal y secundario.
- `--tramia-border` y `--tramia-border-strong`: divisores y controles.
- `--tramia-primary`, `--tramia-primary-hover` y `--tramia-primary-soft`: acciones principales.
- `--tramia-accent`: acento celeste de la marca.
- `--tramia-success`, `--tramia-warning` y `--tramia-danger`: estados.
- `--tramia-focus-ring`: foco accesible.
- `--tramia-shadow-color`: sombras adaptables al tema.

## Reglas para nuevas pantallas

1. Diseñar y validar primero la versión clara.
2. Usar tokens semánticos cuando el color represente una superficie, texto, borde o estado reutilizable.
3. Los colores específicos de ilustraciones y gradientes de marca pueden permanecer explícitos.
4. No usar `prefers-color-scheme` para cambiar automáticamente a oscuro hasta definir el producto y permitir una preferencia del usuario.
5. Verificar contraste WCAG, foco visible y legibilidad antes de añadir la variante oscura.
6. Los recursos rasterizados deben revisarse sobre ambos fondos; cuando sea posible, usar PNG transparente.

## Trabajo futuro

Cuando se apruebe la versión oscura:

1. definir tokens oscuros;
2. añadir un selector de tema accesible;
3. persistir la preferencia del usuario;
4. evitar parpadeos al cargar;
5. hacer auditoría visual de todas las pantallas y recursos;
6. probar contraste, gráficos, emails y documentos exportados.
