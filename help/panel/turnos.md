# Turnos

Es la pantalla donde vas a pasar casi todo el tiempo. Muestra el día completo, una columna por cancha, con cada turno en su horario.

![La grilla del día. Cada columna es una cancha y cada bloque, un turno.](/img/turnos-dia.jpg)

## Cómo leer la grilla

- **Las columnas** son tus canchas, agrupadas por deporte y con el color del deporte.
- **Las horas sombreadas** (con rayitas) son las que están fuera de tu horario de atención. Ahí **no se pueden cargar turnos**: si lo intentás, te avisa que el horario queda fuera de lo que configuraste en [Horarios](/panel/horarios). Para usar esa franja hay que ampliar el horario del día o cargar un [día especial](/panel/horarios#dias-especiales).
- **La línea horizontal** marca la hora actual. Sólo aparece si estás mirando el día de hoy.
- **Los turnos ya pasados** se ven apagados.

Arriba de todo, cuatro números que resumen lo que estás viendo: **turnos del día**, **confirmados**, **pendientes** e **ingresos estimados**.

::: info Los turnos cancelados no se dibujan
La grilla representa **ocupación**: si un turno está cancelado, ese horario está libre para volver a vender y por eso desaparece de la pantalla. No se perdió: sigue en el historial del cliente, en la exportación a CSV y en las notificaciones.
:::

## Moverte por el calendario

Arriba a la izquierda están las flechas de **día anterior / siguiente** y el selector de fecha. Al lado, el cambio entre las dos vistas:

- **Día** — todas tus canchas, un solo día. Es la vista del mostrador.
- **Semana** — una sola cancha, los siete días. Sirve para ver cómo viene la ocupación de una cancha puntual.

![En vista semanal las columnas son los días de la semana, y arriba elegís de qué cancha.](/img/turnos-semana.jpg)

El desplegable de canchas es el único filtro de la pantalla. En vista de día podés elegir **Todas las canchas**; en vista semanal siempre hay que elegir una.

![Las canchas salen agrupadas por deporte, con su color.](/img/turnos-filtro-cancha.jpg)

## Cargar un turno

Hay dos maneras, y las dos terminan en el mismo formulario.

**Con el botón "Nuevo turno"** (arriba a la derecha) — te abre el formulario en blanco, con la fecha del día que estás mirando.

**Doble click en un hueco vacío de la grilla** — más rápido: te abre el formulario con la cancha y la hora ya puestas, las del hueco que tocaste.

![El formulario de un turno nuevo. Los campos con asterisco son obligatorios.](/img/turnos-nuevo.jpg)

Qué va en cada campo:

| Campo | Detalle |
|---|---|
| **Cliente** | Nombre y apellido. Obligatorio |
| **Teléfono** | Obligatorio. Es con lo que lo ubicás si hay que avisarle algo, y lo que habilita los avisos [por WhatsApp](#avisar-por-whatsapp). Escribilo con característica: `221 456 7890` |
| **Email** | Opcional, pero es lo que identifica a un cliente. Si lo cargás, el turno se le suma a su ficha en [Clientes](/panel/clientes) y le llega la confirmación por mail |
| **Cancha**, **Fecha**, **Desde**, **Hasta** | Debajo de la fecha te recuerda el horario de atención de ese día |
| **Estado** | Ver abajo |
| **Precio** | Viene calculado según la cancha y la duración. Lo podés pisar a mano |
| **Se repite todas las semanas** | Lo convierte en un [turno fijo](/panel/turnos-fijos) |
| **Notas** | Observaciones internas. No las ve el cliente |

### Los tres estados

- **Pendiente** — el horario está tomado pero el turno no está cerrado. Es lo que usás cuando alguien "lo va a confirmar más tarde". Sale en amarillo.
- **Confirmada** — el turno va. Es el estado por defecto.
- **Completada** — ya se jugó. No hace falta que lo marques a mano.

Un turno pendiente **ocupa el horario igual**: nadie más puede reservarlo mientras esté así.

## Editar, mover y cancelar

**Doble click sobre un turno** abre su ficha, con los mismos campos que al crearlo. Desde el celular o una tablet, alcanza con tocarlo una vez.

![La ficha de un turno cargado. Abajo a la izquierda, "Cancelar turno".](/img/turnos-editar.jpg)

**Arrastrar un turno** lo mueve: para arriba o abajo le cambia el horario (de a 30 minutos), y a otra columna lo pasa a otra cancha. Es la forma más rápida de resolver un "¿me lo podés pasar una hora más tarde?".

**Cancelar turno** está abajo a la izquierda de la ficha. El horario vuelve a estar libre y, si el cliente dejó su email, le llega el aviso.

::: warning Cancelar no devuelve la plata
Si el turno tenía un pago online, cancelarlo **no** dispara la devolución. Es a propósito: cada complejo tiene su propia política de señas y devolver de más no se puede deshacer. La devolución se hace aparte, con el botón **Devolver pago** de la misma ficha — está explicado en [Señas y devoluciones](/reservas-online/senas-y-devoluciones).
:::

Si el turno viene de un [turno fijo](/panel/turnos-fijos), la ficha te lo aclara arriba: cancelarlo ahí libera **sólo ese día**, no la serie.

## Avisar por WhatsApp

En la ficha de un turno **confirmado** hay un bloque verde con dos botones:

- **Confirmación** — para mandar apenas cargás el turno. Lleva cancha, día, horario y precio.
- **Recordatorio** — para el día anterior o unas horas antes. Es más corto y le pide que avise si no puede venir, así liberás el horario a tiempo.

![El bloque verde aparece en la ficha del turno, justo debajo de los datos del cliente.](/img/turnos-whatsapp.jpg)

Al tocar cualquiera de los dos se te abre WhatsApp con el mensaje **ya escrito** en el chat de esa persona. Lo podés editar antes de mandarlo, y el envío lo hacés vos apretando Enviar.

::: info No es un envío automático
CourtIn no manda mensajes de WhatsApp solo, ni sabe si llegaron. Lo que hace es abrirte la conversación con el texto listo, que es lo que te ahorra escribir lo mismo veinte veces por día.

Desde la computadora se abre **WhatsApp Web**, así que necesitás tenerlo vinculado con tu celular. Desde el celular se abre la app directamente.
:::

Por qué sólo en los turnos confirmados: un turno **pendiente** todavía está esperando el pago y confirmarlo por WhatsApp sería prometer un horario que se puede liberar solo; uno **cancelado** o **completado** ya no se va a jugar. Si pasás el turno a confirmada, guardás y lo volvés a abrir, los botones aparecen.

Si en lugar del bloque verde ves un recuadro gris, es porque ese turno **no tiene un teléfono al que se le pueda escribir**: o está vacío, o quedó escrito de una forma que WhatsApp no reconoce. Corregilo en el campo Teléfono, guardá, y los botones aparecen.

::: tip El mail y el WhatsApp no compiten
La confirmación por email sale sola cuando el cliente dejó su dirección. El WhatsApp es para el cliente que sólo te dejó el teléfono —que en la mayoría de los complejos son casi todos— y para el recordatorio, que por mail se lee mucho menos.
:::

## Exportar a CSV

El ícono de descarga (al lado de "Turnos fijos") baja lo que estás viendo —el día o la semana— como archivo CSV, para abrir en Excel o Google Sheets. Ahí sí van **todos** los turnos, cancelados incluidos.

## Turnos que entran solos

Los turnos que reservan tus clientes desde tu [link público](/reservas-online/link-de-reservas) aparecen en esta misma grilla, sin que tengas que hacer nada. Además te avisamos por la campanita y por email.

Si tenés [MercadoPago conectado](/reservas-online/mercadopago), el turno entra como **pendiente** mientras el cliente paga y pasa a **confirmada** cuando el pago se acredita. Si no paga en 15 minutos, el horario se libera solo.
