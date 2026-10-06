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

1. **Cuánto de la tasa (3.3% + $1.30) se queda TIP-IT:** la tasa ya incluye nuestra parte (confirmado por Rodrigo), así que falta saber el desglose: cuánto es costo de Cheqpay y cuánto es de TIP-IT, por porcentaje y por cuota fija.
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

La tasa de **3.3% + $1.30 ya incluye la parte de TIP-IT** (confirmado). Por lo tanto **desaparece la comisión adicional de 6% + $4**: el trabajador paga una sola tasa, y Cheqpay reparte esa tasa entre su costo y nuestra parte con el split.

| Propina | Tasa total (3.3% + $1.30) | Recibe el trabajador | Antes con Stripe (6% + $4) |
|---|---|---|---|
| $20 | $1.96 | **$18.04 (90.2%)** | $14.80 (74.0%) |
| $50 | $2.95 | **$47.05 (94.1%)** | $43.00 (86.0%) |
| $100 | $4.60 | **$95.40 (95.4%)** | $90.00 (90.0%) |

Si el cliente decide cubrir la comisión, el trabajador recibe el 100% de lo que quiso dar. En ese caso la tasa se calcula sobre el total cobrado (propina + comisión), así que el monto a cobrar es `(propina + 1.30) ÷ (1 − 0.033)` para que el trabajador reciba exactamente la propina.

**Lo que falta saber** es cuánto de esa tasa nos toca a nosotros. Si Cheqpay se queda con casi todo en las propinas chicas, el margen de TIP-IT en una propina de $20 sería de centavos; conviene pedirles el desglose antes de fijar precios y revisar si el modelo se sostiene con el volumen esperado.

Cambios que implica en el código cuando se integre: `PLATFORM_FEE_PERCENT` pasa a 3.3 y `PLATFORM_FEE_FIXED_CENTS` a 130, y el texto de "6% + $4" en las preguntas frecuentes, los términos y la landing se cambia a la nueva tasa.

## 8. Plan de trabajo

1. Mandar las preguntas de la sección 6 y pedir las credenciales de sandbox.
2. Con las credenciales: cliente de Cheqpay en el servidor, cobro con split y webhook firmado, con pruebas automáticas.
3. Capa de proveedor de pagos con `PAYMENT_PROVIDER=stripe|cheqpay` (Stripe sigue intacto).
4. Alta de trabajadores por API y pantalla de saldo y retiros.
5. Frontend: reemplazar el formulario de Stripe Elements por el SDK o la página alojada de Cheqpay, con Apple Pay y Google Pay.
6. Actualizar textos (aviso de privacidad, términos, preguntas frecuentes) cuando se decida pasar a producción.
7. Pruebas de punta a punta en sandbox y activar `PAYMENT_PROVIDER=cheqpay` solo con aprobación; se puede regresar a Stripe cambiando la variable.
