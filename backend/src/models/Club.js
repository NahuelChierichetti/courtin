const mongoose = require('mongoose');
const softDelete = require('../utils/softDelete');
const { PLAN_KEYS } = require('../config/plans');
const { SPORT_KEYS, DEFAULT_CLUB_SPORTS } = require('../config/sports');

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const diaSchema = new mongoose.Schema(
  {
    abierto: {
      type: Boolean,
      default: true
    },
    horaInicio: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido'],
      default: '08:00'
    },
    horaFin: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido'],
      default: '23:30'
    }
  },
  { _id: false }
);

const diaEspecialSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del día especial es obligatorio'],
      trim: true
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria']
    },
    tipo: {
      type: String,
      enum: ['cerrado', 'especial'],
      default: 'cerrado'
    },
    horaInicio: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido']
    },
    horaFin: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido']
    }
  },
  { _id: true }
);

const horariosSchema = new mongoose.Schema(
  {
    semanal: {
      lunes: { type: diaSchema, default: () => ({}) },
      martes: { type: diaSchema, default: () => ({}) },
      miercoles: { type: diaSchema, default: () => ({}) },
      jueves: { type: diaSchema, default: () => ({}) },
      viernes: { type: diaSchema, default: () => ({ horaFin: '00:30' }) },
      sabado: { type: diaSchema, default: () => ({ horaInicio: '09:00', horaFin: '00:30' }) },
      domingo: { type: diaSchema, default: () => ({ horaInicio: '09:00', horaFin: '22:00' }) }
    },
    diasEspeciales: {
      type: [diaEspecialSchema],
      default: []
    },
    reservas: {
      toleranciaCancelacionHoras: {
        type: Number,
        min: [0, 'La tolerancia no puede ser negativa'],
        default: 4
      },
      anticipacionMaximaDias: {
        type: Number,
        min: [1, 'La anticipación mínima es de 1 día'],
        default: 15
      }
    }
  },
  { _id: false }
);

// Cuenta de MercadoPago del complejo, vinculada por OAuth. Los pagos de las
// reservas van directo a esta cuenta: CourtIn nunca toca la plata, sólo crea la
// preferencia de cobro en nombre del club.
const mpSchema = new mongoose.Schema(
  {
    conectado: {
      type: Boolean,
      default: false
    },
    // `user_id` de MercadoPago (el collector). Es quien cobra.
    userId: {
      type: String,
      trim: true
    },
    publicKey: {
      type: String,
      trim: true
    },
    // Credenciales de cobro sobre una cuenta ajena: se guardan cifradas con
    // AES-256-GCM (ver utils/secrets.js).
    //
    // `select: false` es la protección que de verdad importa: ninguna lectura
    // casual —getClubConfig, un populate, un res.json(club) distraído— las
    // puede filtrar. Para usarlas hay que pedirlas explícitamente, que es lo
    // que hace utils/mercadopago.js y nadie más.
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
    },
    expiresAt: {
      type: Date
    },
    // Email de la cuenta vinculada, para que el complejo vea en el panel cuál
    // conectó sin tener que entrar a MercadoPago.
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    conectadoEn: {
      type: Date
    }
  },
  { _id: false }
);

const pagosSchema = new mongoose.Schema(
  {
    mp: {
      type: mpSchema,
      default: () => ({})
    },
    // Cuánto se cobra por adelantado: el turno completo o una seña.
    //
    // Arranca en seña porque es lo que más le conviene al complejo, aunque no
    // sea lo obvio: la comisión de MercadoPago se paga sobre lo que pasa por
    // MercadoPago, así que cobrar la mitad y el resto en el mostrador cuesta la
    // mitad de comisión. Y el efecto que importa —que el jugador tenga plata
    // puesta y no falte— ya lo consigue la seña; el total no agrega nada ahí.
    // Pedir el 100% por adelantado además espanta reservas.
    modalidad: {
      type: String,
      enum: ['total', 'sena'],
      default: 'sena'
    },
    senaTipo: {
      type: String,
      enum: ['porcentaje', 'fijo'],
      default: 'porcentaje'
    },
    senaValor: {
      type: Number,
      min: [0, 'La seña no puede ser negativa'],
      default: 50
    },
    // Si el complejo acepta reservas sin pago online (se paga al llegar).
    // Viene activado: obligar el pago frena los no-shows pero también espanta
    // reservas, y esa decisión es de cada complejo.
    permitePagoEnComplejo: {
      type: Boolean,
      default: true
    },
    // Comisión de CourtIn por transacción (`marketplace_fee` de MercadoPago).
    // En 0: el modelo de negocio hoy es el abono fijo de la suscripción. Queda
    // implementado para que activarlo sea cambiar un número y no rehacer la
    // integración.
    comisionPorcentaje: {
      type: Number,
      min: [0, 'La comisión no puede ser negativa'],
      max: [100, 'La comisión no puede superar el 100%'],
      default: 0
    }
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del club es obligatorio'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'El slug es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true
    },
    direccion: {
      type: String,
      trim: true
    },
    ciudad: {
      type: String,
      trim: true
    },
    provincia: {
      type: String,
      trim: true
    },
    telefono: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    timezone: {
      type: String,
      trim: true,
      default: 'America/Argentina/Buenos_Aires'
    },
    moneda: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ARS'
    },
    // Deportes habilitados del complejo. Los define el superadmin al darlo de
    // alta y son el recorte con el que trabaja todo el panel: las canchas sólo
    // se pueden cargar de estos deportes, y los filtros de canchas, turnos y
    // reportes muestran únicamente estos.
    //
    // Se guarda en el club en vez de deducirlo de las canchas cargadas porque
    // son dos cosas distintas: un complejo de pádel y fútbol que todavía no
    // cargó ninguna cancha de fútbol sigue siendo un complejo de pádel y fútbol,
    // y tiene que poder cargarla.
    deportes: {
      type: [String],
      enum: {
        values: SPORT_KEYS,
        message: 'El deporte "{VALUE}" no existe en el catálogo'
      },
      default: () => [...DEFAULT_CLUB_SPORTS],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'El complejo tiene que tener al menos un deporte habilitado'
      }
    },
    // El detalle de la suscripción (precio, ciclo, vigencia) vive en el modelo
    // Subscription. Acá queda sólo el plan contratado, que es lo que define el
    // límite de canchas y se consulta en todas las validaciones.
    plan: {
      type: String,
      enum: PLAN_KEYS,
      default: 'start'
    },
    // Estado de acceso efectivo. Lo escribe el cron de dunning a partir de la
    // suscripción (ver utils/subscriptions.js); las lecturas lo consultan tal
    // cual, sin recalcular.
    //
    //   pendiente    → alta solicitada desde el registro público, sin aprobar
    //   rechazado    → el superadmin rechazó la solicitud
    //   trial/activo → todo habilitado
    //   impago       → nivel 1: despublicado y sin cargar turnos nuevos
    //   suspendido   → nivel 2: sin acceso al panel
    //   cancelado    → baja definitiva
    //   inactivo     → apagado manual por un superadmin
    //
    // `pendiente` y `rechazado` son los únicos que NO salen de la facturación:
    // los escribe el circuito de aprobación (ver utils/subscriptions.js →
    // ESTADOS_SIN_ALTA) y el cron de dunning los saltea.
    estado: {
      type: String,
      enum: [
        'pendiente',
        'rechazado',
        'activo',
        'inactivo',
        'trial',
        'suspendido',
        'cancelado',
        'impago'
      ],
      default: 'trial'
    },
    // Circuito de aprobación del alta. Sólo lo completan los complejos que se
    // registran solos: los que crea un superadmin desde el backoffice nacen
    // aprobados y dejan esto vacío.
    alta: {
      // Cuántas canchas declaró tener al registrarse. No son las canchas
      // cargadas (todavía no cargó ninguna): es lo que define el plan que le
      // toca cuando termine la prueba gratis.
      canchasDeclaradas: {
        type: Number,
        min: [1, 'Tiene que declarar al menos una cancha']
      },
      solicitadoEn: { type: Date },
      resueltoEn: { type: Date },
      resueltoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      motivoRechazo: {
        type: String,
        trim: true
      }
    },
    horarios: {
      type: horariosSchema,
      default: () => ({})
    },
    // --- Perfil público (para la card de descubrimiento/reserva) ---
    descripcion: {
      type: String,
      trim: true
    },
    // URLs a object storage (Cloudinary/S3); la subida se resuelve en infra.
    logo: {
      type: String,
      trim: true
    },
    fotos: {
      type: [String],
      default: []
    },
    // Coordenadas para el mapa. El picker/geocoding se resuelve en el frontend.
    ubicacion: {
      lat: { type: Number },
      lng: { type: Number }
    },
    servicios: {
      type: [String],
      default: []
    },
    // Opt-in: el club no aparece en la interfaz pública hasta activarlo.
    publicado: {
      type: Boolean,
      default: false
    },
    // Qué avisos por email quiere recibir el complejo en `Club.email`.
    //
    // Vienen activados: un complejo que empieza a recibir reservas online
    // necesita enterarse. Se pueden apagar porque a cierto volumen un email por
    // reserva deja de ser útil y pasa a ser ruido (y una marca de spam segura).
    notificaciones: {
      nuevaReserva: {
        type: Boolean,
        default: true
      },
      cancelacion: {
        type: Boolean,
        default: true
      }
    },
    // Cobro online de las reservas. Ver pagosSchema arriba.
    pagos: {
      type: pagosSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

clubSchema.plugin(softDelete);

module.exports = mongoose.model('Club', clubSchema);