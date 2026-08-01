# Suscripciones y cobranza

Diseño del modelo de suscripción de CourtIn: cómo se cobra el abono a los
complejos y qué pasa cuando no pagan.

Documento de referencia previo a la implementación. Las decisiones acá tomadas
salen de la definición comercial del 28/07/2026.

---

## 1. Modelo de negocio

| Decisión | Definición |
|---|---|
| Qué se cobra | Abono fijo por plan, con ciclo mensual o anual |
| Qué diferencia a los planes | **Solo la cantidad de canchas.** Todas las funciones están en todos los planes |
| Cómo se cobra | **Por fuera de la plataforma.** El complejo contacta a soporte y un superadmin registra el pago |
| MercadoPago | **No interviene.** Es una función del complejo para cobrar sus reservas, no el medio de cobro del abono |
| Prueba gratis | 1 mes, en todos los planes |

### Planes

Precios en pesos argentinos.

| Plan | Canchas | Mensual | Anual (por mes) | Anual (total) |
|---|---|---|---|---|
| `start` | hasta 3 | $40.000 | $35.000 | $420.000 |
| `pro` | 4 a 6 | $60.000 | $55.000 | $660.000 |
| `elite` | 7 o más | $80.000 | $75.000 | $900.000 |

`elite` no tiene tope de canchas, así que no hace falta un escalón "a medida".

Los valores viven en configuración (`src/config/plans.js`), no repartidos por el
código: con la inflación argentina esta tabla se toca seguido, y cada club
conserva el precio que tenía al contratar (`Subscription.precio`).

> **Nota comercial.** El descuento anual es de $5.000/mes en los tres planes, o
> sea $60.000 al año en todos. En porcentaje eso es 12,5% en `start`, 8,3% en
> `pro` y 6,25% en `elite`: el incentivo a pagar por adelantado se va
> debilitando justo con los clientes más grandes, que son aquellos cuyo pago
> anual más ayudaría al flujo de caja. Si el objetivo es empujar el anual,
> convendría un descuento porcentual parejo.

### Por qué importa que el cobro sea manual

Nada se cobra solo. **La secuencia de emails de dunning no es un recordatorio:
es el mecanismo de cobranza.** Si un email no sale, el complejo no se entera de
que debe y no paga. Eso eleva el estándar de confiabilidad de los envíos y es la
razón por la que todo lo de `EmailLog` e idempotencia ya está construido.

También implica que **alguien tiene que registrar cada pago a mano**. Es
sostenible con pocos clientes y deja de serlo a escala; cuando ese momento
llegue, habrá que revisar la decisión.

### Pendiente de definición comercial

- Si el ciclo mensual se factura por mes calendario o desde la fecha de alta de
  cada club

---

## 2. Máquina de estados

Se reutiliza el enum que ya existe en `Club.estado`. No hace falta inventar
estados nuevos: falta lo que los mueve.

```
                    alta del complejo
                           │
                           ▼
                     ┌───────────┐
                     │   trial   │  30 días, todo habilitado
                     └─────┬─────┘
                           │ vence el trial / vence una factura
                           ▼
      pago  ┌─────────► ┌────────┐
      ◄─────┤           │ activo │  al día
            │           └────┬───┘
            │                │ +7 días de impago
            │                ▼
            │           ┌────────┐  NIVEL 1
            ├───────────┤ impago │  · despublicado
            │           └────┬───┘  · no carga turnos nuevos
            │                │      · SÍ entra al panel
            │                │ +30 días
            │                ▼
            │        ┌────────────┐  NIVEL 2
            └────────┤ suspendido │  · no entra al panel
                     └──────┬─────┘  · solo la página de pago
                            │
                            │ baja voluntaria o definitiva
                            ▼
                      ┌───────────┐
                      │ cancelado │
                      └───────────┘
```

Los plazos (7 y 30 días) se cuentan **desde el vencimiento de la factura**, no
desde el último aviso.

### Invariantes — valen en todos los estados

Estas dos reglas no se rompen ni siquiera con el complejo suspendido:

1. **Los turnos ya reservados siguen funcionando.** Un jugador que reservó con
   dos semanas de anticipación no puede perder su turno porque el complejo se
   atrasó con el pago. El link de gestión (`manageToken`) sigue vivo siempre.
2. **En nivel 1 se pueden cancelar turnos existentes**, aunque no crear nuevos.
   Si no, un turno que se cae queda ocupado y bloqueado para todos.

### La salida de emergencia

Si en nivel 2 no puede entrar al panel, **tampoco puede ver qué debe** ni a quién
escribirle para regularizar.

Por eso `/panel/suscripcion` vive **fuera del guard del panel**. Un club
suspendido inicia sesión y aterriza ahí: ve su deuda y los datos de soporte, nada
más. Los emails de dunning linkean directo a esa página.

---

## 3. Modelo de datos

### `Subscription` — una por club

| Campo | Tipo | Nota |
|---|---|---|
| `club` | ref Club, único | |
| `plan` | enum | `start`/`pro`/`elite` |
| `ciclo` | enum | `mensual`/`anual` |
| `precio` | Number | Del ciclo contratado. Congelado al contratar: un aumento de lista no afecta a quien ya está |
| `moneda` | String | `ARS` |
| `trialHasta` | Date | |
| `vigenciaHasta` | Date | Hasta cuándo está paga. **Es la fuente de verdad del acceso** |
| `canceladaEn` | Date | |

#### El ciclo anual es pago único adelantado

Una sola factura por los 12 meses ($420.000 / $660.000 / $900.000) y
`vigenciaHasta` a un año. No hay compromiso que modelar ni cuotas que seguir: se
paga o no se paga.

El precio "por mes" de la tabla es solo la forma de comunicarlo; el cobro es uno.

Consecuencia para la cobranza: **un club anual entra en mora una vez al año, no
doce**. La escalera de 7 y 30 días aplica igual, pero el impacto de cortar a
alguien que ya pagó 12 meses por adelantado es mucho mayor — conviene revisar
esos casos a mano antes de que el cron los despublique.

### `Invoice` — una por período

| Campo | Tipo | Nota |
|---|---|---|
| `club` | ref Club | |
| `periodo` | String | `2026-08` mensual, `2026` anual. Con índice único junto a `club` |
| `monto` | Number | |
| `estado` | enum | `pendiente`/`pagada`/`vencida`/`anulada` |
| `vencimiento` | Date | |
| `pagadaEn` | Date | |
| `metodoPago` | enum | `transferencia`/`efectivo`/`otro` |
| `registradaPor` | ref User | Qué superadmin registró el pago |

El índice único `(club, periodo)` impide facturar dos veces el mismo mes, aunque
el cron corra de más.

### Cambios en `Club`

`estado` queda igual: el enum actual ya cubre los dos niveles de corte.

`plan` **sí cambia**. Hoy es `['starter', 'pro', 'business', 'enterprise']` y
pasa a `['start', 'pro', 'elite']`. Eso rompe los documentos existentes: un club
guardado como `starter` deja de validar contra el enum nuevo y falla al guardar,
aunque nadie haya tocado su plan.

Hace falta una **migración** (`scripts/migratePlanes.js`) antes de desplegar:

| Antes | Después | Por qué |
|---|---|---|
| `starter` | `start` | Equivalente |
| `pro` | `pro` | Sin cambio |
| `business` | `pro` o `elite` | Según cuántas canchas tenga el club |
| `enterprise` | `elite` | Equivalente |

Para `business` conviene resolver por cantidad de canchas reales en vez de
mapear a ciegas, así el club queda en el plan que le corresponde según la tabla
de precios.

El `default` del campo pasa a `start`.

Puntos del código que hay que tocar junto con el enum (relevados el 28/07/2026):

| Archivo | Qué |
|---|---|
| `backend/src/models/Club.js:137` | El enum y su `default` |
| `backend/src/controllers/adminController.js:163` | `plan \|\| 'starter'` |
| `frontend/.../admin/ComplejosView.vue` | Dos listas de opciones, el default del formulario y los colores de los badges por plan |

---

## 4. Dónde se aplican las restricciones

El estado no sirve de nada si no se hace cumplir. Puntos de aplicación:

### Nivel 1 — `impago`

| Dónde | Qué cambia |
|---|---|
| `publicController` (búsqueda y ficha) | El complejo deja de aparecer. Se suma el chequeo de estado al `publicado` que ya existe |
| `publicController.createPublicReservation` | Rechaza reservas nuevas |
| `reservationController.createReservation` | El backoffice tampoco carga turnos |
| Cancelaciones | **Siguen funcionando** (ver invariantes) |

### Nivel 2 — `suspendido`

Un middleware corta el acceso a las rutas del panel, salvo las de suscripción.
El frontend redirige a `/panel/suscripcion`.

### Límite de canchas

Se valida al **crear** una cancha, contra el plan vigente. Si un club baja de
plan y queda por encima del límite, **no se le borran canchas**: se le impide
crear nuevas hasta que quede en regla. Borrar datos de un cliente por una
gestión de facturación no es aceptable.

---

## 5. Secuencia de emails (dunning)

Cada uno con `dedupeKey` que incluye el período, así el cron puede correr N
veces sin duplicar. Todos linkean a `/panel/suscripcion`.

### Trial

| Cuándo | Email |
|---|---|
| Alta | Bienvenida + primeros pasos |
| Faltan 7 días | Tu prueba termina en una semana |
| Falta 1 día | Último día de prueba |
| Día 0 | Terminó la prueba — link de pago |

### Ciclo normal

| Cuándo | Email |
|---|---|
| Inicio del período | Factura emitida, con link de pago |
| 3 días antes | Vence en 3 días |
| Al pagar | Pago recibido / comprobante |

### Mora

| Día | Email | Efecto |
|---|---|---|
| 0 | Factura vencida | — |
| 5 | En 2 días se despublica tu complejo | — |
| **7** | **Tu complejo fue despublicado** | **→ `impago`** |
| 14 | Recordatorio | — |
| 21 | Recordatorio | — |
| 28 | En 2 días se bloquea el acceso | — |
| **30** | **Acceso bloqueado** | **→ `suspendido`** |
| al pagar | Todo reactivado | → `activo` |

Los avisos previos a cada corte (día 5 y 28) son deliberados: nadie debería
enterarse de que lo despublicaron por un reclamo de un cliente.

---

## 6. Cómo se cobra el abono

**Por fuera de la plataforma.** El complejo se contacta con soporte, paga como
acuerden (transferencia, efectivo, lo que sea) y un superadmin registra el pago
desde `/admin/suscripciones`. Eso marca la factura como pagada, extiende la
vigencia y reactiva el complejo automáticamente.

No hay pasarela de pago para la suscripción. Los emails de factura y de deuda
llevan al complejo a contactar a soporte:

```
SOPORTE_EMAIL=hola@courtinapp.com
SOPORTE_WHATSAPP=
```

### ⚠️ MercadoPago no interviene acá

MercadoPago es una función **del complejo**, no de la suscripción: cada club
conecta su propia cuenta para cobrarles las reservas a sus jugadores, y esa plata
va directo a la cuenta del club. Es otra cosa, con otro modelo de datos y otra
arquitectura (OAuth por club), y vive en su propio roadmap.

Confundir las dos lleva a errores caros: el OAuth por club no sirve para cobrar
el abono, porque el abono lo cobra CourtIn y no el complejo.

### Consecuencia sobre `Invoice`

Por eso el modelo no tiene `mpPreferenceId`, `mpPaymentId` ni `linkPago`, y
`metodoPago` sólo admite `transferencia`, `efectivo` u `otro`. La idempotencia
del pago se resuelve en `acreditarPago`, que no vuelve a extender la vigencia de
una factura ya pagada — así un doble clic en "marcar pagada" no regala un mes.

---

## 7. Tareas programadas

Se suman a `src/jobs/`, junto al recordatorio de 24 h. Una corrida diaria
alcanza: nada acá depende de la hora exacta.

| Job | Qué hace |
|---|---|
| `emitirFacturas` | Crea las Invoice del período y manda el link |
| `avisosTrial` | Los 7/1/0 días del trial |
| `dunning` | Recorre las vencidas, manda el email del día y aplica los cambios de estado |

Misma protección que el recordatorio: **ventana ancha + `dedupeKey`**. Si una
corrida se saltea, la siguiente la recupera sin mandar nada dos veces.

> ⚠️ En el plan free de Render el servicio duerme y los crons no corren. Para
> cobranza automática eso no es aceptable: hay que pasar al plan pago antes de
> depender de esto para facturar.

---

## 8. Pantallas

| Ruta | Quién | Qué |
|---|---|---|
| `/panel/suscripcion` | tenant_admin | Plan actual, estado, historial de facturas, botón de pago. **Fuera del guard del panel** |
| `/admin/suscripciones` | superadmin | Ya existe la ruta. Listado de clubes con estado, vencimiento y acción de marcar pago manual |
| Banner en el panel | tenant_admin | Aviso de factura vencida, con los días que faltan para cada corte |

---

## 9. Plan de implementación

Por capas, cada una utilizable por sí sola:

1. ✅ **Modelos y estados** — `Subscription`, `Invoice` y el cálculo del estado
   efectivo de un club
2. ✅ **Restricciones** — niveles 1 y 2 aplicados en los puntos de la sección 4,
   más el límite de canchas por plan
3. ✅ **Pantallas y cobro manual** — `/panel/suscripcion`, el panel de superadmin
   y el email de factura emitida. **Con esto ya se puede facturar y cobrar**
4. **Emails y crons** — la secuencia completa de dunning y el barrido diario que
   mueve los estados

El paso de MercadoPago que figuraba acá **se eliminó**: la suscripción se cobra
por fuera de la plataforma (ver sección 6).

### Lo que falta para que el sistema funcione solo

Hoy los estados se recalculan **al leer** la pantalla de suscripción. Eso
significa que un club que cae en mora no se despublica hasta que alguien abra esa
pantalla. El paso 4 es lo que cierra el circuito: un cron diario que recorre
todas las suscripciones, aplica los cambios de estado y manda los avisos.
