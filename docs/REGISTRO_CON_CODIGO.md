# Registro e inicio de sesión con código

Esto explica cómo funciona el código que le llega a la persona (por SMS, WhatsApp o correo) para crear su cuenta o entrar, y qué hay que configurar para encenderlo.

## Qué cambió para la persona

- Crear cuenta: teléfono o correo, código de 6 dígitos, actividad, perfil, banco y listo. Sin contraseña.
- Entrar: el mismo código, o la contraseña si la cuenta tiene una.
- Quien solo quiere dar propinas sigue sin necesitar cuenta.

## Qué pasa mientras no esté configurado

Nada se rompe. La app le pregunta al servidor qué medios de envío tiene (`GET /api/auth/otp/config`). Si no hay ninguno configurado, muestra el registro de siempre (correo, teléfono y contraseña).

## Cómo se enciende

Todo se configura con variables de entorno en Render. Puedes encender un medio, otro, o los dos.

### Por correo (Resend)

1. En Resend, entra a Domains y agrega `tipit.com.mx`.
2. Resend te da unos registros DNS (SPF, DKIM). Agrégalos en Cloudflare, en la zona de `tipit.com.mx`.
3. Cuando el dominio diga Verified, en Render pon:
   - `RESEND_API_KEY` (la misma que ya usas para los avisos)
   - `OTP_EMAIL_FROM` = `TIP-IT <codigo@tipit.com.mx>`

Sin `OTP_EMAIL_FROM` el correo queda apagado a propósito. El remitente de prueba de Resend solo le entrega a quien creó la cuenta de Resend, y todas las demás personas se quedarían sin código.

### Por SMS (Twilio Verify)

1. Crea una cuenta en Twilio y súbela de nivel (la cuenta de prueba solo envía a números que verificaste a mano).
2. Crea un servicio en Verify y copia su identificador.
3. En Render pon:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SID`

Twilio Verify genera y revisa el código por su cuenta y trae protección contra envíos falsos masivos. Cada verificación tiene un costo; revisa la tarifa actual para México en su página antes de abrirlo al público.

### Por WhatsApp

Requiere un remitente de WhatsApp aprobado en Twilio. Mientras no lo tengas, déjalo apagado (`OTP_WHATSAPP=false`).

### Hacerlo obligatorio

`OTP_REQUIRED=true` hace que el registro de siempre deje de funcionar y solo se pueda crear cuenta con código. Enciéndelo hasta que el envío esté probado.

## Reglas de seguridad que ya trae

- El código dura 10 minutos y se puede usar una sola vez.
- Máximo 5 intentos equivocados por código.
- Hay que esperar 30 segundos para pedir otro, y máximo 5 códigos por hora por teléfono o correo.
- Además hay un límite por dirección IP.
- El código no se guarda: solo una huella cifrada con una llave del servidor.
- Para entrar, si el número no tiene cuenta, la respuesta es idéntica y no se envía nada. Así nadie puede averiguar quién está registrado.
- Un teléfono verificado solo puede pertenecer a una cuenta.
- La prueba de verificación dura 20 minutos y no sirve como sesión.

## Cómo probarlo

En tu computadora, sin configurar nada, el código se imprime en la terminal del servidor (`[otp:sms] código para ...`). En producción nunca se imprime.

Para saber qué medios están activos en producción, y mandar un código de prueba a tu correo:

```
https://tip-it-backend-65q4.onrender.com/api/admin/otp-status?key=TU_CLAVE
https://tip-it-backend-65q4.onrender.com/api/admin/otp-status?key=TU_CLAVE&channel=email&to=tucorreo@gmail.com
```

## Comentarios sin pago

Cuando alguien deja un comentario sin pagar, queda pendiente. Para verlos y aprobarlos:

```
/api/admin/recognitions?key=TU_CLAVE
/api/admin/recognitions/ID/approve?key=TU_CLAVE
/api/admin/recognitions/ID/reject?key=TU_CLAVE
```

Los aprobados salen en el perfil como "Sin pago asociado" y no cuentan para el promedio de estrellas.

## Cobro: una nota importante

El pago ahora es solo con tarjeta (incluye Apple Pay y Google Pay, que son tarjetas en el celular). Para que Apple Pay salga en el navegador, el dominio `tipit.com.mx` tiene que estar verificado en Stripe (Configuración, Métodos de pago, Dominios de Apple Pay). Stripe además muestra a veces una caja para guardar los datos con Link; se apaga en Configuración, Métodos de pago.
