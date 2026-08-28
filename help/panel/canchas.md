# Canchas y precios

Acá vive la definición de cada cancha: qué deporte es, cuánto dura un turno y cuánto sale. Es lo primero que hay que cargar, porque sin canchas no hay turnos ni horarios que ofrecer.

![Una tarjeta por cancha, con el deporte, la superficie y el precio.](/img/canchas.jpg)

Los botones de arriba filtran por deporte. El lápiz de cada tarjeta abre la edición.

## Crear o editar una cancha

![La ficha de una cancha. Todo lo que define cómo se vende ese espacio.](/img/cancha-editar.jpg)

| Campo | Qué define |
|---|---|
| **Nombre** | Cómo la llamás vos y cómo la ve tu cliente. Usá el nombre real ("Cancha 3", "Pádel Blindex 1") |
| **Deporte** | Sale de los deportes habilitados para tu complejo. Define el color en la grilla y agrupa las canchas |
| **Superficie** | Opcional. Con **Otra…** escribís la tuya |
| **Cubierta / Descubierta** | Tus clientes lo miran cuando amenaza lluvia |
| **Jugadores por equipo** | Sólo para deportes de equipo (F5, F7, F11) |
| **Duración del turno** | 60, 90 o 120 minutos |
| **Reservable online** | Si se puede reservar desde tu link público |
| **Precio por hora** | La tarifa base |

### La duración del turno

Define **cómo se le ofrecen los horarios a tus clientes**. Con 90 minutos, los horarios libres salen cada 90 minutos: 08:00, 09:30, 11:00…

Se configura por cancha, no por complejo, para que puedas tener pádel de 90 y fútbol de 60 en el mismo lugar.

Desde el panel podés cargar un turno de cualquier duración, aunque no coincida con la de la cancha.

### Reservable online

Apagalo para una cancha que querés manejar sólo vos: sigue en la grilla y le cargás turnos a mano, pero desaparece del link público.

Sirve para la cancha que está en refacción, la que reservás para escuelita, o la que preferís vender por teléfono.

## Precios

El precio es **por hora**, y el total del turno se calcula según la duración:

| Precio por hora | Duración | Total del turno |
|---|---|---|
| $16.000 | 60 min | $16.000 |
| $16.000 | 90 min | $24.000 |
| $16.000 | 120 min | $32.000 |

Cuando cargás un turno, el precio viene calculado así y lo podés pisar a mano si le hacés un precio especial a alguien.

### Tarifas por franja

Casi ningún complejo cobra lo mismo un martes a las 10 de la mañana que un viernes a las 21. Para eso está **Diferenciar por día/horario**.

![Con el interruptor prendido, cada franja es una combinación de días, horario y precio.](/img/cancha-tarifas.jpg)

Cada franja tiene tres cosas:

1. **Días** — tocá los que apliquen, o usá los atajos **Lun a Vie**, **Finde**, **Todos**.
2. **Desde / Hasta** — el rango horario. Dejalo vacío para que valga todo el día.
3. **Precio por hora** de esa franja.

Debajo de cada franja hay un resumen en verde que te dice en criollo qué configuraste. Leelo antes de guardar: es la forma más rápida de darte cuenta de que te equivocaste.

Con **Agregar franja** sumás las que necesites. Un armado típico:

| Días | Horario | Precio/h |
|---|---|---|
| Lun a Vie | 08:00 – 18:00 | $14.000 |
| Lun a Vie | 18:00 – 23:59 | $18.000 |
| Sáb y Dom | todo el día | $20.000 |

::: tip Cubrí todos tus horarios
Si una hora no cae en ninguna franja, esa cancha no tiene precio a esa hora. Revisá que el conjunto de franjas cubra todo tu horario de atención.
:::

## Desactivar o eliminar

Son dos cosas distintas y casi siempre querés la primera.

**Desactivar** (abajo a la izquierda de la ficha) saca la cancha de la grilla y del link público, pero no toca nada de lo que ya pasó. Es para la cancha en refacción o la que dejás de alquilar por temporada. La volvés a activar cuando quieras.

**Eliminar** (el tacho de la tarjeta) la da de baja. Los turnos y los reportes históricos se conservan.

::: warning Los turnos futuros no se cancelan solos
Ni desactivar ni eliminar cancela los turnos que ya estaban reservados en esa cancha. Si vas a sacar una cancha de circulación, revisá antes la grilla y avisale a la gente que tenía turno.
:::

## El límite de tu plan

Tu plan define cuántas canchas activas podés tener:

| Plan | Canchas |
|---|---|
| Start | hasta 3 |
| Pro | hasta 6 |
| Elite | 7 o más, sin tope |

Cuando llegás al límite, el botón **Nueva cancha** queda deshabilitado y te lo dice. Para subir de plan, entrá a [Suscripción](/cuenta/suscripcion).

Todas las funciones están en todos los planes: lo único que cambia es cuántas canchas entran.
