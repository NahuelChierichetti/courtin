const Court = require('../models/Court');
const Club = require('../models/Club');
const { excedeLimite, limiteCanchas, planParaCanchas, getPlan } = require('../config/plans');

const createCourt = async (req, res, next) => {
  try {
    const { clubId, nombre, tipo, superficie, cubierta, jugadores, estado, tarifas, duracionTurno, descripcion, visible } = req.body;

    const club = await Club.findById(clubId);

    if (!club) {
      return res.status(404).json({
        ok: false,
        message: 'Club no encontrado'
      });
    }

    // Límite de canchas del plan. Se valida al crear y nunca al borrar: un club
    // que baja de plan conserva sus canchas, sólo no puede sumar más.
    const canchasActuales = await Court.countDocuments({ club: clubId });

    if (excedeLimite(club.plan, canchasActuales + 1)) {
      const sugerido = planParaCanchas(canchasActuales + 1);
      return res.status(403).json({
        ok: false,
        code: 'LIMITE_CANCHAS',
        message: `Tu plan ${getPlan(club.plan)?.label || club.plan} permite hasta ${limiteCanchas(club.plan)} canchas. Pasá al plan ${getPlan(sugerido)?.label || sugerido} para sumar más.`,
        limite: limiteCanchas(club.plan),
        actuales: canchasActuales,
        planSugerido: sugerido
      });
    }

    const court = await Court.create({
      club: clubId,
      nombre,
      tipo,
      superficie,
      cubierta,
      jugadores: tipo === 'futbol' ? jugadores : undefined,
      estado,
      tarifas: tarifas || [],
      duracionTurno,
      descripcion,
      ...(visible !== undefined && { visible })
    });

    const populatedCourt = await Court.findById(court._id).populate(
      'club',
      'nombre slug estado'
    );

    res.status(201).json({
      ok: true,
      court: populatedCourt
    });
  } catch (error) {
    next(error);
  }
};

const getCourts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.clubId) {
      filter.club = req.query.clubId;
    }

    const courts = await Court.find(filter)
      .populate('club', 'nombre slug estado')
      .sort({ createdAt: -1 });

    // Cupo del plan, para que el frontend pueda deshabilitar "Nueva cancha" en
    // vez de dejar intentar y fallar. La validación real igual está en el POST:
    // esto es una comodidad de la interfaz, no un control de seguridad.
    let cupo = null;
    if (req.query.clubId) {
      const club = await Club.findById(req.query.clubId).select('plan');
      if (club) {
        const limite = limiteCanchas(club.plan);
        cupo = {
          plan: club.plan,
          planLabel: getPlan(club.plan)?.label || club.plan,
          // null = sin tope. El Infinity de config no sobrevive a JSON.
          limite: Number.isFinite(limite) ? limite : null,
          usadas: courts.length,
          puedeCrear: !excedeLimite(club.plan, courts.length + 1),
          planSugerido: planParaCanchas(courts.length + 1)
        };
      }
    }

    res.status(200).json({
      ok: true,
      courts,
      cupo
    });
  } catch (error) {
    next(error);
  }
};

const getCourtById = async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id).populate(
      'club',
      'nombre slug estado'
    );

    if (!court) {
      return res.status(404).json({
        ok: false,
        message: 'Cancha no encontrada'
      });
    }

    res.status(200).json({
      ok: true,
      court
    });
  } catch (error) {
    next(error);
  }
};

const updateCourt = async (req, res, next) => {
  try {
    const { clubId, nombre, tipo, superficie, cubierta, jugadores, estado, tarifas, duracionTurno, descripcion, visible } = req.body;

    if (clubId) {
      const club = await Club.findById(clubId);

      if (!club) {
        return res.status(404).json({
          ok: false,
          message: 'Club no encontrado'
        });
      }
    }

    const updateData = {
      nombre,
      tipo,
      superficie,
      cubierta,
      jugadores: tipo === 'futbol' ? jugadores : undefined,
      estado,
      duracionTurno,
      descripcion
    };

    if (tarifas !== undefined) {
      updateData.tarifas = tarifas;
    }

    if (visible !== undefined) {
      updateData.visible = visible;
    }

    if (clubId) {
      updateData.club = clubId;
    }

    const court = await Court.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('club', 'nombre slug estado');

    if (!court) {
      return res.status(404).json({
        ok: false,
        message: 'Cancha no encontrada'
      });
    }

    res.status(200).json({
      ok: true,
      court
    });
  } catch (error) {
    next(error);
  }
};

const deleteCourt = async (req, res, next) => {
  try {
    // Borrado lógico: se marca `deletedAt` y deja de aparecer en las lecturas,
    // pero el registro se conserva en la base (historial de reservas, caja, etc.).
    const court = await Court.softDeleteById(req.params.id);

    if (!court) {
      return res.status(404).json({
        ok: false,
        message: 'Cancha no encontrada'
      });
    }

    await court.populate('club', 'nombre slug estado');

    res.status(200).json({
      ok: true,
      court
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourt,
  getCourts,
  getCourtById,
  updateCourt,
  deleteCourt
};