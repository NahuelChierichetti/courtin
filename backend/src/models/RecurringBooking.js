const mongoose = require('mongoose');

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Turno fijo: la REGLA de un horario que se repite todas las semanas.
//
// No es una reserva. Es lo que genera reservas: un job diario materializa las
// ocurrencias de cada regla hasta un horizonte móvil (90 días), así que la
// serie nunca se termina y nadie tiene que renovar nada. Ver docs/turnos-fijos.md.
//
// La regla es la fuente de verdad; las `Reservation` con `recurring` apuntando
// acá son su proyección. Borrar reservas futuras no da de baja el turno fijo:
// el job las vuelve a generar. Para darlo de baja hay que tocar la regla.
//
// Horarios en UTC, igual que `Club.horarios.semanal`. Ojo con `diaSemanaUtc`:
// pasar de local a UTC puede correr el día (martes 21:30 en UTC−3 es miércoles
// 00:30 UTC), por eso el par día+hora se convierte junto en `utils/recurring.js`
// y nunca campo por campo.

const pausaSchema = new mongoose.Schema(
  {
    desde: { type: Date, required: true },
    hasta: { type: Date, required: true },
    motivo: { type: String, trim: true, default: '' }
  },
  { _id: true }
);

// Fecha que el job no pudo generar. No es un error del sistema: es algo que
// tiene que resolver una persona del complejo (el horario está ocupado por otra
// reserva, o ese día está cerrado).
//
// La lista se RECALCULA en cada corrida sobre la ventana del horizonte, así que
// un conflicto que se resolvió (el complejo canceló la reserva que estorbaba)
// desaparece solo y la ocurrencia se genera. `detectadoEn` se preserva entre
// corridas para dos cosas: mostrar en el panel hace cuánto que está trabado, y
// notificar únicamente los conflictos nuevos en vez de repetir el aviso todos
// los días.
const conflictoSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    motivo: {
      type: String,
      enum: ['ocupado', 'cerrado', 'fuera_de_horario'],
      required: true
    },
    detectadoEn: { type: Date, default: Date.now }
  },
  { _id: true }
);

const recurringBookingSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      index: true
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
      required: [true, 'La cancha es obligatoria']
    },

    // El cliente del CRM del complejo. Un turno fijo casi nunca lo saca alguien
    // con cuenta en la plataforma: lo carga el complejo por teléfono. Si además
    // tiene cuenta, `customer` la linkea para que le aparezca en "Mis reservas".
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Copia de los datos de contacto: es lo que se estampa en cada reserva
    // generada, igual que una reserva de invitado cargada a mano.
    guestName: { type: String, trim: true, default: null },
    guestPhone: { type: String, trim: true, default: null },
    guestEmail: { type: String, trim: true, lowercase: true, default: null },

    // --- La recurrencia, en UTC ---
    diaSemanaUtc: {
      type: Number,
      required: [true, 'El día de la semana es obligatorio'],
      min: [0, 'El día debe estar entre 0 (domingo) y 6 (sábado)'],
      max: [6, 'El día debe estar entre 0 (domingo) y 6 (sábado)']
    },
    horaInicioUtc: {
      type: String,
      required: [true, 'La hora de inicio es obligatoria'],
      match: [HORA_REGEX, 'Formato HH:MM inválido']
    },
    duracionMin: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      min: [1, 'La duración debe ser positiva']
    },

    precioPorTurno: {
      type: Number,
      min: [0, 'El precio no puede ser negativo'],
      default: 0
    },

    vigenteDesde: {
      type: Date,
      required: [true, 'La vigencia desde es obligatoria']
    },
    // `null` = indefinido, y es el caso NORMAL: un turno fijo no vence. Se
    // completa sólo cuando alguien lo da de baja explícitamente.
    vigenteHasta: {
      type: Date,
      default: null
    },
    estado: {
      type: String,
      enum: ['activo', 'pausado', 'finalizado'],
      default: 'activo',
      index: true
    },
    pausas: {
      type: [pausaSchema],
      default: []
    },

    // Hasta dónde llegó el job. Es una optimización, no una verdad: si se
    // borrara, la próxima corrida lo recalcula sin generar duplicados.
    materializadoHasta: {
      type: Date,
      default: null
    },
    conflictos: {
      type: [conflictoSchema],
      default: []
    },

    notas: { type: String, trim: true, default: '' },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// La query del job: reglas vivas que todavía no llegaron al horizonte.
recurringBookingSchema.index({ estado: 1, materializadoHasta: 1 });

// El listado del panel, ordenado por día y hora.
recurringBookingSchema.index({ club: 1, estado: 1, diaSemanaUtc: 1, horaInicioUtc: 1 });

module.exports = mongoose.model('RecurringBooking', recurringBookingSchema);
