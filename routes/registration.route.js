const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registration.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/form-validator.middleware');
const validateObjectId = require('../middlewares/validate-object-id.middleware');
const { RegistrationSchema, RegistrationStatusSchema } = require('../validators/registration.validation');

// Public: the banoqabil.online landing form submits here
router.post('/', validate(RegistrationSchema), registrationController.submitRegistration);

// Admin routes for the Applications page (contain CNIC, phone, address)
router.get('/', protect, adminOnly, registrationController.getAllRegistrations);
router.get('/:id', protect, adminOnly, validateObjectId('id'), registrationController.getRegistrationById);
router.patch(
  '/:id/status',
  protect,
  adminOnly,
  validateObjectId('id'),
  validate(RegistrationStatusSchema),
  registrationController.updateRegistrationStatus
);
router.delete('/:id', protect, adminOnly, validateObjectId('id'), registrationController.deleteRegistration);

module.exports = router;
