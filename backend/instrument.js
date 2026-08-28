'use strict';

// Inicialización de Sentry. Tiene que correr ANTES que cualquier otro require de
// la app: el SDK instrumenta Express, Mongoose y el HTTP saliente parchándolos
// al cargarse, y a un módulo que ya se cargó no lo alcanza.
//
// Por eso vive en su propio archivo y por eso levanta el .env acá adentro: si
// esperara al `dotenv` de index.js, para cuando la variable existiera este
// archivo ya se habría ejecutado sin DSN.
//
// Sin `SENTRY_DSN` el SDK queda inerte y no manda nada, así que en local no
// molesta y no hace falta apagarlo con otra variable.
require('dotenv').config();

const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Separa los errores de producción de los de una corrida local que apunte al
  // mismo proyecto. Sin esto, un error de desarrollo dispara la misma alerta que
  // uno real y la alerta deja de significar algo.
  environment: process.env.NODE_ENV || 'development',

  // Muestreo de trazas de rendimiento. En 1.0 se manda todo y el cupo gratuito
  // (5.000 eventos al mes) se consume sin que nadie mire las trazas; con el
  // tráfico de diez complejos, 0.2 alcanza de sobra para ver qué endpoint está
  // lento cuando alguien se queja.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2),

  // No se mandan datos personales a un tercero. Los emails y teléfonos de los
  // jugadores están en las reservas de todos los endpoints: con esto en true,
  // el cuerpo de cada pedido fallido se copiaría a Sentry.
  sendDefaultPii: false
});

module.exports = Sentry;
