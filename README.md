# TIP-IT

Plataforma de propinas digitales. Los trabajadores reciben propinas vía QR único o
búsqueda por username; los clientes pagan con tarjeta a través de Stripe Connect.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + PWA (`vite-plugin-pwa`)
- **Backend**: Node.js + Express.js
- **Base de datos**: MongoDB (Mongoose)
- **Pagos**: Stripe (PaymentIntents + Connect Express)
- **Auth**: JWT (24h) + bcrypt

## Estructura

```
tip-it/
├── backend/            API REST (Express + MongoDB + Stripe)
│   └── src/
│       ├── config/      conexión a Mongo, cliente de Stripe
│       ├── models/      User, Worker, Transaction
│       ├── middleware/  auth (JWT), rate limiting, validación, errores
│       ├── controllers/ lógica de negocio por dominio
│       └── routes/      definición de endpoints
└── frontend/           PWA React (mobile-first)
    └── src/
        ├── pages/        landing, auth, worker, client, historial, perfil
        ├── components/   nav, tarjetas, rating, rutas protegidas
        ├── context/      AuthContext (sesión JWT)
        └── services/     cliente axios
```

## Requisitos previos

- Node.js 18+
- MongoDB (local o Atlas)
- Cuenta de Stripe (modo test) con Connect habilitado

## Configuración

### MongoDB local (sin Homebrew ni sudo)

El proyecto incluye un `mongod` real (v8.2.6) en `backend/.mongo/bin` que guarda sus
datos en `backend/.mongo/data` — no requiere Homebrew ni permisos de administrador.

```bash
cd backend
npm run mongo:start   # arranca MongoDB en localhost:27017
npm run mongo:status  # verifica que está corriendo
npm run mongo:stop    # lo detiene
```

`MONGO_URI=mongodb://localhost:27017/tip-it` en `.env` ya apunta a este Mongo local.
Si prefieres MongoDB Atlas, simplemente reemplaza `MONGO_URI` por tu cadena de conexión.

### Backend

```bash
cd backend
cp .env.example .env   # completa con tus valores reales
npm install
npm run mongo:start     # levanta MongoDB local (una sola vez por sesión de trabajo)
npm run dev              # http://localhost:5050 (ver nota de macOS abajo)
```

Variables de entorno (`backend/.env`):

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor API (default 5000) |
| `CLIENT_URL` | URL del frontend, usada por CORS y para construir los links del QR |
| `MONGO_URI` | Cadena de conexión a MongoDB |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | Expiración del token (default `24h`) |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del endpoint de webhooks de Stripe |
| `STRIPE_CONNECT_REFRESH_URL` / `STRIPE_CONNECT_RETURN_URL` | URLs de retorno del onboarding de Stripe Connect |
| `PLATFORM_FEE_PERCENT` | Comisión de TIP-IT sobre cada propina (4–6 recomendado) |

> **macOS**: el puerto 5000 suele estar ocupado por AirPlay Receiver (Control Center).
> Por eso `backend/.env` y `frontend/.env` en esta máquina ya están configurados con
> `PORT=5050` / `VITE_API_URL=http://localhost:5050/api`. Si `npm run dev` falla con
> `EADDRINUSE` en otra máquina, cambia `PORT` (y `VITE_API_URL`) a un puerto libre, o
> desactiva AirPlay Receiver en Preferencias del Sistema → General → AirDrop y Handoff.

### Frontend

```bash
cd frontend
cp .env.example .env    # completa con tus valores reales
npm install
npm run dev              # http://localhost:5173
```

Variables de entorno (`frontend/.env`):

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API (`http://localhost:5000/api` en desarrollo) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clave publicable de Stripe |

### Crear tu cuenta de Stripe (modo test)

1. Regístrate gratis en [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. Verifica que el toggle **"Test mode"** (arriba a la derecha del dashboard) esté
   activado — así no se procesan cobros reales.
3. Ve a **Developers → API keys** y copia:
   - **Publishable key** (`pk_test_...`) → `frontend/.env` → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (`sk_test_...`) → `backend/.env` → `STRIPE_SECRET_KEY`
4. Ve a **Connect → Get started** y activa Connect (en modo test se habilita al
   instante, sin revisión). Esto es lo que permite crear cuentas Express para los
   trabajadores.

### Webhooks de Stripe en desarrollo

El proyecto incluye el [Stripe CLI](https://docs.stripe.com/stripe-cli) en
`backend/.stripe-cli` (descargado directo del release oficial, sin Homebrew) y ya
está autenticado con tu `STRIPE_SECRET_KEY` — no hace falta `stripe login`.

```bash
cd backend
npm run stripe:listen   # reenvía eventos de Stripe a localhost:5050/api/webhooks/stripe
```

Déjalo corriendo en una terminal aparte mientras trabajas (junto con `npm run dev` y
`npm run mongo:start`). El `whsec_...` que imprime ya está guardado en
`STRIPE_WEBHOOK_SECRET` dentro de `backend/.env`; si alguna vez cambia, actualízalo ahí.

Para probar que el webhook funciona sin hacer un pago completo:

```bash
./.stripe-cli/stripe trigger payment_intent.succeeded --api-key "$(grep STRIPE_SECRET_KEY .env | cut -d= -f2)"
```

Deberías ver `200 OK` tanto en la terminal del listener como en los logs del backend.

### Arranque diario (3 terminales)

Ya está todo configurado en esta máquina. Para trabajar necesitas 3 terminales:

```bash
# Terminal 1
cd backend && npm run mongo:start && npm run dev

# Terminal 2
cd backend && npm run stripe:listen

# Terminal 3
cd frontend && npm run dev
```

Luego abre `http://localhost:5173`. Cuentas de prueba ya creadas:
- Trabajadora: `ana@example.com` / `password123` (`@ana_barber`, Stripe Connect activo)
- Cliente: `carlos@example.com` / `password123`

## Flujo de pagos

1. El trabajador conecta su cuenta de Stripe (Express) desde su dashboard —
   `POST /api/workers/stripe/onboarding-link` genera el link de onboarding.
2. El cliente busca al trabajador (QR o username) y elige un monto.
3. `POST /api/tips/create-intent` crea un `PaymentIntent` con
   `transfer_data.destination` = cuenta conectada del trabajador y
   `application_fee_amount` = comisión de TIP-IT. Stripe se encarga de la
   transferencia automática al trabajador (24–48h según el payout schedule).
4. El cliente confirma el pago en el frontend con Stripe Elements.
5. El webhook `payment_intent.succeeded` (fuente de verdad) y el endpoint
   `POST /api/tips/confirm` (UX inmediata + rating/comentario) actualizan el
   estado de la transacción y las estadísticas del trabajador.

## Endpoints de la API

Todas las rutas cuelgan de `/api`. Las marcadas 🔒 requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| POST | `/auth/register` | Registro (nombre, email, teléfono, password) |
| POST | `/auth/login` | Login, devuelve JWT |
| GET 🔒 | `/users/me` | Perfil del usuario autenticado + perfil de trabajador si aplica |
| PUT 🔒 | `/users/profile` | Editar nombre, teléfono, avatar, documento (KYC) |
| POST 🔒 | `/workers/register` | Crear perfil de trabajador (username, bio) + genera QR |
| GET | `/workers/:username` | Perfil público de un trabajador |
| GET 🔒 | `/workers/:id/stats` | Estadísticas (solo el dueño): total recibido, propinas, rating |
| PUT 🔒 | `/workers/profile` | Editar bio del trabajador |
| POST 🔒 | `/workers/stripe/onboarding-link` | Crea/relanza el onboarding de Stripe Connect |
| GET 🔒 | `/workers/stripe/status` | Estado de la cuenta de Stripe Connect |
| POST 🔒 | `/tips/create-intent` | Crea el `PaymentIntent` para una propina |
| POST 🔒 | `/tips/confirm` | Confirma el pago y adjunta rating/comentario |
| GET 🔒 | `/tips/history` | Historial (`?role=worker\|client`) |
| POST | `/webhooks/stripe` | Webhook de Stripe (raw body, firma verificada) |
| GET | `/qr/:userid` | Código QR (data URL) de un trabajador por su `userId` |

## Seguridad implementada

- HTTPS se asume a nivel de infraestructura/proxy en producción (`trust proxy` habilitado)
- Contraseñas con bcrypt (12 rounds)
- JWT con expiración de 24h
- Validación de entrada con `express-validator` en todas las rutas mutables
- Rate limiting global (300 req/15min) y específico para auth (20/15min) y propinas (15/5min)
- `helmet` para cabeceras HTTP seguras y `express-mongo-sanitize` contra NoSQL injection
- Los datos de tarjeta nunca tocan el backend — Stripe Elements los captura directamente
- Verificación de firma en el webhook de Stripe antes de procesar cualquier evento

## PWA

El frontend usa `vite-plugin-pwa` (manifest + service worker con auto-actualización),
por lo que `npm run build` genera una app instalable con soporte offline básico para
el shell de la aplicación.

## Despliegue a producción

Backend en **Render**, frontend en **Vercel**, base de datos en **MongoDB Atlas**.
Cada uno de los tres pasos siguientes requiere que tú crees la cuenta correspondiente
(no puedo crear cuentas de terceros por ti) — te dejo la ruta exacta a seguir.

### 1. Subir el código a GitHub

```bash
# Crea el repo vacío en github.com/new (sin README, sin .gitignore, sin licencia)
git remote add origin https://github.com/TU_USUARIO/tip-it.git
git branch -M main
git push -u origin main
```

### 2. MongoDB Atlas (base de datos)

1. Crea una cuenta gratis en [mongodb.com/cloud/atlas/register](https://mongodb.com/cloud/atlas/register).
2. Crea un cluster **M0 (gratuito)**.
3. En **Database Access**, crea un usuario con contraseña.
4. En **Network Access**, agrega `0.0.0.0/0` (permite conexión desde cualquier IP —
   Render/Railway no tienen IPs fijas en el plan gratuito).
5. En **Database → Connect → Drivers**, copia la cadena de conexión
   (`mongodb+srv://usuario:password@cluster.mongodb.net/tip-it`). Esa es tu `MONGO_URI`
   de producción.

### 3. Backend en Render

1. Crea una cuenta gratis en [render.com](https://render.com) y conéctala a tu GitHub.
2. **New → Blueprint**, selecciona el repo `tip-it` — Render detecta
   `backend/render.yaml` automáticamente y crea el servicio.
3. Cuando pida las variables marcadas `sync: false`, complétalas:
   - `MONGO_URI` → la cadena de Atlas del paso 2
   - `STRIPE_SECRET_KEY` → tu key de Stripe (usa `sk_live_...` solo cuando actives el
     modo real; mientras tanto sigue con `sk_test_...`)
   - `CLIENT_URL`, `STRIPE_CONNECT_REFRESH_URL`, `STRIPE_CONNECT_RETURN_URL` → el
     dominio de Vercel del paso 4 (p. ej. `https://tip-it.vercel.app`,
     `.../worker/stripe/refresh`, `.../worker/stripe/return`)
   - `STRIPE_WEBHOOK_SECRET` → lo obtienes en el paso 5
4. Render te da una URL como `https://tip-it-backend.onrender.com` — pruébala con
   `curl https://tip-it-backend.onrender.com/api/health`.

### 4. Frontend en Vercel

1. Crea una cuenta gratis en [vercel.com](https://vercel.com) y conéctala a tu GitHub.
2. **Add New → Project**, selecciona el repo `tip-it`.
3. En **Root Directory** elige `frontend` (Vercel detecta Vite automáticamente).
4. Agrega las variables de entorno:
   - `VITE_API_URL` → `https://tip-it-backend.onrender.com/api` (URL de Render + `/api`)
   - `VITE_STRIPE_PUBLISHABLE_KEY` → tu `pk_test_...` (o `pk_live_...` en real)
5. Deploy. Vercel te da la URL final (p. ej. `https://tip-it.vercel.app`) — regresa al
   paso 3 y actualiza `CLIENT_URL` / `STRIPE_CONNECT_*` en Render con esa URL real.

### 5. Webhook de Stripe en producción

1. En el [Dashboard de Stripe](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. URL: `https://tip-it-backend.onrender.com/api/webhooks/stripe`.
3. Eventos a escuchar: `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `account.updated`.
4. Copia el `whsec_...` que te da Stripe y agrégalo como `STRIPE_WEBHOOK_SECRET` en Render.

### Checklist antes de aceptar dinero real

- [ ] Cambiar `sk_test_...` / `pk_test_...` por `sk_live_...` / `pk_live_...` en Render y
      Vercel — esto requiere que Stripe apruebe tu cuenta (verificación de negocio real,
      no modo test).
- [ ] Repetir el paso 5 (webhook) en modo live — los webhooks de test y live son endpoints
      distintos en Stripe.
- [ ] Ajustar `PLATFORM_FEE_PERCENT` a tu modelo de comisión real (4–6% + fee de Stripe).
- [ ] Revisar el payout schedule de Stripe Connect (`manual` o `daily`) según qué tan
      rápido quieras liberar fondos a los trabajadores.
- [ ] Confirmar que `CLIENT_URL` en Render y `VITE_API_URL` en Vercel apuntan a los
      dominios finales (con HTTPS, que Render y Vercel proveen automáticamente).
