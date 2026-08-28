# Turnos

Es la pantalla donde vas a pasar casi todo el tiempo. Muestra el día completo, una columna por cancha, con cada turno en su horario.

![La grilla del día. Cada columna es una cancha y cada bloque, un turno.](/img/turnos-dia.jpg)

## Cómo leer la grilla

- **Las columnas** son tus canchas, agrupadas por deporte y con el color del deporte.
- **Las horas sombreadas** (con rayitas) son las que están fuera de tu horario de atención. Se pueden cargar turnos ahí igual, pero te está avisando que a esa hora, según [Horarios](/panel/horarios), el complejo está cerrado.
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
| **Teléfono** | Obligatorio: es con lo que lo ubicás si hay que avisarle algo |
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

## Exportar a CSV

El ícono de descarga (al lado de "Turnos fijos") baja lo que estás viendo —el día o la semana— como archivo CSV, para abrir en Excel o Google Sheets. Ahí sí van **todos** los turnos, cancelados incluidos.

## Turnos que entran solos

Los turnos que reservan tus clientes desde tu [link público](/reservas-online/link-de-reservas) aparecen en esta misma grilla, sin que tengas que hacer nada. Además te avisamos por la campanita y por email.

Si tenés [MercadoPago conectado](/reservas-online/mercadopago), el turno entra como **pendiente** mientras el cliente paga y pasa a **confirmada** cuando el pago se acredita. Si no paga en 15 minutos, el horario se libera solo.
