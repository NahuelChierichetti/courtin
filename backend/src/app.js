'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Sentry = require('@sentry/node');

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimit');

const routes = require('./routes');
const app = express();

// Cuántos proxies hay delante de la app. En Render (y en cualquier PaaS) el
// tráfico entra por un balanceador, así que sin esto `req.ip` es siempre la IP
// del proxy y TODOS los usuarios caerían en el mismo contador de rate limiting.
//
// Es un número y no `true` a propósito: confiar en toda la cadena de
// X-Forwarded-For deja que el cliente invente su propia IP y esquive el límite.
// El valor es la cantidad de saltos de confianza: 1 para Render, 0 en local.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 0));

// Headers de seguridad. Conviene aclarar qué hace y qué no: Helmet no protege
// al servidor de nada —no frena tráfico ni evita que se sature—, protege al
// NAVEGADOR de quien consume la API. Como acá casi todo son respuestas JSON, el
// beneficio es más chico que en una app que sirve HTML, pero es real y gratis:
// saca el header `X-Powered-By` (que hoy le anuncia "Express" a cualquier
// escáner), impide que el navegador adivine el tipo de contenido (`nosniff`, la
// vía por la que un JSON con datos de un usuario puede terminar ejecutándose
// como script), fuerza HTTPS con HSTS y recorta el `Referer` que se filtra a
// terceros.
//
// Va primero de todo para que los headers estén también en las respuestas de
// error y en las que cortan antes de llegar a las rutas.
app.use(
  helmet({
    // El default de Helmet es `same-origin`, pensado para una app que sirve sus
    // propios recursos. Acá el frontend vive en otro dominio (Vercel) y la API
    // en otro (Render), así que dejarlo en el default es pedir que el navegador
    // bloquee respuestas legítimas. CORS sigue siendo el que decide quién puede
    // leer qué: esto sólo evita que CORP contradiga esa decisión.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Orígenes permitidos (separados por coma en CORS_ORIGIN).
// Si no se define, se permite cualquier origen (útil en desarrollo).
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requests sin origin (Postman, curl, apps móviles) y,
      // si no hay lista configurada, cualquier origen.
      if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // El `status: 403` no es cosmético, hace dos cosas.
      //
      // La primera es responder lo que corresponde: un origen no autorizado es
      // "no tenés permiso", no "se rompió el servidor". Antes salía 500 porque
      // el error llegaba pelado al errorHandler, que ante la duda asume 500.
      //
      // La segunda es que Sentry deja de reportarlo. Su filtro por defecto
      // (`defaultShouldHandleError`) lee `error.status` y sólo captura de 500
      // para arriba, así que con el 500 anterior cada escáner o bot que pegara
      // en la API con un Origin cualquiera abría un issue. Eso es ruido que
      // compite con los errores reales y consume el cupo del plan gratuito.
      const error = new Error(`Origen no permitido por CORS: ${origin}`);
      error.status = 403;
      return callback(error);
    },
  })
);
// El `limit` es el default de Express, pero escrito: ningún cuerpo de esta API
// se acerca a 100 kB (las imágenes van por multipart en /uploads, no por acá),
// y dejarlo explícito evita que un cambio distraído lo abra y permita mandar
// megabytes de JSON que Node tiene que parsear antes de poder rechazarlos.
app.use(express.json({ limit: '100kb' }));

// Techo general por IP, antes de todas las rutas. Los límites finos de cada
// endpoint (login, recupero de contraseña, pagos) siguen viviendo en sus
// routers: éste es sólo el piso para que ninguna ruta quede sin ningún control,
// sobre todo las públicas de disponibilidad. Ver src/middlewares/rateLimit.js.
app.use('/api', globalLimiter, routes);
app.use(notFound);

// Va DESPUÉS de las rutas y ANTES del errorHandler propio: ése responde el JSON
// y corta la cadena de middlewares, así que un Sentry puesto abajo no vería
// ningún error. Por defecto sólo reporta los de servidor (500 en adelante), de
// modo que un 404 o un 403 no llenan la casilla.
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

module.exports = app;
