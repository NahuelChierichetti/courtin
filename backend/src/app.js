'use strict';

const express = require('express');
const cors = require('cors');
const Sentry = require('@sentry/node');

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

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
app.use(express.json());
app.use('/api', routes);
app.use(notFound);

// Va DESPUÉS de las rutas y ANTES del errorHandler propio: ése responde el JSON
// y corta la cadena de middlewares, así que un Sentry puesto abajo no vería
// ningún error. Por defecto sólo reporta los de servidor (500 en adelante), de
// modo que un 404 o un 403 no llenan la casilla.
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

module.exports = app;
