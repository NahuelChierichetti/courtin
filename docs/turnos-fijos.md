# Turnos fijos

Cómo un complejo le reserva a un cliente el mismo horario todas las semanas, sin
fecha de fin y sin que nadie tenga que acordarse de renovarlo.

---

## 1. El problema

Un turno fijo no vence. "Juan, martes a las 20" no dura 3 meses: dura hasta que
Juan deje de venir. Cualquier diseño que dependa de que un humano renueve algo
está mal, porque el día que se olvide, el horario se libera, alguien más lo
reserva y el complejo le falla **al cliente que menos se lo puede permitir**: el
fiel, el que paga todos los meses sin que haya que perseguirlo.

Al mismo tiempo, "sin fecha de fin" no se puede guardar como reservas: no se
pueden crear infinitos documentos.

---

## 2. El modelo: regla + materialización rodante

La salida es separar dos cosas que parecen una:

| | Qué es | Vive |
|---|---|---|
| **`RecurringBooking`** | La **regla**: "cancha 3, martes 20:00, 60 min, Juan". La fuente de verdad | Para siempre, hasta que un humano la da de baja |
| **`Reservation`** | Las ocurrencias concretas. Una **proyección** de la regla | Sólo dentro del horizonte (90 días) |

Un job diario garantiza que **siempre** haya 90 días de reservas generadas hacia
adelante. No es "genero 90 días y en 3 meses se vence": es **"siempre hay 90 días
por delante"**, y la ventana se corre sola todos los días.

Si nadie toca nada durante cinco años, el turno de Juan sigue existiendo. Para
liberarlo hay que ir y darlo de baja a mano. **El silencio nunca libera un
turno.** Esa es la regla que ordena todo el resto del documento.

```
RecurringBooking (martes 20:00, vigenteHasta: null)
        │
        │  jobs/recurringBookings.js — todos los días
        ▼
  ┌─────────────── horizonte: hoy + 90 días ───────────────┐
  │ Reservation  Reservation  Reservation  Reservation ... │
  └────────────────────────────────────────────────────────┘
        ▲                                    ▲
        │                                    │
   se van jugando                    el job agrega las nuevas
   (pasan a completada)              a medida que la ventana avanza
```

### Por qué materializar y no expandir la regla al vuelo

La alternativa purista es no generar nada y calcular la disponibilidad
combinando reservas reales + expansión de reglas (estilo `RRULE` de iCal). Es
elegante e infinita por definición, pero para esta app es un mal negocio: todo
el sistema ya trabaja sobre documentos `Reservation` — el timeline por cancha,
`/stats`, caja, los recordatorios de 24 h, el índice único `{court, inicio}` que
cierra la carrera de concurrencia.

Un turno virtual no tiene `_id`: no se puede cancelar puntualmente, no se puede
cobrar, no se puede mandar a caja ni linkear desde una notificación. Habría que
tocar cada uno de esos lugares. Materializando, el resto de la app no se entera
de nada: son reservas normales con dos campos extra.

### El horizonte y la ventana pública ya encajan

`club.reservas.anticipacionMaximaDias` está en **15 días** por default
(`backend/src/models/Club.js`). Con un horizonte de 90 días, un jugador del
público **nunca** puede llegar al slot del cliente fijo: cuando se le abre la
ventana de reserva, la ocurrencia fija ya está creada desde hace más de dos
meses. El conflicto directamente no existe.

De ahí sale la única regla dura de configuración:

> **`RECURRING_HORIZON_DAYS` tiene que ser siempre mayor que
> `anticipacionMaximaDias`.**

Está validado en `updateClubHorarios`: si el complejo intenta poner una
anticipación igual o mayor al horizonte, el guardado se rechaza. Sin eso, mover
ese número de 15 a 120 abriría el agujero sin que nadie se diera cuenta.

El costo de materializar es despreciable: un turno semanal son ~13 reservas por
horizonte; 50 turnos fijos son ~650 documentos por complejo.

---

## 3. Modelo de datos

### `models/RecurringBooking.js`

```js
{
  club, court,                    // ref Club, ref Court
  client,                         // ref Client — el CRM que ya existe
  customer,                       // ref User, si además tiene cuenta
  guestName, guestPhone, guestEmail,

  diaSemanaUtc: 2,                // 0 = domingo … 6 = sábado, en UTC
  horaInicioUtc: '23:00',         // HH:MM en UTC, como horarios.semanal
  duracionMin: 60,

  precioPorTurno: 12000,

  vigenteDesde: Date,
  vigenteHasta: null,             // null = indefinido. El corazón del diseño
  estado: 'activo',               // activo | pausado | finalizado
  pausas: [{ desde, hasta }],     // vacaciones del cliente — ver 4.7

  materializadoHasta: Date,       // hasta dónde llegó el job
  conflictos: [{                  // fechas que el job no pudo generar — ver 4.2
    fecha, motivo, detectadoEn
  }],

  notas,
  creadoPor                       // ref User
}
```

Índices: `{ estado, materializadoHasta }` para la query del job, y
`{ club, estado, diaSemanaUtc, horaInicioUtc }` para el listado del panel.

### `models/Reservation.js` (dos campos nuevos)

```js
recurring: { type: ObjectId, ref: 'RecurringBooking', default: null },
esFijo:    { type: Boolean, default: false }
```

`esFijo` es redundante con `recurring != null`, pero ahorra un `populate` en el
timeline y en los listados, que es donde más se consulta.

Índice nuevo: `{ recurring: 1, inicio: 1 }`, que es exactamente la pregunta que
hace el job en cada corrida.

### Todo en UTC

**Decisión de arquitectura, no negociable: en la base no se guarda ni un solo
horario local.** El día que haya complejos fuera de Argentina, nada tiene que
cambiar de lugar.

Es además la convención que el sistema **ya usa**: `horarios.semanal` del club
guarda `horaInicio`/`horaFin` en UTC y `utils/timezone.js` convierte en los
bordes (`horariosToUtc` al escribir, `horariosToLocal` al responder). La regla
del turno fijo guarda exactamente igual: `diaSemanaUtc` + `horaInicioUtc`.

> **La trampa de convertir en UTC un día + una hora:** pasar de local a UTC puede
> **correr el día de la semana**. Un turno de los martes a las 21:30 en UTC−3 es
> **miércoles** 00:30 UTC. Por eso el par `(diaSemana, hora)` se convierte
> **junto y nunca campo por campo**: `ruleToUtc()` / `ruleToLocal()` en
> `utils/recurring.js` son los únicos que tocan esa conversión.

Sobre horario de verano: guardar la regla en UTC hace que, en un país con DST,
el turno se corra una hora cuando cambia el huso — la misma característica que
ya tiene `horarios.semanal` hoy. Es consistente y está aislado: cuando aparezca
el primer complejo con DST se arregla una vez en `utils/timezone.js` y quedan
cubiertos los dos casos a la vez.

### Dos decisiones más del modelo

**`vigenteHasta: null` es el estado normal, no un caso raro.** Es lo que
significa "turno fijo". Dar de baja = setear la fecha, no borrar el documento:
el historial del cliente se mantiene.

**El cliente se linkea al `Client` del CRM, no a un `User`.** Un cliente fijo
casi nunca tiene cuenta en la plataforma; lo carga el complejo por teléfono. El
`Client` ya deduplica por `(club, email)`.

---

## 4. Los casos que hay que resolver bien

### 4.1 Excepciones — "este martes no vengo"

No se toca la regla: se **cancela esa ocurrencia**. La reserva pasa a
`cancelada`, el slot queda libre y el complejo lo puede vender suelto.

**Esto ya funciona sin escribir una línea de backend.** Una ocurrencia es una
`Reservation` normal, así que la cancelan las tres puertas que ya existen:

| Quién | Endpoint |
|---|---|
| Admin o empleado del complejo | `PATCH /reservations/club/:clubId/:id/cancel` |
| Jugador con cuenta | `PATCH /reservations/my/:id/cancel` |
| Jugador invitado, por link | `PATCH /reservations/manage/:token/cancel` |

Las dos del jugador respetan `toleranciaCancelacionHoras` vía
`canCancelReservation()`; la del complejo no, igual que hoy. Emails,
notificación al club y liberación del horario salen del mismo camino de siempre.

Es la mejor señal de que el diseño es el correcto: el caso que motivó el feature
sale gratis.

> **La trampa:** el job tiene que preguntar *"¿existe alguna reserva para
> (recurring, inicio)?"* **incluyendo las canceladas**. Si sólo mira las
> activas, al día siguiente regenera la ocurrencia que el complejo acababa de
> liberar y el horario vuelve a aparecer ocupado.

Es el bug más fácil de escribir y el más molesto de diagnosticar, porque se
manifiesta un día después de la acción que lo causó.

### 4.2 Conflictos al materializar

El job quiere crear la ocurrencia y el slot ya está tomado por una reserva
suelta. Pasa en dos escenarios reales:

- se cargó un turno suelto a 120 días vista, antes de que existiera el fijo;
- el complejo cerró ese día (`diasEspeciales`) o el horario quedó fuera del
  rango semanal.

**Acá está el riesgo real del feature.** Si el job falla en silencio, el cliente
fiel pierde su turno y nadie se entera hasta que llega y la cancha está ocupada.
El job **nunca** pisa una reserva existente, pero tampoco puede callarse:

1. registra el conflicto en la regla (`conflictos: [{ fecha, motivo }]`);
2. dispara `notify(clubId, { tipo: 'sistema', ... })` — la campanita del
   backoffice que ya existe (`utils/notifications.js`);
3. el panel lo muestra en ámbar, tanto en el listado como en el contador del
   botón "Turnos fijos".

La resolución es manual y del complejo: cancelar la reserva suelta, mover al
cliente fijo de cancha, o aceptar que ese día no hay turno.

### 4.3 Alta con el horario ya ocupado

Mismo problema, pero en el momento de crear la regla. Por eso el alta hace un
**preview de conflictos** antes de confirmar: muestra las 13 fechas con su
estado (`libre` / `ocupado` / `cerrado` / `fuera_de_horario`). El complejo decide
si sigue igual (esas fechas quedan sin generar y marcadas) o cancela.

Nunca se resuelve automáticamente pisando reservas de otra gente.

### 4.4 Cambio de precio

El precio vive en la regla y se **copia** a cada reserva al materializar, así que
las ocurrencias ya generadas conservan el precio con el que nacieron.

Cuando el complejo sube la tarifa quedan hasta 90 días de reservas con el precio
viejo. El `PATCH` acepta `actualizarFuturas` para propagarlo a las fechas
futuras **no pagadas**. Las pagas no se tocan nunca.

### 4.5 Baja del turno fijo

`vigenteHasta = <fecha>` + `estado = 'finalizado'`, y se **cancelan** las
ocurrencias materializadas posteriores a esa fecha (no se borran: quedan como
`cancelada` para que el historial y las stats sean consistentes).

Es la **única** forma de que un turno fijo deje de existir. Sólo el dueño del
complejo puede hacerlo, y la UI confirma en dos pasos mostrando cuántos turnos
futuros se liberan.

### 4.6 Suscripción impaga del complejo

`utils/subscriptions.js` bloquea la carga de turnos nuevos cuando el complejo
debe (nivel 1 de la degradación, ver [suscripciones.md](./suscripciones.md)).

**El job materializa igual.** Un turno fijo ya comprometido no es un turno nuevo:
es un compromiso existente. Bloquearlo castigaría al cliente fiel por una deuda
del complejo, que es exactamente el escenario que este feature existe para
evitar. Lo que sí se bloquea con la suscripción impaga es **crear reglas
nuevas**.

Los estados que sí frenan la materialización son `cancelado`, `rechazado` y
`pendiente`: ahí el complejo no está operando.

### 4.7 Pausar

Un caso frecuente: el cliente se va de vacaciones un mes. `estado = 'pausado'` +
un rango de pausa; el job no genera dentro de ese rango y las ocurrencias ya
generadas se cancelan. Al volver a `activo`, la próxima corrida rellena.

Es distinto de la baja: la regla sigue viva y el horario sigue siendo de Juan a
partir de la fecha de vuelta.

---

## 5. El job

`backend/src/jobs/recurringBookings.js`, registrado en `jobs/index.js` junto a
los otros tres.

```
RECURRING_BOOKINGS_CRON = '15 4 * * *'   // 04:15, hora argentina
RECURRING_HORIZON_DAYS  = 90
```

Una vez por día alcanza y sobra: lo que se genera está a 90 días de distancia,
así que llegar un día tarde no le cambia nada a nadie. Se elige la madrugada
porque es cuando el proceso está más libre. A diferencia de los holds, acá no
importa la latencia; importa que **nunca** se saltee una corrida en silencio.

Pseudocódigo:

```
para cada regla con estado 'activo':
    fechas = ocurrencias(regla, desde: hoy, hasta: hoy + 90 días)
    existentes = Reservation.find({ recurring: regla._id,
                                    inicio: { $in: instantes(fechas) } })
                             // ← sin filtrar por estado. Ver 4.1
    para cada fecha sin reserva existente:
        si el club está cerrado ese día        → conflicto('cerrado')
        si hay solapamiento con otra reserva   → conflicto('ocupado')
        si no                                  → crear Reservation
    regla.conflictos = los de esta corrida     // recalculados, ver abajo
    regla.materializadoHasta = hoy + 90 días
    si hay conflictos NUEVOS → notify(club)
```

El escaneo arranca **siempre desde hoy**, no desde `materializadoHasta`. Son ~13
fechas por regla, así que el ahorro sería despreciable y la propiedad que se
gana es grande: el job **se auto-sana**. Un conflicto que se destrabó (el
complejo canceló la reserva que estorbaba) se genera solo en la corrida
siguiente, sin que nadie tenga que pedirlo.

Por eso mismo la lista de `conflictos` se **recalcula** entera en cada corrida en
vez de irse acumulando: lo que ya no está trabado desaparece solo. Lo único que
se preserva entre corridas es `detectadoEn`, y sirve para dos cosas: mostrar en
el panel hace cuánto que está trabado, y **notificar sólo los conflictos
nuevos**. Un aviso diario por el mismo problema se deja de leer, que es
exactamente lo que no queremos en el único mecanismo que avisa que un cliente
fijo está por perder su horario.

Propiedades que cumple:

- **Idempotente.** Correrlo dos veces el mismo día no crea nada nuevo. Lo
  garantiza el chequeo por `(recurring, inicio)` y, como backstop de base de
  datos, el índice único parcial `{court, inicio}` que ya existe en
  `Reservation`.
- **Aislado por regla.** Un error en una regla no frena las demás.
- **Ruidoso ante conflictos, mudo cuando todo sale bien.** Nadie quiere una
  notificación diaria diciendo "generé 3 turnos".

Para correrlo a mano (en local `JOBS_ENABLED=false` apaga los crons):

```
npm run jobs:recurring
```

### Sobre la "renovación"

Se puede tener un aviso suave — cada 6 meses, *"confirmá que Juan sigue viniendo
los martes"* — pero como **información, nunca como condición**. La falta de
respuesta no libera nada, no pausa nada y no vence nada.

Para el complejo, un turno fijo perdido por un vencimiento automático es
infinitamente más caro que un turno fijo fantasma que alguien tiene que borrar a
mano.

---

## 6. Piezas del código

### Backend

| Archivo | Rol |
|---|---|
| `models/RecurringBooking.js` | La regla |
| `models/Reservation.js` | Campos `recurring` y `esFijo` + índice `{recurring, inicio}` |
| `utils/recurring.js` | Ocurrencias y materialización. Toda la lógica de fechas vive acá |
| `jobs/recurringBookings.js` | Corrida diaria del horizonte + aviso de conflictos |
| `jobs/index.js` | Cron registrado (`15 4 * * *`) |
| `scripts/materializeRecurring.js` | `npm run jobs:recurring` |
| `controllers/recurringController.js` | CRUD de reglas + preview de conflictos |
| `routes/recurringRoutes.js` | `/recurring/club/:clubId` |
| `controllers/clubController.js` | Guard: `anticipacionMaximaDias < HORIZON_DAYS` |
| `controllers/reservationController.js` | **Sin cambios.** Cancelar una ocurrencia ya funcionaba tal cual (ver 4.1) |

`utils/recurring.js` es el archivo que importa. Toda la aritmética de fechas
—día de la semana, hora UTC a instante, días especiales, pausas— tiene que estar
ahí y en ningún otro lado. Es la parte del feature donde los bugs son sutiles y
difíciles de ver a ojo.

### Frontend

| Archivo | Rol |
|---|---|
| `services/recurringService.js` | Cliente de la API |
| `views/TurnosView.vue` | Botón "Turnos fijos" con contador y cableado |
| `components/turnos/ReservationCalendar.vue` | Chinche 📌 en los turnos fijos |
| `components/turnos/ReservationDrawer.vue` | Aviso "es fijo" + toggle "se repite todas las semanas" |
| `components/turnos/RecurringPreviewDialog.vue` | Las 13 fechas antes de crear |
| `components/turnos/RecurringListDrawer.vue` | Listado, conflictos, pausa y baja |

### La API

| Endpoint | Para qué |
|---|---|
| `GET /recurring/club/:clubId` | Listado, con día y hora ya traducidos a la zona del club |
| `POST /recurring/club/:clubId/preview` | Las 13 fechas con su estado, **sin escribir nada** |
| `POST /recurring/club/:clubId` | Alta. Materializa en el acto, no espera al cron |
| `PATCH /recurring/club/:clubId/:id` | Precio, notas, contacto, pausar/reanudar |
| `DELETE /recurring/club/:clubId/:id` | Baja. Sólo el dueño |

El alta toma el **instante** del turno que el complejo está mirando en el
timeline (`inicio` + `duracionMin`) y deriva de ahí el día y la hora UTC. Así el
alta es "hacé fijo este turno" y no hay ni una conversión de zona en el medio.

---

## 7. Cómo se probó

### El motor

Verificado contra la base local, 18 casos:

| Caso | Resultado |
|---|---|
| Regla nueva, corrida inicial | 13 turnos, `esFijo: true`, precio copiado, `confirmada` |
| Segunda corrida el mismo día | Cero turnos nuevos (idempotente) |
| Una semana después | Exactamente **1** turno nuevo al final del horizonte; la serie nunca se acorta |
| Cancelar una ocurrencia y volver a correr | **No** se regenera, y el horario queda libre para vender suelto |
| Slot ocupado por una reserva suelta | No se pisa; conflicto `'ocupado'` + aviso al complejo |
| Misma corrida repetida con el conflicto puesto | El aviso **no** se repite |
| Se destraba el conflicto | La ocurrencia se genera sola en la corrida siguiente |
| Conversión (día, hora) local ↔ UTC | Roundtrip cerrado en 7 días × 6 horas, incluido el caso que corre el día (martes 21:30 ART = miércoles 00:30 UTC) y una zona con DST |

### La API

Verificado sobre HTTP con el login del dueño demo, 12 casos: preview → alta (13
turnos generados) → listado → cancelar un día (la serie sigue activa) → pausar →
reanudar → rechaza finalizar por `PATCH` → baja (liberó los 12 futuros
restantes). Los turnos aparecen en el timeline con `esFijo` y el cliente queda
vinculado al CRM.

---

## 8. Fuera de alcance

Todo lo de acá abajo es **decidido, no pendiente**. Si algo se retoma, que sea
porque apareció el problema, no porque figuraba en una lista.

### Capacidades que el backend ya tiene y la UI no expone

Existen en la API y funcionan; simplemente no hay botón. Son las más baratas de
sumar si alguna vez hacen falta:

- **Pausa por rango de fechas.** `PATCH` acepta `pausas: [{desde, hasta}]` y el
  motor las respeta; el drawer hoy sólo pausa indefinidamente.
- **Editar precio y contacto** de una regla, con propagación opcional a las
  fechas futuras no pagadas (`actualizarFuturas`).

### Decisiones de comportamiento

- **La baja no le manda email al jugador.** Cancela los turnos futuros en
  silencio, a diferencia de la cancelación de un turno suelto. Es razonable
  porque una baja de turno fijo se habla antes por teléfono: el email llegaría
  después de la conversación y sólo repetiría lo ya acordado. Si alguna vez se
  suma, va con un solo email por la serie y no uno por cada turno liberado.
- **Resolver un conflicto es manual.** El complejo ve la fecha trabada en el
  listado y la busca en el calendario. Saltar directo al día sería cómodo, pero
  el aviso ya cumple lo importante: que nadie se entere tarde.
- **Mover el día o la hora de una regla no se puede por `PATCH`.** Es dar de baja
  una y crear otra: hacerlo en un `PATCH` dejaría la serie ya generada apuntando
  a un horario que la regla no describe.

### Lo que no se va a hacer

- **Frecuencias que no sean semanales.** Cada 15 días y mensual se pueden sumar
  después sin cambiar el modelo (un campo `frecuencia`), pero el 95% de los
  turnos fijos de un complejo son semanales.
- **Cobro mensual del fijo.** Por ahora el fijo se paga en el mostrador:
  `pago.estado` queda en `'no_requerido'` y el complejo registra el ingreso por
  Caja como cualquier turno presencial. Meter MercadoPago acá abre la pregunta
  de qué pasa cuando el cliente no paga el mes —y la respuesta comercial de eso
  todavía no está definida.
- **Turnos fijos desde la web pública.** Un fijo se negocia hablando: precio,
  permanencia, forma de pago. No es un botón.
- **Lista de espera** para cuando un fijo libera una fecha puntual.
