import { writeFile } from 'node:fs/promises';
import { PROCEDURES, GESTORES_VERIFICADOS, EXPIRATION_REMINDERS, MOCK_HISTORY } from '../src/data';

const data = {
  procedures: PROCEDURES.map(({ requirements, steps, ...procedure }) => procedure),
  steps: PROCEDURES.flatMap((procedure) => procedure.steps.map((step) => ({ procedureId: procedure.id, procedureTitle: procedure.title, ...step }))),
  requirements: PROCEDURES.flatMap((procedure) => procedure.requirements.map((requirement) => ({ procedureId: procedure.id, procedureTitle: procedure.title, ...requirement }))),
  advisors: GESTORES_VERIFICADOS,
  reminders: EXPIRATION_REMINDERS,
  activeProcedures: [],
  history: MOCK_HISTORY,
};

await writeFile(process.argv[2], JSON.stringify(data, null, 2), 'utf8');
