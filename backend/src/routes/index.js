const express = require('express');
const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const clubRoutes = require('./clubRoutes');
const membershipRoutes = require('./membershipRoutes');
const courtRoutes = require('./courtRoutes');
const reservationRoutes = require('./reservationRoutes');
const adminRoutes = require('./adminRoutes');
const publicRoutes = require('./publicRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/clubs', clubRoutes);
router.use('/memberships', membershipRoutes);
router.use('/courts', courtRoutes);
router.use('/reservations', reservationRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);

module.exports = router;