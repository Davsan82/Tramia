# TramIA

> Un copiloto digital para entender, organizar y dar seguimiento a trámites en el Perú.

TramIA transforma necesidades expresadas en lenguaje cotidiano en información clara, requisitos y rutas paso a paso. El proyecto nació dentro de **LegalIA, un venture de UTEC**, y está evolucionando desde un mockup creado en Google AI Studio hacia una aplicación web funcional.

La aplicación pública se encuentra en [tramia.netlify.app](https://tramia.netlify.app/).

## Estado del producto

TramIA es actualmente un MVP en desarrollo. No representa ni está afiliada oficialmente con entidades del Estado peruano.

### Funcional

- Catálogo de trámites, categorías, requisitos y pasos consultado desde Neon.
- Búsqueda por texto y filtros por categoría.
- Fichas informativas con fuente oficial, tiempos, costos referenciales y dificultad.
- Registro con usuario, correo, contraseña y celular.
- Inicio y cierre de sesión mediante cookie segura `HttpOnly`.
- Cierre automático luego de 15 minutos de inactividad.
- Verificación de correo mediante enlaces de uso único.
- Recuperación de acceso sin bloquear la contraseña vigente hasta confirmar el cambio.
- Perfil persistente y validación de DNI mediante PeruDevs desde el servidor.
- Departamentos, provincias y distritos en selectores dependientes.
- Vista de trámites del usuario e historial consultados desde Neon.
- Formulario de contacto almacenado en Neon y enviado por SMTP.
- API Express, especificación OpenAPI y Swagger en `/api/docs`.
- Eventos personalizados para Google Analytics 4.
- Versionado Semántico, CI y releases automatizados con GitHub Actions.

### Demostrativo o pendiente

- El inicio, checklist y avance completo de un trámite todavía conservan partes en `localStorage`.
- La carga de documentos a almacenamiento de objetos está pendiente.
- La validación documental con IA es una simulación y no constituye revisión oficial.
- La delegación, asignación de asesores y los pagos son demostrativos.
- No se presentan solicitudes automáticamente ante entidades públicas.
- No existe firma digital ni login social OAuth.

> [!WARNING]
> No ingreses Clave SOL, PAN, CVV, contraseñas de entidades ni documentos sensibles en funciones demostrativas. TramIA no almacena ni debe solicitar la Clave SOL.

## Arquitectura

TramIA utiliza una aplicación web y API integradas en el mismo repositorio:

```mermaid
flowchart LR
    UI["React + Vite"] --> API["Express API"]
    API --> DB["Neon PostgreSQL"]
    API --> MAIL["Gmail SMTP"]
    API --> DNI["PeruDevs"]
    NETLIFY["Netlify"] --> UI
    NETLIFY --> API
```

```text
tramia-v5.1/
├── src/                       # Aplicación React y componentes
├── server.ts                 # Endpoints Express
├── server/
│   ├── db/                   # Schema y cliente Drizzle/Neon
│   ├── repositories/         # Consultas de dominio
│   ├── services/             # Autenticación y servicios
│   └── openapi.ts            # Contrato OpenAPI
├── database/
│   ├── migrations/           # Migraciones versionadas
│   └── seed.ts               # Datos iniciales del catálogo
├── netlify/functions/api.ts  # Adaptador serverless
├── docs/                      # Decisiones y guías del proyecto
├── netlify.toml
└── package.json
```

El catálogo, usuarios, perfiles, sesiones, tokens, mensajes y trámites del usuario se modelan en PostgreSQL mediante Drizzle. Algunas pantallas heredadas todavía leen progreso demostrativo local; su migración completa a Neon es el siguiente bloque prioritario.

## Tecnologías

- React 19, TypeScript y Vite
- Tailwind CSS 4, Motion y Lucide React
- Express y funciones serverless de Netlify
- Neon Serverless Postgres
- Drizzle ORM y Drizzle Kit
- Nodemailer con Gmail SMTP
- Google Analytics 4 y Google Tag Manager

## Desarrollo local

### Requisitos

- Node.js 22 recomendado
- npm
- Una base PostgreSQL en Neon

### Instalación

```bash
git clone <URL_PRIVADA_DEL_REPOSITORIO>
cd tramia-v5.1
npm install
```

Copia `.env.example` como `.env` y completa las variables del servidor. Nunca uses el prefijo `VITE_` para secretos.

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST/neondb?sslmode=require"
DATABASE_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST/neondb?sslmode=require"
APP_URL="http://localhost:3000"
SESSION_SECRET="VALOR_ALEATORIO_LARGO"
DATA_ENCRYPTION_KEY="OTRO_VALOR_ALEATORIO_LARGO"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="correo@gmail.com"
SMTP_APP_PASSWORD="CLAVE_DE_APLICACION"
MAIL_FROM="TramIA Soporte <correo@gmail.com>"
SUPPORT_EMAIL="correo@gmail.com"
PERUDEVS_API_KEY="TOKEN_PRIVADO"
PERUDEVS_BASE_URL="https://api.perudevs.com/api/v1"
```

Inicia la aplicación:

```bash
npm run dev
```

En Windows/PowerShell también puedes usar:

```powershell
npm.cmd run dev
```

Abre `http://localhost:3000`. La salud del backend se consulta en `/api/health` y Swagger en `/api/docs`.

## Base de datos

```bash
npm run db:check
npm run db:generate
npm run db:migrate
npm run db:seed
```

- Usa `DATABASE_URL` con pooler durante la ejecución.
- Usa `DATABASE_DIRECT_URL` para migraciones.
- Revisa las migraciones generadas antes de ejecutarlas en producción.
- El seed debe ejecutarse conscientemente; no forma parte automática de cada deploy.

## Publicación en Netlify

`netlify.toml` configura el build, el directorio `dist`, las funciones y los redirects de la SPA/API. El sitio existente está conectado a `main`, por lo que cada push dispara un deploy automático.

Variables privadas requeridas en Netlify:

- `APP_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `DATA_ENCRYPTION_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_APP_PASSWORD`
- `MAIL_FROM`, `SUPPORT_EMAIL`
- `PERUDEVS_API_KEY`, `PERUDEVS_BASE_URL`

Cuando un commit agregue una variable o migración, debe indicarse expresamente en las notas de entrega. Los cambios que solo modifican frontend o lógica existente se publican sin configuración manual adicional.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Express y Vite para desarrollo. |
| `npm run lint` | Comprueba TypeScript sin emitir archivos. |
| `npm run build` | Genera el frontend y empaqueta el servidor. |
| `npm start` | Ejecuta el build del servidor. |
| `npm run db:check` | Valida el historial de Drizzle. |
| `npm run db:migrate` | Ejecuta migraciones pendientes. |
| `npm run db:seed` | Carga los datos maestros iniciales. |
| `npm run security:check` | Busca secretos comprometidos en archivos versionados. |
| `npm run version:check -- vX.Y.Z` | Comprueba la correspondencia entre tag y paquete. |
| `npm run release:patch` | Prepara una corrección compatible. |
| `npm run release:minor` | Prepara una versión con funcionalidad nueva. |
| `npm run release:major` | Prepara un cambio mayor. |

## Versionado y releases

TramIA sigue [Versionado Semántico](https://semver.org/lang/es/) y utiliza tags `vMAJOR.MINOR.PATCH`. La versión se obtiene automáticamente desde `package.json` y se muestra discretamente en el footer y en el menú de usuario; no enlaza al repositorio privado.

Al publicar un tag, GitHub Actions valida seguridad, TypeScript, Drizzle y build, y luego genera el GitHub Release. Consulta [RELEASING.md](docs/RELEASING.md) y [CHANGELOG.md](CHANGELOG.md).

## Privacidad y seguridad

- Las contraseñas se almacenan con hash, nunca en texto plano.
- Las sesiones usan cookies `HttpOnly` y se invalidan al cambiar la contraseña.
- El DNI completo se cifra; la interfaz solo vuelve a mostrar sus últimos dígitos.
- Las claves de SMTP, Neon y PeruDevs permanecen exclusivamente en el servidor.
- La recuperación de acceso no revela si un correo está registrado.
- No se deben enviar datos personales a Google Analytics.
- Los pagos futuros usarán tokenización; TramIA no guardará PAN ni CVV.

## Analítica

La aplicación registra eventos de navegación, búsqueda, revisión de trámites y autenticación. Los eventos personalizados aparecen primero en Tiempo real/DebugView y posteriormente en los informes procesados de GA4.

## Roadmap inmediato

- [x] Catálogo y maestros en Neon.
- [x] Autenticación, verificación de correo y recuperación de acceso.
- [x] Perfil y validación de DNI desde backend.
- [x] Formulario de contacto persistente y correo de soporte.
- [x] CI, versionado y releases.
- [ ] Persistir en Neon el inicio, checklist y avance completo de cada trámite.
- [ ] Implementar reglas de cancelación y trazabilidad de estados.
- [ ] Cargar documentos en Netlify Blobs u otro object storage.
- [ ] Crear el panel administrativo y roles.
- [ ] Implementar asesores, delegación y pago tokenizado/simulado.
- [ ] Incorporar alertas persistentes y notificaciones.
- [ ] Sustituir la validación de IA simulada por un proveedor seleccionado.
- [ ] Añadir pruebas unitarias, de integración y end-to-end.
- [ ] Completar auditorías de accesibilidad, seguridad y experiencia mobile-first.

## Contribución

1. Crea una rama descriptiva.
2. Mantén la interfaz y los mensajes en español de Perú y Latinoamérica.
3. No afirmes integraciones oficiales que el código no implemente.
4. No incluyas secretos ni datos personales en commits.
5. Ejecuta `npm run security:check`, `npm run lint`, `npm run db:check` y `npm run build`.
6. Documenta si el cambio requiere variables, migraciones o configuración posterior al deploy.

## Aviso

La información de los trámites es referencial y debe contrastarse con sus fuentes oficiales antes de presentar solicitudes o realizar pagos.
