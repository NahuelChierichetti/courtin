const express = require('express');
const healthRoutes = require('./healthRoutes');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const clubRoutes = require('./clubRoutes');
const membershipRoutes = require('./membershipRoutes');
const invitationRoutes = require('./invitationRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const courtRoutes = require('./courtRoutes');
const reservationRoutes = require('./reservationRoutes');
const cashRoutes = require('./cashRoutes');
const clientRoutes = require('./clientRoutes');
const statsRoutes = require('./statsRoutes');
const notificationRoutes = require('./notificationRoutes');
const uploadRoutes = require('./uploadRoutes');
const adminRoutes = require('./adminRoutes');
const publicRoutes = require('./publicRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/clubs', clubRoutes);
router.use('/memberships', membershipRoutes);
router.use('/invitations', invitationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/courts', courtRoutes);
router.use('/reservations', reservationRoutes);
router.use('/cash', cashRoutes);
router.use('/clients', clientRoutes);
router.use('/stats', statsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);

module.exports = router;