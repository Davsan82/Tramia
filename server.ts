import 'dotenv/config';
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { checkDatabaseConnection } from './server/db';

export const app = express();

app.use(express.json({ limit: "15mb" }));

app.get('/api/health', async (_req, res) => {
  const database = await checkDatabaseConnection();
  const ready = database.configured && database.connected;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    service: 'tramia-api',
    database,
  });
});

// Integración con Gemini desactivada temporalmente.
// Cuando se elija el proveedor de IA, cambia este valor a true y configura
// GEMINI_API_KEY en el entorno del servidor. El código se conserva para poder
// reutilizarlo o reemplazarlo sin afectar el flujo simulado actual.
const isGeminiEnabled = false;
const apiKey = process.env.GEMINI_API_KEY;
const ai = isGeminiEnabled && apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Endpoint: AI Document Validation System
app.post("/api/validate-document", async (req, res) => {
  try {
    const {
      fileData, // Base64 data URL e.g. "data:image/jpeg;base64,..."
      fileName,
      mimeType,
      requirementName,
      requirementDescription,
      procedureTitle,
      userProfile, // { fullName, dni }
      testSampleType, // Optional preset sample key
    } = req.body;

    console.log(`[AI-Validation] Processing document for requirement: "${requirementName}" in procedure: "${procedureTitle}"`);

    // System prompt instructing Gemini to act as an expert Peruvian bureaucracy document auditor
    const systemInstruction = `
Eres TramIA Copilot, el sistema oficial de inteligencia artificial especializado en validación y auditoría documental para trámites burocráticos en el Perú (RENIEC, SUNAT, MTC, Migraciones, SUNARP, SAT, etc.).

Tu tarea es analizar exhaustivamente un documento/fotografía adjunto o descrito y verificar su:
1. COMPLETITUD: ¿Están presentes todas las páginas, firmas manuscritas, sellos oficiales y campos obligatorios?
2. LEGIBILIDAD Y CALIDAD: ¿La imagen es nítida? ¿Hay destellos de luz, borrosidad, sombras o recortes de esquinas?
3. EXACTITUD Y COINCIDENCIA DE DATOS: ¿Los nombres, números de DNI y fechas coinciden con lo requerido o con el perfil del usuario (${userProfile?.fullName || "Usuario registrados"}, DNI ${userProfile?.dni || "45892014"})? ¿El documento está vigente?
4. ADHERENCIA A LA NORMATIVA ESPECÍFICA DEL TRÁMITE: Evalúa si cumple las reglas exactas para "${requirementName}" en el trámite "${procedureTitle}".
   - Ejemplo DNI/Pasaporte: Fondo blanco plano, rostro descubierto, orejas visibles, sin reflejos de lentes, sin sombras.
   - Ejemplo Recibos/Comprobantes de Pago: Código de tasa oficial visible, sello de banco/Págalo.pe, fecha dentro de vigencia.
   - Ejemplo Certificado Médico / Minuta: Firma de profesional colegiado, sello notarial, datos legibles.

Debes responder ÚNICAMENTE en formato JSON conforme a la estructura requerida.
    `.trim();

    const promptText = `
Analiza el documento cargado "${fileName || "documento"}" para el requisito "${requirementName || "Documento de Identidad"}" del trámite "${procedureTitle || "Gestión General"}".
Descripción del requisito: ${requirementDescription || "Documento oficial vigente y legible"}.
${userProfile ? `Datos del titular esperado: Nombre "${userProfile.fullName}", DNI "${userProfile.dni}".` : ""}
${testSampleType ? `Nota: Este análisis corresponde a la muestra de prueba tipo "${testSampleType}".` : ""}

Realiza la auditoría detallada y genera la respuesta JSON con:
- isValidated: boolean (true si cumple al menos 80/100)
- status: "Aprobado" | "Corregir"
- overallScore: número de 0 a 100
- imageQuality: "Buena" | "Regular" | "Mala" | "No detectada"
- completenessScore: número de 0 a 100
- accuracyScore: número de 0 a 100
- summary: resumen ejecutivo corto (2-3 oraciones en español claro)
- detectedIssues: array de objetos con { id, title, category ("legibilidad" | "incompleto" | "inconsistencia" | "normativa"), severity ("alta" | "media" | "baja"), description, fixSuggestion }
- recommendations: array de sugerencias de corrección accionables paso a paso
- extractedData: objeto { docType, holderName, docNumber, issueDate, expiryDate, hasSignature, entityName }
- procedureAdherenceChecks: array de objetos { checkName, passed: boolean, comment }
    `.trim();

    let jsonResultText = "";

    // If Gemini API Key is available, invoke Gemini AI directly!
    if (ai) {
      const contentsParts: any[] = [];

      // Check if image or PDF inlineData is provided
      if (fileData && typeof fileData === "string" && fileData.includes(";base64,")) {
        const parts = fileData.split(";base64,");
        const detectedMime = mimeType || parts[0].replace("data:", "");
        const base64Str = parts[1];

        contentsParts.push({
          inlineData: {
            mimeType: detectedMime.includes("pdf") ? "application/pdf" : detectedMime,
            data: base64Str,
          },
        });
      }

      contentsParts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: contentsParts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValidated: { type: Type.BOOLEAN },
              status: { type: Type.STRING },
              overallScore: { type: Type.INTEGER },
              imageQuality: { type: Type.STRING },
              completenessScore: { type: Type.INTEGER },
              accuracyScore: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              detectedIssues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    fixSuggestion: { type: Type.STRING },
                  },
                },
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedData: {
                type: Type.OBJECT,
                properties: {
                  docType: { type: Type.STRING },
                  holderName: { type: Type.STRING },
                  docNumber: { type: Type.STRING },
                  issueDate: { type: Type.STRING },
                  expiryDate: { type: Type.STRING },
                  hasSignature: { type: Type.BOOLEAN },
                  entityName: { type: Type.STRING },
                },
              },
              procedureAdherenceChecks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    checkName: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN },
                    comment: { type: Type.STRING },
                  },
                },
              },
            },
            required: [
              "isValidated",
              "status",
              "overallScore",
              "imageQuality",
              "summary",
              "detectedIssues",
              "recommendations",
            ],
          },
        },
      });

      jsonResultText = response.text || "";
    }

    if (jsonResultText) {
      try {
        const parsed = JSON.parse(jsonResultText);
        return res.json({ success: true, result: parsed });
      } catch (err) {
        console.warn("[AI-Validation] Error parsing Gemini JSON response, falling back to smart structure generator.", err);
      }
    }

    // Fallback or Mock Generator when Gemini Key is missing or returns non-JSON
    const isBadSample = testSampleType === 'bad_blurry' || testSampleType === 'missing_signature' || testSampleType === 'expired_date';
    const isGoodSample = testSampleType === 'good' || !isBadSample;

    const mockResult = {
      isValidated: isGoodSample,
      status: isGoodSample ? "Aprobado" : "Corregir",
      overallScore: isGoodSample ? 96 : 42,
      imageQuality: isGoodSample ? "Buena" : "Mala",
      completenessScore: isGoodSample ? 98 : 50,
      accuracyScore: isGoodSample ? 95 : 35,
      summary: isGoodSample
        ? `El documento "${fileName || requirementName}" cumple plenamente con las especificaciones técnicas requeridas por ${procedureTitle || "el portal de trámite"}. No se detectaron inconsistencias de datos ni problemas de legibilidad.`
        : `Se identificaron 2 observaciones críticas en "${fileName || requirementName}" que impiden su aceptación oficial por la entidad pública: borrosidad en datos clave y falta de firma manuscrita.`,
      detectedIssues: isGoodSample ? [] : [
        {
          id: "issue-1",
          title: "Falta firma manuscrita",
          category: "incompleto",
          severity: "alta",
          description: "No se visualiza la firma del titular en el cuadro asignado en el borde inferior del documento.",
          fixSuggestion: "Firma el documento impreso utilizando bolígrafo de tinta negra o azul y vuelve a escanearlo."
        },
        {
          id: "issue-2",
          title: "Luz excesiva y borrosidad en número de DNI",
          category: "legibilidad",
          severity: "media",
          description: "Un destello de luz sobre el material plástico vuelve ilegibles los últimos 3 dígitos del DNI.",
          fixSuggestion: "Captura la fotografía evitando encender el flash directo y sostén la cámara paralela al documento."
        }
      ],
      recommendations: isGoodSample
        ? ["El documento está listo para ser enviado a la entidad pública."]
        : [
            "Ubica el documento sobre una superficie plana oscura sin reflejos directos de luz.",
            "Asegúrate de incluir la firma manuscrita en tinta azul o negra.",
            "Verifica que los 8 dígitos del DNI se distingan con total claridad antes de subir."
          ],
      extractedData: {
        docType: requirementName || "Documento Oficial",
        holderName: userProfile?.fullName || "PÉREZ GARCÍA JUAN CARLOS",
        docNumber: userProfile?.dni || "45892014",
        issueDate: "12/03/2021",
        expiryDate: "12/03/2029",
        hasSignature: isGoodSample,
        entityName: procedureTitle?.includes("DNI") ? "RENIEC" : procedureTitle?.includes("RUC") ? "SUNAT" : "Entidad Competente"
      },
      procedureAdherenceChecks: [
        {
          checkName: "Encadramiento de 4 esquinas",
          passed: true,
          comment: "Bordes del documento completamente visibles dentro del encuadre."
        },
        {
          checkName: "Legibilidad de caracteres OCR",
          passed: isGoodSample,
          comment: isGoodSample ? "Nombres y DNI legibles por algoritmo óptico." : "Parte del número de documento se ve borroso."
        },
        {
          checkName: "Firma y verificación de autenticidad",
          passed: isGoodSample,
          comment: isGoodSample ? "Firma detectada y validada." : "Firma manuscrita no detectada."
        }
      ]
    };

    return res.json({ success: true, result: mockResult });
  } catch (error: any) {
    console.error("[AI-Validation] Error during document validation:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al procesar la validación con IA",
    });
  }
});
