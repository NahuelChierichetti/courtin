# CourtIn · Backend

API REST (Node.js + Express + MongoDB/Mongoose) para la gestión de complejos
deportivos y la reserva pública de canchas.

## Requisitos

- Node.js ≥ 18
- MongoDB (local para desarrollo, Atlas para develop/prod)

## Puesta en marcha (local)

```bash
cp .env.example .env          # completá los valores (ver más abajo)
npm install
npm run dev                   # nodemon, recarga en caliente
```

El server queda en `http://localhost:3000` (o el `PORT` que definas). Al arrancar
imprime a qué base se conectó, ej:

```
MongoDB conectada: 127.0.0.1 / db "courtin_dev"
```

> ⚠️ **nodemon no observa `.env`.** Si cambiás variables de entorno, reiniciá el
> proceso (`Ctrl+C` y `npm run dev` de nuevo).

### Scripts

| Comando         | Qué hace                                                        |
| --------------- | -------------------------------------------------------------- |
| `npm run dev`   | Levanta el server con nodemon (desarrollo).                     |
| `npm start`     | Levanta el server con node (producción).                        |
| `npm run seed`  | Carga datos **demo** en la base **local** (ver "Datos demo").   |

---

## Entornos y base de datos

Regla de oro: **nunca desarrollar contra la base de producción.** Cada entorno
usa su propia `MONGODB_URI`. `dotenv` solo carga `.env`, así que ese es siempre
el archivo activo; los `.env.*` son respaldo/referencia y no se cargan solos.
Todos los `.env*` están gitignoreados excepto `.env.example`.

### Los 3 escenarios

| Entorno        | Base                                   | Cómo se setea `MONGODB_URI`                                  |
| -------------- | -------------------------------------- | ----------------------------------------------------------- |
| **Local**      | MongoDB en tu máquina (`courtin_dev`)  | En tu `.env` local.                                         |
| **Develop**    | Atlas, db/cluster de staging           | Env var del deploy de la rama `develop` (no en el repo).    |
| **Production** | Atlas, db real (`courtin`)             | Env var del deploy de la rama `main` (no en el repo).       |

Ejemplos de URI (ver también `.env.example`):

```bash
# LOCAL
MONGODB_URI=mongodb://127.0.0.1:27017/courtin_dev

# DEVELOP / STAGING (db separada de prod)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/courtin_staging

# PRODUCTION
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/courtin
```

**Recomendaciones**

- La URI de prod (y de develop) vive en la **plataforma de deploy**
  (Render/Railway/etc.) como variable de entorno; **no se commitea**.
- Para separar develop de prod, de menor a mayor aislamiento:
  1. **Misma cuenta Atlas, otra database** en el mismo cluster
     (`courtin` vs `courtin_staging`) — más barato.
  2. **Otro cluster** de Atlas para staging — más aislado (recomendado a futuro).
- El archivo `.env.production` (si existe en tu máquina) es solo un **respaldo**
  de la URI de Atlas; está gitignoreado y no se usa en el día a día.

### MongoDB local (macOS, Homebrew)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community   # arranca mongod en el puerto 27017
brew services list                      # verificar estado
```

Para inspeccionar la base usá **MongoDB Compass** con la connection string:

```
mongodb://127.0.0.1:27017        →  db "courtin_dev"
```

---

## Datos demo (seed local)

`npm run seed` crea (o recrea) un club **publicado** `demo-multideporte` con
canchas de pádel, tenis y fútbol + algunas reservas de ejemplo, para probar la
reserva pública (filtro por deporte, timeline, turnos ocupados).

```bash
npm run seed
# → club:  Demo Multideporte  (slug: demo-multideporte)
# → front: /clubs/demo-multideporte
```

El script tiene un **guard de seguridad**: si `MONGODB_URI` no apunta a
`localhost`/`127.0.0.1`, aborta (para no ensuciar Atlas/prod). Se puede forzar
—no recomendado— con `node src/scripts/seedDemo.js --force`.

---

## Variables de entorno

| Variable       | Requerida | Descripción                                                                 |
| -------------- | :-------: | --------------------------------------------------------------------------- |
| `PORT`         |    no     | Puerto HTTP (default `3000`).                                                |
| `MONGODB_URI`  |    sí     | Connection string de MongoDB (ver "Entornos y base de datos").              |
| `JWT_SECRET`   |    sí     | Secreto para firmar los JWT.                                                 |
| `CORS_ORIGIN`  |    no     | Orígenes permitidos, separados por coma. Vacío = cualquier origen (dev).     |

Generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Estructura

```
src/
  app.js            # app Express (middlewares, rutas)
  config/           # conexión a DB, roles
  controllers/      # lógica de cada endpoint
  middlewares/      # auth, manejo de errores, etc.
  models/           # esquemas Mongoose (Club, Court, Reservation, User…)
  routes/           # definición de rutas
  scripts/          # migraciones y seed
  utils/            # availability, pricing, timezone, reglas de reserva
index.js            # bootstrap: carga .env, conecta DB, levanta el server
```

Ver `endpoints.md` para el detalle de los endpoints.
