'use strict';

// Primero que nada: Sentry instrumenta Express y Mongoose al cargarse, así que
// tiene que ir antes de que se requiera cualquier módulo de la app. Levanta el
// .env por su cuenta (ver instrument.js).
require('./instrument');

require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startJobs } = require('./src/jobs');
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  // Después del listen: las tareas necesitan la base, no el servidor HTTP.
  startJobs();
};

startServer();