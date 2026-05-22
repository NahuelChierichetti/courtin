# API Routes - CourtIn Backend

## Base URL
- Local: `http://localhost:3000/api`

## Autenticación
- Algunas rutas requieren header:
  - `Authorization: Bearer <token>`
- Algunas rutas multitenant además requieren:
  - `x-club-id: <clubId>`
  - Esto aplica especialmente en rutas como `GET /courts/:id`, `PUT /courts/:id` y `DELETE /courts/:id`, porque tu middleware necesita identificar el club.

---

## Health

### GET `/health`
- Descripción: verifica que la API esté funcionando.
- Auth: no
- Respuesta esperada:
```json
{
  "ok": true,
  "message": "API funcionando correctamente"
}
```

---

## Users

### GET `/users`
- Descripción: lista todos los usuarios.
- Auth: no

### POST `/users`
- Descripción: crea un usuario.
- Auth: no
- Body ejemplo:
```json
{
  "nombre": "Nahuel",
  "email": "nahuel@mail.com",
  "password": "123456"
}
```

### PUT `/users/:id`
- Descripción: edita un usuario existente.
- Auth: no
- Params:
  - `id`: id del usuario
- Body ejemplo:
```json
{
  "nombre": "Nahuel Actualizado",
  "email": "nahuel.actualizado@mail.com"
}
```

### DELETE `/users/:id`
- Descripción: elimina un usuario.
- Auth: no
- Params:
  - `id`: id del usuario

---

## Auth

### POST `/auth/register`
- Descripción: registra un usuario y devuelve token JWT.
- Auth: no
- Body ejemplo:
```json
{
  "nombre": "Nahuel Chierichetti",
  "email": "nahuel.auth@test.com",
  "password": "123456"
}
```

### POST `/auth/login`
- Descripción: inicia sesión y devuelve token JWT.
- Auth: no
- Body ejemplo:
```json
{
  "email": "nahuel.auth@test.com",
  "password": "123456"
}
```

### GET `/auth/me`
- Descripción: devuelve el usuario autenticado.
- Auth: sí

---

## Clubs

> Todas las rutas de `clubs` requieren autenticación.
> Actualmente están pensadas para `superadmin`.

### GET `/clubs`
- Descripción: lista todos los clubes.
- Auth: sí
- Rol: `superadmin`

### POST `/clubs`
- Descripción: crea un club.
- Auth: sí
- Rol: `superadmin`
- Body ejemplo:
```json
{
  "nombre": "Complejo Golazo 1",
  "slug": "complejo-golazo-1",
  "direccion": "Av. Siempre Viva 123",
  "telefono": "1122334455",
  "estado": "activo"
}
```

### GET `/clubs/:id`
- Descripción: obtiene un club por id.
- Auth: sí
- Rol: `superadmin`

### PUT `/clubs/:id`
- Descripción: edita un club.
- Auth: sí
- Rol: `superadmin`
- Body ejemplo:
```json
{
  "nombre": "Complejo Golazo Central",
  "slug": "complejo-golazo-central",
  "direccion": "Nueva dirección 456",
  "telefono": "1199988877",
  "estado": "activo"
}
```

---

## Memberships

> Todas las rutas de `memberships` requieren autenticación.

### GET `/memberships/me`
- Descripción: devuelve los accesos del usuario autenticado a sus clubes.
- Auth: sí

### POST `/memberships`
- Descripción: asigna un usuario a un club con un rol.
- Auth: sí
- Rol: `tenant_admin` del club o `superadmin`
- Body ejemplo:
```json
{
  "userId": "ID_DEL_USUARIO",
  "clubId": "ID_DEL_CLUB",
  "role": "employee",
  "estado": "activo"
}
```

### GET `/memberships/club/:clubId`
- Descripción: lista memberships de un club.
- Auth: sí
- Rol: `tenant_admin` del club o `superadmin`

### PUT `/memberships/:id`
- Descripción: actualiza rol o estado de una membership.
- Auth: sí
- Rol: `superadmin`
- Body ejemplo:
```json
{
  "role": "tenant_admin",
  "estado": "activo"
}
```

---

## Courts

> Todas las rutas de `courts` requieren autenticación.

### GET `/courts?clubId=:clubId`
- Descripción: lista canchas. Puede filtrarse por club.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`

### GET `/courts/:id`
- Descripción: obtiene una cancha por id.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`
- Header requerido para usuarios no `superadmin`:
  - `x-club-id: ID_DEL_CLUB`

### POST `/courts`
- Descripción: crea una cancha.
- Auth: sí
- Rol: `tenant_admin` o `superadmin`
- Body ejemplo:
```json
{
  "clubId": "ID_DEL_CLUB",
  "nombre": "Cancha 1",
  "tipo": "futbol",
  "estado": "activa",
  "precio": 25000,
  "duracionTurno": 60,
  "descripcion": "Cancha de césped sintético"
}
```

### PUT `/courts/:id`
- Descripción: edita una cancha.
- Auth: sí
- Rol: `tenant_admin` o `superadmin`
- Header requerido para usuarios no `superadmin`:
  - `x-club-id: ID_DEL_CLUB`
- Body ejemplo:
```json
{
  "nombre": "Cancha 1 Techada",
  "tipo": "futbol",
  "estado": "activa",
  "precio": 30000,
  "duracionTurno": 60,
  "descripcion": "Cancha actualizada"
}
```

### DELETE `/courts/:id`
- Descripción: elimina una cancha.
- Auth: sí
- Rol: `tenant_admin` o `superadmin`
- Header requerido para usuarios no `superadmin`:
  - `x-club-id: ID_DEL_CLUB`

---

## Reservations

> Todas las rutas de `reservations` requieren autenticación.

### GET `/reservations/my`
- Descripción: devuelve las reservas del usuario autenticado como cliente.
- Auth: sí

### GET `/reservations/club/:clubId`
- Descripción: lista reservas de un club.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`
- Query params opcionales:
  - `fecha=2026-05-20`
  - `courtId=ID_DE_LA_CANCHA`
  - `estado=confirmada`

### GET `/reservations/club/:clubId/:id`
- Descripción: obtiene una reserva puntual.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`

### POST `/reservations/club/:clubId`
- Descripción: crea una reserva.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`

#### Body ejemplo con usuario registrado
```json
{
  "courtId": "ID_DE_LA_CANCHA",
  "customerId": "ID_DEL_USUARIO_CLIENTE",
  "fecha": "2026-05-20",
  "horaInicio": "19:00",
  "horaFin": "20:00",
  "estado": "confirmada",
  "precioFinal": 25000,
  "notas": "Reserva nocturna"
}
```

#### Body ejemplo con invitado
```json
{
  "courtId": "ID_DE_LA_CANCHA",
  "guestName": "Juan Pérez",
  "guestPhone": "1122334455",
  "fecha": "2026-05-20",
  "horaInicio": "20:00",
  "horaFin": "21:00",
  "estado": "confirmada",
  "precioFinal": 25000
}
```

### PUT `/reservations/club/:clubId/:id`
- Descripción: edita una reserva.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`

### PATCH `/reservations/club/:clubId/:id/cancel`
- Descripción: cancela una reserva sin borrarla.
- Auth: sí
- Rol: `tenant_admin`, `employee` o `superadmin`

---

## Roles actuales

- `superadmin`
- `tenant_admin`
- `employee`
- `customer`

---

## Notas importantes

- Todas las rutas están montadas bajo el prefijo `/api`.
- El middleware `authorizeClubRoles(...)` usa:
  - `req.params.clubId`
  - o `req.body.clubId`
  - o `req.headers['x-club-id']`
- Por eso algunas rutas necesitan enviar el `clubId` por body, params o headers según el caso.
- Las rutas de `users` hoy están públicas; más adelante probablemente convenga restringirlas.
- El flujo actual recomendado es:
  - registrar usuario
  - login
  - obtener token
  - crear club
  - crear membership
  - crear cancha
  - crear reserva