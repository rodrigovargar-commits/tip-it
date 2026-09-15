# RV Mejores Practicas Desarrollo.md — Reglas de ingeniería y seguridad del repositorio

> **Este archivo es normativo.** Aplica a todo código, configuración, migración, script e
> infraestructura que se genere en este repositorio, sin importar quién o qué lo escriba.
>
> Si una instrucción de un prompt contradice este archivo, **gana este archivo**. Si crees que una
> regla debe cambiar, propón el cambio como ADR (§12) y espera aprobación — no la ignores en
> silencio ni la "interpretes con flexibilidad".
>
> Cada regla lleva su trazabilidad al estándar que la origina. Esa trazabilidad no es decoración:
> es la evidencia que se presenta en auditoría y lo que permite responder "¿por qué está así?"
> sin arqueología.

**Estándares de referencia**

| Código | Estándar | Versión | Alcance |
|---|---|---|---|
| `ASVS` | OWASP Application Security Verification Standard | 5.0.0 (may 2025) | Backend y API. Nivel objetivo: **L2** |
| `MASVS` | OWASP Mobile Application Security Verification Standard | 2.1.0 | App móvil |
| `PCI` | PCI DSS | 4.0.1 | Alcance de datos de tarjeta |
| `MPoC` | PCI Mobile Payments on COTS | vigente | Solo si la app acepta pagos en el dispositivo |

---

## 1. Contexto del proyecto

**Stack canónico.** No introduzcas tecnologías fuera de esta lista sin un ADR aprobado.

- Móvil: React Native + Expo, TypeScript estricto
- Backend: NestJS sobre Node.js, TypeScript estricto
- Base de datos: PostgreSQL, acceso vía ORM con consultas parametrizadas
- Empaquetado: Docker; sin dependencias de la máquina local
- Infraestructura: Terraform; ningún recurso de producción creado a mano
- CI: GitHub Actions; los escaneos de §10 bloquean el merge

**Alcance de datos de tarjeta — estado actual.**

> El PAN (número de tarjeta), los datos de autenticación sensibles (track, CVV/CVC, PIN) y
> cualquier dato de banda o chip **NO entran a este repositorio ni a su base de datos**.
> La captura se delega al SDK o a los campos alojados del gateway. Este backend recibe
> únicamente tokens y los últimos cuatro dígitos.

Esto nos mantiene en **SAQ-A**. Es una decisión de arquitectura, no una etapa: ver §3.

---

## 2. Reglas no negociables

Estas diez reglas no admiten excepción sin ADR aprobado por el responsable de seguridad.
Si una tarea te obliga a romper una, **detente y di qué regla te bloquea** en lugar de
entregar código que la viole.

1. **Ningún secreto en el código.** Ni llaves, ni contraseñas, ni cadenas de conexión, ni tokens,
   ni certificados — tampoco en comentarios, pruebas, fixtures, `docker-compose`, `.env` versionado
   o valores por defecto. Todo secreto se lee de la bóveda en tiempo de ejecución.
   `ASVS V13` · `PCI 8.6.2`
2. **Toda consulta a base de datos es parametrizada.** Cero concatenación de cadenas SQL, cero
   interpolación de variables en SQL crudo. Si el ORM no alcanza, usa la API de parámetros del
   driver, nunca template strings. `ASVS V1.2` · `PCI 6.2.4`
3. **Toda entrada se valida en el servidor**, con esquema explícito, lista de permitidos y límite
   de tamaño. La validación del cliente es experiencia de usuario, no un control de seguridad.
   `ASVS V2`
4. **La autorización se verifica en el servidor en cada endpoint**, sobre el recurso concreto, no
   solo sobre el rol. Ver §6: es el punto ciego más frecuente. `ASVS V8`
5. **Nada de PII ni datos de tarjeta en bitácoras**, mensajes de error, trazas, métricas, nombres
   de archivo o URLs. Ver §8 para la lista de campos prohibidos. `ASVS V16` · `PCI 3.3, 10.x`
6. **Toda regla de negocio tiene prueba automatizada**, incluyendo sus casos de rechazo. Una regla
   sin prueba de que *rechaza* lo que debe rechazar no está implementada. `ASVS V2` · `PCI 6.2.3`
7. **Nunca se desactiva la verificación TLS.** Ni en desarrollo, ni "temporalmente", ni con
   `NODE_TLS_REJECT_UNAUTHORIZED=0`, ni con `rejectUnauthorized: false`. `ASVS V12` · `PCI 4.2.1`
8. **Nunca se implementa criptografía propia.** Se usan primitivas de la plataforma o de una
   biblioteca mantenida, con los parámetros de §7. `ASVS V11`
9. **Nunca hay PAN real en ambientes de desarrollo o prueba.** Los fixtures usan números de prueba
   del gateway. `PCI 6.5`
10. **No inventes dependencias, APIs ni números de requisito.** Si no estás seguro de que un
    paquete existe, de que un método tiene esa firma o de que un requisito dice lo que citas,
    dilo explícitamente en lugar de escribirlo. Un paquete alucinado es un vector de cadena de
    suministro real. `PCI 6.3.2`

---

## 3. La frontera PCI

Existe una frontera lógica en este sistema y es la decisión de arquitectura más costosa de
revertir. Respétala incluso cuando el código del otro lado aún no exista.

```
  FUERA DE ALCANCE PCI                        |   DENTRO DE ALCANCE (CDE)
                                              |
  App móvil  ──►  Backend propio              |   SDK / campos alojados del gateway
  (RN+Expo)       (usuarios, órdenes,         |            │
                   catálogo, PostgreSQL)       |            ▼
                        ▲                      |   Gateway MIT / Getnet
                        │                      |   (tokeniza y procesa)
                        └── solo recibe token ─┤
                                              |
                        el PAN nunca cruza hacia la izquierda
```

**Reglas derivadas, de cumplimiento obligatorio:**

- Ningún módulo de este repositorio recibe, transporta, registra ni persiste un PAN, track data,
  CVV/CVC o PIN. Si un requerimiento de producto lo implica, **se escala antes de escribir código**.
  `PCI 3.3.1`
- Si alguna vez se captura PAN, vive en un **servicio desplegable aparte**, con su propia red, su
  propio pipeline, su propio control de acceso y su propio repositorio. Nunca dentro de este
  monolito: el alcance PCI es contagioso por red y por proceso.
- El PAN se muestra enmascarado en cualquier pantalla o reporte: máximo primeros seis y últimos
  cuatro dígitos. Internamente solo usamos los **últimos cuatro** más el token. `PCI 3.4.1`
- Los scripts de cualquier pantalla de pago están inventariados, justificados y con integridad
  verificada; se detecta cualquier cambio no autorizado en sus encabezados.
  `PCI 6.4.3` · `PCI 11.6.1`
- No se versiona ni se documenta nada que facilite deducir el entorno del gateway (llaves,
  endpoints privados, formatos internos de mensaje).

---

## 4. Entradas, salidas y codificación

`ASVS V1` (Encoding and Sanitization) · `ASVS V2` (Validation and Business Logic) · `ASVS V5` (File Handling)

- Todo DTO se valida con esquema declarativo (`class-validator` + `ValidationPipe` con
  `whitelist: true` y `forbidNonWhitelisted: true`). Propiedad no declarada = rechazo, no
  ignorada en silencio.
- Valida tipo, rango, longitud máxima y formato. Lista de permitidos, nunca lista de prohibidos.
- La codificación se aplica **en el punto de salida** y según el contexto destino: HTML, atributo,
  URL, SQL, shell, JSON. No "sanitices" en la entrada creyendo que eso protege todas las salidas.
- Prohibido construir comandos del sistema operativo con entrada del usuario. Si es inevitable,
  usa la forma con arreglo de argumentos, nunca shell interpolado.
- Subida de archivos: tipo validado por contenido (no por extensión ni por `Content-Type`), tamaño
  limitado, nombre regenerado, almacenamiento fuera de la raíz web, sin ejecución posible.
- Prohibido `eval`, `new Function`, `child_process.exec` con entrada variable, y deserialización
  de datos no confiables a objetos con prototipo.

---

## 5. Autenticación, sesión y tokens

`ASVS V6, V7, V9, V10` · `PCI 8.2, 8.3, 8.4, 8.6`

- **No se implementa autenticación propia.** Se usa el proveedor de identidad gestionado
  configurado en el proyecto. Si una tarea pide "hacer el login", la respuesta es integrar al
  proveedor.
- Contraseñas (cuando las administra el proveedor): mínimo 12 caracteres, validadas contra listas
  de contraseñas comprometidas, sin reglas de composición arbitrarias, sin límite superior bajo.
  `PCI 8.3.6`
- **MFA obligatorio** para todo acceso administrativo, a consolas de nube, a la base de datos y a
  cualquier componente en alcance PCI. `PCI 8.4.2`
- Tokens de acceso de vida corta; refresco rotatorio con detección de reuso. El token se valida
  siempre: firma, emisor, audiencia, expiración y algoritmo esperado. **Nunca** aceptes el
  algoritmo que declara el propio token, ni `alg: none`. `ASVS V9`
- Cierre de sesión invalida del lado servidor, no solo borra el token del cliente.
- Prohibidas las cuentas compartidas y las cuentas de servicio con credenciales interactivas.
  Cada cuenta de aplicación tiene identidad propia y privilegio mínimo. `PCI 8.2.2, 8.6.1`
- Toda ruta es autenticada por defecto; el acceso anónimo se declara explícitamente endpoint por
  endpoint, con comentario que justifique por qué.

---

## 6. Autorización — el punto ciego

`ASVS V8` (Authorization)

Esta sección existe porque es donde el código generado por IA falla de forma sistemática y donde
un pentest de fintech encuentra sus hallazgos de severidad alta. Trátala como la sección más
importante del archivo.

**Reglas:**

- Verificar el rol **no es** autorizar. Hay que verificar que *este* sujeto tiene derecho sobre
  *este* recurso concreto.
- El identificador del dueño del recurso **jamás** se toma del cuerpo, de la query ni de un
  encabezado. Siempre del contexto de autenticación del servidor.
- Todo acceso por identificador (`GET /orders/:id`) filtra por dueño en la misma consulta, no
  después de traer el registro.
- En datos multi-cliente, el filtro por `tenant_id` se aplica en la capa de datos —idealmente con
  *Row Level Security* de PostgreSQL— no confiando en que cada consulta se acuerde de incluirlo.
- Prohibido exponer identificadores secuenciales adivinables en recursos sensibles: usa UUID v4 o
  identificadores opacos.
- La decisión de autorización se toma en el servidor. Ocultar un botón en la app **no** es un
  control.

**Patrón obligatorio:**

```ts
// ❌ PROHIBIDO — vulnerabilidad de referencia directa a objeto (IDOR)
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.orders.findById(id);           // cualquier usuario lee cualquier orden
}

// ❌ PROHIBIDO — el dueño lo dice el cliente
@Get(':id')
async findOne(@Param('id') id: string, @Query('userId') userId: string) {
  return this.orders.findByIdAndUser(id, userId);
}

// ✅ CORRECTO — dueño tomado del contexto autenticado, filtrado en la consulta
@Get(':id')
async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
  const order = await this.orders.findOne({
    where: { id, tenantId: user.tenantId, userId: user.sub },
  });
  if (!order) throw new NotFoundException();  // 404, no 403: no confirmes existencia
  return order;
}
```

**Prueba obligatoria por cada endpoint que devuelva o modifique datos de un sujeto:** el usuario A
no puede leer, modificar ni borrar el recurso del usuario B; y el cliente X no puede ver datos del
cliente Y. Sin esa prueba, el endpoint no se considera terminado (§9).

---

## 7. Datos, criptografía y base de datos

`ASVS V11, V12, V14` · `PCI 3.x, 4.x`

- **Clasifica antes de persistir.** Si un campo nuevo contiene dato personal, declara en el PR su
  clasificación, su base legal y su plazo de retención. Si no sabes por qué lo guardas, no lo
  guardes. `ASVS V14` · `MASVS-PRIVACY`
- En tránsito: TLS 1.2 como mínimo, 1.3 preferido; HSTS activo; sin cifrados obsoletos; sin
  contenido mixto. `PCI 4.2.1`
- En reposo: cifrado de disco y de base de datos habilitado; respaldos cifrados con llave distinta
  y restauración probada.
- Criptografía: AES-256-GCM para cifrado simétrico; Argon2id para derivación de contraseñas;
  aleatoriedad solo de `crypto.randomBytes` o del CSPRNG de la plataforma —nunca `Math.random()`
  para nada con consecuencia de seguridad. `ASVS V11`
- Llaves gestionadas por el KMS de la nube, con rotación declarada en Terraform. Nunca en el
  código, nunca en variables de ambiente planas.
- Base de datos: el usuario de la aplicación **no** es dueño del esquema y no tiene `DDL`. Las
  migraciones corren con una credencial distinta, desde el pipeline, nunca desde un cliente SQL
  manual.
- Migraciones versionadas, reversibles y revisadas. Una migración destructiva requiere respaldo
  verificado previo y aprobación explícita en el PR.
- Prohibido `SELECT *` en código de producción y prohibido devolver la entidad completa en la
  respuesta HTTP: siempre DTO de salida explícito, para que un campo nuevo no se filtre por
  accidente.

---

## 8. Pistas de auditoría y bitácoras

`ASVS V16` (Security Logging and Error Handling) · `PCI 10.2, 10.3, 10.5, 10.6, 10.7`

### 8.1 Qué se registra

Todo evento relevante a seguridad genera un registro: autenticación exitosa y fallida, cambio de
contraseña o de MFA, creación y cambio de privilegios, decisión de autorización denegada, acceso a
datos sensibles, cambio de configuración, inicio y paro de bitácoras, y toda operación
administrativa.

### 8.2 Estructura obligatoria del registro

Cada entrada es **JSON de una línea** y contiene al menos estos campos, que son exactamente los
seis elementos que exige `PCI 10.2.2`:

```jsonc
{
  "ts": "2026-09-12T18:04:11.271Z",   // fecha y hora, UTC, ISO-8601, de fuente sincronizada (PCI 10.6)
  "event": "authz.denied",            // tipo de evento, de un catálogo cerrado
  "outcome": "failure",               // success | failure
  "actor_id": "usr_01J...",           // identidad del sujeto (nunca su correo ni su nombre)
  "source_ip": "203.0.113.7",         // origen del evento
  "target": "order:ord_01J...",       // recurso afectado, como tipo:id
  "tenant_id": "tnt_01J...",
  "trace_id": "4bf92f3577b34da6a...", // correlación entre servicios
  "reason": "owner_mismatch"          // código de un catálogo, nunca texto libre con datos
}
```

### 8.3 Campos prohibidos en bitácoras, trazas, métricas y mensajes de error

PAN, track data, CVV/CVC, PIN o PIN block, contraseñas, tokens de sesión o de API, llaves, cookies
completas, encabezados `Authorization`, cuerpos completos de petición o respuesta, correo
electrónico, teléfono, CURP, RFC, domicilio, datos biométricos, y cualquier campo clasificado como
personal en §7.

La redacción se aplica en el *logger*, centralizada, para que no dependa de que cada llamada se
acuerde:

```ts
// logger.ts — la lista de redacción es parte del contrato, no una sugerencia
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      '*.password', '*.pan', '*.cardNumber', '*.cvv', '*.cvc', '*.pin',
      '*.token', '*.accessToken', '*.refreshToken', '*.apiKey', '*.secret',
      '*.email', '*.phone', '*.curp', '*.rfc', '*.address',
    ],
    censor: '[REDACTED]',
    remove: false,
  },
  formatters: { level: (label) => ({ level: label }) },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

Cualquier `console.log` en código de producción es un defecto. El linter lo bloquea.

### 8.4 Protección y retención de la bitácora

- Se escribe a un destino centralizado de solo-agregar; el servicio de aplicación **no tiene
  permiso de borrar ni modificar** registros. `PCI 10.3.2, 10.3.3`
- Lectura restringida por necesidad de conocer. `PCI 10.3.1`
- Retención: **12 meses**, con los últimos **3 meses de consulta inmediata**. `PCI 10.5.1`
- Reloj sincronizado por NTP autenticado en todos los componentes. `PCI 10.6`
- Hay alerta automatizada ante la falla del propio sistema de bitácoras. Una bitácora que deja de
  escribir en silencio es peor que no tenerla. `PCI 10.7`
- La revisión de eventos de seguridad es **diaria y por mecanismo automatizado**, con reglas y
  correlación — no una lectura manual periódica. `PCI 10.4.1`

### 8.5 Errores hacia el cliente

El cliente recibe un código de error estable, un mensaje genérico y el `trace_id`. Nunca traza de
pila, nombre de tabla, consulta SQL, versión de componente ni ruta de archivo. `ASVS V16`

---

## 9. Pruebas — definición de terminado

`ASVS V2` · `PCI 6.2.3` · `PCI 11.4`

Una tarea no está terminada hasta que todo esto existe. No declares terminado sin ello.

- [ ] **Unitarias** de cada regla de negocio, incluyendo sus casos de rechazo y sus límites.
- [ ] **Autorización**: por cada endpoint con datos de sujeto, la prueba de que A no accede a B y
      que el cliente X no ve datos del cliente Y (§6).
- [ ] **Validación**: entradas malformadas, fuera de rango, con tipo incorrecto y con propiedades
      extra reciben `400`, no `500`.
- [ ] **Integración** del flujo completo contra el gateway en modo *sandbox*, con números de
      prueba — nunca con PAN real.
- [ ] **Idempotencia** de toda operación que mueva dinero o cambie estado irreversible, probada
      con reintento.
- [ ] **Carga** (k6) cuando la tarea toque una ruta crítica, contra un objetivo declarado de p95 y
      de TPS pico, verificando que al saturarse el sistema limita y degrada en lugar de caer.
- [ ] **Sin regresión de cobertura** en los módulos tocados.

Reglas sobre las pruebas mismas:

- Prohibido ajustar o desactivar una prueba para que pase. Si una prueba falla, se arregla el
  código o se corrige la especificación con justificación en el PR.
- Prohibido `skip`, `only` y `try/catch` vacíos en pruebas.
- Los fixtures no contienen datos reales de personas ni de tarjetas.

---

## 10. Pipeline — lo que bloquea el merge

`PCI 6.2.3.1, 6.3.1, 6.3.2, 6.3.3, 11.3`

| Control | Herramienta | Cuándo | Criterio de bloqueo |
|---|---|---|---|
| Análisis estático (SAST) | Semgrep, reglas OWASP | cada PR | cualquier hallazgo alto o crítico |
| Dependencias y contenedor (SCA) | Trivy + Dependabot | cada PR | CVE crítico o alto con parche disponible |
| Secretos | gitleaks | pre-commit y PR | cualquier coincidencia |
| Infraestructura como código | Checkov | cada PR | cualquier hallazgo alto |
| Tipos y estilo | `tsc --noEmit`, ESLint | cada PR | cualquier error |
| Pruebas | Jest / Vitest | cada PR | cualquier falla |
| SBOM | Trivy | cada build | se adjunta al artefacto, es evidencia de `PCI 6.3.2` |
| Dinámico (DAST) | OWASP ZAP | cada release, contra staging | hallazgo alto |
| Móvil | MobSF, calificado contra MASVS | cada release | hallazgo alto |
| Carga | k6 | cada release | incumplir el objetivo de p95 o TPS |

Parches de vulnerabilidades críticas: dentro de **un mes**. `PCI 6.3.3`

Prohibido `--no-verify`, `continue-on-error` en un paso de seguridad, y bajar el umbral de una
herramienta para que el pipeline pase.

---

## 11. App móvil

`MASVS 2.1` — las ocho categorías, como criterio de aceptación por historia

| Categoría | Lo que exige en este proyecto |
|---|---|
| `MASVS-STORAGE` | Nada sensible en `AsyncStorage`, archivos planos, bitácoras del dispositivo, respaldos ni capturas de pantalla. Credenciales y tokens solo en Keychain (iOS) o Keystore (Android), vía `expo-secure-store`. Deshabilitar respaldo de datos sensibles. |
| `MASVS-CRYPTO` | Primitivas de la plataforma. Ninguna llave embebida en el binario ni derivada de un valor fijo del código. |
| `MASVS-AUTH` | La app nunca decide autorización: solo refleja lo que el servidor autoriza. Biometría como desbloqueo local, nunca como única prueba de identidad ante el backend. |
| `MASVS-NETWORK` | TLS obligatorio, sin excepciones de desarrollo en el binario de producción. *Certificate pinning* con plan de rotación documentado. Sin tráfico en claro, ni a dominios internos. |
| `MASVS-PLATFORM` | `deep links` validados y con lista de permitidos; `WebView` sin JavaScript habilitado salvo necesidad justificada y sin puentes expuestos; permisos mínimos y pedidos en contexto; contenido sensible marcado como no capturable. |
| `MASVS-CODE` | Dependencias pinneadas y auditadas; sin código muerto de depuración; `__DEV__` y banderas de prueba imposibles de activar en producción; actualizaciones OTA firmadas y con canal separado por ambiente. |
| `MASVS-RESILIENCE` | Detección de *root* / *jailbreak* y de depurador, con respuesta definida; ofuscación del bundle; verificación de integridad del binario. Obligatorio si se llega a MPoC. |
| `MASVS-PRIVACY` | Minimización de datos; aviso de privacidad congruente con lo que realmente se recolecta; ningún identificador publicitario ni SDK de analítica de terceros con acceso a datos de la transacción. |

---

## 12. Si el alcance crece: MPoC

Aplica **solo** si la app llega a aceptar pagos en el propio dispositivo (lectura sin contacto o
captura de PIN). No es un cuestionario autoevaluado: es **certificación de producto, evaluada por
laboratorio**, y cambia el diseño desde la raíz. Si una historia apunta en esa dirección, se
escala antes de escribir código.

Lo que implica, en familias de control:

- Servicio de **atestación y monitoreo** en línea: la app no procesa si no está atestiguada.
- **Ningún dato de cuenta ni PIN** persiste en el dispositivo, en ningún momento, ni cifrado.
- **RASP**: detección de manipulación, *root*, depurador, emulador y superposición de pantalla,
  con respuesta activa.
- **Canal seguro** dedicado al backend MPoC, con gestión de llaves certificada y ciclo de vida
  declarado.
- **Anti-ingeniería inversa**: ofuscación, verificación de integridad, protección del código
  crítico.
- **SDLC seguro documentado**, con SBOM, revisión de código y evidencia de pruebas — es decir,
  todo lo de este archivo, pero auditado por un tercero.

---

## 13. Cómo trabajar en este repositorio

**Antes de escribir código:**

1. Di en dos o tres líneas qué vas a cambiar y qué archivos tocas. Si la tarea implica un dato
   nuevo, una dependencia nueva o un endpoint nuevo, dilo explícitamente.
2. Declara tus supuestos. Si falta información —quién puede ver qué, qué pasa en el caso de error,
   cuál es el límite— **pregunta antes de asumir**. Un supuesto silencioso sobre autorización es
   una vulnerabilidad.
3. Si la tarea choca con una regla de §2, detente y dilo. No entregues el código violando la regla
   con una nota al final.

**Al escribir código:**

- Cambios pequeños y cohesionados. Un PR, un propósito.
- Escribe la prueba de la regla de negocio antes o junto con la implementación, no después.
- No toques archivos fuera del alcance de la tarea. No reformatees lo que no cambiaste.
- No agregues una dependencia sin justificarla: qué resuelve, por qué no se resuelve con lo que ya
  está, quién la mantiene, qué licencia tiene y cuántas dependencias transitivas arrastra.
  Licencias copyleft fuertes (GPL, AGPL): prohibidas sin aprobación.
- Todo lo que sea decisión de diseño con alternativas razonables se documenta como ADR corto en
  `docs/adr/`: contexto, decisión, alternativas descartadas, consecuencias.

**Al terminar:**

- Recorre la lista de §9 y la de §10 y di explícitamente qué falta, si falta algo.
- En el PR: qué cambió, qué se probó, qué riesgo de seguridad toca y qué requisito de ASVS, MASVS
  o PCI aplica.
- Si encontraste un problema de seguridad fuera del alcance de tu tarea, **reportalo, no lo
  arregles de paso**: abre una nota en el PR o un issue.

**Excepciones.** Toda excepción a este archivo se documenta como ADR con: regla de la que se
excepciona, razón, riesgo aceptado, mitigación compensatoria, responsable y fecha de revisión.
Sin esos seis campos no es una excepción, es una violación.

---

## 14. Trazabilidad

| Sección de este archivo | ASVS 5.0 | MASVS 2.1 | PCI DSS 4.0.1 |
|---|---|---|---|
| §2 No negociables | V1, V2, V8, V11, V12, V13, V16 | — | 3.x, 4.2, 6.2, 6.5, 8.6 |
| §3 Frontera PCI | V14 | — | 3.3, 3.4, 6.4.3, 11.6.1 |
| §4 Entradas y salidas | V1, V2, V5 | MASVS-CODE | 6.2.4 |
| §5 Identidad | V6, V7, V9, V10 | MASVS-AUTH | 8.2, 8.3, 8.4, 8.6 |
| §6 Autorización | V8 | MASVS-AUTH | 7.2 |
| §7 Datos y criptografía | V11, V12, V14 | MASVS-CRYPTO, MASVS-STORAGE | 3.5, 4.2 |
| §8 Bitácoras | V16 | MASVS-PRIVACY | 10.2, 10.3, 10.5, 10.6, 10.7 |
| §9 Pruebas | V2 | — | 6.2.3, 11.4 |
| §10 Pipeline | V13, V15 | MASVS-CODE | 6.2.3.1, 6.3.1, 6.3.2, 6.3.3, 11.3 |
| §11 Móvil | V4, V12 | las ocho categorías | — |
| §12 MPoC | V11, V15 | MASVS-RESILIENCE | MPoC |
| §13 Proceso | V15 | — | 6.2.2, 6.5, 12.10 |

---

## 15. Pendientes declarados

Lo que este archivo todavía no cubre y debe completarse antes del paso a producción. Mantener esta
lista honesta es parte del cumplimiento: un pendiente declarado es gestión de riesgo, un pendiente
omitido es un hallazgo.

- [ ] Nombre y configuración del proveedor de identidad elegido
- [ ] Nombre y configuración de la bóveda de secretos
- [ ] Objetivos numéricos de desempeño: p95 de latencia y TPS pico por ruta crítica
- [ ] Destino centralizado de bitácoras y reglas de alertamiento automatizado
- [ ] Matriz de roles y permisos por recurso
- [ ] Clasificación de datos personales con base legal y plazo de retención (LFPDPPP)
- [ ] Plan de respuesta a incidentes de una página (`PCI 12.10.1`)
- [ ] Proveedor y alcance del pentest anual, con reprueba de hallazgos incluida
