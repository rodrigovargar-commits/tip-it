# Migración de pagos: de Stripe a Cheqpay

Última actualización: 6 de octubre de 2026. Rama de trabajo: `feat/cheqpay`.

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

**No aparece en la documentación pública:** subcomercios, división de pagos (split), dispersión a los trabajadores, saldo, retiros, Apple Pay y Google Pay. Puede existir en un acuerdo privado con Cheqpay; hay que preguntarlo (sección 5).

## 3. Qué hace hoy Stripe en la app y qué lo reemplazaría

| Hoy con Stripe | Con Cheqpay | Estado |
|---|---|---|
| Cobrar la propina (`paymentIntents`, cargo con destino al trabajador) | `payment-orders` o `payment-links` | Documentado |
| Confirmar que se pagó (webhook de Stripe) | Webhook `payment.capture.success` con firma | Documentado |
| Alta del trabajador (Connect Express, verificación de identidad) | Formulario de alta de Cheqpay (Fillout) y `x-merchant-id` | **Por confirmar** |
| Que el dinero llegue directo al banco del trabajador | Liquidación a cada subcomercio | **Por confirmar** |
| Comisión de TIP-IT (6% + $4) | Cómo se cobra la parte de TIP-IT | **Por confirmar** |
| Saldo y retiro instantáneo del panel | — | No documentado |
| Apple Pay y Google Pay | — | No documentado |
| Formulario de pago dentro de la app (Stripe Elements) | Redirigir a la página alojada de Cheqpay | Cambio de diseño |

Código de la app que hay que tocar: `tipController`, `workerController`, `webhookController`, `markTransactionSucceeded`, `adminController` (conteos), modelos `Worker` y `Transaction`, y en el frontend `SendTip.jsx` y `WorkerDashboard.jsx`. Los textos que nombran a Stripe (aviso de privacidad, términos, preguntas frecuentes, posts) se cambian al final.

## 4. Cómo lo vamos a hacer

1. **Capa de proveedor de pagos:** un solo punto de entrada (`crear cobro`, `consultar cobro`, `verificar webhook`) con dos implementaciones, Stripe y Cheqpay, elegidas con la variable `PAYMENT_PROVIDER`. Stripe queda intacto como opción.
2. **Cheqpay en sandbox:** cobro con página alojada, webhook firmado y pruebas automáticas.
3. **Alta de trabajadores** por el formulario de Cheqpay (cuando confirmen el modelo agregador).
4. **Pruebas de punta a punta** en sandbox, con una propina de ejemplo.
5. **Producción:** activar `PAYMENT_PROVIDER=cheqpay` solo cuando todo lo anterior pase y Cheqpay apruebe el alta. Hay marcha atrás inmediata cambiando la variable.

## 5. Respuestas de Cheqpay (6 de octubre de 2026)

| Pregunta | Respuesta |
|---|---|
| ¿A dónde se liquida el dinero? | Modelo agregador: **directo a cada usuario (trabajador)**. TIP-IT no maneja los fondos. |
| ¿Alta de subcomercios? | Lo conveniente es **por API**, como hoy con Stripe. |
| ¿Comisión de TIP-IT? | **Split automático**. |
| Tasa | **3.3% + $1.30 MXN por transacción** |
| Apple Pay y Google Pay | **Sí se soportan** |
| Contracargos y fraude | Los asume **Cheqpay** |
| Monto mínimo | **$20 MXN**. Se definirá un máximo según el servicio. |
| RFC y retenciones | Con el giro de agregador **no es necesario RFC** para personas físicas (sí para personas morales). Las tasas de descuento son deducibles. |
| Saldo y retiros | **Disponibles por API** |
| Credenciales y especificación | Se entregarán credenciales; la información por cliente se consulta por API. |

Lo que esto resuelve: no pasamos por la regulación de manejar fondos, el alta se puede automatizar, y Apple Pay y Google Pay se mantienen.

## 6. Lo que sigue sin saberse (la especificación pública no lo trae)

La especificación pública (`orchestrator-openapi.json` y `link-product-openapi.json`) no incluye subcomercios, split, saldo ni retiros. Esos endpoints vendrán con las credenciales. Hay que pedir:

1. **Quién paga la tasa de Cheqpay (3.3% + $1.30):** ¿se descuenta al trabajador en su liquidación, o la absorbe TIP-IT? Define cuánto recibe el trabajador y cuánto debe ser nuestra comisión.
2. **Cómo se expresa el split** en la creación del cobro (campo y formato) y si es porcentaje, monto fijo o ambos.
3. **Alta de subcomercio por API:** endpoint, datos y documentos requeridos, estados de la verificación y cómo avisan cuando queda aprobado.
4. **`x-merchant-id` por trabajador:** la especificación lo marca obligatorio en las órdenes de pago; confirmar que es el identificador del subcomercio.
5. **Unidad de `amount`:** el inicio rápido dice centavos (`10000` = $100) y la especificación dice pesos (`100.5`). Se confirma en sandbox.
6. **Apple Pay y Google Pay:** ¿van en el SDK (`Cheqpay.Checkout`), en la página alojada, o por otro camino? La documentación pública no los menciona.
7. **Webhooks:** eventos de subcomercio (alta aprobada, liquidación) y el formato exacto de la firma.
8. **Retiros y saldo:** endpoints, y si hay retiro inmediato o solo liquidación programada.
9. **Plazo de liquidación** al trabajador.
10. **Sandbox:** llaves (`x-api-key`, llave pública `pk_`) y subcomercios de prueba.

## 7. Efecto en la comisión de TIP-IT

Hoy TIP-IT cobra **6% + $4** y con eso cubría el costo de Stripe. Con Cheqpay el costo baja a **3.3% + $1.30**, pero falta saber quién lo paga (pregunta 1). Ejemplo con una propina de $50, si la tasa de Cheqpay se descuenta al trabajador y TIP-IT mantiene 6% + $4:

| Concepto | Monto |
|---|---|
| Propina | $50.00 |
| Comisión de TIP-IT (6% + $4) | −$7.00 |
| Tasa de Cheqpay (3.3% + $1.30) | −$2.95 |
| Recibe el trabajador | **$40.05 (80%)** |

En propinas chicas la cuota fija pesa mucho: en una de $20 el trabajador recibiría **$12.84 (64%)**. Si la tasa la descuenta Cheqpay al trabajador, conviene **bajar la comisión de TIP-IT**, sobre todo la cuota fija, para que el trabajador se quede con más. Es una decisión de negocio pendiente.

## 8. Plan de trabajo

1. Mandar las preguntas de la sección 6 y pedir las credenciales de sandbox.
2. Con las credenciales: cliente de Cheqpay en el servidor, cobro con split y webhook firmado, con pruebas automáticas.
3. Capa de proveedor de pagos con `PAYMENT_PROVIDER=stripe|cheqpay` (Stripe sigue intacto).
4. Alta de trabajadores por API y pantalla de saldo y retiros.
5. Frontend: reemplazar el formulario de Stripe Elements por el SDK o la página alojada de Cheqpay, con Apple Pay y Google Pay.
6. Actualizar textos (aviso de privacidad, términos, preguntas frecuentes) cuando se decida pasar a producción.
7. Pruebas de punta a punta en sandbox y activar `PAYMENT_PROVIDER=cheqpay` solo con aprobación; se puede regresar a Stripe cambiando la variable.
