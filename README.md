# CourtIn — Gestión para Complejos Deportivos

SaaS multi-tenant para clubes deportivos: gestión de canchas, horarios y
reservas, más una **interfaz pública** donde los jugadores reservan turnos online
(pádel, tenis, fútbol) sin necesidad de cuenta.

El repo es un monorepo con dos apps:

| Carpeta      | Qué es            | Stack                                             |
| ------------ | ----------------- | ------------------------------------------------- |
| [`backend/`](backend/README.md) | API REST          | Node.js · Express · MongoDB (Mongoose) · JWT      |
| `frontend/`  | SPA web           | Vue 3 · Vite · Vue Router · PrimeVue · Tailwind   |

## Arranque rápido

Requisitos: Node.js ≥ 18 y MongoDB local (ver detalle en
[`backend/README.md`](backend/README.md)).

**Backend**

```bash
cd backend
cp .env.example .env      # completá los valores
npm install
npm run seed              # (opcional) carga un club demo en la base local
npm run dev               # http://localhost:3000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Con ambos corriendo, entrá a `/clubs/demo-multideporte` para ver la reserva
pública con datos de ejemplo (si corriste el seed).

## Entornos y base de datos

Regla de oro: **nunca desarrollar contra producción.** Cada entorno (local /
develop / production) usa su propia base vía `MONGODB_URI`. La estrategia
completa —MongoDB local, Atlas para staging/prod, y cómo se inyectan las
variables en el deploy— está documentada en
[`backend/README.md` → "Entornos y base de datos"](backend/README.md#entornos-y-base-de-datos).

## Documentación

- [`backend/README.md`](backend/README.md) — puesta en marcha, entornos, seed, variables.
- [`backend/endpoints.md`](backend/endpoints.md) — detalle de los endpoints de la API.
