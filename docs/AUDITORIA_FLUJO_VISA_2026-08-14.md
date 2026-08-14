# Auditoría del flujo de visa B1/B2

Fecha: 14 de agosto de 2026

## Alcance

Se recorrió la solicitud de visa de turismo para EE. UU. B1/B2 en los dos modos disponibles: autogestión y preparación para delegar. La revisión incluyó catálogo, detalle informativo, creación y reanudación de instancias, checklist, navegación principal, fuentes oficiales, persistencia del modo elegido y preparación de asesor/pago.

## Escenarios verificados

### Autogestión

- Una solicitud nueva inicia en 0 de 18 pasos.
- Los pasos posteriores permanecen bloqueados hasta completar el anterior.
- Al completar el primer paso, el avance cambia a 1 de 18 (6 %) y se habilita el segundo.
- El mismo usuario puede iniciar otra solicitud de la misma visa y recibe un código de seguimiento diferente, sin heredar respuestas ni progreso.

### Delegación

- Elegir delegación crea una instancia con modo `hybrid` desde el inicio.
- Al reabrirla desde Mis trámites conserva “Preparación para delegar”.
- La lista se reduce a 4 acciones personales obligatorias y mantiene el orden secuencial.
- El panel muestra las fases Pasos personales, Elegir asesor, Confirmar pago y Seguimiento.
- Los asesores se consultan desde la API y el pago utiliza los medios guardados del usuario; no se mantiene un asesor ficticio como respaldo en la interfaz.

## Correcciones aplicadas

- Persistencia inmediata del modo de delegación al crear la solicitud.
- Orden de restauración corregido para evitar que una delegación se monte primero como autogestión.
- Navegación superior corregida para salir del espacio de un trámite al elegir Inicio, Mis trámites o Mi perfil.
- Creación de solicitudes desacoplada: cada inicio genera una instancia única.
- Tipo de trámite proveniente de la base de datos; la visa se presenta como “Consular”.
- Fuente oficial y entidad obtenidas del catálogo, sin selección por `slug` en el frontend.
- Eliminación del modal heredado de delegación que permanecía como código muerto con contenido simulado.
- Eliminación de nombres de asesores fijados en componentes operativos.
- Registro de cuenta desacoplado de la latencia SMTP para que el envío de correo no bloquee el inicio de sesión.

## Fuentes oficiales comprobadas

- Información de visa de visitante del Departamento de Estado.
- Formulario DS-160 en CEAC.
- Tarifas oficiales de servicios de visa.
- Tiempos de espera para entrevistas.

Los cuatro enlaces respondieron correctamente durante la auditoría.

## Validación técnica

- `npm run quality`: aprobado.
- TypeScript: aprobado.
- `drizzle-kit check`: aprobado.
- Revisión de secretos versionados: aprobada.
- Validación UTF-8: aprobada.
- Compilación de producción: aprobada.
- Rutas públicas y protegidas principales: respuestas esperadas.
- Consola del navegador durante la prueba final: sin errores ni advertencias.

## Datos creados para la auditoría

Se creó el usuario técnico `auditvisa260814` y cuatro instancias de visa con códigos de seguimiento independientes. Estos registros se conservaron para trazabilidad y no se eliminaron automáticamente, porque hacerlo modificaría datos de Neon.

## Mejoras siguientes

1. Mostrar un estado visual específico “Preparando delegación” también en la tarjeta de Mis trámites.
2. Añadir una carga esquelética al checklist delegado para evitar que se vea brevemente el total completo mientras llegan los requisitos personales.
3. Dividir el paquete principal del frontend mediante carga diferida para reducir el aviso de tamaño de Vite.
4. Automatizar estos dos recorridos como pruebas end-to-end repetibles antes de cada release.
