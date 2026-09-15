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

5. **4 vulnerabilidades moderadas y 1 alta en dependencias (§10, SCA).** `npm audit` encontró
   `qs`/`express`/`body-parser` desactualizados y `js-yaml` (transitiva de una dependencia de
   desarrollo) con un hallazgo alto. Corregido con `npm audit fix` — 0 vulnerabilidades después.

## Suite de pruebas (§9) — ya no es un pendiente

Se agregó Jest + Supertest, corriendo contra una base de datos local dedicada (`tip-it-test`, el
mismo mongod embebido en `backend/.mongo/`, nunca la real). 28 pruebas, en cuatro archivos:

- `tests/unit/fee.test.js` — la regla de negocio de la comisión (6% + $4 MXN) y sus casos límite.
- `tests/integration/auth.test.js` — validación de entradas malformadas (400, no 500), duplicados,
  y que el login no revele si un correo existe.
- `tests/integration/authorization.test.js` — **la prueba obligatoria de §6**: el usuario A no
  puede leer las estadísticas del trabajador B (404, no 403), ni borrar su contacto; y que
  `registerWorker` no expone `stripeAccountId` ni otros campos internos.
- `tests/integration/tips.test.js` — reglas de negocio del cobro (trabajador inexistente, monto
  mínimo, onboarding incompleto, auto-propina) y la **idempotencia obligatoria de operaciones que
  mueven dinero**: `markTransactionSucceeded` llamado dos veces en paralelo solo acredita una vez.

Correr con `npm test` desde `backend/` (requiere `npm run mongo:start` primero, o el mongod del
CI). El rate limiting se desactiva automáticamente bajo `NODE_ENV=test` (`skip` en
`express-rate-limit`) para que la suite no dependa de correr por debajo de los límites de
producción.

**Lo que esta suite todavía no cubre** (para no sobrevender el alcance): pruebas de carga (k6),
integración real contra el sandbox de Stripe (aquí se mockea), y pruebas de UI/frontend.

## Pipeline de CI (§10) — ya no es un pendiente

`.github/workflows/ci.yml`, cinco jobs, cada uno bloquea el merge en su propio criterio:

| Job | Herramienta | Bloquea si |
|---|---|---|
| `test` | Jest, contra un `mongo:7` de servicio | cualquier prueba falla |
| `frontend-build` | `vite build` | el build falla |
| `secrets-scan` | gitleaks | cualquier coincidencia |
| `sast` | Semgrep (`--config auto`) | hallazgo alto o crítico |
| `dependency-scan` | Trivy (`scan-type: fs`) | CVE crítico o alto |

**Lo que este pipeline todavía no hace** (pendiente, no escondido): Checkov (no hay Terraform que
escanear todavía), DAST con OWASP ZAP contra staging, MobSF (no hay app móvil), y la generación de
SBOM por build — los cuatro dependen de infraestructura que este proyecto no tiene aún.

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

- [x] ~~Suite de pruebas automatizadas (§9)~~ — hecho, ver arriba.
- [x] ~~Pipeline de CI con SAST/SCA/secretos (§10)~~ — hecho, ver arriba (falta Checkov/DAST/MobSF/SBOM,
      cada uno bloqueado por infraestructura que aún no existe).
- [ ] **Migración de stack** a NestJS + TypeScript, PostgreSQL y Terraform — decisión de arquitectura
      grande, requiere su propio plan y ventana de trabajo, no aplicable a una app ya en producción
      sin planearlo aparte.
- [ ] **Proveedor de identidad gestionado** (§5) — el documento prohíbe autenticación propia; hoy
      TIP-IT tiene su propio login con bcrypt+JWT. Migrar a un proveedor (Auth0, Clerk, Firebase
      Auth) es un cambio de arquitectura real, más chico que la migración de stack pero no trivial.
- [ ] **Bóveda de secretos** (§7) — hoy los secretos viven como variables de entorno en Render/Vercel,
      no en una bóveda dedicada (Vault, AWS Secrets Manager).
- [ ] **Bitácora de seguridad estructurada** (§8) — hoy solo hay logs de acceso HTTP (`morgan`) y
      `console.error` puntuales; falta el catálogo de eventos de seguridad, el formato JSON de una
      línea con los seis campos de PCI 10.2.2, la redacción centralizada de campos prohibidos, y un
      destino centralizado de solo-agregar con retención de 12 meses (típicamente un servicio pagado).
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
