# Turnos fijos

Un turno fijo es el cliente de todas las semanas: "Juan, martes a las 20, cancha 3". Lo cargás una vez y el horario le queda reservado **para siempre**, sin fecha de vencimiento y sin que nadie tenga que acordarse de renovarlo.

::: tip La regla que ordena todo
**El silencio nunca libera un turno fijo.** Si nadie toca nada durante cinco años, el turno de Juan sigue existiendo. Para liberarlo hay que darlo de baja a mano.
:::

## Crear uno

Se crea desde el mismo formulario que un turno normal. En **Turnos → Nuevo turno**, cargá los datos del cliente, la cancha, el día y la hora del **primer** turno, y tildá **Se repite todas las semanas**.

El **teléfono es obligatorio**, igual que en un turno suelto y por más motivo todavía: un fijo son tres meses de turnos por delante, y si un día tenés que avisar que la cancha está rota o que cambia el horario, es lo único con lo que ubicás a esa persona.

El día de la semana y el horario salen de la fecha que pusiste: si elegiste un viernes a las 21:00, el turno fijo va a ser todos los viernes a las 21:00.

## Revisá las fechas antes de confirmar

Al guardar no se crea nada todavía: primero te mostramos las próximas fechas que se van a generar.

![Antes de crear nada, la lista de fechas con su estado.](/img/turno-fijo-preview.jpg)

Si alguna fecha ya está ocupada por otro turno, o cae un día que tenés cerrado, te lo avisa acá:

![Una fecha trabada: ese día ya hay otro turno en esa cancha.](/img/turno-fijo-conflicto.jpg)

Podés **crearlo igual**: el resto de la serie se genera normalmente y esa fecha queda marcada para que la resuelvas. Nunca pisamos automáticamente la reserva de otra persona.

## Cómo funciona por debajo

Vale la pena entenderlo porque explica todo lo demás:

- Lo que guardás es **la regla** ("todos los viernes a las 21, cancha 3"). La regla no vence.
- A partir de la regla se generan **turnos normales**, siempre con **90 días por delante**. La ventana avanza sola todos los días.
- Esos turnos son turnos comunes: los ves en la grilla, los podés cancelar de a uno, cobrar, y salen en tus reportes.

En la grilla se distinguen por el ícono de chinche 📌.

Como se generan con 90 días de anticipación y tus clientes sólo pueden reservar con 15 días (o lo que hayas puesto en [Horarios](/panel/horarios#ajustes-de-reserva)), **nadie del público puede quedarse con el horario de tu cliente fijo**. Cuando se le abre la ventana de reserva, el turno ya está tomado desde hace más de dos meses.

## La lista de turnos fijos

El botón **Turnos fijos** de la barra superior abre la lista completa. El número al lado te dice cuántos hay activos, y se pone en ámbar cuando alguno tiene fechas trabadas.

![Cada turno fijo con su día, hora, cancha y precio. El aviso ámbar marca una fecha que no se pudo generar.](/img/turnos-fijos-lista.jpg)

Desde cada tarjeta podés:

- **Pausar** — el cliente se va de vacaciones. Los turnos del período se liberan y el horario vuelve a ser suyo cuando reactivás. La regla sigue viva.
- **Dar de baja** — se termina la serie. Los turnos futuros se cancelan y el horario queda libre. Es definitivo, así que te pide confirmar y te dice cuántos turnos se liberan.

**Dar de baja es la única forma de que un turno fijo deje de existir**, y sólo lo puede hacer el administrador del complejo.

## Casos de todos los días

### "Este martes no vengo"

No toques el turno fijo. Andá a la grilla, abrí **ese** turno y cancelalo como cualquier otro. El horario queda libre para vender suelto y la semana que viene el turno de Juan sigue estando.

### Fechas trabadas

Cuando no podemos generar una fecha —porque el horario ya está ocupado o porque ese día cerrás— la marcamos en ámbar en la lista y te avisamos por la campanita.

Lo resolvés vos: cancelás la reserva que estorba, movés al cliente fijo a otra cancha, o aceptás que ese día no hay turno. En cuanto liberás el horario, la fecha se genera sola.

### Subir el precio

El precio vive en la regla y se copia a cada turno al generarlo. Si subís la tarifa, quedan hasta 90 días de turnos ya generados con el precio viejo, así que revisá la grilla si querés que el aumento arranque antes.

Los turnos que ya fueron pagados no se tocan nunca.

### Si te atrasás con el abono de CourtIn

**Los turnos fijos se siguen generando.** Un turno fijo no es un turno nuevo: es un compromiso que ya existía, y no vamos a castigar a tu cliente más fiel por una deuda tuya. Lo que sí se bloquea mientras haya deuda es **crear reglas nuevas**.
