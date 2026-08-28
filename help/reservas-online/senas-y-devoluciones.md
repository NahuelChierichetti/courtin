# Señas y devoluciones

Qué pasa con la plata cuando un cliente que ya pagó cancela, y cómo devolvérsela.

## La regla principal

::: warning Cancelar un turno NO devuelve la plata
Son dos acciones separadas y deliberadamente distintas. Cancelás el turno y el horario queda libre; la plata sigue donde está hasta que vos decidas devolverla.

Está hecho así a propósito: cada complejo tiene su propia política de señas —hay quien devuelve todo, quien devuelve si avisan con 24 horas y quien no devuelve nunca— y **una devolución no se puede deshacer**. Ninguna regla automática puede acertarle a la política de todos los complejos, así que la decisión es tuya.
:::

## Devolver un pago

1. Andá a **[Turnos](/panel/turnos)** y abrí el turno (doble click sobre el bloque).
2. Arriba, en **Cobro online**, ves cuánto se pagó y en qué estado está.
3. Tocá **Devolver pago**.
4. Confirmá.

Tres cosas pasan al confirmar:

- MercadoPago le devuelve la plata al cliente, por el mismo medio con el que pagó.
- Se registra un **egreso** en [Control de caja](/panel/caja), para que tus números cierren.
- Al cliente le llega un email avisándole.

::: warning No tiene vuelta atrás
Una vez devuelto el dinero no hay forma de revertirlo desde el panel. Por eso te pedimos confirmar.
:::

**Sólo el administrador puede devolver un pago.** Un empleado ve el estado del cobro pero no tiene el botón: mueve plata de verdad.

Cuánto tarda en verlo el cliente depende de MercadoPago y del medio de pago: en dinero en cuenta suele ser inmediato, con tarjeta puede demorar varios días hábiles.

## La tolerancia para cancelar

En [Horarios → Ajustes de reserva](/panel/horarios#ajustes-de-reserva) definís **cuánto tiempo antes del turno puede cancelar un cliente sin costo**. Por defecto son 4 horas.

Lo que hace ese número:

- **Antes del límite**, el cliente puede cancelar solo desde su link.
- **Pasado el límite**, ya no puede: tiene que llamarte, y vos cancelás desde el panel si querés.

Lo que **no** hace: no dispara devoluciones. Un cliente que cancela dentro de la tolerancia libera el horario, pero la seña sigue tuya hasta que la devuelvas.

Esto te deja armar la política que quieras. Por ejemplo, "devuelvo la seña si cancelan con más de 4 horas": ponés la tolerancia en 4 y devolvés a mano los que aparecen cancelados. La cancelación te llega por la campanita, así que te enterás.

## Cobrar el saldo

Con seña, en [Caja](/panel/caja) entra sólo lo cobrado online. El resto lo cobrás en el mostrador y lo cargás vos:

**Caja → Registrar movimiento → Ingreso → Saldo de reserva**, con el monto y el método con el que te pagaron.

Es el paso que más se olvida y el que hace que a fin de mes la caja no cierre.

## Definir tu política

No hay una respuesta correcta, pero conviene que sea **una sola, escrita y conocida**. Tres opciones razonables:

| Política | Cómo se implementa | Para quién |
|---|---|---|
| **La seña no se devuelve** | No devolvés nada. La seña cubre el horario perdido | Complejos con mucha demanda, donde el horario se revende solo |
| **Se devuelve si avisan a tiempo** | Tolerancia en 4 o 24 horas; devolvés a mano los que cancelaron dentro | El punto medio, el más usado |
| **Se devuelve siempre** | Devolvés a mano toda cancelación | Complejos que están empezando y priorizan que la gente pruebe sin miedo |

Cualquiera que elijas, **escribila en la descripción de tu complejo** ([Configuración → Landing pública](/panel/configuracion#descripcion-y-servicios)). El cliente la lee antes de pagar y te ahorra la discusión después.
