const Club = require('../models/Club');
const Court = require('../models/Court');
const { horariosToLocal, horariosToUtc, DEFAULT_TZ } = require('../utils/timezone');

const createClub = async (req, res, next) => {
    try {
        const { nombre, slug, direccion, ciudad, provincia, telefono, plan, estado } = req.body;

        const existingClub = await Club.findOne({ slug });
        if (existingClub) {
            return res.status(400).json({ ok: false, message: 'Ya existe un club con ese slug' });
        }

        const club = await Club.create({
            nombre,
            slug,
            direccion,
            ciudad,
            provincia,
            telefono,
            plan,
            estado
        });

        res.status(201).json({
            ok: true,
            message: 'Club creado con éxito',
            club
        })
    } catch (error) {
        next(error);
    }
}

const getClubs = async (req, res, next) => {
    try {
        const clubs = await Club.find().sort({ createdAt: -1 });

        res.status(200).json({
            ok: true,
            message: 'Clubs obtenidos con éxito',
            clubs
        })
    } catch (error) {
        next(error);
    }
}

const getClubById = async (req, res, next) => {
    try {
        const club = await Club.findById(req.params.id);

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        res.status(200).json({
            ok: true,
            message: 'Club obtenido con éxito',
            club
        })
    } catch (error) {
        next(error);
    }
}

const updateClub = async (req, res, next) => {
    try {
        const { nombre, slug, direccion, ciudad, provincia, telefono, plan, estado } = req.body;

        const club = await Club.findByIdAndUpdate(
            req.params.id,
            {
                nombre,
                slug,
                direccion,
                ciudad,
                provincia,
                telefono,
                plan,
                estado
            },
            {
                new: true,
                runValidators: true
            }
        )

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        res.status(200).json({
            ok: true,
            message: 'Club actualizado con éxito',
            club
        })
    } catch (error) {
        next(error);
    }
}

const deleteClub = async (req, res, next) => {
    try {
        // Borrado lógico: se marca `deletedAt` y el complejo deja de aparecer,
        // pero se conserva en la base. Se hace cascada sobre sus canchas para
        // que tampoco queden visibles ni reservables.
        const club = await Club.softDeleteById(req.params.id);

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        await Court.updateMany(
            { club: club._id, deletedAt: null },
            { deletedAt: new Date() }
        );

        res.status(200).json({
            ok: true,
            message: 'Club eliminado con éxito',
            club
        })
    } catch (error) {
        next(error);
    }
}

const getClubHorarios = async (req, res, next) => {
    try {
        const club = await Club.findById(req.params.clubId);

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        const tz = club.timezone || DEFAULT_TZ;

        res.status(200).json({
            ok: true,
            horarios: horariosToLocal(club.horarios.toObject(), tz)
        })
    } catch (error) {
        next(error);
    }
}

const updateClubHorarios = async (req, res, next) => {
    try {
        const { semanal, diasEspeciales, reservas } = req.body;

        const club = await Club.findById(req.params.clubId);

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        const tz = club.timezone || DEFAULT_TZ;

        // El frontend envía las horas en la zona del club; se guardan en UTC.
        club.horarios = horariosToUtc(
            { semanal, diasEspeciales: diasEspeciales || [], reservas },
            tz
        );

        await club.save();

        res.status(200).json({
            ok: true,
            message: 'Horarios actualizados con éxito',
            horarios: horariosToLocal(club.horarios.toObject(), tz)
        })
    } catch (error) {
        next(error);
    }
}

const getClubConfig = async (req, res, next) => {
    try {
        const club = await Club.findById(req.params.clubId);

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        res.status(200).json({
            ok: true,
            club
        })
    } catch (error) {
        next(error);
    }
}

const updateClubConfig = async (req, res, next) => {
    try {
        const {
            nombre, slug, direccion, ciudad, provincia, telefono, timezone, moneda,
            whatsapp, email, descripcion, logo, fotos, ubicacion, servicios, publicado,
            notificaciones
        } = req.body;

        // Sólo seteamos los campos presentes en el body (update parcial).
        const updateData = {
            nombre,
            direccion,
            ciudad,
            provincia,
            telefono,
            timezone,
            moneda
        };

        // Slug (link público): único, valida formato y disponibilidad.
        if (slug !== undefined) {
            const norm = (slug || '').toLowerCase().trim();
            if (!norm || norm.length < 3 || !/^[a-z0-9-]+$/.test(norm)) {
                return res.status(400).json({ ok: false, message: 'El link debe tener al menos 3 caracteres (letras, números o guiones).' });
            }
            const clash = await Club.findOne({ slug: norm, _id: { $ne: req.params.clubId } });
            if (clash) {
                return res.status(400).json({ ok: false, message: 'Ese link ya está en uso por otro complejo.' });
            }
            updateData.slug = norm;
        }

        if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
        if (email !== undefined) updateData.email = email;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (logo !== undefined) updateData.logo = logo;
        if (fotos !== undefined) updateData.fotos = fotos;
        if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
        if (servicios !== undefined) updateData.servicios = servicios;
        if (publicado !== undefined) updateData.publicado = publicado;

        // Sub-documento: se setea campo por campo para que mandar sólo uno de
        // los dos switches no borre el otro.
        //
        // Se chequea que sea un objeto y no `!== undefined`: un `null` pasaba
        // esa validación y reventaba al leerle las propiedades.
        if (notificaciones && typeof notificaciones === 'object') {
            if (notificaciones.nuevaReserva !== undefined) {
                updateData['notificaciones.nuevaReserva'] = Boolean(notificaciones.nuevaReserva);
            }
            if (notificaciones.cancelacion !== undefined) {
                updateData['notificaciones.cancelacion'] = Boolean(notificaciones.cancelacion);
            }
        }

        const club = await Club.findByIdAndUpdate(
            req.params.clubId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        )

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        res.status(200).json({
            ok: true,
            message: 'Configuración actualizada con éxito',
            club
        })
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createClub,
    getClubs,
    getClubById,
    updateClub,
    deleteClub,
    getClubHorarios,
    updateClubHorarios,
    getClubConfig,
    updateClubConfig
}