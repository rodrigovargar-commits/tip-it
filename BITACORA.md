# Bitácora de TIP-IT

Registro vivo de avances, experimentos y cuentas de prueba. Se va actualizando
conforme avanzamos — no es documentación técnica del código (eso vive en el
código y los commits), sino el "por qué" y el "qué pasó" de cada decisión y
prueba real.

---

## Cómo usar este documento

- **Avances y experimentos**: una entrada por cambio importante o prueba real,
  con fecha, qué se hizo, por qué, y qué resultado dio.
- **Cuentas registradas**: cada persona real (trabajador o cliente) que use la
  app fuera de pruebas internas, para tener trazabilidad de quién ha probado
  qué y cuándo.
- Fechas en formato `AAAA-MM-DD`. Agregar entradas nuevas **arriba** de cada
  tabla/lista (orden cronológico inverso, lo más reciente primero).

---

## Avances y experimentos

### 2026-08-27 — Checkout anónimo (sin registro)
Se quitó por completo el paso de identificación antes de pagar: ya no se pide
nombre ni celular al cliente. Escanear el QR o abrir el link manda directo a
la pantalla de monto → pago. El backend acepta pagos sin sesión (`optionalAuth`);
`Transaction.client` queda `null` para pagos anónimos. Objetivo: bajar la
fricción al mínimo posible para quien solo quiere dejar una propina.

### 2026-08-27 — Google Analytics (GA4)
Se instrumentó GA4 (Measurement ID `G-3WX1CMDGKW`) con eventos `sign_up`,
`begin_checkout`, `purchase`. **Resultado real: 0 usuarios activos en el
dashboard de GA**, a pesar de que el script está correctamente instalado.
Diagnóstico: `googletagmanager.com` es bloqueado por herramientas de bloqueo
de rastreadores (ad-blockers, Safari ITP) — no es un bug de código, es una
limitación estructural de GA en general. Por eso se construyó el endpoint de
métricas propio (ver abajo) como fuente de datos confiable.

### 2026-08-27 — Endpoint de métricas propio (`/api/admin/stats`)
Endpoint protegido con `ADMIN_STATS_KEY` que agrega directo de MongoDB:
usuarios totales/invitados, trabajadores totales/listos para cobrar,
transacciones totales/exitosas/pendientes, volumen bruto y neto en MXN.
**Pendiente:** falta configurar `ADMIN_STATS_KEY` en Render — el endpoint
está desplegado pero aún no se ha podido consultar en producción.

### 2026-08-25 — Comisión bajada a 6% + $4 MXN
Con datos reales de Stripe (incluyendo el IVA del 16% que Stripe cobra sobre
su propia comisión, fórmula real ≈ `4.18% × monto + $3.48`), se confirmó que
11%+$4 dejaba mucho más margen del necesario. Se bajó a 6%+$4, quedando
todavía con margen positivo en todos los montos probados, pero quitándole
menos al trabajador.

### 2026-08-25 — Pagos: diario por default + Instant Payout opcional
Cuentas nuevas de Stripe Connect quedan configuradas con pagos automáticos
**diarios** desde su creación. Además se agregó un botón de "Retiro
instantáneo" que el propio trabajador puede usar si quiere su dinero de
inmediato, pagando él la comisión extra de Stripe (~1%) — decisión explícita:
quien decide usar esa opción de pago es quien recibe el dinero, no la
plataforma.

### 2026-08-25 — Tutorial de onboarding para trabajadores
Se agregó un stepper de 4 pasos después del registro de trabajador,
explicando cómo funciona el QR, la verificación de identidad con Stripe, y
—importante— que **el primer pago tarda en llegar (~1 semana)** por revisión
de riesgo de Stripe en cuentas nuevas. Esto se confirmó probando directo en
el dashboard de Stripe: es comportamiento universal de Stripe para cuentas
nuevas, no algo que dependa de nuestro código, y aplica a **cada** trabajador
nuevo que se una a la plataforma.

### 2026-08-24 — Corrección: el trabajador veía el monto bruto, no el neto
Bug real encontrado en pruebas en vivo: una propina de prueba de $10 le
aparecía al trabajador como "$10.00" en su historial, cuando en realidad
recibía ~$6.20 después de la comisión. Corregido para que el historial del
trabajador siempre muestre lo que realmente le llegó a su cuenta.

### 2026-08-24 — Cuentas de Stripe huérfanas tras cambiar de modo prueba a modo real
Al activar Stripe en modo real (live), las cuentas conectadas creadas en modo
de prueba dejaron de ser accesibles con las nuevas llaves. Se agregó
auto-reparación: si el backend no puede acceder a una cuenta de Stripe
existente, la limpia y crea una nueva automáticamente, en vez de tronar.

### 2026-08-24 (activación) — Stripe en modo real + Apple Pay / Google Pay
Se activaron llaves live de Stripe (publishable en Vercel, secreta en
Render), se seleccionó el perfil de negocio "Marketplace" en Stripe Connect
(coincide con cómo está armado el código: la plataforma cobra al cliente y
transfiere al trabajador), y se confirmó que el dominio de métodos de pago
para Apple Pay / Google Pay ya cubre modo prueba y modo real con un solo
registro.

### 2026-08-19 al 2026-08-20 — Base: reseñas, avatares, contactos, comisión %, registro simplificado
Primer paquete grande de features: sistema de reseñas con estrellas y
comentarios, avatares, contactos guardados, calculadora de propina por
porcentaje, comisión reestructurada a porcentaje + fijo (con opción de que el
cliente cubra la comisión), cuentas de invitado para pago rápido, `/scan`
público, paleta de marca a menta.

---

## Cuentas registradas (pruebas reales)

Capturado del dashboard de Stripe Connect al 2026-08-27. Estas son las
primeras cuentas reales conectadas, parte de la primera ronda de prueba con
~10 personas a las que se les dio acceso a la app.

| Cuenta / correo         | Rol        | Estado en Stripe | Conectada el |
|--------------------------|------------|-------------------|--------------|
| polarc58@gmail.com       | Trabajador | Restringida       | 2026-08-27   |
| Giovanni Marín           | Trabajador | Restringida       | 2026-08-27   |
| Daniela Alcaraz           | Trabajador | Restringida       | 2026-08-27   |
| Rodrigo Vargas Garduño    | Trabajador | Habilitada        | 2026-08-24   |

**Transacciones de esta primera ronda:** 5 intentadas, 3 exitosas
($57.00 + $115.00 + $10.00 MXN = $182.00 MXN), 2 incompletas.

> Agregar aquí cada nueva persona real que empiece a usar la app (nombre o
> correo, si es trabajador o cliente, fecha). Cuando `/api/admin/stats` esté
> configurado en producción, estos números se pueden jalar directo de ahí en
> vez de anotarlos a mano.

---

## Pendientes abiertos

- Configurar `ADMIN_STATS_KEY` en Render y verificar `/api/admin/stats` en
  producción.
- Google Analytics seguirá subregistrando usuarios reales por bloqueo de
  rastreadores — no hay arreglo de código posible, solo tenerlo presente.
- Plan de lanzamiento: definir el siguiente grupo de trabajadores reales a
  invitar después de esta primera ronda de prueba.
