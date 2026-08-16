// Verificación del ID token de Google (Sign in with Google).
//
// El frontend recibe de Google un JWT firmado (`credential`) y nos lo manda. Acá
// se comprueba contra las claves públicas de Google que sea auténtico, que no
// esté vencido y que haya sido emitido PARA NOSOTROS (el `aud` tiene que ser
// nuestro client id).
//
// Ese último punto es el que hace que esto sea seguro y no una formalidad: sin
// chequear la audiencia, cualquiera podría traer un token legítimo de otra app
// —de la suya, por ejemplo— y usarlo para entrar como quien quisiera. La
// librería de Google lo valida por nosotros siempre que le pasemos el audience.
//
// Nada de esto se puede hacer en el navegador: ahí el token es un dato del
// usuario, y confiar en su contenido decodificado sería dejar que cualquiera
// declare de quién es la cuenta.

const { OAuth2Client } = require('google-auth-library');

let client = null;

const getClientId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();

/** Si no hay client id configurado, el login con Google queda apagado. */
const googleHabilitado = () => Boolean(getClientId());

/**
 * Valida el `credential` y devuelve el perfil, o null si el token no sirve.
 *
 * @returns {Promise<{googleId: string, email: string, emailVerificado: boolean,
 *   nombre: string|null, avatar: string|null}|null>}
 */
const verifyGoogleIdToken = async (credential) => {
  const clientId = getClientId();
  if (!clientId || !credential) return null;

  if (!client) client = new OAuth2Client(clientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (error) {
    // Token falsificado, vencido o de otra aplicación. No se distingue el motivo
    // hacia afuera: sea cual sea, la respuesta es la misma.
    return null;
  }

  if (!payload?.sub || !payload.email) return null;

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase().trim(),
    // Google puede devolver cuentas con el email sin confirmar. Es el dato del
    // que depende poder vincular con una cuenta nuestra ya existente, así que
    // viaja tal cual y la decisión se toma en el controlador.
    emailVerificado: payload.email_verified === true,
    nombre: payload.name || payload.given_name || null,
    avatar: payload.picture || null
  };
};

module.exports = { verifyGoogleIdToken, googleHabilitado };
