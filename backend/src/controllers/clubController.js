const Club = require('../models/Club');

const createClub = async (req, res, next) => {
    try {
        const { nombre, slug, direccion, telefono, estado } = req.body;

        const existingClub = await Club.findOne({ slug });
        if (existingClub) {
            return res.status(400).json({ ok: false, message: 'Ya existe un club con ese slug' });
        }

        const club = await Club.create({
            nombre,
            slug,
            direccion,
            telefono,
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
        const { nombre, slug, direccion, telefono, estado } = req.body;

        const club = await Club.findByIdAndUpdate(
            req.params.id,
            {
                nombre,
                slug,
                direccion,
                telefono,
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

module.exports = {
    createClub,
    getClubs,
    getClubById,
    updateClub
}