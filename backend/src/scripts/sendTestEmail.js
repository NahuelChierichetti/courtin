'use strict';

// Prueba de humo del envío de emails. No toca la base de datos.
//
//   npm run mail:test                    → envía a MAIL_DEV_REDIRECT
//   npm run mail:test -- vos@mail.com    → envía a esa casilla
//
// Ojo con el sandbox de Resend: mientras no tengas un dominio verificado, el
// único destinatario permitido es el email con el que creaste la cuenta.

require('dotenv').config();

const { sendEmail } = require('../utils/email');

const run = async () => {
  const to = process.argv[2] || process.env.MAIL_DEV_REDIRECT;

  if (!to) {
    console.error('Indicá un destinatario: npm run mail:test -- vos@mail.com');
    process.exit(1);
  }

  // El redirect de dev acá estorba: el destinatario ya es explícito.
  delete process.env.MAIL_DEV_REDIRECT;

  console.log(`Enviando a ${to}...`);

  const result = await sendEmail({
    to,
    subject: 'CourtIn · prueba de envío',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Funciona 🎾</h1>
        <p style="color: #444; line-height: 1.6; margin: 0 0 12px;">
          Si estás leyendo esto, el backend de CourtIn ya puede mandar emails por Resend.
        </p>
        <p style="color: #888; font-size: 13px; margin: 24px 0 0;">
          Enviado el ${new Date().toLocaleString('es-AR')}
        </p>
      </div>
    `
  });

  if (result.ok) {
    console.log(`✅ Enviado. ID: ${result.id}`);
  } else {
    console.error(`❌ No se envió: ${result.error || result.skipped}`);
    process.exit(1);
  }
};

run();
