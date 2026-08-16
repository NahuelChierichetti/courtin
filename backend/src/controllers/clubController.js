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
            notificaciones, pagos
        } = req.body;

        // Campos a borrar (ver la ubicación más abajo): van en $unset, no en $set.
        const unsetData = {};

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
        if (servicios !== undefined) updateData.servicios = servicios;
        if (publicado !== undefined) updateData.publicado = publicado;

        // Pin del mapa de la landing. Llega geocodificado desde la dirección o
        // fijado a mano por el complejo, y `null` es una orden explícita de
        // borrarlo: sin pin, el mapa público ubica la dirección escrita.
        //
        // Se valida acá y no sólo en el modelo porque el schema acepta cualquier
        // número: una longitud de 4000 se guardaría sin quejarse y el mapa
        // quedaría en el océano.
        if (ubicacion !== undefined) {
            const lat = Number(ubicacion?.lat);
            const lng = Number(ubicacion?.lng);
            const valida =
                Number.isFinite(lat) && Number.isFinite(lng) &&
                Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

            if (ubicacion && !valida) {
                return res.status(400).json({ ok: false, message: 'Las coordenadas de la ubicación no son válidas.' });
            }

            if (valida) {
                updateData['ubicacion.lat'] = lat;
                updateData['ubicacion.lng'] = lng;
            } else {
                unsetData.ubicacion = '';
            }
        }

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

        // Configuración de cobro. Igual que notificaciones: campo por campo para
        // que mandar uno solo no borre el resto.
        //
        // `pagos.mp` NO se acepta desde acá bajo ninguna forma: las credenciales
        // de MercadoPago las escribe únicamente el callback de OAuth. Si se
        // aceptaran, un tenant_admin podría pegar el token de otra cuenta y
        // desviarse los cobros.
        if (pagos && typeof pagos === 'object') {
            if (pagos.modalidad !== undefined) {
                if (!['total', 'sena'].includes(pagos.modalidad)) {
                    return res.status(400).json({ ok: false, message: 'Modalidad de cobro inválida.' });
                }
                updateData['pagos.modalidad'] = pagos.modalidad;
            }

            if (pagos.senaTipo !== undefined) {
                if (!['porcentaje', 'fijo'].includes(pagos.senaTipo)) {
                    return res.status(400).json({ ok: false, message: 'Tipo de seña inválido.' });
                }
                updateData['pagos.senaTipo'] = pagos.senaTipo;
            }

            if (pagos.senaValor !== undefined) {
                const valor = Number(pagos.senaValor);
                if (!Number.isFinite(valor) || valor <= 0) {
                    return res.status(400).json({ ok: false, message: 'El valor de la seña debe ser mayor a 0.' });
                }
                // El tipo puede venir en el mismo body o ya estar guardado; sin
                // resolverlo, un porcentaje de 300 pasaría y cobraría el triple
                // del turno.
                let tipo = pagos.senaTipo;
                if (tipo === undefined) {
                    const actual = await Club.findById(req.params.clubId).select('pagos.senaTipo');
                    tipo = actual?.pagos?.senaTipo || 'porcentaje';
                }
                if (tipo === 'porcentaje' && valor > 100) {
                    return res.status(400).json({ ok: false, message: 'La seña no puede superar el 100% del turno.' });
                }
                updateData['pagos.senaValor'] = valor;
            }

            if (pagos.permitePagoEnComplejo !== undefined) {
                updateData['pagos.permitePagoEnComplejo'] = Boolean(pagos.permitePagoEnComplejo);
            }
        }

        const club = await Club.findByIdAndUpdate(
            req.params.clubId,
            Object.keys(unsetData).length ? { $set: updateData, $unset: unsetData } : updateData,
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