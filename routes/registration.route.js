const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');

// User routes for submitting registration
router.post('/', registrationController.submitRegistration);

// Admin routes to view registrations
router.get('/', registrationController.getAllRegistrations);
router.get('/:id', registrationController.getRegistrationById);

module.exports = router;
