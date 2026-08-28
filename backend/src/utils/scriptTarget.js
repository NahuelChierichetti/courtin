'use strict';

/**
 * Guard para los scripts que escriben en la base.
 *
 * Chequea las DOS direcciones del error, porque las dos ya pasaron:
 *
 *  1. Correr contra producción creyendo que era local. Es el clásico y el que
 *     puede romper datos de clientes.
 *  2. Correr contra local creyendo que era producción. Éste no rompe nada, y
 *     por eso es peor: el script informa "listo" con toda naturalidad, uno tacha
 *     la tarea de la lista, y la migración que hacía falta nunca se aplicó. Pasó
 *     el 28/08/2026 con `fix:googleid`, que se dio por corrida en producción
 *     mientras el índice roto seguía ahí bloqueando el alta de usuarios.
 *
 * De ahí que `--prod` sea obligatorio para una base remota Y prohibido para una
 * local: la bandera declara la intención, y el guard verifica que la intención y
 * la URI coincidan. Además siempre se imprime a qué base se está por entrar,
 * para que no haya que deducirlo de la línea de "MongoDB conectada".
 */

const ES_LOCAL = /(^|@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/;

// Host y nombre de base, sin credenciales. Se hace con regex y no con `new URL`
// porque una URI de Mongo puede traer varios hosts separados por coma y eso
// rompe el parser.
const describirUri = (uri) => {
  const sinCreds = uri.replace(/\/\/[^@/]*@/, '//');
  const host = (sinCreds.match(/\/\/([^/?]+)/) || [])[1] || '(desconocido)';
  const base = (sinCreds.match(/\/\/[^/?]+\/([^?]+)/) || [])[1] || '(sin especificar)';
  return { host, base };
};

const linea = (texto = '') => console.error(texto);

/**
 * @param {string} comando  Cómo se invoca el script, para poder repetir el
 *   comando correcto en el mensaje de error (ej. 'npm run migrate:planes').
 */
const confirmarDestino = (comando) => {
  const uri = process.env.MONGODB_URI || '';
  const pidioProd = process.argv.includes('--prod');
  const esLocal = ES_LOCAL.test(uri);

  if (!uri) {
    linea('\n⛔  No hay MONGODB_URI definida. Revisá el .env.\n');
    process.exit(1);
  }

  const { host, base } = describirUri(uri);
  const entorno = esLocal ? 'LOCAL' : 'REMOTA (producción)';

  // `npm run x` necesita `--` para que el flag llegue al script; `node x.js` no.
  const conProd = comando.startsWith('npm') ? `${comando} -- --prod` : `${comando} --prod`;

  linea('');
  linea('  ┌────────────────────────────────────────────────');
  linea(`  │  Base:      ${base}`);
  linea(`  │  Servidor:  ${host}`);
  linea(`  │  Entorno:   ${entorno}`);
  linea('  └────────────────────────────────────────────────');

  if (!esLocal && !pidioProd) {
    linea('');
    linea('⛔  ABORTADO: la URI apunta a una base remota y no pasaste --prod.');
    linea('    Tocar la base real tiene que ser una decisión, no un descuido.');
    linea('');
    linea(`    Si es a propósito:  ${conProd}`);
    linea('');
    process.exit(1);
  }

  if (esLocal && pidioProd) {
    linea('');
    linea('⛔  ABORTADO: pediste --prod pero la URI apunta a una base LOCAL.');
    linea('    Casi seguro te olvidaste de apuntar MONGODB_URI a producción, y');
    linea('    esta corrida te habría dicho "listo" sin tocar la base real.');
    linea('');
    linea('    Desde backend/, para apuntar a producción:');
    linea(`      MONGODB_URI="$(grep '^MONGODB_URI=' .env.production | cut -d= -f2-)" \\`);
    linea(`        ${conProd}`);
    linea('');
    process.exit(1);
  }

  linea('');
};

module.exports = { confirmarDestino, describirUri };
