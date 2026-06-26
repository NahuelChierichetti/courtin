const Court = require('../models/Court');
const Club = require('../models/Club');

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

    res.status(200).json({
      ok: true,
      courts
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
    const court = await Court.findByIdAndDelete(req.params.id).populate(
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

module.exports = {
  createCourt,
  getCourts,
  getCourtById,
  updateCourt,
  deleteCourt
};