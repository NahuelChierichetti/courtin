// Normalización de teléfonos a formato internacional (sólo dígitos).
//
// Existe por un motivo muy concreto: los links de WhatsApp (`wa.me/<numero>`)
// sólo funcionan con el número en formato internacional, sin `+`, sin espacios
// y sin el `15`. Un teléfono guardado como "221 15 456-7890" —que es como lo
// escribe cualquier persona— genera un link que WhatsApp rechaza con un
// "número no válido", sin explicar por qué. Por eso el número se normaliza al
// guardarlo, y lo que no se puede normalizar se rechaza en el formulario, que
// es el único momento en que alguien puede corregirlo.
//
// --- Argentina ---
//
// El país por defecto es Argentina (54) porque es donde opera la plataforma.
// Un número argentino móvil para WhatsApp es: 54 + 9 + área (sin el 0) +
// abonado (sin el 15), y el nacional (área + abonado) siempre suma 10 dígitos.
// Las formas en que llega escrito son todas estas:
//
//   2214567890        área + abonado
//   02214567890       con el 0 de larga distancia
//   221 15 4567890    con el 15 de celular
//   +54 221 456 7890  internacional sin el 9
//   +54 9 221 4567890 internacional completo (la única que WhatsApp acepta)
//
// El `9` se agrega siempre. No hay forma de distinguir un fijo de un celular
// mirando el número: comparten el mismo formato de 10 dígitos. Si alguien carga
// un fijo, el link se arma igual y WhatsApp avisa que no tiene cuenta — es un
// caso raro y el costo de equivocarse es un mensaje que no se manda, no un dato
// corrupto.

const AR = '54';

// Áreas de 2 dígitos: sólo el 11 (AMBA). El resto son de 3 o 4.
const esArea2 = (nacional) => nacional.startsWith('11');

// Saca el `15` que va entre el área y el abonado.
//
// Con el 15, el nacional tiene 12 dígitos en vez de 10. Dónde está el `15`
// depende del largo del área, así que se prueban las tres posiciones posibles
// en orden de certeza. Si en ninguna hay un `15`, el número tiene 12 dígitos por
// otro motivo (mal tipeado) y se devuelve tal cual para que la validación de
// largo lo rechace.
const sacarQuince = (nacional) => {
  if (nacional.length !== 12) return nacional;

  const posiciones = esArea2(nacional) ? [2] : [3, 4];

  for (const i of posiciones) {
    if (nacional.slice(i, i + 2) === '15') {
      return nacional.slice(0, i) + nacional.slice(i + 2);
    }
  }

  return nacional;
};

/**
 * Convierte un teléfono escrito de cualquier forma al formato internacional que
 * usan los links de WhatsApp: sólo dígitos, con código de país, sin `+`.
 *
 * @param {string} raw Lo que escribió la persona.
 * @returns {string|null} El número normalizado, o null si no se puede resolver.
 */
const normalizePhone = (raw) => {
  if (!raw) return null;

  const texto = String(raw).trim();
  const internacional = texto.startsWith('+') || texto.startsWith('00');
  let digitos = texto.replace(/\D/g, '');

  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (!digitos) return null;

  // Un número de otro país escrito explícitamente en internacional se respeta
  // tal cual: la plataforma es argentina, pero un turista con un número de
  // Uruguay o Brasil tiene que poder recibir el mensaje igual.
  if (internacional && !digitos.startsWith(AR)) {
    return digitos.length >= 8 && digitos.length <= 15 ? digitos : null;
  }

  // Argentino: se descascara hasta quedarse con el nacional de 10 dígitos.
  let nacional = digitos;

  if (nacional.startsWith(AR) && nacional.length > 10) nacional = nacional.slice(AR.length);
  if (nacional.startsWith('9') && nacional.length > 10) nacional = nacional.slice(1);
  if (nacional.startsWith('0')) nacional = nacional.slice(1);

  nacional = sacarQuince(nacional);

  if (nacional.length !== 10) return null;

  return `${AR}9${nacional}`;
};

/** ¿Este teléfono sirve para armar un link de WhatsApp? */
const isValidPhone = (raw) => normalizePhone(raw) !== null;

module.exports = { normalizePhone, isValidPhone };
