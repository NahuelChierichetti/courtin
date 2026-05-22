const express = require('express')

const  { createClub, getClubs, getClubById, updateClub } = require('../controllers/clubController')
const { protect, authorizeSuperadmin } = require('../middlewares/authMiddleware')

const router = express.Router()

router.use(protect)

router.get('/', authorizeSuperadmin, getClubs)
router.post('/', authorizeSuperadmin, createClub)
router.get('/:id', authorizeSuperadmin, getClubById)
router.put('/:id', authorizeSuperadmin, updateClub)

module.exports = router
