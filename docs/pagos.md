# Cobro de reservas con MercadoPago

Cómo cobra cada complejo sus reservas online. Nada de esto tiene que ver con el
abono de CourtIn, que se cobra por fuera de la plataforma (ver
[suscripciones.md](./suscripciones.md)).

---

## 1. El modelo

Cada complejo conecta **su propia** cuenta de MercadoPago por OAuth. La plata de
las reservas cae directo en esa cuenta: CourtIn crea la preferencia de cobro en
nombre del complejo pero nunca toca el dinero.

| Decisión | Definición |
|---|---|
| Vinculación | OAuth marketplace. El complejo aprieta "Conectar" y autoriza a CourtIn |
| Qué se cobra | Total o seña (% o monto fijo), a elección de cada complejo. **Default: seña 50%** |
| Comisión de MercadoPago | La paga el complejo, como en cualquier cobro por MercadoPago. Se le muestra en el panel con datos reales de su último cobro |
| Pagar al llegar | Switch por complejo. Se puede apagar para exigir el pago online |
| Comisión de CourtIn | Implementada (`marketplace_fee`) pero en **0**: el negocio es el abono |
| Devoluciones | Manuales, con botón en el panel. No hay refund automático |
| Hold del horario | 15 minutos mientras dura el checkout |

---

## 2. El flujo

```
Jugador elige slot
   ↓ POST /public/clubs/:slug/reservations
   Reservation(pendiente, expiraEn=+15min) + Payment(pendiente) + preferencia MP
   ↓ initPoint
Checkout de MercadoPago ──────────────────┐
   ↓ back_url (cosmético)                 │ notification_url (autoritativo)
/reserva/:token?pago=success              ↓ POST /public/mp/webhook
   sondea hasta ver "confirmada"     valida firma → GET /v1/payments/{id}
                                          ↓ approved
                     confirmarPagoDeReserva(): estado=confirmada · caja ·
                                     cliente · campanita · emails
```

Tres reglas que gobiernan todo lo demás:

1. **El webhook es la única fuente de verdad.** El redirect del navegador no
   confirma nada: el jugador puede cerrar la pestaña o falsear la URL.
2. **No se confía en el body del webhook.** MercadoPago avisa con un id de pago;
   el estado real se lee de su API con el token del complejo.
3. **El turno se bloquea antes de pagar y expira solo.** La reserva nace
   `pendiente`, lo que hace que el índice único parcial de `Reservation` le
   guarde el slot. `jobs/reservationHolds.js` lo libera si nadie paga.

### Qué NO pasa hasta que el pago se acredita

Con pago online, la creación de la reserva **no** manda emails, **no** registra
caja y **no** avisa al complejo. Todo eso lo dispara
`confirmarPagoDeReserva()` (`utils/payments.js`), que es idempotente porque el
webhook llega varias veces por el mismo pago.

El ingreso en caja se anota por **lo efectivamente cobrado**: con seña entran
$5.400 y no los $13.500 del turno. El saldo entra cuando el complejo lo cobra en
el mostrador.

---

## 3. Piezas del código

| Archivo | Rol |
|---|---|
| `utils/secrets.js` | AES-256-GCM para los tokens de MercadoPago |
| `utils/mercadopago.js` | Cliente multi-tenant: OAuth, preferencias, pagos, refunds |
| `utils/payments.js` | `montoACobrar`, `confirmarPagoDeReserva`, reembolsos |
| `controllers/mercadopagoController.js` | OAuth (connect/callback/disconnect) y webhook |
| `models/Payment.js` | Un intento de cobro. `paymentId` único = idempotencia |
| `jobs/reservationHolds.js` | Libera los horarios de checkouts abandonados |

`Club.pagos.mp.accessToken` y `refreshToken` son `select: false`: sólo
`getClubAccessToken()` los lee, y es el único lugar que sabe que están cifrados
y cuándo vencen.

---

## 4. Puesta en marcha

> Los nombres de los menús del panel de MercadoPago cambian seguido. Los pasos
> describen **qué** hay que buscar; si una etiqueta no coincide, el concepto es
> el mismo.

### Regla que ordena todo: nada de `localhost`

MercadoPago tiene que poder **llegar** a dos URLs nuestras (el redirect de OAuth
y el webhook) y **redirigir** el navegador a una tercera (la vuelta del
checkout). Las tres tienen que ser HTTPS públicas. Con `http://localhost`
MercadoPago rechaza la creación de la preferencia, y el error se ve como
"No pudimos iniciar el pago".

Hay dos formas de resolverlo, y conviene elegir una antes de empezar:

| | Túneles en local | Contra el deploy |
|---|---|---|
| Cómo | ngrok para el backend (3000) **y** para el frontend (5173) | Render + Vercel, que ya son HTTPS |
| A favor | Se debuggea con breakpoints y logs a mano | Cero configuración de red |
| En contra | Las URLs cambian en cada reinicio de ngrok y hay que re-registrarlas | Cada cambio necesita un deploy |

**Recomendado: el deploy.** Las URLs son estables, así que se registran una sola
vez en MercadoPago; con ngrok gratis cambian en cada reinicio y hay que volver a
tocar el panel de MercadoPago cada vez. Se prueba con credenciales y usuarios de
prueba, así que no hay riesgo de mover plata real.

### Paso 1 — Crear la aplicación

1. Entrar a **mercadopago.com.ar/developers** con la cuenta de MercadoPago de
   CourtIn (no la de un complejo) → **Tus integraciones** → **Crear aplicación**.
2. Nombre: `CourtIn`.
3. Producto / solución: **Pagos online** → **Checkout Pro**.
4. Cuando pregunte si es un **marketplace** o si vas a cobrar en nombre de
   terceros, decir que **sí**. Eso es lo que habilita el flujo de OAuth: sin
   esto no vas a poder pedirle permiso a los complejos.
5. Guardar. Quedás en el detalle de la aplicación.

### Paso 2 — Copiar las credenciales

En el detalle de la aplicación, **Credenciales de producción**:

- **Client ID** → `MP_CLIENT_ID`
- **Client Secret** → `MP_CLIENT_SECRET`

Son las credenciales de la *aplicación*, no de una cuenta de cobro: sirven para
pedir permiso y para renovar tokens. El *access token* con el que se cobra sale
del OAuth de cada complejo y no se copia a mano en ningún lado.

### Paso 3 — Registrar la URL de redirect

En la aplicación, buscar **URLs de redirect** (a veces dentro de la
configuración de OAuth) y cargar:

```
https://<tu-backend>/api/public/mp/oauth/callback
```

Con Render sería `https://courtin-api.onrender.com/api/public/mp/oauth/callback`.

Tiene que coincidir **carácter por carácter** con `MP_REDIRECT_URI`: si sobra una
barra al final o cambia `http` por `https`, MercadoPago corta el flujo con
`invalid redirect_uri` antes de mostrarle nada al complejo.

### Paso 4 — Configurar el webhook

En la aplicación → **Webhooks** / **Notificaciones**:

1. URL de producción: `https://<tu-backend>/api/public/mp/webhook`
2. Evento: **Pagos** (`payment`). Los demás no hacen falta; el código los ignora.
3. Guardar y copiar la **clave secreta** que genera → `MP_WEBHOOK_SECRET`.

Esa clave es lo único que separa el endpoint de ser un "confirmá cualquier
reserva gratis" abierto a internet. Si falta, el webhook responde 401 a todo —
es a propósito.

### Paso 5 — Crear las cuentas de prueba

En **Tus integraciones → Cuentas de prueba**, crear **dos**:

- un **vendedor** (hace de complejo y conecta su cuenta)
- un **comprador** (hace de jugador y paga)

Anotar usuario y contraseña de cada una. Iniciar sesión con la cuenta de prueba
del vendedor **en una ventana de incógnito**: si compartís sesión con tu cuenta
real, el OAuth termina vinculando la cuenta equivocada.

### Paso 6 — Completar las variables de entorno

| Variable | Valor |
|---|---|
| `MP_CLIENT_ID` / `MP_CLIENT_SECRET` | Del paso 2 |
| `MP_REDIRECT_URI` | La del paso 3, idéntica |
| `MP_WEBHOOK_SECRET` | La del paso 4 |
| `MP_TOKEN_KEY` | 32 bytes hex (`openssl rand -hex 32`). **Ya generada en `.env` local; en producción va otra distinta** |
| `API_PUBLIC_URL` | URL pública del **backend**, sin barra final |
| `APP_PUBLIC_URL` | URL pública del **frontend** (ya existía, pero ahora tiene que ser HTTPS pública) |

En Render se cargan en **Environment**; cada cambio reinicia el servicio.

**`MP_TOKEN_KEY` es la más delicada de todas:** cifra los tokens de cobro de cada
complejo. Si se pierde o se cambia, todos los complejos tienen que volver a
conectar su cuenta. Guardala en un gestor de contraseñas antes de desplegar, y
usá una distinta en local y en producción.

### Paso 7 — Conectar la cuenta del complejo

1. Entrar al panel como dueño de un complejo → **Configuración → Pagos →
   Conectar**.
2. En el drawer, **Conectar con MercadoPago**.
3. Iniciar sesión con la **cuenta de prueba del vendedor** (en incógnito) y
   aceptar los permisos.
4. Volvés al panel con un aviso de "MercadoPago conectado" y el drawer muestra
   la cuenta vinculada.
5. Elegir **Total** o **Seña** (con el porcentaje o monto), decidir el switch de
   "Permitir reservar sin pagar" y **Guardar cambios**.

Si algo falla, la URL de vuelta trae el motivo: `mp=error&motivo=state` (el link
tardó más de 10 minutos), `motivo=oauth` (MercadoPago rechazó el intercambio,
casi siempre por la redirect URI) o `mp=cancelado` (apretaste Cancelar).

### Paso 8 — Probar el flujo completo

Con la cuenta de prueba del **comprador** (otra ventana de incógnito), entrar a
`/club/<slug>`, elegir un turno y pagar. Casos a cubrir:

| Caso | Cómo | Qué tiene que pasar |
|---|---|---|
| Pago aprobado | Tarjeta de prueba de MercadoPago con nombre `APRO` | La reserva pasa a `confirmada`, aparece el movimiento en Caja **por el monto de la seña**, la campanita muestra "Seña acreditada" y llega el email "Turno pago" |
| Rechazo | Nombre `OTHE` en la tarjeta | La reserva **sigue** `pendiente`, el horario sigue bloqueado y el botón "Pagar ahora" en `/reserva/:token` genera un link nuevo |
| Hold vencido | Reservar, no pagar, poner `expiraEn` en el pasado y correr `npm run jobs:holds` | La reserva queda `cancelada` y el horario vuelve a aparecer libre |
| Reintento del webhook | Reenviar la misma notificación desde el panel de MercadoPago | **Un solo** movimiento de caja y **un solo** email |
| Sin firma | `curl -X POST <backend>/api/public/mp/webhook` | 401, y ninguna reserva se confirma |
| Devolución | Panel → Turnos → abrir el turno pago → **Devolver pago** | Estado "Devuelto", egreso en Caja y email al jugador |

Las tarjetas de prueba y el significado de `APRO`/`OTHE` están en la
[documentación de MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards).

Con `JOBS_ENABLED=false` (el default en local) los crons no corren y la
expiración se dispara a mano. En producción queda encendido y corre cada 2 min.

### Paso 9 — Pasar a real

Cuando el flujo de prueba cierre:

1. En MercadoPago, completar el checklist de **homologación / calidad de la
   integración** si el panel lo pide.
2. Desvincular la cuenta de prueba desde el drawer y conectar la cuenta **real**
   del complejo.
3. Verificar en `.env` de producción: `MAIL_DEV_REDIRECT` **vacío**,
   `JOBS_ENABLED` sin apagar, `TRUST_PROXY=1`.
4. Hacer una reserva real de monto chico y devolverla, para ver el circuito
   completo con plata de verdad antes de abrirlo a los complejos.

### Si algo no anda

| Síntoma | Causa casi segura |
|---|---|
| "No pudimos iniciar el pago" (502) | `APP_PUBLIC_URL` o `API_PUBLIC_URL` apuntan a `localhost`. Los logs del backend traen el mensaje textual de MercadoPago |
| `invalid redirect_uri` | `MP_REDIRECT_URI` no es idéntica a la registrada (barra final, http vs https) |
| Pagás y la reserva no se confirma | El webhook no llega. Ver **Webhooks → entregas** en el panel de MercadoPago: si da 401, falta o está mal `MP_WEBHOOK_SECRET`; si no hay intentos, `API_PUBLIC_URL` está mal |
| El complejo aparece desconectado solo | Falló el refresh del token (el complejo revocó el permiso desde su cuenta). El código lo marca desconectado a propósito en vez de fallar en cada reserva |
| `Falta MP_TOKEN_KEY` en los logs | La variable no está cargada; ninguna cuenta se puede conectar |

---

## 5. Fuera de alcance

- Cobro de la seña en reservas cargadas desde el backoffice (link por WhatsApp).
- Refund automático al cancelar dentro de la tolerancia: es manual a propósito,
  porque la política de devolución de señas varía entre complejos y devolver de
  más no se puede deshacer.
- Otras pasarelas (Stripe, transferencia).
