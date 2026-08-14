# Health check de TramIA

El endpoint público `GET /api/health` informa si la API puede atender tráfico y si sus integraciones están configuradas. No requiere autenticación y nunca devuelve contraseñas, tokens, cadenas de conexión ni valores de variables.

## Estados

- `ok`: PostgreSQL está conectado y todas las variables evaluadas son válidas.
- `degraded`: el núcleo funciona, pero falta o es inválida una integración opcional. Responde HTTP `200`.
- `error`: PostgreSQL no responde o falta configuración crítica. Responde HTTP `503`.

En desarrollo, TramIA permite claves locales de respaldo para `SESSION_SECRET` y `DATA_ENCRYPTION_KEY`; el endpoint las reporta como faltantes y devuelve `degraded`. En producción no se permiten estos respaldos.

## Variables evaluadas

| Categoría | Variables |
| --- | --- |
| Núcleo | `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`, `DATA_ENCRYPTION_KEY` |
| Correo | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_APP_PASSWORD`, `MAIL_FROM`, `SUPPORT_EMAIL` |
| Identidad | `PERUDEVS_API_KEY`, `PERUDEVS_BASE_URL` |

Para cada variable se devuelve exclusivamente:

- `configured`: indica si existe un valor.
- `valid`: indica si cumple el formato mínimo esperado.
- `required`: señala si bloquea la aplicación en producción.
- `category`: agrupa la dependencia.
- `message`: explica cómo corregir una ausencia o formato inválido.

## Ejemplo resumido

```json
{
  "status": "degraded",
  "service": "tramia-api",
  "version": "0.6.0",
  "ready": true,
  "database": {
    "configured": true,
    "connected": true
  },
  "environment": {
    "summary": {
      "total": 13,
      "configured": 11,
      "valid": 11,
      "missing": 2,
      "invalid": 0
    }
  }
}
```

Este endpoint puede utilizarse en monitores de disponibilidad. Para decidir si una instancia debe recibir tráfico, utiliza el código HTTP y el campo `ready`; no dependas únicamente del texto de `status`.
