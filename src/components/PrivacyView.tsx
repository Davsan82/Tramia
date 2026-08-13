import React from 'react';
import { ArrowLeft, ArrowUp, ChevronRight, Cookie, Database, Eye, FileLock2, Mail, Scale, ShieldCheck, UserRoundCheck } from 'lucide-react';
import TramIALogo from './TramIALogo';

interface PrivacyViewProps { onBack: () => void; }

const sections = [
  { id: 'responsable', label: '1. Responsable' },
  { id: 'datos', label: '2. Datos que tratamos' },
  { id: 'finalidades', label: '3. Para qué los usamos' },
  { id: 'proveedores', label: '4. Proveedores y transferencias' },
  { id: 'seguridad', label: '5. Seguridad y conservación' },
  { id: 'derechos', label: '6. Tus derechos' },
  { id: 'cookies', label: '7. Cookies y analítica' },
  { id: 'cambios', label: '8. Cambios y contacto' },
];

export default function PrivacyView({ onBack }: PrivacyViewProps) {
  return (
    <div className="min-h-screen bg-[#f7faff] text-slate-950" id="privacy-top">
      <header className="relative overflow-hidden bg-[linear-gradient(135deg,#071a3d_0%,#0e48aa_62%,#12a7cd_100%)] text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[24px_24px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-7 px-4 py-9 sm:px-6 sm:py-12 md:grid-cols-[1fr_250px] lg:px-8">
          <div>
            <button onClick={onBack} className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold backdrop-blur transition hover:bg-white/20"><ArrowLeft size={16} /> Regresar al inicio</button>
            <div className="mb-5"><TramIALogo iconSize={34} textSize="text-2xl" variant="dark" onClick={onBack} className="w-fit" /></div>
            <p className="text-sm font-black uppercase tracking-[.16em] text-cyan-200">Privacidad desde el diseño</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Política de Privacidad</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base">Te explicamos en lenguaje claro qué datos necesita TramIA, para qué los utiliza y cómo puedes ejercer control sobre ellos.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Versión 0.1</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Actualizada: 12 de agosto de 2026</span></div>
          </div>
          <img src="/assets/mascot/tramia-bot-reading.png" alt="TramIA revisa la política de privacidad" className="mx-auto hidden max-h-60 object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.25)] md:block" />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Contenido de la política" className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <p className="px-2 text-xs font-black uppercase tracking-[.14em] text-blue-600">En esta página</p>
            <ul className="mt-3 space-y-1">{sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">{section.label}<ChevronRight size={15} /></a></li>)}</ul>
          </nav>
        </aside>

        <article className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm leading-6 text-slate-700"><strong className="text-slate-950">Resumen rápido:</strong> TramIA utiliza tus datos para crear y proteger tu cuenta, organizar tus trámites, validar información cuando tú lo solicitas y brindarte soporte. No vendemos tus datos ni almacenamos contraseñas de entidades públicas, Clave SOL, PAN o CVV.</div>
          <PolicySection id="responsable" icon={Scale} title="1. Responsable y alcance"><p>Esta política describe el tratamiento realizado por <strong>TramIA</strong> en su sitio web y servicios asociados. Antes del lanzamiento comercial se completarán la razón social, RUC, domicilio y datos de inscripción del banco de datos personales.</p><p>El tratamiento se regirá por la Ley N.° 29733, Ley de Protección de Datos Personales, su Reglamento y demás normas aplicables en el Perú.</p></PolicySection>
          <PolicySection id="datos" icon={Database} title="2. Datos que tratamos"><ul><li><strong>Cuenta:</strong> nickname, correo, celular, contraseña protegida mediante hash y estado de verificación.</li><li><strong>Identidad y perfil:</strong> DNI cifrado, últimos cuatro dígitos, nombres, fecha de nacimiento, sexo y dirección cuando corresponda.</li><li><strong>Trámites:</strong> rutas, pasos, formularios, fechas, alertas, documentos y comprobantes que decidas adjuntar.</li><li><strong>Soporte y seguridad:</strong> sesiones, fecha de acceso, dirección IP aproximada, navegador y registros técnicos.</li><li><strong>Pagos:</strong> estado, monto y referencia de la operación. TramIA no almacena el número completo de tarjeta ni CVV.</li></ul></PolicySection>
          <PolicySection id="finalidades" icon={UserRoundCheck} title="3. Para qué utilizamos tus datos"><ul><li>Crear tu cuenta, autenticarte y recuperar el acceso.</li><li>Verificar tu correo sin impedir que ingreses mientras esté pendiente.</li><li>Organizar, guardar y dar seguimiento a tus trámites.</li><li>Validar datos o documentos cuando solicites esa función.</li><li>Enviar alertas, comunicaciones de servicio y soporte.</li><li>Prevenir fraude, abuso y accesos no autorizados.</li><li>Mejorar la experiencia mediante métricas agregadas y analítica configurada con controles de privacidad.</li></ul></PolicySection>
          <PolicySection id="proveedores" icon={Eye} title="4. Proveedores y transferencias"><p>Podremos utilizar proveedores que procesan información siguiendo nuestras instrucciones: Neon para base de datos, Netlify para alojamiento y funciones, Netlify Blobs u otro almacenamiento de objetos, Gmail/SMTP para correos, Google Analytics para medición y PeruDevs para consultas de identidad solicitadas por el usuario.</p><p>Cuando un proveedor procese datos fuera del Perú, aplicaremos las medidas contractuales y de seguridad correspondientes. No compartiremos información con asesores salvo que el trámite, tu solicitud y la asignación autorizada lo requieran.</p></PolicySection>
          <PolicySection id="seguridad" icon={FileLock2} title="5. Seguridad y conservación"><p>Aplicamos cifrado para datos sensibles, contraseñas derivadas, sesiones en cookies HttpOnly, accesos restringidos, registros de auditoría y separación entre secretos del servidor y navegador.</p><p>Conservaremos la información mientras tu cuenta esté activa, sea necesaria para prestarte el servicio o exista una obligación legal. Luego la eliminaremos o anonimizaremos de manera segura. Los plazos específicos se detallarán antes del lanzamiento comercial.</p></PolicySection>
          <PolicySection id="derechos" icon={ShieldCheck} title="6. Tus derechos"><p>Puedes ejercer tus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>, además de retirar tu consentimiento cuando corresponda. Podrás solicitar información, corregir datos inexactos, pedir su eliminación u oponerte a determinados usos.</p><p>Por ahora, las solicitudes pueden dirigirse a <a href="mailto:davsan82@gmail.com">davsan82@gmail.com</a>. Este correo será reemplazado por el canal corporativo definitivo. También puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</p></PolicySection>
          <PolicySection id="cookies" icon={Cookie} title="7. Cookies y analítica"><p>Utilizamos cookies estrictamente necesarias para mantener una sesión segura. La analítica ayuda a conocer, por ejemplo, qué páginas o funciones se utilizan, pero deberá configurarse respetando las preferencias de consentimiento aplicables.</p><p>No utilizaremos cookies publicitarias ni perfiles comerciales sin informarte y obtener el consentimiento requerido.</p></PolicySection>
          <PolicySection id="cambios" icon={Mail} title="8. Cambios y contacto"><p>Podemos actualizar esta política cuando cambien las funciones, proveedores o exigencias legales. Publicaremos la nueva fecha y, si el cambio es importante, te lo comunicaremos dentro de la aplicación o por correo.</p><p>Consultas de privacidad: <a href="mailto:davsan82@gmail.com">davsan82@gmail.com</a>.</p></PolicySection>
          <div className="flex justify-center pt-2"><a href="#privacy-top" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-50"><ArrowUp size={17} /> Volver arriba</a></div>
        </article>
      </main>
      <a href="#privacy-top" aria-label="Volver arriba" className="fixed bottom-5 right-5 z-30 grid size-11 place-items-center rounded-full bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,.35)] transition hover:-translate-y-1 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ArrowUp size={19} /></a>
    </div>
  );
}

function PolicySection({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={20} /></div><h2 className="text-lg font-black tracking-tight sm:text-xl">{title}</h2></div><div className="space-y-3 text-[13px] leading-6 text-slate-600 [&_a]:font-bold [&_a]:text-blue-700 [&_a]:underline [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div></section>;
}
