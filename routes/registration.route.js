const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

// User routes for submitting registration
router.post('/', registrationController.submitRegistration);

// Admin routes to view registrations (contain CNIC, phone, address)
router.get('/', protect, adminOnly, registrationController.getAllRegistrations);
router.get('/:id', protect, adminOnly, registrationController.getRegistrationById);

module.exports = router;
