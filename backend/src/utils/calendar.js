// Genera archivos .ics (RFC 5545) para adjuntar a los emails de reserva, así el
// turno se agrega al calendario del jugador con un clic.

// Instante -> formato UTC del estándar: 20260728T193000Z
const toICSDate = (date) =>
  new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// En los campos de texto, estos caracteres son separadores del formato y hay que
// escaparlos o el archivo queda corrupto.
const escapeICS = (text = '') =>
  String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// El estándar limita las líneas a 75 octetos: las más largas se parten y siguen
// en la línea siguiente con un espacio adelante. Sin esto, un club con nombre
// largo genera un .ics que algunos calendarios rechazan.
const foldLine = (line) => {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) chunks.push(' ' + rest);
  return chunks.join('\r\n');
};

/**
 * Arma el .ics de un turno.
 *
 * @returns {string} Contenido del archivo, listo para adjuntar en base64.
 */
const buildReservationICS = ({
  uid,
  inicio,
  fin,
  titulo,
  descripcion = '',
  ubicacion = '',
  url = '',
  // Una reserva pública nace pendiente de confirmación: el calendario lo marca
  // como tentativo hasta que el complejo la confirme.
  confirmado = true
}) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CourtIn//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@courtinapp.com`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(inicio)}`,
    `DTEND:${toICSDate(fin)}`,
    `SUMMARY:${escapeICS(titulo)}`,
    descripcion ? `DESCRIPTION:${escapeICS(descripcion)}` : null,
    ubicacion ? `LOCATION:${escapeICS(ubicacion)}` : null,
    url ? `URL:${escapeICS(url)}` : null,
    `STATUS:${confirmado ? 'CONFIRMED' : 'TENTATIVE'}`,
    // Recordatorio del propio calendario, 2 horas antes. Es gratis y no depende
    // de que nuestro cron de recordatorios exista.
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de tu turno',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);

  // El estándar exige CRLF como separador de líneas.
  return lines.map(foldLine).join('\r\n');
};

module.exports = { buildReservationICS };
