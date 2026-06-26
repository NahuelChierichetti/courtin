const Club = require('../models/Club');
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
            nombre, direccion, ciudad, provincia, telefono, timezone, moneda,
            whatsapp, email, descripcion, logo, fotos, ubicacion, servicios, publicado
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

        if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
        if (email !== undefined) updateData.email = email;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (logo !== undefined) updateData.logo = logo;
        if (fotos !== undefined) updateData.fotos = fotos;
        if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
        if (servicios !== undefined) updateData.servicios = servicios;
        if (publicado !== undefined) updateData.publicado = publicado;

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
    getClubHorarios,
    updateClubHorarios,
    getClubConfig,
    updateClubConfig
}