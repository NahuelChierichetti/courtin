const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es obligatorio']
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio']
    },
    role: {
      type: String,
      enum: ['superadmin', 'tenant_admin', 'employee', 'customer'],
      required: [true, 'El rol es obligatorio']
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    }
  },
  {
    timestamps: true
  }
);

membershipSchema.index({ user: 1, club: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);