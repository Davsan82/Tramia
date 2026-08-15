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

export function createPaymentReceiptPdf(input: ReceiptInput) {
  const date = input.paidAt ? new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(input.paidAt)) : "Fecha no disponible";
  const money = `${input.currency === "PEN" ? "S/" : input.currency} ${(input.amountMinor / 100).toFixed(2)}`;
  const lines: Array<[number, number, number, string]> = [
    [54, 770, 24, "TramIA"], [54, 738, 16, "BOLETA DE VENTA"],
    [54, 716, 10, "Comprobante del servicio registrado en TramIA"],
    [54, 680, 11, `Referencia: ${input.reference || "Sin referencia"}`],
    [54, 660, 11, `Fecha de pago: ${date}`],
    [54, 620, 12, "DATOS DEL CLIENTE"],
    [54, 598, 11, `Nombre: ${input.customerName}`],
    [54, 578, 11, `Correo: ${input.customerEmail}`],
    [54, 538, 12, "SERVICIO"],
    [54, 516, 11, `Trámite: ${input.procedureTitle}`],
    [54, 496, 11, `Código de seguimiento: ${input.trackingCode}`],
    [54, 456, 12, "PAGO"],
    [54, 434, 11, `Medio: ${(input.cardBrand || "Tarjeta").toUpperCase()} terminada en ${input.cardLastFour || "----"}`],
    [54, 398, 16, `TOTAL PAGADO: ${money}`],
    [54, 350, 9, "Este comprobante acredita el pago del servicio de gestión registrado en la plataforma TramIA."],
    [54, 334, 9, "No contiene ni almacena el número completo ni el código de seguridad de la tarjeta."],
  ];
  const stream = ["q", "0.05 0.16 0.38 rg", "45 705 505 85 re f", "1 1 1 rg", ...lines.slice(0,3).map(([x,y,size,value])=>`BT /F1 ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`), "0.06 0.09 0.16 rg", ...lines.slice(3).map(([x,y,size,value])=>`BT /F1 ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`), "Q"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(stream,"latin1")} >>\nstream\n${stream}\nendstream`,
  ];
  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((object,index)=>{ offsets.push(Buffer.byteLength(output,"latin1")); output += `${index+1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output,"latin1");
  output += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>`${String(value).padStart(10,"0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output,"latin1");
}
