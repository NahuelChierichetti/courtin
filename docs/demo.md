# Complejo de demostración

Cómo mostrar CourtIn funcionando en una llamada con un prospecto, sin cargar sus
canchas y sin que el complejo de mentira aparezca en el buscador.

---

## 1. El problema que resuelve

`Club.publicado` es un opt-in con dos estados y ninguno servía para una demo,
porque `filtroClubVisible()` (`utils/subscriptions.js`) se usa tanto para listar
clubes como para resolver la ficha por slug:

| | Sale en el buscador | Link `/club/<slug>` |
|---|---|---|
| `publicado: false` | no | **404** — no hay flujo que mostrar |
| `publicado: true` | **sí** | sí — un jugador real reserva una cancha que no existe |

Por eso existe **`Club.demo`**, ortogonal a `publicado`:

- El club está publicado: el link funciona y la reserva es real de punta a punta.
- Queda fuera del **descubrimiento**: no sale en el buscador ni aporta su ciudad
  al filtro. Sólo llega quien tiene el link.

La regla al agregar consultas públicas nuevas:

- La consulta **lista** clubes → `filtroClubDescubrible()`
- La consulta **resuelve** un club que ya te dieron por slug → `filtroClubVisible()`

Además, la ficha de un club `demo` muestra un aviso arriba de todo ("Complejo de
demostración... no reserves acá esperando jugar"), y el slug está en
`frontend/public/robots.txt` para que no lo indexe Google si el link circula.

---

## 2. Dejarlo armado

```bash
# Local
npm run seed:demo-club -- --password=demo1234

# Producción (hay que pedirlo explícito)
npm run seed:demo-club -- --prod --password='<una que elijas>'
```

El script (`src/scripts/seedDemoClub.js`) es **idempotente y no borra nada por su
cuenta**: se puede correr contra producción y volver a correr antes de cada demo.
Lo que ya existe se actualiza; lo que falta se crea.

Sin `--password` genera una al azar y **la imprime una sola vez**. Si el usuario
ya existe y no pasás contraseña, no la toca: la que anotaste sigue valiendo.

Deja armado:

| Pieza | Detalle |
|---|---|
| Club | `CourtIn Demo`, slug `demo-courtin`, `demo: true`, `publicado: true`, estado `activo` |
| Dueño | `courtinapp+demo@gmail.com`, con `emailVerifiedAt` puesto |
| Suscripción | Vigencia a 10 años |
| Canchas | 2 de pádel, 1 de tenis, 1 de fútbol 5 (⇒ plan Pro) |
| Cobro | **Pago en el complejo**: MercadoPago sin conectar |
| Datos | Una semana de turnos y 8 movimientos de caja |

> ⚠️ La suscripción a 10 años **no es adorno**. Un club sin suscripción cae en
> `inactivo` en el primer barrido del cron de dunning
> (`utils/subscriptions.js → estadoPorSuscripcion`), sale de los estados visibles
> y el link público deja de funcionar. Si algún día alguien "limpia" esa
> suscripción, la demo se rompe sola a la mañana siguiente.

El `+demo` del email es plus-addressing de Gmail: entra igual a
**courtinapp@gmail.com**, así que durante la demo se puede mostrar el aviso de
nueva reserva llegando de verdad a la casilla.

### Refrescar antes de una demo

Los turnos de ejemplo son relativos a *hoy*. Si pasaron semanas desde la última
vez, la grilla se ve vacía:

```bash
npm run seed:demo-club -- --prod --refresh
```

`--refresh` borra **sólo** los turnos, la caja y los clientes de ese club y los
vuelve a generar. Sin el flag, los datos existentes quedan intactos.

---

## 3. El guion de la demo

El cobro está en **pago en el complejo**, así que el flujo completo es real y no
hay plata de por medio en ningún paso.

1. **El panel.** Entrás a `/panel/login` con el usuario demo. Grilla de turnos
   del día, caja con movimientos, reportes con datos.
2. **El link público.** Abrís `/club/demo-courtin` en otra pestaña — es el link
   que el complejo comparte por WhatsApp o pone en su Instagram.
3. **La reserva, en vivo.** Elegís cancha y horario y reservás **con tu propio
   email**. Se deja libre la tarde de hoy y de mañana justamente para esto.
4. **El email.** Le llega la confirmación al jugador y el aviso de nueva reserva
   al complejo (las dos a courtinapp@gmail.com).
5. **La vuelta al panel.** Refrescás la grilla: el turno ya está tomado, el
   cliente quedó cargado y la reserva figura en caja.

Cada demo deja un `Client` y un turno más en el club. Se limpia con `--refresh`.

### Si algún día querés mostrar el pago online

Hay que conectar una **cuenta de prueba de vendedor** de MercadoPago al club
demo por el mismo OAuth de siempre, y pagar con tarjetas de test. El webhook, el
hold de 15 minutos y la confirmación automática corren igual que en producción,
sin dinero real. Ver [pagos.md](./pagos.md).

---

## 4. Los pedidos de demo de la landing

El formulario de `/complejos#agendar` (`POST /api/public/demos`) guarda un `Lead`
y nos manda un aviso a la casilla de `CONTACT_EMAIL` (default
`courtinapp@gmail.com`), con `replyTo` apuntando a quien lo completó.

El lead se guarda **antes** de mandar el mail: el envío es best-effort y nunca
lanza, así que si Resend falla el contacto igual queda registrado. Un lead con
`avisado: false` es uno del que no nos enteramos por email — vale la pena
mirarlos de vez en cuando.
