# Migración de pagos: de Stripe a Cheqpay

Última actualización: 12 de octubre de 2026. Rama de trabajo: `feat/cheqpay`.

## 1. Versión actual guardada (Stripe)

La app tal como funciona hoy con Stripe Connect **no se toca**:

| Qué | Dónde |
|---|---|
| Etiqueta de la versión estable | `v1.0-stripe` |
| Rama congelada | `stripe-stable` |
| Producción (Vercel y Render) | sigue desplegando `main`, que sigue en Stripe |
| Trabajo de Cheqpay | rama `feat/cheqpay` (no despliega a producción) |

Para volver a la versión con Stripe en cualquier momento: `git checkout v1.0-stripe`.
`main` solo recibe Cheqpay cuando esté probado en sandbox y aprobado.

## 2. Qué dice la documentación pública de Cheqpay

Fuente: https://docs.cheqpay.mx

- **Autenticación:** encabezado `x-api-key` (obligatorio) y `x-merchant-id` (opcional).
- **Sandbox:** `https://api.sandbox.cheqpay.mx/pos/v2/`.
- **Cobros:** `POST /v2/payment-orders` con `externalId` (evita cobros duplicados), `amount` en centavos y `currency`. Métodos: tarjeta, SPEI, PayCash y CIE Cash Net. 3D Secure 2.0.
- **Página de pago alojada:** `POST /lps/payment-links` con `redirectUrl` y `cancelUrl`; al terminar redirige con `cp_status` y `cp_invoice_id`. Evita el tema PCI.
- **Webhooks:** `payment.auth.pending|success|failed`, `payment.capture.success`, `payment.refund.pending|success`. Firma HMAC-SHA256 en `x-webhook-signature`; reintenta hasta 10 veces.
- **Reembolsos:** total o parcial.

**No aparece en la documentación pública:** el alta de usuarios por API, saldo, retiros, Apple Pay y Google Pay. En el panel sandbox (cuenta TIPIT) solo se ven los métodos Tarjeta y SPEI. Lo que falta se pregunta en la sección 6.

## 3. Qué hace hoy Stripe en la app y qué lo reemplazaría

| Hoy con Stripe | Con Cheqpay | Estado |
|---|---|---|
| Cobrar la propina (`paymentIntents`, cargo con destino al usuario) | `payment-orders` o `payment-links` | Documentado |
| Confirmar que se pagó (webhook de Stripe) | Webhook `payment.capture.success` con firma | Documentado |
| Alta del usuario (Connect Express, verificación de identidad) | Formulario de alta de Cheqpay (persona física). Los datos ya se piden en la app, en `/worker/cobros` | Hecho en la app; envío automático **por confirmar** |
| Que el dinero llegue al banco del usuario | Cheqpay liquida al siguiente día hábil todos los cobros del usuario, sin que haga nada | Confirmado |
| Comisión de TIP-IT | No hay split: se cobra una sola tasa (ver sección 7) | Confirmado |
| Saldo y retiro instantáneo del panel | No hace falta: la liquidación es automática | No aplica |
| Apple Pay y Google Pay | Cheqpay dice que sí se soportan; falta saber por dónde | **Por confirmar** |
| Formulario de pago dentro de la app (Stripe Elements) | Redirigir a la página alojada de Cheqpay | Cambio de diseño |

Código de la app que hay que tocar: `tipController`, `workerController`, `webhookController`, `markTransactionSucceeded`, `adminController` (conteos), modelos `Worker` y `Transaction`, y en el frontend `SendTip.jsx` y `WorkerDashboard.jsx`. Los textos que nombran a Stripe (aviso de privacidad, términos, preguntas frecuentes, posts) se cambian al final.

### Datos de alta que pide Cheqpay (persona física)

Formulario: https://cheqpay.fillout.com/t/cmBJhdbeFrus (primero pregunta si es persona física o moral).

| Campo | Obligatorio | De dónde sale en la app |
|---|---|---|
| Nombre completo | Sí | Nombre de la cuenta |
| RFC | No | Se pide en `/worker/cobros`; se guarda cifrado |
| Nacionalidad | Sí | Se pide en `/worker/cobros` (viene "Mexicana") |
| Teléfono | Sí | Teléfono de la cuenta |
| Correo | Sí | Correo de la cuenta |
| Giro del comercio | Sí | Se sugiere según la actividad (catálogo en `backend/src/utils/cheqpayGiro.js`) |
| Qué servicio, si el giro es "Otros servicios" | Solo en ese caso | Se pide en `/worker/cobros` |
| Aceptar términos, privacidad y declaración anticorrupción de Cheqpay | Sí | Casilla en `/worker/cobros` |

Giros de Cheqpay: Servicios profesionales, Barberías, Estéticas, Música, Espectáculos, Alimentos y puestos, Servicios a domicilio, Otros servicios.

## 4. Cómo lo vamos a hacer

1. **Capa de proveedor de pagos:** un solo punto de entrada (`crear cobro`, `consultar cobro`, `verificar webhook`) con dos implementaciones, Stripe y Cheqpay, elegidas con la variable `PAYMENT_PROVIDER`. Stripe queda intacto como opción.
2. **Cheqpay en sandbox:** cobro con página alojada, webhook firmado y pruebas automáticas.
3. **Alta de usuarios:** los datos ya se piden en la app (`/worker/cobros`); falta enviarlos a Cheqpay por API o por su formulario.
4. **Pruebas de punta a punta** en sandbox, con una propina de ejemplo.
5. **Producción:** activar `PAYMENT_PROVIDER=cheqpay` solo cuando todo lo anterior pase y Cheqpay apruebe el alta. Hay marcha atrás inmediata cambiando la variable.

## 5. Respuestas de Cheqpay (6 de octubre de 2026)

| Pregunta | Respuesta |
|---|---|
| ¿A dónde se liquida el dinero? | Modelo agregador: **directo a cada usuario**, al siguiente día hábil, sin que el usuario haga nada. TIP-IT no maneja los fondos. |
| ¿Alta de subcomercios? | Lo conveniente es **por API**, como hoy con Stripe. |
| ¿Comisión de TIP-IT? | **No hay split** (aclarado el 12 de octubre). Se cobra una sola tasa. |
| Tasa | **3.3% + $1.30 MXN por transacción** |
| Apple Pay y Google Pay | **Sí se soportan** |
| Contracargos y fraude | Los asume **Cheqpay** |
| Monto mínimo | **$20 MXN**. Se definirá un máximo según el servicio. |
| RFC y retenciones | Con el giro de agregador **no es necesario RFC** para personas físicas (sí para personas morales). Las tasas de descuento son deducibles. |
| Saldo y retiros | Disponibles por API; con la liquidación automática no hacen falta para el usuario |
| Credenciales y especificación | Se entregarán credenciales; la información por cliente se consulta por API. |

Lo que esto resuelve: no pasamos por la regulación de manejar fondos y Apple Pay y Google Pay se mantienen, aunque falta saber por dónde.

## 6. Lo que sigue sin saberse

Credenciales sandbox creadas el 12 de octubre (clave pública y privada). Las claves no se guardan en el repositorio: van en `backend/.env` y en las variables de Render (`CHEQPAY_PUBLIC_KEY`, `CHEQPAY_SECRET_KEY`).

Preguntas pendientes para Cheqpay (mensaje listo en `Preguntas_para_Cheqpay.txt`):

1. **Apple Pay y Google Pay:** ¿van en el SDK, en la página alojada o por otro camino? El panel solo muestra Tarjeta y SPEI.
2. **Unidad de `amount`:** el inicio rápido dice centavos (`10000` = $100) y la especificación dice pesos (`100.5`). Se confirma en sandbox.
3. **Webhooks:** eventos de alta de usuarios y de liquidación, y el formato exacto de la firma.
4. **Sandbox:** usuarios y tarjetas de prueba.
5. **Alta de usuarios:** si hay forma de enviar los datos por API (hoy es el formulario de Fillout) y cómo avisan cuando queda aprobado.
6. **`x-merchant-id`:** la especificación lo marca obligatorio en las órdenes de pago; confirmar si es el identificador de cada usuario.

## 7. Efecto en la comisión de TIP-IT

No hay split. El usuario paga una sola tasa, **3.3% + $1.30 por transacción**, y desaparece la comisión de 6% + $4 que se cobra hoy con Stripe.

| Propina | Tasa (3.3% + $1.30) | Recibe el usuario | Antes con Stripe (6% + $4) |
|---|---|---|---|
| $20 | $1.96 | **$18.04 (90.2%)** | $14.80 (74.0%) |
| $50 | $2.95 | **$47.05 (94.1%)** | $43.00 (86.0%) |
| $100 | $4.60 | **$95.40 (95.4%)** | $90.00 (90.0%) |

Si la persona que da la propina decide cubrir la comisión, el usuario recibe el 100% de lo que quiso dar. En ese caso la tasa se calcula sobre el total cobrado, así que el monto a cobrar es `(propina + 1.30) ÷ (1 − 0.033)`.

Al no haber split, TIP-IT no recibe parte de la tasa por esta vía. Cómo se financia el proyecto con este modelo es una decisión de negocio pendiente.

Cambios que implica en el código cuando se integre: `PLATFORM_FEE_PERCENT` pasa a 3.3 y `PLATFORM_FEE_FIXED_CENTS` a 130, y el texto de "6% + $4" en las preguntas frecuentes, los términos y la landing se cambia a la nueva tasa.

## 8. Plan de trabajo

1. Mandar las preguntas de la sección 6 a Cheqpay.
2. Con las claves ya creadas: cliente de Cheqpay en el servidor, cobro de prueba y webhook firmado, con pruebas automáticas.
3. Capa de proveedor de pagos con `PAYMENT_PROVIDER=stripe|cheqpay` (Stripe sigue intacto).
4. Envío de los datos de alta a Cheqpay (hoy se guardan en `/worker/cobros`) y estado de la solicitud en el panel del usuario.
5. Frontend: reemplazar el formulario de Stripe Elements por el SDK o la página alojada de Cheqpay, con Apple Pay y Google Pay.
6. Actualizar textos (aviso de privacidad, términos, preguntas frecuentes) cuando se decida pasar a producción.
7. Pruebas de punta a punta en sandbox y activar `PAYMENT_PROVIDER=cheqpay` solo con aprobación; se puede regresar a Stripe cambiando la variable.
