# Cobrar con MercadoPago

Conectando tu cuenta de MercadoPago, tus clientes pagan al reservar. Es la diferencia entre una reserva y una promesa.

::: tip La plata es tuya y va directo a tu cuenta
CourtIn **no toca el dinero de tus reservas**. Creamos el cobro en tu nombre y la plata cae en tu cuenta de MercadoPago. No cobramos comisión sobre lo que facturás: nuestro negocio es el abono mensual.

La comisión de MercadoPago sí corre por tu cuenta, como en cualquier cobro que hagas por ahí.
:::

## Conectar tu cuenta

**Configuración → Pagos → Conectar.**

![La solapa Pagos. MercadoPago aparece como "No conectado" hasta que lo vincules.](/img/config-pagos.jpg)

Se abre el panel de configuración del cobro:

![Todo lo que define cómo cobrás, en una pantalla.](/img/config-mercadopago.jpg)

1. Tocá **Conectar con MercadoPago**.
2. Te llevamos a MercadoPago para que inicies sesión con **tu** cuenta y autorices a CourtIn a cobrar en tu nombre.
3. Volvés al panel con la cuenta ya vinculada.

::: warning Iniciá sesión con la cuenta correcta
Si tenés otra sesión de MercadoPago abierta en el navegador, vas a terminar vinculando esa cuenta. Cerrá sesión antes, o hacelo desde una ventana de incógnito.
:::

Sólo el **administrador** del complejo puede conectar o desconectar la cuenta.

## Decidir qué cobrás

Debajo de la conexión están las dos decisiones que definen cómo cobrás.

### El turno completo o una seña

- **El turno completo** — el cliente paga el 100 % por adelantado.
- **Una seña** — paga una parte al reservar y el resto en el complejo. Es la opción por defecto, con **50 %**.

La seña se define en **porcentaje** o en **monto fijo**. Debajo te mostramos un ejemplo con un turno real de tu complejo, para que veas cuánto paga y cuánto queda.

La seña es el punto medio que funciona para casi todos: filtra al que reserva y no aparece, sin espantar al que no quiere pagar todo por adelantado.

### Permitir reservar sin pagar

Un interruptor:

- **Prendido** — el cliente elige entre pagar online o pagar al llegar al complejo.
- **Apagado** — para reservar hay que pagar. Es lo que baja de verdad los turnos que nadie usa.

::: warning Sin la cuenta conectada, todo entra como "pagar en el complejo"
Este interruptor no hace nada mientras no tengas MercadoPago vinculado: sin cuenta conectada no hay forma de cobrar online.
:::

Terminá con **Guardar cambios**.

## Qué pasa cuando alguien paga

1. El cliente elige su horario y confirma. El turno entra como **pendiente** y **el horario le queda bloqueado 15 minutos** mientras paga.
2. Va al checkout de MercadoPago y paga.
3. Cuando el pago se acredita, todo pasa de golpe:
   - el turno pasa a **confirmada**;
   - el ingreso se anota en [Caja](/panel/caja);
   - el cliente queda registrado en [Clientes](/panel/clientes);
   - te avisamos por la campanita y por email;
   - al cliente le llega su confirmación.

Si no paga dentro de los 15 minutos, el turno se cancela solo y el horario vuelve a estar disponible. No tenés que hacer nada.

::: tip Con seña, en caja entra la seña
Un turno de $16.000 con seña del 50 % anota **$8.000** en caja, que es lo que efectivamente cobraste. Los otros $8.000 los cargás vos como movimiento de **Saldo de reserva** el día que los cobrás en el mostrador.
:::

## Devolver un pago

Se hace desde la ficha del turno, con el botón **Devolver pago**. Está explicado en **[Señas y devoluciones](/reservas-online/senas-y-devoluciones)**.

## Si algo no anda

| Qué ves | Qué pasó |
|---|---|
| **"El link expiró"** al conectar | Pasaron más de 10 minutos entre que apretaste Conectar y que autorizaste. Empezá de nuevo |
| **Cancelaste sin querer** en la pantalla de MercadoPago | Volvé a **Configuración → Pagos → Conectar** |
| **Vinculaste la cuenta equivocada** | Desconectala desde el mismo panel y volvé a conectar desde una ventana de incógnito |
| **Aparece "No conectado" de un día para el otro** | Se revocó el permiso desde tu cuenta de MercadoPago. Volvé a conectar; los turnos existentes no se tocan |
| **El cliente pagó y el turno sigue pendiente** | El aviso de MercadoPago puede demorar. Si pasan varios minutos, escribinos con el número de operación |

## Vale la pena

El turno que nadie usa es el costo más caro de un complejo: la cancha queda vacía en un horario que podrías haber vendido, y te enterás cuando ya es tarde.

Una seña del 30 % o 50 % cambia el comportamiento: el que paga, viene, y el que no iba a venir te libera el horario a tiempo para revenderlo.
