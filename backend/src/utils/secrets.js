const crypto = require('crypto');

// Cifrado simétrico para secretos de terceros que la app necesita poder LEER
// (a diferencia de las contraseñas o los tokens de un solo uso de `tokens.js`,
// que se guardan hasheados y nunca se recuperan).
//
// El caso concreto son los access/refresh token de MercadoPago de cada complejo:
// son credenciales de cobro sobre una cuenta ajena, así que un dump de la base
// no puede alcanzar para que alguien facture en nombre de un club.
//
// AES-256-GCM: además de cifrar, autentica. Si alguien edita el ciphertext a
// mano en la base, el descifrado falla en vez de devolver basura silenciosa.

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // el tamaño recomendado para GCM
const KEY_BYTES = 32;

// La clave se lee en cada llamada y no al importar el módulo: los scripts de
// `scripts/` cargan el .env después de resolver los require, y cachearla acá
// haría que vieran siempre `undefined`.
const getKey = () => {
  const raw = process.env.MP_TOKEN_KEY;

  if (!raw) {
    throw new Error('Falta MP_TOKEN_KEY: no se pueden cifrar los secretos de pago.');
  }

  const key = Buffer.from(raw, 'hex');

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `MP_TOKEN_KEY debe ser de ${KEY_BYTES} bytes en hexadecimal (generala con: openssl rand -hex ${KEY_BYTES}).`
    );
  }

  return key;
};

/**
 * Cifra un texto. El IV va en el resultado (no es secreto, pero tiene que ser
 * distinto en cada cifrado o AES-GCM deja de ser seguro).
 *
 * @returns {string} `iv.tag.ciphertext`, los tres en base64.
 */
const encrypt = (plain) => {
  if (plain === null || plain === undefined || plain === '') return null;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const ciphertext = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
};

/**
 * Descifra lo que devolvió `encrypt`. Devuelve null si el valor está vacío o
 * mal formado; lanza si el contenido fue alterado (el tag de GCM no valida).
 */
const decrypt = (payload) => {
  if (!payload) return null;

  const parts = String(payload).split('.');
  if (parts.length !== 3) return null;

  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64'));

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

/**
 * ¿Está configurado el cifrado? Lo usan el arranque y la config del club para
 * avisar temprano en vez de reventar recién cuando alguien intenta conectar su
 * cuenta de MercadoPago.
 */
const secretsReady = () => {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
};

module.exports = { encrypt, decrypt, secretsReady };
