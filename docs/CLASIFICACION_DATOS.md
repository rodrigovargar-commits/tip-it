# Clasificación de datos personales (borrador)

`RV Mejores Prácticas §7` · `LFPDPPP` — **Este documento no es asesoría legal.** Es un borrador
honesto de qué datos recolecta TIP-IT hoy, para que un abogado o el propio Rodrigo lo revise antes
de tratarlo como la clasificación oficial. Mientras el proyecto sea un piloto de curso con un
puñado de usuarios reales, el riesgo es bajo — pero la lista debe quedar correcta antes de crecer.

## Qué datos se recolectan hoy, y de dónde

| Campo | Modelo | Es dato personal | Por qué se recolecta | Quién lo ve |
|---|---|---|---|---|
| `name` | User | Sí | Identificar a la persona en la app y en recibos | El propio usuario; el trabajador ve el primer nombre de quien lo calificó |
| `email` | User | Sí | Login, recuperación de cuenta | Nadie más que el propio usuario (nunca se muestra a otros) |
| `phone` | User | Sí | Login de invitados (pago rápido sin contraseña) | Nadie más que el propio usuario |
| `document` (INE/pasaporte) | User | Sí, sensible | Verificación de identidad básica (KYC) antes de operar como trabajador | Solo el propio usuario lo edita; no se muestra a nadie más ni se regresa en ninguna respuesta de la API |
| `avatarUrl` | User | Sí (imagen) | Foto de perfil | Pública en el perfil del trabajador |
| `comment` / `review` | Transaction | Potencialmente — es texto libre que el cliente escribe | Comentario sobre el servicio, mostrado como reseña | Público en el perfil del trabajador que recibió la propina |
| `username`, `bio`, `experience` | Worker | No es dato personal identificable por sí solo (es un alias elegido) | Perfil público del trabajador | Público |

**Nota sobre `comment`/`review`:** al ser texto libre, un cliente podría escribir información
personal suya o de un tercero sin que el sistema lo sepa. No hay hoy ningún filtro para esto —
queda anotado como riesgo, no resuelto.

## Base legal (borrador)

Para los campos usados para operar el servicio (`name`, `email`, `phone`, `document`): **ejecución
de una relación contractual** — la persona da sus datos para poder usar la app (registrarse,
recibir pagos). No se usan para publicidad ni se venden ni comparten con terceros fuera de lo
estrictamente necesario para procesar el pago (Stripe).

Para `avatarUrl`, `comment`/`review`, `bio`, `experience`: **consentimiento** — la persona decide
activamente subir una foto o escribir una reseña, y sabe que es pública.

## Plazo de retención (borrador)

No hay hoy ninguna política de borrado automático. Propuesta inicial, pendiente de aprobar:

- Mientras la cuenta esté activa: se conservan todos los datos necesarios para operar.
- Cuenta eliminada por el usuario: hoy no existe un flujo de "eliminar mi cuenta" — es un pendiente
  de producto, no solo de política.
- Transacciones: se conservan de forma indefinida por ahora, ya que son el registro contable de
  pagos reales (comparable a por qué Stripe también las conserva).

## Terceros con los que se comparten datos

- **Stripe** — procesa los pagos y necesita el nombre e identificación del trabajador para
  cumplir sus propias obligaciones de KYC como procesador de pagos. Esto es directo entre el
  trabajador y Stripe durante el onboarding (`accountLinks`); TIP-IT no reenvía el documento de
  identidad a Stripe por su cuenta — Stripe lo captura en su propio flujo.
- Ningún otro tercero recibe datos personales hoy (no hay SDK de analítica de terceros activo del
  lado del backend; ver la nota sobre Google Analytics en `BITACORA.md`).

## Pendiente

- [ ] Revisión por un abogado o alguien con conocimiento real de la LFPDPPP antes de tratar este
      documento como definitivo.
- [ ] Aviso de privacidad público (ya existe una página en la app — `frontend/src/pages/PrivacyPolicy.jsx`
      — falta confirmar que su contenido sea consistente con esta tabla).
- [ ] Flujo real de "eliminar mi cuenta y mis datos".
- [ ] Decidir un plazo de retención real para transacciones y logs (hoy: transacciones
      indefinidas, logs de seguridad 12 meses según §8.4 del documento de mejores prácticas, pero
      sin un destino centralizado todavía que aplique ese plazo automáticamente).
