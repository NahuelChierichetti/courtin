# Control de caja

El libro de caja del complejo: toda la plata que entra y sale, no sólo la de los turnos. El kiosco, el alquiler de paletas, la reposición de mercadería y el retiro al banco van todos acá.

![Los totales del período arriba, los cortes por categoría y método en el medio, y el detalle abajo.](/img/caja.jpg)

## Qué muestra

Arriba elegís el período: **Hoy**, **7 días** o **Este mes**. Todo lo de abajo se recalcula.

- **Ingresos**, **Egresos** y **Balance neto** del período, más cuántos movimientos hubo.
- **Ingresos por categoría** — de dónde viene la plata.
- **Ingresos por método** — en qué forma te la pagan. Es el número que te dice cuánto efectivo deberías tener en la caja física.
- **Movimientos** — el detalle, filtrable por **Todos / Ingresos / Egresos**.

## Lo que se anota solo

Cuando un cliente paga una reserva online con [MercadoPago](/reservas-online/mercadopago), el ingreso se registra acá **automáticamente**, en cuanto el pago se acredita.

::: warning Se anota lo que efectivamente cobraste
Si cobrás una **seña del 50 %** de un turno de $16.000, en caja entran **$8.000**, no $16.000. Los otros $8.000 entran el día que los cobrás en el mostrador — y ese movimiento sí lo cargás vos, con la categoría **Saldo de reserva**.
:::

Todo lo demás lo cargás a mano.

## Registrar un movimiento

Botón **Registrar movimiento**, arriba a la derecha.

![Primero el tipo, después la categoría. El resto son dos campos.](/img/caja-movimiento.jpg)

1. **Tipo** — Ingreso o Egreso. Cambia las categorías que te ofrece.
2. **Categoría**:

   | Ingresos | Cuándo |
   |---|---|
   | **Pago de reserva** | Un turno cobrado en el mostrador |
   | **Saldo de reserva** | El resto de un turno que ya tenía seña |
   | **Alquiler** | Paletas, pelotas, pecheras |
   | **Venta** | Kiosco, bebidas, todo lo que no es cancha |
   | **Otro** | Lo que no entra en ninguna |

   | Egresos | Cuándo |
   |---|---|
   | **Gasto** | Mercadería, mantenimiento, servicios |
   | **Retiro de caja** | Plata que sacás de la caja (al banco, a tu bolsillo) |
   | **Otro** | Lo que no entra en ninguna |

3. **Monto**
4. **Concepto** — opcional pero muy recomendable. Dentro de tres semanas, "Gasto $14.500" no te dice nada; "Reposición kiosco" sí.
5. **Método** — Efectivo, MercadoPago, Tarjeta, Transferencia u Otro.
6. **Fecha** — por defecto hoy. Cambiala si estás cargando algo de ayer.

Para borrar un movimiento cargado por error, usá el tacho de su fila.

## Cómo usarla en el día a día

**Al cerrar el día**, poné el período en **Hoy** y mirá **Ingresos por método**. Lo que dice "Efectivo" es lo que tiene que haber en la caja física. Si no coincide, algo no se cargó.

**Registrá los egresos en el momento.** Es lo primero que se olvida y lo que hace que a fin de mes los números no cierren.

**Balance neto no es tu ganancia.** Es cuánta plata se movió en el período. Un retiro al banco lo deja en rojo y no significa que hayas perdido plata.

## Caja o Reportes

Se parecen pero responden preguntas distintas:

| | Para qué | Incluye |
|---|---|---|
| **[Caja](/panel/caja)** | Cuadrar el día. Cuánta plata hay | Todo movimiento de dinero: turnos, kiosco, gastos, retiros |
| **[Reportes](/panel/reportes)** | Entender el negocio. Ocupación, ticket promedio, mejores clientes | Sólo lo que tiene que ver con turnos y facturación |
