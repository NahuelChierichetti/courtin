const Lead = require('../models/Lead');
const demoSolicitud = require('../emails/templates/demoSolicitud');
const { sendEmail } = require('../utils/email');
const { contactEmail } = require('../config/contact');

// Formato de email suficientemente estricto para atajar tipeos, sin pretender
// validar el RFC: la validación de verdad es que la persona conteste el mail.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/public/demos
 *
 * Pedido de demo desde la landing de complejos. Público y sin sesión: quien lo
 * completa todavía no tiene cuenta, ese es justamente el punto.
 *
 * Primero se guarda el lead y después se manda el aviso. El orden importa: el
 * envío es best-effort y nunca lanza, así que si fuera al revés un fallo del
 * proveedor nos dejaría sin registro y sin mail.
 */
const createDemoRequest = async (req, res, next) => {
  try {
    const clubNombre = String(req.body.clubNombre || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const telefono = String(req.body.telefono || '').trim();
    const canchasRaw = req.body.canchas;

    if (!clubNombre || !email || !telefono) {
      return res
        .status(400)
        .json({ ok: false, message: 'Completá el nombre del complejo, el email y el teléfono' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, message: 'Revisá el email: no parece válido' });
    }

    const canchas = Number(canchasRaw);
    const canchasValidas = Number.isInteger(canchas) && canchas > 0 ? canchas : null;

    const lead = await Lead.create({
      clubNombre,
      email,
      telefono,
      canchas: canchasValidas,
      origen: 'landing-demo'
    });

    const aviso = demoSolicitud({ clubNombre, email, telefono, canchas: canchasValidas });

    const envio = await sendEmail({
      to: contactEmail(),
      subject: aviso.subject,
      html: aviso.html,
      // Responder el aviso contesta directo a quien pidió la demo, sin tener
      // que copiar la dirección a mano.
      replyTo: email,
      template: 'demo-solicitud',
      refId: lead._id
    });

    if (envio.ok) {
      await Lead.updateOne({ _id: lead._id }, { avisado: true });
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[demo] No salió el aviso de "${clubNombre}" (${envio.error || envio.skipped}). El lead ${lead._id} quedó guardado.`
      );
    }

    // Que el email haya fallado no es problema de quien completó el formulario:
    // su pedido está guardado, así que la respuesta es la misma.
    return res.status(201).json({ ok: true, message: 'Recibimos tu pedido. Te contactamos a la brevedad.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createDemoRequest };
