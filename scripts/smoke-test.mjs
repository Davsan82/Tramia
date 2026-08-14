// 127.0.0.1 evita que Windows resuelva localhost hacia otro listener IPv6.
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
const checks=[['/api/health',[200]],['/api/openapi.json',[200]],['/api/v1/procedures',[200]],['/api/v1/public/settings',[200]],['/api/v1/payment-methods',[401]],['/api/v1/payments/history',[401]],['/api/v1/advisor/profile',[401,403]],['/api/v1/admin/payments',[401,403]],['/api/v1/notifications',[401]]];
let failed=false;
for(const[path,expected]of checks){try{const response=await fetch(base+path);const ok=expected.includes(response.status);console.log(`${ok?'✓':'✗'} ${path} -> ${response.status}`);if(!ok)failed=true}catch(error){console.error(`✗ ${path}: ${error.message}`);failed=true}}
if(failed)process.exit(1);
