import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(await fs.readFile(path.join(outputDir, 'demo-data.json'), 'utf8'));
const workbook = Workbook.create();
const blue = '#0E55C7', navy = '#071A3D', cyan = '#13AFD1', pale = '#EEF6FF', border = '#D9E6F5';

function addSheet(name, title, note, headers, rows, widths) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  sheet.getRange(`A1:${String.fromCharCode(64 + headers.length)}1`).merge();
  sheet.getRange('A1').values = [[title]];
  sheet.getRange('A1').format = { fill: navy, font: { bold: true, color: '#FFFFFF', size: 18 }, rowHeight: 32 };
  sheet.getRange(`A2:${String.fromCharCode(64 + headers.length)}2`).merge();
  sheet.getRange('A2').values = [[note]];
  sheet.getRange('A2').format = { fill: pale, font: { color: '#334155', italic: true }, wrapText: true, rowHeight: 32 };
  const end = 3 + rows.length;
  sheet.getRange(`A3:${String.fromCharCode(64 + headers.length)}${end}`).values = [headers, ...rows];
  sheet.getRange(`A3:${String.fromCharCode(64 + headers.length)}3`).format = { fill: blue, font: { bold: true, color: '#FFFFFF' }, rowHeight: 25 };
  if (rows.length) {
    sheet.getRange(`A4:${String.fromCharCode(64 + headers.length)}${end}`).format = { borders: { preset: 'insideHorizontal', style: 'thin', color: border }, font: { color: '#1E293B', size: 10 }, wrapText: true, verticalAlignment: 'top' };
    sheet.tables.add(`A3:${String.fromCharCode(64 + headers.length)}${end}`, true, `${name.replace(/[^A-Za-z0-9]/g,'')}Table`).style = 'TableStyleMedium2';
  }
  widths.forEach((width, index) => sheet.getRangeByIndexes(0,index,Math.max(end,3),1).format.columnWidth = width);
  sheet.freezePanes.freezeRows(3);
  return sheet;
}

const summary = workbook.worksheets.add('Resumen'); summary.showGridLines=false;
summary.getRange('A1:F1').merge(); summary.getRange('A1').values=[['Archivo histórico de datos demo · TramIA']]; summary.getRange('A1').format={fill:navy,font:{bold:true,color:'#FFFFFF',size:20},rowHeight:36};
summary.getRange('A3:B8').values=[['Conjunto','Registros'],['Trámites',data.procedures.length],['Pasos',data.steps.length],['Requisitos',data.requirements.length],['Asesores',data.advisors.length],['Recordatorios',data.reminders.length]];
summary.getRange('A3:B3').format={fill:blue,font:{bold:true,color:'#FFFFFF'}}; summary.getRange('A4:B8').format={fill:pale,borders:{preset:'insideHorizontal',style:'thin',color:border}};
summary.getRange('D3:F7').values=[['Estado de la aplicación','',''],['Catálogo web','Neon','Fuente activa'],['Respaldo src/data.ts','Desvinculado','Archivo histórico'],['Datos semilla de Neon','Conservados','Pueden mostrarse'],['Fecha de archivo',new Date().toISOString().slice(0,10),'']];
summary.getRange('D3:F3').format={fill:cyan,font:{bold:true,color:'#FFFFFF'}}; summary.getRange('D4:F7').format={fill:'#F8FAFC',borders:{preset:'insideHorizontal',style:'thin',color:border},wrapText:true};
summary.getRange('A10:F12').merge(); summary.getRange('A10').values=[['Este libro conserva los datos que estaban escritos directamente en el frontend. No implica que la información esté vigente u oficialmente validada. Los trámites guardados en Neon permanecen disponibles para la aplicación.']]; summary.getRange('A10').format={fill:'#FFF7ED',font:{color:'#9A3412'},wrapText:true,rowHeight:54};
['A','B','C','D','E','F'].forEach((c,i)=>summary.getRange(`${c}:${c}`).format.columnWidth=[24,16,4,25,20,20][i]);

addSheet('Tramites','Trámites demo del frontend','Exportados desde src/data.ts antes de retirar el respaldo local.', ['ID','Título','Categoría','Entidad','Modalidad','Complejidad','Costo estimado','Duración','Popular','Consejo','Tarifa delegación'], data.procedures.map(p=>[p.id,p.title,p.category,p.entity||'',p.modality||'',p.complexity,p.estimatedCost,p.estimatedDuration,p.popular?'Sí':'No',p.coPilotAdvice||'',p.feeAmount||'']), [24,38,18,22,14,14,25,22,11,52,18]);
addSheet('Pasos','Pasos demo','Relación de pasos escritos en el frontend.', ['Trámite ID','Trámite','Paso ID','Orden','Título','Descripción','Estado','Requiere evidencia','URL oficial'], data.steps.map(s=>[s.procedureId,s.procedureTitle,s.id,s.order,s.title,s.description,s.status,s.requiresEvidence?'Sí':'No',s.actionUrl||'']), [24,35,24,9,32,60,16,18,42]);
addSheet('Requisitos','Requisitos demo','Documentos y condiciones escritos en el frontend.', ['Trámite ID','Trámite','Requisito ID','Nombre','Descripción','Código','Obligatorio','Crítico','Paso relacionado'], data.requirements.map(r=>[r.procedureId,r.procedureTitle,r.id,r.name,r.description,r.code||'',r.isRequired?'Sí':'No',r.critical?'Sí':'No',r.requiredForStepId]), [24,35,25,36,60,20,14,12,24]);
addSheet('Asesores','Asesores demo','Perfiles ficticios retirados como fuente de datos operativa.', ['Nombre','Estado / especialidad','Rating','Casos completados','Acreditación','Tarifa','Avatar'], data.advisors.map(a=>[a.name,a.status,a.rating,a.casesCompleted,a.colegiatura||'',a.fee||'',a.avatar]), [28,50,12,18,28,15,55]);
addSheet('Otros','Otros datos demo','Estados demo que no deben simular actividad real en producción.', ['Tipo','ID','Título / detalle','Estado / fecha'], [...data.reminders.map(r=>['Recordatorio',r.id,r.title,r.expirationDate]),...data.activeProcedures.map(r=>['Trámite activo',r.id,r.title,r.startedAt]),...data.history.map(r=>['Historial',r.id,r.title,r.completedAt])], [20,25,42,24]);

await fs.mkdir('.', { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook); await output.save(path.join(outputDir, 'TramIA-datos-demo-archivados.xlsx'));
const preview = await workbook.render({sheetName:'Resumen',range:'A1:F12',scale:1.5,format:'png'}); await fs.writeFile(path.join(outputDir, 'preview-resumen.png'),new Uint8Array(await preview.arrayBuffer()));
console.log((await workbook.inspect({kind:'table',range:'Resumen!A1:F12',include:'values,formulas',tableMaxRows:15,tableMaxCols:8})).ndjson);
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:100},summary:'formula errors'})).ndjson);
