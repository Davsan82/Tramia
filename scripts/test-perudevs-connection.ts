import 'dotenv/config';

const apiKey = process.env.PERUDEVS_API_KEY?.trim();
const baseUrl = process.env.PERUDEVS_BASE_URL?.trim() || 'https://api.perudevs.com/api/v1';
const document = process.env.PERUDEVS_TEST_DNI?.trim() || '12345678';
if (!apiKey) throw new Error('PERUDEVS_API_KEY no está configurada.');
if (!/^\d{8}$/.test(document)) throw new Error('PERUDEVS_TEST_DNI debe tener 8 dígitos.');

const response = await fetch(`${baseUrl}/dni/complete?document=${encodeURIComponent(document)}&key=${encodeURIComponent(apiKey)}`, {
  signal: AbortSignal.timeout(15000),
});
const payload: any = await response.json().catch(() => ({}));
console.log(JSON.stringify({
  httpStatus: response.status,
  authenticated: response.status !== 401 && response.status !== 403,
  providerState: payload.estado ?? null,
  providerMessage: payload.mensaje ?? null,
  responseShapeValid: typeof payload === 'object' && ('estado' in payload || 'mensaje' in payload),
  fieldsReceived: payload.resultado ? {
    id: Boolean(payload.resultado.id),
    nombres: Boolean(payload.resultado.nombres),
    apellidoPaterno: Boolean(payload.resultado.apellido_paterno),
    apellidoMaterno: Boolean(payload.resultado.apellido_materno),
    nombreCompleto: Boolean(payload.resultado.nombre_completo),
    genero: Boolean(payload.resultado.genero),
    fechaNacimiento: Boolean(payload.resultado.fecha_nacimiento),
    codigoVerificacion: Boolean(payload.resultado.codigo_verificacion),
  } : null,
}, null, 2));
