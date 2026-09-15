# ADR 0001 — Aplicación de "RV Mejores Prácticas Desarrollo.md" a TIP-IT

**Fecha:** 2026-09-15
**Estado:** Aceptado (parcial, con pendientes declarados)

## Contexto

Se recibió un documento normativo de seguridad (`RV Mejores Practicas Desarrollo.md`) que define
reglas de ingeniería basadas en OWASP ASVS 5.0, MASVS 2.1 y PCI DSS 4.0.1. El documento especifica
un stack canónico (NestJS + TypeScript, PostgreSQL, Terraform, React Native + Expo) distinto al
stack real de TIP-IT (Express + JavaScript, MongoDB, React + Vite, Vercel/Render sin IaC).

TIP-IT ya está en producción, procesando pagos reales de un piloto activo. Reescribir el stack para
cumplir la Regla #1 del documento al pie de la letra (framework, base de datos e infraestructura)
es una migración de varias semanas con riesgo real de romper la app para usuarios reales — no algo
para decidir u ejecutar de golpe.

## Decisión

Se aplican de inmediato las reglas del documento que **no dependen del framework, la base de datos
ni la infraestructura** — es decir, los principios de seguridad en sí (autorización por recurso,
validación de entrada, manejo de secretos, JWT, DTOs de salida). La migración de stack (NestJS,
PostgreSQL, Terraform, IaC) queda como pendiente declarado (ver §Pendientes), no como violación
silenciosa.

## Qué ya cumplía TIP-IT (sin cambios)

- **§2.1 Sin secretos en el código.** Todo secreto vive en variables de entorno (`.env`,
  gitignorado, nunca commiteado). Verificado en esta revisión.
- **§2.2 Consultas parametrizadas.** Mongoose se usa con queries basadas en objetos en todo el
  código; no hay concatenación de strings ni `$where` con entrada de usuario.
- **§2.3 / §4 Validación de entrada en servidor.** `express-validator` ya está integrado en las
  rutas que mutan estado (`tips/create-intent`, `tips/confirm`, `workers/register`,
  `workers/profile`, `users/profile`, `auth/register`, `auth/login`, `auth/guest`,
  `contacts/`), con tipo, longitud, formato y lista de permitidos explícita.
- **§2.7 TLS.** Sin `rejectUnauthorized: false` ni `NODE_TLS_REJECT_UNAUTHORIZED` en ningún punto
  del código.
- **§4 Sin `eval`/`exec`/deserialización insegura.** No se encontró ningún uso.
- **§3 Frontera PCI.** El PAN nunca toca este backend — Stripe Elements/PaymentElement captura la
  tarjeta directamente en el navegador del cliente; el servidor solo maneja `paymentIntentId`,
  montos y el `stripeAccountId` de la cuenta conectada. Esto ya cumple el modelo SAQ-A del §1/§3
  sin cambio adicional.
- **Webhooks de Stripe.** La firma se verifica con `stripe.webhooks.constructEvent` antes de
  procesar cualquier evento; no se registra el payload completo en logs.
- **Rate limiting.** Ya existe en login/registro/guest/propinas vía `express-rate-limit`.
- **`express-mongo-sanitize` + `helmet`** ya montados globalmente en `app.js`.

## Qué se corrigió en esta revisión

1. **`workers/:id/stats` confirmaba existencia de recursos ajenos (§6).** Regresaba `403` cuando el
   `id` pertenecía a otro trabajador, lo que confirma al llamante que ese id existe. Ahora regresa
   `404` en ambos casos (no existe / no es tuyo), verificando la propiedad antes de la consulta.
   → `backend/src/controllers/workerController.js`

2. **JWT sin algoritmo fijado (§5).** `jwt.verify()` no restringía explícitamente el algoritmo
   aceptado. Se fijó `algorithms: ['HS256']` en `protect` y `optionalAuth`, y `algorithm: 'HS256'`
   al firmar. Con un secreto simétrico único no había una confusión de algoritmo explotable hoy,
   pero es el control que el documento pide por nombre y es defensa en profundidad barata.
   → `backend/src/middleware/auth.js`, `backend/src/utils/generateToken.js`

3. **Documento crudo de Mongo expuesto en dos respuestas (§7).** `registerWorker` y
   `updateWorkerProfile` regresaban el `Worker` completo, incluyendo `stripeAccountId` y campos
   internos (`ratingSum`, `__v`, referencias). Se introdujo `toWorkerDTO()` con lista explícita de
   campos de salida, igual al patrón que ya usaban `getByUsername`/`getStats`.
   → `backend/src/controllers/workerController.js`

4. **Campo `document` (INE/pasaporte) sin validar ni acotar (§4, §7).** Dato personal sensible tipo
   KYC, sin límite de longitud ni formato en la ruta, y sin `maxlength` en el esquema. Se agregó
   validación (máx. 30 caracteres, alfanumérico) en la ruta y en el modelo.
   → `backend/src/routes/userRoutes.js`, `backend/src/models/User.js`

## Excepción documentada (no corregida a propósito)

**`tips/confirm` autoriza por posesión del `paymentIntentId`, no por identidad de usuario cuando
la propina es anónima.** El documento exige que el dueño del recurso se tome siempre del contexto
autenticado (§6), pero el checkout anónimo es un requisito de producto explícito (sin registro
antes de pagar). El `paymentIntentId` de Stripe tiene entropía suficiente para no ser adivinable, y
solo se entrega al navegador que hizo el pago vía `client_secret` — mismo modelo de confianza que
usa el propio Stripe. Se documenta aquí como excepción con los seis campos que pide §13:

- **Regla de la que se excepciona:** §6, "el identificador del dueño jamás se toma del cuerpo".
- **Razón:** requisito de producto (pago sin registro).
- **Riesgo aceptado:** alguien con el `paymentIntentId` de un pago ajeno podría fijar una
  calificación/reseña falsa en él. No puede mover dinero ni ver datos de tarjeta.
- **Mitigación compensatoria:** el `paymentIntentId` nunca se expone en URLs, logs ni analítica; el
  `markTransactionSucceeded` que sí mueve el estado de la transacción es idempotente y no puede
  duplicarse ni revertirse desde este endpoint.
- **Responsable:** Rodrigo Vargas Garduño.
- **Fecha de revisión:** si el volumen de la plataforma crece más allá del piloto, reevaluar.

## Pendientes declarados (no ejecutados en esta revisión)

Siguiendo el formato de §15 del propio documento — un pendiente declarado es gestión de riesgo, uno
omitido es un hallazgo:

- [ ] **Migración de stack** a NestJS + TypeScript, PostgreSQL y Terraform — decisión de arquitectura
      grande, requiere su propio plan y ventana de trabajo, no aplicable a una app ya en producción
      sin planearlo aparte.
- [ ] **Suite de pruebas automatizadas** (§9) — hoy no existe ninguna prueba automatizada en el
      repositorio, incluyendo las pruebas de autorización obligatorias del §6 (A no accede a B).
- [ ] **Bitácora de seguridad estructurada** (§8) — hoy solo hay logs de acceso HTTP (`morgan`) y
      `console.error` puntuales; falta el catálogo de eventos de seguridad, el formato JSON de una
      línea con los seis campos de PCI 10.2.2, y la redacción centralizada de campos prohibidos.
- [ ] **Pipeline de CI con SAST/SCA/secretos** (§10) — no hay GitHub Actions corriendo Semgrep,
      Trivy, gitleaks ni Checkov en este repositorio.
- [ ] **Clasificación formal de datos personales** (§7) — `document`, `email`, `phone` no tienen
      declarada su base legal ni plazo de retención (LFPDPPP).
- [ ] **MFA** para cualquier acceso administrativo — hoy el único "admin" es el endpoint
      key-gated de `/api/admin/stats`, sin MFA porque no hay panel de administración real todavía.
- [ ] **Cifrado en reposo del campo `document`** — hoy se guarda en texto plano en MongoDB (con
      límite de longitud ya aplicado). Cifrarlo a nivel de aplicación es un cambio más grande
      (gestión de llaves) que se deja pendiente en vez de improvisado.

## Nota aparte (no es un hallazgo de seguridad)

`GET /users/me` no regresa el campo `document` en `toPublicJSON()`, pero el formulario de perfil del
frontend (`Profile.jsx`) intenta precargarlo desde `user.document`. El resultado práctico es que el
campo siempre se ve vacío al reabrir el perfil, aunque ya se haya guardado. Es un bug funcional, no
de seguridad — de hecho, no exponerlo es el comportamiento más seguro por defecto — así que se deja
señalado para quien decida si se corrige exponiéndolo explícitamente.
