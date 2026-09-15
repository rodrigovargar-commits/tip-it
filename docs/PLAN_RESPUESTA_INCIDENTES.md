# Plan de respuesta a incidentes (una página)

`PCI 12.10.1` · Borrador inicial — revisar y actualizar conforme el proyecto crezca.

## Qué cuenta como incidente

Cualquiera de estos, confirmado o sospechado:

- Acceso no autorizado a la base de datos, al panel de Stripe, o a las variables de entorno
  (Render/Vercel).
- Filtración de un secreto (llave de Stripe, `JWT_SECRET`, credencial de MongoDB) en un commit,
  log, o canal de comunicación.
- Comportamiento anómalo en pagos: transacciones que no cuadran contra Stripe, un trabajador
  cobrando montos fuera de lo normal, o un pico repentino de intentos fallidos.
- Un tercero reporta un problema de seguridad (responsible disclosure).
- Cualquier hallazgo del pipeline de CI (`secrets-scan`, `sast`, `dependency-scan`) marcado como
  crítico y que ya llegó a `main` antes de detectarse.

## Roles (mientras el equipo es una sola persona)

| Rol | Quién | Qué hace |
|---|---|---|
| Responsable de decisión | Rodrigo Vargas Garduño | Decide contención, comunicación y cierre |
| Contacto técnico | Rodrigo Vargas Garduño | Ejecuta la contención |

Cuando el equipo crezca, esta tabla se actualiza — no debe quedar como un solo nombre para
siempre.

## Pasos, en orden

1. **Contener.** Lo primero es que el incidente deje de crecer, no entenderlo por completo:
   - Secreto filtrado → rotarlo de inmediato (nueva llave en Stripe/Render/Vercel, revocar la
     vieja) antes de investigar cómo se filtró.
   - Cuenta comprometida → desactivar el usuario (`active: false`) o revocar sus tokens.
   - Código vulnerable ya en producción → revertir el deploy o aplicar el hotfix, lo que sea más
     rápido.
2. **Evaluar el alcance.** Usando la bitácora de seguridad (`docs/adr/0001`, sección de logging):
   ¿qué `actor_id` y qué `target` están involucrados? ¿Hubo transacciones reales de dinero
   afectadas? ¿Hay datos personales expuestos (nombre, teléfono, documento de identidad)?
3. **Preservar evidencia.** No borrar logs ni el commit problemático antes de tener una copia —
   se necesita para entender qué pasó y, si aplica, para un reporte regulatorio.
4. **Notificar si corresponde.**
   - Si hay dinero de usuarios reales afectado: contactar a Stripe (soporte de la cuenta) y a los
     trabajadores/clientes afectados directamente.
   - Si hay datos personales expuestos: esto puede activar una obligación de aviso bajo la
     LFPDPPP — ver `docs/CLASIFICACION_DATOS.md`. En duda, tratarlo como que sí aplica.
5. **Corregir la causa raíz**, no solo el síntoma — y agregar la regresión como prueba automatizada
   si el caso lo permite (§9 del documento de mejores prácticas).
6. **Cerrar con una nota escrita**: qué pasó, cuándo se detectó, qué se hizo, qué cambió para que
   no se repita. Esta nota vive en `docs/adr/` como un ADR más si implicó una decisión de diseño,
   o como una entrada en `BITACORA.md` si fue más operativo.

## Contactos externos útiles

- Soporte de Stripe: desde el dashboard, sección de ayuda de la cuenta.
- Render / Vercel: soporte desde su propio dashboard.
- Reporte de vulnerabilidad de GitHub (si algo se filtró en el repo): GitHub tiene un flujo de
  "security advisory" desde la pestaña Security del repositorio.

## Pendiente

- [ ] Definir un canal de reporte externo (ej. un correo de seguridad) para que alguien de fuera
      pueda avisar de una vulnerabilidad de forma responsable.
- [ ] Elegir proveedor de pentest anual (§15 del documento de mejores prácticas) y programar el
      primero.
