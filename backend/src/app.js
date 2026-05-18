'use strict';

const express = require('express');
const cors = require('cors');

const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const routes = require('./routes');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
