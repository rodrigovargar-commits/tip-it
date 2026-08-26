import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="page-shell pb-16">
      <Link to="/" className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Aviso de privacidad</h1>
      <p className="mt-1 text-sm text-slate-500">Última actualización: agosto de 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-slate-100">1. Quiénes somos</h2>
          <p className="mt-2">
            TIP-IT es una plataforma para enviar y recibir pagos entre personas (propinas y
            pagos directos). Este aviso explica qué datos recopilamos, para qué los usamos y qué
            derechos tienes sobre ellos, conforme a la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares (México).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">2. Qué datos recopilamos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Nombre y teléfono (obligatorios, tanto para cuentas completas como de invitado).</li>
            <li>Email y contraseña (obligatorios solo para cuentas completas o de trabajador).</li>
            <li>Foto de perfil, si decides subir una.</li>
            <li>
              Documento de identidad (KYC), si eres trabajador y lo agregas para verificación.
            </li>
            <li>
              Historial de transacciones: montos, fechas, calificaciones y reseñas que escribas o
              recibas.
            </li>
            <li>
              Datos de pago: TIP-IT nunca almacena el número completo de tu tarjeta. El
              procesamiento de pagos lo hace Stripe, un proveedor certificado PCI-DSS.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">3. Para qué usamos tus datos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Procesar los pagos que envías o recibes.</li>
            <li>Identificarte en la app y mostrar tu perfil público si eres trabajador.</li>
            <li>Generar tu código QR único para recibir pagos.</li>
            <li>Enviarte confirmaciones relacionadas con tus transacciones.</li>
            <li>Cumplir obligaciones legales y de prevención de fraude.</li>
          </ul>
          <p className="mt-2">No vendemos ni rentamos tus datos personales a terceros.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">4. Con quién compartimos datos</h2>
          <p className="mt-2">
            Compartimos la información estrictamente necesaria con proveedores que hacen posible
            el servicio:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Stripe</strong> — procesamiento de pagos y verificación de identidad de
              trabajadores (KYC) para cumplir regulaciones financieras.
            </li>
            <li>
              <strong>MongoDB Atlas</strong> — almacenamiento de la base de datos.
            </li>
            <li>
              <strong>Render y Vercel</strong> — infraestructura donde corre la aplicación.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">
            5. Cuentas de invitado (pago rápido)
          </h2>
          <p className="mt-2">
            Si envías un pago sin crear una cuenta completa, guardamos tu nombre y teléfono para
            reconocerte la próxima vez y asociar tu historial de pagos. Estas cuentas no tienen
            contraseña y no pueden recibir pagos — solo enviarlos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">6. Tus derechos (ARCO)</h2>
          <p className="mt-2">
            Puedes solicitar en cualquier momento el Acceso, Rectificación, Cancelación u
            Oposición al tratamiento de tus datos personales, así como pedir que eliminemos tu
            cuenta. Escríbenos a{' '}
            <span className="font-semibold text-slate-100">55 8007 5613</span> para ejercer estos
            derechos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">7. Seguridad</h2>
          <p className="mt-2">
            Tu contraseña se guarda cifrada (nunca en texto plano) y las conexiones a la app usan
            HTTPS. Los datos de tarjeta los maneja directamente Stripe; nuestros servidores nunca
            los reciben ni almacenan.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">8. Cambios a este aviso</h2>
          <p className="mt-2">
            Podemos actualizar este aviso conforme evoluciona la app. Si hay cambios importantes,
            te lo haremos saber dentro de la aplicación.
          </p>
        </section>
      </div>
    </div>
  );
}
