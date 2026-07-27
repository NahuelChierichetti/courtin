'use strict';

const express = require('express');
const cors = require('cors');

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
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
  })
);
app.use(express.json());
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
