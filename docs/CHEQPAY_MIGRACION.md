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

## 5. Preguntas para Cheqpay (antes de programar la parte de dinero)

1. En el modelo agregador, ¿el dinero se liquida **directo a la CLABE de cada trabajador** o llega primero a TIP-IT y TIP-IT lo dispersa? (Si pasa por TIP-IT, hay implicaciones regulatorias.)
2. ¿Los subcomercios se dan de alta solo por el formulario o también por API? ¿Qué `x-merchant-id` usamos por trabajador?
3. ¿Cómo se cobra la comisión de TIP-IT sobre cada propina (split automático, o se factura aparte)?
4. ¿Cuáles son las tasas exactas: porcentaje, cuota fija por transacción y plazo de liquidación?
5. ¿Soportan Apple Pay y Google Pay? Con Stripe hoy son la forma más rápida de dar propina.
6. ¿Quién responde por contracargos y fraude: Cheqpay, TIP-IT o el trabajador?
7. ¿Hay un monto mínimo por cobro? Nuestras propinas son de $20 a $100.
8. ¿Qué papeles de impuestos se piden a trabajadores sin RFC y quién hace las retenciones, si aplican?
9. ¿Existe salida de dinero (retiro) y saldo consultable por API para el panel del trabajador?
10. Credenciales de sandbox y la especificación OpenAPI completa (`openapi.json`) para subcomercios y pagos.

## 6. Propuesta de ajustes al formulario de alta

No envié ni llené el formulario. Para respaldar que se parametrice para el giro de apoyo a servicios y para personas físicas:

- **Sitio web:** quitarlo; ninguno de nuestros trabajadores tiene.
- **RFC:** opcional (pueden no estar inscritos), confirmando con Cheqpay las consecuencias fiscales.
- **Giros:** lista corta para personas físicas, por ejemplo: servicios personales (barbería, estilismo), música y espectáculos, alimentos y puestos, servicios a domicilio y otros.
- **Datos que sí conviene pedir:** nombre completo, CURP, INE (frente y reverso), CLABE a su nombre y comprobante de domicilio sencillo.
- **No aplica para personas físicas:** acta constitutiva, poderes, representante legal y datos de empresa.
