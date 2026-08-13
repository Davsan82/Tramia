const base=process.env.SMOKE_BASE_URL||'http://localhost:3000';
const checks=[['/api/health',[200]],['/api/openapi.json',[200]],['/api/v1/procedures',[200]],['/api/v1/notifications',[401]]];
let failed=false;
for(const[path,expected]of checks){try{const response=await fetch(base+path);const ok=expected.includes(response.status);console.log(`${ok?'✓':'✗'} ${path} -> ${response.status}`);if(!ok)failed=true}catch(error){console.error(`✗ ${path}: ${error.message}`);failed=true}}
if(failed)process.exit(1);
