/**
 * Plugin de borrado lógico (soft delete) para Mongoose.
 *
 * En vez de eliminar el documento de la base, marca `deletedAt` con la fecha
 * de borrado. Todas las lecturas (find, findOne, count, distinct, aggregate)
 * excluyen automáticamente los documentos borrados, así los controllers no
 * necesitan filtrar a mano.
 *
 * Para incluir explícitamente los borrados (por ejemplo, en un panel de
 * papelera o auditoría):
 *   Model.find(filtro).setOptions({ withDeleted: true })
 *   Model.aggregate(pipeline).option({ withDeleted: true })
 *
 * Para borrar lógicamente:
 *   await doc.softDelete()
 *   await Model.softDeleteById(id)
 *
 * Nota: en Mongoose 9 los middlewares de query se ejecutan en estilo
 * sincrónico/promesa (sin callback `next`); por eso los hooks modifican `this`
 * y retornan, en vez de recibir y llamar `next`.
 */
module.exports = function softDeletePlugin(schema) {
  schema.add({
    deletedAt: {
      type: Date,
      default: null
    }
  });

  // Excluye los documentos borrados salvo que se pida lo contrario o que la
  // query ya filtre explícitamente por `deletedAt`.
  const excludeDeleted = function () {
    const options = this.getOptions ? this.getOptions() : {};
    if (options.withDeleted) return;

    const filter = this.getFilter ? this.getFilter() : {};
    if (filter.deletedAt === undefined) {
      this.where({ deletedAt: null });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('findOneAndDelete', excludeDeleted);
  schema.pre('findOneAndReplace', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('distinct', excludeDeleted);

  // Aggregate: inyecta un $match al inicio del pipeline.
  schema.pre('aggregate', function () {
    if (this.options && this.options.withDeleted) return;
    this.pipeline().unshift({ $match: { deletedAt: null } });
  });

  // Marca el documento actual como borrado.
  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  // Borrado lógico por id. Devuelve el documento actualizado (o null).
  schema.statics.softDeleteById = function (id) {
    return this.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
  };
};
