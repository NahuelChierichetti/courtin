const crypto = require('crypto');

const Token = require('../models/Token');

// Emisión y consumo de tokens de un solo uso (reset, verificación, invitación).
// El token en claro existe solamente en memoria el tiempo que tarda en irse en
// el email; en la base queda únicamente su hash.

const hash = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

/**
 * Emite un token nuevo e invalida los anteriores del mismo usuario y tipo, para
 * que pedir el reset dos veces no deje dos links vivos.
 *
 * @returns {Promise<{ raw: string, expiresAt: Date }>} `raw` es el token en
 *          claro: va en el link del email y no se puede recuperar después.
 */
const issueToken = async ({ tipo, user = null, email = null, ttlMinutes = 60, meta = {} }) => {
  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  if (user) {
    await Token.deleteMany({ user, tipo, usedAt: null });
  } else if (email) {
    await Token.deleteMany({ email, tipo, usedAt: null });
  }

  await Token.create({ tipo, user, email, tokenHash: hash(raw), expiresAt, meta });

  return { raw, expiresAt };
};

/**
 * Valida un token sin consumirlo. Sirve para que el frontend avise "este link
 * venció" antes de que la persona escriba la contraseña nueva.
 */
const findValidToken = async (raw, tipo) => {
  if (!raw) return null;

  const token = await Token.findOne({ tokenHash: hash(raw), tipo }).populate('user');

  if (!token) return null;
  if (token.usedAt) return null;
  if (token.expiresAt < new Date()) return null;

  return token;
};

/**
 * Marca el token como usado. Se llama recién cuando la acción se completó bien.
 * El update es condicional (`usedAt: null`) para que dos requests simultáneos
 * no puedan consumir el mismo token dos veces.
 *
 * @returns {Promise<boolean>} false si otro request se le adelantó.
 */
const consumeToken = async (tokenId) => {
  const result = await Token.updateOne(
    { _id: tokenId, usedAt: null },
    { usedAt: new Date() }
  );
  return result.modifiedCount === 1;
};

module.exports = { issueToken, findValidToken, consumeToken };
