# Centro de ayuda — help.courtinapp.com

Documentación para el **administrador de un complejo**: cómo usar el panel. No es
documentación técnica ni ayuda para el jugador que reserva una cancha.

Es un sitio [VitePress](https://vitepress.dev) independiente del frontend, con su
propio deploy en Vercel. Vive en el mismo repo para que la ayuda se actualice en
el mismo commit que la función que documenta.

## Correrlo en local

```bash
cd help
npm install
npm run dev      # http://localhost:5173 (5174 si el frontend ya lo ocupa)
npm run build    # falla si hay un link interno roto
```

## Estructura

```
help/
├── .vitepress/
│   ├── config.js          nav, sidebar, buscador, y el markdown-it que
│   │                      convierte el alt de una imagen en <figcaption>
│   └── theme/custom.css   la paleta de marca sobre el tema por defecto
├── public/img/            las capturas
└── <sección>/*.md         el contenido
```

## Agregar una página

1. Creá el `.md` en la sección que corresponda.
2. Sumalo al `sidebar` de `.vitepress/config.js`. Si no está ahí, existe pero no
   se llega por navegación.
3. `npm run build` para verificar que no rompiste ningún link.

## Las capturas

Salen del **complejo demo** (`demo-courtin`), no de un complejo real: los datos
son de ejemplo y se pueden regenerar sin pedirle permiso a nadie.

```bash
cd ../backend
npm run seed:demo-club -- --password=<la que elijas> --refresh
npm run dev
cd ../frontend && npm run dev     # entrás con courtinapp+demo@gmail.com
```

Sacadas con el navegador a **1400 × 1180** y el menú lateral expandido, para que
todas tengan el mismo ancho y el mismo chrome. El nombre del archivo describe la
pantalla (`turnos-dia.jpg`, `config-mercadopago.jpg`), no el orden en que aparece.

El **texto alternativo de cada imagen se muestra como epígrafe**, así que escribilo
como una frase que le diga al lector qué está mirando. No lo repitas en el párrafo
de arriba.

## Deploy

Proyecto de Vercel aparte del frontend, sobre el mismo repositorio de GitHub:

| Ajuste | Valor |
|---|---|
| Root Directory | `help` |
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `.vitepress/dist` |
| Install Command | `npm install` |

(Los cuatro últimos ya están en `vercel.json`; alcanza con configurar el Root
Directory.)

Después, en **Settings → Domains**, agregar `help.courtinapp.com` y cargar en el
DNS del dominio el `CNAME` que indique Vercel.

Conviene activar **Ignored Build Step** con `git diff --quiet HEAD^ HEAD -- .`
para que un cambio en `backend/` o `frontend/` no dispare un build de la ayuda.

## Al tocar el producto

Si cambiás una pantalla del panel, revisá acá:

| Cambió | Actualizá |
|---|---|
| Precios o límites de los planes (`config/plans.js`) | `cuenta/suscripcion.md`, `panel/canchas.md` |
| Los estados de una reserva | `panel/turnos.md` |
| Cómo se cobra online | `reservas-online/mercadopago.md`, `senas-y-devoluciones.md` |
| Permisos de empleado vs. administrador | `panel/equipo.md` |
| Cualquier pantalla con captura | La imagen en `public/img/` |
