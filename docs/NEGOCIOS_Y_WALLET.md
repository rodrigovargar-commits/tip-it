# Portal de negocios y QR en el Wallet

## Para qué sirve
Un negocio (barbería, clínica, taquería...) crea su cuenta de negocio y recibe un **código** de 8 caracteres.
Lo comparte con sus colaboradores; cada persona se une desde su propia cuenta. El dueño ve, en `/negocio`,
**cuántas propinas** recibe cada persona, sus **estrellas** y sus **reseñas**, para conocer mejor el desempeño de su equipo.
**El negocio nunca ve montos de dinero** y el dinero no pasa por él: cada persona cobra directo en su banco y conserva
sus reseñas individuales (repartir una propina entre varias personas es una etapa aparte).

## El inicio: "Crear mi QR"
Los botones "Crear mi QR" de la página principal y de la barra superior abren `/register` sin rol, que pregunta **¿Para quién es?**:
- **Para mí** → el registro de siempre (`/register?role=worker`).
- **Para mi equipo** → `/register?role=team`: cuenta del dueño (sin QR propio) y, al terminar, directo a `/negocio` para crear el negocio.
Los enlaces con rol (anuncios, mensajes de WhatsApp) siguen yendo directo a su formulario, para no agregar un paso donde ya funcionaba.
Si la persona ya tiene sesión, "Para mí" va a su QR y "Para mi equipo" a su portal.

## Cómo funciona
1. El dueño abre `/negocio` (o Perfil > "Tengo un negocio"), escribe el nombre y recibe el código `XXXX-XXXX`.
2. Lo comparte (botón Compartir, enlace `…/negocio/unirme?c=XXXXXXXX`).
3. Cada persona abre el enlace, inicia sesión (o crea su cuenta de QR), ve el nombre del negocio y **acepta** que el negocio vea sus
   propinas, estrellas y reseñas (no el dinero). Sin esa aceptación el servidor rechaza la unión.
4. El dueño ve el resumen (7/30/90 días), el equipo y las reseñas con filtros por persona y estrellas.

## Varios equipos o ubicaciones
Un negocio puede tener varios **equipos** (sucursal, turno, área). Cada uno tiene su propio **nombre y código**. En `/negocio`:
- Pestaña **Equipos**: crear, renombrar, borrar (solo si está vacío y queda al menos uno), cambiar el código y compartirlo.
- Pestaña **Resumen**: filtros por equipo y **Comparar equipos** (personas, propinas, estrellas y reseñas de cada uno, con "Más" y "Mejor").
- Pestaña **Reseñas**: filtro por equipo, persona y estrellas.
- El dueño puede **mover** a una persona de un equipo a otro. Una persona puede cambiar de equipo dentro del mismo negocio usando el código de otro equipo, pero no entrar a otro negocio sin salir del primero.
- Con un solo equipo la pantalla es la de siempre (sin etiquetas de equipo); aparecen cuando hay dos o más.
- Los negocios creados antes de que existieran los equipos se convierten solos en un equipo "Principal" con el mismo código y las mismas personas (nadie tiene que hacer nada).
API nueva: `POST /api/business/locations`, `PATCH /api/business/locations/:id`, `POST /api/business/locations/:id/code/rotate`, `DELETE /api/business/locations/:id`, `PATCH /api/business/members/:workerId {locationId}`, y `?location=` en `overview` y `reviews`. Se quitó `POST /api/business/code/rotate` (ahora es por equipo).

## Reglas
- Un dueño tiene un negocio; una persona pertenece a un negocio a la vez y puede salir cuando quiera (desde su panel).
- El dueño puede quitar a alguien y cambiar el código (el equipo que ya está se queda; el código viejo deja de servir).
- Las reseñas se pueden **leer, no editar ni ocultar**. Los comentarios sin pago solo aparecen cuando TIP-IT los publica; el dueño ve cuántos están en revisión.
- El servidor no envía montos al negocio: ni totales, ni por persona, ni junto a cada reseña (hay una prueba que lo vigila).
- Todo lo del dueño responde 404 a quien no lo es (no confirma que exista un negocio ajeno).
- Si el dueño borra su cuenta, el negocio se cierra y el equipo queda libre.
- Los códigos se piden con límite por IP (20 cada 15 minutos) para que no se puedan adivinar en masa.

## API
`POST /api/business` crear · `GET /api/business/me` · `POST /api/business/code/rotate` · `GET /api/business/overview?days=7|30|90|365`
· `GET /api/business/reviews?member=&stars=&before=&limit=` · `DELETE /api/business/members/:workerId`
· `GET /api/business/lookup?code=` · `POST /api/business/join {code, accept:true}` · `POST /api/business/leave` · `GET /api/business/membership`

## QR en el Wallet
Botones en **Mi QR** y en el portal. Aparecen solos cuando el servidor tiene las llaves (`GET /api/wallet/config`).

**Google Wallet** (gratis): en Google Pay & Wallet Console crea una cuenta de emisor, activa la API de Google Wallet,
crea una cuenta de servicio y dale acceso al emisor. Variables: `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLIENT_EMAIL`,
`GOOGLE_WALLET_PRIVATE_KEY` (la llave privada con los saltos de línea como `\n`).

**Apple Wallet** (requiere Apple Developer Program, 99 USD al año): crea un *Pass Type ID*, genera su certificado y expórtalo
como .pem (certificado y llave por separado), baja el certificado WWDR de Apple en .pem y pasa los tres a base64.
Variables: `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_TEAM_ID`, `APPLE_WALLET_CERT_PEM_BASE64`, `APPLE_WALLET_KEY_PEM_BASE64`,
`APPLE_WALLET_KEY_PASSPHRASE` (si la llave tiene contraseña), `APPLE_WALLET_WWDR_PEM_BASE64`.
El teléfono abre un enlace firmado que dura 10 minutos y solo sirve para el pase de esa persona.

## Pendiente (siguientes etapas)
- Un solo QR por negocio que reparta cada propina entre varias personas (etapa 3, depende de la liquidación de Cheqpay).
- Probar los pases con las cuentas reales de Apple y Google (hoy se prueban con llaves de prueba).
