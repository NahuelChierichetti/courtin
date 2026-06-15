const express = require('express')

const  { createClub, getClubs, getClubById, updateClub, getClubHorarios, updateClubHorarios, getClubConfig, updateClubConfig } = require('../controllers/clubController')
const { protect, authorizeSuperadmin, authorizeClubRoles } = require('../middlewares/authMiddleware')
const ROLES = require('../config/roles')

const router = express.Router()

router.use(protect)

router.get('/', authorizeSuperadmin, getClubs)
router.post('/', authorizeSuperadmin, createClub)

router.get('/:clubId/horarios', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getClubHorarios)
router.put('/:clubId/horarios', authorizeClubRoles(ROLES.TENANT_ADMIN), updateClubHorarios)

router.get('/:clubId/config', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getClubConfig)
router.put('/:clubId/config', authorizeClubRoles(ROLES.TENANT_ADMIN), updateClubConfig)

router.get('/:id', authorizeSuperadmin, getClubById)
router.put('/:id', authorizeSuperadmin, updateClub)

module.exports = router
