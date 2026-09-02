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

// Pedidos de demo desde la landing. Es público, guarda un registro y nos manda
// un email: sin límite, alguien podría inundarnos la casilla con formularios
// falsos y dejarnos los pedidos reales enterrados. Por IP, porque el email del
// cuerpo lo inventa quien abusa y no sirve de clave.
const demoRequestLimiter = porIP({
  max: 5,
  texto: 'Ya nos mandaste varios pedidos. Esperá un rato o escribinos por mail.'
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

// Acceso con Google. No hay fuerza bruta posible —no se adivina un token
// firmado por Google—, así que el límite no es contra eso: es contra alguien
// martillando el endpoint, donde cada llamada nos cuesta una verificación
// contra los servidores de Google. Por eso es por IP y bastante holgado.
const googleLoginLimiter = rateLimit({
  windowMs: QUINCE_MINUTOS,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje('Demasiados intentos. Esperá un rato y probá de nuevo.'),
  keyGenerator: (req) => ipKeyGenerator(req.ip)
});

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

// Subida de imágenes. Ya exige sesión, suscripción activa y rol tenant_admin,
// así que no es un endpoint abierto: el límite es contra el gasto, no contra un
// anónimo. Cada llamada sube 5 MB como mucho a Cloudinary, y la cuota del plan
// gratuito se quema con unos pocos cientos de subidas. Por usuario, porque el
// que gasta es la cuenta, no la conexión.
const uploadLimiter = rateLimit({
  windowMs: UNA_HORA,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje('Subiste muchas imágenes seguidas. Esperá un rato.'),
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

// --- Límite general de la API ---
//
// Los límites de arriba son quirúrgicos: cubren los endpoints que gastan plata
// (emails, MercadoPago, Cloudinary) o que son blanco de fuerza bruta. Pero
// dejan sin techo a todo el resto, y ahí están justamente las consultas más
// caras y más públicas: la disponibilidad de un complejo, que resuelve varias
// queries a Mongo por llamada y no pide autenticación. Un `for` de bash contra
// /public/clubs/:slug/availability alcanza para saturar la instancia.
//
// Éste es el piso que faltaba: no busca frenar a nadie en particular, sino que
// ninguna IP pueda martillar la API sin control. Por eso es holgado —40 req por
// minuto sostenidas— y no molesta ni al panel de un complejo con varios
// empleados detrás de la misma conexión (el frontend casi no hace polling: sólo
// refresca los próximos turnos cada 5 minutos). Un script abusivo se lo come en
// segundos igual.
//
// Lo que esto NO es: defensa contra un DDoS. Si el ataque viene de miles de IPs
// distintas, el request ya entró a Node y ya costó CPU. Eso se frena antes de
// la app, en un CDN o WAF; acá lo que se corta es el abuso de un actor único,
// que es el escenario realista.
const globalLimiter = rateLimit({
  windowMs: QUINCE_MINUTOS,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: mensaje('Demasiadas solicitudes. Esperá un momento y volvé a intentar.'),
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  skip: (req) => {
    // Preflights de CORS: el navegador los manda solo, antes de cada POST/PUT
    // cross-origin. Contarlos gastaría el presupuesto del usuario legítimo al
    // doble de velocidad sin que él haga nada.
    if (req.method === 'OPTIONS') return true;

    // Se compara contra `originalUrl` (la ruta completa desde la raíz) y no
    // contra `req.path`, que es relativo al punto de montaje: así las
    // excepciones siguen valiendo aunque el limiter se mueva de lugar.
    const url = req.originalUrl;

    // El webhook de MercadoPago llega en ráfagas —reintenta ante cualquier
    // demora— y un 429 acá significa una reserva paga que no se confirma. No
    // queda abierto: lo que lo protege es el HMAC de la firma, que es mejor
    // control que un contador por IP.
    if (url.startsWith('/api/public/mp/webhook')) return true;

    // Healthcheck: lo pinga Render para decidir si la instancia está viva. Si
    // se lo limita, un pico de tráfico se convierte en un reinicio.
    if (url.startsWith('/api/health')) return true;

    return false;
  }
});

module.exports = {
  globalLimiter,
  uploadLimiter,
  forgotPasswordLimiters,
  loginLimiters,
  googleLoginLimiter,
  registerClubLimiter,
  demoRequestLimiter,
  resendVerificationLimiter,
  invitationLimiter,
  retryPaymentLimiter
};
