const mongoose = require('mongoose');

// Un intento de cobro de una reserva. Es el registro nuestro del pago; la
// verdad última siempre la tiene MercadoPago y se consulta contra su API.
//
// Puede haber varios por reserva: si al jugador le rechazan la tarjeta y
// reintenta, el primero queda en `rechazado` y se crea uno nuevo.
const paymentSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      index: true
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'La reserva es obligatoria'],
      index: true
    },
    proveedor: {
      type: String,
      enum: ['mercadopago'],
      default: 'mercadopago'
    },
    // Id de la preferencia de checkout (existe desde que se genera el link).
    preferenceId: {
      type: String,
      index: true
    },
    // Id del pago en MercadoPago. Aparece recién cuando el jugador paga.
    //
    // Único (sparse, porque es null hasta que se paga): es lo que hace
    // idempotente al webhook. MercadoPago reintenta la misma notificación
    // varias veces y hasta permite reenviarla a mano; sin esta restricción, un
    // reenvío duplicaría el ingreso en caja y el email al jugador.
    paymentId: {
      type: String,
      unique: true,
      sparse: true
    },
    merchantOrderId: {
      type: String
    },
    // Lo que mandamos a MP para reconocer el pago cuando vuelve: el id de la reserva.
    externalReference: {
      type: String,
      index: true
    },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobado', 'rechazado', 'reembolsado', 'expirado'],
      default: 'pendiente',
      index: true
    },
    // Si este cobro es la seña o el turno completo.
    tipo: {
      type: String,
      enum: ['sena', 'total'],
      required: true
    },
    // Lo que se cobra ahora.
    monto: {
      type: Number,
      required: [true, 'El monto es obligatorio'],
      min: [0, 'El monto no puede ser negativo']
    },
    // Precio del turno completo, para poder calcular el saldo sin depender de
    // que la tarifa de la cancha no haya cambiado desde que se reservó.
    montoTotalTurno: {
      type: Number,
      min: [0, 'El monto no puede ser negativo']
    },
    moneda: {
      type: String,
      uppercase: true,
      default: 'ARS'
    },
    // Comisión de CourtIn (marketplace_fee). Hoy siempre 0.
    comision: {
      type: Number,
      default: 0,
      min: [0, 'La comisión no puede ser negativa']
    },
    // Cómo pagó el jugador, según MercadoPago (visa, account_money, pix...).
    metodoPago: {
      type: String
    },
    payerEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    // `status` y `status_detail` crudos de MercadoPago. No se usan en la
    // lógica: sirven para entender qué pasó cuando un pago se comporta raro,
    // sin tener que entrar al panel de MercadoPago del complejo.
    rawStatus: {
      type: String
    },
    rawStatusDetail: {
      type: String
    },
    aprobadoEn: {
      type: Date
    },
    reembolsadoEn: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
