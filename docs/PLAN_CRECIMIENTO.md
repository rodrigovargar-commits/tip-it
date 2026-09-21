# Plan de crecimiento: primeros 100 trabajadores (borrador)

Todo lo de abajo son **hipótesis por validar**, no resultados. Cada experimento tiene una métrica y un criterio de éxito definidos ANTES de correrlo.

## Segmentos (en orden de prioridad)

| # | Segmento | Por qué encaja | Riesgo principal |
|---|---|---|---|
| 1 | Barberos y estilistas | Cliente sentado 30-60 min, relación recurrente, pagan sin efectivo suelto, tienen Instagram como vitrina | Ya tienen terminal/transferencia; hay que ser más fácil que "dame tu CLABE" |
| 2 | Puestos de comida | Cliente en fila, cobro rápido, QR pegado en el puesto | Ticket bajo: el cargo fijo de Stripe se come la propina de $10-20 |
| 3 | Músicos callejeros | Casi nadie trae efectivo; el QR resuelve justo eso | Pagos mínimos muy chicos y alta rotación del público |

**Antes de crecer:** definir propina mínima (sugerido $20-30) o cobrar la comisión al cliente. Sin eso, los segmentos 2 y 3 pierden dinero por transacción.

## Propuesta de valor por segmento (una línea)
- Barbero/estilista: "Tu QR en el espejo. Propina directa a tu cuenta, sin efectivo y sin pedir tu CLABE."
- Puesto de comida: "Cobra propina en la fila sin cambiar ni terminal."
- Músico: "Que te paguen aunque nadie traiga efectivo."

## Embudo a medir
Trabajador ve el pitch → crea cuenta → completa onboarding de Stripe → imprime/pega QR → recibe la 1ª propina → recibe 5+ propinas.
La métrica que manda es **activación = 1ª propina real recibida en 7 días**, no registros.

## Experimentos (semanas 1-4)

| ID | Hipótesis | Cómo se prueba | Éxito |
|---|---|---|---|
| E1 | Barberos aceptan un QR de propina si se lo instalas tú | Visitar 15 barberías/salones en persona, ofrecer instalar QR impreso (tarjeta de la app) | ≥5 de 15 completan onboarding |
| E2 | El QR pegado en el puesto genera propinas sin explicar | 10 puestos, QR + letrero, seguimiento 2 semanas | ≥5 puestos con ≥3 propinas |
| E3 | Músicos reciben más con QR visible que sin él | 5 músicos, letrero grande "Propina por QR", contar propinas por sesión | ≥3 propinas por sesión en promedio |
| E4 | Contenido corto de "antes/después" atrae trabajadores por Instagram/TikTok | 3 videos de 15 s de un barbero real usando el QR, enlace en bio | ≥20 visitas al registro por video |
| E5 | Un trabajador refiere a otros | Ofrecer a cada activado una tarjeta extra para compartir | ≥1 referido por cada 5 activados |

## Canales
1. **Puerta a puerta** (E1, E2): el que más aprendizaje da, costo casi cero. Llevar tarjeta con QR impresa (ya existe el diseño descargable en la app).
2. **Instagram/TikTok** con clientes y trabajadores reales, con su permiso.
3. **Comunidades**: grupos de Facebook/WhatsApp de barberos, estilistas y comerciantes por colonia.
4. **Referidos** entre trabajadores del mismo local.

## Cliente que paga (lado demanda)
El QR es el anuncio: cada tarjeta lleva la frase "¿Te gustó el servicio? ¡Déjame una propina!" y el logo. Un cliente que paga una vez ve la app y puede volverse trabajador o pedir a su barbero que la use.

## Cosas que hacer antes de salir a la calle
- [ ] Decidir propina mínima / quién paga la comisión.
- [ ] Activar Vercel Analytics y agregar eventos de embudo (registro, onboarding completo, QR descargado, 1ª propina).
- [ ] Imprimir 30 tarjetas QR de prueba.
- [ ] Guion de 30 s para el pitch en persona.
- [ ] Hoja de registro de cada visita (nombre, giro, reacción, objeción, resultado).

## Qué NO hacer todavía
Publicidad pagada, ni afirmar cifras de ingresos a trabajadores. Se decide después de ver E1-E3.
