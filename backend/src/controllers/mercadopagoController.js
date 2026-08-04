const crypto = require('crypto');

const Club = require('../models/Club');
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const {
  isConfigured,
  buildAuthUrl,
  parseState,
  exchangeCode,
  buildMpCredentials,
  getAccount,
  getClubAccessToken,
  getPayment
} = require('../utils/mercadopago');
const { secretsReady } = require('../utils/secrets');
const { appUrl } = require('../utils/publicUrls');
const {
  findPaymentForMpNotification,
  confirmarPagoDeReserva,
  registrarRechazo,
  registrarReembolso
} = require('../utils/payments');

// Vinculación de la cuenta de MercadoPago de un complejo (OAuth).
//
// El complejo autoriza a CourtIn a crear cobros en su nombre; la plata de las
// reservas cae directo en su cuenta y nunca pasa por nosotros.

const panelUrl = (query) => {
  const base = appUrl();
  return `${base}/panel/configuracion?tab=pagos&${query}`;
};

// GET /clubs/:clubId/pagos/mp/connect-url
// Devuelve la URL de autorización. El redirect lo hace el navegador del club.
const getMpConnectUrl = async (req, res, next) => {
  try {
    if (!isConfigured() || !secretsReady()) {
      return res.status(503).json({
        ok: false,
        message: 'La integración con MercadoPago todavía no está configurada en el servidor.'
      });
    }

    res.status(200).json({ ok: true, url: buildAuthUrl(req.params.clubId) });
  } catch (error) {
    next(error);
  }
};

// GET /public/mp/oauth/callback?code=&state=
//
// Acá aterriza el NAVEGADOR del complejo después de autorizar, no una llamada
// de servidor a servidor: por eso es pública (no hay header de auth) y la
// respuesta es un redirect al panel, no un JSON. Lo que autentica el pedido es
// el `state` firmado que emitimos nosotros.
const mpOauthCallback = async (req, res) => {
  const { code, state, error: mpError } = req.query;

  // El complejo apretó "Cancelar" en la pantalla de MercadoPago.
  if (mpError || !code) {
    return res.redirect(panelUrl('mp=cancelado'));
  }

  const clubId = parseState(state);
  if (!clubId) {
    return res.redirect(panelUrl('mp=error&motivo=state'));
  }

  try {
    const tokenResponse = await exchangeCode(code);

    // Mejor esfuerzo: si falla, la cuenta queda conectada igual. Es sólo la
    // etiqueta que ve el complejo en el panel, no hace falta para cobrar.
    let cuentaEmail;
    try {
      const cuenta = await getAccount(tokenResponse.access_token);
      cuentaEmail = cuenta?.email || cuenta?.nickname;
    } catch {
      cuentaEmail = undefined;
    }

    const club = await Club.findByIdAndUpdate(
      clubId,
      {
        ...buildMpCredentials(tokenResponse),
        ...(cuentaEmail ? { 'pagos.mp.email': cuentaEmail } : {}),
        'pagos.mp.conectadoEn': new Date()
      },
      { new: true }
    );

    if (!club) {
      return res.redirect(panelUrl('mp=error&motivo=club'));
    }

    return res.redirect(panelUrl('mp=ok'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mp] Falló el intercambio del code de OAuth:', err.message);
    return res.redirect(panelUrl('mp=error&motivo=oauth'));
  }
};

// GET /clubs/:clubId/pagos/mp/resumen
//
// Costo real de cobrar por MercadoPago, para mostrárselo al complejo.
//
// Sale del último cobro acreditado y no de la tabla de tarifas de MercadoPago:
// la comisión y el plazo dependen del plazo de acreditación que cada complejo
// eligió en SU cuenta, que no se puede consultar por API. Mostrar lo que
// efectivamente pasó es más honesto que estimar, y además no se desactualiza
// cuando el complejo cambia su configuración o MercadoPago cambia sus precios.
const getMpResumen = async (req, res, next) => {
  try {
    const ultimo = await Payment.findOne({
      club: req.params.clubId,
      estado: 'aprobado',
      comisionMp: { $ne: null }
    }).sort({ aprobadoEn: -1 });

    if (!ultimo) {
      // Todavía no cobró nada: no hay números reales que mostrar.
      return res.status(200).json({ ok: true, resumen: null });
    }

    res.status(200).json({
      ok: true,
      resumen: {
        monto: ultimo.monto,
        comisionMp: ultimo.comisionMp,
        netoRecibido: ultimo.netoRecibido,
        acreditadoEl: ultimo.acreditadoEl,
        moneda: ultimo.moneda,
        fecha: ultimo.aprobadoEn,
        // El porcentaje se calcula acá para que el panel no tenga que saber
        // cómo se relacionan los montos.
        porcentaje: ultimo.monto ? (ultimo.comisionMp / ultimo.monto) * 100 : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /clubs/:clubId/pagos/mp
// Desvincula la cuenta. No se revoca el permiso del lado de MercadoPago: eso lo
// hace el complejo desde su cuenta si quiere, y borrar nuestras credenciales ya
// alcanza para que CourtIn no pueda cobrar más.
const disconnectMp = async (req, res, next) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.clubId,
      {
        $set: { 'pagos.mp.conectado': false },
        $unset: {
          'pagos.mp.accessToken': '',
          'pagos.mp.refreshToken': '',
          'pagos.mp.userId': '',
          'pagos.mp.publicKey': '',
          'pagos.mp.expiresAt': '',
          'pagos.mp.email': '',
          'pagos.mp.conectadoEn': ''
        }
      },
      { new: true }
    );

    if (!club) {
      return res.status(404).json({ ok: false, message: 'Club no encontrado' });
    }

    res.status(200).json({ ok: true, message: 'Cuenta de MercadoPago desvinculada', club });
  } catch (error) {
    next(error);
  }
};

// --- Webhook de notificaciones ---

const firmaCoincide = (manifest, secret, v1) => {
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  // timingSafeEqual explota si los largos difieren, así que se chequea antes.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Verifica la firma que MercadoPago manda en `x-signature`.
 *
 * Sin esto el endpoint es un "confirmá cualquier reserva gratis" abierto a
 * internet: la URL es pública y el cuerpo del aviso es trivial de falsificar.
 *
 * El manifiesto que se firma es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * y NO incluye el body, así que el `express.json()` global alcanza y no hace
 * falta el cuerpo crudo.
 *
 * Se aceptan DOS secretos porque MercadoPago tiene uno por modo: las
 * notificaciones de pagos de prueba vienen firmadas con el de prueba y las
 * reales con el productivo. Si sólo se aceptara uno, el día del pasaje a
 * producción el webhook empezaría a rechazar todo con 401 y las reservas
 * dejarían de confirmarse sin ningún error a la vista. Aceptar los dos no
 * afloja nada: una firma válida bajo cualquiera de los dos vino igual de
 * MercadoPago.
 */
const verificarFirma = (req, dataId) => {
  const secretos = [process.env.MP_WEBHOOK_SECRET, process.env.MP_WEBHOOK_SECRET_TEST].filter(
    Boolean
  );

  if (secretos.length === 0) {
    // eslint-disable-next-line no-console
    console.error('[mp] Falta MP_WEBHOOK_SECRET: se rechazan todos los webhooks.');
    return false;
  }

  const signature = req.get('x-signature');
  const requestId = req.get('x-request-id');
  if (!signature || !dataId) return false;

  const partes = Object.fromEntries(
    signature.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  // MercadoPago pide los ids alfanuméricos en minúscula.
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;

  return secretos.some((secret) => firmaCoincide(manifest, secret, v1));
};

// POST /public/mp/webhook
//
// La ÚNICA fuente de verdad sobre si una reserva está paga. El redirect del
// navegador no confirma nada: el jugador puede cerrar la pestaña, quedarse sin
// señal, o inventarse la URL de "pago exitoso".
const mpWebhook = async (req, res) => {
  // `data.id` viaja como query param; algunas versiones lo mandan sólo en el
  // body, así que se aceptan las dos formas.
  const dataId = req.query['data.id'] || req.body?.data?.id;
  const tipo = req.query.type || req.body?.type;

  if (!verificarFirma(req, dataId)) {
    return res.status(401).json({ ok: false });
  }

  // MercadoPago manda también avisos de merchant_order y otros topics.
  // Reintentarlos no cambia nada: se acusan recibo y listo.
  if (tipo !== 'payment' || !dataId) {
    return res.status(200).json({ ok: true, ignorado: true });
  }

  try {
    // De qué complejo es el aviso. `user_id` es el vendedor (collector), que es
    // exactamente lo que guardamos al conectar la cuenta. Es lo que garantiza
    // que un pago de un club no pueda tocar la reserva de otro.
    const collectorId = req.body?.user_id;
    const club = collectorId
      ? await Club.findOne({ 'pagos.mp.userId': String(collectorId) })
      : null;

    if (!club) {
      // eslint-disable-next-line no-console
      console.warn(`[mp] Webhook de un collector desconocido (${collectorId}).`);
      return res.status(200).json({ ok: true, ignorado: true });
    }

    const token = await getClubAccessToken(club._id);
    if (!token) {
      // eslint-disable-next-line no-console
      console.warn(`[mp] El club ${club._id} ya no tiene MercadoPago conectado.`);
      return res.status(200).json({ ok: true, ignorado: true });
    }

    // No se confía en el body: el estado real se lee de la API de MercadoPago.
    const mpPayment = await getPayment(token, dataId);

    const payment = await findPaymentForMpNotification(club._id, mpPayment);
    if (!payment) {
      // Un pago que no nace de una reserva nuestra (una venta manual del club,
      // por ejemplo). Reintentarlo no lo va a convertir en nuestro.
      return res.status(200).json({ ok: true, ignorado: true });
    }

    // Reintento del mismo aviso: MercadoPago repite las notificaciones y hasta
    // permite reenviarlas a mano desde su panel.
    const yaProcesado =
      payment.paymentId === String(mpPayment.id) && payment.estado !== 'pendiente';
    const esReembolso = ['refunded', 'charged_back'].includes(mpPayment.status);
    if (yaProcesado && !(esReembolso && payment.estado === 'aprobado')) {
      return res.status(200).json({ ok: true, duplicado: true });
    }

    payment.paymentId = String(mpPayment.id);
    payment.merchantOrderId = mpPayment.order?.id ? String(mpPayment.order.id) : undefined;
    payment.metodoPago = mpPayment.payment_method_id;
    payment.payerEmail = mpPayment.payer?.email || payment.payerEmail;
    payment.rawStatus = mpPayment.status;
    payment.rawStatusDetail = mpPayment.status_detail;

    // Cuánto retuvo MercadoPago y cuándo libera la plata. Es lo único que le
    // permite al complejo ver su costo real: el plazo y la comisión los define
    // su propia cuenta y no se pueden consultar por API.
    //
    // Se excluye `application_fee`: ésa sería la comisión de CourtIn, y
    // sumarla acá se la mostraría al complejo como retención de MercadoPago.
    // Hoy es 0 y da lo mismo, pero el día que se active el número quedaría
    // mintiendo sin que nadie lo note.
    const comisiones = (mpPayment.fee_details || [])
      .filter((f) => f.type !== 'application_fee')
      .reduce((total, f) => total + (Number(f.amount) || 0), 0);
    if (comisiones > 0) payment.comisionMp = comisiones;
    if (mpPayment.transaction_details?.net_received_amount != null) {
      payment.netoRecibido = mpPayment.transaction_details.net_received_amount;
    }
    if (mpPayment.money_release_date) {
      payment.acreditadoEl = new Date(mpPayment.money_release_date);
    }

    const reservation = await Reservation.findById(payment.reservation);
    if (!reservation) {
      await payment.save();
      return res.status(200).json({ ok: true, ignorado: true });
    }

    if (mpPayment.status === 'approved') {
      payment.estado = 'aprobado';
      payment.aprobadoEn = new Date();
      await payment.save();

      const court = await Court.findById(reservation.court);
      await confirmarPagoDeReserva({ payment, reservation, club, court });
    } else if (esReembolso) {
      await registrarReembolso({ payment, reservation });
    } else if (['rejected', 'cancelled'].includes(mpPayment.status)) {
      // La reserva NO se cancela: sigue viva hasta que expire el hold, así el
      // jugador puede reintentar con otra tarjeta sin perder el horario.
      await registrarRechazo(payment, mpPayment);
    } else {
      // `in_process` / `pending`: un débito o una transferencia que todavía no
      // se acreditó. Se guarda el estado y se espera el próximo aviso.
      await payment.save();
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // 500 a propósito: MercadoPago reintenta con backoff. Si el error fue de
    // red o de base, el reintento es exactamente lo que queremos.
    // eslint-disable-next-line no-console
    console.error('[mp] Error procesando el webhook:', err.message);
    return res.status(500).json({ ok: false });
  }
};

module.exports = { getMpConnectUrl, mpOauthCallback, disconnectMp, mpWebhook, getMpResumen };
