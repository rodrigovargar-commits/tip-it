import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BUSINESS_TERMS_VERSION } from '../utils/businessTypes.js';

// Terms a business owner accepts when creating a business. They complement the general terms
// (/terminos) and the privacy notice (/privacidad). The server stores which version was accepted.
const H = 'text-base font-semibold text-slate-100';

export default function BusinessTerms() {
  return (
    <div className="page-shell">
      <Link to="/" className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Términos y condiciones para negocios</h1>
      <p className="mt-1 text-sm text-slate-500">Versión del {BUSINESS_TERMS_VERSION}</p>
      <p className="mt-3 text-sm text-slate-400">
        Estos términos se suman a los{' '}
        <Link to="/terminos" className="font-semibold text-brand-400">Términos y condiciones generales</Link> de TIP-IT. Si algo es distinto para negocios, aplica lo de esta página.
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className={H}>1. Qué es el perfil de negocio</h2>
          <p className="mt-2">
            Es una herramienta para que un negocio (hotel, club, estacionamiento, farmacia, catering, evento, etc.) reúna a las personas que reciben propinas
            en su equipo, con un código, y vea cuántas propinas, estrellas y reseñas tiene cada una. Es gratis para el negocio. TIP-IT no es empleador de tu
            gente ni parte de la relación entre tu negocio y sus colaboradores.
          </p>
        </section>

        <section>
          <h2 className={H}>2. Quién puede crearlo</h2>
          <p className="mt-2">
            Puede crear un negocio una persona mayor de edad con cuenta completa en TIP-IT que tenga la facultad de hablar en nombre del negocio. Cada cuenta
            puede crear un solo negocio. Eres responsable de que los datos que captures (nombre y tipo de negocio) sean verdaderos.
          </p>
        </section>

        <section>
          <h2 className={H}>3. Nombre e imagen de tu negocio</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Declaras que eres titular de la imagen que subes (logo o foto) o que tienes permiso para usarla.</li>
            <li>La imagen y el nombre de tu negocio se muestran en el perfil público y en el QR de cada colaborador mientras forme parte de tu equipo. Cuando sale, dejan de mostrarse.</li>
            <li>No puedes subir contenido ilegal, ofensivo, engañoso ni que suplante a otra marca. TIP-IT puede quitar la imagen o el nombre si incumplen esto.</li>
            <li>Puedes cambiar o quitar la imagen cuando quieras desde tu portal.</li>
          </ul>
        </section>

        <section>
          <h2 className={H}>4. Tu equipo</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Cada persona se une por su cuenta, con tu código y aceptando que el negocio vea sus datos descritos abajo. Nadie se agrega sin su consentimiento.</li>
            <li>Tu negocio solo ve el número de propinas, las estrellas y las reseñas, y únicamente desde el día en que cada persona se unió. Nunca ve el monto de sus pagos ni sus datos bancarios.</li>
            <li>Cada colaborador puede salirse del equipo cuando quiera. Tú también puedes quitar a una persona de tu equipo.</li>
            <li>Te comprometes a usar esa información solo para conocer y reconocer el trabajo de tu gente, no para discriminar ni para exponerla públicamente.</li>
          </ul>
        </section>

        <section>
          <h2 className={H}>5. El dinero</h2>
          <p className="mt-2">
            Cada persona recibe su propina directo en su cuenta bancaria a través de Stripe. TIP-IT y tu negocio no retienen ni reparten las propinas dentro de la
            plataforma. Lo que ocurra entre tu negocio y tu gente fuera de TIP-IT (por ejemplo, acuerdos de reparto) es responsabilidad de tu negocio y de la
            ley laboral aplicable. La comisión de TIP-IT por cada pago es la que se explica en los términos generales.
          </p>
        </section>

        <section>
          <h2 className={H}>6. Datos personales</h2>
          <p className="mt-2">
            El tratamiento de datos se rige por el{' '}
            <Link to="/privacidad" className="font-semibold text-brand-400">Aviso de privacidad</Link>. Si tu negocio recibe información de sus colaboradores, la usará
            de forma confidencial y solo para lo descrito en estos términos.
          </p>
        </section>

        <section>
          <h2 className={H}>7. Uso adecuado y suspensión</h2>
          <p className="mt-2">
            No puedes usar el perfil de negocio para presionar, engañar o cobrar indebidamente a tu gente, ni para actividades ilegales. TIP-IT puede suspender o
            cerrar un negocio que incumpla estos términos.
          </p>
        </section>

        <section>
          <h2 className={H}>8. Cambios</h2>
          <p className="mt-2">
            Podemos actualizar estos términos. Al crear tu negocio guardamos la versión y la fecha en que los aceptaste. Si hay cambios importantes, te lo
            avisaremos en tu portal.
          </p>
        </section>

        <section>
          <h2 className={H}>9. Contacto y ley aplicable</h2>
          <p className="mt-2">
            Para dudas escríbenos o llámanos al <span className="font-semibold text-slate-100">55 8007 5613</span>. Estos términos se rigen por las leyes de México.
          </p>
        </section>
      </div>
    </div>
  );
}
