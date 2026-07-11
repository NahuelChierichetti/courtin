'use strict';

const express = require('express');
const cors = require('cors');

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const routes = require('./routes');
const app = express();

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
