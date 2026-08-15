type ReceiptInput = {
  reference: string;
  paidAt: Date | string | null;
  customerName: string;
  customerEmail: string;
  procedureTitle: string;
  trackingCode: string;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  amountMinor: number;
  currency: string;
};

const pdfText = (value: unknown) => String(value ?? "")
  .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  .replace(/[\u2013\u2014]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

const rgb = (hex: string) => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel.toFixed(3)).join(" ");
};

const text = (value: string, x: number, y: number, size: number, color = "#0b1739", bold = false) =>
  `${rgb(color)} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`;
const rect = (x: number, y: number, width: number, height: number, color: string) =>
  `${rgb(color)} rg ${x} ${y} ${width} ${height} re f`;
const strokeRect = (x: number, y: number, width: number, height: number, color: string) =>
  `${rgb(color)} RG 1 w ${x} ${y} ${width} ${height} re S`;
const line = (x1: number, y1: number, x2: number, y2: number, color: string) =>
  `${rgb(color)} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S`;

const wrapText = (value: string, maxChars: number) => {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
};

const titleCase = (value: string) => value.toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());

export function createPaymentReceiptPdf(input: ReceiptInput) {
  const date = input.paidAt
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(input.paidAt))
    : "Fecha no disponible";
  const money = `${input.currency === "PEN" ? "S/" : input.currency} ${(input.amountMinor / 100).toFixed(2)}`;
  const reference = input.reference || "Sin referencia";
  const cardBrand = titleCase(input.cardBrand || "Tarjeta");
  const customerLines = wrapText(input.customerName, 46).slice(0, 2);
  const procedureLines = wrapText(input.procedureTitle, 58).slice(0, 3);

  const commands: string[] = [
    "q",
    rect(0, 0, 595, 842, "#f5f8ff"),
    rect(0, 700, 595, 142, "#09255d"),
    rect(430, 700, 165, 142, "#0ea5d7"),
    text("T", 46, 778, 30, "#31d7f4", true),
    text("TramIA", 82, 783, 24, "#ffffff", true),
    text("Tu gestión, clara y segura", 83, 763, 9, "#b9eafa"),
    text("BOLETA DE VENTA", 384, 783, 14, "#ffffff", true),
    text("Comprobante digital", 426, 763, 9, "#d9f6ff"),
    text(`N.° ${reference}`, 46, 720, 10, "#d9f6ff", true),

    rect(32, 608, 531, 70, "#ffffff"),
    strokeRect(32, 608, 531, 70, "#d9e5f7"),
    text("PAGO CONFIRMADO", 52, 652, 9, "#008d68", true),
    text("La operación fue registrada correctamente en TramIA.", 52, 630, 11, "#43516f"),
    rect(452, 625, 88, 30, "#e7fbf5"),
    text("APROBADO", 470, 636, 9, "#008d68", true),

    text("DATOS DEL CLIENTE", 42, 574, 9, "#1763ff", true),
    rect(32, 463, 258, 96, "#ffffff"),
    strokeRect(32, 463, 258, 96, "#d9e5f7"),
    text("Nombre", 50, 535, 8, "#7c8ba8", true),
    ...customerLines.map((value, index) => text(value, 50, 516 - index * 14, 11, "#0b1739", true)),
    text("Correo electrónico", 50, 484, 8, "#7c8ba8", true),
    text(input.customerEmail, 50, 469, 9, "#43516f"),

    text("DETALLE DEL SERVICIO", 315, 574, 9, "#1763ff", true),
    rect(305, 463, 258, 96, "#ffffff"),
    strokeRect(305, 463, 258, 96, "#d9e5f7"),
    text("Trámite", 323, 535, 8, "#7c8ba8", true),
    ...procedureLines.map((value, index) => text(value, 323, 516 - index * 14, 10, "#0b1739", true)),
    text(`Código: ${input.trackingCode}`, 323, 472, 8, "#43516f"),

    text("RESUMEN DEL PAGO", 42, 426, 9, "#1763ff", true),
    rect(32, 284, 531, 126, "#ffffff"),
    strokeRect(32, 284, 531, 126, "#d9e5f7"),
    text("Fecha y hora", 50, 381, 8, "#7c8ba8", true),
    text(date, 50, 361, 10, "#0b1739", true),
    text("Medio de pago", 50, 330, 8, "#7c8ba8", true),
    text(`${cardBrand} terminada en ${input.cardLastFour || "----"}`, 50, 310, 10, "#0b1739", true),
    line(337, 300, 337, 394, "#d9e5f7"),
    text("TOTAL PAGADO", 368, 369, 9, "#43516f", true),
    text(money, 368, 326, 24, "#1763ff", true),

    rect(32, 174, 531, 74, "#eaf2ff"),
    text("Comprobante emitido por TramIA", 50, 221, 10, "#0b1739", true),
    text("Este documento acredita el pago del servicio de gestión registrado en la plataforma.", 50, 201, 9, "#43516f"),
    text("Por tu seguridad, no incluye el número completo ni el código de seguridad de la tarjeta.", 50, 185, 9, "#43516f"),
    line(32, 135, 563, 135, "#cbd8ec"),
    text("TramIA · Comprobante digital", 32, 112, 8, "#60708f", true),
    text("Conserva esta boleta como constancia de tu operación.", 32, 96, 8, "#7c8ba8"),
    text("tramia.netlify.app", 446, 104, 8, "#1763ff", true),
    "Q",
  ];

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "latin1"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "latin1");
}
