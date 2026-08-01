const jwt = require('jsonwebtoken');

const Club = require('../models/Club');
const { encrypt, decrypt } = require('./secrets');

// Cliente de MercadoPago multi-tenant.
//
// Cada complejo cobra con SU cuenta, así que casi ninguna llamada usa una
// credencial de CourtIn: se usa el access token del club. Las únicas
// excepciones son el intercambio y el refresh de OAuth, que van con el
// client_id/client_secret de la aplicación de CourtIn.
//
// No se usa el SDK oficial a propósito: son cinco endpoints, y el SDK está
// pensado para un único vendedor configurado globalmente, que es justo lo
// contrario de lo que necesitamos.

const API_BASE = 'https://api.mercadopago.com';
const AUTH_BASE = 'https://auth.mercadopago.com.ar';

// Margen para renovar el access token antes de que venza. MP los emite por 180
// días; con un día de anticipación sobra y evita el caso borde de renovar justo
// en el medio de un checkout.
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

const isConfigured = () =>
  Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET && process.env.MP_REDIRECT_URI);

/**
 * Llamada a la API de MercadoPago con manejo de error uniforme.
 *
 * MP responde los errores con un JSON `{ message, error, cause }`; lo levantamos
 * al mensaje del Error para que en los logs se vea qué pasó y no un "400" pelado.
 */
const mpFetch = async (path, { token, method = 'GET', body, headers = {} } = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const detalle = data?.message || data?.error || res.statusText;
    const err = new Error(`MercadoPago ${method} ${path} → ${res.status}: ${detalle}`);
    err.status = res.status;
    err.mpBody = data;
    throw err;
  }

  return data;
};

// --- OAuth ---

/**
 * URL a la que mandamos al complejo para que autorice a CourtIn.
 *
 * El `redirect_uri` registrado en MercadoPago es uno solo para todos los
 * clubes, así que el `state` es lo único que dice de qué club es el callback
 * que vuelve. Por eso es un JWT firmado y no el id en claro: si fuera
 * manipulable, cualquiera podría hacer que la cuenta de MercadoPago que
 * autoriza quede vinculada al club de otro.
 */
const buildAuthUrl = (clubId) => {
  if (!isConfigured()) {
    throw new Error('MercadoPago no está configurado (faltan MP_CLIENT_ID / MP_CLIENT_SECRET / MP_REDIRECT_URI).');
  }

  const state = jwt.sign({ clubId: String(clubId), scope: 'mp-oauth' }, process.env.JWT_SECRET, {
    expiresIn: '10m'
  });

  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID,
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: process.env.MP_REDIRECT_URI,
    state
  });

  return `${AUTH_BASE}/authorization?${params.toString()}`;
};

/** Valida el `state` del callback. Devuelve el clubId o null si no es válido. */
const parseState = (state) => {
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    return decoded?.scope === 'mp-oauth' ? decoded.clubId : null;
  } catch {
    return null;
  }
};

const oauthToken = (payload) =>
  mpFetch('/oauth/token', {
    method: 'POST',
    body: {
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...payload
    }
  });

const exchangeCode = (code) =>
  oauthToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.MP_REDIRECT_URI
  });

const refreshAccessToken = (refreshToken) =>
  oauthToken({ grant_type: 'refresh_token', refresh_token: refreshToken });

/** Traduce la respuesta de OAuth a los campos de `Club.pagos.mp`, ya cifrados. */
const buildMpCredentials = (tokenResponse) => ({
  'pagos.mp.conectado': true,
  'pagos.mp.userId': String(tokenResponse.user_id),
  'pagos.mp.publicKey': tokenResponse.public_key,
  'pagos.mp.accessToken': encrypt(tokenResponse.access_token),
  'pagos.mp.refreshToken': encrypt(tokenResponse.refresh_token),
  'pagos.mp.expiresAt': new Date(Date.now() + tokenResponse.expires_in * 1000)
});

/**
 * Access token vigente del club, renovándolo si está por vencer.
 *
 * Es el ÚNICO lugar del código que lee `pagos.mp.accessToken`. Todo lo demás
 * pide el token por acá y así nunca tiene que saber que está cifrado ni cuándo
 * vence.
 *
 * @returns {Promise<string|null>} null si el club no tiene MercadoPago conectado.
 */
const getClubAccessToken = async (clubId) => {
  const club = await Club.findById(clubId).select(
    '+pagos.mp.accessToken +pagos.mp.refreshToken'
  );

  if (!club?.pagos?.mp?.conectado || !club.pagos.mp.accessToken) return null;

  const { accessToken, refreshToken, expiresAt } = club.pagos.mp;
  const vigente = expiresAt && expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS;

  if (vigente) return decrypt(accessToken);

  // Vencido o por vencer: se renueva y se persiste.
  const plainRefresh = decrypt(refreshToken);
  if (!plainRefresh) return decrypt(accessToken);

  try {
    const renovado = await refreshAccessToken(plainRefresh);
    await Club.findByIdAndUpdate(clubId, buildMpCredentials(renovado));
    return renovado.access_token;
  } catch (err) {
    // El refresh puede fallar porque el complejo revocó el permiso desde
    // MercadoPago. Se marca como desconectado para que el panel lo muestre y
    // el checkout deje de ofrecer pago online, en vez de fallar en cada reserva.
    // eslint-disable-next-line no-console
    console.error(`[mp] No se pudo renovar el token del club ${clubId}:`, err.message);
    await Club.findByIdAndUpdate(clubId, { 'pagos.mp.conectado': false });
    return null;
  }
};

/**
 * Datos de la cuenta dueña del token. Se usa una sola vez, al conectar, para
 * poder mostrarle al complejo QUÉ cuenta vinculó: sin esto el panel sólo puede
 * decir "conectado", y si alguien vinculó por error su cuenta personal en vez
 * de la del club no hay forma de darse cuenta.
 */
const getAccount = (token) => mpFetch('/users/me', { token });

// --- Operaciones de cobro (siempre con el token del club) ---

const createPreference = (token, preference, idempotencyKey) =>
  mpFetch('/checkout/preferences', {
    token,
    method: 'POST',
    body: preference,
    // Si el request se reintenta por un timeout de red, MP devuelve la misma
    // preferencia en vez de crear una segunda.
    headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}
  });

const getPayment = (token, paymentId) => mpFetch(`/v1/payments/${paymentId}`, { token });

/**
 * Pagos de una reserva, buscados por el `external_reference` que mandamos.
 *
 * Es la red de contención de la pantalla de retorno: si el webhook se demora o
 * se pierde, el jugador vuelve del checkout y preguntamos directo a
 * MercadoPago en vez de dejarlo mirando un "confirmando..." eterno.
 */
const searchPayments = (token, externalReference) =>
  mpFetch(`/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}`, {
    token
  });

/**
 * Devolución. Sin `amount` devuelve el total; con monto, parcial.
 */
const refundPayment = (token, paymentId, amount, idempotencyKey) =>
  mpFetch(`/v1/payments/${paymentId}/refunds`, {
    token,
    method: 'POST',
    body: amount ? { amount } : {},
    headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}
  });

module.exports = {
  isConfigured,
  buildAuthUrl,
  parseState,
  exchangeCode,
  refreshAccessToken,
  buildMpCredentials,
  getClubAccessToken,
  getAccount,
  createPreference,
  getPayment,
  searchPayments,
  refundPayment
};
