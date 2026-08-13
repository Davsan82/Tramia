import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { and, desc, eq } from 'drizzle-orm';
import { getDrizzleDatabase } from '../server/db/client';
import { procedureSources, procedureStages, procedureStepChecklistItems, procedureStepDependencies, procedureSteps, procedureVersions, procedures } from '../server/db/schema';

const sourcePath=process.argv[2]; if(!sourcePath) throw new Error('Indica la ruta del Markdown.');
const markdown=await readFile(sourcePath,'utf8'); const db=getDrizzleDatabase();
const mappings:Record<string,string>={
  'Renovación de DNI Electrónico':'renovacion-dni-mayores','Duplicado de DNI Electrónico':'duplicado-dni-electronico',
  'Inscripción al RUC para Persona Natural con Negocio':'inscripcion-ruc-persona-natural','Constitución de Empresa en Línea vía SID-SUNARP':'constitucion-empresa-sid-sunarp',
  'Primera Licencia de Conducir Particular A-I':'primera-licencia-conducir-ai','Obtención de Pasaporte Electrónico Ordinario':'pasaporte-electronico-ordinario','Matrimonio Civil Municipal':'matrimonio-civil-municipal',
};
const clean=(text:string)=>text.replace(/\*\*/g,'').replace(/[✅⚠🔒○◐✓❤️]/g,'').trim();
const sections=[...markdown.matchAll(/^# (\d+)\. (.+)$/gm)].map((match,index,all)=>({title:clean(match[2]),body:markdown.slice((match.index||0)+match[0].length,index+1<all.length?(all[index+1].index||markdown.length):markdown.length)}));
let imported=0;
for(const section of sections){const slug=mappings[section.title];if(!slug)continue;const [procedure]=await db.select().from(procedures).where(eq(procedures.slug,slug)).limit(1);if(!procedure)continue;
  const [current]=await db.select().from(procedureVersions).where(and(eq(procedureVersions.procedureId,procedure.id),eq(procedureVersions.status,'reviewed'))).orderBy(desc(procedureVersions.versionNumber)).limit(1);if(!current)continue;
  if(current.changeSummary?.includes('Etapas, checklist, dependencias')) { console.log(`Sin cambios ${procedure.slug} v${current.versionNumber}`); continue; }
  const existing=await db.select().from(procedureVersions).where(eq(procedureVersions.procedureId,procedure.id)).orderBy(desc(procedureVersions.versionNumber)).limit(1);const next=(existing[0]?.versionNumber||0)+1;
  const sourceUrl=section.body.match(/\*\*Fuente oficial principal:\*\* \[[^\]]+\]\((https?:\/\/[^)]+)\)/)?.[1]||current.officialUrl;
  const [version]=await db.insert(procedureVersions).values({procedureId:procedure.id,versionNumber:next,fullDescription:current.fullDescription,modality:current.modality,difficulty:current.difficulty,officialCostMin:current.officialCostMin,officialCostMax:current.officialCostMax,currency:current.currency,estimatedDurationMin:current.estimatedDurationMin,estimatedDurationMax:current.estimatedDurationMax,durationUnit:current.durationUnit,officialUrl:sourceUrl,sourceVerifiedAt:new Date(),dataClassification:'official_reference',verificationNotes:'Checklist estructurado desde documento funcional TramIA y enlaces oficiales. Revisar periódicamente tasas y condiciones.',changeSummary:'Etapas, checklist, dependencias, ayuda contextual y alertas incorporadas.',status:'reviewed',publishedAt:new Date()}).returning();
  await db.update(procedureVersions).set({status:'archived',updatedAt:new Date()}).where(and(eq(procedureVersions.procedureId,procedure.id),eq(procedureVersions.id,current.id)));
  if(sourceUrl)await db.insert(procedureSources).values({procedureVersionId:version.id,title:`Fuente oficial de ${procedure.title}`,url:sourceUrl,lastCheckedAt:new Date(),isPrimary:true,status:'active',nextReviewAt:new Date(Date.now()+90*86400000)}).onConflictDoNothing();
  const stageMatches=[...section.body.matchAll(/^## Etapa (\d+) — (.+)$/gm)];let previousStepId:string|undefined;
  for(let stageIndex=0;stageIndex<stageMatches.length;stageIndex++){const stageMatch=stageMatches[stageIndex],stageBody=section.body.slice((stageMatch.index||0)+stageMatch[0].length,stageIndex+1<stageMatches.length?(stageMatches[stageIndex+1].index||section.body.length):section.body.length);const [stage]=await db.insert(procedureStages).values({procedureVersionId:version.id,position:Number(stageMatch[1]),name:clean(stageMatch[2])}).returning();const stepMatches=[...stageBody.matchAll(/^### Paso (\d+)\. (.+)$/gm)];
    for(let stepIndex=0;stepIndex<stepMatches.length;stepIndex++){const stepMatch=stepMatches[stepIndex],stepBody=stageBody.slice((stepMatch.index||0)+stepMatch[0].length,stepIndex+1<stepMatches.length?(stepMatches[stepIndex+1].index||stageBody.length):stageBody.length);const checkboxes=[...stepBody.matchAll(/^- \[ \] (.+)$/gm)].map(m=>clean(m[1])).filter(Boolean);const url=stepBody.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/)?.[1];const hasDate=/Fecha para seguimiento|Alerta sugerida|recordarme|avisarme/i.test(stepBody);const type=/solo cuando|si corresponde|si alguno|según/i.test(stepBody)?'conditional':/TramIA debe|debe mostrar/i.test(stepBody)?'informational':'required';const description=clean(stepBody.split('\n').find(line=>line.trim()&&!line.startsWith('- [ ]')&&!line.startsWith('🔗')&&!line.startsWith('📅')&&!line.startsWith('>')&&!line.startsWith('```'))||`Completa este paso para continuar con ${procedure.title}.`).slice(0,2000);
      const [step]=await db.insert(procedureSteps).values({procedureVersionId:version.id,stageId:stage.id,position:Number(stepMatch[1]),title:clean(stepMatch[2]),description,completionMode:'manual',officialUrl:url,stepType:type,isOptional:type==='conditional',helpText:description,whyItMatters:`Este paso forma parte de la etapa ${clean(stageMatch[2])} y ayuda a mantener el trámite en el orden correcto.`,nextStepHint:stepIndex+1<stepMatches.length?`Después podrás continuar con: ${clean(stepMatches[stepIndex+1][2])}.`:undefined,dateTrackingEnabled:hasDate,dateTrackingType:hasDate?'FOLLOW_UP':undefined,reminderOffsets:hasDate?['P7D','P1D']:[]}).returning();
      if(previousStepId&&type!=='informational')await db.insert(procedureStepDependencies).values({stepId:step.id,dependsOnStepId:previousStepId}).onConflictDoNothing();
      for(const [index,label] of checkboxes.entries())await db.insert(procedureStepChecklistItems).values({stepId:step.id,position:index+1,label,isRequired:type!=='conditional'});
      if(type!=='informational')previousStepId=step.id;
    }
  }
  imported++;console.log(`Importado ${procedure.slug} v${next}`);
}
console.log(`Checklists importados: ${imported}`);
