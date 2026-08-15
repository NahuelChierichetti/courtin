const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Límites de uso para los endpoints que disparan emails.
//
// Sin esto, cualquiera puede pedir "olvidé mi contraseña" en un bucle y quemar
// la cuota de Resend en minutos — dejando a la plataforma sin poder mandar
// confirmaciones de reserva, que es lo que de verdad importa. De paso, evita
// que se use la plataforma para inundarle la casilla a un tercero.
//
// Nota sobre el almacenamiento: los contadores viven en memoria del proceso. Con
// una sola instancia (el caso hoy) alcanza. Si algún día se escala a varias, cada
// una lleva su propia cuenta y el límite efectivo se multiplica; ahí habría que
// pasar a un store compartido.

const UNA_HORA = 60 * 60 * 1000;

const mensaje = (texto) => ({ ok: false, message: texto });

// Límite por IP. Tolerante: detrás de un NAT (un club, un locutorio) puede haber
// varias personas legítimas con la misma IP saliente.
const porIP = ({ max, windowMs = UNA_HORA, texto }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: mensaje(texto),
    // `ipKeyGenerator` normaliza IPv6 a su prefijo /64: sin eso, quien tenga un
    // rango IPv6 rota de dirección y esquiva el límite sin esfuerzo.
    keyGenerator: (req) => ipKeyGenerator(req.ip)
  });

// Límite por dirección de email. Es el que realmente protege a la víctima: sin
// él, alguien puede pedir el reset de la casilla de otra persona cien veces.
//
// Cuenta TODOS los intentos, exista o no la cuenta. Si sólo contara los
// existentes, la diferencia entre recibir 429 y no recibirlo delataría qué
// emails están registrados — justo lo que evita la respuesta genérica del
// endpoint.
const porEmail = ({ max, windowMs = UNA_HORA, texto }) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: mensaje(texto),
    keyGenerator: (req) => {
      const email = (req.body?.email || '').toLowerCase().trim();
      // Sin email en el cuerpo no hay nada que limitar por esta vía; el límite
      // por IP sigue aplicando.
      return email || ipKeyGenerator(req.ip);
    },
    skipFailedRequests: false
  });

const TEXTO_ESPERA = 'Demasiados intentos. Esperá un rato y probá de nuevo.';

// Recuperación de contraseña: se aplican los dos límites en cadena.
const forgotPasswordLimiters = [
  porIP({ max: 15, texto: TEXTO_ESPERA }),
  porEmail({ max: 4, texto: TEXTO_ESPERA })
];

// Solicitudes de alta de complejo. Es público, crea registros en la base y
// dispara dos emails (uno de ellos, al superadmin). Un límite por IP alcanza:
// nadie da de alta cinco complejos por hora desde la misma conexión, y el
// destinatario del aviso somos nosotros, así que el costo de abusarlo es
// inundarnos la casilla.
const registerClubLimiter = porIP({
  max: 5,
  texto: 'Ya enviaste varias solicitudes. Esperá un rato antes de mandar otra.'
});

// Reenvío del email de verificación. Va por usuario en sesión, no por email del
// cuerpo: el endpoint no acepta destinatario.
const resendVerificationLimiter = rateLimit({
  windowMs: UNA_HORA,
  limit: 4,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje('Ya pediste el link varias veces. Esperá un rato antes de reintentar.'),
  keyGenerator: (req) => (req.user ? String(req.user._id) : ipKeyGenerator(req.ip))
});

// --- Login ---
//
// Acá lo que se frena es la fuerza bruta contra la contraseña, no el gasto de
// emails. Dos diferencias con los límites de arriba:
//
//  • Sólo cuentan los intentos FALLIDOS (`skipSuccessfulRequests`). Quien entra
//    bien no gasta presupuesto, así que un empleado que se loguea veinte veces
//    en el día nunca se topa con esto.
//  • La ventana es corta (15 min). El objetivo es hacer inviable probar miles de
//    contraseñas, no castigar a quien se equivocó tipeando.
const QUINCE_MINUTOS = 15 * 60 * 1000;

const TEXTO_LOGIN = 'Demasiados intentos fallidos. Esperá 15 minutos y volvé a probar.';

// Por cuenta: 5 contraseñas erradas y esa cuenta descansa un rato.
const loginPorEmail = rateLimit({
  windowMs: QUINCE_MINUTOS,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje(TEXTO_LOGIN),
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    return email ? `login:${email}` : ipKeyGenerator(req.ip);
  }
});

// Por IP, más holgado: frena el ataque que prueba una contraseña común contra
// muchas cuentas distintas, donde el límite por email nunca se dispara.
const loginPorIP = rateLimit({
  windowMs: QUINCE_MINUTOS,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje(TEXTO_LOGIN),
  keyGenerator: (req) => ipKeyGenerator(req.ip)
});

const loginLimiters = [loginPorIP, loginPorEmail];

// Invitaciones de staff: exige ser tenant_admin, así que el riesgo es menor,
// pero un complejo no tiene por qué mandar cientos de invitaciones por hora.
const invitationLimiter = rateLimit({
  windowMs: UNA_HORA,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje('Demasiadas invitaciones seguidas. Esperá un rato.'),
  keyGenerator: (req) => (req.user ? String(req.user._id) : ipKeyGenerator(req.ip))
});

// Reintento de pago de una reserva. Cada llamada crea una preferencia en
// MercadoPago, así que sin límite alguien podría usar el endpoint para
// martillar la API del complejo con el token del complejo. La clave es el token
// de gestión: el límite es por reserva, no por IP, porque reintentar dos
// reservas distintas desde la misma casa es normal.
const retryPaymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje('Demasiados intentos de pago. Esperá unos minutos.'),
  keyGenerator: (req) => req.params.token || ipKeyGenerator(req.ip)
});

module.exports = {
  forgotPasswordLimiters,
  loginLimiters,
  registerClubLimiter,
  resendVerificationLimiter,
  invitationLimiter,
  retryPaymentLimiter
};
