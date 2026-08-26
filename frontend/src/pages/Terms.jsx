import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="page-shell pb-16">
      <Link to="/" className="flex items-center gap-1 text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Términos y condiciones</h1>
      <p className="mt-1 text-sm text-slate-500">Última actualización: agosto de 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-slate-100">1. Qué es TIP-IT</h2>
          <p className="mt-2">
            TIP-IT es una plataforma que permite enviar y recibir pagos entre personas —
            principalmente propinas — usando un código QR único por trabajador. El procesamiento
            de pagos lo realiza Stripe; TIP-IT actúa como intermediario tecnológico y cobra una
            comisión por cada transacción exitosa.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">2. Cuentas</h2>
          <p className="mt-2">
            Existen dos tipos de cuenta:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Cuenta de invitado</strong>: creada automáticamente con nombre y teléfono al
              enviar un pago. Solo puede enviar pagos, nunca recibirlos.
            </li>
            <li>
              <strong>Cuenta completa</strong>: protegida con contraseña, requerida para recibir
              pagos como trabajador. Eres responsable de mantener tu contraseña segura y de toda
              actividad que ocurra en tu cuenta.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">3. Comisión de la plataforma</h2>
          <p className="mt-2">
            TIP-IT cobra una comisión (porcentaje + tarifa fija por transacción) sobre cada pago
            procesado. Quien envía el pago puede elegir cubrir esta comisión para que el
            trabajador reciba el monto completo, o dejar que se descuente del monto enviado. La
            comisión vigente se muestra siempre antes de confirmar el pago.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">4. Trabajadores y verificación</h2>
          <p className="mt-2">
            Para recibir pagos, debes completar el proceso de verificación de identidad de Stripe
            Connect (KYC), requerido por regulación financiera. TIP-IT no tiene acceso a tus
            fondos: Stripe transfiere el dinero directamente a tu cuenta conectada.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">5. Pagos y reembolsos</h2>
          <p className="mt-2">
            Los pagos enviados a través de TIP-IT son, por su naturaleza de propina o pago
            directo, finales y no reembolsables salvo error técnico comprobable (por ejemplo, un
            cargo duplicado). Si crees que hubo un error, contáctanos al{' '}
            <span className="font-semibold text-slate-100">55 8007 5613</span>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">6. Uso aceptable</h2>
          <p className="mt-2">No está permitido usar TIP-IT para:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Actividades fraudulentas, lavado de dinero o financiamiento ilegal.</li>
            <li>Suplantar la identidad de otra persona o negocio.</li>
            <li>Cobrar por bienes o servicios prohibidos por la ley aplicable.</li>
          </ul>
          <p className="mt-2">
            TIP-IT puede suspender o cancelar cuentas que incumplan estos términos, y Stripe
            puede además aplicar sus propias restricciones conforme a sus políticas.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">7. Responsabilidad</h2>
          <p className="mt-2">
            TIP-IT es un intermediario tecnológico, no una institución bancaria. No garantizamos
            disponibilidad ininterrumpida del servicio. En la medida permitida por la ley, TIP-IT
            no es responsable por pérdidas indirectas derivadas del uso de la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">8. Cambios a estos términos</h2>
          <p className="mt-2">
            Podemos actualizar estos términos conforme evoluciona la app. El uso continuado de
            TIP-IT después de un cambio implica la aceptación de los términos actualizados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-100">9. Ley aplicable</h2>
          <p className="mt-2">
            Estos términos se rigen por las leyes de México. Para más información sobre el manejo
            de tus datos, consulta nuestro{' '}
            <Link to="/privacidad" className="font-semibold text-brand-400">
              Aviso de privacidad
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
