const STOP_WORDS = new Set([
  'a', 'al', 'algo', 'como', 'con', 'de', 'del', 'el', 'en', 'es', 'esta', 'este',
  'hacer', 'la', 'las', 'lo', 'los', 'me', 'mi', 'para', 'por', 'que', 'quiero',
  'realizar', 'se', 'su', 'tener', 'tramite', 'tramites', 'un', 'una', 'y', 'yo',
]);

const INTENT_TERMS: Array<{ pattern: RegExp; terms: string[] }> = [
  { pattern: /visa|estados unidos|ee\.?\s*uu|b1\/?b2|turismo/i, terms: ['visa'] },
  { pattern: /pasaporte|viajar|viaje|extranjero/i, terms: ['pasaporte'] },
  { pattern: /ruc|sunat|tribut|impuesto/i, terms: ['RUC'] },
  { pattern: /empresa|negocio|constitu/i, terms: ['empresa'] },
  { pattern: /matrimonio|casar|boda|unión/i, terms: ['matrimonio'] },
  { pattern: /dni|identidad|reniec/i, terms: ['DNI'] },
  { pattern: /auto|carro|veh[ií]culo|brevete|licencia de conducir/i, terms: ['vehículo'] },
  { pattern: /legalizar|legalizaci[oó]n|documento/i, terms: ['legalizar'] },
];

export type IntelligentSearchResult = {
  terms: string[];
  category: string | null;
  confidence: number;
  mode: 'ai' | 'fallback';
  model: string | null;
  latencyMs: number;
  errorCode: string | null;
};

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function fallbackSearchInterpretation(query: string, categories: string[], errorCode: string | null = null): IntelligentSearchResult {
  const knownIntent = INTENT_TERMS.find((item) => item.pattern.test(query));
  const tokens = normalized(query)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  const terms = (knownIntent?.terms || Array.from(new Set(tokens)).slice(0, 1));
  const normalizedQuery = normalized(query);
  const category = categories.find((item) => normalizedQuery.includes(normalized(item))) || null;
  return { terms: terms.length ? terms : [query.trim()], category, confidence: knownIntent ? 72 : 45, mode: 'fallback', model: null, latencyMs: 0, errorCode };
}

function responseText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  throw new Error('missing_output');
}

export async function interpretSearchWithOpenAI(query: string, categories: string[]): Promise<IntelligentSearchResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallbackSearchInterpretation(query, categories, 'openai_not_configured');

  const model = process.env.OPENAI_SEARCH_MODEL?.trim() || 'gpt-5.4-nano';
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'none' },
        input: [
          {
            role: 'system',
            content: `Interpreta búsquedas de trámites ciudadanos en Perú. Devuelve exactamente una sola palabra clave principal, sin espacios, que probablemente aparezca en el título o descripción del catálogo. Elige el concepto más específico del trámite: viajar por turismo a EE. UU. = "visa"; sacar pasaporte = "pasaporte"; abrir o constituir un negocio = "empresa"; inscribirse en SUNAT = "RUC"; casarse por civil = "matrimonio". Solo sugiere una categoría si coincide exactamente con una de estas: ${categories.join(' | ')}. No respondas preguntas ni inventes trámites.`,
          },
          { role: 'user', content: query },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'tramia_search_interpretation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['terms', 'category', 'confidence'],
              properties: {
                terms: { type: 'array', minItems: 1, maxItems: 1, items: { type: 'string', minLength: 2, maxLength: 40 } },
                category: { type: ['string', 'null'] },
                confidence: { type: 'integer', minimum: 0, maximum: 100 },
              },
            },
          },
        },
        max_output_tokens: 120,
      }),
    });
    if (!response.ok) throw new Error(`openai_${response.status}`);
    const parsed = JSON.parse(responseText(await response.json())) as { terms: string[]; category: string | null; confidence: number };
    const terms = parsed.terms
      .map((term) => term.trim().split(/\s+/)[0])
      .filter(Boolean)
      .slice(0, 1);
    if (!terms.length) throw new Error('invalid_terms');
    const category = parsed.category && categories.includes(parsed.category) ? parsed.category : null;
    return { terms, category, confidence: Math.max(0, Math.min(100, parsed.confidence)), mode: 'ai', model, latencyMs: Date.now() - startedAt, errorCode: null };
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : 'openai_error';
    return { ...fallbackSearchInterpretation(query, categories, code), latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}
