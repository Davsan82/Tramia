# TramIA

> Un copiloto digital para entender, organizar y dar seguimiento a trámites en el Perú.

TramIA es un prototipo de plataforma web asistida por inteligencia artificial que busca reducir el tiempo, el estrés y la confusión asociados a los trámites públicos y privados. La experiencia transforma una necesidad expresada en lenguaje cotidiano —por ejemplo, “perdí mi DNI” o “quiero formalizar mi negocio”— en orientación clara, requisitos comprensibles y un flujo de trabajo paso a paso.

El proyecto nació dentro de **LegalIA, un venture de UTEC**, a partir de una idea central: las personas no deberían necesitar conocer el nombre oficial de un trámite para saber cómo empezar.

## El problema

Realizar un trámite suele implicar navegar portales institucionales complejos, interpretar requisitos ambiguos y coordinar pasos distribuidos entre distintas entidades. Entre los principales dolores identificados se encuentran:

- No saber qué documentos se necesitan ni en qué formato.
- Descubrir requisitos faltantes después de acudir a una entidad.
- Consultar páginas institucionales difíciles de navegar o desactualizadas.
- Perder tiempo en filas, traslados y pasos que podrían anticiparse.
- Temor a cometer errores que invaliden el trámite o generen multas.
- No conocer el avance, costo o duración esperada del proceso.

## La propuesta

TramIA organiza la experiencia alrededor de tres capacidades:

1. **Orientar:** ayuda a identificar el trámite y explica qué hacer.
2. **Gestionar:** convierte el proceso en requisitos y actividades ordenadas.
3. **Dar seguimiento:** permite registrar avances, documentos y próximos pasos.

El “átomo” de TramIA es el ciclo completo que comienza con una pregunta y termina con un trámite cerrado: entender la necesidad, construir un plan concreto y acompañar al usuario durante su ejecución.

## Estado actual

### Sistema visual

La interfaz actual constituye la **versión clara oficial**. El proyecto deja preparado un contrato de tokens semánticos para incorporar en el futuro una versión oscura sin duplicar componentes. Las reglas y decisiones se documentan en [`docs/THEMING.md`](docs/THEMING.md).

Este repositorio contiene un **MVP/prototipo demostrativo**, no un sistema gubernamental ni una plataforma lista para producción.

Actualmente incluye:

- Exploración de trámites por búsqueda, categorías y objetivos.
- Fichas con requisitos, pasos, costos y tiempos estimados.
- Modalidad autónoma o delegada para representar dos rutas de servicio.
- Panel de trámites activos, progreso e historial.
- Checklist interactivo y carga de documentos.
- Validación documental simulada; la integración con un proveedor de IA está pendiente.
- Asistente conversacional contextual dentro del trámite.
- Recordatorios de vencimiento y simulación de renovación.
- Perfil, registro e inicio de sesión simulados en el navegador.
- Instrumentación de eventos con Google Analytics 4.

> [!WARNING]
> La autenticación, los pagos, las integraciones con entidades públicas y varias operaciones del flujo son simulaciones. No utilices el prototipo con contraseñas reales, documentos sensibles ni datos personales reales.

## Investigación con usuarios

Una prueba inicial con 11 participantes validó el interés por la propuesta y, al mismo tiempo, reveló áreas críticas de mejora:

- **91%** (10 de 11) calificó la experiencia con 4 o 5 puntos.
- **82%** (9 de 11) indicó que usaría TramIA para un trámite real.
- Comprender los requisitos fue la barrera principal.
- El checklist fue una de las capacidades mejor valoradas.
- La sobrecarga de información redujo la claridad de algunas pantallas.
- Los errores funcionales afectaron más la confianza que los detalles estéticos.
- Los usuarios esperan completar cada vez más pasos sin salir de la plataforma.

Estos resultados orientan la evolución del producto hacia tres prioridades: una experiencia más simple, un checklist confiable y flujos libres de errores funcionales.

## Flujo conceptual

```mermaid
flowchart LR
    A["Necesidad en lenguaje cotidiano"] --> B["Identificación del trámite"]
    B --> C["Requisitos y plan paso a paso"]
    C --> D["Gestión del progreso"]
    D --> E["Validación y acompañamiento"]
    E --> F["Trámite completado"]
```

## Tecnologías

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Express
- Neon Serverless Postgres
- Google Gen AI SDK
- Motion
- Lucide React
- Google Analytics 4 y Google Tag Manager

## Arquitectura actual

```text
tramia-v5.1/
├── index.html                 # Entrada HTML y etiquetas de analítica
├── server.ts                  # Servidor Express y validación documental
├── server/                    # Infraestructura del backend
│   └── db.ts                 # Conexión segura a Neon Postgres
├── database/
│   ├── migrations/           # Migraciones SQL versionadas
│   └── README.md             # Convenciones de base de datos
├── src/
│   ├── App.tsx               # Estado y navegación principal
│   ├── data.ts               # Catálogo y datos demostrativos
│   ├── types.ts              # Modelos TypeScript
│   ├── components/           # Vistas y componentes de la experiencia
│   └── utils/analytics.ts    # Envío de eventos de analítica
├── package.json
├── tsconfig.json
└── vite.config.ts
```

El frontend conserva temporalmente usuarios, sesión y progreso en `localStorage`. El único endpoint propio implementado actualmente es `POST /api/validate-document`; el contrato de una API completa descrito durante el diseño todavía pertenece al roadmap.

## Ejecución local

### Requisitos

- Node.js 20 o superior
- npm
- No se requiere una clave de IA mientras la integración permanezca desactivada
- Una base PostgreSQL en Neon

### Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd tramia-v5.1
npm install
```

### Configuración

Copia `.env.example` como `.env` y configura la conexión de Neon:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
PORT="3000"
```

`DATABASE_URL` es un secreto del servidor. Nunca debe utilizar el prefijo
`VITE_` ni incluirse en el repositorio.

La integración con Gemini está desactivada temporalmente y no se necesita una
API key. El prototipo utiliza resultados simulados que sirven únicamente para
demostración y no constituyen una validación documental real.

La aplicación estará disponible en:

```text
http://localhost:3000
```

Puedes comprobar la conexión con Neon en:

```text
GET http://localhost:3000/api/health
```

## Publicación en Netlify

El repositorio incluye `netlify.toml` y una función serverless que expone la API
Express bajo `/api/*`. En Netlify configura:

- comando de build: `npm run build`;
- directorio publicado: `dist`;
- directorio de funciones: `netlify/functions`;
- variable privada `DATABASE_URL` con la conexión de Neon;
- más adelante, las variables privadas del proveedor de IA seleccionado.

Las tres primeras opciones ya se leen automáticamente desde `netlify.toml`. Las
variables privadas deben agregarse en **Project configuration > Environment
variables** y estar disponibles para Functions. Netlify no toma los secretos del
archivo `.env` local.

Después del despliegue verifica:

```text
https://tramia.netlify.app/
https://tramia.netlify.app/api/health
```

El segundo endpoint debe responder con `status: "ok"`. Un estado `degraded`
indica que falta `DATABASE_URL` o que la función no puede conectarse a Neon.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Express y Vite en modo desarrollo. |
| `npm run lint` | Ejecuta la comprobación de TypeScript sin emitir archivos. |
| `npm run build` | Genera el frontend y empaqueta el servidor en `dist/`. |
| `npm start` | Ejecuta el servidor compilado. |
| `npm run preview` | Previsualiza directamente el build de Vite. |
| `npm run release:patch` | Verifica el proyecto y crea el siguiente tag de corrección. |
| `npm run release:minor` | Verifica el proyecto y crea el siguiente tag de funcionalidad. |
| `npm run release:major` | Verifica el proyecto y crea el siguiente tag mayor. |

## Versionado y releases

TramIA utiliza [Versionado Semántico](https://semver.org/lang/es/) y comienza en la versión `0.1.0`. Los tags de Git siguen el formato `vMAJOR.MINOR.PATCH`, por ejemplo `v0.1.0`.

Al publicar un tag compatible, GitHub Actions:

1. verifica que el tag coincida con la versión del paquete;
2. ejecuta TypeScript y el build;
3. empaqueta el resultado de producción;
4. crea automáticamente un GitHub Release.

Consulta [la guía de publicación](docs/RELEASING.md) y el [historial de cambios](CHANGELOG.md).

## Analítica

El prototipo registra eventos de exploración y avance, entre ellos:

- búsquedas realizadas;
- trámites revisados;
- elección de modalidad autónoma o delegada;
- creación e inicio de sesión de cuentas simuladas;
- documentación, pago y finalización de trámites.

No deben enviarse a Google Analytics nombres, DNI, correos, teléfonos, documentos ni términos de búsqueda que contengan información personal.

## Alcance y limitaciones

- No existe integración en tiempo real con RENIEC, SUNAT, SUNARP, MTC u otras entidades.
- No se presentan documentos automáticamente ante instituciones externas.
- No existe firma digital ni verificación oficial de identidad.
- Los pagos y la delegación de trámites son flujos demostrativos.
- El login social no implementa OAuth real.
- Los datos se almacenan localmente en el navegador.
- La validación con IA es experimental y no reemplaza una revisión oficial o profesional.
- La información de requisitos debe verificarse siempre en las fuentes oficiales correspondientes.

## Roadmap

- [ ] Simplificar la interfaz según los hallazgos de investigación.
- [ ] Implementar autenticación y persistencia seguras en backend.
- [ ] Separar los datos y trámites por usuario autenticado.
- [ ] Eliminar aprobaciones simuladas para documentos reales.
- [ ] Añadir validación estricta de archivos, autenticación y límites de uso al API.
- [ ] Mejorar la explicación de requisitos y formatos documentales.
- [ ] Incorporar un diagnóstico conversacional con preguntas de clarificación.
- [ ] Implementar alertas y seguimiento persistente.
- [ ] Añadir pruebas unitarias, de integración y end-to-end.
- [ ] Consolidar la taxonomía de eventos de analítica.
- [ ] Realizar una auditoría de accesibilidad y experiencia mobile-first.

## Contribución

El proyecto se encuentra en evolución. Antes de abrir un pull request:

1. Crea una rama descriptiva.
2. Mantén la interfaz y los mensajes en español de Perú.
3. No agregues afirmaciones de integración oficial que el código no implemente.
4. Ejecuta `npm run lint` y `npm run build`.
5. Describe claramente qué parte es funcional y qué parte continúa siendo simulada.

## Aviso

TramIA no representa ni está afiliada oficialmente con entidades del Estado peruano. La información mostrada por este prototipo es referencial y debe contrastarse con los portales oficiales antes de realizar cualquier trámite.
